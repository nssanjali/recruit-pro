
import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import fetch from 'node-fetch';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const publicId = "recruitpro/resumes/1768922464468-rhym-resume"; // No extension

const run = async () => {
    console.log("Testing private_download_url...");

    try {
        // Method 1: private_download_url
        const url1 = cloudinary.utils.private_download_url(publicId, 'pdf', {
            attachment: true,
            expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour
        });
        console.log(`[private_download_url]: ${url1}`);

        try {
            const res1 = await fetch(url1);
            console.log(`Status: ${res1.status}`);
            if (res1.ok) console.log(">>> SUCCESS <<<");
        } catch (e) { console.log(e.message); }

        // Method 1: private_download_url with extension
        const url2 = cloudinary.utils.private_download_url(publicId + '.pdf', '', {
            resource_type: 'image',
            attachment: true,
            expires_at: Math.floor(Date.now() / 1000) + 3600
        });
        console.log(`[private_download_url + ext]: ${url2}`);

        try {
            const res2 = await fetch(url2);
            console.log(`Status: ${res2.status}`);
            if (res2.ok) console.log(">>> SUCCESS <<<");
        } catch (e) { console.log(e.message); }

        // Method 2: signed URL with timestamp (manual 'auth_token'?)
        // Usually handled by strict transformation signing if needed.

    } catch (e) {
        console.log("Error:", e.message);
    }
};

run();
