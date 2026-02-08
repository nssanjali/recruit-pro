
import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Based on URL: https://res.cloudinary.com/dwjr9pg2j/image/upload/v1768922462/recruitpro/resumes/1768922464468-rhym-resume.pdf
// Public ID might be: recruitpro/resumes/1768922464468-rhym-resume (no extension? with extension?)

const publicId = 'recruitpro/resumes/1768922464468-rhym-resume';

const run = async () => {
    try {
        console.log(`Checking resource: ${publicId}`);
        const result = await cloudinary.api.resource(publicId, {
            resource_type: 'image'
        });
        console.log('--- FOUND IMAGE ---');
        console.log('Public ID:', result.public_id);
        console.log('Format:', result.format);
        console.log('Type:', result.type);
        console.log('Access Control:', result.access_control);
        console.log('URL:', result.secure_url);
    } catch (e) {
        console.log('Not found as image:', e.message);

        try {
            const resultRaw = await cloudinary.api.resource(publicId, {
                resource_type: 'raw'
            });
            console.log('--- FOUND RAW ---');
            console.log(resultRaw);
        } catch (e2) {
            console.log('Not found as raw:', e2.message);
            // Try with extension
            try {
                const resultExt = await cloudinary.api.resource(publicId + '.pdf', { resource_type: 'raw' });
                console.log('--- FOUND RAW WITH EXT ---');
                console.log(resultExt);
            } catch (e3) {
                console.log('Not found raw with ext:', e3.message);
            }
        }
    }
};

run();
