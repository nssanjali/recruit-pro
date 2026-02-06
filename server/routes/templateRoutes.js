import express from 'express';
import {
    getTemplates,
    getTemplate,
    getTemplateForJob,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getDefaultFields
} from '../controllers/templateController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public/candidate routes
router.get('/job/:jobId', protect, getTemplateForJob);

// Admin only routes
router.route('/')
    .get(protect, authorize('admin'), getTemplates)
    .post(protect, authorize('admin'), createTemplate);

router.get('/defaults/fields', protect, authorize('admin'), getDefaultFields);

router.route('/:id')
    .get(protect, authorize('admin'), getTemplate)
    .put(protect, authorize('admin'), updateTemplate)
    .delete(protect, authorize('admin'), deleteTemplate);

export default router;
