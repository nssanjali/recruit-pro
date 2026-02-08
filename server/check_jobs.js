
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Job from './models/Job.js';

dotenv.config();

const checkJobs = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const jobs = await Job.find({});
        console.log(`Found ${jobs.length} jobs.`);
        jobs.forEach(job => {
            console.log(`- ${job.title} (Status: ${job.status}, PostedBy: ${job.postedBy})`);
        });

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkJobs();
