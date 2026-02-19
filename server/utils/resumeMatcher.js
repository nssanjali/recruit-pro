import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// pdf-parse v1 — exports a single async function: pdf(buffer) => { text, ... }
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
 * Fetches URLs directly — Cloudinary uploads are public (type:'upload'),
 * no URL signing needed.
 */
export const parseResume = async (input) => {
    try {
        if (!input) return "";

        let dataBuffer;

        // Handle URL — fetch directly, no signing needed
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

    // Scale similarity (0-1) to 0-100 with curve adjustment
    let rawScore = similarity * 100;
    let adjustedScore = Math.min(rawScore * 2.5, 100);

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

    // 3. Blend Scores: 60% Similarity, 40% Coverage
    let resumeScore = (adjustedScore * 0.6) + (coverage * 100 * 0.4);
    resumeScore = Math.round(Math.min(resumeScore, 100));

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
    let experienceScore = 0;

    if (requiredYears === 0) {
        // No requirement specified, give moderate score based on experience
        experienceScore = Math.min((experienceYears / 5) * 100, 100);
    } else {
        // Compare candidate experience to requirement
        if (experienceYears >= requiredYears) {
            experienceScore = 100;
        } else {
            experienceScore = (experienceYears / requiredYears) * 100;
        }
    }

    // 2. Projects Score
    let projectScore = 0;
    const projectCount = projects?.length || 0;

    if (projectCount === 0) projectScore = 10;
    else if (projectCount <= 2) projectScore = 40;
    else if (projectCount <= 5) projectScore = 70;
    else projectScore = 90;

    // 3. Skills Score
    const jdTokens = tokenize(jobDescription);
    const jdTechSkills = new Set(jdTokens.filter(t => TECH_SKILLS.has(t)));
    const candidateSkills = new Set((skills || []).map(s => {
        const normalized = s.toLowerCase();
        return SYNONYMS[normalized] || normalized;
    }));

    let matchedSkills = 0;
    for (const skill of jdTechSkills) {
        if (candidateSkills.has(skill)) {
            matchedSkills++;
        }
    }

    const skillScore = jdTechSkills.size > 0
        ? (matchedSkills / jdTechSkills.size) * 100
        : 50; // Default if no tech skills in JD

    // 4. Final Profile Score: Weighted Average
    const profileScore = Math.round(
        (experienceScore * 0.5) +
        (skillScore * 0.3) +
        (projectScore * 0.2)
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
 * Generate AI-powered candidate insights using Gemini Pro
 * Returns: { summary, strengths, weaknesses }
 * SAFE: Returns fallback on error, never crashes
 */
export const generateCandidateInsights = async ({ jdText, resumeText, answersJSON = {} }) => {
    // Fallback response
    const fallback = {
        summary: "AI analysis unavailable. Please review manually.",
        strengths: ["Resume submitted", "Application completed", "Profile available"],
        weaknesses: ["AI analysis could not be generated"]
    };

    // Guard: Skip if Gemini not configured
    if (!genAI) {
        console.warn('Gemini API not configured. Skipping AI insights.');
        return fallback;
    }

    // Guard: Skip if resume too short
    if (!resumeText || resumeText.length < 300) {
        console.warn('Resume text too short for AI analysis.');
        return fallback;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Truncate resume to prevent token limits (keep first 3000 chars)
        const truncatedResume = resumeText.substring(0, 3000);
        const truncatedJD = jdText.substring(0, 2000);
        const answersText = formatAnswers(answersJSON);

        const prompt = `You are a professional recruiter analyzing a candidate for a job position.

Job Description:
${truncatedJD}

Candidate Resume:
${truncatedResume}
${answersText}

Based on the resume and answers in the context of the job description, generate:

1. A professional 4-5 line summary of the candidate
2. Exactly 3 key strengths
3. Exactly 3 areas of concern or weaknesses

IMPORTANT: 
- Candidate answers are brief (1-2 lines each) but should be considered
- Focus primarily on the resume content
- Be specific and professional
- Return ONLY valid JSON in this exact format:

{
  "summary": "4-5 line professional summary here",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"]
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response (handle markdown code blocks)
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\n?/g, '');
        }

        const parsed = JSON.parse(jsonText);

        // Validate structure
        if (!parsed.summary || !Array.isArray(parsed.strengths) || !Array.isArray(parsed.weaknesses)) {
            throw new Error('Invalid AI response structure');
        }

        return {
            summary: parsed.summary,
            strengths: parsed.strengths.slice(0, 3),
            weaknesses: parsed.weaknesses.slice(0, 3)
        };

    } catch (error) {
        console.error('Error generating AI insights:', error.message);
        return fallback;
    }
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

        // Step 4: Calculate Final Score (60% resume, 40% profile)
        const finalScore = Math.round(
            (resumeResult.resumeScore * 0.6) +
            (profileResult.profileScore * 0.4)
        );

        // Step 5: Generate AI Insights (async, non-blocking)
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
