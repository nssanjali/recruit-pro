import { isConnected } from '../config/db.js';
import RecruiterAssignment from '../models/RecruiterAssignment.js';
import { mockAssignments } from '../mockData.js';

// Check if MongoDB is connected
const isMongoConnected = () => isConnected();

export const getAssignments = async (req, res) => {
    try {
        let assignments;

        if (isMongoConnected()) {
            assignments = await RecruiterAssignment.find();
            // Sort by createdAt descending
            assignments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else {
            assignments = mockAssignments;
            console.log('📝 Using mock data (MongoDB not connected)');
        }

        res.status(200).json(assignments);
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ message: 'Failed to fetch assignments.', error: error.message });
    }
};

export const createAssignment = async (req, res) => {
    try {
        let assignment;

        if (isMongoConnected()) {
            assignment = await RecruiterAssignment.create(req.body);
        } else {
            assignment = {
                _id: Date.now().toString(),
                ...req.body,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            mockAssignments.push(assignment);
            console.log('📝 Using mock data (MongoDB not connected)');
        }

        res.status(201).json(assignment);
    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ message: 'Failed to create assignment.', error: error.message });
    }
};

export const updateAssignment = async (req, res) => {
    try {
        let assignment;

        if (isMongoConnected()) {
            assignment = await RecruiterAssignment.findByIdAndUpdate(
                req.params.id,
                req.body
            );
        } else {
            const index = mockAssignments.findIndex(a => a._id === req.params.id);
            if (index !== -1) {
                mockAssignments[index] = { ...mockAssignments[index], ...req.body, updatedAt: new Date() };
                assignment = mockAssignments[index];
            }
        }

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        res.status(200).json(assignment);
    } catch (error) {
        console.error('Error updating assignment:', error);
        res.status(500).json({ message: 'Failed to update assignment.', error: error.message });
    }
};

export const deleteAssignment = async (req, res) => {
    try {
        let assignment;

        if (isMongoConnected()) {
            assignment = await RecruiterAssignment.findByIdAndDelete(req.params.id);
        } else {
            const index = mockAssignments.findIndex(a => a._id === req.params.id);
            if (index !== -1) {
                assignment = mockAssignments.splice(index, 1)[0];
            }
        }

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        res.status(200).json({ message: 'Assignment deleted successfully' });
    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({ message: 'Failed to delete assignment.', error: error.message });
    }
};

export const assignRecruiter = async (req, res) => {
    try {
        const { id } = req.params;
        let assignment;

        if (isMongoConnected()) {
            assignment = await RecruiterAssignment.findById(id);

            if (!assignment) {
                return res.status(404).json({ message: 'Assignment not found' });
            }

            assignment = await RecruiterAssignment.findByIdAndUpdate(id, {
                status: 'assigned',
                recruiter: assignment.aiRecommendation
            });
        } else {
            assignment = mockAssignments.find(a => a._id === id);

            if (!assignment) {
                return res.status(404).json({ message: 'Assignment not found' });
            }

            assignment.status = 'assigned';
            assignment.recruiter = assignment.aiRecommendation;
            assignment.updatedAt = new Date();
            console.log('📝 Using mock data (MongoDB not connected)');
        }

        res.status(200).json(assignment);
    } catch (error) {
        console.error('Error assigning recruiter:', error);
        res.status(500).json({ message: 'Failed to assign recruiter.', error: error.message });
    }
};
