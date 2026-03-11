import Application from '../models/Application.js';
import { ObjectId } from 'mongodb';
import { autoScheduleInterview } from '../services/automationService.js';
import { evaluateApplication } from '../utils/resumeMatcher.js';
import { getDb } from '../config/db.js';
import { cloudinary, resolveSignedResumeUrl, isAllowedResumeReference } from '../config/cloudinary.js';
import { assertCandidateCanApply } from '../services/candidateReliabilityService.js';
import { scheduleInterviewForApplication } from '../services/interviewSchedulingService.js';

const toPublicResumeUrl = (resumeRef = '') => {
    const ref = String(resumeRef || '').trim();
    if (!ref) return '';

    if (ref.startsWith('http')) {
        if (ref.includes('/authenticated/')) {
            return ref
                .replace('/authenticated/', '/upload/')
                .replace(/\/s--[^/]+--\//, '/');
        }
        return ref;
    }

    return cloudinary.url(ref, {
        resource_type: 'image',
        type: 'upload',
        secure: true
    });
};

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

        const sanitizedApplications = applications.map((app) => {
            const { resume, ...rest } = app;
            return {
                ...rest,
                hasResume: Boolean(resume)
            };
        });

        res.status(200).json({
            success: true,
            count: sanitizedApplications.length,
            data: sanitizedApplications
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
        console.log('   candidateId:', application.candidateId, '| jobId:', application.jobId);
        console.log('   alreadyEvaluated:', !!application.aiAnalysis);

        // Check authorization
        if (req.user.role === 'candidate' && application.candidateId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this application'
            });
        }

        // Load candidate & job — coerce IDs to ObjectId to handle stored strings
        console.log('📦 Loading candidate & job from DB...');
        const { getDb } = await import('../config/db.js');
        const { ObjectId } = await import('mongodb');
        const db = getDb();

        const toOid = (id) => {
            if (!id) return null;
            try { return id instanceof ObjectId ? id : new ObjectId(id.toString()); }
            catch { return null; }
        };

        const candidate = await db.collection('users').findOne({ _id: toOid(application.candidateId) });
        console.log('   Candidate:', candidate ? candidate.name : '❌ not found');

        const job = await db.collection('jobs').findOne({ _id: toOid(application.jobId) });
        console.log('   Job:', job ? job.title : '❌ not found');

        const interviews = await db.collection('interviews')
            .find({
                $or: [
                    { applicationId: application._id },
                    { applicationId: application._id?.toString() }
                ]
            })
            .sort({ scheduledAt: -1 })
            .limit(1)
            .toArray();
        const latestInterview = interviews[0] || null;

        let companyBanner = null;
        let companyLogo = null;
        if (job && job.postedBy) {
            const postedByUser = await db.collection('users').findOne({ _id: toOid(job.postedBy) });
            if (postedByUser && postedByUser.companyInfo && postedByUser.companyInfo.companyBanner) {
                companyBanner = postedByUser.companyInfo.companyBanner;
            }
            if (postedByUser && (postedByUser.avatar || postedByUser.companyInfo?.companyLogo)) {
                companyLogo = postedByUser.avatar || postedByUser.companyInfo.companyLogo;
            }
        }

        // ----------------------------------------------------------------
        // AI Evaluation — use cached result from DB if already present,
        // otherwise run full Gemini-powered evaluation.
        // ----------------------------------------------------------------
        let evalResult = null;
        const hasPersistedEvaluation = (
            application.evaluatedAt ||
            application.finalScore !== undefined ||
            application.resumeScore !== undefined ||
            application.profileScore !== undefined ||
            application.aiSummary ||
            (Array.isArray(application.aiStrengths) && application.aiStrengths.length > 0) ||
            (Array.isArray(application.aiWeaknesses) && application.aiWeaknesses.length > 0)
        );
        const alreadyEvaluated = Boolean(hasPersistedEvaluation);

        if (!alreadyEvaluated && candidate?.resume && job?.description) {
            const { evaluateApplication } = await import('../utils/resumeMatcher.js');
            const jdText = job.description + ' ' + (job.requirements || '');
            const answers = application.formData || application.responses || {};

            console.log('📋 ─────────── EVALUATION INPUT SUMMARY ───────────');
            console.log(`   Job Title   : ${job.title}`);
            console.log(`   JD length   : ${jdText.length} chars`);
            console.log(`   JD preview  : ${jdText.substring(0, 120).replace(/\n/g, ' ')}...`);
            console.log(`   Resume URL  : ${candidate.resume?.substring(0, 80)}...`);
            console.log(`   Exp Years   : ${candidate.experienceYears || 0}`);
            console.log(`   Skills      : ${(candidate.skills || []).join(', ') || '(none)'}`);
            console.log(`   Projects    : ${(candidate.projects || []).length} projects`);
            console.log(`   Form Answers: ${Object.keys(answers).length} fields → ${JSON.stringify(answers).substring(0, 150)}`);
            console.log('📋 ──────────────────────────────────────────────────');

            evalResult = await evaluateApplication({
                resumeUrl: candidate.resume,
                jobDescription: jdText,
                experienceYears: candidate.experienceYears || 0,
                skills: candidate.skills || [],
                projects: candidate.projects || [],
                answers
            });

            console.log(`✅ Evaluation complete — Final Score: ${evalResult.finalScore}%`);
        } else {
            console.log(`⏭️  Skipping evaluation: alreadyEvaluated=${alreadyEvaluated}, hasResume=${!!candidate?.resume}, hasJD=${!!job?.description}`);
        }

        // Build normalized values (prefer fresh eval, fall back to stored)
        const matchScore = evalResult?.finalScore
            ?? application.finalScore
            ?? application.matchScore
            ?? application.aiAnalysis?.matchScore
            ?? 0;

        const aiAnalysis = evalResult ? {
            matchScore: evalResult.finalScore,
            summary: evalResult.aiSummary,
            strongMatches: evalResult.strongMatches || [],
            missingKeywords: evalResult.missingKeywords || [],
            insights: {
                strengths: evalResult.aiStrengths?.join(', ') || 'N/A',
                concerns: evalResult.aiWeaknesses?.join(', ') || 'None',
                experience: `Experience Score: ${evalResult.experienceScore ?? 0}%`,
                skills: `Skills Coverage: ${evalResult.skillsScore ?? 0}%`
            }
        } : (application.aiAnalysis || {
            matchScore: 0,
            summary: candidate?.resume ? 'Analysis pending' : 'No resume uploaded',
            insights: { strengths: 'N/A', concerns: 'N/A', experience: 'N/A', skills: 'N/A' }
        });

        // Build enriched response
        console.log('🏗️  Building enriched response...');
        const enrichedApplication = {
            ...application,
            candidate: candidate ? {
                _id: candidate._id,
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone,
                hasResume: Boolean(candidate.resume || application.resume)
            } : null,
            job: job ? {
                _id: job._id,
                title: job.title,
                company: job.company,
                department: job.department,
                location: job.location,
                companyBanner: companyBanner || job.companyBanner || null,
                companyLogo: companyLogo || job.companyLogo || null
            } : null,
            matchScore,
            aiAnalysis,
            // Flat fields exposed directly for easy frontend access
            finalScore: evalResult?.finalScore ?? application.finalScore,
            resumeScore: evalResult?.resumeScore ?? application.resumeScore,
            profileScore: evalResult?.profileScore ?? application.profileScore,
            aiSummary: evalResult?.aiSummary ?? application.aiSummary,
            aiStrengths: evalResult?.aiStrengths ?? application.aiStrengths ?? [],
            aiWeaknesses: evalResult?.aiWeaknesses ?? application.aiWeaknesses ?? [],
            interview: latestInterview ? {
                _id: latestInterview._id,
                scheduledAt: latestInterview.scheduledAt,
                endsAt: latestInterview.endsAt,
                status: latestInterview.status,
                meetingLink: latestInterview.meetingLink,
                interviewReview: latestInterview.interviewReview || null,
                aiInterviewAnalysis: latestInterview.aiInterviewAnalysis || null
            } : null,
            // Map formData to responses with human-readable labels
            responses: resolveFormResponses(
                application.formData || application.responses || {},
                job?.applicationFormConfig
            )
        };
        enrichedApplication.resume = Boolean(candidate?.resume || application.resume);

        // Persist fresh evaluation to DB so subsequent loads are instant
        if (evalResult && !alreadyEvaluated) {
            try {
                const { ObjectId } = await import('mongodb');
                await db.collection('applications').updateOne(
                    { _id: new ObjectId(req.params.id) },
                    {
                        $set: {
                            // Legacy field (used by ApplicationReview fallback chain)
                            matchScore,
                            aiAnalysis,
                            // New flat fields (primary fields read by ApplicationReview)
                            finalScore: evalResult.finalScore,
                            resumeScore: evalResult.resumeScore,
                            profileScore: evalResult.profileScore,
                            aiSummary: evalResult.aiSummary,
                            aiStrengths: evalResult.aiStrengths,
                            aiWeaknesses: evalResult.aiWeaknesses,
                            evaluatedAt: evalResult.evaluatedAt
                        }
                    }
                );
                console.log('✅ Persisted Gemini AI analysis to database');
            } catch (persistError) {
                console.warn('⚠️  Could not persist AI analysis:', persistError.message);
            }
        }

        console.log('📤 Sending response...');
        res.status(200).json({
            success: true,
            data: enrichedApplication
        });
        console.log('✅ Response sent successfully');
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Force re-run Gemini AI analysis (testing only)
// @route   POST /api/applications/:id/reanalyze
// @access  Private (Recruiter, Admin)
export const reanalyzeApplication = async (req, res) => {
    try {
        console.log('\n🔄 ═══════════ FORCE RE-ANALYZE ═══════════');
        console.log('   Application ID:', req.params.id);

        const { getDb } = await import('../config/db.js');
        const { ObjectId } = await import('mongodb');
        const db = getDb();

        const appOid = new ObjectId(req.params.id);

        // Step 1: Clear cached analysis so evaluateApplication runs fresh
        console.log('   🗑️  Clearing cached aiAnalysis from DB...');
        await db.collection('applications').updateOne(
            { _id: appOid },
            {
                $unset: {
                    aiAnalysis: '', finalScore: '', resumeScore: '', profileScore: '',
                    aiSummary: '', aiStrengths: '', aiWeaknesses: '', evaluatedAt: '', matchScore: ''
                }
            }
        );

        // Step 2: Load fresh application + candidate + job
        const application = await db.collection('applications').findOne({ _id: appOid });
        if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

        const toOid = (id) => {
            try { return id instanceof ObjectId ? id : new ObjectId(id.toString()); }
            catch { return null; }
        };

        const candidate = await db.collection('users').findOne({ _id: toOid(application.candidateId) });
        const job = await db.collection('jobs').findOne({ _id: toOid(application.jobId) });

        console.log('   Candidate:', candidate?.name || '❌ not found');
        console.log('   Job      :', job?.title || '❌ not found');

        if (!candidate?.resume || !job?.description) {
            return res.status(400).json({
                success: false,
                message: `Cannot evaluate: ${!candidate?.resume ? 'no resume' : 'no job description'}`
            });
        }

        // Step 3: Run full Gemini evaluation
        const { evaluateApplication } = await import('../utils/resumeMatcher.js');
        const evalResult = await evaluateApplication({
            resumeUrl: candidate.resume,
            jobDescription: job.description + ' ' + (job.requirements || ''),
            experienceYears: candidate.experienceYears || 0,
            skills: candidate.skills || [],
            projects: candidate.projects || [],
            answers: application.formData || application.responses || {}
        });

        console.log(`   ✅ Evaluation done — Final Score: ${evalResult.finalScore}%`);

        // Step 4: Persist fresh result
        await db.collection('applications').updateOne(
            { _id: appOid },
            {
                $set: {
                    matchScore: evalResult.finalScore,
                    aiAnalysis: {
                        matchScore: evalResult.finalScore,
                        summary: evalResult.aiSummary,
                        insights: {
                            strengths: evalResult.aiStrengths?.join(', ') || 'N/A',
                            concerns: evalResult.aiWeaknesses?.join(', ') || 'None',
                            experience: `Experience Score: ${evalResult.experienceScore ?? 0}%`,
                            skills: `Skills Coverage: ${evalResult.skillsScore ?? 0}%`
                        }
                    },
                    finalScore: evalResult.finalScore,
                    resumeScore: evalResult.resumeScore,
                    profileScore: evalResult.profileScore,
                    aiSummary: evalResult.aiSummary,
                    aiStrengths: evalResult.aiStrengths,
                    aiWeaknesses: evalResult.aiWeaknesses,
                    evaluatedAt: evalResult.evaluatedAt
                }
            }
        );

        console.log('🔄 ══════════════════════════════════════════\n');

        res.status(200).json({
            success: true,
            message: `Re-analysis complete — Score: ${evalResult.finalScore}%`,
            data: evalResult
        });

    } catch (error) {
        console.error('reanalyzeApplication error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};


// @desc    Create new application
// @route   POST /api/applications
// @access  Private (Candidate only)
export const createApplication = async (req, res) => {
    try {
        const { jobId, formResponses } = req.body;
        assertCandidateCanApply(req.user);

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
        if (resume && !isAllowedResumeReference(resume)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid resume reference. Please upload resume from the secure uploader.'
            });
        }
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
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Server Error'
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

// @desc    Update application status
// @route   PUT /api/applications/:id/status
// @access  Private (Recruiter/Admin/Company Admin)
export const updateApplicationStatus = async (req, res) => {
    try {
        const { status, reviewNotes } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const normalizedStatus = String(status).toLowerCase().trim() === 'sortlisted'
            ? 'shortlisted'
            : String(status).toLowerCase().trim();

        const validStatuses = ['pending', 'reviewing', 'shortlisted', 'rejected', 'accepted', 'interview_scheduled'];
        if (!validStatuses.includes(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Company admins can only update applications for jobs they own.
        if (req.user.role === 'company_admin') {
            const db = getDb();
            const application = await Application.findById(req.params.id);
            if (!application) {
                return res.status(404).json({
                    success: false,
                    message: 'Application not found'
                });
            }

            const jobId = typeof application.jobId === 'string' ? new ObjectId(application.jobId) : application.jobId;
            const job = await db.collection('jobs').findOne({ _id: jobId });
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Related job not found'
                });
            }

            if (job.postedBy?.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this application'
                });
            }
        }

        const updateData = {
            status: normalizedStatus,
            reviewedBy: req.user._id,
            reviewedAt: new Date()
        };

        if (reviewNotes !== undefined) {
            updateData.reviewNotes = reviewNotes;
        }

        const application = await Application.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        if (normalizedStatus === 'shortlisted') {
            const schedulingFailureMessages = {
                NO_RECRUITERS: 'no active recruiter is available for this job',
                NO_SLOT: 'no common slot is currently available',
                NO_GCAL_TOKEN: 'Google Calendar is not connected for scheduler accounts',
                UNKNOWN: 'unknown scheduling issue occurred'
            };

            try {
                const scheduleResult = await scheduleInterviewForApplication(req.params.id, {
                    preferredRecruiterUserId: req.user.role === 'recruiter' ? req.user._id : null
                });

                if (scheduleResult?.scheduled) {
                    const refreshedApplication = await Application.findById(req.params.id);
                    return res.status(200).json({
                        success: true,
                        message: scheduleResult.alreadyScheduled
                            ? 'Application already has a scheduled interview'
                            : 'Application shortlisted and interview scheduled',
                        interviewScheduled: true,
                        data: refreshedApplication || application,
                        interview: scheduleResult.interview || null,
                        schedulingDiagnostics: scheduleResult.diagnostics || null
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: `Application shortlisted. Interview not scheduled yet: ${schedulingFailureMessages[scheduleResult?.reason] || schedulingFailureMessages.UNKNOWN}.`,
                    interviewScheduled: false,
                    schedulingReason: scheduleResult?.reason || 'UNKNOWN',
                    schedulingDiagnostics: scheduleResult?.diagnostics || null,
                    data: application
                });
            } catch (scheduleError) {
                console.error('Error auto-scheduling shortlisted application:', scheduleError);
                return res.status(200).json({
                    success: true,
                    message: `Application shortlisted. Interview scheduling failed: ${scheduleError.message}`,
                    interviewScheduled: false,
                    schedulingReason: 'SCHEDULING_EXCEPTION',
                    schedulingDiagnostics: { error: scheduleError.message },
                    data: application
                });
            }
        }

        res.status(200).json({
            success: true,
            message: `Application status updated to ${normalizedStatus}`,
            data: application
        });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

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

// @desc    Get a short-lived signed URL for a candidate's resume (secure access)
// @route   GET /api/applications/:id/resume-url
// @access  Private — recruiters/admins get any; candidates only their own
export const getSecureResumeUrl = async (req, res) => {
    try {
        const db = getDb();

        const toOid = (id) => {
            try { return id instanceof ObjectId ? id : new ObjectId(id.toString()); }
            catch { return null; }
        };

        const application = await db.collection('applications').findOne({
            _id: toOid(req.params.id)
        });

        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        // If authenticated as candidate, only allow own resume
        if (req.user?.role === 'candidate') {
            if (application.candidateId.toString() !== req.user?._id?.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to access this resume'
                });
            }
        }

        // Get the resume URL from the candidate's profile or from the application itself
        const candidate = await db.collection('users').findOne({ _id: toOid(application.candidateId) });
        const resumeUrl = candidate?.resume || application.resume;

        if (!resumeUrl) {
            return res.status(404).json({ success: false, message: 'No resume found for this application' });
        }

        if (!isAllowedResumeReference(resumeUrl)) {
            return res.status(400).json({
                success: false,
                message: 'Resume reference is invalid. Candidate should re-upload resume.'
            });
        }

        const EXPIRY_SECONDS = 3600;
        let finalUrl = toPublicResumeUrl(resumeUrl);
        if (!finalUrl) {
            const resolved = await resolveSignedResumeUrl(resumeUrl, EXPIRY_SECONDS);
            finalUrl = resolved?.url || '';
        }
        if (!finalUrl) {
            return res.status(500).json({ success: false, message: 'Could not generate resume URL' });
        }

        const actor = req.user
            ? `${req.user._id} (${req.user.role})`
            : 'public-request';
        console.log(`🔒 Secure resume URL generated for application ${req.params.id} by ${actor}`);

        return res.status(200).json({
            success: true,
            url: finalUrl,
            expiresIn: EXPIRY_SECONDS
        });
    } catch (error) {
        console.error('Error generating secure resume URL:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
