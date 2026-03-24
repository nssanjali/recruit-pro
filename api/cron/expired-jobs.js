/**
 * Vercel Cron Job — runs every 30 minutes.
 * Auto-inactivates jobs whose application cutoff date has passed.
 */

import connectDB from '../../server/config/db.js';
import { inactivateExpiredJobs } from '../../server/services/cronService.js';

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

        await inactivateExpiredJobs();
        res.json({ success: true, job: 'expired-jobs', timestamp: new Date().toISOString() });
    } catch (err) {
        console.error('[cron/expired-jobs] Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
}
