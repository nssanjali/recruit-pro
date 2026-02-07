import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
// Mock parseResume since we can't easily import it with the pdf dependency issue in mixed mode
// Actually, let's just Fix the import in the script to be standalone or fix the util?
// The util uses createRequire, so it SHOULD work if we import it?
// Ah, the error "pdf is not a function" happened in the UTIL? No, wait. 
// The util `resumeMatcher.js` ALREADY uses createRequire.
// If I imported `parseResume` from `resumeMatcher.js`, it should work.
// Let's check the error stack in previous output... 
// It was `TypeError: pdf is not a function`... 
// Wait, `pdf-parse` export is the function itself usually.
// Let's check `resumeMatcher.js` again line 5.
// `const pdf = require('pdf-parse');`
// If `resumeMatcher.js` is working in the main app, why fail here?
// Maybe `node-fetch` issue?
// Let's just INLINE the parsing logic in the debug script to be safe and debuggeable.

import fetch from 'node-fetch'; // Ensure we have this

const parseResume = async (input) => {
    try {
        if (!input) return "";
        console.log(`Fetching: ${input}`);
        const response = await fetch(input);

        console.log(`Response Status: ${response.status}`);
        console.log(`Content-Type: ${response.headers.get('content-type')}`);

        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

        const buffer = await response.buffer();
        console.log(`Buffer size: ${buffer.length} bytes`);

        if (buffer.length === 0) {
            console.log("Buffer is empty!");
            return "";
        }

        const data = await pdf(buffer);
        console.log(`PDF Text Length: ${data.text ? data.text.length : 0}`);
        return data.text;
    } catch (e) {
        console.error("Parse Error:", e);
        return "";
    }
};

import { calculateMatchScore } from './utils/resumeMatcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Cloudinary signing helper (simplified from controller)
import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const signUrl = (rawUrl) => {
    if (!rawUrl || !rawUrl.includes('cloudinary.com')) return rawUrl;
    try {
        const matches = rawUrl.match(/\/upload\/(v\d+)\/(.+)$/);
        if (!matches || !matches[2]) return rawUrl;
        const version = matches[1].replace('v', '');
        let publicId = matches[2];
        const parts = publicId.split('.');
        if (parts.length > 1) parts.pop();
        const idWithoutExt = parts.join('.');

        return cloudinary.url(idWithoutExt, {
            resource_type: 'image',
            type: 'upload',
            sign_url: true,
            secure: true,
            format: 'jpg',
            version: version
        });
    } catch (e) {
        return rawUrl;
    }
};

const debugState = async () => {
    let client;
    try {
        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        const db = client.db();

        // 1. Check Job Details
        const job = await db.collection('jobs').findOne({});
        if (!job) {
            console.log("No jobs found!");
            return;
        }
        console.log(`Using Job: ${job.title}`);

        // 2. Check Candidates
        const candidates = await db.collection('users').find({ role: 'candidate' }).toArray();

        console.log("\n--- Candidate Status ---");
        for (const c of candidates) {
            console.log(`\nName: ${c.name}`);

            // 3. Test Scoring
            if (c.resume && c.resume.includes('cloudinary')) {
                try {
                    // SIGN THE URL FIRST!
                    const signedUrl = signUrl(c.resume);
                    console.log(`Signed URL: ${signedUrl.substring(0, 50)}...`);

                    console.log("Parsing resume...");
                    const text = await parseResume(signedUrl);
                    if (text) {
                        const score = calculateMatchScore(job.description, text);
                        console.log(`Match Score: ${score.score}%`);
                    } else {
                        console.log("Parsed text was empty/null");
                    }
                } catch (e) {
                    console.log("Error parsing/scoring:", e.message);
                }
            } else {
                console.log("Invalid/Missing Resume URL");
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        if (client) await client.close();
        process.exit();
    }
};

debugState();
