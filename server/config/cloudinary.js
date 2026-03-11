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
            resource_type = 'raw';          // Use 'raw' for PDFs to maintain file integrity
            type = 'authenticated';         // PRIVATE: Requires signed URLs for access
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

const CLOUDINARY_RESUME_PREFIX = 'recruitpro/resumes/';

const isCloudinaryResumeUrl = (value = '') => {
    const str = String(value || '').trim();
    if (!str.startsWith('http')) return false;
    return /res\.cloudinary\.com\/.+\/(?:image|raw|video)\/(?:upload|authenticated)\//i.test(str)
        && str.includes('/recruitpro/resumes/');
};

const isCloudinaryResumePublicId = (value = '') => {
    const str = String(value || '').trim();
    return str.startsWith(CLOUDINARY_RESUME_PREFIX);
};

const isAllowedResumeReference = (value = '') => {
    if (!value) return false;
    return isCloudinaryResumePublicId(value) || isCloudinaryResumeUrl(value);
};

/**
 * Generate a signed, expiring URL for a publicly-stored Cloudinary resource.
 * Works with files uploaded as type='upload' (not 'authenticated' storage).
 *
 * Signing the URL means it includes a Cloudinary-validated signature and expiry timestamp,
 * so the URL stops working after `expirySeconds` seconds even though the underlying file
 * is stored as a public upload.
 *
 * @param {string} publicId - Cloudinary public ID (with or without extension)
 * @param {string} resourceType - Cloudinary resource type ('image', 'raw', 'video')
 * @param {number} expirySeconds - How long the URL is valid (default 5 minutes)
 */
const generateSignedUrl = (
    publicId,
    resourceType = 'image',
    expirySeconds = 300, // Default 5 minutes for security
    deliveryType = 'upload',
    version = null
) => {
    if (!publicId) return null;

    try {
        const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds;

        const signedUrl = cloudinary.url(publicId, {
            resource_type: resourceType,
            type: deliveryType,
            secure: true,
            sign_url: true,     // Cloudinary will sign with API secret
            expires_at: expiresAt,
            ...(version ? { version } : {}),
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

    // Supported formats:
    // /image/upload/v123/recruitpro/resumes/file.pdf
    // /image/authenticated/v123/recruitpro/resumes/file.pdf
    // /image/authenticated/s--<sig>--/v1/recruitpro/resumes/file.pdf

    let publicId = null;

    // Pattern 1: /(upload|authenticated)/(optional signature)/v<version>/<path>
    let match = url.match(/\/(?:upload|authenticated)\/(?:s--[^/]+--\/)?v\d+\/(.+)$/);
    if (match) {
        publicId = match[1];
    } else {
        // Pattern 2: /(upload|authenticated)/(optional signature)/<path> (no explicit version)
        match = url.match(/\/(?:upload|authenticated)\/(?:s--[^/]+--\/)?(.+)$/);
        if (match) {
            publicId = match[1];
        }
    }

    if (!publicId) return null;

    // Remove trailing query parameters if any
    publicId = publicId.split('?')[0];
    // Guard against accidental retained version prefix
    publicId = publicId.replace(/^v\d+\//, '');

    // If it has .pdf extension, keep it in the publicId for compatibility
    // Some Cloudinary operations need the extension, others don't
    return publicId;
};

const canAccessSignedUrl = async (url) => {
    if (!url) return false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const headRes = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: controller.signal
        });
        if (headRes.ok) return true;
    } catch {
        // Fall through to GET probe
    } finally {
        clearTimeout(timeout);
    }

    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 7000);
    try {
        const getRes = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            headers: { Range: 'bytes=0-0' },
            signal: controller2.signal
        });
        return getRes.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timeout2);
    }
};

const resolveSignedResumeUrl = async (resumeRef, expirySeconds = 300) => {
    if (!resumeRef || !isAllowedResumeReference(resumeRef)) return null;

    const extractedPublicId = extractPublicIdFromUrl(resumeRef) || String(resumeRef).trim();
    if (!extractedPublicId) return null;

    const publicIdCandidates = Array.from(new Set([
        extractedPublicId,
        extractedPublicId.replace(/\.[^/.]+$/, '')
    ].filter(Boolean)));

    // For authenticated storage, prioritize 'authenticated' type
    const ref = String(resumeRef || '');
    const preferredType = ref.includes('/authenticated/') ? 'authenticated' : ref.includes('/upload/') ? 'upload' : 'authenticated';
    const secondaryType = preferredType === 'authenticated' ? 'upload' : 'authenticated';

    // Try 'raw' resource type first for PDFs, then 'image' as fallback
    const candidates = [
        { resourceType: 'raw', deliveryType: preferredType },
        { resourceType: 'image', deliveryType: preferredType },
        { resourceType: 'raw', deliveryType: secondaryType },
        { resourceType: 'image', deliveryType: secondaryType }
    ];
    let fallbackResolved = null;

    for (const publicId of publicIdCandidates) {
        for (const c of candidates) {
            try {
                const resource = await cloudinary.api.resource(publicId, {
                    resource_type: c.resourceType,
                    type: c.deliveryType
                });
                const url = generateSignedUrl(
                    publicId,
                    c.resourceType,
                    expirySeconds,
                    c.deliveryType,
                    resource?.version || null
                );
                if (!url) continue;

                const resolved = {
                    url,
                    publicId,
                    resourceType: c.resourceType,
                    deliveryType: c.deliveryType
                };

                // Keep a fallback in case network probe from server is blocked/intermittent.
                if (!fallbackResolved) fallbackResolved = resolved;

                if (await canAccessSignedUrl(url)) {
                    return resolved;
                }
            } catch {
                // Try next candidate
            }
        }
    }

    return fallbackResolved;
};

export {
    cloudinary,
    upload,
    generateSignedUrl,
    resolveSignedResumeUrl,
    extractPublicIdFromUrl,
    isAllowedResumeReference,
    isCloudinaryResumePublicId,
    isCloudinaryResumeUrl
};
