import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
    getCandidateCalendarData,
    getAdminCalendarData,
    getRecruiterCalendarData,
    getSettings,
    updateSettings,
    authGoogleCalendar,
    getGoogleCalendarStatus,
    googleCalendarCallback
} from '../controllers/calendarController.js';

const router = express.Router();

// Per-role calendar data feeds
router.get('/data/candidate', protect, authorize('candidate'), getCandidateCalendarData);
router.get('/data/admin', protect, authorize('company_admin', 'admin'), getAdminCalendarData);
router.get('/data/recruiter', protect, authorize('recruiter'), getRecruiterCalendarData);

// Settings and Auth
router.get('/settings', protect, authorize('recruiter'), getSettings);
router.put('/settings', protect, authorize('recruiter'), updateSettings);
router.get('/status', protect, authorize('recruiter', 'company_admin', 'admin'), getGoogleCalendarStatus);
router.get('/auth', protect, authorize('recruiter', 'company_admin', 'admin'), authGoogleCalendar);
router.get('/callback', googleCalendarCallback);

export default router;
