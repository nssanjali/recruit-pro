import Application from '../models/Application.js';
import { ObjectId } from 'mongodb';
import { autoScheduleInterview } from '../services/automationService.js';

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
                message: 'Not authorized to view this application'
            });
        }

        res.status(200).json({
            success: true,
            data: application
        });
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
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
