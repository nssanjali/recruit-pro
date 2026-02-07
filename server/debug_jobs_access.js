
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { MongoClient, ObjectId } from 'mongodb';

// Configuration
const API_URL = 'http://localhost:5000/api';
const MONGO_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URI || !JWT_SECRET) {
    console.error('Missing MONGODB_URI or JWT_SECRET in .env');
    process.exit(1);
}

const run = async () => {
    let client;
    try {
        // 1. Connect to DB to find a candidate
        console.log('Connecting to MongoDB...');
        client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db();
        const usersCollection = db.collection('users');

        // Find a user by name "Candidate Two" or email if known. 
        // Or just list all users and their roles to be sure.
        console.log('Listing all users and roles:');
        const users = await usersCollection.find({}).toArray();
        users.forEach(u => console.log(`USER: ${u.email} | NAME: ${u.name} | ROLE: ${u.role}`));

        // Pick Candidate Two specifically if exists
        const candidate = users.find(u => u.name === 'Candidate Two') || users.find(u => u.role === 'candidate');

        if (!candidate) {
            console.error('No candidate user found in database.');
            process.exit(1);
        }

        console.log(`Found candidate: ${candidate.email} (ID: ${candidate._id})`);

        // 2. Generate JWT Token
        const token = jwt.sign(
            { id: candidate._id, role: candidate.role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log('Generated JWT token.');

        // 3. Request /api/jobs
        console.log(`Fetching ${API_URL}/jobs...`);
        const response = await fetch(`${API_URL}/jobs`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Response Status: ${response.status} ${response.statusText}`);

        try {
            const data = await response.json();
            console.log('Response Body:', JSON.stringify(data, null, 2));
        } catch (e) {
            console.log('Could not parse JSON response');
            const text = await response.text();
            console.log('Response Text:', text);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (client) await client.close();
    }
};

run();
