import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const checkContent = async () => {
    let client;
    try {
        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        const db = client.db();

        const candidate = await db.collection('users').findOne({ name: "Candidate Three" });

        if (candidate) {
            console.log("Found Candidate Three:");
            console.log(JSON.stringify(candidate, null, 2));
        } else {
            console.log("Candidate Three not found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        if (client) await client.close();
        process.exit();
    }
};

checkContent();
