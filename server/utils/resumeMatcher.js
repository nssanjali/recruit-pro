import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// pdf-parse v1 ΓÇö exports a single async function: pdf(buffer) => { text, ... }
const pdf = require('pdf-parse');
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Configure Gemini AI
const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

// ============================================================================
// CONSTANTS
// ============================================================================

// Tech skills to boost in matching
const TECH_SKILLS = new Set([
    'javascript', 'typescript', 'react', 'node', 'express', 'mongodb', 'sql', 'python',
    'java', 'c++', 'c#', '.net', 'aws', 'docker', 'kubernetes', 'version-control',
    'html', 'css', 'redux', 'angular', 'vue', 'nextjs', 'graphql', 'api', 'agile',
    'scrum', 'jira', 'figma', 'design', 'testing', 'jest', 'cypress', 'linux',
    'bash', 'shell', 'azure', 'gcp', 'ci/cd', 'devops', 'machine learning', 'ai',
    'data science', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'spring', 'django',
    'flask', 'laravel', 'php', 'ruby', 'rails', 'swift', 'kotlin', 'flutter', 'dart'
]);

// Stop words to filter out
const stopWords = new Set([
    'and', 'the', 'is', 'in', 'at', 'of', 'or', 'a', 'an', 'to', 'for', 'with',
    'on', 'by', 'as', 'it', 'be', 'are', 'was', 'were', 'that', 'this', 'from',
    'but', 'not', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should',
    'experience', 'work', 'working', 'years', 'job', 'role', 'position', 'candidate',
    'team', 'ability', 'able', 'use', 'using', 'used'
]);

// Synonym mapping for skill normalization
const SYNONYMS = {
    'reactjs': 'react', 'react.js': 'react',
    'nodejs': 'node', 'node.js': 'node',
    'vuejs': 'vue', 'vue.js': 'vue',
    'angularjs': 'angular', 'angular.js': 'angular',
    'golang': 'go',
    'amazonwebservices': 'aws', 'amazon': 'aws',
    'cplusplus': 'c++', 'cpp': 'c++',
    'csharp': 'c#',
    'dotnet': '.net',
    'backend': 'back-end',
    'frontend': 'front-end',
    'fullstack': 'full-stack',
    'jenkins': 'ci/cd', 'travis': 'ci/cd', 'circleci': 'ci/cd', 'githubactions': 'ci/cd',
    'postman': 'api', 'insomnia': 'api', 'rest': 'api', 'soap': 'api',
    'git': 'version-control', 'github': 'version-control', 'gitlab': 'version-control',
    'bitbucket': 'version-control'
};

// ============================================================================
// CORE TOKENIZATION & VECTOR LOGIC (PRESERVED)
// ============================================================================

/**
 * Tokenize text into normalized terms
 * Preserves special characters like c++, c#, .net
 */
const tokenize = (text) => {
    if (!text) return [];
    const normalized = text.toLowerCase();
    let clean = normalized.replace(/\s+/g, ' ');

    const tokens = clean.split(' ').map(t => {
        // Strip leading/trailing punctuation except + #
        let raw = t.replace(/^[^a-z0-9+#]+|[^a-z0-9+#]+$/g, '');
        // Apply synonym mapping
        if (SYNONYMS[raw]) return SYNONYMS[raw];
        return raw;
    }).filter(t => t.length > 1 && !stopWords.has(t));

    return tokens;
};

/**
 * Create term frequency vector with tech skill boosting
 */
const createVector = (tokens) => {
    const vec = {};
    for (const t of tokens) {
        vec[t] = (vec[t] || 0) + 1;
        // Boost tech skills
        if (TECH_SKILLS.has(t)) {
            vec[t] += 2;
        }
    }
    return vec;
};

/**
 * Calculate cosine similarity between two vectors
 */
const cosineSimilarity = (vecA, vecB) => {
    const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (const key of keys) {
        const valA = vecA[key] || 0;
        const valB = vecB[key] || 0;
        dotProduct += valA * valB;
        magA += valA * valA;
        magB += valB * valB;
    }

    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
};

// ============================================================================
// PDF PARSING
// ============================================================================

/**
 * Parse resume PDF to extract text.
 * Fetches URLs directly ΓÇö Cloudinary uploads are public (type:'upload'),
 * no URL signing needed.
 */
export const parseResume = async (input) => {
    try {
        if (!input) return "";

        let dataBuffer;

        // Handle URL ΓÇö fetch directly, no signing needed
        if (input.startsWith('http')) {
            try {
                const response = await fetch(input);
                if (!response.ok) {
                    console.error(`Failed to fetch resume: ${response.status} from ${input}`);
                    return "";
                }
                const arrayBuffer = await response.arrayBuffer();
                dataBuffer = Buffer.from(arrayBuffer);
            } catch (err) {
                console.error("Network error fetching resume:", err.message);
                return "";
            }
        } else {

            // Handle local file paths
            let cleanInput = input.startsWith('/') ? input.substring(1) : input;
            const possiblePaths = [
                input,
                cleanInput,
                path.join('uploads', cleanInput),
                path.join(process.cwd(), input)
            ];

            let foundPath = null;
            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    foundPath = p;
                    break;
                }
            }

            if (foundPath) {
                dataBuffer = fs.readFileSync(foundPath);
            } else {
                console.error('Resume file not found:', input);
                return "";
            }
        }

        const data = await pdf(dataBuffer);
        return data.text || "";
    } catch (error) {
        console.error('Error parsing resume:', error.message);
        return "";
    }
};

// ============================================================================
// RESUME SCORING (REFACTORED - NO JITTER)
// ============================================================================

/**
 * Calculate semantic match score between JD and resume
 * DETERMINISTIC: No random jitter
 * Returns resumeScore, skillsScore, experienceScore, matches, and keywords
 */
export const calculateMatchScore = (jobDescription, resumeText) => {
    if (!jobDescription || !resumeText) {
        return {
            resumeScore: 0,
            skillsScore: 0,
            experienceScore: 0,
            strongMatches: [],
            missingKeywords: [],
            summary: 'Resume content not accessible or empty.'
        };
    }

    const jdTokens = tokenize(jobDescription);
    const resumeTokens = tokenize(resumeText);

    if (resumeTokens.length === 0) {
        return {
            resumeScore: 0,
            skillsScore: 0,
            experienceScore: 0,
            strongMatches: [],
            missingKeywords: [],
            summary: 'Resume is empty.'
        };
    }

    // 1. Cosine Similarity (Semantic Match)
    const jdVec = createVector(jdTokens);
    const resumeVec = createVector(resumeTokens);
    const similarity = cosineSimilarity(jdVec, resumeVec);

    // Scale similarity (0-1) to 0-100 with a more generous curve
    let rawScore = similarity * 100;
    let adjustedScore = Math.min(rawScore * 4.0, 100); // 4x multiplier — cosine on real CVs is naturally low

    // 2. Keyword Coverage (Tech Skills Match)
    const jdTechSkills = new Set(jdTokens.filter(t => TECH_SKILLS.has(t)));
    const resumeTechSkills = new Set(resumeTokens.filter(t => TECH_SKILLS.has(t)));

    let skillsFound = [];
    let skillsMissing = [];

    for (const skill of jdTechSkills) {
        if (resumeTechSkills.has(skill)) {
            skillsFound.push(skill);
        } else {
            skillsMissing.push(skill);
        }
    }

    const coverage = jdTechSkills.size > 0 ? (skillsFound.length / jdTechSkills.size) : 0;

    // Blend: 55% Similarity, 45% Coverage
    let resumeScore = (adjustedScore * 0.55) + (coverage * 100 * 0.45);
    // Floor: any submitted resume gets at least 30
    resumeScore = Math.round(Math.min(Math.max(resumeScore, 30), 100));

    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    let summary = '';
    if (resumeScore >= 80) summary = "Excellent match! High relevance and skill coverage.";
    else if (resumeScore >= 50) summary = "Good match. Fits most requirements.";
    else summary = "Low match. Missing key skills or relevance.";

    return {
        resumeScore,
        skillsScore: Math.round(coverage * 100),
        experienceScore: Math.round(adjustedScore),
        strongMatches: skillsFound.slice(0, 10).map(capitalize),
        missingKeywords: skillsMissing.slice(0, 10).map(capitalize),
        summary
    };
};

// ============================================================================
// PROFILE SCORING (NEW)
// ============================================================================

/**
 * Extract required years of experience from job description
 */
const extractRequiredExperience = (jdText) => {
    if (!jdText) return 0;

    // Patterns: "3+ years", "5-7 years", "minimum 2 years"
    const patterns = [
        /(\d+)\+?\s*(?:to|-)\s*(\d+)?\s*years?/i,
        /minimum\s+(\d+)\s*years?/i,
        /at least\s+(\d+)\s*years?/i,
        /(\d+)\s*years?\s+(?:of\s+)?experience/i
    ];

    for (const pattern of patterns) {
        const match = jdText.match(pattern);
        if (match) {
            // If range (e.g., "3-5 years"), take the minimum
            return parseInt(match[1], 10);
        }
    }

    return 0; // No experience requirement found
};

/**
 * Calculate profile score based on structured candidate data
 * Inputs: experienceYears, skills[], projects[], jobDescription
 * Returns: profileScore (0-100)
 */
export const calculateProfileScore = ({ experienceYears = 0, skills = [], projects = [], jobDescription = '' }) => {
    // 1. Experience Score
    const requiredYears = extractRequiredExperience(jobDescription);
    let experienceScore;

    if (requiredYears === 0) {
        // No explicit requirement — give a generous base (50%) + ramp up with experience
        // Floor at 50: if they applied, they're worth reviewing
        experienceScore = Math.min(50 + (experienceYears * 8), 100);
    } else {
        if (experienceYears >= requiredYears) {
            experienceScore = 100;
        } else {
            // Partial credit — don't drop below 30 even at 0 years
            experienceScore = Math.max(30, Math.round((experienceYears / requiredYears) * 100));
        }
    }

    // 2. Projects Score  (raised floors — having any projects is positive signal)
    const projectCount = projects?.length || 0;
    let projectScore;
    if (projectCount === 0) projectScore = 40;  // no projects, but profile complete
    else if (projectCount === 1) projectScore = 60;
    else if (projectCount <= 3) projectScore = 75;
    else if (projectCount <= 5) projectScore = 85;
    else projectScore = 95;

    // 3. Skills Score against JD tech keywords
    const jdTokens = tokenize(jobDescription);
    const jdTechSkills = new Set(jdTokens.filter(t => TECH_SKILLS.has(t)));
    const candidateSkills = new Set((skills || []).map(s => {
        const normalized = s.toLowerCase();
        return SYNONYMS[normalized] || normalized;
    }));

    let matchedSkills = 0;
    for (const skill of jdTechSkills) {
        if (candidateSkills.has(skill)) matchedSkills++;
    }

    // If no tech skills in JD, give 65 as default (JD might not list them explicitly)
    // Also add bonus for candidate having many skills even if not JD-listed
    const jdCoverage = jdTechSkills.size > 0
        ? (matchedSkills / jdTechSkills.size) * 100
        : 65;
    const skillBonus = Math.min(candidateSkills.size * 3, 20); // up to 20pt bonus for breadth
    const skillScore = Math.min(Math.round(jdCoverage + skillBonus), 100);

    // 4. Final Profile Score: Weighted Average
    const profileScore = Math.round(
        (experienceScore * 0.45) +
        (skillScore * 0.35) +
        (projectScore * 0.20)
    );

    return {
        profileScore: Math.min(profileScore, 100),
        experienceScore: Math.round(experienceScore),
        skillScore: Math.round(skillScore),
        projectScore
    };
};

// ============================================================================
// AI INSIGHTS GENERATION (NEW)
// ============================================================================

/**
 * Format candidate answers for AI prompt
 */
const formatAnswers = (answersJSON) => {
    if (!answersJSON || typeof answersJSON !== 'object') return '';

    const entries = Object.entries(answersJSON);
    if (entries.length === 0) return '';

    return '\n\nCandidate Answers:\n' + entries.map(([q, a]) => `Q: ${q}\nA: ${a || 'No response'}`).join('\n\n');
};

/**
 * Generate AI-powered candidate insights using Gemini
 * Returns: { summary, strengths, weaknesses }
 * SAFE: Auto-retries on rate limits, cascades through cheaper → pricier models.
 */
export const generateCandidateInsights = async ({ jdText, resumeText, answersJSON = {} }) => {
    const fallback = {
        summary: "AI analysis unavailable. Please review manually.",
        strengths: ["Resume submitted", "Application completed", "Profile available"],
        weaknesses: ["AI analysis could not be generated"]
    };

    console.log('\n🤖 ─────────────── GEMINI AI ANALYSIS ───────────────');

    if (!genAI) {
        console.warn('  ❌ GEMINI_API_KEY not set — skipping AI insights');
        console.log('🤖 ─────────────────────────────────────────────────\n');
        return fallback;
    }
    console.log('  ✅ Gemini API key: present');

    if (!resumeText || resumeText.length < 300) {
        console.warn(`  ❌ Resume too short (${resumeText?.length ?? 0} chars, need ≥300) — skipping`);
        console.log('🤖 ─────────────────────────────────────────────────\n');
        return fallback;
    }
    console.log(`  📄 Resume text length : ${resumeText.length} chars`);
    console.log(`  📋 JD text length     : ${jdText?.length ?? 0} chars`);
    console.log(`  💬 Form answers       : ${Object.keys(answersJSON || {}).length} fields`);

    const MODELS = ['gemini-2.5-flash'];

    // Extract retry delay from 429 error message (e.g. "retry in 11.3s")
    const getRetryDelay = (msg) => {
        const m = msg?.match(/retry in (\d+(\.\d+)?)s/i);
        return m ? Math.ceil(parseFloat(m[1])) * 1000 : null;
    };
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const truncatedResume = resumeText.substring(0, 3000);
    const truncatedJD = (jdText || '').substring(0, 2000);
    const answersText = formatAnswers(answersJSON);

    const prompt = `You are a professional recruiter analyzing a candidate for a job position.

Job Description:
${truncatedJD}

Candidate Resume:
${truncatedResume}
${answersText}

Based on the resume and job description, generate:
1. A professional 4-5 line summary of the candidate
2. Exactly 3 key strengths
3. Exactly 3 areas of concern or weaknesses

Return ONLY valid JSON in this exact format:
{
  "summary": "4-5 line professional summary here",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"]
}`;

    for (const modelName of MODELS) {
        let attempts = 0;
        const MAX_ATTEMPTS = 2;

        while (attempts < MAX_ATTEMPTS) {
            attempts++;
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                console.log(`  ⏳ Sending prompt [model: ${modelName}, attempt: ${attempts}]...`);
                const t0 = Date.now();

                const result = await model.generateContent(prompt);
                const text = result.response.text();
                console.log(`  ⚡ Gemini responded in ${Date.now() - t0}ms`);
                console.log(`  📝 Raw (first 300): ${text.trim().substring(0, 300)}`);

                let jsonText = text.trim();
                if (jsonText.startsWith('```json')) jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
                else if (jsonText.startsWith('```')) jsonText = jsonText.replace(/```\n?/g, '');

                const parsed = JSON.parse(jsonText);
                if (!parsed.summary || !Array.isArray(parsed.strengths) || !Array.isArray(parsed.weaknesses)) {
                    throw new Error('Invalid AI response structure');
                }

                console.log('  ✅ Parsed successfully:');
                console.log(`     Summary   : "${parsed.summary.substring(0, 80)}..."`);
                console.log(`     Strengths : ${JSON.stringify(parsed.strengths)}`);
                console.log(`     Weaknesses: ${JSON.stringify(parsed.weaknesses)}`);
                console.log('🤖 ─────────────────────────────────────────────────\n');

                return {
                    summary: parsed.summary,
                    strengths: parsed.strengths.slice(0, 3),
                    weaknesses: parsed.weaknesses.slice(0, 3)
                };

            } catch (error) {
                const is429 = error.message?.includes('429');
                const retryMs = getRetryDelay(error.message);

                if (is429 && retryMs && attempts < MAX_ATTEMPTS) {
                    console.warn(`  ⏳ Rate limited [${modelName}] — waiting ${retryMs / 1000}s then retrying...`);
                    await sleep(retryMs + 500);
                    continue;
                }
                if (is429) {
                    console.warn(`  ⚠️  Quota exhausted [${modelName}] — trying next model...`);
                    break;
                }
                console.error(`  ❌ Error [${modelName}]: ${error.message}`);
                break;
            }
        }
    }

    console.error('  ❌ All models failed or quota exhausted for today');
    console.log('🤖 ─────────────────────────────────────────────────\n');
    return fallback;
};

// ============================================================================
// MAIN ORCHESTRATION FUNCTION (NEW)
// ============================================================================

/**
 * Complete application evaluation for background processing
 * Combines resume scoring, profile scoring, and AI insights
 * 
 * @param {Object} params - Evaluation parameters
 * @param {string} params.resumeUrl - Raw resume URL (PDF)
 * @param {string} params.jobDescription - Job description text
 * @param {number} params.experienceYears - Candidate years of experience
 * @param {string[]} params.skills - Candidate skills array
 * @param {Object[]} params.projects - Candidate projects array
 * @param {Object} params.answers - Application form answers
 * 
 * @returns {Object} Complete evaluation result
 */
export const evaluateApplication = async ({
    resumeUrl,
    jobDescription,
    experienceYears = 0,
    skills = [],
    projects = [],
    answers = {}
}) => {
    try {
        // Step 1: Parse Resume
        const resumeText = await parseResume(resumeUrl);

        // Step 2: Calculate Resume Score
        const resumeResult = calculateMatchScore(jobDescription, resumeText);

        // Step 3: Calculate Profile Score
        const profileResult = calculateProfileScore({
            experienceYears,
            skills,
            projects,
            jobDescription
        });

        // Step 4: Final Score = 50% resume + 50% profile (both already have floors)
        // AI sentiment dropped — it's always exactly 50% (3S/3W) so it adds noise not signal
        const finalScore = Math.min(
            Math.round((resumeResult.resumeScore * 0.50) + (profileResult.profileScore * 0.50)),
            100
        );

        // Detailed breakdown log
        console.log('📊 ─────────── SCORE BREAKDOWN ───────────');
        console.log(`   Resume TF-IDF  : ${resumeResult.resumeScore}%  (cosine similarity × 4, min 30)`);
        console.log(`   ├ Cosine score : ${resumeResult.experienceScore}%  (similarity × 4 component)`);
        console.log(`   └ Skill cover  : ${resumeResult.skillsScore}%  (${resumeResult.strongMatches?.length || 0} matched / ${(resumeResult.strongMatches?.length || 0) + (resumeResult.missingKeywords?.length || 0)} JD skills)`);
        console.log(`   Profile score  : ${profileResult.profileScore}%`);
        console.log(`   ├ Experience   : ${profileResult.experienceScore}%  (${experienceYears} yrs)`);
        console.log(`   ├ Skills       : ${profileResult.skillScore}%  (${skills.length} skills on profile)`);
        console.log(`   └ Projects     : ${profileResult.projectScore}%  (${projects?.length || 0} projects)`);
        console.log(`   ─────────────────────────────────────────`);
        console.log(`   FINAL SCORE    : ${finalScore}%  (50% resume + 50% profile)`);
        console.log('📊 ─────────────────────────────────────────');

        let aiInsights = {
            summary: "AI analysis pending...",
            strengths: [],
            weaknesses: []
        };

        // Only generate AI insights if resume text is sufficient
        if (resumeText.length >= 300) {
            aiInsights = await generateCandidateInsights({
                jdText: jobDescription,
                resumeText,
                answersJSON: answers
            });
        }


        // Return comprehensive result

        return {
            // Scores
            finalScore,
            resumeScore: resumeResult.resumeScore,
            profileScore: profileResult.profileScore,
            skillsScore: resumeResult.skillsScore,
            experienceScore: profileResult.experienceScore,
            projectScore: profileResult.projectScore,

            // Matching Details
            strongMatches: resumeResult.strongMatches,
            missingKeywords: resumeResult.missingKeywords,

            // AI Insights
            aiSummary: aiInsights.summary,
            aiStrengths: aiInsights.strengths,
            aiWeaknesses: aiInsights.weaknesses,

            // Metadata
            resumeTextLength: resumeText.length,
            evaluatedAt: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error in evaluateApplication:', error);

        // Return safe fallback
        return {
            finalScore: 0,
            resumeScore: 0,
            profileScore: 0,
            skillsScore: 0,
            experienceScore: 0,
            projectScore: 0,
            strongMatches: [],
            missingKeywords: [],
            aiSummary: 'Evaluation failed. Please review manually.',
            aiStrengths: [],
            aiWeaknesses: [],
            error: error.message,
            evaluatedAt: new Date().toISOString()
        };
    }
};
