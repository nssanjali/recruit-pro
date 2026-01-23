import express from 'express';
import { upload } from '../config/cloudinary.js';
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

// Specific upload route for resumes
router.post('/resume', protect, uploadWithErrorHandling(upload.single('resume')), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No resume uploaded'
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

export default router;
