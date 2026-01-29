import express from 'express';
import {
    getJobs,
    getJob,
    createJob,
    updateJob,
    deleteJob
} from '../controllers/jobController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(protect, getJobs)
    .post(protect, authorize('recruiter', 'admin'), createJob);

router.route('/:id')
    .get(getJob)
    .put(protect, authorize('recruiter', 'admin'), updateJob)
    .delete(protect, authorize('recruiter', 'admin'), deleteJob);

export default router;
