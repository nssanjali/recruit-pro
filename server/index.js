import 'dotenv/config';


import express from 'express';
import cors from 'cors';
import session from 'express-session';

import connectDB from './config/db.js';
import passport from './config/passport.js';

import authRoutes from './routes/authRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import userRoutes from './routes/userRoutes.js';
import communicationRoutes from './routes/communicationRoutes.js';

import { initializeCronJobs } from './services/cronService.js';

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   MIDDLEWARE
========================= */

// CORS
app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true,
    })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session (required for OAuth)
app.use(
    session({
        name: 'recruitpro.sid',
        secret: process.env.SESSION_SECRET || 'dev-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

/* =========================
   ROUTES
========================= */

app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/communications', communicationRoutes);

// Health / root endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'RecruitPro API is running',
        environment: process.env.NODE_ENV || 'development',
        mongoConfigured: Boolean(process.env.MONGODB_URI),
    });
});

/* =========================
   ERROR HANDLING
========================= */

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Multer file upload errors
    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            message: `File upload error: ${err.message}`
        });
    }

    // Other errors
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

/* =========================
   SERVER START
========================= */

const startServer = async () => {
    // Connect to MongoDB (non-blocking if it fails)
    await connectDB();

    // Initialize cron jobs for automated reminders
    initializeCronJobs();

    app.listen(PORT, () => {
        console.log('---------------------------------------');
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌍 CORS allowed origin: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
        console.log(
            `🗄️ MongoDB URI loaded: ${process.env.MONGODB_URI ? 'YES' : 'NO'}`
        );
        console.log('📧 Email automation: ENABLED');
        console.log('⏰ Cron jobs: ACTIVE');
        console.log('---------------------------------------');
    });
};

startServer();
