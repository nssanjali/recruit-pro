import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import connectDB from './config/db.js';
import Interview from './models/Interview.js';
import RecruiterAssignment from './models/RecruiterAssignment.js';
import SchedulingQueue from './models/SchedulingQueue.js';
import User from './models/User.js';

const clearData = async () => {
    try {
        await connectDB();
        console.log('MongoDB Connected for cleanup...');

        // Clear existing data
        await Interview.deleteMany({});
        await RecruiterAssignment.deleteMany({});
        await SchedulingQueue.deleteMany({});

        // Note: We might want to keep users or clear them too. 
        // For a full reset, we clear users but maybe keep a test admin if needed.
        // For now, let's clear everything as requested.
        await User.deleteMany({});

        console.log('✅ All database collections cleared successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing database:', error);
        process.exit(1);
    }
};

clearData();
