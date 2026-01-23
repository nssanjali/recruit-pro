import express from 'express';
import {
    getQueueItems,
    createQueueItem,
    updateQueueItem,
    deleteQueueItem
} from '../controllers/queueController.js';

const router = express.Router();

router.get('/', getQueueItems);
router.post('/', createQueueItem);
router.put('/:id', updateQueueItem);
router.delete('/:id', deleteQueueItem);

export default router;
