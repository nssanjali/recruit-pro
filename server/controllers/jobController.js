import Job from '../models/Job.js';
import User from '../models/User.js';
import { parseResume, calculateMatchScore } from '../utils/resumeMatcher.js';

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Private (Recruiter, Admin)
export const getJobs = async (req, res) => {
    try {
        let query = {};

        // Role-based filtering:
        // - company_admin: sees only jobs they posted
        // - admin: sees all jobs
        // - recruiter/candidate: sees all jobs
        if (req.user.role === 'company_admin') {
            query.postedBy = req.user._id;
        }

        const jobs = await Job.find(query);
        res.status(200).json({
            success: true,
            count: jobs.length,
            data: jobs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Public
export const getJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        res.status(200).json({
            success: true,
            data: job
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Create new job
// @route   POST /api/jobs
// @access  Private (Admin only)
export const createJob = async (req, res) => {
    try {
        // Add user to req.body
        req.body.postedBy = req.user._id;

        const job = await Job.create(req.body);

        res.status(201).json({
            success: true,
            data: job
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (Admin only)
export const updateJob = async (req, res) => {
    try {
        let job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Ownership check for company_admin
        if (req.user.role === 'company_admin' && job.postedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this job'
            });
        }

        job = await Job.findByIdAndUpdate(req.params.id, req.body);

        res.status(200).json({
            success: true,
            data: job
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private (Admin only)
export const deleteJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Ownership check for company_admin
        if (req.user.role === 'company_admin' && job.postedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this job'
            });
        }

        await Job.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get candidates for a job with match scores
// @route   GET /api/jobs/:id/candidates
// @access  Private (Recruiter, Admin)
export const getJobCandidates = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Check authorization
        if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to view candidates for this job'
            });
        }

        const candidateIds = job.candidates || [];
        if (candidateIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }

        const candidates = await User.find({ _id: { $in: candidateIds } });

        const candidatesWithScores = await Promise.all(candidates.map(async (candidate) => {
            let matchScore = 0;
            if (candidate.resume) {
                const resumeText = await parseResume(candidate.resume);
                if (resumeText) {
                    matchScore = calculateMatchScore(job.description + ' ' + (job.requirements || ''), resumeText);
                }
            }

            const { password, ...candidateData } = candidate;
            return {
                ...candidateData,
                matchScore
            };
        }));

        candidatesWithScores.sort((a, b) => b.matchScore - a.matchScore);

        res.status(200).json({
            success: true,
            data: candidatesWithScores
        });

    } catch (error) {
        console.error('Error fetching job candidates:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Check match score for current user
// @route   GET /api/jobs/:id/check-match
// @access  Private (Candidate)
export const checkJobMatch = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

        if (!req.user.resume) {
            return res.status(400).json({ success: false, message: 'No resume found on profile' });
        }

        console.log('Checking match for resume:', req.user.resume); // DEBUG LOG

        const resumeText = await parseResume(req.user.resume);
        if (!resumeText) {
            console.error('Failed to parse resume text. Path:', req.user.resume); // DEBUG LOG
            return res.status(400).json({ success: false, message: 'Failed to parse resume text' });
        }

        console.log('Resume parsed successfully. Length:', resumeText.length); // DEBUG LOG

        const matchScore = calculateMatchScore(job.description + ' ' + (job.requirements || ''), resumeText);

        console.log('Calculated Score:', matchScore); // DEBUG LOG

        res.status(200).json({
            success: true,
            analysis: matchScore
        });
    } catch (error) {
        console.error('Error checking match:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Apply to a job
// @route   POST /api/jobs/:id/apply
// @access  Private (Candidate)
export const applyJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Check if already applied
        if (job.candidates && job.candidates.includes(req.user._id)) {
            return res.status(400).json({
                success: false,
                message: 'You have already applied to this job'
            });
        }

        // Add user to candidates array
        await Job.findByIdAndUpdate(req.params.id, {
            $push: { candidates: req.user._id }
        });

        res.status(200).json({
            success: true,
            message: 'Application submitted successfully'
        });
    } catch (error) {
        console.error('Error applying to job:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};
