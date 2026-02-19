import Job from '../models/Job.js';
import User from '../models/User.js';
import Application from '../models/Application.js';
import { ObjectId } from 'mongodb';
import { parseResume, calculateMatchScore } from '../utils/resumeMatcher.js';

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Private (Recruiter, Admin)
export const getJobs = async (req, res) => {
    try {
        let query = {};

        // Role-based filtering:
        // - company_admin: sees only jobs they posted
        // - recruiter: sees only jobs mapped to them
        // - admin: sees all jobs
        // - candidate: sees all jobs
        console.log(`getJobs request from user: ${req.user._id} (Role: ${req.user.role})`);

        if (req.user.role === 'company_admin') {
            query.postedBy = req.user._id;
        } else if (req.user.role === 'recruiter') {
            // Get recruiter profile
            const { default: Recruiter } = await import('../models/Recruiter.js');
            const { default: JobRecruiterMapping } = await import('../models/JobRecruiterMapping.js');

            const recruiter = await Recruiter.findOne({ userId: req.user._id });

            if (recruiter) {
                // Get job IDs mapped to this recruiter
                const mappings = await JobRecruiterMapping.find({
                    recruiterId: recruiter._id,
                    status: 'active'
                });

                const jobIds = mappings.map(m => m.jobId);

                if (jobIds.length > 0) {
                    query._id = { $in: jobIds };
                } else {
                    // No jobs mapped, return empty array
                    return res.status(200).json({
                        success: true,
                        count: 0,
                        data: []
                    });
                }
            } else {
                // Recruiter profile not found, return empty
                return res.status(200).json({
                    success: true,
                    count: 0,
                    data: []
                });
            }
        }

        console.log('getJobs query:', JSON.stringify(query));

        const jobs = await Job.find(query);
        console.log(`getJobs found ${jobs.length} jobs`);

        res.status(200).json({
            success: true,
            count: jobs.length,
            data: jobs
        });
    } catch (error) {
        console.error('Error in getJobs:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
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
        // Admins and recruiters can view all job candidates
        // Company admins can only view candidates for jobs they posted
        if (req.user.role === 'company_admin' && job.postedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view candidates for this job'
            });
        }

        // Find applications for this job
        const applications = await Application.find({ jobId: job._id });
        const candidateIds = applications.map(app => app.candidateId);

        if (candidateIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }

        const candidates = await User.find({ _id: { $in: candidateIds } });

        // Determine if match analysis should be included
        // Only admins and company_admins (who posted the job) get match scores
        const includeMatchAnalysis = req.user.role === 'admin' ||
            (req.user.role === 'company_admin' && job.postedBy.toString() === req.user._id.toString());

        const candidatesWithScores = await Promise.all(candidates.map(async (candidate) => {
            let matchScore = 0;
            let analysis = null;

            // Use resume from application if available, fallback to user profile
            const application = applications.find(app => app.candidateId.toString() === candidate._id.toString());
            const resumeUrl = application?.resume || candidate.resume;

            // Only calculate match scores for authorized roles
            if (includeMatchAnalysis) {
                // PRIORITIZE DB TEXT (Avoids Cloudinary 401/404 issues on PDF fetch)
                let resumeText = candidate.resumeText || application?.resumeText;

                if (!resumeText && resumeUrl) {
                    resumeText = await parseResume(resumeUrl);
                }

                if (resumeText) {
                    // Result is an object { score, skillsScore, ... }
                    const matchResult = calculateMatchScore(job.description + ' ' + (job.requirements || ''), resumeText);
                    matchScore = matchResult.score; // Extract the numeric score
                    analysis = matchResult;
                }
            }

            const { password, ...candidateData } = candidate._doc || candidate; // Handle Mongoose document
            const appId = application?._id?.toString();
            console.log(`📋 Candidate ${candidate.name} - Application ID: ${appId}`);
            return {
                ...candidateData,
                applicationId: appId, // Convert ObjectId to string for JSON
                resume: resumeUrl, // Explicitly include the resume URL found
                matchScore: includeMatchAnalysis ? matchScore : undefined, // Only include if authorized
                analysis: includeMatchAnalysis ? analysis : undefined,    // Only include if authorized
                applicationStatus: application?.status // Include application status
            };
        }));

        // Sort by match score (descending) only if match analysis is included
        if (includeMatchAnalysis) {
            candidatesWithScores.sort((a, b) => b.matchScore - a.matchScore);
        }

        res.status(200).json({
            success: true,
            data: candidatesWithScores,
            includeMatchAnalysis // Let frontend know if match analysis is included
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

        console.log('Checking match for resume:', req.user.resume);

        let resumeText = req.user.resumeText;
        if (!resumeText) {
            resumeText = await parseResume(req.user.resume);
        }

        if (!resumeText) {
            console.error('Failed to parse resume text. Path:', req.user.resume);
            return res.status(400).json({ success: false, message: 'Failed to parse resume text' });
        }

        const matchScore = calculateMatchScore(job.description + ' ' + (job.requirements || ''), resumeText);

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
// @desc    Apply to a job
// @route   POST /api/jobs/:id/apply
// @access  Private (Candidate)
export const applyJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const userId = req.user._id;
        // Get application data from request body (sent by frontend)
        const applicationData = req.body || {};

        console.log('📝 Job Application Request:');
        console.log('  Job ID:', jobId);
        console.log('  User ID:', userId);
        console.log('  Application Data:', applicationData);

        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Check if already applied (in Job model)
        if (job.candidates && job.candidates.some(id => id.toString() === userId.toString())) {
            console.log('⚠️  User already applied to this job');
            return res.status(400).json({
                success: false,
                message: 'You have already applied to this job'
            });
        }

        // Add user to candidates array in Job using atomic operator ($addToSet)
        // This works because we updated Job.findByIdAndUpdate to support atomic operators
        await Job.findByIdAndUpdate(jobId, {
            $addToSet: { candidates: userId }
        });
        console.log('✅ Added candidate to job.candidates array');

        // Check if Application record exists
        const existingApp = await Application.findOne({
            candidateId: new ObjectId(userId),
            jobId: new ObjectId(jobId)
        });

        if (existingApp) {
            console.log('ℹ️  Application record already exists:', existingApp._id);
        } else {
            console.log('📋 Creating new application record...');
            // Create new application record
            // Map frontend naming (responses) to backend schema (formData)

            const newApplicationData = {
                jobId: new ObjectId(jobId),
                candidateId: new ObjectId(userId),
                // Use data from form if provided, otherwise fallback to user profile
                candidateName: applicationData.name || req.user.name,
                candidateEmail: applicationData.email || req.user.email,
                phone: applicationData.phone || req.user.phone || '',
                resume: applicationData.resume || req.user.resume || '',
                // Map custom field responses to formData
                formData: applicationData.responses || {},
                status: 'pending'
            };

            console.log('  Application Data:', newApplicationData);

            const createdApp = await Application.create(newApplicationData);
            console.log('✅ Application created with ID:', createdApp._id);
        }

        res.status(200).json({
            success: true,
            message: 'Application submitted successfully'
        });
    } catch (error) {
        console.error('❌ Error applying to job:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};
