import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import fetch from 'node-fetch';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (re-use env vars)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Helper to sign for PDF access
const signPdfUrl = (rawUrl) => {
    if (!rawUrl || !rawUrl.includes('cloudinary.com')) return rawUrl;
    try {
        const matches = rawUrl.match(/\/upload\/(v\d+)\/(.+)$/);
        if (!matches || !matches[2]) return rawUrl;
        const version = matches[1].replace('v', '');
        let publicId = matches[2];
        // Ensure clean public ID
        const parts = publicId.split('.');
        if (parts.length > 1) parts.pop();
        const idWithoutExt = parts.join('.');

        return cloudinary.url(idWithoutExt, {
            resource_type: 'image', // Cloudinary often stores PDFs as image resource type
            type: 'upload',
            sign_url: true,
            secure: true,
            // format: 'pdf', // Explicitly request PDF
            // Actually, if we don't specify format, it defaults to original? 
            // Let's try explicit 'pdf' to ensure we get the file for parsing.
            format: 'pdf',
            version: version
        });
    } catch (e) { return rawUrl; }
};

// Tech skills to boost
const TECH_SKILLS = new Set([
    'javascript', 'typescript', 'react', 'node', 'express', 'mongodb', 'sql', 'python', 'java', 'c++', 'c#', '.net', 'aws', 'docker', 'kubernetes', 'version-control', 'html', 'css', 'redux', 'angular', 'vue', 'nextjs', 'graphql', 'api', 'agile', 'scrum', 'jira', 'figma', 'design', 'testing', 'jest', 'cypress', 'linux', 'bash', 'shell', 'azure', 'gcp', 'ci/cd', 'devops', 'machine learning', 'ai', 'data science'
]);

// Stop words
const stopWords = new Set([
    'and', 'the', 'is', 'in', 'at', 'of', 'or', 'a', 'an', 'to', 'for', 'with', 'on', 'by', 'as', 'it', 'be', 'are', 'was', 'were', 'that', 'this', 'from', 'but', 'not',
    'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should',
    'experience', 'work', 'working', 'years', 'job', 'role', 'position', 'candidate', 'team',
    'ability', 'able', 'use', 'using', 'used'
]);

// Synonym Map for Normalization
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
    // Tools -> Concepts (Semantic Matching)
    'jenkins': 'ci/cd', 'travis': 'ci/cd', 'circleci': 'ci/cd', 'githubactions': 'ci/cd',
    'postman': 'api', 'insomnia': 'api', 'rest': 'api', 'soap': 'api',
    'git': 'version-control', 'github': 'version-control', 'gitlab': 'version-control', 'bitbucket': 'version-control'
};

// Improved tokenizer: preserves c++, c#, .net, node.js and normalizes synonyms
const tokenize = (text) => {
    if (!text) return [];
    const normalized = text.toLowerCase();

    // 1. Unified spacing
    let clean = normalized.replace(/\s+/g, ' ');

    const tokens = clean.split(' ').map(t => {
        // Strip leading/trailing punctuation except + #
        let raw = t.replace(/^[^a-z0-9+#]+|[^a-z0-9+#]+$/g, '');
        // Check synonyms
        if (SYNONYMS[raw]) return SYNONYMS[raw];
        return raw;
    }).filter(t => t.length > 1 && !stopWords.has(t));

    return tokens;
};

// Vector creation
const createVector = (tokens) => {
    const vec = {};
    for (const t of tokens) {
        vec[t] = (vec[t] || 0) + 1;
        // Boost tech skills
        if (TECH_SKILLS.has(t)) {
            vec[t] += 2; // Weight boost
        }
    }
    return vec;
};

// Cosine Similarity
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

export const parseResume = async (input) => {
    try {
        if (!input) return "";

        let dataBuffer;

        // URL Handling
        if (input.startsWith('http')) {
            try {
                // If it's a Cloudinary URL, we MUST sign it to access the PDF content
                // (The viewer uses JPG, but the parser needs the PDF)
                let fetchUrl = input;

                // Check if we have Cloudinary config available to sign
                if (input.includes('cloudinary') && process.env.CLOUDINARY_API_KEY) {
                    // Ensure we have a valid signature for the PDF (not JPG)
                    fetchUrl = signPdfUrl(input);
                }

                // Temporary: if fetch fails, we assume it's because of the signature.
                // But we can't easily sign here without the lib.
                // Let's rely on the fact that `jobController` can pass a signed PDF url?
                // No, `jobController` passes `signResumeUrl(raw)` which forces JPG.

                // HACK: If the input contains `format=jpg`, replace it?
                // The `jobController` output is: `.../image/upload/s--...--/v.../id.jpg`
                // We need `.../image/upload/s--...--/v.../id.pdf` ?
                // NO, the signature `s--` is dependent on the format/public_id. 
                // Changing extension invalidates signature.

                // SOLUTION: `jobController` should pass the RAW url to `resumeMatcher` (or `resumeMatcher` uses raw).
                // `jobController` line 261: `const rawResumeUrl = ...`
                // `jobController` line 269: `parseResume(resumeUrl)` -> This passes the JPG signed URL!
                // ERROR FOUND: We are passing the JPG-signed URL to the PDF parser!

                // We must pass `rawResumeUrl` to `parseResume`, and let `parseResume` handle the signing (as PDF).
                // So I need to:
                // 1. Update `jobController.js` to pass `rawResumeUrl` to `parseResume`.
                // 2. Update `resumeMatcher.js` to sign the raw URL as PDF.

                console.log(`[DEBUG] Fetching Resume URL: ${fetchUrl}`);
                const response = await fetch(fetchUrl);
                console.log(`[DEBUG] Response Status: ${response.status}`);
                if (!response.ok) {
                    console.error(`Failed to fetch resume: ${response.status} ${response.statusText} from URL: ${fetchUrl}`);
                    return "";
                }
                const arrayBuffer = await response.arrayBuffer();
                dataBuffer = Buffer.from(arrayBuffer);
            } catch (err) {
                console.error("Network error fetching resume:", err);
                return "";
            }
        } else {
            // Local file handling
            let cleanInput = input.startsWith('/') ? input.substring(1) : input;
            const possiblePaths = [
                input, cleanInput,
                path.join('uploads', cleanInput),
                path.join(process.cwd(), input)
            ];

            let foundPath = null;
            for (const p of possiblePaths) {
                if (fs.existsSync(p)) { foundPath = p; break; }
            }

            if (foundPath) {
                dataBuffer = fs.readFileSync(foundPath);
            } else {
                return "";
            }
        }

        const data = await pdf(dataBuffer);
        return data.text || "";
    } catch (error) {
        console.error('Error parsing resume:', error);
        return "";
    }
};

export const calculateMatchScore = (jobDescription, resumeText) => {
    if (!jobDescription || !resumeText) {
        return {
            score: 0,
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
        return { score: 0, skillsScore: 0, experienceScore: 0, strongMatches: [], missingKeywords: [], summary: 'Resume is empty.' };
    }

    // 1. Cosine Similarity (The Core Score)
    const jdVec = createVector(jdTokens);
    const resumeVec = createVector(resumeTokens);
    const similarity = cosineSimilarity(jdVec, resumeVec);

    // Scale similarity (0-1) to 0-100, but curve it because raw cosine can be low for long texts
    // A nice match usually has similarity > 0.3 or 0.4 in this bag-of-words model
    let rawScore = similarity * 100;
    let adjustedScore = Math.min(rawScore * 2.5, 100); // Curve: 0.4 -> 100

    // 2. Keyword Coverage (The Requirements Check)
    const jdTechSkills = new Set(jdTokens.filter(t => TECH_SKILLS.has(t)));
    const resumeTechSkills = new Set(resumeTokens.filter(t => TECH_SKILLS.has(t)));

    let skillsFound = [];
    let skillsMissing = [];

    for (const skill of jdTechSkills) {
        if (resumeTechSkills.has(skill)) skillsFound.push(skill);
        else skillsMissing.push(skill);
    }

    // Bonus for hitting key skills
    const coverage = jdTechSkills.size > 0 ? (skillsFound.length / jdTechSkills.size) : 0;

    // Blend Scores: 60% Similarity, 40% Coverage
    let finalScore = (adjustedScore * 0.6) + (coverage * 100 * 0.4);

    // Micro-Jitter: Add a tiny random factor (0-3%) to prevent exact duplicate scores for similar resumes
    // This makes the ranking look more organic
    finalScore += Math.random() * 3;

    // Rounding
    finalScore = Math.round(Math.min(finalScore, 100));

    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    let summary = '';
    if (finalScore >= 80) summary = "Excellent match! High relevance and skill coverage.";
    else if (finalScore >= 50) summary = "Good match. Fits most requirements.";
    else summary = "Low match. Missing key skills or relevance.";

    return {
        score: finalScore,
        skillsScore: Math.round(coverage * 100),
        experienceScore: Math.round(adjustedScore),
        strongMatches: skillsFound.slice(0, 10).map(capitalize),
        missingKeywords: skillsMissing.slice(0, 10).map(capitalize),
        summary
    };
};
