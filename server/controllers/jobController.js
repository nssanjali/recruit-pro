import Job from '../models/Job.js';
import User from '../models/User.js';
import Application from '../models/Application.js';
import { ObjectId } from 'mongodb';
import { parseResume, calculateMatchScore } from '../utils/resumeMatcher.js';
import { bulkScheduleInterviews } from '../services/interviewSchedulingService.js';

/** Remove fields that must never reach candidates or the public */
const stripAdminFields = (job) => {
    if (!job) return job;
    const { applicationCutoffDate, requiredApplications, ...safe } = job;
    return safe;
};

const normalizeApplicationStatus = (status) => {
    const value = String(status || 'pending').toLowerCase().trim();
    if (value === 'sortlisted' || value === 'interview_scheduled') return 'shortlisted';
    return value;
};

/** Add company branding fields from the posting company admin */
const enrichJobWithCompanyMedia = async (job) => {
    if (!job?.postedBy) return job;

    const postedByUser = await User.findById(job.postedBy);
    if (!postedByUser) return job;

    if (postedByUser.companyInfo?.companyBanner) {
        job.companyBanner = postedByUser.companyInfo.companyBanner;
    }

    // Company logo is sourced from the company admin avatar.
    // Fallback to optional companyInfo.companyLogo if present in legacy data.
    if (postedByUser.avatar || postedByUser.companyInfo?.companyLogo) {
        job.companyLogo = postedByUser.avatar || postedByUser.companyInfo.companyLogo;
    }

    if (!job.company && postedByUser.companyInfo?.companyName) {
        job.company = postedByUser.companyInfo.companyName;
    }

    return job;
};

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

        // Add company branding/details for each job
        const jobsWithBanners = await Promise.all(jobs.map(async (job) => {
            return await enrichJobWithCompanyMedia(job);
        }));

        // Strip admin-only fields for candidates
        const payload = req.user?.role === 'candidate'
            ? jobsWithBanners.map(stripAdminFields)
            : jobsWithBanners;

        res.status(200).json({
            success: true,
            count: payload.length,
            data: payload
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

        await enrichJobWithCompanyMedia(job);

        // Public / candidate route — strip admin fields
        const isAdmin = req.user && ['admin', 'company_admin', 'recruiter'].includes(req.user.role);
        res.status(200).json({
            success: true,
            data: isAdmin ? job : stripAdminFields(job)
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

        // Coerce admin fields
        if (req.body.applicationCutoffDate) {
            req.body.applicationCutoffDate = new Date(req.body.applicationCutoffDate);
        }
        if (req.body.requiredApplications) {
            req.body.requiredApplications = parseInt(req.body.requiredApplications, 10);
        }

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

        // Coerce admin fields before update
        if (req.body.applicationCutoffDate) {
            req.body.applicationCutoffDate = new Date(req.body.applicationCutoffDate);
        }
        if (req.body.requiredApplications !== undefined) {
            req.body.requiredApplications = req.body.requiredApplications
                ? parseInt(req.body.requiredApplications, 10)
                : null;
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
                // Prefer persisted scoring fields from application record.
                const storedScore = application?.finalScore
                    ?? application?.matchScore
                    ?? application?.aiAnalysis?.matchScore;

                if (Number.isFinite(Number(storedScore))) {
                    matchScore = Number(storedScore);
                    analysis = {
                        ...(application?.aiAnalysis || {}),
                        score: Number(storedScore),
                        resumeScore: application?.resumeScore,
                        profileScore: application?.profileScore,
                        aiSummary: application?.aiSummary
                    };
                } else {
                    // Fallback: recompute only when persisted score is unavailable.
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
            }

            const { password, ...candidateData } = candidate._doc || candidate; // Handle Mongoose document
            const appId = application?._id?.toString();
            console.log(`📋 Candidate ${candidate.name} - Application ID: ${appId}`);
            return {
                ...candidateData,
                applicationId: appId, // Convert ObjectId to string for JSON
                resume: resumeUrl, // Explicitly include the resume URL found
                finalScore: includeMatchAnalysis ? (application?.finalScore ?? undefined) : undefined,
                resumeScore: includeMatchAnalysis ? (application?.resumeScore ?? undefined) : undefined,
                profileScore: includeMatchAnalysis ? (application?.profileScore ?? undefined) : undefined,
                aiSummary: includeMatchAnalysis ? (application?.aiSummary ?? application?.aiAnalysis?.summary ?? undefined) : undefined,
                matchScore: includeMatchAnalysis ? matchScore : undefined, // Only include if authorized
                analysis: includeMatchAnalysis ? analysis : undefined,    // Only include if authorized
                applicationStatus: application?.status, // Raw status
                applicationStatusNormalized: normalizeApplicationStatus(application?.status) // UI lane status
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

// @desc    Retry scheduling for all jobs with remaining eligible candidates
// @route   POST /api/jobs/retry-scheduling
// @access  Private (Company Admin)
export const retrySchedulingForCompanyAdmin = async (req, res) => {
    try {
        const companyAdminId = req.user._id;
        const { getDb } = await import('../config/db.js');
        const db = getDb();

        const jobs = await Job.find({
            postedBy: companyAdminId,
            requiredApplications: { $gt: 0 }
        });

        if (!jobs.length) {
            return res.status(200).json({
                success: true,
                message: 'No jobs found for scheduling retry',
                data: {
                    attemptedJobs: 0,
                    retriedJobs: 0,
                    totalScheduled: 0,
                    totalFailed: 0,
                    totalSkipped: 0,
                    jobs: []
                }
            });
        }

        const results = [];
        let totalScheduled = 0;
        let totalFailed = 0;
        let totalSkipped = 0;
        let retriedJobs = 0;

        for (const job of jobs) {
            const eligibleCount = await db.collection('applications').countDocuments({
                jobId: job._id,
                status: { $in: ['shortlisted', 'reviewing', 'pending'] },
                interviewScheduled: { $ne: true }
            });

            if (eligibleCount <= 0) {
                continue;
            }

            retriedJobs += 1;

            await Job.findByIdAndUpdate(job._id, {
                schedulingStatus: 'in_progress',
                schedulingError: null,
                updatedAt: new Date()
            });

            try {
                const outcome = await bulkScheduleInterviews(job._id);
                const finalStatus = outcome.scheduled > 0 ? 'scheduled' : (outcome.failed > 0 ? 'failed' : 'pending');

                await Job.findByIdAndUpdate(job._id, {
                    schedulingStatus: finalStatus,
                    schedulingResult: {
                        scheduled: outcome.scheduled || 0,
                        failed: outcome.failed || 0,
                        skipped: outcome.skipped || 0,
                        reasonCounts: outcome.reasonCounts || {},
                        batchId: outcome.batchId,
                        completedAt: new Date()
                    },
                    schedulingError: null,
                    updatedAt: new Date()
                });

                totalScheduled += outcome.scheduled || 0;
                totalFailed += outcome.failed || 0;
                totalSkipped += outcome.skipped || 0;

                results.push({
                    jobId: job._id,
                    jobTitle: job.title,
                    eligibleCount,
                    scheduled: outcome.scheduled || 0,
                    failed: outcome.failed || 0,
                    skipped: outcome.skipped || 0,
                    batchId: outcome.batchId,
                    reasonCounts: outcome.reasonCounts || {}
                });
            } catch (error) {
                await Job.findByIdAndUpdate(job._id, {
                    schedulingStatus: 'failed',
                    schedulingError: error.message,
                    updatedAt: new Date()
                });

                totalFailed += eligibleCount;

                results.push({
                    jobId: job._id,
                    jobTitle: job.title,
                    eligibleCount,
                    scheduled: 0,
                    failed: eligibleCount,
                    skipped: 0,
                    error: error.message
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: retriedJobs > 0 ? 'Scheduling retry completed' : 'No eligible candidates available for retry',
            data: {
                attemptedJobs: jobs.length,
                retriedJobs,
                totalScheduled,
                totalFailed,
                totalSkipped,
                jobs: results
            }
        });
    } catch (error) {
        console.error('Error retrying scheduling:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retry scheduling'
        });
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

            // Calculate AI analysis immediately upon application creation
            if (req.user.resume && job.description) {
                const { parseResume, calculateMatchScore } = await import('../utils/resumeMatcher.js');
                try {
                    console.log('🤖 Calculating AI analysis for new application...');
                    let resumeText = req.user.resumeText;
                    if (!resumeText && req.user.resume) {
                        resumeText = await parseResume(req.user.resume);
                    }

                    if (resumeText) {
                        const matchResult = calculateMatchScore(
                            job.description + ' ' + (job.requirements || ''),
                            resumeText
                        );
                        newApplicationData.matchScore = matchResult.resumeScore || matchResult.score;
                        newApplicationData.aiAnalysis = {
                            matchScore: matchResult.resumeScore || matchResult.score,
                            summary: matchResult.summary,
                            insights: {
                                strengths: matchResult.strongMatches?.join(', ') || 'N/A',
                                concerns: matchResult.missingKeywords?.join(', ') || 'None',
                                experience: `Experience Score: ${matchResult.experienceScore}%`,
                                skills: `Skills Coverage: ${matchResult.skillsScore}%`
                            }
                        };
                        console.log('✅ AI analysis calculated:', newApplicationData.matchScore);
                    } else {
                        console.warn('⚠️  Could not parse resume, setting 0% analysis');
                        newApplicationData.matchScore = 0;
                        newApplicationData.aiAnalysis = {
                            matchScore: 0,
                            summary: 'Unable to analyze - resume file not accessible',
                            insights: {
                                strengths: 'N/A',
                                concerns: 'Resume could not be retrieved from storage',
                                experience: 'Experience Score: N/A',
                                skills: 'Skills Coverage: N/A'
                            }
                        };
                    }
                } catch (aiError) {
                    console.error('❌ Error calculating AI analysis:', aiError.message);
                    // Continue without AI analysis
                }
            }

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

// @desc    Get recruiters mapped/matched to a specific job (by role scoring)
// @route   GET /api/jobs/:id/mapped-recruiters
// @access  Private (Company Admin)
export const getMappedRecruiters = async (req, res) => {
    try {
        const { default: Recruiter } = await import('../models/Recruiter.js');
        const { calculateRecruiterJobMatch } = await import('../services/recruiterMatchingService.js');

        // Get the job
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        // Only company admin who owns the job can see this
        if (job.postedBy?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Get all active recruiters under this company admin
        const recruiters = await Recruiter.findWithUserDetails({
            companyAdminId: req.user._id,
            status: 'active'
        });

        if (recruiters.length === 0) {
            return res.status(200).json({ success: true, count: 0, data: [] });
        }

        // Score each recruiter against this job
        const scored = recruiters.map(recruiter => {
            const matchScore = calculateRecruiterJobMatch(job, recruiter);

            // Determine match tier
            let matchTier;
            if (matchScore >= 70) matchTier = 'strong';
            else if (matchScore >= 45) matchTier = 'good';
            else if (matchScore >= 20) matchTier = 'partial';
            else matchTier = 'low';

            // Which of this recruiter's roles matched the job title
            const jobTitleLower = (job.title || '').toLowerCase();
            const matchedRoles = (recruiter.roles || []).filter(role =>
                jobTitleLower.split(' ').some(word =>
                    word.length > 2 && role.toLowerCase().includes(word)
                )
            );

            return {
                _id: recruiter._id,
                user: recruiter.user,
                roles: recruiter.roles || [],
                skills: recruiter.skills || [],
                expertise: recruiter.expertise || [],
                experience: recruiter.experience || '',
                availability: recruiter.availability,
                activeJobs: recruiter.activeJobs || [],
                pendingInterviews: recruiter.pendingInterviews || 0,
                matchScore,
                matchTier,
                matchedRoles  // highlighted roles subset
            };
        });

        // Sort: strong matches first, then by score
        scored.sort((a, b) => b.matchScore - a.matchScore);

        res.status(200).json({
            success: true,
            count: scored.length,
            job: { _id: job._id, title: job.title, department: job.department },
            data: scored
        });
    } catch (error) {
        console.error('Error fetching mapped recruiters:', error);
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};
