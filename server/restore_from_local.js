import { v2 as cloudinary } from 'cloudinary';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const RESTORE_DIR = path.join(__dirname, '..', 'restore_resumes');

const restore = async () => {
    if (!fs.existsSync(RESTORE_DIR)) {
        console.log(`Creating folder: ${RESTORE_DIR}`);
        fs.mkdirSync(RESTORE_DIR);
        console.log("Please put the correct PDF files in this folder:");
        console.log(" - CandidateThree.pdf");
        console.log(" - CandidateFour.pdf");
        console.log(" - CandidateFive.pdf");
        console.log(" - CandidateSix.pdf");
        console.log("Then run this script again.");
        return;
    }

    let client;
    try {
        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        const db = client.db();

        const files = fs.readdirSync(RESTORE_DIR);
        console.log(`Found ${files.length} files in restore folder.`);

        for (const file of files) {
            if (!file.toLowerCase().endsWith('.pdf')) continue;

            // Simple matching: Filename contains "Three", "Four", etc.
            let candidateName = "";
            let candidateId = "";

            if (file.toLowerCase().includes("three") || file.includes("3")) candidateName = "Candidate Three";
            else if (file.toLowerCase().includes("four") || file.includes("4")) candidateName = "Candidate Four";
            else if (file.toLowerCase().includes("five") || file.includes("5")) candidateName = "Candidate Five";
            else if (file.toLowerCase().includes("six") || file.includes("6")) candidateName = "Candidate Six";

            if (!candidateName) {
                console.log(`Skipping unknown file: ${file}`);
                continue;
            }

            console.log(`Processing ${file} for ${candidateName}...`);
            const filePath = path.join(RESTORE_DIR, file);

            // Upload
            const result = await cloudinary.uploader.upload(filePath, {
                folder: 'recruitpro/resumes',
                resource_type: 'image', // Store as image/pdf for compatibility
                format: 'pdf',
                access_mode: 'public'
            });

            console.log(`Uploaded to: ${result.secure_url}`);

            // Update DB
            const user = await db.collection('users').findOne({ name: candidateName });
            if (user) {
                await db.collection('users').updateOne(
                    { _id: user._id },
                    { $set: { resume: result.secure_url } }
                );

                await db.collection('applications').updateMany(
                    { candidateId: user._id },
                    { $set: { resume: result.secure_url } }
                );
                console.log(`Updated database for ${candidateName}`);
            } else {
                console.log(`User ${candidateName} not found in DB.`);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        if (client) await client.close();
    }
};

restore();
