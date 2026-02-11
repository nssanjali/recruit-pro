import { v4 as uuidv4 } from 'uuid';
import { isConnected } from '../config/db.js';
import Interview from '../models/Interview.js';
import { sendInterviewNotifications } from '../services/notificationService.js';

// Check if MongoDB is connected
const isMongoConnected = () => isConnected();

export const scheduleInterview = async (req, res) => {
    try {
        const { candidate, recruiter, admin, date, time, role } = req.body;

        // Generate a secure, unique proctored meeting link
        const proctorId = uuidv4();
        const meetingLink = `https://proctor.recruitpro.com/meeting/${proctorId}`;

        const interviewData = {
            candidate,
            recruiter,
            admin,
            role: role || 'Technical Round',
            date,
            time,
            meetingLink,
            proctorId,
            status: 'scheduled',
            scheduledBy: 'AI',
            isProctored: true,
            notificationsSent: false
        };

        let interview;

        // Create interview in database
        interview = await Interview.create(interviewData);

        // Send notifications to all participants
        await sendInterviewNotifications({
            candidate,
            recruiter,
            admin,
            date,
            time,
            meetingLink
        });

        // Update notification status
        interview = await Interview.findByIdAndUpdate(interview._id, { notificationsSent: true });

        res.status(201).json({
            message: 'Interview scheduled successfully and notifications sent.',
            interview
        });
    } catch (error) {
        console.error('Error scheduling interview:', error);
        res.status(500).json({ message: 'Failed to schedule interview.', error: error.message });
    }
};

export const getInterviews = async (req, res) => {
    try {
        let interviews = await Interview.find({ status: 'scheduled' });
        // Sort by createdAt descending
        interviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json(interviews);
    } catch (error) {
        console.error('Error fetching interviews:', error);
        res.status(500).json({ message: 'Failed to fetch interviews.', error: error.message });
    }
};

export const getInterviewById = async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id);

        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        res.status(200).json(interview);
    } catch (error) {
        console.error('Error fetching interview:', error);
        res.status(500).json({ message: 'Failed to fetch interview.', error: error.message });
    }
};

export const updateInterview = async (req, res) => {
    try {
        const interview = await Interview.findByIdAndUpdate(
            req.params.id,
            req.body
        );

        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        res.status(200).json(interview);
    } catch (error) {
        console.error('Error updating interview:', error);
        res.status(500).json({ message: 'Failed to update interview.', error: error.message });
    }
};

export const deleteInterview = async (req, res) => {
    try {
        const interview = await Interview.findByIdAndDelete(req.params.id);

        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        res.status(200).json({ message: 'Interview deleted successfully' });
    } catch (error) {
        console.error('Error deleting interview:', error);
        res.status(500).json({ message: 'Failed to delete interview.', error: error.message });
    }
};
