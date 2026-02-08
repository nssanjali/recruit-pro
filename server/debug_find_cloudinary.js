import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
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

const searchCloudinary = async () => {
    try {
        console.log("Searching Cloudinary for SPECIFIC Candidates...");

        // Exact filename prefixes we hope to find (based on user saying they exist)
        const targets = [
            "CandidateThree", "Candidate3",
            "CandidateFour", "Candidate4",
            "CandidateFive", "Candidate5",
            "CandidateSix", "Candidate6"
        ];

        for (const name of targets) {
            // console.log(`Checking: ${name}...`);
            try {
                // Search API
                const searchResult = await cloudinary.search
                    .expression(`resource_type:image AND filename:${name}*`)
                    .execute();

                if (searchResult.total_count > 0) {
                    console.log(`>>> FOUND MATCH FOR ${name} <<<`);
                    searchResult.resources.forEach(r => {
                        console.log(`    PublicID: ${r.public_id}`);
                        console.log(`    URL: ${r.secure_url}`);
                    });
                }
            } catch (e) {
                // ignore search errors
            }
        }

        console.log("Search Complete.");

    } catch (e) {
        console.error("Error:", e);
    }
};

searchCloudinary();
