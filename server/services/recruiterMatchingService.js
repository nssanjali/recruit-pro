import Recruiter from '../models/Recruiter.js';
import Job from '../models/Job.js';
import JobRecruiterMapping from '../models/JobRecruiterMapping.js';

// Simple tokenization and matching (similar to resume matcher)
const tokenize = (text) => {
    if (!text) return [];
    return text.toLowerCase()
        .split(/\s+/)
        .map(t => t.replace(/[^a-z0-9+#]/g, ''))
        .filter(t => t.length > 2);
};

const calculateSkillMatch = (jobSkills, recruiterSkills) => {
    if (!jobSkills || !recruiterSkills || jobSkills.length === 0 || recruiterSkills.length === 0) {
        return 0;
    }

    const jobTokens = new Set(jobSkills.flatMap(skill => tokenize(skill)));
    const recruiterTokens = new Set(recruiterSkills.flatMap(skill => tokenize(skill)));

    let matches = 0;
    for (const token of jobTokens) {
        if (recruiterTokens.has(token)) {
            matches++;
        }
    }

    return jobTokens.size > 0 ? (matches / jobTokens.size) * 100 : 0;
};

const calculateExpertiseMatch = (jobDescription, recruiterExpertise) => {
    if (!jobDescription || !recruiterExpertise || recruiterExpertise.length === 0) {
        return 0;
    }

    const jobTokens = tokenize(jobDescription);
    const expertiseTokens = new Set(recruiterExpertise.flatMap(exp => tokenize(exp)));

    let matches = 0;
    for (const token of jobTokens) {
        if (expertiseTokens.has(token)) {
            matches++;
        }
    }

    return jobTokens.length > 0 ? (matches / jobTokens.length) * 100 : 0;
};

/**
 * Calculate match score between a job and a recruiter
 * @param {Object} job - Job document
 * @param {Object} recruiter - Recruiter document
 * @returns {number} Match score (0-100)
 */
export const calculateRecruiterJobMatch = (job, recruiter) => {
    // Extract skills from job description and requirements
    const jobSkills = [
        ...(job.skills || []),
        ...(job.requiredSkills || [])
    ];

    // Calculate skill match (40% weight)
    const skillMatch = calculateSkillMatch(jobSkills, recruiter.skills || []);

    // Calculate expertise match (30% weight)
    const expertiseMatch = calculateExpertiseMatch(
        (job.description || '') + ' ' + (job.requirements || ''),
        recruiter.expertise || []
    );

    // Calculate workload score (30% weight)
    // Lower workload = higher score
    const workloadScore = Recruiter.calculateWorkloadScore(recruiter);
    const maxWorkload = 20; // Assume max workload of 20 (10 jobs + 10 interviews)
    const workloadMatch = Math.max(0, (1 - (workloadScore / maxWorkload)) * 100);

    // Weighted average
    const finalScore = (skillMatch * 0.4) + (expertiseMatch * 0.3) + (workloadMatch * 0.3);

    return Math.round(Math.min(finalScore, 100));
};

/**
 * Find best recruiter for a job using AI matching
 * @param {string} jobId - Job ID
 * @param {string} companyAdminId - Company Admin ID
 * @param {string} strategy - Matching strategy: 'best_match', 'least_workload', 'fastest'
 * @returns {Object} Best recruiter with match score
 */
export const findBestRecruiterForJob = async (jobId, companyAdminId, strategy = 'best_match') => {
    try {
        // Get job details
        const job = await Job.findById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        // Get all active recruiters for this company
        const recruiters = await Recruiter.find({
            companyAdminId: companyAdminId,
            status: 'active',
            availability: { $ne: 'unavailable' }
        });

        if (recruiters.length === 0) {
            throw new Error('No active recruiters available');
        }

        // Calculate match scores for all recruiters
        const recruitersWithScores = recruiters.map(recruiter => {
            const matchScore = calculateRecruiterJobMatch(job, recruiter);
            const workloadScore = Recruiter.calculateWorkloadScore(recruiter);

            return {
                recruiter,
                matchScore,
                workloadScore,
                pendingInterviews: recruiter.pendingInterviews || 0
            };
        });

        // Sort based on strategy
        let sortedRecruiters;
        switch (strategy) {
            case 'least_workload':
                sortedRecruiters = recruitersWithScores.sort((a, b) => a.workloadScore - b.workloadScore);
                break;
            case 'fastest':
                sortedRecruiters = recruitersWithScores.sort((a, b) => a.pendingInterviews - b.pendingInterviews);
                break;
            case 'best_match':
            default:
                sortedRecruiters = recruitersWithScores.sort((a, b) => b.matchScore - a.matchScore);
                break;
        }

        return sortedRecruiters[0];
    } catch (error) {
        console.error('Error finding best recruiter:', error);
        throw error;
    }
};

/**
 * Auto-assign recruiter to a job
 * @param {string} jobId - Job ID
 * @param {string} companyAdminId - Company Admin ID
 * @param {string} strategy - Matching strategy
 * @returns {Object} Created mapping
 */
export const autoAssignRecruiterToJob = async (jobId, companyAdminId, strategy = 'best_match') => {
    try {
        // Check if job already has a recruiter assigned
        const existingMapping = await JobRecruiterMapping.findOne({
            jobId: jobId,
            status: 'active'
        });

        if (existingMapping) {
            throw new Error('Job already has a recruiter assigned');
        }

        // Find best recruiter
        const bestMatch = await findBestRecruiterForJob(jobId, companyAdminId, strategy);

        if (!bestMatch) {
            throw new Error('No suitable recruiter found');
        }

        // Create mapping
        const mapping = await JobRecruiterMapping.create({
            jobId: jobId,
            recruiterId: bestMatch.recruiter._id,
            companyAdminId: companyAdminId,
            matchScore: bestMatch.matchScore,
            assignmentStrategy: strategy,
            status: 'active'
        });

        // Update recruiter's active jobs
        await Recruiter.findByIdAndUpdate(bestMatch.recruiter._id, {
            $addToSet: { activeJobs: jobId }
        });

        return {
            mapping,
            recruiter: bestMatch.recruiter,
            matchScore: bestMatch.matchScore
        };
    } catch (error) {
        console.error('Error auto-assigning recruiter:', error);
        throw error;
    }
};

export default {
    calculateRecruiterJobMatch,
    findBestRecruiterForJob,
    autoAssignRecruiterToJob
};
