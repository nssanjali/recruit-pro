
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';
import fetch from 'node-fetch';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
}

// Cloudinary configuration - Added for signResumeUrl to work
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Copied from jobController.js
const signResumeUrl = (rawUrl) => {
    if (!rawUrl || !rawUrl.includes('cloudinary.com')) return rawUrl;

    try {
        const matches = rawUrl.match(/\/upload\/(v\d+)\/(.+)$/);
        if (!matches || !matches[2]) {
            console.log(`[DEBUG] Regex mismatch for: ${rawUrl}`);
            return rawUrl;
        }

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
            format: 'pdf',
            version: version
        });
    } catch (e) {
        console.log("Error signing:", e.message);
        return rawUrl;
    }
};

const run = async () => {
    let client;
    try {
        console.log('Connecting to MongoDB...');
        client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db();

        // 1. Find the specific job
        const jobsCollection = db.collection('jobs');
        // Looking for "Senior Full Stack Developer" as seen in screenshot
        const job = await jobsCollection.findOne({ title: "Senior Full Stack Developer" });

        if (!job) {
            console.log('Job "Senior Full Stack Developer" not found.');
        } else {
            console.log('JOB FOUND:');
            console.log(`- Title: ${job.title}`);
            console.log(`- ID: ${job._id}`);
            console.log(`- PostedBy: ${job.postedBy}`);
            console.log(`- Candidates Array: ${JSON.stringify(job.candidates)}`);
        }

        // 2. List all Recruiters to verify ID
        console.log('\nRECRUITERS:');
        const usersCollection = db.collection('users');
        const recruiters = await usersCollection.find({ role: 'recruiter' }).toArray();
        recruiters.forEach(r => {
            console.log(`- Name: ${r.name}, ID: ${r._id}, Email: ${r.email}`);
        });

        // 3. Check Applications collection for this job
        if (job) {
            console.log('\nAPPLICATIONS for this Job:');
            const applicationsCollection = db.collection('applications');
            const apps = await applicationsCollection.find({ jobId: job._id }).toArray();
            console.log(`Found ${apps.length} applications.`);
            apps.forEach(a => {
                console.log(`- Candidate: ${a.candidateName} (${a.candidateId}), Status: ${a.status}`);
                console.log(`  Resume: ${a.resume || 'None'}`);
            });
        }

        // 3. Check Applications collection for this job
        // We know the job ID from previous run: 6984bdb485861d982b6bdafc
        // Or just find generic apps
        const applicationsCollection = db.collection('applications');
        const apps = await applicationsCollection.find({ resume: { $exists: true, $ne: '' } }).limit(5).toArray();

        const options = [
            { type: 'upload', resource_type: 'image' },
            { type: 'authenticated', resource_type: 'image' },
            { type: 'private', resource_type: 'image' },
            { type: 'upload', resource_type: 'raw' },
            { type: 'authenticated', resource_type: 'raw' }
        ];

        console.log('\n--- TESTING SIGNED URLS ---');
        // Test only the first app to save time/spam
        if (apps.length > 0) {
            const app = apps[0];
            console.log(`\nCandidate: ${app.candidateName}`);
            console.log(`Original: ${app.resume}`);

            // Exact logic from jobController.js
            const signResumeUrl = (rawUrl) => {
                if (!rawUrl || !rawUrl.includes('cloudinary.com')) return rawUrl;

                try {
                    const matches = rawUrl.match(/\/upload\/(v\d+)\/(.+)$/);

                    // Log mismatch for debugging
                    if (!matches || !matches[2]) {
                        console.log(`[Regex Mismatch] URL: ${rawUrl}`);
                        return rawUrl;
                    }

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
                    console.log("Error signing:", e.message);
                    return rawUrl;
                }
            };

            console.log('\n--- VERIFYING ALL CANDIDATE RESUMES ---');
            // Iterate ALL apps
            const allApps = await applicationsCollection.find({ resume: { $exists: true, $ne: '' } }).toArray();

            for (const app of allApps) {
                console.log(`\nCandidate: ${app.candidateName}`);
                console.log(`Original: ${app.resume}`);
                const signed = signResumeUrl(app.resume);

                if (signed === app.resume) {
                    console.log('-> Returned RAW (Not Signed)');
                } else {
                    console.log(`-> Signed: ${signed}`);
                }

                try {
                    const res = await fetch(signed);
                    console.log(`-> Status: ${res.status} ${res.statusText}`);
                } catch (e) {
                    console.log(`-> Fetch Error: ${e.message}`);
                }
            }

        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (client) await client.close();
    }
};

run();
