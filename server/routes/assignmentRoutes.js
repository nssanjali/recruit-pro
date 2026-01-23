import express from 'express';
import {
    getAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    assignRecruiter
} from '../controllers/assignmentController.js';

const router = express.Router();

router.get('/', getAssignments);
router.post('/', createAssignment);
router.put('/:id', updateAssignment);
router.delete('/:id', deleteAssignment);
router.post('/:id/assign', assignRecruiter);

export default router;
