import Communication from '../models/Communication.js';
import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Build a DB query that matches only comms addressed to this user */
const scopedQueryForUser = (user) => {
    const filters = [];
    if (user?._id) {
        try { filters.push({ recipientId: new ObjectId(user._id) }); } catch { /* ignore */ }
    }
    if (user?.email) filters.push({ recipient: user.email });
    if (filters.length === 0) return { _id: null };
    return filters.length === 1 ? filters[0] : { $or: filters };
};

const deriveStats = (communications = []) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
        emailsSent: communications.filter(
            (c) => c.type === 'email' && c.status === 'sent' && new Date(c.sentAt || c.createdAt) >= today
        ).length,
        scheduledReminders: communications.filter(
            (c) => c.type === 'reminder' && c.status === 'scheduled'
        ).length,
        calendarInvites: communications.filter(
            (c) => c.type === 'calendar' && c.status === 'sent'
        ).length,
        storedRecords: communications.length
    };
};

const deriveStoredCommunications = (communications = []) => {
    const grouped = new Map();
    communications.forEach((comm) => {
        const key = String(comm.relatedTo?.id || comm._id);
        const existing = grouped.get(key) || {
            candidate: comm.metadata?.candidateName || comm.recipient || 'Candidate',
            totalMessages: 0,
            lastContact: comm.sentAt || comm.createdAt || null,
            interviews: 0,
            status: 'Active'
        };
        existing.totalMessages += 1;
        const currentTime = new Date(existing.lastContact || 0).getTime();
        const nextTime = new Date(comm.sentAt || comm.createdAt || 0).getTime();
        if (nextTime > currentTime) existing.lastContact = comm.sentAt || comm.createdAt || existing.lastContact;
        if (comm.relatedTo?.type === 'interview') existing.interviews += 1;
        if (comm.metadata?.candidateName) existing.candidate = comm.metadata.candidateName;
        grouped.set(key, existing);
    });
    return Array.from(grouped.values()).sort(
        (a, b) => new Date(b.lastContact || 0) - new Date(a.lastContact || 0)
    );
};

const toOid = (id) => {
    try { return id instanceof ObjectId ? id : new ObjectId(id.toString()); } catch { return null; }
};

// ------------------------------------------------------------------
// GET /api/communications
// Candidates → only their "sent" messages (no drafts/failed/internal)
// Recruiters/Admins → all comms they are recipient of
// ------------------------------------------------------------------
export const getCommunications = async (req, res) => {
    try {
        const baseQuery = scopedQueryForUser(req.user);
        const query = req.user?.role === 'candidate'
            ? { ...baseQuery, status: 'sent' }
            : baseQuery;

        const communications = await Communication.find(query);
        const stats = deriveStats(communications);
        const storedCommunications = deriveStoredCommunications(communications);

        res.status(200).json({
            success: true,
            data: { communications, stats, storedCommunications }
        });
    } catch (error) {
        console.error('Error fetching communications:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// ------------------------------------------------------------------
// GET /api/communications/stats
// ------------------------------------------------------------------
export const getCommunicationStats = async (req, res) => {
    try {
        const baseQuery = scopedQueryForUser(req.user);
        const query = req.user?.role === 'candidate'
            ? { ...baseQuery, status: 'sent' }
            : baseQuery;
        const communications = await Communication.find(query);
        res.status(200).json({ success: true, data: deriveStats(communications) });
    } catch (error) {
        console.error('Error fetching communication stats:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// ------------------------------------------------------------------
// GET /api/communications/stored
// ------------------------------------------------------------------
export const getStoredCommunications = async (req, res) => {
    try {
        const baseQuery = scopedQueryForUser(req.user);
        const query = req.user?.role === 'candidate'
            ? { ...baseQuery, status: 'sent' }
            : baseQuery;
        const communications = await Communication.find(query);
        res.status(200).json({ success: true, data: deriveStoredCommunications(communications) });
    } catch (error) {
        console.error('Error fetching stored communications:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// ------------------------------------------------------------------
// GET /api/communications/my-interviews
// Candidate-facing: fetch their scheduled interviews + RSVP/reschedule status
// ------------------------------------------------------------------
export const getCandidateInterviews = async (req, res) => {
    try {
        const db = getDb();
        const candidateId = req.user._id;

        const interviews = await db.collection('interviews')
            .find({
                candidateId: toOid(candidateId),
                status: { $in: ['scheduled', 'rsvp_pending', 'reschedule_requested', 'completed', 'cancelled', 'no_show'] }
            })
            .sort({ scheduledAt: 1 })
            .toArray();

        const enriched = await Promise.all(interviews.map(async (iv) => {
            const job = iv.jobId
                ? await db.collection('jobs').findOne(
                    { _id: toOid(iv.jobId) },
                    { projection: { title: 1, company: 1 } }
                )
                : null;

            let recruiterName = '';
            if (iv.recruiterId) {
                const recruiterDoc = await db.collection('recruiters').findOne({ _id: toOid(iv.recruiterId) });
                if (recruiterDoc?.userId) {
                    const rUser = await db.collection('users').findOne(
                        { _id: toOid(recruiterDoc.userId) },
                        { projection: { name: 1 } }
                    );
                    recruiterName = rUser?.name || '';
                }
            }

            return {
                ...iv,
                jobTitle: job?.title || 'Interview',
                jobCompany: job?.company || '',
                recruiterName
            };
        }));

        res.status(200).json({ success: true, data: enriched });
    } catch (error) {
        console.error('Error fetching candidate interviews:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// ------------------------------------------------------------------
// POST /api/communications/interviews/:id/rsvp
// Candidate confirms or declines an interview invitation
// ------------------------------------------------------------------
export const candidateRsvpInterview = async (req, res) => {
    try {
        const db = getDb();
        const { response, message } = req.body; // response: 'accepted' | 'declined'
        const interviewId = req.params.id;

        if (!['accepted', 'declined'].includes(response)) {
            return res.status(400).json({ success: false, message: "Response must be 'accepted' or 'declined'" });
        }

        const interview = await db.collection('interviews').findOne({ _id: toOid(interviewId) });
        if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

        if (interview.candidateId?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // If declined → trigger reschedule flow
        const newStatus = response === 'declined' ? 'reschedule_requested' : interview.status;

        await db.collection('interviews').updateOne(
            { _id: toOid(interviewId) },
            {
                $set: {
                    candidateRsvp: {
                        response,
                        message: message?.trim() || '',
                        respondedAt: new Date()
                    },
                    status: newStatus,
                    updatedAt: new Date()
                }
            }
        );

        // Log a communication record visible back to the candidate
        await Communication.create({
            type: 'notification',
            subject: `Interview RSVP: ${response === 'accepted' ? '✓ Confirmed' : '✗ Unavailable'}`,
            recipient: req.user.email,
            recipientId: toOid(req.user._id),
            status: 'sent',
            sentAt: new Date(),
            automated: false,
            relatedTo: { type: 'interview', id: toOid(interviewId) },
            content: `You ${response === 'accepted' ? 'confirmed' : 'declined'} your interview.${message ? ` Your note: "${message}"` : ''}`,
            metadata: { candidateName: req.user.name }
        });

        // Notify recruiter with a communication record for both accepted/declined
        if (interview.recruiterId) {
            const recruiterDoc = await db.collection('recruiters').findOne({ _id: toOid(interview.recruiterId) });
            if (recruiterDoc?.userId) {
                const rUser = await db.collection('users').findOne({ _id: toOid(recruiterDoc.userId) });
                if (rUser) {
                    await Communication.create({
                        type: 'notification',
                        subject: response === 'accepted'
                            ? `✅ RSVP Confirmed: ${req.user.name} will attend`
                            : `⚠️ Reschedule Needed: ${req.user.name} is unavailable`,
                        recipient: rUser.email,
                        recipientId: toOid(rUser._id),
                        status: 'sent',
                        sentAt: new Date(),
                        automated: false,
                        relatedTo: { type: 'interview', id: toOid(interviewId) },
                        content: response === 'accepted'
                            ? `${req.user.name} acknowledged interview attendance.${message ? ` Note: "${message}"` : ''}`
                            : `${req.user.name} has declined the interview and requested a reschedule.${message ? ` Reason: "${message}"` : ''}`,
                        metadata: {
                            candidateName: req.user.name,
                            interviewId,
                            actionRequired: response === 'declined',
                            rsvpResponse: response
                        }
                    });
                }
            }
        }

        res.status(200).json({
            success: true,
            message: response === 'accepted'
                ? 'Interview confirmed!'
                : 'Interview declined. A reschedule request has been sent to the recruiter.',
            data: { response, newStatus }
        });
    } catch (error) {
        console.error('Error submitting RSVP:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// ------------------------------------------------------------------
// POST /api/communications/interviews/:id/reschedule-request
// Candidate explicitly requests a reschedule with optional proposed slots
// ------------------------------------------------------------------
export const candidateRescheduleRequest = async (req, res) => {
    try {
        const db = getDb();
        const { reason, proposedSlots } = req.body;
        const interviewId = req.params.id;

        const interview = await db.collection('interviews').findOne({ _id: toOid(interviewId) });
        if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

        if (interview.candidateId?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await db.collection('interviews').updateOne(
            { _id: toOid(interviewId) },
            {
                $set: {
                    status: 'reschedule_requested',
                    rescheduleRequest: {
                        requestedBy: 'candidate',
                        reason: reason?.trim() || '',
                        proposedSlots: (proposedSlots || []).map(s => new Date(s)),
                        requestedAt: new Date()
                    },
                    updatedAt: new Date()
                }
            }
        );

        // Notify recruiter
        if (interview.recruiterId) {
            const recruiterDoc = await db.collection('recruiters').findOne({ _id: toOid(interview.recruiterId) });
            if (recruiterDoc?.userId) {
                const rUser = await db.collection('users').findOne({ _id: toOid(recruiterDoc.userId) });
                if (rUser) {
                    await Communication.create({
                        type: 'notification',
                        subject: `📅 Reschedule Request from ${req.user.name}`,
                        recipient: rUser.email,
                        recipientId: toOid(rUser._id),
                        status: 'sent',
                        sentAt: new Date(),
                        automated: false,
                        relatedTo: { type: 'interview', id: toOid(interviewId) },
                        content: `${req.user.name} has requested to reschedule. Reason: ${reason || 'Not specified'}. Proposed slots: ${(proposedSlots || []).join(', ') || 'None provided'}`,
                        metadata: { candidateName: req.user.name, interviewId, proposedSlots: proposedSlots || [], actionRequired: true }
                    });
                }
            }
        }

        res.status(200).json({
            success: true,
            message: 'Reschedule request sent to recruiter',
            data: { interviewId, reason, proposedSlots }
        });
    } catch (error) {
        console.error('Error requesting reschedule:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// ------------------------------------------------------------------
// GET /api/communications/reschedule-requests
// Recruiter/Admin: see interviews pending a reschedule from candidates
// ------------------------------------------------------------------
export const getRescheduleRequests = async (req, res) => {
    try {
        const db = getDb();
        let matchQuery = { status: 'reschedule_requested' };

        if (req.user.role === 'recruiter') {
            const recruiterDoc = await db.collection('recruiters').findOne({ userId: toOid(req.user._id) });
            if (!recruiterDoc) return res.status(200).json({ success: true, data: [] });
            matchQuery.recruiterId = recruiterDoc._id;
        }

        const interviews = await db.collection('interviews')
            .find(matchQuery)
            .sort({ updatedAt: -1 })
            .toArray();

        const enriched = await Promise.all(interviews.map(async (iv) => {
            const candidate = iv.candidateId
                ? await db.collection('users').findOne({ _id: toOid(iv.candidateId) }, { projection: { name: 1, email: 1 } })
                : null;
            const job = iv.jobId
                ? await db.collection('jobs').findOne({ _id: toOid(iv.jobId) }, { projection: { title: 1 } })
                : null;

            return {
                ...iv,
                candidateName: candidate?.name || 'Candidate',
                candidateEmail: candidate?.email || '',
                jobTitle: job?.title || 'Interview'
            };
        }));

        res.status(200).json({ success: true, data: enriched });
    } catch (error) {
        console.error('Error fetching reschedule requests:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// ------------------------------------------------------------------
// POST /api/communications/interviews/:id/confirm-reschedule
// Recruiter confirms the new interview time and notifies candidate
// ------------------------------------------------------------------
export const recruiterConfirmReschedule = async (req, res) => {
    try {
        const db = getDb();
        const { newScheduledAt, newMeetingLink, note } = req.body;
        const interviewId = req.params.id;

        if (!newScheduledAt) {
            return res.status(400).json({ success: false, message: 'New scheduled time is required' });
        }

        const interview = await db.collection('interviews').findOne({ _id: toOid(interviewId) });
        if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

        const newStart = new Date(newScheduledAt);
        if (Number.isNaN(newStart.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid rescheduled interview time' });
        }
        const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);

        // Prevent overlapping interviews for same recruiter or candidate.
        const overlapQuery = {
            _id: { $ne: toOid(interviewId) },
            status: { $in: ['scheduled', 'in_progress'] },
            scheduledAt: { $lt: newEnd },
            endsAt: { $gt: newStart }
        };

        const recruiterConflict = interview.recruiterId
            ? await db.collection('interviews').findOne({ ...overlapQuery, recruiterId: toOid(interview.recruiterId) })
            : null;
        if (recruiterConflict) {
            return res.status(409).json({
                success: false,
                message: 'Selected time conflicts with another recruiter interview. Choose a different slot.'
            });
        }

        const candidateConflict = interview.candidateId
            ? await db.collection('interviews').findOne({ ...overlapQuery, candidateId: toOid(interview.candidateId) })
            : null;
        if (candidateConflict) {
            return res.status(409).json({
                success: false,
                message: 'Candidate already has another interview in this time range. Choose a different slot.'
            });
        }

        await db.collection('interviews').updateOne(
            { _id: toOid(interviewId) },
            {
                $set: {
                    scheduledAt: newStart,
                    endsAt: newEnd,
                    ...(newMeetingLink ? { meetingLink: newMeetingLink } : {}),
                    status: 'scheduled',
                    rescheduleConfirmed: {
                        confirmedBy: toOid(req.user._id),
                        confirmedAt: new Date(),
                        note: note?.trim() || ''
                    },
                    updatedAt: new Date()
                },
                $unset: { rescheduleRequest: '', candidateRsvp: '' }
            }
        );

        // Notify candidate of the new time
        if (interview.candidateId) {
            const candidate = await db.collection('users').findOne({ _id: toOid(interview.candidateId) });
            if (candidate) {
                const formattedTime = newStart.toLocaleString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
                });
                await Communication.create({
                    type: 'notification',
                    subject: `📅 Interview Rescheduled — ${formattedTime}`,
                    recipient: candidate.email,
                    recipientId: toOid(candidate._id),
                    status: 'sent',
                    sentAt: new Date(),
                    automated: false,
                    relatedTo: { type: 'interview', id: toOid(interviewId) },
                    content: `Your interview has been rescheduled to ${formattedTime}.${newMeetingLink ? ` New meeting link: ${newMeetingLink}` : ''}${note ? ` Recruiter note: ${note}` : ''}`,
                    metadata: {
                        candidateName: candidate.name,
                        newScheduledAt,
                        meetingLink: newMeetingLink || interview.meetingLink
                    }
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Interview rescheduled and candidate notified',
            data: { interviewId, newScheduledAt, newMeetingLink }
        });
    } catch (error) {
        console.error('Error confirming reschedule:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export default {
    getCommunications,
    getCommunicationStats,
    getStoredCommunications,
    getCandidateInterviews,
    candidateRsvpInterview,
    candidateRescheduleRequest,
    getRescheduleRequests,
    recruiterConfirmReschedule
};
