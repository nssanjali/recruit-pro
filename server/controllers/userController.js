import User from '../models/User.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
export const getUsers = async (req, res) => {
    try {
        const users = await User.find({});

        // Remove sensitive fields
        const sanitizedUsers = users.map(user => {
            const { password, resetPasswordToken, resetPasswordExpire, ...safeUser } = user;
            return safeUser;
        });

        res.status(200).json({
            success: true,
            count: sanitizedUsers.length,
            data: sanitizedUsers
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get users by role
// @route   GET /api/users/role/:role
// @access  Private (Admin only)
export const getUsersByRole = async (req, res) => {
    try {
        const users = await User.find({ role: req.params.role });

        // Remove sensitive fields
        const sanitizedUsers = users.map(user => {
            const { password, resetPasswordToken, resetPasswordExpire, ...safeUser } = user;
            return safeUser;
        });

        res.status(200).json({
            success: true,
            count: sanitizedUsers.length,
            data: sanitizedUsers
        });
    } catch (error) {
        console.error('Error fetching users by role:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get user stats
// @route   GET /api/users/stats
// @access  Private (Admin only)
export const getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const candidates = await User.countDocuments({ role: 'candidate' });
        const recruiters = await User.countDocuments({ role: 'recruiter' });
        const admins = await User.countDocuments({ role: 'admin' });
        const companyAdmins = await User.countDocuments({ role: 'company_admin' });

        res.status(200).json({
            success: true,
            data: {
                total: totalUsers,
                candidates,
                recruiters,
                admins,
                companyAdmins
            }
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private (Admin only)
export const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!['candidate', 'recruiter', 'admin', 'company_admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get updated user
        const updatedUser = await User.findById(req.params.id);
        const { password, resetPasswordToken, resetPasswordExpire, ...safeUser } = updatedUser;

        res.status(200).json({
            success: true,
            data: safeUser
        });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};
