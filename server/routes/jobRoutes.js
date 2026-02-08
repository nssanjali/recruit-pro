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
    .get(protect, authorize('admin', 'recruiter', 'company_admin', 'candidate'), getJobs)
    .post(protect, authorize('company_admin'), createJob); // Only company_admin can post jobs

router.route('/:id')
    .get(getJob)
    .put(protect, authorize('company_admin'), updateJob) // Only company_admin can update jobs
    .delete(protect, authorize('company_admin'), deleteJob); // Only company_admin can delete jobs

router.route('/:id/candidates')
    .get(protect, authorize('recruiter', 'admin', 'company_admin'), getJobCandidates);

router.route('/:id/apply')
    .post(protect, authorize('candidate'), applyJob);

router.route('/:id/check-match')
    .get(protect, authorize('candidate'), checkJobMatch);

export default router;
