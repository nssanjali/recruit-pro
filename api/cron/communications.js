/**
 * Vercel Cron Job — runs every 10 minutes.
 * Triggers scheduled email communications.
 * Secured with CRON_SECRET so only Vercel can call it.
 */

import connectDB from '../../server/config/db.js';
import { processScheduledCommunications } from '../../server/services/cronService.js';

let isConnected = false;

export default async function handler(req, res) {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        if (!isConnected) {
            await connectDB();
            isConnected = true;
        }

        await processScheduledCommunications();
        res.json({ success: true, job: 'communications', timestamp: new Date().toISOString() });
    } catch (err) {
        console.error('[cron/communications] Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
}
