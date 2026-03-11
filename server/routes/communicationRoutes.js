import express from 'express';
import {
    getCommunications,
    getCommunicationStats,
    getStoredCommunications,
    getCandidateInterviews,
    candidateRsvpInterview,
    candidateRescheduleRequest,
    getRescheduleRequests,
    recruiterConfirmReschedule
} from '../controllers/communicationController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Core communication feed (role-scoped, candidates see only sent)
router.route('/').get(protect, getCommunications);
router.route('/stats').get(protect, getCommunicationStats);
router.route('/stored').get(protect, getStoredCommunications);

// Candidate: view their own interview invitations + RSVP status
router.route('/my-interviews').get(protect, authorize('candidate'), getCandidateInterviews);

// Candidate: RSVP to an interview (accept or decline)
router.route('/interviews/:id/rsvp').post(protect, authorize('candidate'), candidateRsvpInterview);

// Candidate: explicitly request a reschedule with reason + proposed slots
router.route('/interviews/:id/reschedule-request').post(protect, authorize('candidate'), candidateRescheduleRequest);

// Recruiter / Admin: see all pending reschedule requests
router.route('/reschedule-requests').get(protect, authorize('recruiter', 'admin', 'company_admin'), getRescheduleRequests);

// Recruiter / Admin: confirm a new interview time after reschedule request
router.route('/interviews/:id/confirm-reschedule').post(protect, authorize('recruiter', 'admin', 'company_admin'), recruiterConfirmReschedule);

export default router;
