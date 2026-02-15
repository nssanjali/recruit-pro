import Recruiter from '../models/Recruiter.js';
import User from '../models/User.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

// @desc    Get all recruiters for a company
// @route   GET /api/recruiters
// @access  Private (Company Admin only)
export const getRecruiters = async (req, res) => {
    try {
        const companyAdminId = req.user._id;

        // Get recruiters with user details
        const recruiters = await Recruiter.findWithUserDetails({
            companyAdminId: companyAdminId
        });

        res.status(200).json({
            success: true,
            count: recruiters.length,
            data: recruiters
        });
    } catch (error) {
        console.error('Error fetching recruiters:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Get single recruiter
// @route   GET /api/recruiters/:id
// @access  Private
export const getRecruiter = async (req, res) => {
    try {
        const recruiter = await Recruiter.findById(req.params.id);

        if (!recruiter) {
            return res.status(404).json({
                success: false,
                message: 'Recruiter not found'
            });
        }

        // Check authorization
        if (req.user.role === 'company_admin' && recruiter.companyAdminId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this recruiter'
            });
        }

        // Get user details
        const user = await User.findById(recruiter.userId);

        res.status(200).json({
            success: true,
            data: {
                ...recruiter,
                user: user ? {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    avatar: user.avatar
                } : null
            }
        });
    } catch (error) {
        console.error('Error fetching recruiter:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Create new recruiter
// @route   POST /api/recruiters
// @access  Private (Company Admin only)
export const createRecruiter = async (req, res) => {
    try {
        const { name, email, password, phone, skills, expertise, experience } = req.body;
        const companyAdminId = req.user._id;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and password'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create user account (User.create will handle password hashing)
        const userData = {
            name,
            email,
            password, // Don't hash here - User.create() will hash it
            phone: phone || '',
            role: 'recruiter',
            createdBy: companyAdminId
        };

        const user = await User.create(userData);

        console.log('✅ Created recruiter user:', {
            id: user._id,
            email: user.email,
            role: user.role
        });

        // Create recruiter profile
        const recruiterData = {
            userId: user._id,
            companyAdminId: companyAdminId,
            companyId: req.user.companyId || companyAdminId, // Use company ID if available
            skills: skills || [],
            expertise: expertise || [],
            experience: experience || '',
            status: 'active'
        };

        const recruiter = await Recruiter.create(recruiterData);

        res.status(201).json({
            success: true,
            data: {
                ...recruiter,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone
                }
            }
        });
    } catch (error) {
        console.error('Error creating recruiter:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Update recruiter
// @route   PUT /api/recruiters/:id
// @access  Private (Company Admin only)
export const updateRecruiter = async (req, res) => {
    try {
        const recruiter = await Recruiter.findById(req.params.id);

        if (!recruiter) {
            return res.status(404).json({
                success: false,
                message: 'Recruiter not found'
            });
        }

        // Check authorization
        if (recruiter.companyAdminId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this recruiter'
            });
        }

        const { name, email, phone, skills, expertise, experience, status } = req.body;

        // Update recruiter profile
        const recruiterUpdateData = {};
        if (skills !== undefined) recruiterUpdateData.skills = skills;
        if (expertise !== undefined) recruiterUpdateData.expertise = expertise;
        if (experience !== undefined) recruiterUpdateData.experience = experience;
        if (status !== undefined) recruiterUpdateData.status = status;

        const updatedRecruiter = await Recruiter.findByIdAndUpdate(
            req.params.id,
            recruiterUpdateData
        );

        // Update user details if provided
        if (name || email || phone) {
            const userUpdateData = {};
            if (name) userUpdateData.name = name;
            if (email) userUpdateData.email = email;
            if (phone) userUpdateData.phone = phone;

            await User.findByIdAndUpdate(recruiter.userId, userUpdateData);
        }

        // Get updated recruiter with user details
        const finalRecruiter = await Recruiter.findById(req.params.id);
        const user = await User.findById(finalRecruiter.userId);

        res.status(200).json({
            success: true,
            data: {
                ...finalRecruiter,
                user: user ? {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone
                } : null
            }
        });
    } catch (error) {
        console.error('Error updating recruiter:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Delete recruiter
// @route   DELETE /api/recruiters/:id
// @access  Private (Company Admin only)
export const deleteRecruiter = async (req, res) => {
    try {
        const recruiter = await Recruiter.findById(req.params.id);

        if (!recruiter) {
            return res.status(404).json({
                success: false,
                message: 'Recruiter not found'
            });
        }

        // Check authorization
        if (recruiter.companyAdminId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this recruiter'
            });
        }

        // Delete recruiter profile
        await Recruiter.findByIdAndDelete(req.params.id);

        // Optionally deactivate user account instead of deleting
        await User.findByIdAndUpdate(recruiter.userId, { status: 'inactive' });

        res.status(200).json({
            success: true,
            message: 'Recruiter deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting recruiter:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Get recruiter's own profile
// @route   GET /api/recruiters/me
// @access  Private (Recruiter only)
export const getMyProfile = async (req, res) => {
    try {
        const recruiter = await Recruiter.findOne({ userId: req.user._id });

        if (!recruiter) {
            return res.status(404).json({
                success: false,
                message: 'Recruiter profile not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                ...recruiter,
                user: {
                    _id: req.user._id,
                    name: req.user.name,
                    email: req.user.email,
                    phone: req.user.phone,
                    avatar: req.user.avatar
                }
            }
        });
    } catch (error) {
        console.error('Error fetching recruiter profile:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Update recruiter's own profile
// @route   PUT /api/recruiters/me
// @access  Private (Recruiter only)
export const updateMyProfile = async (req, res) => {
    try {
        const recruiter = await Recruiter.findOne({ userId: req.user._id });

        if (!recruiter) {
            return res.status(404).json({
                success: false,
                message: 'Recruiter profile not found'
            });
        }

        const { skills, expertise, experience, availability } = req.body;

        const updateData = {};
        if (skills !== undefined) updateData.skills = skills;
        if (expertise !== undefined) updateData.expertise = expertise;
        if (experience !== undefined) updateData.experience = experience;
        if (availability !== undefined) updateData.availability = availability;

        const updatedRecruiter = await Recruiter.findByIdAndUpdate(
            recruiter._id,
            updateData
        );

        res.status(200).json({
            success: true,
            data: updatedRecruiter
        });
    } catch (error) {
        console.error('Error updating recruiter profile:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

export default {
    getRecruiters,
    getRecruiter,
    createRecruiter,
    updateRecruiter,
    deleteRecruiter,
    getMyProfile,
    updateMyProfile
};
