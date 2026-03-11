/**
 * calendarController.js
 *
 * Handles calendar data endpoints for candidates, admins, and recruiters.
 * Uses internal calendar system (no Google Calendar sync).
 */

import Recruiter from '../models/Recruiter.js';

// ─── GET /api/calendar/data/candidate ────────────────────────────────────────
// Returns applications + interviews for the logged-in candidate as calendar events
export const getCandidateCalendarData = async (req, res) => {
    try {
        const { getDb } = await import('../config/db.js');
        const { ObjectId } = await import('mongodb');
        const db = await getDb();

        const userId = req.user._id;

        // 1. Applications submitted by this candidate
        const applications = await db.collection('applications')
            .find({ candidateId: userId }).toArray();

        // Enrich with job info
        const jobIds = [...new Set(applications.map(a => a.jobId).filter(Boolean))];
        const jobs = jobIds.length
            ? await db.collection('jobs').find({
                _id: { $in: jobIds.map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) }
            }).toArray()
            : [];
        const jobMap = Object.fromEntries(jobs.map(j => [j._id.toString(), j]));

        // 2. Interviews for this candidate
        const interviews = await db.collection('interviews')
            .find({ candidateId: userId }).toArray();

        const events = [];

        // Application events (all-day on submission date)
        for (const app of applications) {
            const job = jobMap[app.jobId?.toString()];
            events.push({
                id: `app-${app._id}`,
                type: 'application',
                title: job?.title || 'Application Submitted',
                company: job?.department || '',
                date: app.appliedAt || app.createdAt,
                allDay: true,
                status: app.status,
                detail: {
                    jobTitle: job?.title,
                    jobLocation: job?.location,
                    appStatus: app.status,
                    submittedAt: app.appliedAt || app.createdAt
                }
            });
        }

        // Interview events (timed)
        for (const iv of interviews) {
            const job = iv.jobId ? jobMap[iv.jobId?.toString()] : null;
            events.push({
                id: `iv-${iv._id}`,
                type: 'interview',
                title: `Interview – ${job?.title || iv.jobTitle || 'Role'}`,
                date: iv.scheduledAt,
                endDate: iv.endsAt,
                allDay: false,
                status: iv.status,
                detail: {
                    interviewId: iv._id,
                    jobTitle: job?.title || iv.jobTitle,
                    scheduledAt: iv.scheduledAt,
                    endsAt: iv.endsAt,
                    meetingLink: iv.meetingLink,
                    duration: iv.duration,
                    status: iv.status,
                    autoScheduled: iv.autoScheduled,
                    candidateRsvp: iv.candidateRsvp || null,
                    rescheduleRequest: iv.rescheduleRequest || null
                }
            });
        }

        res.json({ events });
    } catch (err) {
        console.error('[calendar/candidate]', err.message);
        res.status(500).json({ message: 'Failed to load candidate calendar', error: err.message });
    }
};

// ─── GET /api/calendar/data/admin ─────────────────────────────────────────────
// Returns job timeline + interviews for the logged-in company admin
export const getAdminCalendarData = async (req, res) => {
    try {
        const { getDb } = await import('../config/db.js');
        const { ObjectId } = await import('mongodb');
        const db = await getDb();

        const userId = req.user._id;

        // 1. Jobs posted by this admin
        const jobs = await db.collection('jobs')
            .find({ postedBy: userId }).toArray();

        const jobIds = jobs.map(j => j._id);

        // 2. All interviews for those jobs
        const interviews = jobIds.length
            ? await db.collection('interviews').find({
                jobId: { $in: jobIds }
            }).toArray()
            : [];

        // Enrich interviews with recruiter names
        const recruiterIds = [...new Set(interviews.map(iv => iv.recruiterId).filter(Boolean))];
        const recruiters = recruiterIds.length
            ? await db.collection('recruiters').find({
                _id: { $in: recruiterIds.map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) }
            }).toArray()
            : [];
        const recMap = Object.fromEntries(recruiters.map(r => [r._id.toString(), r]));

        const events = [];

        for (const job of jobs) {
            // Job posted event
            events.push({
                id: `job-posted-${job._id}`,
                type: 'job_posted',
                title: `📢 Posted: ${job.title}`,
                date: job.createdAt,
                allDay: true,
                detail: { jobTitle: job.title, location: job.location, department: job.department, status: job.status }
            });

            // Job cutoff event
            if (job.applicationCutoffDate) {
                events.push({
                    id: `job-cutoff-${job._id}`,
                    type: 'cutoff',
                    title: `⏰ Cutoff: ${job.title}`,
                    date: job.applicationCutoffDate,
                    allDay: true,
                    detail: {
                        jobTitle: job.title,
                        cutoff: job.applicationCutoffDate,
                        required: job.requiredApplications,
                        schedulingStatus: job.schedulingStatus
                    }
                });
            }
        }

        const jobTitleMap = Object.fromEntries(jobs.map(j => [j._id.toString(), j.title]));
        for (const iv of interviews) {
            const recruiter = recMap[iv.recruiterId?.toString()];
            events.push({
                id: `iv-${iv._id}`,
                type: 'interview',
                title: `${iv.candidateName || 'Interview'} — ${recruiter?.name || 'Recruiter'}`,
                date: iv.scheduledAt,
                endDate: iv.endsAt,
                allDay: false,
                status: iv.status,
                detail: {
                    candidateName: iv.candidateName,
                    recruiterName: recruiter?.name,
                    jobTitle: jobTitleMap[iv.jobId?.toString()] || iv.jobTitle,
                    scheduledAt: iv.scheduledAt,
                    endsAt: iv.endsAt,
                    meetingLink: iv.meetingLink,
                    status: iv.status,
                    candidateRsvp: iv.candidateRsvp || null,
                    rescheduleRequest: iv.rescheduleRequest || null
                }
            });
        }

        res.json({ events, stats: { totalJobs: jobs.length, totalInterviews: interviews.length } });
    } catch (err) {
        console.error('[calendar/admin]', err.message);
        res.status(500).json({ message: 'Failed to load admin calendar', error: err.message });
    }
};

// ─── GET /api/calendar/data/recruiter ───────────────────────────────────────
// Returns interviews, completed interviews, pending tasks, and job assignments for the logged-in recruiter
export const getRecruiterCalendarData = async (req, res) => {
    try {
        const { getDb } = await import('../config/db.js');
        const { ObjectId } = await import('mongodb');
        const db = await getDb();

        const userId = req.user._id;

        // 1. Get recruiter record
        const recruiter = await db.collection('recruiters')
            .findOne({ userId });

        if (!recruiter) {
            return res.json({ events: [], stats: { totalInterviews: 0, completedInterviews: 0, pendingTasks: 0, assignments: 0 } });
        }

        const recruiterId = recruiter._id;

        // 2. Get interviews assigned to this recruiter
        const interviews = await db.collection('interviews')
            .find({ recruiterId }).toArray();

        // 3. Get job assignments for this recruiter
        const assignments = await db.collection('recruiter_assignments')
            .find({ recruiterId }).toArray();

        // Get job details for assignments
        const jobIds = [
            ...new Set(interviews.map(iv => iv.jobId).filter(Boolean)),
            ...new Set(assignments.map(a => a.jobId).filter(Boolean))
        ];
        const jobs = jobIds.length
            ? await db.collection('jobs').find({
                _id: { $in: jobIds.map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) }
            }).toArray()
            : [];
        const jobMap = Object.fromEntries(jobs.map(j => [j._id.toString(), j]));

        const events = [];

        // Interview events (upcoming and past)
        for (const iv of interviews) {
            const job = iv.jobId ? jobMap[iv.jobId?.toString()] : null;
            const status = iv.status || 'scheduled';
            const isCompleted = status === 'completed';
            const rsvpAccepted = iv.candidateRsvp?.response === 'accepted';
            const titlePrefix = status === 'reschedule_requested'
                ? '↻'
                : isCompleted
                    ? '✓'
                    : rsvpAccepted
                        ? '✅'
                        : '📅';

            events.push({
                id: `iv-${iv._id}`,
                type: isCompleted ? 'completed' : 'interview',
                title: `${titlePrefix} ${iv.candidateName || 'Interview'} – ${job?.title || iv.jobTitle || 'Role'}`,
                date: iv.scheduledAt,
                endDate: iv.endsAt,
                allDay: false,
                status: status,
                detail: {
                    applicationId: iv.applicationId || null,
                    candidateName: iv.candidateName,
                    jobTitle: job?.title || iv.jobTitle,
                    scheduledAt: iv.scheduledAt,
                    endsAt: iv.endsAt,
                    meetingLink: iv.meetingLink,
                    duration: iv.duration,
                    status: status,
                    completedAt: iv.completedAt || iv.scheduledAt,
                    candidateRsvp: iv.candidateRsvp || null,
                    rescheduleRequest: iv.rescheduleRequest || null
                }
            });
        }

        // Job assignment events
        for (const assignment of assignments) {
            const job = jobMap[assignment.jobId?.toString()];
            const appCount = assignment.applicantCount || 0;

            events.push({
                id: `assign-${assignment._id}`,
                type: 'assignment',
                title: `📋 Assigned: ${job?.title || 'Job'}`,
                date: assignment.createdAt || new Date(),
                allDay: true,
                detail: {
                    jobTitle: job?.title,
                    assignedDate: assignment.createdAt,
                    applicantCount: appCount,
                    status: assignment.status || 'active'
                }
            });
        }

        // Calculate stats
        const totalInterviews = interviews.filter(iv => iv.status !== 'completed').length;
        const completedInterviews = interviews.filter(iv => iv.status === 'completed').length;
        const pendingTasks = 0; // Could expand this to check for pending follow-ups, feedback, etc.
        const assignmentsCount = assignments.length;

        res.json({
            events,
            stats: {
                totalInterviews,
                completedInterviews,
                pendingTasks,
                assignments: assignmentsCount
            }
        });
    } catch (err) {
        console.error('[calendar/recruiter]', err.message);
        res.status(500).json({ message: 'Failed to load recruiter calendar', error: err.message });
    }
};

export const getSettings = async (req, res) => {
    try {
        const { getDb } = await import('../config/db.js');
        const { getDefaultWorkingHours } = await import('../services/calendarService.js');
        const db = await getDb();
        const recruiter = await db.collection('recruiters').findOne({ userId: req.user._id });
        if (!recruiter) return res.status(404).json({ message: 'Recruiter not found' });

        res.json({
            workingHours: recruiter.workingHours || getDefaultWorkingHours(),
            maxInterviewsPerDay: recruiter.maxInterviewsPerDay ?? 4,
            interviewDuration: recruiter.interviewDuration ?? 120,
            bufferMinutes: recruiter.bufferMinutes ?? 15,
            googleConnected: !!recruiter.googleTokens
        });
    } catch (err) {
        res.status(500).json({ message: 'Error getting settings' });
    }
};

export const updateSettings = async (req, res) => {
    try {
        const { getDb } = await import('../config/db.js');
        const db = await getDb();
        const updates = req.body;
        // Don't update googleTokens this way
        delete updates.googleTokens;

        await db.collection('recruiters').updateOne(
            { userId: req.user._id },
            { $set: updates }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Error updating settings' });
    }
};

// Candidate availability settings for scheduling
export const getCandidateSettings = async (req, res) => {
    try {
        const { getDb } = await import('../config/db.js');
        const { getDefaultWorkingHours } = await import('../services/calendarService.js');
        const db = await getDb();

        const availability = await db.collection('calendarAvailability').findOne({ userId: req.user._id });

        res.json({
            workingHours: availability?.workingHours || getDefaultWorkingHours(),
            timezone: availability?.timezone || 'Asia/Kolkata',
            leaveDates: availability?.leaveDates || []
        });
    } catch (err) {
        res.status(500).json({ message: 'Error getting candidate settings' });
    }
};

export const updateCandidateSettings = async (req, res) => {
    try {
        const { getDb } = await import('../config/db.js');
        const db = await getDb();
        const updates = req.body || {};

        await db.collection('calendarAvailability').updateOne(
            { userId: req.user._id },
            {
                $set: {
                    workingHours: updates.workingHours,
                    timezone: updates.timezone || 'Asia/Kolkata',
                    leaveDates: Array.isArray(updates.leaveDates) ? updates.leaveDates : [],
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    userId: req.user._id,
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Error updating candidate settings' });
    }
};

export const authGoogleCalendar = async (req, res) => {
    try {
        const { getAuthUrl } = await import('../services/calendarService.js');
        // pass userId + role as state to support recruiter and company-admin callbacks
        const state = `${req.user._id.toString()}:${req.user.role || 'recruiter'}`;
        const url = getAuthUrl(state);
        res.json({ url });
    } catch (err) {
        res.status(500).json({ message: 'Error getting auth URL' });
    }
};

export const getGoogleCalendarStatus = async (req, res) => {
    try {
        const { getDb } = await import('../config/db.js');
        const db = await getDb();

        const userId = req.user._id;
        const role = req.user.role;

        let googleConnected = false;
        let connectedAt = null;
        let tokenExpiry = null;

        if (role === 'recruiter') {
            const recruiter = await db.collection('recruiters').findOne({ userId });
            googleConnected = !!recruiter?.googleTokens;
            tokenExpiry = recruiter?.googleTokens?.expiry_date || null;
        } else {
            const user = await db.collection('users').findOne({ _id: userId }, { projection: { googleTokens: 1, googleCalendarConnectedAt: 1 } });
            googleConnected = !!user?.googleTokens;
            connectedAt = user?.googleCalendarConnectedAt || null;
            tokenExpiry = user?.googleTokens?.expiry_date || null;
        }

        // Legacy fallback for older token storage
        if (!googleConnected) {
            const availability = await db.collection('calendarAvailability').findOne({ userId });
            if (availability?.googleAccessToken) {
                googleConnected = true;
                tokenExpiry = tokenExpiry || availability.googleTokenExpiry || null;
            }
        }

        res.json({
            role,
            googleConnected,
            connectedAt,
            tokenExpiry
        });
    } catch (err) {
        res.status(500).json({ message: 'Error getting calendar status' });
    }
};

export const googleCalendarCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code || !state) return res.status(400).send('Missing code or state');

        const { getTokensFromCode } = await import('../services/calendarService.js');
        const tokens = await getTokensFromCode(code);

        const { getDb } = await import('../config/db.js');
        const db = await getDb();
        const { ObjectId } = await import('mongodb');

        // Backward compatible parsing:
        // - old: "<userId>" (assume recruiter)
        // - new: "<userId>:<role>"
        const rawState = String(state);
        const [stateUserId, stateRole] = rawState.split(':');
        const userId = new ObjectId(stateUserId);
        const role = stateRole || 'recruiter';

        if (role === 'recruiter') {
            await db.collection('recruiters').updateOne(
                { userId },
                { $set: { googleTokens: tokens } }
            );
        } else {
            await db.collection('users').updateOne(
                { _id: userId },
                {
                    $set: {
                        googleTokens: tokens,
                        googleCalendarConnectedAt: new Date()
                    }
                }
            );
        }

        // Backward-compat sync for legacy availability-based schedulers.
        await db.collection('calendarAvailability').updateOne(
            { userId },
            {
                $set: {
                    userId,
                    googleAccessToken: tokens.access_token || null,
                    googleRefreshToken: tokens.refresh_token || null,
                    googleTokenExpiry: tokens.expiry_date || null,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date(),
                    workingHours: {
                        monday: { start: '09:00', end: '17:00', enabled: true },
                        tuesday: { start: '09:00', end: '17:00', enabled: true },
                        wednesday: { start: '09:00', end: '17:00', enabled: true },
                        thursday: { start: '09:00', end: '17:00', enabled: true },
                        friday: { start: '09:00', end: '17:00', enabled: true },
                        saturday: { start: '09:00', end: '17:00', enabled: false },
                        sunday: { start: '09:00', end: '17:00', enabled: false }
                    },
                    timezone: 'Asia/Kolkata'
                }
            },
            { upsert: true }
        );

        // redirect back to frontend by role
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        if (role === 'company_admin') {
            res.redirect(`${clientUrl}/company-admin?calendar_connected=true`);
        } else if (role === 'admin') {
            res.redirect(`${clientUrl}/admin?calendar_connected=true`);
        } else {
            res.redirect(`${clientUrl}/calendar?calendar_connected=true`);
        }
    } catch (err) {
        console.error('Google calendar callback error', err);
        res.status(500).send('Failed to connect Google Calendar');
    }
};
