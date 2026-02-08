
import 'dotenv/config';
import connectDB, { getDb } from './config/db.js';
import { ObjectId } from 'mongodb';

const run = async () => {
    try {
        console.log('Connecting to DB...');
        await connectDB();
        const db = getDb();
        const jobsCollection = db.collection('jobs');

        const jobs = await jobsCollection.find({}).toArray();
        console.log(`Found ${jobs.length} jobs.`);

        if (jobs.length === 0) {
            console.log('Creating sample job...');
            const usersCollection = db.collection('users');
            const user = await usersCollection.findOne({});
            const postedBy = user ? user._id : new ObjectId();

            console.log(`Posting as user: ${postedBy}`);

            const newJob = {
                title: "Software Engineer",
                company: "TechCorp",
                location: "Remote",
                type: "Full-time",
                description: "Exciting opportunity for a software engineer.",
                requirements: "React, Node.js",
                salaryRange: "$100k - $150k",
                postedBy: postedBy,
                status: 'open',
                candidates: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                jobType: 'Full-time'
            };

            const result = await jobsCollection.insertOne(newJob);
            console.log(`Job created with ID: ${result.insertedId}`);
        } else {
            jobs.forEach(j => console.log(`- ${j.title} (ID: ${j._id}, Status: ${j.status})`));
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

run();
