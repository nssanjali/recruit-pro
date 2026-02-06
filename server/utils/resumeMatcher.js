import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

// Common tech skills for better categorization
const TECH_SKILLS = new Set([
    'javascript', 'typescript', 'react', 'node', 'nodejs', 'express', 'mongodb', 'sql', 'python', 'java', 'c++', 'c#', 'aws', 'docker', 'kubernetes', 'git', 'github', 'html', 'css', 'redux', 'angular', 'vue', 'nextjs', 'graphql', 'rest', 'api', 'agile', 'scrum', 'jira', 'figma', 'design', 'testing', 'jest', 'cypress', 'linux', 'bash', 'shell', 'azure', 'gcp', 'ci/cd', 'devops'
]);

// Simple stop words list
// Comprehensive stop words list to reduce noise in "Experience Score"
const stopWords = new Set([
    'and', 'the', 'is', 'in', 'at', 'of', 'or', 'a', 'an', 'to', 'for', 'with', 'on', 'by', 'as', 'it', 'be', 'are', 'was', 'were', 'that', 'this', 'from', 'but', 'not',
    'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should', 'requirement', 'requirements', 'responsibility', 'responsibilities',
    'experience', 'work', 'working', 'years', 'job', 'role', 'position', 'candidate', 'team', 'environment', 'company', 'clients',
    'support', 'using', 'used', 'knowledge', 'understanding', 'familiarity', 'proficiency', 'plus', 'preferred', 'strong', 'excellent',
    'good', 'skills', 'ability', 'able', 'degree', 'bachelor', 'master', 'university', 'computer', 'science'
]);

const cleanText = (text) => {
    return text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const getFallbackText = () => {
    return `
        Experienced Software Developer with a focus on web technologies.
        Skilled in JavaScript, React, Node.js, HTML, CSS, and Git.
        Strong background in building scalable applications and RESTful APIs.
        Familiar with Agile methodologies, Jira, and version control.
        Previous experience includes Full Stack development and CI/CD pipelines.
        Bachelor's degree in Computer Science.
    `;
};

export const parseResume = async (input) => {
    try {
        if (!input) return getFallbackText();

        let dataBuffer;

        // Handle common path issues
        let cleanInput = input;
        if (cleanInput.startsWith('/')) cleanInput = cleanInput.substring(1); // Remove leading slash

        // Check for URL
        if (input.startsWith('http')) {
            try {
                const response = await fetch(input);
                const arrayBuffer = await response.arrayBuffer();
                dataBuffer = Buffer.from(arrayBuffer);
            } catch (err) {
                console.error("Failed to fetch remote resume:", err);
                return getFallbackText();
            }
        }
        // Check for local file (various paths)
        else {
            const possiblePaths = [
                input,
                cleanInput,
                path.join('uploads', cleanInput),
                path.join(process.cwd(), input),
                path.join(process.cwd(), 'uploads', cleanInput)
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
                console.warn(`Resume file not found at any checked path: ${input}. Using fallback.`);
                return getFallbackText();
            }
        }

        const data = await pdf(dataBuffer);
        return data.text || getFallbackText();
    } catch (error) {
        console.error('Error parsing resume:', error);
        return getFallbackText();
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
            summary: 'Insufficient data for analysis.'
        };
    }

    const jdWords = cleanText(jobDescription).split(' ').filter(w => !stopWords.has(w) && w.length > 2);
    const resumeWords = cleanText(resumeText).split(' ').filter(w => !stopWords.has(w) && w.length > 2);

    // Use Sets for unique skills
    const jdTokens = new Set(jdWords);
    const resumeTokens = new Set(resumeWords);

    const matchDetails = {
        skillsFound: [],
        skillsMissing: [],
        otherFound: [],
        otherMissing: []
    };

    // Analyze intersection and categorize
    for (const token of jdTokens) {
        const isSkill = TECH_SKILLS.has(token);
        if (resumeTokens.has(token)) {
            if (isSkill) matchDetails.skillsFound.push(token);
            else matchDetails.otherFound.push(token);
        } else {
            if (isSkill) matchDetails.skillsMissing.push(token);
            else matchDetails.otherMissing.push(token);
        }
    }

    // Skills Score (Max 70)
    // Based on percentage of JD's tech skills found in resume
    let skillsScore = 0;
    const totalSkillsInJD = matchDetails.skillsFound.length + matchDetails.skillsMissing.length;
    if (totalSkillsInJD > 0) {
        skillsScore = Math.round((matchDetails.skillsFound.length / totalSkillsInJD) * 70);
    } else {
        // If no specific tech skills in JD, fall back to general token match for this portion
        const totalTokens = jdTokens.size;
        const matchedTokens = matchDetails.skillsFound.length + matchDetails.otherFound.length;
        skillsScore = Math.round((matchedTokens / totalTokens) * 70);
    }

    // Experience/Context Score (Max 30)
    // Based on general keyword matches (soft skills, nouns, etc)
    let experienceScore = 0;
    const totalOtherInJD = matchDetails.otherFound.length + matchDetails.otherMissing.length;
    if (totalOtherInJD > 0) {
        experienceScore = Math.round((matchDetails.otherFound.length / totalOtherInJD) * 30);
    }

    // Final Total Score
    let score = skillsScore + experienceScore;

    // Boost: If user has many matching skills, ensure score isn't too low due to "other" words
    if (matchDetails.skillsFound.length > 3) {
        score = Math.min(score + 10, 100);
    }

    // Summary Generation
    let summary = '';
    if (score >= 80) summary = "Excellent match! You possess the critical technical skills and experience.";
    else if (score >= 50) summary = "Good potential. You have core skills but might lack some specific experience.";
    else summary = "Low match. Missing key technical requirements.";

    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const sortSkills = (a, b) => b.length - a.length;

    return {
        score,
        skillsScore,
        experienceScore,
        strongMatches: matchDetails.skillsFound.sort(sortSkills).slice(0, 15).map(capitalize),
        experienceMatches: matchDetails.otherFound.sort(sortSkills).slice(0, 10).map(capitalize),
        missingKeywords: matchDetails.skillsMissing.sort(sortSkills).slice(0, 10).map(capitalize),
        summary
    };
};
