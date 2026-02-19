/**
 * Example: How to use the Hybrid Screening Engine
 * 
 * This file demonstrates how to integrate the new evaluateApplication function
 * into your application controllers or background workers.
 */

import { evaluateApplication, parseResume, calculateMatchScore, calculateProfileScore, generateCandidateInsights } from '../utils/resumeMatcher.js';

// ============================================================================
// EXAMPLE 1: Complete Evaluation (Recommended for Background Processing)
// ============================================================================

export const evaluateApplicationExample = async (req, res) => {
    try {
        const { applicationId } = req.params;

        // Fetch application data from database
        const application = await Application.findById(applicationId);
        const job = await Job.findById(application.jobId);
        const candidate = await User.findById(application.candidateId);

        // Run complete evaluation
        const result = await evaluateApplication({
            resumeUrl: candidate.resume, // RAW Cloudinary URL (not signed JPG)
            jobDescription: job.description + ' ' + (job.requirements || ''),
            experienceYears: candidate.experienceYears || 0,
            skills: candidate.skills || [],
            projects: candidate.projects || [],
            answers: application.formData || {}
        });

        // Save results to database
        await Application.findByIdAndUpdate(applicationId, {
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
            evaluatedAt: result.evaluatedAt,
            status: 'evaluated'
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error evaluating application:', error);
        res.status(500).json({
            success: false,
            message: 'Evaluation failed',
            error: error.message
        });
    }
};

// ============================================================================
// EXAMPLE 2: Individual Function Usage
// ============================================================================

export const individualFunctionsExample = async (req, res) => {
    try {
        const { applicationId } = req.params;

        const application = await Application.findById(applicationId);
        const job = await Job.findById(application.jobId);
        const candidate = await User.findById(application.candidateId);

        // Step 1: Parse Resume
        const resumeText = await parseResume(candidate.resume);

        // Step 2: Calculate Resume Score
        const resumeResult = calculateMatchScore(
            job.description + ' ' + (job.requirements || ''),
            resumeText
        );

        // Step 3: Calculate Profile Score
        const profileResult = calculateProfileScore({
            experienceYears: candidate.experienceYears || 0,
            skills: candidate.skills || [],
            projects: candidate.projects || [],
            jobDescription: job.description
        });

        // Step 4: Calculate Final Score
        const finalScore = Math.round(
            (resumeResult.resumeScore * 0.6) +
            (profileResult.profileScore * 0.4)
        );

        // Step 5: Generate AI Insights (optional)
        const aiInsights = await generateCandidateInsights({
            jdText: job.description,
            resumeText,
            answersJSON: application.formData || {}
        });

        res.json({
            success: true,
            data: {
                finalScore,
                resumeScore: resumeResult.resumeScore,
                profileScore: profileResult.profileScore,
                aiInsights
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================================================
// EXAMPLE 3: Background Worker / Cron Job
// ============================================================================

export const backgroundEvaluationWorker = async () => {
    console.log('🔄 Starting background evaluation worker...');

    try {
        // Find all applications pending evaluation
        const pendingApplications = await Application.find({
            status: 'pending_evaluation'
        }).limit(10); // Process in batches

        console.log(`📊 Found ${pendingApplications.length} applications to evaluate`);

        for (const application of pendingApplications) {
            try {
                // Mark as processing
                await Application.findByIdAndUpdate(application._id, {
                    status: 'evaluating'
                });

                // Fetch related data
                const job = await Job.findById(application.jobId);
                const candidate = await User.findById(application.candidateId);

                if (!job || !candidate) {
                    console.error(`❌ Missing job or candidate for application ${application._id}`);
                    continue;
                }

                // Run evaluation
                console.log(`⚙️  Evaluating application ${application._id}...`);
                const result = await evaluateApplication({
                    resumeUrl: candidate.resume,
                    jobDescription: job.description + ' ' + (job.requirements || ''),
                    experienceYears: candidate.experienceYears || 0,
                    skills: candidate.skills || [],
                    projects: candidate.projects || [],
                    answers: application.formData || {}
                });

                // Save results
                await Application.findByIdAndUpdate(application._id, {
                    status: 'evaluated',
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
                    evaluatedAt: new Date()
                });

                console.log(`✅ Application ${application._id} evaluated: Score ${result.finalScore}`);

            } catch (error) {
                console.error(`❌ Error evaluating application ${application._id}:`, error);

                // Increment retry count and revert status
                await Application.findByIdAndUpdate(application._id, {
                    status: 'pending_evaluation',
                    $inc: { retryCount: 1 },
                    lastError: error.message
                });
            }
        }

        console.log('✅ Background evaluation worker completed');

    } catch (error) {
        console.error('❌ Background worker error:', error);
    }
};

// ============================================================================
// EXAMPLE 4: Real-time Evaluation on Application Submit
// ============================================================================

export const onApplicationSubmit = async (req, res) => {
    try {
        const { jobId, formData } = req.body;
        const candidateId = req.user._id;

        // Create application
        const application = await Application.create({
            jobId,
            candidateId,
            formData,
            status: 'submitted'
        });

        // Trigger async evaluation (don't wait for it)
        evaluateApplicationAsync(application._id).catch(err => {
            console.error('Async evaluation error:', err);
        });

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: application
        });

    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Helper function for async evaluation
const evaluateApplicationAsync = async (applicationId) => {
    try {
        const application = await Application.findById(applicationId);
        const job = await Job.findById(application.jobId);
        const candidate = await User.findById(application.candidateId);

        const result = await evaluateApplication({
            resumeUrl: candidate.resume,
            jobDescription: job.description + ' ' + (job.requirements || ''),
            experienceYears: candidate.experienceYears || 0,
            skills: candidate.skills || [],
            projects: candidate.projects || [],
            answers: application.formData || {}
        });

        await Application.findByIdAndUpdate(applicationId, {
            status: 'evaluated',
            ...result
        });

        console.log(`✅ Application ${applicationId} evaluated asynchronously`);

    } catch (error) {
        console.error(`❌ Async evaluation failed for ${applicationId}:`, error);
    }
};

// ============================================================================
// EXAMPLE 5: Bulk Re-evaluation (Useful for testing or updates)
// ============================================================================

export const bulkReEvaluate = async (req, res) => {
    try {
        const { jobId } = req.params;

        // Find all applications for this job
        const applications = await Application.find({ jobId });

        console.log(`🔄 Re-evaluating ${applications.length} applications for job ${jobId}`);

        let successCount = 0;
        let failCount = 0;

        for (const application of applications) {
            try {
                const job = await Job.findById(application.jobId);
                const candidate = await User.findById(application.candidateId);

                const result = await evaluateApplication({
                    resumeUrl: candidate.resume,
                    jobDescription: job.description + ' ' + (job.requirements || ''),
                    experienceYears: candidate.experienceYears || 0,
                    skills: candidate.skills || [],
                    projects: candidate.projects || [],
                    answers: application.formData || {}
                });

                await Application.findByIdAndUpdate(application._id, result);
                successCount++;

            } catch (error) {
                console.error(`Error re-evaluating ${application._id}:`, error);
                failCount++;
            }
        }

        res.json({
            success: true,
            message: `Re-evaluation complete`,
            stats: {
                total: applications.length,
                success: successCount,
                failed: failCount
            }
        });

    } catch (error) {
        console.error('Bulk re-evaluation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================================================
// EXAMPLE 6: Setup Cron Job (using node-cron)
// ============================================================================

import cron from 'node-cron';

export const setupEvaluationCron = () => {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        console.log('🕐 Running scheduled evaluation worker...');
        await backgroundEvaluationWorker();
    });

    console.log('✅ Evaluation cron job scheduled (every 5 minutes)');
};

// Call this in your server startup:
// setupEvaluationCron();
