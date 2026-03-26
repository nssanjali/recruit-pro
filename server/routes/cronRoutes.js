import express from 'express';
import {
    processScheduledCommunications,
    processCutoffJobs,
    inactivateExpiredJobs
} from '../services/cronService.js';

const router = express.Router();

const isAuthorizedCronRequest = (req) => {
    const configuredSecret = String(process.env.CRON_SECRET || '').trim();

    if (!configuredSecret) {
        return process.env.NODE_ENV !== 'production';
    }

    const bearerToken = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : '';
    const providedSecret = String(
        req.headers['x-cron-secret']
        || req.query.key
        || bearerToken
        || ''
    ).trim();

    return providedSecret === configuredSecret;
};

const requireCronSecret = (req, res, next) => {
    if (!isAuthorizedCronRequest(req)) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or missing cron secret'
        });
    }

    next();
};

router.get('/ping', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Cron endpoint reachable',
        timestamp: new Date().toISOString()
    });
});

router.get('/communications', requireCronSecret, async (req, res) => {
    await processScheduledCommunications();
    res.status(200).json({
        success: true,
        message: 'Scheduled communications job completed'
    });
});

router.get('/cutoffs', requireCronSecret, async (req, res) => {
    await processCutoffJobs();
    res.status(200).json({
        success: true,
        message: 'Cutoff scheduling job completed'
    });
});

router.get('/expired-jobs', requireCronSecret, async (req, res) => {
    await inactivateExpiredJobs();
    res.status(200).json({
        success: true,
        message: 'Expired jobs inactivation completed'
    });
});

export default router;
