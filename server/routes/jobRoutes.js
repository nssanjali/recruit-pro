import express from 'express';
import {
    getJobs,
    getJob,
    createJob,
    updateJob,
    deleteJob,
    getJobCandidates,
    applyJob,
    checkJobMatch
} from '../controllers/jobController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(protect, getJobs)
    .post(protect, authorize('admin', 'company_admin'), createJob);

router.route('/:id')
    .get(getJob)
    .put(protect, authorize('admin', 'company_admin'), updateJob)
    .delete(protect, authorize('admin', 'company_admin'), deleteJob);

router.route('/:id/candidates')
    .get(protect, authorize('recruiter', 'admin'), getJobCandidates);

router.route('/:id/apply')
    .post(protect, authorize('candidate'), applyJob);

router.route('/:id/check-match')
    .get(protect, authorize('candidate'), checkJobMatch);

export default router;
