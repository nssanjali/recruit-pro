import express from 'express';
import {
    getCommunications,
    getCommunicationStats,
    getStoredCommunications
} from '../controllers/communicationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(protect, getCommunications);

router.route('/stats')
    .get(protect, getCommunicationStats);

router.route('/stored')
    .get(protect, getStoredCommunications);

export default router;
