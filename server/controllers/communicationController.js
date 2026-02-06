import Communication from '../models/Communication.js';

// @desc    Get all communications
// @route   GET /api/communications
// @access  Private
export const getCommunications = async (req, res) => {
    try {
        const communications = await Communication.find({});
        const stats = await Communication.getStats();
        const storedCommunications = await Communication.getStoredCommunications();

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
        const stats = await Communication.getStats();

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
        const storedCommunications = await Communication.getStoredCommunications();

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
