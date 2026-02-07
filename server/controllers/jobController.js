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
        // - admin: sees all jobs
        // - recruiter/candidate: sees all jobs
        console.log(`getJobs request from user: ${req.user._id} (Role: ${req.user.role})`);

        if (req.user.role === 'company_admin') {
            query.postedBy = req.user._id;
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
// Helper to sign Cloudinary URLs
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (ensure this runs if not already configured globally, 
// though usually done in config/cloudinary.js, we import v2 from there or configure here)
// Better to import the configured instance if possible, or re-configure safely.
// For safety/speed in controller, we'll re-use the env vars.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const signResumeUrl = (rawUrl) => {
    if (!rawUrl || !rawUrl.includes('cloudinary.com')) return null;

    try {
        const matches = rawUrl.match(/\/upload\/(v\d+)\/(.+)$/);
        if (!matches || !matches[2]) return rawUrl;

        const version = matches[1].replace('v', '');
        let publicId = matches[2];

        // Handle PDF specifically: Cloudinary often treats them as 'image' resource_type 
        // but stripping extension might be needed for the public_id param.
        const parts = publicId.split('.');
        if (parts.length > 1) parts.pop(); // Remove extension
        const idWithoutExt = parts.join('.');

        // PDF delivery is strictly blocked (401) on this account.
        // We fallback to delivering the resume as a high-quality JPG image (Page 1)
        // so the recruiter can at least view the content.
        const signedUrl = cloudinary.url(idWithoutExt, {
            resource_type: 'image',
            type: 'upload',
            sign_url: true,
            secure: true,
            format: 'jpg',
            version: version
        });

        return signedUrl;
    } catch (e) {
        console.error("Error signing URL:", e);
        return null;
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

        const candidatesWithScores = await Promise.all(candidates.map(async (candidate) => {
            let matchScore = 0;
            let analysis = null;

            // Use resume from application if available, fallback to user profile
            const application = applications.find(app => app.candidateId.toString() === candidate._id.toString());
            const rawResumeUrl = application?.resume || candidate.resume;

            // Sign the URL for access
            const resumeUrl = signResumeUrl(rawResumeUrl);

            // parsing logic...
            // parsing logic...
            // PRIORITIZE DB TEXT (Avoids Cloudinary 401/404 issues on PDF fetch)
            let resumeText = candidate.resumeText || application?.resumeText;

            if (!resumeText && rawResumeUrl && resumeUrl) {
                // For parsing, we MUST use the RAW url (or specific PDF signed url)
                // The `resumeUrl` is signed for JPG viewing (browser).
                // `parseResume` now handles signing for PDF access internally.
                resumeText = await parseResume(rawResumeUrl);
            }

            if (resumeText) {
                // Result is an object { score, skillsScore, ... }
                const matchResult = calculateMatchScore(job.description + ' ' + (job.requirements || ''), resumeText);
                matchScore = matchResult.score; // Extract the numeric score
                analysis = matchResult;
            }

            const { password, ...candidateData } = candidate._doc || candidate; // Handle Mongoose document
            return {
                ...candidateData,
                resume: resumeUrl, // Explicitly include the resume URL found
                matchScore, // This is now a number
                analysis,    // Full analysis object if needed by frontend
                applicationStatus: application?.status // Include application status
            };
        }));

        // Sort by match score (descending)
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

        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Check if already applied (in Job model)
        if (job.candidates && job.candidates.some(id => id.toString() === userId.toString())) {
            return res.status(400).json({
                success: false,
                message: 'You have already applied to this job'
            });
        }

        // Add user to candidates array in Job
        await Job.findByIdAndUpdate(jobId, {
            $addToSet: { candidates: userId } // Use addToSet to prevent duplicates
        });

        // Check if Application record exists (double check)
        // Import Application model dynamically to avoid circular dependency issues if any
        // But better is to import at top if possible. For now assuming top import is possible.
        // We need to import Application model at the top of the file, let's assume it's there or added.
        // Wait, I need to check if Application is imported. It is NOT imported in the original file view.
        // I will add the import in a separate step or just assume dynamic import for safety here?
        // Let's use string based 'applications' collection insertion if model isn't handy,
        // BUT better practice: I will add `import Application from '../models/Application.js';` to the top of file in a separate edit if needed.
        // Actually, I can't easily add import with replace_file_content if I'm editing a function block unless I replace the whole file.
        // Let's check if I can use the existing `Application` model if I added it? No, I haven't added it yet.
        // I'll stick to updating the Job candidates for now, and rely on the `Application.create` from `applicationController`?
        // NO, the plan was to unify it here because `JobDetails.jsx` calls `applyJob` in `jobController`.
        // So I MUST create the Application record here.

        // Strategy: I will use the `Application` model. I need to ensure it's imported.
        // Since I am replacing this block, I will assume I'll add the import in a subsequent or previous step.
        // For now, let's write the code assuming `Application` is available, and I'll add the import immediately after.

        // Check if application exists
        const existingApp = await Application.findOne({
            candidateId: new ObjectId(userId),
            jobId: new ObjectId(jobId)
        });

        if (!existingApp) {
            await Application.create({
                jobId: new ObjectId(jobId),
                candidateId: new ObjectId(userId),
                candidateName: req.user.name,
                candidateEmail: req.user.email,
                resume: req.user.resume || '',
                status: 'pending'
            });
        }

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
