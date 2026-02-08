
import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const rawUrl = "https://res.cloudinary.com/dwjr9pg2j/image/upload/v1768922462/recruitpro/resumes/1768922464468-rhym-resume.pdf";

const signResumeUrlWrong = (rawUrl) => {
    // Current implementation checks
    const matches = rawUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (!matches || !matches[1]) return rawUrl;

    let publicId = matches[1];
    const parts = publicId.split('.');
    const ext = parts.length > 1 ? parts.pop() : 'pdf';
    const idWithoutExt = parts.join('.');

    return cloudinary.url(idWithoutExt, {
        resource_type: 'image',
        type: 'upload',
        sign_url: true,
        secure: true,
        format: ext
    });
};

const signResumeUrlCorrect = (rawUrl) => {
    // Proposed implementation with version capture
    const matches = rawUrl.match(/\/upload\/(?:(v\d+)\/)?(.+)$/);
    if (!matches || !matches[2]) return rawUrl;

    const version = matches[1]; // Capture version (e.g., v12345)
    let publicId = matches[2];

    const parts = publicId.split('.');
    const ext = parts.length > 1 ? parts.pop() : 'pdf';
    const idWithoutExt = parts.join('.');

    return cloudinary.url(idWithoutExt, {
        resource_type: 'image',
        type: 'upload',
        sign_url: true,
        secure: true,
        format: ext,
        version: version // Pass version
    });
};

const run = async () => {
    console.log("Original URL:", rawUrl);

    const wrong = signResumeUrlWrong(rawUrl);
    console.log("\n[Wrong Logic] Generated:", wrong);

    // Test fetch
    try {
        const res1 = await fetch(wrong);
        console.log(`[Wrong Logic] Status: ${res1.status}`);
    } catch (e) { console.log(e.message); }

    const correct = signResumeUrlCorrect(rawUrl);
    console.log("\n[Correct Logic] Generated:", correct);

    try {
        const res2 = await fetch(correct);
        console.log(`[Correct Logic] Status: ${res2.status}`);
    } catch (e) { console.log(e.message); }
};

run();
