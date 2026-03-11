import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { resolveSignedResumeUrl, isAllowedResumeReference } from '../config/cloudinary.js';
import Application from '../models/Application.js';

const router = express.Router();

// Middleware to authenticate via token query parameter
const authenticateToken = async (req, res, next) => {
    try {
        const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

/**
 * Proxy route to serve resume content through our server
 * This bypasses CORS and browser security restrictions
 */
router.get('/resume/:applicationId', authenticateToken, async (req, res) => {
    try {
        const { applicationId } = req.params;
        const currentUser = req.user;

        console.log(`🔒 Proxy request: Application ${applicationId} by user ${currentUser._id} (${currentUser.role})`);

        // Validate applicationId format
        if (!applicationId || applicationId.length !== 24) {
            console.log(`🔒 Invalid application ID format: ${applicationId}`);
            return res.status(400).json({ error: 'Invalid application ID format' });
        }

        // Get application to verify access permissions
        const application = await Application.findById(applicationId);

        if (!application) {
            console.log(`🔒 Application not found: ${applicationId}`);
            return res.status(404).json({ error: 'Application not found' });
        }

        console.log(`🔒 Application found: ${application._id}, resume: ${application.resume}`);

        // Get candidate info if needed for permission check
        let candidateId = application.candidateId;
        if (typeof candidateId === 'string') {
            candidateId = candidateId;
        } else if (candidateId && candidateId._id) {
            candidateId = candidateId._id.toString();
        }

        // Check if user has permission to view this resume
        const canView = 
            // Company admin or super admin can view any resume
            ['company_admin', 'super_admin'].includes(currentUser.role) ||
            // Recruiter can view resumes
            currentUser.role === 'recruiter' ||
            // Candidate can view their own resume
            (currentUser.role === 'candidate' && candidateId === currentUser._id.toString());

        if (!canView) {
            console.log(`🔒 Access denied: User ${currentUser._id} (${currentUser.role}) cannot view application ${applicationId}`);
            return res.status(403).json({ error: 'Access denied' });
        }

        const resumeRef = application.resume;
        if (!resumeRef) {
            console.log(`🔒 No resume found for application ${applicationId}`);
            return res.status(404).json({ error: 'No resume found for this application' });
        }

        if (!isAllowedResumeReference(resumeRef)) {
            console.log(`🔒 Invalid resume reference: ${resumeRef}`);
            return res.status(400).json({ error: 'Invalid resume reference' });
        }

        console.log(`🔒 Resolving signed URL for resume: ${resumeRef}`);

        // Generate signed URL with short expiration
        const resolved = await resolveSignedResumeUrl(resumeRef, 300); // 5 minutes
        if (!resolved?.url) {
            console.log(`🔒 Could not generate secure resume URL for: ${resumeRef}`);
            return res.status(500).json({ error: 'Could not generate secure resume URL' });
        }

        console.log(`🔒 Generated signed URL: ${resolved.url.substring(0, 100)}...`);

        // Fetch the PDF from Cloudinary
        const response = await fetch(resolved.url);
        if (!response.ok) {
            console.log(`🔒 Failed to fetch resume from Cloudinary: ${response.status} ${response.statusText}`);
            return res.status(response.status).json({ error: 'Failed to fetch resume' });
        }

        console.log(`🔒 Successfully fetched resume, size: ${response.headers.get('content-length')} bytes`);

        // Get the PDF content
        const pdfBuffer = await response.arrayBuffer();
        
        // Set appropriate headers
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="resume.pdf"',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Frame-Options': 'SAMEORIGIN',
            'X-Content-Type-Options': 'nosniff',
            'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'http://localhost:5173',
            'Access-Control-Allow-Credentials': 'true'
        });

        // Log access
        console.log(`🔒 Resume proxy access successful: Application ${applicationId} by ${currentUser._id} (${currentUser.role})`);

        // Send the PDF content
        res.send(Buffer.from(pdfBuffer));

    } catch (error) {
        console.error('🔒 Resume proxy error:', error);
        console.error('🔒 Error stack:', error.stack);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

/**
 * Proxy route for user's own resume
 */
router.get('/my-resume', authenticateToken, async (req, res) => {
    try {
        const currentUser = req.user;

        console.log(`🔒 My resume proxy request by user ${currentUser._id} (${currentUser.role})`);

        if (!currentUser.resume) {
            console.log(`🔒 No resume found for user ${currentUser._id}`);
            return res.status(404).json({ error: 'No resume found' });
        }

        const resumeRef = currentUser.resume;
        console.log(`🔒 User resume reference: ${resumeRef}`);

        if (!isAllowedResumeReference(resumeRef)) {
            console.log(`🔒 Invalid resume reference for user ${currentUser._id}: ${resumeRef}`);
            return res.status(400).json({ error: 'Invalid resume reference' });
        }

        console.log(`🔒 Resolving signed URL for user resume: ${resumeRef}`);

        // Generate signed URL with short expiration
        const resolved = await resolveSignedResumeUrl(resumeRef, 300); // 5 minutes
        if (!resolved?.url) {
            console.log(`🔒 Could not generate secure resume URL for user ${currentUser._id}: ${resumeRef}`);
            return res.status(500).json({ error: 'Could not generate secure resume URL' });
        }

        console.log(`🔒 Generated signed URL for user: ${resolved.url.substring(0, 100)}...`);

        // Fetch the PDF from Cloudinary
        const response = await fetch(resolved.url);
        if (!response.ok) {
            console.log(`🔒 Failed to fetch user resume from Cloudinary: ${response.status} ${response.statusText}`);
            return res.status(response.status).json({ error: 'Failed to fetch resume' });
        }

        console.log(`🔒 Successfully fetched user resume, size: ${response.headers.get('content-length')} bytes`);

        // Get the PDF content
        const pdfBuffer = await response.arrayBuffer();
        
        // Set appropriate headers
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="my-resume.pdf"',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Frame-Options': 'SAMEORIGIN',
            'X-Content-Type-Options': 'nosniff',
            'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'http://localhost:5173',
            'Access-Control-Allow-Credentials': 'true'
        });

        // Log access
        console.log(`🔒 My resume proxy access successful: User ${currentUser._id} (${currentUser.role})`);

        // Send the PDF content
        res.send(Buffer.from(pdfBuffer));

    } catch (error) {
        console.error('🔒 My resume proxy error:', error);
        console.error('🔒 Error stack:', error.stack);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export default router;