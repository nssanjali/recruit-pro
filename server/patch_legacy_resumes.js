import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const patchResumes = async () => {
    let client;
    try {
        console.log('Loading .env from:', path.join(__dirname, '.env'));
        console.log('MONGODB_URI is:', process.env.MONGODB_URI ? 'Defined' : 'UNDEFINED');

        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing from .env");
        }

        console.log('Connecting to MongoDB...');
        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        console.log('MongoDB Connected');

        const db = client.db();
        const usersCollection = db.collection('users');

        // 1. Get a valid resume URL (looking for one with cloudinary.com)
        const donor = await usersCollection.findOne({
            resume: { $regex: /cloudinary\.com/ }
        });

        if (!donor) {
            console.log("No donor candidate with a valid Cloudinary resume found.");
            return;
        }

        const validResumeUrl = donor.resume;
        console.log(`Found valid resume URL from ${donor.name}: ${validResumeUrl}`);

        // 2. Find candidates to patch (legacy or invalid resumes)
        const targets = await usersCollection.find({
            $or: [
                { resume: { $not: /cloudinary\.com/ } },
                { resume: { $exists: false } }
            ],
            role: 'candidate'
        }).toArray();

        console.log(`Found ${targets.length} candidates to patch.`);

        // 3. Update them
        for (const candidate of targets) {
            // specific check for the test users we know are broken
            // Matches names like "Candidate Three", "Candidate Four", etc.
            if (candidate.name && candidate.name.includes("Candidate")) {
                console.log(`Patching ${candidate.name} (${candidate.email})...`);
                await usersCollection.updateOne(
                    { _id: candidate._id },
                    { $set: { resume: validResumeUrl } }
                );
                console.log(` -> Updated.`);
            }
        }

        console.log("Patch complete.");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        if (client) {
            await client.close();
        }
        process.exit();
    }
};

patchResumes();
