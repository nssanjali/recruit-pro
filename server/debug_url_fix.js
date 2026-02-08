
import fetch from 'node-fetch';

const originalUrl = "https://res.cloudinary.com/dwjr9pg2j/image/upload/v1768922462/recruitpro/resumes/1768922464468-rhym-resume.pdf";

const variations = [
    originalUrl,
    originalUrl.replace('image/upload', 'raw/upload'),
    originalUrl.replace('image/upload', 'image/upload/fl_attachment')
];

const test = async () => {
    for (const url of variations) {
        try {
            console.log(`Testing: ${url}`);
            const res = await fetch(url);
            console.log(`Status: ${res.status} ${res.statusText}`);
            if (res.ok) {
                console.log('SUCCESS!');
                // Try to see if it is binary
                const buff = await res.arrayBuffer();
                console.log(`Bytes: ${buff.byteLength}`);
                break;
            }
        } catch (e) {
            console.log('Error:', e.message);
        }
    }
};

test();
