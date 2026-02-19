import Application from '../models/Application.js';
import { ObjectId } from 'mongodb';
import { autoScheduleInterview } from '../services/automationService.js';
import { evaluateApplication } from '../utils/resumeMatcher.js';
import { getDb } from '../config/db.js';

/**
 * Resolve form field IDs to human-readable labels.
 * Iterates over the job's applicationFormConfig (mandatory + custom fields)
 * and returns a new object keyed by the field label instead of the field ID.
 * Falls back to the raw key if no matching field is found (backwards compat).
 */
const resolveFormResponses = (rawResponses, formConfig) => {
    if (!rawResponses || typeof rawResponses !== 'object') return {};

    // Build a lookup map: fieldId → label
    const idToLabel = {};

    if (formConfig) {
        // Mandatory fields (stored as an object keyed by field name)
        const mandatoryFields = Object.values(formConfig.mandatoryFields || {});
        for (const field of mandatoryFields) {
            if (field?.id && field?.label) {
                idToLabel[field.id] = field.label;
            }
        }
        // Custom fields (stored as an array)
        for (const field of formConfig.customFields || []) {
            if (field?.id && field?.label) {
                idToLabel[field.id] = field.label;
            }
        }
    }

    const resolved = {};
    for (const [key, value] of Object.entries(rawResponses)) {
        // Use the human-readable label if available, otherwise keep the raw key
        const label = idToLabel[key] || key;
        resolved[label] = value;
    }
    return resolved;
};

// @desc    Get all applications (for recruiter/admin) or user's applications (for candidate)
// @route   GET /api/applications
// @access  Private
export const getApplications = async (req, res) => {
    try {
        let applications;

        if (req.user.role === 'candidate') {
            // Candidates see only their applications with job details
            applications = await Application.findWithJobDetails({
                candidateId: new ObjectId(req.user._id)
            });
        } else {
            // Recruiters/Admins see all applications with job details
            applications = await Application.findWithJobDetails({});
        }

        res.status(200).json({
            success: true,
            count: applications.length,
            data: applications
        });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get single application
// @route   GET /api/applications/:id
// @access  Private
export const getApplication = async (req, res) => {
    try {
        console.log('🔍 Fetching application with ID:', req.params.id);
        const application = await Application.findById(req.params.id);

        if (!application) {
            console.log('❌ Application not found with ID:', req.params.id);
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        console.log('✅ Application found:', application._id);

        // Check authorization
        if (req.user.role === 'candidate' && application.candidateId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this application'
            });
        }

        // Populate candidate and job details
        const { getDb } = await import('../config/db.js');
        const db = getDb();

        // Get candidate details
        const candidate = await db.collection('users').findOne({
            _id: application.candidateId
        });

        // Get job details
        const job = await db.collection('jobs').findOne({
            _id: application.jobId
        });

        // Calculate match score if not already present
        let matchScore = application.matchScore || 0;
        let aiAnalysis = application.aiAnalysis || null;

        if (candidate?.resume && job?.description) {
            const { parseResume, calculateMatchScore } = await import('../utils/resumeMatcher.js');

            // Use stored resume text if available, otherwise parse
            let resumeText = candidate.resumeText || application.resumeText;
            if (!resumeText && candidate.resume) {
                resumeText = await parseResume(candidate.resume);
            }

            if (resumeText) {
                const matchResult = calculateMatchScore(
                    job.description + ' ' + (job.requirements || ''),
                    resumeText
                );
                matchScore = matchResult.score;
                aiAnalysis = {
                    matchScore: matchResult.score,
                    summary: matchResult.summary,
                    insights: {
                        strengths: matchResult.strongMatches?.join(', ') || 'N/A',
                        concerns: matchResult.missingKeywords?.join(', ') || 'None',
                        experience: `Experience Score: ${matchResult.experienceScore}%`,
                        skills: `Skills Coverage: ${matchResult.skillsScore}%`
                    }
                };
            }
        }

        // Build enriched response
        const enrichedApplication = {
            ...application,
            candidate: candidate ? {
                _id: candidate._id,
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone,
                resume: candidate.resume
            } : null,
            job: job ? {
                _id: job._id,
                title: job.title,
                company: job.company,
                department: job.department,
                location: job.location
            } : null,
            matchScore,
            aiAnalysis,
            // Map formData to responses with human-readable labels
            responses: resolveFormResponses(
                application.formData || application.responses || {},
                job?.applicationFormConfig
            )
        };

        res.status(200).json({
            success: true,
            data: enrichedApplication
        });
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Create new application
// @route   POST /api/applications
// @access  Private (Candidate only)
export const createApplication = async (req, res) => {
    try {
        const { jobId, formResponses } = req.body;

        if (!jobId) {
            return res.status(400).json({
                success: false,
                message: 'Job ID is required'
            });
        }

        // Check if already applied
        const existingApplication = await Application.findOne({
            candidateId: new ObjectId(req.user._id),
            jobId: new ObjectId(jobId)
        });

        if (existingApplication) {
            return res.status(400).json({
                success: false,
                message: 'You have already applied to this job'
            });
        }

        // Extract resume from formResponses or use profile resume
        const resume = formResponses?.resume || req.user.resume || '';
        const coverLetter = formResponses?.coverLetter || '';

        const applicationData = {
            jobId: new ObjectId(jobId),
            candidateId: new ObjectId(req.user._id),
            candidateName: req.user.name,
            candidateEmail: req.user.email,
            resume,
            coverLetter,
            formResponses: formResponses || {}, // Store all form responses
            status: 'pending'
        };

        const application = await Application.create(applicationData);

        // Trigger async evaluation (don't wait for it)
        evaluateApplicationAsync(application._id).catch(err => {
            console.error('Background evaluation error:', err.message);
        });

        res.status(201).json({
            success: true,
            data: application
        });
    } catch (error) {
        console.error('Error creating application:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// Helper function for async evaluation
const evaluateApplicationAsync = async (applicationId) => {
    try {
        console.log(`🔄 Starting evaluation for application ${applicationId}...`);

        const db = getDb();
        const application = await db.collection('applications').findOne({
            _id: new ObjectId(applicationId)
        });

        if (!application) {
            console.error('Application not found:', applicationId);
            return;
        }

        // Fetch job details
        const job = await db.collection('jobs').findOne({
            _id: application.jobId
        });

        if (!job) {
            console.error('Job not found for application:', applicationId);
            return;
        }

        // Fetch candidate details
        const candidate = await db.collection('users').findOne({
            _id: application.candidateId
        });

        if (!candidate) {
            console.error('Candidate not found for application:', applicationId);
            return;
        }

        // Run evaluation
        const result = await evaluateApplication({
            resumeUrl: candidate.resume || application.resume,
            jobDescription: job.description + ' ' + (job.requirements || ''),
            experienceYears: candidate.experienceYears || 0,
            skills: candidate.skills || [],
            projects: candidate.projects || [],
            // Resolve field IDs so Gemini AI sees readable question labels
            answers: resolveFormResponses(
                application.formResponses || application.formData || {},
                job?.applicationFormConfig
            )
        });

        // Save results
        await db.collection('applications').updateOne(
            { _id: new ObjectId(applicationId) },
            {
                $set: {
                    finalScore: result.finalScore,
                    resumeScore: result.resumeScore,
                    profileScore: result.profileScore,
                    skillsScore: result.skillsScore,
                    experienceScore: result.experienceScore,
                    projectScore: result.projectScore,
                    strongMatches: result.strongMatches,
                    missingKeywords: result.missingKeywords,
                    aiSummary: result.aiSummary,
                    aiStrengths: result.aiStrengths,
                    aiWeaknesses: result.aiWeaknesses,
                    evaluatedAt: new Date(),
                    updatedAt: new Date()
                }
            }
        );

        console.log(`✅ Application ${applicationId} evaluated: Score ${result.finalScore}`);

    } catch (error) {
        console.error(`❌ Evaluation failed for application ${applicationId}:`, error.message);
    }
};

// @desc    Update application status
// @route   PUT /api/applications/:id
// @access  Private (Recruiter/Admin only)
export const updateApplication = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id);

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        const updatedApplication = await Application.findByIdAndUpdate(
            req.params.id,
            req.body
        );

        res.status(200).json({
            success: true,
            data: updatedApplication
        });
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Delete application
// @route   DELETE /api/applications/:id
// @access  Private (Candidate can delete own, Admin can delete any)
export const deleteApplication = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id);

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        // Check authorization
        if (req.user.role === 'candidate' && application.candidateId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this application'
            });
        }

        await Application.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Approve application and auto-schedule interview
// @route   PUT /api/applications/:id/approve
// @access  Private (Admin only)
export const approveApplication = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id);

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        // Update application status to approved
        await Application.findByIdAndUpdate(req.params.id, {
            status: 'approved',
            reviewedBy: req.user._id,
            reviewedAt: new Date()
        });

        // Trigger auto-scheduling
        try {
            const interview = await autoScheduleInterview(req.params.id);

            res.status(200).json({
                success: true,
                message: 'Application approved and interview scheduled',
                data: {
                    application,
                    interview
                }
            });
        } catch (scheduleError) {
            console.error('Error auto-scheduling interview:', scheduleError);

            // Application is approved but scheduling failed
            res.status(200).json({
                success: true,
                message: 'Application approved but interview scheduling failed',
                data: {
                    application,
                    error: scheduleError.message
                }
            });
        }
    } catch (error) {
        console.error('Error approving application:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Reject application
// @route   PUT /api/applications/:id/reject
// @access  Private (Admin only)
export const rejectApplication = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id);

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        const { reason } = req.body;

        const updatedApplication = await Application.findByIdAndUpdate(
            req.params.id,
            {
                status: 'rejected',
                reviewedBy: req.user._id,
                reviewedAt: new Date(),
                rejectionReason: reason || 'Not specified'
            }
        );

        res.status(200).json({
            success: true,
            message: 'Application rejected',
            data: updatedApplication
        });
    } catch (error) {
        console.error('Error rejecting application:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};
