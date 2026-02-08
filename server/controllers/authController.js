import crypto from 'crypto';
import User from '../models/User.js';
import { sendOTP } from '../services/notificationService.js';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
    try {
        const { name, email, password, role, phone, department, specialization, skills, experience } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Prevent company_admin registration through regular signup
        if (role === 'company_admin') {
            return res.status(400).json({
                success: false,
                message: 'Please use the company registration endpoint for company admin accounts'
            });
        }

        // Create user object based on role
        const userData = {
            name,
            email,
            password,
            role: role || 'candidate',
            phone
        };

        // Add role-specific fields
        if (role === 'recruiter') {
            userData.department = department;
            userData.specialization = specialization || [];
        } else if (role === 'candidate') {
            userData.skills = skills || [];
            userData.experience = experience || 0;
        }

        // Create user
        const user = await User.create(userData);

        // Generate token
        sendTokenResponse(user, 201, res);
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
};

// @desc    Register company admin
// @route   POST /api/auth/register-company
// @access  Public
export const registerCompany = async (req, res) => {
    try {
        const { name, email, password, phone, companyInfo } = req.body;

        // Validate required fields
        if (!name || !email || !password || !companyInfo) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Validate company info
        const { companyName, companyEmail, industry, companySize, location } = companyInfo;
        if (!companyName || !companyEmail || !industry || !companySize || !location) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required company information'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Check if company email already exists
        const existingCompany = await User.findOne({ 'companyInfo.companyEmail': companyEmail });
        if (existingCompany) {
            return res.status(400).json({
                success: false,
                message: 'Company already registered with this email'
            });
        }

        // Create company admin user
        const userData = {
            name,
            email,
            password,
            phone,
            role: 'company_admin',
            companyInfo: {
                companyName: companyInfo.companyName,
                companyEmail: companyInfo.companyEmail,
                companyWebsite: companyInfo.companyWebsite || '',
                industry: companyInfo.industry,
                companySize: companyInfo.companySize,
                location: companyInfo.location,
                description: companyInfo.description || ''
            }
        };

        // Create user
        const user = await User.create(userData);

        // Generate token
        sendTokenResponse(user, 201, res);
    } catch (error) {
        console.error('Company registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering company',
            error: error.message
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate email & password
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Check for user (include password for comparison)
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if password matches
        const isMatch = await User.comparePassword(user, password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated'
            });
        }

        sendTokenResponse(user, 200, res);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error.message
        });
    }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
        data: {}
    });
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
export const updateDetails = async (req, res) => {
    try {
        const fieldsToUpdate = {};

        // Only add fields that are actually provided (not undefined)
        if (req.body.name !== undefined) fieldsToUpdate.name = req.body.name;
        if (req.body.email !== undefined) fieldsToUpdate.email = req.body.email;
        if (req.body.phone !== undefined) fieldsToUpdate.phone = req.body.phone;
        if (req.body.bio !== undefined) fieldsToUpdate.bio = req.body.bio;
        if (req.body.location !== undefined) fieldsToUpdate.location = req.body.location;
        if (req.body.avatar !== undefined) fieldsToUpdate.avatar = req.body.avatar;

        // Add role-specific fields
        if (req.user.role === 'candidate') {
            if (req.body.skills !== undefined) fieldsToUpdate.skills = req.body.skills;
            if (req.body.experience !== undefined) fieldsToUpdate.experience = req.body.experience;
            if (req.body.resume !== undefined) fieldsToUpdate.resume = req.body.resume;
        } else if (req.user.role === 'recruiter') {
            if (req.body.department !== undefined) fieldsToUpdate.department = req.body.department;
            if (req.body.specialization !== undefined) fieldsToUpdate.specialization = req.body.specialization;
            if (req.body.title !== undefined) fieldsToUpdate.title = req.body.title;
        }

        // Update user and return the NEW document
        const user = await User.findByIdAndUpdate(
            req.user._id,
            fieldsToUpdate,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating user details',
            error: error.message
        });
    }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
export const updatePassword = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        // Check current password
        if (!(await User.comparePassword(user, req.body.currentPassword))) {
            return res.status(401).json({
                success: false,
                message: 'Password is incorrect'
            });
        }

        user.password = req.body.newPassword;
        await User.save(user);

        sendTokenResponse(user, 200, res);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating password',
            error: error.message
        });
    }
};


// @desc    Forgot password - Send OTP
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No user found with that email'
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash OTP for storage (like a password)
        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

        // Store hashed OTP and expiry (10 mins)
        user.resetPasswordToken = hashedOtp;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

        await User.save(user);

        // Send OTP via email
        await sendOTP(user.email, otp);

        res.status(200).json({
            success: true,
            message: 'OTP sent to email'
        });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({
            success: false,
            message: 'Email could not be sent',
            error: error.message
        });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verifyotp
// @access  Public
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

        const user = await User.findOne({
            email,
            resetPasswordToken: hashedOtp,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error verifying OTP',
            error: error.message
        });
    }
};

// @desc    Reset password
// @route   POST /api/auth/resetpassword
// @access  Public
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, password } = req.body;
        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

        const user = await User.findOne({
            email,
            resetPasswordToken: hashedOtp,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await User.save(user);

        res.status(200).json({
            success: true,
            message: 'Password reset successful'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error resetting password',
            error: error.message
        });
    }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = User.getSignedJwtToken(user);

    // Remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        success: true,
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            avatar: user.avatar,
            ...(user.role === 'candidate' && {
                skills: user.skills,
                experience: user.experience,
                resume: user.resume
            }),
            ...(user.role === 'recruiter' && {
                department: user.department,
                specialization: user.specialization
            })
        }
    });
};
