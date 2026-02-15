import express from 'express';
import {
    getRecruiters,
    getRecruiter,
    createRecruiter,
    updateRecruiter,
    deleteRecruiter,
    getMyProfile,
    updateMyProfile
} from '../controllers/recruiterController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Recruiter's own profile routes
router.route('/me')
    .get(protect, authorize('recruiter'), getMyProfile)
    .put(protect, authorize('recruiter'), updateMyProfile);

// Company admin routes for managing recruiters
router.route('/')
    .get(protect, authorize('company_admin', 'admin'), getRecruiters)
    .post(protect, authorize('company_admin', 'admin'), createRecruiter);

router.route('/:id')
    .get(protect, authorize('company_admin', 'admin', 'recruiter'), getRecruiter)
    .put(protect, authorize('company_admin', 'admin'), updateRecruiter)
    .delete(protect, authorize('company_admin', 'admin'), deleteRecruiter);

export default router;
