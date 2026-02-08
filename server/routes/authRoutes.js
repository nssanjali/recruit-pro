import express from 'express';
import User from '../models/User.js';
import passport from '../config/passport.js';
import {
    register,
    registerCompany,
    login,
    getMe,
    logout,
    updateDetails,
    updatePassword,
    forgotPassword,
    verifyOTP,
    resetPassword
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Traditional email/password routes
router.post('/register', register);
router.post('/register-company', registerCompany);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.post('/forgotpassword', forgotPassword);
router.post('/verifyotp', verifyOTP);
router.post('/resetpassword', resetPassword);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=google_auth_failed` }),
    (req, res) => {
        // Generate JWT token
        const token = User.getSignedJwtToken(req.user);

        // Redirect to frontend with token
        res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}&provider=google`);
    }
);

// GitHub OAuth routes
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=github_auth_failed` }),
    (req, res) => {
        // Generate JWT token
        const token = User.getSignedJwtToken(req.user);

        // Redirect to frontend with token
        res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}&provider=github`);
    }
);

export default router;
