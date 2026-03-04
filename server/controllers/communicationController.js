import Communication from '../models/Communication.js';
import { ObjectId } from 'mongodb';

const scopedQueryForUser = (user) => {
    const filters = [];
    if (user?._id) {
        try {
            filters.push({ recipientId: new ObjectId(user._id) });
        } catch {
            // ignore invalid id
        }
    }
    if (user?.email) {
        filters.push({ recipient: user.email });
    }

    if (filters.length === 0) return { _id: null };
    if (filters.length === 1) return filters[0];
    return { $or: filters };
};

const deriveStats = (communications = []) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const emailsSent = communications.filter(
        (c) => c.type === 'email' && c.status === 'sent' && new Date(c.sentAt || c.createdAt) >= today
    ).length;
    const scheduledReminders = communications.filter(
        (c) => c.type === 'reminder' && c.status === 'scheduled'
    ).length;
    const calendarInvites = communications.filter(
        (c) => c.type === 'calendar' && c.status === 'sent'
    ).length;

    return {
        emailsSent,
        scheduledReminders,
        calendarInvites,
        storedRecords: communications.length
    };
};

const deriveStoredCommunications = (communications = []) => {
    const grouped = new Map();

    communications.forEach((comm) => {
        const key = String(comm.relatedTo?.id || comm._id);
        const existing = grouped.get(key) || {
            candidate: comm.metadata?.candidateName || comm.recipient || 'Candidate',
            totalMessages: 0,
            lastContact: comm.sentAt || comm.createdAt || null,
            interviews: 0,
            status: 'Active'
        };

        existing.totalMessages += 1;
        const currentTime = new Date(existing.lastContact || 0).getTime();
        const nextTime = new Date(comm.sentAt || comm.createdAt || 0).getTime();
        if (nextTime > currentTime) {
            existing.lastContact = comm.sentAt || comm.createdAt || existing.lastContact;
        }
        if (comm.relatedTo?.type === 'interview') {
            existing.interviews += 1;
        }
        if (comm.metadata?.candidateName) {
            existing.candidate = comm.metadata.candidateName;
        }
        grouped.set(key, existing);
    });

    return Array.from(grouped.values()).sort(
        (a, b) => new Date(b.lastContact || 0) - new Date(a.lastContact || 0)
    );
};

// @desc    Get all communications
// @route   GET /api/communications
// @access  Private
export const getCommunications = async (req, res) => {
    try {
        const query = scopedQueryForUser(req.user);
        const communications = await Communication.find(query);
        const stats = deriveStats(communications);
        const storedCommunications = deriveStoredCommunications(communications);

        res.status(200).json({
            success: true,
            data: {
                communications,
                stats,
                storedCommunications
            }
        });
    } catch (error) {
        console.error('Error fetching communications:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get communication stats
// @route   GET /api/communications/stats
// @access  Private
export const getCommunicationStats = async (req, res) => {
    try {
        const query = scopedQueryForUser(req.user);
        const communications = await Communication.find(query);
        const stats = deriveStats(communications);

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching communication stats:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get stored communications (history by candidate)
// @route   GET /api/communications/stored
// @access  Private
export const getStoredCommunications = async (req, res) => {
    try {
        const query = scopedQueryForUser(req.user);
        const communications = await Communication.find(query);
        const storedCommunications = deriveStoredCommunications(communications);

        res.status(200).json({
            success: true,
            data: storedCommunications
        });
    } catch (error) {
        console.error('Error fetching stored communications:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

export default {
    getCommunications,
    getCommunicationStats,
    getStoredCommunications
};
