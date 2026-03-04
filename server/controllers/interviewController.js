import { isConnected, getDb } from '../config/db.js';
import { ObjectId } from 'mongodb';
import Interview from '../models/Interview.js';
import Recruiter from '../models/Recruiter.js';
import User from '../models/User.js';
import { sendInterviewNotifications } from '../services/notificationService.js';
import { createCalendarEvent } from '../services/calendarService.js';
import { analyzeInterviewFeedback, deriveFinalDecision } from '../utils/interviewAnalyzer.js';

// Check if MongoDB is connected
const isMongoConnected = () => isConnected();

export const scheduleInterview = async (req, res) => {
    try {
        const { candidate, recruiter, admin, date, time, role } = req.body;
        const db = getDb();

        const schedulerUser = req.user ? await db.collection('users').findOne({ _id: req.user._id }) : null;
        const availability = req.user?._id
            ? await db.collection('calendarAvailability').findOne({ userId: req.user._id })
            : null;

        const schedulerTokens = schedulerUser?.googleTokens?.access_token
            ? schedulerUser.googleTokens
            : (availability?.googleAccessToken
                ? {
                    access_token: availability.googleAccessToken,
                    refresh_token: availability.googleRefreshToken
                }
                : null);

        if (!schedulerTokens) {
            return res.status(400).json({
                message: 'Google Calendar is not connected. Connect calendar first to generate real Meet links.'
            });
        }

        const start = new Date(date);
        if (Number.isNaN(start.getTime())) {
            return res.status(400).json({ message: 'Invalid interview date/time payload' });
        }

        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const attendees = [candidate?.email, recruiter?.email, admin?.email].filter(Boolean);
        const eventDetails = {
            summary: `Interview - ${role || 'Technical Round'} - ${candidate?.name || 'Candidate'}`,
            description: `Interview scheduled via RecruitPro\n\nCandidate: ${candidate?.name || ''}\nRecruiter: ${recruiter?.name || ''}`,
            start,
            end,
            timeZone: 'Asia/Kolkata',
            attendees
        };

        const calendarEvent = await createCalendarEvent(schedulerTokens, eventDetails);
        const meetingLink = calendarEvent.meetingLink;

        const interviewData = {
            candidate,
            recruiter,
            admin,
            role: role || 'Technical Round',
            date,
            time,
            meetingLink,
            scheduledAt: start,
            endsAt: end,
            calendarEventId: calendarEvent.eventId,
            status: 'scheduled',
            scheduledBy: 'AI',
            isProctored: false,
            notificationsSent: false
        };

        let interview;

        // Create interview in database
        interview = await Interview.create(interviewData);

        // Send notifications to all participants
        await sendInterviewNotifications({
            candidate,
            recruiter,
            admin,
            date,
            time,
            meetingLink
        });

        // Update notification status
        interview = await Interview.findByIdAndUpdate(interview._id, { notificationsSent: true });

        res.status(201).json({
            message: 'Interview scheduled successfully and notifications sent.',
            interview
        });
    } catch (error) {
        console.error('Error scheduling interview:', error);
        res.status(500).json({ message: 'Failed to schedule interview.', error: error.message });
    }
};

export const getInterviews = async (req, res) => {
    try {
        let interviews = await Interview.find({ status: 'scheduled' });
        // Sort by createdAt descending
        interviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json(interviews);
    } catch (error) {
        console.error('Error fetching interviews:', error);
        res.status(500).json({ message: 'Failed to fetch interviews.', error: error.message });
    }
};

export const getInterviewById = async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id);

        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        res.status(200).json(interview);
    } catch (error) {
        console.error('Error fetching interview:', error);
        res.status(500).json({ message: 'Failed to fetch interview.', error: error.message });
    }
};

export const updateInterview = async (req, res) => {
    try {
        const interview = await Interview.findByIdAndUpdate(
            req.params.id,
            req.body
        );

        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        res.status(200).json(interview);
    } catch (error) {
        console.error('Error updating interview:', error);
        res.status(500).json({ message: 'Failed to update interview.', error: error.message });
    }
};

export const deleteInterview = async (req, res) => {
    try {
        const interview = await Interview.findByIdAndDelete(req.params.id);

        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        res.status(200).json({ message: 'Interview deleted successfully' });
    } catch (error) {
        console.error('Error deleting interview:', error);
        res.status(500).json({ message: 'Failed to delete interview.', error: error.message });
    }
};

// POST /api/interviews/:id/review-feedback - recruiter submits post-interview review
export const submitInterviewReview = async (req, res) => {
    try {
        const db = getDb();
        const interviewId = req.params.id;
        const toOid = (value) => {
            if (!value) return null;
            if (value instanceof ObjectId) return value;
            try {
                return new ObjectId(value);
            } catch {
                return null;
            }
        };
        const {
            recruiterRecommendation,
            reviewNotes,
            transcriptUrl,
            transcriptText,
            transcriptName,
            ratings
        } = req.body || {};

        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, message: 'Interview not found' });
        }

        const recruiterProfile = await Recruiter.findOne({ userId: req.user._id });
        if (!recruiterProfile || recruiterProfile._id?.toString() !== interview.recruiterId?.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to submit review for this interview'
            });
        }

        const interviewEnd = interview.endsAt
            ? new Date(interview.endsAt)
            : new Date(new Date(interview.scheduledAt).getTime() + 60 * 60 * 1000);
        if (Date.now() < interviewEnd.getTime()) {
            return res.status(400).json({
                success: false,
                message: 'Interview review unlocks only after interview time is completed',
                unlockAt: interviewEnd
            });
        }

        if (!reviewNotes || !String(reviewNotes).trim()) {
            return res.status(400).json({
                success: false,
                message: 'Review notes are required'
            });
        }

        if (!transcriptUrl && !transcriptText) {
            return res.status(400).json({
                success: false,
                message: 'Transcript PDF upload or transcript text is required'
            });
        }

        const [candidate, job] = await Promise.all([
            interview.candidateId ? User.findById(interview.candidateId) : null,
            toOid(interview.jobId) ? db.collection('jobs').findOne({ _id: toOid(interview.jobId) }) : null
        ]);

        const aiInterviewAnalysis = await analyzeInterviewFeedback({
            jobTitle: job?.title,
            candidateName: candidate?.name,
            recruiterRecommendation,
            recruiterReview: reviewNotes,
            transcriptUrl,
            transcriptText
        });

        const finalDecision = deriveFinalDecision({
            recruiterRecommendation,
            aiRecommendation: aiInterviewAnalysis.recommendation
        });

        const reviewPayload = {
            recruiterRecommendation: recruiterRecommendation || 'consider',
            notes: String(reviewNotes).trim(),
            ratings: ratings && typeof ratings === 'object' ? ratings : {},
            transcript: {
                url: transcriptUrl || null,
                name: transcriptName || null,
                hasText: Boolean(transcriptText),
                updatedAt: new Date()
            },
            submittedBy: req.user._id,
            submittedAt: new Date()
        };

        const updatedInterview = await Interview.findByIdAndUpdate(interviewId, {
            status: 'completed',
            completedAt: new Date(),
            interviewReview: reviewPayload,
            aiInterviewAnalysis
        });

        if (interview.applicationId) {
            const applicationId = toOid(interview.applicationId);
            if (applicationId) {
                await db.collection('applications').updateOne(
                    { _id: applicationId },
                    {
                        $set: {
                            reviewNotes: reviewPayload.notes,
                            finalDecisionSource: 'interview_review_and_ai',
                            finalRecommendation: finalDecision,
                            interviewReview: reviewPayload,
                            interviewAiAnalysis: aiInterviewAnalysis,
                            reviewedBy: req.user._id,
                            reviewedAt: new Date(),
                            updatedAt: new Date()
                        }
                    }
                );
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Interview review submitted and AI analysis completed',
            data: {
                interview: updatedInterview,
                finalDecision,
                aiInterviewAnalysis
            }
        });
    } catch (error) {
        console.error('Error submitting interview review:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit interview review',
            error: error.message
        });
    }
};

// GET /api/interviews/my  — recruiter sees their own interviews (for calendar UI)
export const getMyInterviews = async (req, res) => {
    try {
        const db = getDb();

        // Find recruiter profile for this user
        const recruiter = await Recruiter.findOne({ userId: req.user._id });
        if (!recruiter) {
            return res.status(200).json([]); // no profile yet → empty calendar
        }

        const interviews = await db.collection('interviews')
            .find({
                recruiterId: recruiter._id,
                status: { $in: ['scheduled', 'in_progress', 'completed', 'cancelled'] }
            })
            .sort({ scheduledAt: 1 })
            .toArray();

        // Enrich with candidate + job names for the calendar UI
        const enriched = await Promise.all(interviews.map(async (iv) => {
            const [candidate, job] = await Promise.all([
                iv.candidateId
                    ? db.collection('users').findOne(
                        { _id: new ObjectId(iv.candidateId) },
                        { projection: { name: 1, email: 1 } }
                    )
                    : null,
                iv.jobId
                    ? db.collection('jobs').findOne(
                        { _id: new ObjectId(iv.jobId) },
                        { projection: { title: 1, department: 1 } }
                    )
                    : null
            ]);
            return {
                ...iv,
                candidateName: candidate?.name || 'Unknown',
                candidateEmail: candidate?.email || '',
                jobTitle: job?.title || '',
                jobDepartment: job?.department || ''
            };
        }));

        res.status(200).json(enriched);
    } catch (error) {
        console.error('Error fetching recruiter interviews:', error);
        res.status(500).json({ message: 'Failed to fetch interviews.', error: error.message });
    }
};

// GET /api/interviews/job/:jobId  — company_admin sees all interviews for a job
export const getJobInterviews = async (req, res) => {
    try {
        const db = getDb();
        const jobId = new ObjectId(req.params.jobId);

        const interviews = await db.collection('interviews')
            .find({ jobId, status: { $ne: 'cancelled' } })
            .sort({ scheduledAt: 1 })
            .toArray();

        const enriched = await Promise.all(interviews.map(async (iv) => {
            const [candidate, recruiterDoc] = await Promise.all([
                iv.candidateId
                    ? db.collection('users').findOne(
                        { _id: new ObjectId(iv.candidateId) },
                        { projection: { name: 1, email: 1 } }
                    )
                    : null,
                iv.recruiterId
                    ? db.collection('recruiters').findOne({ _id: new ObjectId(iv.recruiterId) })
                    : null
            ]);

            let recruiterName = '';
            if (recruiterDoc?.userId) {
                const rUser = await db.collection('users').findOne(
                    { _id: new ObjectId(recruiterDoc.userId) },
                    { projection: { name: 1 } }
                );
                recruiterName = rUser?.name || '';
            }

            return { ...iv, candidateName: candidate?.name || '', candidateEmail: candidate?.email || '', recruiterName };
        }));

        res.status(200).json(enriched);
    } catch (error) {
        console.error('Error fetching job interviews:', error);
        res.status(500).json({ message: 'Failed to fetch interviews.', error: error.message });
    }
};
