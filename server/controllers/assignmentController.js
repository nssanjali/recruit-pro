import { isConnected } from '../config/db.js';
import RecruiterAssignment from '../models/RecruiterAssignment.js';

// Check if MongoDB is connected
const isMongoConnected = () => isConnected();

export const getAssignments = async (req, res) => {
    try {
        let assignments = await RecruiterAssignment.find();
        // Sort by createdAt descending
        assignments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json(assignments);
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ message: 'Failed to fetch assignments.', error: error.message });
    }
};

export const createAssignment = async (req, res) => {
    try {
        const assignment = await RecruiterAssignment.create(req.body);
        res.status(201).json(assignment);
    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ message: 'Failed to create assignment.', error: error.message });
    }
};

export const updateAssignment = async (req, res) => {
    try {
        const assignment = await RecruiterAssignment.findByIdAndUpdate(
            req.params.id,
            req.body
        );

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
        const assignment = await RecruiterAssignment.findByIdAndDelete(req.params.id);

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
        let assignment = await RecruiterAssignment.findById(id);

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        assignment = await RecruiterAssignment.findByIdAndUpdate(id, {
            status: 'assigned',
            recruiter: assignment.aiRecommendation
        });

        res.status(200).json(assignment);
    } catch (error) {
        console.error('Error assigning recruiter:', error);
        res.status(500).json({ message: 'Failed to assign recruiter.', error: error.message });
    }
};
