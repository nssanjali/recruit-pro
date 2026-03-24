/**
 * Vercel Cron Job — runs every 5 minutes.
 * Triggers cutoff-based bulk interview scheduling.
 */

import connectDB from '../../server/config/db.js';
import { processCutoffJobs } from '../../server/services/cronService.js';

let isConnected = false;

export default async function handler(req, res) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        if (!isConnected) {
            await connectDB();
            isConnected = true;
        }

        await processCutoffJobs();
        res.json({ success: true, job: 'cutoff-scheduler', timestamp: new Date().toISOString() });
    } catch (err) {
        console.error('[cron/cutoff] Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
}
