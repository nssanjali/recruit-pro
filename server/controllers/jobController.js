import Job from '../models/Job.js';
import User from '../models/User.js';
import Application from '../models/Application.js';
import { ObjectId } from 'mongodb';
import { parseResume, calculateMatchScore } from '../utils/resumeMatcher.js';
import { bulkScheduleInterviews } from '../services/interviewSchedulingService.js';
import { assertCandidateCanApply } from '../services/candidateReliabilityService.js';
import { getDb } from '../config/db.js';
import { isAllowedResumeReference } from '../config/cloudinary.js';

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

const toNormalizedScore = (value) => {
    const score = Number(value);
    if (!Number.isFinite(score)) return null;
    return Math.max(0, Math.min(100, score));
};

const deriveRecruiterReviewScore = (interviewReview) => {
    const directScore = toNormalizedScore(interviewReview?.score ?? interviewReview?.overallScore);
    if (directScore !== null) return Math.round(directScore);

    const ratingValues = Object.values(interviewReview?.ratings || {})
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 0);
    if (ratingValues.length > 0) {
        const maxRatingValue = Math.max(...ratingValues);
        const normalized = maxRatingValue <= 5
            ? ratingValues.map((value) => value * 20)
            : ratingValues;
        const avg = normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
        return Math.round(Math.max(0, Math.min(100, avg)));
    }

    const rec = String(interviewReview?.recruiterRecommendation || '').toLowerCase();
    if (rec === 'hire') return 85;
    if (rec === 'consider') return 65;
    if (rec === 'reject') return 40;
    return null;
};

const ROLE_FIT_TEMPLATES = [
    { role: 'Data Engineer', keywords: ['etl', 'airflow', 'spark', 'hadoop', 'kafka', 'dbt', 'warehouse', 'pipeline', 'sql', 'data modeling'] },
    { role: 'Backend Engineer', keywords: ['node', 'java', 'python', 'api', 'microservices', 'rest', 'graphql', 'database', 'redis', 'docker'] },
    { role: 'Frontend Engineer', keywords: ['react', 'javascript', 'typescript', 'css', 'html', 'redux', 'next', 'ui', 'frontend', 'tailwind'] },
    { role: 'Full Stack Engineer', keywords: ['react', 'node', 'api', 'database', 'frontend', 'backend', 'full stack', 'typescript', 'deployment'] },
    { role: 'DevOps Engineer', keywords: ['kubernetes', 'docker', 'ci/cd', 'aws', 'gcp', 'azure', 'terraform', 'ansible', 'monitoring', 'linux'] },
    { role: 'Data Analyst', keywords: ['excel', 'tableau', 'power bi', 'analytics', 'dashboard', 'sql', 'reporting', 'insights', 'statistics'] },
    { role: 'Machine Learning Engineer', keywords: ['machine learning', 'tensorflow', 'pytorch', 'model', 'feature engineering', 'nlp', 'scikit', 'mlops'] },
    { role: 'QA Engineer', keywords: ['testing', 'selenium', 'cypress', 'automation', 'qa', 'test cases', 'regression', 'quality assurance'] }
];

const buildCandidateProfileText = (candidate, resumeText) => {
    const skills = Array.isArray(candidate?.skills) ? candidate.skills.join(', ') : '';
    const specialization = Array.isArray(candidate?.specialization) ? candidate.specialization.join(', ') : String(candidate?.specialization || '');
    const projects = Array.isArray(candidate?.projects)
        ? candidate.projects.map((p) => {
            if (typeof p === 'string') return p;
            if (p && typeof p === 'object') return [p.title, p.description, p.techStack].filter(Boolean).join(' ');
            return '';
        }).join(' ')
        : '';
    const experience = `${candidate?.experienceYears || 0} years experience`;
    return [resumeText, skills, specialization, projects, experience].filter(Boolean).join(' ');
};

const inferRoleFits = (profileText) => {
    const text = String(profileText || '').toLowerCase();
    const fits = ROLE_FIT_TEMPLATES.map((item) => {
        const matchedKeywords = item.keywords.filter((kw) => text.includes(kw.toLowerCase()));
        const score = Math.round((matchedKeywords.length / item.keywords.length) * 100);
        return {
            role: item.role,
            score,
            matchedKeywords: matchedKeywords.slice(0, 6)
        };
    })
        .filter((item) => item.matchedKeywords.length >= 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    return fits.length > 0
        ? fits
        : [{
            role: 'General Software Engineer',
            score: 45,
            matchedKeywords: ['software', 'engineering']
        }];
};

const computeRoleTitleBoost = (job, topRoles) => {
    const title = `${job?.title || ''} ${job?.department || ''}`.toLowerCase();
    const roleBoosts = topRoles.map((r) => {
        const roleTokens = String(r.role || '').toLowerCase().split(' ').filter((t) => t.length > 2);
        const hitCount = roleTokens.filter((token) => title.includes(token)).length;
        return hitCount > 0 ? Math.min(15, hitCount * 6) : 0;
    });
    return roleBoosts.length > 0 ? Math.max(...roleBoosts) : 0;
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
        // - company_admin: sees only jobs they posted (all statuses — they manage them)
        // - recruiter: sees only jobs mapped to them (all statuses — they need to manage pipeline)
        // - admin: sees all jobs
        // - candidate: sees ONLY open jobs (closed/draft are hidden)
        console.log(`getJobs request from user: ${req.user._id} (Role: ${req.user.role})`);

        if (req.user.role === 'candidate') {
            // Candidates see only actively open jobs
            query.status = 'open';
        } else if (req.user.role === 'company_admin') {
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

        // Candidates and unauthenticated users cannot view closed/draft jobs
        const isAdmin = req.user && ['admin', 'company_admin', 'recruiter'].includes(req.user.role);
        if (!isAdmin && job.status !== 'open') {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        await enrichJobWithCompanyMedia(job);

        // Public / candidate route — strip admin fields
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
        const db = getDb();
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
        const applicationIds = applications.map(app => app._id?.toString()).filter(Boolean);

        if (candidateIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }

        const candidates = await User.find({ _id: { $in: candidateIds } });
        const latestInterviewByApplicationId = new Map();
        if (applicationIds.length > 0) {
            const interviewQueryIds = applicationIds.flatMap((id) => {
                const values = [id];
                try {
                    values.push(new ObjectId(id));
                } catch {
                    // Ignore invalid ObjectId strings
                }
                return values;
            });

            const interviews = await db.collection('interviews')
                .find({
                    jobId: job._id,
                    applicationId: { $in: interviewQueryIds }
                })
                .sort({ scheduledAt: -1, createdAt: -1 })
                .toArray();

            for (const interview of interviews) {
                const appId = interview?.applicationId?.toString?.();
                if (!appId || latestInterviewByApplicationId.has(appId)) continue;
                latestInterviewByApplicationId.set(appId, interview);
            }
        }

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
            const latestInterview = appId ? latestInterviewByApplicationId.get(appId) : null;
            const interviewReview = latestInterview?.interviewReview || application?.interviewReview || null;
            const interviewAi = latestInterview?.aiInterviewAnalysis || application?.interviewAiAnalysis || null;
            const initialShortlistScore = toNormalizedScore(matchScore);
            const recruiterReviewScore = deriveRecruiterReviewScore(interviewReview);
            const interviewAiScore = toNormalizedScore(interviewAi?.score);
            const hasAllUltimateMetrics = (
                initialShortlistScore !== null &&
                recruiterReviewScore !== null &&
                interviewAiScore !== null
            );
            const ultimateAverageScore = hasAllUltimateMetrics
                ? Math.round((initialShortlistScore + recruiterReviewScore + interviewAiScore) / 3)
                : null;
            console.log(`📋 Candidate ${candidate.name} - Application ID: ${appId}`);
            return {
                ...candidateData,
                applicationId: appId, // Convert ObjectId to string for JSON
                resume: Boolean(resumeUrl), // Do not expose raw resume URL
                finalScore: includeMatchAnalysis ? (application?.finalScore ?? undefined) : undefined,
                resumeScore: includeMatchAnalysis ? (application?.resumeScore ?? undefined) : undefined,
                profileScore: includeMatchAnalysis ? (application?.profileScore ?? undefined) : undefined,
                aiSummary: includeMatchAnalysis ? (application?.aiSummary ?? application?.aiAnalysis?.summary ?? undefined) : undefined,
                matchScore: includeMatchAnalysis ? matchScore : undefined, // Only include if authorized
                analysis: includeMatchAnalysis ? analysis : undefined,    // Only include if authorized
                ultimateAverageScore: includeMatchAnalysis ? ultimateAverageScore : undefined,
                scoringBreakdown: includeMatchAnalysis ? {
                    initialShortlistScore,
                    recruiterReviewScore,
                    interviewAiScore
                } : undefined,
                applicationStatus: application?.status, // Raw status
                applicationStatusNormalized: normalizeApplicationStatus(application?.status) // UI lane status
            };
        }));

        // Sort by ultimate average score first, then match score (descending)
        if (includeMatchAnalysis) {
            candidatesWithScores.sort((a, b) => {
                const aUltimate = Number.isFinite(Number(a.ultimateAverageScore))
                    ? Number(a.ultimateAverageScore)
                    : null;
                const bUltimate = Number.isFinite(Number(b.ultimateAverageScore))
                    ? Number(b.ultimateAverageScore)
                    : null;

                if (aUltimate !== null && bUltimate !== null) return bUltimate - aUltimate;
                if (aUltimate !== null) return -1;
                if (bUltimate !== null) return 1;

                return Number(b.matchScore ?? -1) - Number(a.matchScore ?? -1);
            });
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

        const resumeRef = String(req.user?.resume || '').trim();
        let resumeText = '';
        if (resumeRef && isAllowedResumeReference(resumeRef)) {
            try {
                resumeText = req.user?.resumeText || await parseResume(resumeRef) || '';
            } catch {
                resumeText = '';
            }
        }

        const profileText = buildCandidateProfileText(req.user, resumeText);
        const analysisText = String((resumeText && resumeText.length >= 120) ? resumeText : profileText || '').trim();

        const matchScore = analysisText
            ? calculateMatchScore(job.description + ' ' + (job.requirements || ''), analysisText)
            : {
                score: 0,
                resumeScore: 0,
                summary: 'Not enough resume/profile data to calculate a reliable match.',
                strongMatches: [],
                missingKeywords: []
            };

        res.status(200).json({
            success: true,
            analysis: matchScore,
            analysisMode: (resumeText && resumeText.length >= 120) ? 'resume' : 'profile'
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

// @desc    Analyze candidate resume/profile and return role-fit job recommendations
// @route   POST /api/jobs/role-fit/analyze
// @access  Private (Candidate)
export const analyzeCandidateRoleFit = async (req, res) => {
    try {
        const db = getDb();
        const candidate = req.user;
        const providedResumeUrl = String(req.body?.resumeUrl || '').trim();
        const resumeUrl = providedResumeUrl || String(candidate?.resume || '').trim();

        let resumeText = '';
        if (resumeUrl && isAllowedResumeReference(resumeUrl)) {
            try {
                resumeText = await parseResume(resumeUrl) || '';
            } catch {
                resumeText = '';
            }
        }

        const hasStrongResume = resumeText.length >= 120;
        const profileText = buildCandidateProfileText(candidate, hasStrongResume ? resumeText : '');
        const analysisText = String(hasStrongResume ? resumeText : profileText || '').trim();

        if (!analysisText) {
            return res.status(400).json({
                success: false,
                message: 'Not enough profile data to analyze role fit. Add skills or experience first.'
            });
        }

        const topRoles = inferRoleFits(profileText);

        const jobs = await db.collection('jobs').find({ status: { $ne: 'closed' } }).toArray();
        const jobFits = jobs.map((job) => {
            const jdText = `${job.title || ''} ${job.department || ''} ${job.description || ''} ${job.requirements || ''}`;
            const match = calculateMatchScore(jdText, analysisText);
            const baseScore = Number(match?.score ?? match?.resumeScore ?? 0);
            const roleBoost = computeRoleTitleBoost(job, topRoles);
            const fitScore = Math.max(0, Math.min(100, Math.round((baseScore * 0.85) + roleBoost)));

            return {
                ...job,
                fitScore,
                fitReason: roleBoost > 0
                    ? 'Strong match between your role-fit profile and this job title'
                    : hasStrongResume
                        ? 'Resume and skills alignment with job description'
                        : 'Profile and skills alignment with job description'
            };
        })
            .filter((job) => job.fitScore >= (hasStrongResume ? 55 : 45))
            .sort((a, b) => b.fitScore - a.fitScore);

        return res.status(200).json({
            success: true,
            data: {
                resumeSource: hasStrongResume
                    ? (providedResumeUrl ? 'uploaded' : 'profile')
                    : 'profile-fallback',
                analysisMode: hasStrongResume ? 'resume' : 'profile',
                topRoles,
                recommendedJobIds: jobFits.map((job) => String(job._id)),
                recommendedJobs: jobFits.slice(0, 50)
            }
        });
    } catch (error) {
        console.error('Error analyzing candidate role fit:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to analyze role fit'
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
        assertCandidateCanApply(req.user);
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

        // Block applications to closed or draft jobs
        if (job.status !== 'open') {
            return res.status(400).json({
                success: false,
                message: job.status === 'draft'
                    ? 'This job is not yet published and cannot accept applications.'
                    : 'This job is no longer accepting applications.'
            });
        }

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

            if (newApplicationData.resume && !isAllowedResumeReference(newApplicationData.resume)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid resume reference. Please upload resume using secure uploader.'
                });
            }

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
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Server Error'
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
