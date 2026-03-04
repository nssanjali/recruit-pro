import cron from 'node-cron';
import Communication from '../models/Communication.js';
import { sendEmail } from './emailService.js';
import { getDb } from '../config/db.js';
import { bulkScheduleInterviews } from './interviewSchedulingService.js';

// ─── Guard flags ──────────────────────────────────────────────────────────────
let isProcessingCommunications = false;
let isProcessingCutoffs = false;

// ─── Job 1: Scheduled Communications (every 10 min) ──────────────────────────
const processScheduledCommunications = async () => {
    if (isProcessingCommunications) {
        console.log('[cron] Skipping communications tick — previous run still active');
        return;
    }
    isProcessingCommunications = true;
    try {
        const dueCommunications = await Communication.findScheduledDue();
        if (dueCommunications.length > 0) {
            console.log(`[cron] Found ${dueCommunications.length} scheduled communications to send`);
        }
        for (const comm of dueCommunications) {
            await new Promise(resolve => setImmediate(resolve));
            try {
                if (comm.metadata?.templateName && comm.metadata?.data) {
                    const result = await sendEmail(
                        comm.recipient,
                        comm.metadata.templateName,
                        comm.metadata.data
                    );
                    await Communication.findByIdAndUpdate(comm._id, {
                        status: result.success ? 'sent' : 'failed',
                        sentAt: new Date(),
                        error: result.error || null
                    });
                    console.log(`[cron] Sent ${comm.type} to ${comm.recipient}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
                }
            } catch (error) {
                console.error(`[cron] Error sending communication ${comm._id}:`, error.message);
                await Communication.findByIdAndUpdate(comm._id, {
                    status: 'failed',
                    error: error.message
                });
            }
        }
    } catch (error) {
        console.error('[cron] Error processing scheduled communications:', error.message);
    } finally {
        isProcessingCommunications = false;
    }
};

// ─── Job 2: Cutoff-based Interview Scheduling (every 5 min) ──────────────────
const processCutoffJobs = async () => {
    if (isProcessingCutoffs) {
        console.log('[cron] Skipping cutoff-scheduler tick — previous run still active');
        return;
    }
    isProcessingCutoffs = true;
    try {
        const db = getDb();
        const now = new Date();

        // Find jobs where cutoff has passed + quota set + not yet scheduled or failed
        const jobs = await db.collection('jobs').find({
            applicationCutoffDate: { $lte: now },
            requiredApplications: { $gt: 0 },
            schedulingStatus: { $in: [null, 'pending'] }
        }).toArray();

        if (jobs.length > 0) {
            console.log(`[cron] Found ${jobs.length} job(s) past cutoff — starting bulk scheduling`);
        }

        for (const job of jobs) {
            await new Promise(resolve => setImmediate(resolve)); // yield between jobs

            // Lock immediately to prevent duplicate runs
            await db.collection('jobs').updateOne(
                { _id: job._id },
                { $set: { schedulingStatus: 'in_progress', updatedAt: new Date() } }
            );

            try {
                const result = await bulkScheduleInterviews(job._id);

                const finalStatus = result.scheduled > 0 ? 'scheduled'
                    : result.message === 'No recruiters available' ? 'no_recruiters'
                        : 'scheduled'; // even 0 scheduled is a valid completed state

                await db.collection('jobs').updateOne(
                    { _id: job._id },
                    {
                        $set: {
                            schedulingStatus: finalStatus,
                            schedulingResult: {
                                scheduled: result.scheduled,
                                failed: result.failed,
                                batchId: result.batchId,
                                completedAt: new Date()
                            },
                            updatedAt: new Date()
                        }
                    }
                );
                console.log(`[cron] Job ${job._id} ⟶ ${finalStatus} (${result.scheduled} scheduled, ${result.failed} failed)`);
            } catch (err) {
                console.error(`[cron] Scheduling failed for job ${job._id}:`, err.message);
                await db.collection('jobs').updateOne(
                    { _id: job._id },
                    {
                        $set: {
                            schedulingStatus: 'failed',
                            schedulingError: err.message,
                            updatedAt: new Date()
                        }
                    }
                );
            }
        }
    } catch (error) {
        console.error('[cron] Error in cutoff-scheduler:', error.message);
    } finally {
        isProcessingCutoffs = false;
    }
};

// ─── Job 3: Auto-inactivate Expired Jobs (every 30 min) ──────────────────────
let isProcessingExpiredJobs = false;

const inactivateExpiredJobs = async () => {
    if (isProcessingExpiredJobs) {
        console.log('[cron] Skipping expired-job inactivation — previous run still active');
        return;
    }
    isProcessingExpiredJobs = true;
    try {
        const db = getDb();
        const now = new Date();

        // Find open jobs where the cutoff date has passed
        const expiredJobs = await db.collection('jobs').find({
            status: 'open',
            applicationCutoffDate: { $lte: now },
            applicationCutoffDate: { $ne: null }
        }).toArray();

        if (expiredJobs.length > 0) {
            console.log(`[cron] Found ${expiredJobs.length} job(s) with passed cutoff date — inactivating...`);
            
            const result = await db.collection('jobs').updateMany(
                {
                    status: 'open',
                    applicationCutoffDate: { $lte: now },
                    applicationCutoffDate: { $ne: null }
                },
                {
                    $set: {
                        status: 'closed',
                        closedAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            );

            console.log(`[cron] Inactivated ${result.modifiedCount} expired job(s)`);
        }
    } catch (error) {
        console.error('[cron] Error inactivating expired jobs:', error.message);
    } finally {
        isProcessingExpiredJobs = false;
    }
};

// ─── Initialize ───────────────────────────────────────────────────────────────
export const initializeCronJobs = () => {
    console.log('Initializing cron jobs...');

    // Communications processor — every 10 minutes
    cron.schedule('*/10 * * * *', () => {
        setImmediate(() => {
            processScheduledCommunications().catch(err =>
                console.error('[cron] Unhandled error in communications job:', err.message)
            );
        });
    });

    // Interview cutoff scheduler — every 5 minutes
    cron.schedule('*/5 * * * *', () => {
        setImmediate(() => {
            processCutoffJobs().catch(err =>
                console.error('[cron] Unhandled error in cutoff-scheduler:', err.message)
            );
        });
    });

    // Auto-inactivate expired jobs — every 30 minutes
    cron.schedule('*/30 * * * *', () => {
        setImmediate(() => {
            inactivateExpiredJobs().catch(err =>
                console.error('[cron] Unhandled error in expired-jobs inactivation:', err.message)
            );
        });
    });

    console.log('Cron jobs initialized successfully');
    console.log('- Scheduled communications : Every 10 minutes');
    console.log('- Interview cutoff trigger  : Every 5 minutes');
    console.log('- Expired jobs inactivation : Every 30 minutes');
};

export default {
    initializeCronJobs,
    processScheduledCommunications,
    processCutoffJobs,
    inactivateExpiredJobs
};
