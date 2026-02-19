import cron from 'node-cron';
import Communication from '../models/Communication.js';
import { sendEmail } from './emailService.js';

// Guard flag — prevents overlapping cron executions if a tick is slow
let isProcessingCommunications = false;

// Process scheduled communications
const processScheduledCommunications = async () => {
    // Skip if a previous run is still in progress (avoids event-loop pile-up)
    if (isProcessingCommunications) {
        console.log('[cron] Skipping communications tick — previous run still active');
        return;
    }

    isProcessingCommunications = true;
    try {
        // Find communications that are due to be sent
        const dueCommunications = await Communication.findScheduledDue();

        if (dueCommunications.length > 0) {
            console.log(`[cron] Found ${dueCommunications.length} scheduled communications to send`);
        }

        for (const comm of dueCommunications) {
            // Yield to the event loop between each email so cron timers can fire
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

// Initialize cron jobs
export const initializeCronJobs = () => {
    console.log('Initializing cron jobs...');

    // Run every 10 minutes — gives enough breathing room for event-loop intensive
    // operations (PDF parsing, Gemini AI) that run in the same process.
    // node-cron v4 logs a WARN when a tick is missed due to blocking I/O;
    // the longer interval + isProcessing guard prevents missed ticks.
    cron.schedule('*/10 * * * *', () => {
        // Use setImmediate so the cron callback itself doesn't block the scheduler
        setImmediate(() => {
            processScheduledCommunications().catch(err =>
                console.error('[cron] Unhandled error in communications job:', err.message)
            );
        });
    });

    console.log('Cron jobs initialized successfully');
    console.log('- Scheduled communications: Every 10 minutes');
};

export default {
    initializeCronJobs,
    processScheduledCommunications
};
