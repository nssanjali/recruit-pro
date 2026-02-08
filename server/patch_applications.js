import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const patchApps = async () => {
    let client;
    try {
        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        const db = client.db();

        // 1. Get a valid resume URL (from User collection)
        const donor = await db.collection('users').findOne({
            resume: { $regex: /cloudinary\.com/ }
        });

        if (!donor) {
            console.log("No donor candidate with a valid Cloudinary resume found.");
            return;
        }
        const validResumeUrl = donor.resume;
        console.log(`Using Valid URL: ${validResumeUrl}`);

        // 2. Find applications with invalid resumes
        const invalidApps = await db.collection('applications').find({
            $or: [
                { resume: { $not: /cloudinary\.com/ } },
                { resume: { $exists: false } }
            ]
        }).toArray();

        console.log(`Found ${invalidApps.length} applications to patch.`);

        // 3. Update them
        for (const app of invalidApps) {
            if (app.candidateName && app.candidateName.includes("Candidate")) {
                console.log(`Patching App for ${app.candidateName}...`);
                await db.collection('applications').updateOne(
                    { _id: app._id },
                    { $set: { resume: validResumeUrl } }
                );
            }
        }
        console.log("Application Patch Complete.");

    } catch (e) {
        console.error(e);
    } finally {
        if (client) await client.close();
        process.exit();
    }
};

patchApps();
