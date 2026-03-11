import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseResume } from './resumeMatcher.js';

const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeRecommendation = (value) => {
    const v = String(value || '').trim().toLowerCase();
    if (['strong_hire', 'strong hire', 'hire'].includes(v)) return 'hire';
    if (['lean_hire', 'lean hire', 'consider'].includes(v)) return 'consider';
    if (['lean_reject', 'lean reject', 'reject', 'no_hire', 'no hire'].includes(v)) return 'reject';
    return 'consider';
};

const alignScoreWithRecommendation = (score, recommendation) => {
    const normalizedScore = clamp(Math.round(Number(score) || 0), 0, 100);
    const rec = normalizeRecommendation(recommendation);

    // Keep recommendation and score in the same decision band.
    if (rec === 'reject' && normalizedScore >= 50) return 45;
    if (rec === 'hire' && normalizedScore < 70) return 75;
    if (rec === 'consider' && (normalizedScore < 50 || normalizedScore >= 70)) return 60;
    return normalizedScore;
};

const isTranscriptInsufficient = (text) => {
    const raw = String(text || '').trim();
    if (!raw) return true;

    const normalized = raw.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!normalized) return true;

    const tokens = normalized.split(' ').filter(Boolean);
    const uniqueTokens = new Set(tokens);
    const alphaChars = normalized.replace(/[^a-z]/g, '');

    // Very short, repetitive, or mostly noise content is not evaluable.
    if (tokens.length < 10) return true;
    if (alphaChars.length < 40) return true;
    if (uniqueTokens.size <= 3) return true;

    return false;
};

const fallbackAnalysis = ({
    recruiterRecommendation,
    recruiterReview,
    transcriptText
}) => {
    const rec = normalizeRecommendation(recruiterRecommendation);
    const reviewText = String(recruiterReview || '').toLowerCase();
    const transcript = String(transcriptText || '').toLowerCase();
    const signalText = `${reviewText}\n${transcript}`;

    let score = rec === 'hire' ? 78 : rec === 'consider' ? 60 : 38;
    if (/excellent|strong|clear|confident|good problem solving/.test(signalText)) score += 8;
    if (/weak|poor|struggle|unclear|not able|lacking/.test(signalText)) score -= 10;
    score = clamp(score, 15, 95);

    const recommendation = score >= 70 ? 'hire' : score >= 50 ? 'consider' : 'reject';
    return {
        summary: 'AI interview analysis fallback applied because Gemini output was unavailable.',
        strengths: ['Recruiter review captured', 'Interview transcript attached'],
        concerns: ['Manual review advised due to fallback mode'],
        recommendation,
        confidence: 0.45,
        score,
        source: 'fallback'
    };
};

const tryGemini = async ({
    jobTitle,
    candidateName,
    recruiterRecommendation,
    recruiterReview,
    transcriptText
}) => {
    if (!genAI) {
        return null;
    }

    const prompt = `You are an interview quality evaluator for an ATS.
Return ONLY valid JSON with this exact schema:
{
  "summary": "string",
  "strengths": ["string", "string", "string"],
  "concerns": ["string", "string", "string"],
  "recommendation": "hire|consider|reject",
  "confidence": 0.0,
  "score": 0
}

Context:
- Job Title: ${jobTitle || 'Unknown role'}
- Candidate: ${candidateName || 'Candidate'}
- Recruiter Recommendation: ${normalizeRecommendation(recruiterRecommendation)}
- Recruiter Review Notes: ${(recruiterReview || '').slice(0, 2400)}
- Interview Transcript:
${(transcriptText || '').slice(0, 10000)}
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const raw = (result?.response?.text?.() || '').trim();
    const jsonText = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonText);

    if (!parsed?.summary || !Array.isArray(parsed?.strengths) || !Array.isArray(parsed?.concerns)) {
        return null;
    }

    const recommendation = normalizeRecommendation(parsed.recommendation);
    const score = alignScoreWithRecommendation(
        Number(parsed.score) || 60,
        recommendation
    );

    return {
        summary: String(parsed.summary).trim(),
        strengths: parsed.strengths.slice(0, 3).map((item) => String(item).trim()).filter(Boolean),
        concerns: parsed.concerns.slice(0, 3).map((item) => String(item).trim()).filter(Boolean),
        recommendation,
        confidence: clamp(Number(parsed.confidence) || 0.6, 0.05, 0.99),
        score,
        source: 'gemini'
    };
};

export const analyzeInterviewFeedback = async ({
    jobTitle,
    candidateName,
    recruiterRecommendation,
    recruiterReview,
    transcriptUrl,
    transcriptText
}) => {
    const extractedTranscript = transcriptText
        ? String(transcriptText)
        : (transcriptUrl ? await parseResume(transcriptUrl) : '');

    const finalTranscript = String(extractedTranscript || '').trim();
    if (isTranscriptInsufficient(finalTranscript)) {
        return {
            summary: 'Interview transcript is insufficient or unintelligible for a reliable assessment.',
            strengths: ['Interview record received'],
            concerns: ['Transcript content is too limited for skill evaluation', 'Request a valid transcript or re-interview'],
            recommendation: 'reject',
            confidence: 0.35,
            score: 30,
            source: 'quality_gate',
            evaluatedAt: new Date(),
            transcriptLength: finalTranscript.length
        };
    }

    const gemini = await tryGemini({
        jobTitle,
        candidateName,
        recruiterRecommendation,
        recruiterReview,
        transcriptText: finalTranscript
    }).catch(() => null);

    const analysis = gemini || fallbackAnalysis({
        recruiterRecommendation,
        recruiterReview,
        transcriptText: finalTranscript
    });

    return {
        ...analysis,
        evaluatedAt: new Date(),
        transcriptLength: finalTranscript.length
    };
};

export const deriveFinalDecision = ({ recruiterRecommendation, aiRecommendation }) => {
    const recruiter = normalizeRecommendation(recruiterRecommendation);
    const ai = normalizeRecommendation(aiRecommendation);

    if (recruiter === 'hire' && ai !== 'reject') return 'accepted';
    if (recruiter === 'reject' && ai === 'reject') return 'rejected';
    if (recruiter === 'reject' && ai !== 'reject') return 'reviewing';
    if (recruiter === 'consider' && ai === 'hire') return 'shortlisted';
    if (recruiter === 'consider' && ai === 'reject') return 'reviewing';
    return 'reviewing';
};
