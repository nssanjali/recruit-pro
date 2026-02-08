
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import fetch from 'node-fetch';

const MONGO_URI = process.env.MONGODB_URI;

const run = async () => {
    let client;
    try {
        client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db();

        // Get one application with a resume
        const app = await db.collection('applications').findOne({ resume: { $exists: true, $ne: '' } });

        if (!app) {
            console.log('No application with resume found.');
            return;
        }

        console.log(`Testing Resume URL: ${app.resume}`);

        const response = await fetch(app.resume);
        console.log(`Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            console.error(`Failed to fetch PDF: status=${response.status}`);
            return;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(`PDF Buffer size: ${buffer.length} bytes`);

        const data = await pdf(buffer);
        console.log('--- EXTRACTED TEXT START ---');
        console.log(data.text.substring(0, 500) + '...'); // Print first 500 chars
        console.log('--- EXTRACTED TEXT END ---');

        if (!data.text || data.text.trim().length === 0) {
            console.log('WARNING: Extracted text is empty!');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (client) await client.close();
    }
};

run();
