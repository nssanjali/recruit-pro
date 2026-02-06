import cron from 'node-cron';
import Communication from '../models/Communication.js';
import { sendEmail } from './emailService.js';

// Process scheduled communications
const processScheduledCommunications = async () => {
    try {
        // Find communications that are due to be sent
        const dueCommunications = await Communication.findScheduledDue();

        console.log(`Found ${dueCommunications.length} scheduled communications to send`);

        for (const comm of dueCommunications) {
            try {
                // Send email using the template and data from metadata
                if (comm.metadata?.templateName && comm.metadata?.data) {
                    const result = await sendEmail(
                        comm.recipient,
                        comm.metadata.templateName,
                        comm.metadata.data
                    );

                    // Update communication status
                    await Communication.findByIdAndUpdate(comm._id, {
                        status: result.success ? 'sent' : 'failed',
                        sentAt: new Date(),
                        error: result.error || null
                    });

                    console.log(`Sent ${comm.type} to ${comm.recipient}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
                }
            } catch (error) {
                console.error(`Error sending communication ${comm._id}:`, error);
                await Communication.findByIdAndUpdate(comm._id, {
                    status: 'failed',
                    error: error.message
                });
            }
        }
    } catch (error) {
        console.error('Error processing scheduled communications:', error);
    }
};

// Initialize cron jobs
export const initializeCronJobs = () => {
    console.log('Initializing cron jobs...');

    // Run every 5 minutes to check for scheduled communications
    cron.schedule('*/5 * * * *', async () => {
        console.log('Running scheduled communications check...');
        await processScheduledCommunications();
    });

    console.log('Cron jobs initialized successfully');
    console.log('- Scheduled communications: Every 5 minutes');
};

export default {
    initializeCronJobs,
    processScheduledCommunications
};
