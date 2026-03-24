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
import recruiterRoutes from './routes/recruiterRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import proxyRoutes from './routes/proxyRoutes.js';

import { initializeCronJobs } from './services/cronService.js';

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   CORS CONFIGURATION
========================= */

// Build whitelist from CLIENT_URL env var (supports comma-separated list)
const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
const allowedOrigins = rawClientUrl.split(',').map((u) => u.trim());

// Always allow localhost in development
if (process.env.NODE_ENV !== 'production') {
    ['http://localhost:3000', 'http://localhost:5173'].forEach((origin) => {
        if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin);
    });
}

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (e.g. curl, mobile apps, same-origin)
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            callback(new Error(`CORS: origin "${origin}" not allowed`));
        },
        credentials: true,
    })
);

/* =========================
   MIDDLEWARE
========================= */

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
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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
app.use('/api/recruiters', recruiterRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/proxy', proxyRoutes);

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

    // CORS errors
    if (err.message && err.message.startsWith('CORS:')) {
        return res.status(403).json({
            success: false,
            message: err.message,
        });
    }

    // Other errors
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

/* =========================
   SERVER START (standalone mode)
========================= */

// Only start listening when run directly (not imported as serverless handler)
const isServerless = Boolean(process.env.VERCEL || process.env.SERVERLESS);

if (!isServerless) {
    const startServer = async () => {
        await connectDB();
        initializeCronJobs();

        app.listen(PORT, () => {
            console.log('---------------------------------------');
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('---------------------------------------');
        });
    };

    startServer();
}

export default app;
