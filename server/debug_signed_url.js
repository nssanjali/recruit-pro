
import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import fetch from 'node-fetch';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Extract public ID from the failing URL: 
// https://res.cloudinary.com/dwjr9pg2j/image/upload/v1768922462/recruitpro/resumes/1768922464468-rhym-resume.pdf
// Public ID is usually: recruitpro/resumes/1768922464468-rhym-resume
const publicId = 'recruitpro/resumes/1768922464468-rhym-resume';

const run = async () => {
    // 1. Generate Signed URL
    const url = cloudinary.url(publicId, {
        resource_type: 'image', // PDFs are often treated as images or 'raw'
        sign_url: true,
        type: 'authenticated', // Try 'authenticated' or 'private'
        format: 'pdf'
    });

    console.log(`Generated Signed URL: ${url}`);

    try {
        const res = await fetch(url);
        console.log(`Status: ${res.status} ${res.statusText}`);
    } catch (e) {
        console.log('Fetch error:', e.message);
    }

    // 2. Try 'private' type
    const urlPrivate = cloudinary.url(publicId, {
        resource_type: 'image',
        sign_url: true,
        type: 'private',
        format: 'pdf'
    });
    console.log(`Generated Private URL: ${urlPrivate}`);
    try {
        const res = await fetch(urlPrivate);
        console.log(`Status: ${res.status} ${res.statusText}`);
    } catch (e) {
        console.log('Fetch error:', e.message);
    }

    // 3. Try 'upload' type (public) BUT signed
    const urlUploadSigned = cloudinary.url(publicId, {
        resource_type: 'image',
        sign_url: true,
        type: 'upload',
        format: 'pdf',
        version: '1768922462' // From the admin API result output
    });
    console.log(`Generated Upload Signed URL: ${urlUploadSigned}`);
    try {
        const res = await fetch(urlUploadSigned);
        console.log(`Status: ${res.status} ${res.statusText}`);
    } catch (e) {
        console.log('Fetch error:', e.message);
    }
};

run();
