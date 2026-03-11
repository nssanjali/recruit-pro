import express from 'express';
import {
    getApplications,
    getApplication,
    createApplication,
    updateApplication,
    updateApplicationStatus,
    deleteApplication,
    approveApplication,
    rejectApplication,
    reanalyzeApplication,
    getSecureResumeUrl
} from '../controllers/applicationController.js';
import { protect, authorize, optionalProtect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(protect, getApplications)
    .post(protect, authorize('candidate'), createApplication);

router.route('/:id')
    .get(protect, getApplication)
    .put(protect, authorize('recruiter', 'admin'), updateApplication)
    .delete(protect, deleteApplication);

router.route('/:id/status')
    .put(protect, authorize('company_admin'), updateApplicationStatus);

router.route('/:id/approve')
    .put(protect, authorize('admin'), approveApplication);

router.route('/:id/reject')
    .put(protect, authorize('admin'), rejectApplication);

// [DEV] Force re-run Gemini AI analysis — bypasses cache, clears stored result
router.route('/:id/reanalyze')
    .post(protect, authorize('recruiter', 'admin', 'company_admin'), reanalyzeApplication);

// Secure resume URL — returns a short-lived signed Cloudinary URL after auth check
// Recruiters / Admins / Company Admins can view any resume
// Candidates can only access their own resume via their own application
router.route('/:id/resume-url')
    .get(optionalProtect, getSecureResumeUrl);

export default router;

