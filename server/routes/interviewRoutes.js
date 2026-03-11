import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
    scheduleInterview,
    getInterviews,
    getInterviewById,
    updateInterview,
    deleteInterview,
    getMyInterviews,
    getJobInterviews,
    submitInterviewReview,
    markInterviewAttendance
} from '../controllers/interviewController.js';

const router = express.Router();

router.post('/schedule', protect, scheduleInterview);
router.post('/:id/review-feedback', protect, authorize('recruiter', 'company_admin', 'admin'), submitInterviewReview);
router.post('/:id/attendance', protect, authorize('recruiter', 'admin', 'company_admin'), markInterviewAttendance);
router.get('/my', protect, getMyInterviews);        // recruiter: own interviews
router.get('/job/:jobId', protect, getJobInterviews);       // admin: all interviews for a job
router.get('/', getInterviews);
router.get('/:id', getInterviewById);
router.put('/:id', updateInterview);
router.delete('/:id', deleteInterview);

export default router;
