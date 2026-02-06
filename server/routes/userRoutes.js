import express from 'express';
import {
    getUsers,
    getUsersByRole,
    getUserStats,
    updateUserRole,
    deleteUser
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes are admin only
router.use(protect);
router.use(authorize('admin'));

router.get('/', getUsers);
router.get('/stats', getUserStats);
router.get('/role/:role', getUsersByRole);
router.put('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

export default router;
