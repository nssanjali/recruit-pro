import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const checkApps = async () => {
    let client;
    try {
        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        const db = client.db();

        console.log("Checking Applications...");
        // Find applications for candidates 3-6 (we can search by name if we join, or just list all)
        // Let's list all applications to see what's there.
        const apps = await db.collection('applications').find({}).toArray();

        for (const app of apps) {
            console.log(`\nCandidate: ${app.candidateName} (${app.candidateEmail})`);
            console.log(`App Resume: ${app.resume}`);

            // Validation check
            if (app.resume && !app.resume.includes('cloudinary')) {
                console.log(">>> INVALID/LEGACY RESUME DETECTED <<<");
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        if (client) await client.close();
        process.exit();
    }
};

checkApps();
