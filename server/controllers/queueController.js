import { isConnected } from '../config/db.js';
import SchedulingQueue from '../models/SchedulingQueue.js';

// Check if MongoDB is connected
const isMongoConnected = () => isConnected();

export const getQueueItems = async (req, res) => {
    try {
        let queueItems = await SchedulingQueue.find();
        // Sort by createdAt descending
        queueItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json(queueItems);
    } catch (error) {
        console.error('Error fetching queue items:', error);
        res.status(500).json({ message: 'Failed to fetch queue items.', error: error.message });
    }
};

export const createQueueItem = async (req, res) => {
    try {
        const queueItem = await SchedulingQueue.create(req.body);
        res.status(201).json(queueItem);
    } catch (error) {
        console.error('Error creating queue item:', error);
        res.status(500).json({ message: 'Failed to create queue item.', error: error.message });
    }
};

export const updateQueueItem = async (req, res) => {
    try {
        const queueItem = await SchedulingQueue.findByIdAndUpdate(
            req.params.id,
            req.body
        );

        if (!queueItem) {
            return res.status(404).json({ message: 'Queue item not found' });
        }

        res.status(200).json(queueItem);
    } catch (error) {
        console.error('Error updating queue item:', error);
        res.status(500).json({ message: 'Failed to update queue item.', error: error.message });
    }
};

export const deleteQueueItem = async (req, res) => {
    try {
        const queueItem = await SchedulingQueue.findByIdAndDelete(req.params.id);

        if (!queueItem) {
            return res.status(404).json({ message: 'Queue item not found' });
        }

        res.status(200).json({ message: 'Queue item deleted successfully' });
    } catch (error) {
        console.error('Error deleting queue item:', error);
        res.status(500).json({ message: 'Failed to delete queue item.', error: error.message });
    }
};
