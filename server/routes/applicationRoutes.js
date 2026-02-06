import express from 'express';
import {
    getApplications,
    getApplication,
    createApplication,
    updateApplication,
    deleteApplication,
    approveApplication,
    rejectApplication
} from '../controllers/applicationController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(protect, getApplications)
    .post(protect, authorize('candidate'), createApplication);

router.route('/:id')
    .get(protect, getApplication)
    .put(protect, authorize('recruiter', 'admin'), updateApplication)
    .delete(protect, deleteApplication);

router.route('/:id/approve')
    .put(protect, authorize('admin'), approveApplication);

router.route('/:id/reject')
    .put(protect, authorize('admin'), rejectApplication);

export default router;

