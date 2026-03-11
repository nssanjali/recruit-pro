import express from 'express';
import { upload, generateSignedUrl } from '../config/cloudinary.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Helper function to wrap multer middleware with error handling
const uploadWithErrorHandling = (uploadMiddleware) => {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err) {
                console.error('Upload middleware error:', err);
                return res.status(400).json({
                    success: false,
                    message: err.message || 'File upload failed'
                });
            }
            next();
        });
    };
};

// @desc    Upload a single file
// @route   POST /api/upload
// @access  Private
router.post('/', protect, uploadWithErrorHandling(upload.single('file')), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                url: req.file.path,
                name: req.file.originalname,
                format: req.file.format,
                size: req.file.size
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error uploading file'
        });
    }
});

// Specific upload route for resumes (temporarily public)
router.post('/resume', uploadWithErrorHandling(upload.single('resume')), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No resume uploaded'
            });
        }

        // Log the file details for debugging
        console.log('✅ Resume uploaded successfully');
        console.log('  URL:', req.file.path);
        console.log('  Public ID:', req.file.filename);
        console.log('  Original name:', req.file.originalname);

        const previewUrl = generateSignedUrl(req.file.filename, 'image', 300, 'upload');

        res.status(200).json({
            success: true,
            data: {
                url: req.file.path,
                previewUrl,
                name: req.file.originalname,
                filename: req.file.filename,
                format: req.file.format
            }
        });
    } catch (error) {
        console.error('Resume upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error uploading resume'
        });
    }
});

// Specific upload route for avatars
router.post('/avatar', protect, uploadWithErrorHandling(upload.single('avatar')), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No avatar uploaded'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                url: req.file.path,
                name: req.file.originalname
            }
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error uploading avatar'
        });
    }
});

// Specific upload route for company banners
router.post('/banner', protect, uploadWithErrorHandling(upload.single('banner')), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No banner uploaded'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                url: req.file.path,
                name: req.file.originalname
            }
        });
    } catch (error) {
        console.error('Banner upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error uploading banner'
        });
    }
});

export default router;
