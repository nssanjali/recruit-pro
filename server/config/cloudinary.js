import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Validate Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('⚠️ Cloudinary credentials are missing in .env file');
} else {
    console.log('✅ Cloudinary configured:', process.env.CLOUDINARY_CLOUD_NAME);
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        let folder = 'recruitpro';
        let resource_type = 'auto';

        if (file.fieldname === 'resume') {
            folder = 'recruitpro/resumes';
        } else if (file.fieldname === 'avatar') {
            folder = 'recruitpro/avatars';
        } else if (file.fieldname === 'jd') {
            folder = 'recruitpro/jds';
        }

        return {
            folder: folder,
            resource_type: resource_type,
            allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'doc', 'docx'],
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
        };
    },
});

const upload = multer({ storage: storage });

export { cloudinary, upload };
