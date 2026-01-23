import { isConnected } from '../config/db.js';
import SchedulingQueue from '../models/SchedulingQueue.js';
import { mockQueue } from '../mockData.js';

// Check if MongoDB is connected
const isMongoConnected = () => isConnected();

export const getQueueItems = async (req, res) => {
    try {
        let queueItems;

        if (isMongoConnected()) {
            queueItems = await SchedulingQueue.find();
            // Sort by createdAt descending
            queueItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else {
            queueItems = mockQueue;
            console.log('📝 Using mock data (MongoDB not connected)');
        }

        res.status(200).json(queueItems);
    } catch (error) {
        console.error('Error fetching queue items:', error);
        res.status(500).json({ message: 'Failed to fetch queue items.', error: error.message });
    }
};

export const createQueueItem = async (req, res) => {
    try {
        let queueItem;

        if (isMongoConnected()) {
            queueItem = await SchedulingQueue.create(req.body);
        } else {
            queueItem = {
                _id: Date.now().toString(),
                ...req.body,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            mockQueue.push(queueItem);
            console.log('📝 Using mock data (MongoDB not connected)');
        }

        res.status(201).json(queueItem);
    } catch (error) {
        console.error('Error creating queue item:', error);
        res.status(500).json({ message: 'Failed to create queue item.', error: error.message });
    }
};

export const updateQueueItem = async (req, res) => {
    try {
        let queueItem;

        if (isMongoConnected()) {
            queueItem = await SchedulingQueue.findByIdAndUpdate(
                req.params.id,
                req.body
            );
        } else {
            const index = mockQueue.findIndex(q => q._id === req.params.id);
            if (index !== -1) {
                mockQueue[index] = { ...mockQueue[index], ...req.body, updatedAt: new Date() };
                queueItem = mockQueue[index];
            }
        }

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
        let queueItem;

        if (isMongoConnected()) {
            queueItem = await SchedulingQueue.findByIdAndDelete(req.params.id);
        } else {
            const index = mockQueue.findIndex(q => q._id === req.params.id);
            if (index !== -1) {
                queueItem = mockQueue.splice(index, 1)[0];
                console.log('📝 Using mock data (MongoDB not connected)');
            }
        }

        if (!queueItem) {
            return res.status(404).json({ message: 'Queue item not found' });
        }

        res.status(200).json({ message: 'Queue item deleted successfully' });
    } catch (error) {
        console.error('Error deleting queue item:', error);
        res.status(500).json({ message: 'Failed to delete queue item.', error: error.message });
    }
};
