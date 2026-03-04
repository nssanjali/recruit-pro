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
        let type = 'upload';                // Default to public upload

        // Extract file extension
        const fileExtension = file.originalname.split('.').pop();

        if (file.fieldname === 'resume') {
            folder = 'recruitpro/resumes';
            resource_type = 'image';        // PDFs are stored as 'image' type in Cloudinary
            type = 'upload';                // Public access
        } else if (file.fieldname === 'avatar') {
            folder = 'recruitpro/avatars';
            resource_type = 'image';
            type = 'upload';                // Public access
        } else if (file.fieldname === 'jd') {
            folder = 'recruitpro/jds';
            resource_type = 'image';        // JDs are also stored as image type
            type = 'upload';                // Public access
        }

        return {
            folder: folder,
            resource_type: resource_type,
            type: type,                     // Ensure resources are publicly accessible
            allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'doc', 'docx'],
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}.${fileExtension}`,  // Include extension in public_id
            overwrite: false
        };
    },
});

const upload = multer({ storage: storage });

/**
 * Generate a signed URL for authenticated access to Cloudinary resources
 * @param {string} publicId - The public ID of the resource (including folder path and extension)
 * @param {string} resourceType - Type of resource ('raw', 'image', etc.)
 * @param {number} expirySeconds - URL expiry time in seconds (default 1 hour)
 */
const generateSignedUrl = (publicId, resourceType = 'raw', expirySeconds = 3600) => {
    if (!publicId) return null;
    
    const timestamp = Math.floor(Date.now() / 1000) + expirySeconds;
    
    try {
        // Remove extension from public ID for cloudinary.url() if present
        let cleanPublicId = publicId;
        if (publicId.includes('.')) {
            // Split at last dot to get public_id without extension
            const lastDotIndex = publicId.lastIndexOf('.');
            cleanPublicId = publicId.substring(0, lastDotIndex);
        }
        
        const signedUrl = cloudinary.url(cleanPublicId, {
            type: 'authenticated',
            resource_type: resourceType,
            secure: true,
            expires_at: timestamp,
            sign_url: true
        });
        return signedUrl;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return null;
    }
};

/**
 * Extract public ID from Cloudinary URL (including extension)
 * Handles URLs with or without version parameters
 * @param {string} url - Full Cloudinary URL
 */
const extractPublicIdFromUrl = (url) => {
    if (!url) return null;
    
    // Try to extract from format: /upload/v1771167842/recruitpro/resumes/1771167842493-sasidar_resume.pdf
    // or: /upload/recruitpro/resumes/1771167842493-sasidar_resume.pdf
    // or: /upload/v1234/recruitpro/resumes/filename.pdf
    
    let publicId = null;
    
    // Pattern 1: /upload/v<version>/<path>
    let match = url.match(/\/upload\/v\d+\/(.+)$/);
    if (match) {
        publicId = match[1];
    } else {
        // Pattern 2: /upload/<path> (no version)
        match = url.match(/\/upload\/(.+)$/);
        if (match) {
            publicId = match[1];
        }
    }
    
    if (!publicId) return null;
    
    // Remove trailing query parameters if any
    publicId = publicId.split('?')[0];
    
    // If it has .pdf extension, keep it in the publicId for compatibility
    // Some Cloudinary operations need the extension, others don't
    return publicId;
};

export { cloudinary, upload, generateSignedUrl, extractPublicIdFromUrl };
