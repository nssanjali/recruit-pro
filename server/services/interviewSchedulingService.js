import { v4 as uuidv4 } from 'uuid';
import Interview from '../models/Interview.js';
import Communication from '../models/Communication.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Recruiter from '../models/Recruiter.js';
import { sendEmail } from './emailService.js';
import { createCalendarEvent, getCalendarBusyTimes, getDefaultWorkingHours } from './calendarService.js';
import { getDb } from '../config/db.js';
import {
    normalizeObjectId,
    resolveGoogleTokensForUser,
    loadGcalBusy,
    distribute,
    findNextAvailableSlot,
    hasDbConflict,
    withRetry,
    persistRefreshedTokens
} from './schedulingHelpers.js';
import JobRecruiterMapping from '../models/JobRecruiterMapping.js';

const PROCESS_CHUNK_SIZE = 10;

const parseMinutes = (value) => {
    if (!value || typeof value !== 'string' || !value.includes(':')) return null;
    const [h, m] = value.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
};

const getLocalSlotMeta = (date, timeZone = 'Asia/Kolkata') => {
    const parts = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone
    }).formatToParts(date);

    const weekday = (parts.find((p) => p.type === 'weekday')?.value || '').toLowerCase();
    const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0);
    return { weekday, minutesOfDay: hour * 60 + minute };
};

const isSlotWithinCandidateAvailability = (slotStart, slotEnd, availabilityDoc) => {
    const workingHours = availabilityDoc?.workingHours || getDefaultWorkingHours();
    const timeZone = availabilityDoc?.timezone || 'Asia/Kolkata';

    const startMeta = getLocalSlotMeta(slotStart, timeZone);
    const endMeta = getLocalSlotMeta(slotEnd, timeZone);
    if (!startMeta.weekday || startMeta.weekday !== endMeta.weekday) return false;

    const dayCfg = workingHours[startMeta.weekday];
    if (!dayCfg?.enabled) return false;

    const dayStart = parseMinutes(dayCfg.start);
    const dayEnd = parseMinutes(dayCfg.end);
    if (dayStart === null || dayEnd === null) return false;

    return startMeta.minutesOfDay >= dayStart && endMeta.minutesOfDay <= dayEnd;
};

const hasCandidateConflict = async ({ candidateId, slotStart, slotEnd, bufferMinutes = 0 }) => {
    const db = getDb();
    const cid = normalizeObjectId(candidateId);
    const bufferedStart = new Date(slotStart.getTime() - bufferMinutes * 60000);
    const bufferedEnd = new Date(slotEnd.getTime() + bufferMinutes * 60000);

    const conflict = await db.collection('interviews').findOne({
        candidateId: cid,
        status: { $in: ['scheduled', 'in_progress', 'reschedule_requested'] },
        scheduledAt: { $lt: bufferedEnd },
        endsAt: { $gt: bufferedStart }
    });

    return !!conflict;
};

const hasTimeOverlap = (startA, endA, startB, endB, bufferMinutes = 0) => {
    const bufferMs = bufferMinutes * 60000;
    const adjustedStartA = new Date(startA.getTime() - bufferMs);
    const adjustedEndA = new Date(endA.getTime() + bufferMs);
    return adjustedStartA < endB && adjustedEndA > startB;
};

const safeResolveGoogleTokensForUser = async (params) => {
    try {
        return await resolveGoogleTokensForUser(params);
    } catch (error) {
        console.warn(`[scheduling] Token resolution failed (${params?.role || 'unknown'}): ${error.message}`);
        return null;
    }
};

const loadEligibleApplications = async (jobId, limit) => {
    const db = getDb();
    const normalizedJobId = normalizeObjectId(jobId);

    return db.collection('applications')
        .find({
            jobId: normalizedJobId,
            status: { $in: ['shortlisted', 'reviewing', 'pending'] },
            interviewScheduled: { $ne: true }
        })
        .sort({ aiScore: -1 })
        .limit(limit)
        .toArray();
};

const createInterviewCalendarEvent = async ({
    tokenBundle,
    recruiter,
    recruiterUser,
    candidateUser,
    job,
    slot
}) => {
    if (!tokenBundle?.tokens) {
        throw new Error('NO_GCAL_TOKEN');
    }

    const calendarOwner = tokenBundle.ownerRole === 'recruiter' ? 'recruiter' : 'company_admin';
    const eventDetails = {
        summary: `Interview for ${job.title} - ${candidateUser.name}`,
        description: [
            'Interview scheduled via RecruitPro.',
            '',
            `Candidate: ${candidateUser.name} (${candidateUser.email})`,
            `Role: ${job.title}`
        ].join('\n'),
        start: slot.start,
        end: slot.end,
        timeZone: recruiter.timezone || 'Asia/Kolkata',
        attendees: [candidateUser.email, recruiterUser.email]
    };

    const gcalEvent = await withRetry(
        () => createCalendarEvent(
            tokenBundle.tokens,
            eventDetails,
            async (refreshedTokens) => {
                await persistRefreshedTokens({
                    userId: tokenBundle.ownerUserId,
                    role: tokenBundle.ownerRole,
                    recruiterId: tokenBundle.ownerRole === 'recruiter' ? recruiter._id : null,
                    tokens: refreshedTokens
                });
            }
        ),
        2,
        600,
        `createCalendarEvent:${candidateUser.email}`
    );

    return {
        meetingLink: gcalEvent.meetingLink,
        calendarEventId: gcalEvent.eventId,
        calendarOwner
    };
};

const queueReminderComms = async ({ interview, candidate, recruiterUser, jobTitle, scheduledAtLabel }) => {
    const now = Date.now();
    const interviewTime = new Date(interview.scheduledAt).getTime();

    const at24h = new Date(interviewTime - 24 * 60 * 60 * 1000);
    if (at24h.getTime() > now) {
        const payload = {
            name: candidate.name,
            recruiterName: recruiterUser.name,
            jobTitle,
            scheduledAt: scheduledAtLabel,
            meetingLink: interview.meetingLink
        };

        await Communication.create({
            type: 'reminder',
            recipient: candidate.email,
            recipientId: candidate._id,
            status: 'scheduled',
            scheduledFor: at24h,
            template: 'Interview Reminder (24h)',
            automated: true,
            relatedTo: { type: 'interview', id: interview._id },
            content: `24h reminder for interview on ${scheduledAtLabel}`,
            metadata: { templateName: 'reminder24h', data: payload }
        });

        await Communication.create({
            type: 'reminder',
            recipient: recruiterUser.email,
            recipientId: recruiterUser._id,
            status: 'scheduled',
            scheduledFor: at24h,
            template: 'Interview Reminder (24h)',
            automated: true,
            relatedTo: { type: 'interview', id: interview._id },
            content: `24h reminder: interview with ${candidate.name}`,
            metadata: { templateName: 'reminder24h', data: { ...payload, name: recruiterUser.name } }
        });
    }

    const at1h = new Date(interviewTime - 60 * 60 * 1000);
    if (at1h.getTime() > now) {
        const payload = {
            name: candidate.name,
            recruiterName: recruiterUser.name,
            jobTitle,
            meetingLink: interview.meetingLink
        };

        await Communication.create({
            type: 'reminder',
            recipient: candidate.email,
            recipientId: candidate._id,
            status: 'scheduled',
            scheduledFor: at1h,
            template: 'Interview Reminder (1h)',
            automated: true,
            relatedTo: { type: 'interview', id: interview._id },
            content: '1h reminder for interview',
            metadata: { templateName: 'reminder1h', data: payload }
        });

        await Communication.create({
            type: 'reminder',
            recipient: recruiterUser.email,
            recipientId: recruiterUser._id,
            status: 'scheduled',
            scheduledFor: at1h,
            template: 'Interview Reminder (1h)',
            automated: true,
            relatedTo: { type: 'interview', id: interview._id },
            content: `1h reminder: interview with ${candidate.name}`,
            metadata: { templateName: 'reminder1h', data: { ...payload, name: recruiterUser.name } }
        });
    }
};

const sendConfirmationAndComms = async ({ interview, candidate, recruiterUser, job }) => {
    const scheduledAtLabel = new Date(interview.scheduledAt).toLocaleString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: recruiterUser.timezone || 'Asia/Kolkata'
    });

    const meetingLinkForEmail = interview.meetingLink || 'Not available';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const acknowledgementLink = `${clientUrl}/candidate-calendar?interview=${interview._id}&action=acknowledge`;

    await sendEmail(candidate.email, 'interviewConfirmationCandidate', {
        candidateName: candidate.name,
        jobTitle: job.title,
        scheduledAt: scheduledAtLabel,
        duration: interview.duration || 120,
        recruiterName: recruiterUser.name,
        meetingLink: meetingLinkForEmail,
        acknowledgementLink
    });

    await sendEmail(recruiterUser.email, 'interviewConfirmationRecruiter', {
        recruiterName: recruiterUser.name,
        candidateName: candidate.name,
        jobTitle: job.title,
        scheduledAt: scheduledAtLabel,
        duration: interview.duration || 120,
        meetingLink: meetingLinkForEmail,
        resumeLink: `${clientUrl}/communication`
    });

    await Communication.create({
        type: 'email',
        subject: `Interview Scheduled - ${job.title}`,
        recipient: candidate.email,
        recipientId: candidate._id,
        status: 'sent',
        sentAt: new Date(),
        template: 'Interview Confirmation',
        automated: true,
        relatedTo: { type: 'interview', id: interview._id },
        content: `Interview scheduled for ${scheduledAtLabel}`
    });

    await Communication.create({
        type: 'email',
        subject: `Interview Scheduled - ${candidate.name}`,
        recipient: recruiterUser.email,
        recipientId: recruiterUser._id,
        status: 'sent',
        sentAt: new Date(),
        template: 'Interview Confirmation',
        automated: true,
        relatedTo: { type: 'interview', id: interview._id },
        content: `Interview with ${candidate.name} for ${job.title}`
    });

    if (job?.postedBy) {
        const companyAdmin = await User.findById(job.postedBy);
        if (companyAdmin) {
            await Communication.create({
                type: 'notification',
                subject: `Interview Scheduled: ${candidate.name} with ${recruiterUser.name}`,
                recipient: companyAdmin.email,
                recipientId: companyAdmin._id,
                status: 'sent',
                sentAt: new Date(),
                template: 'Company Admin Interview Notification',
                automated: true,
                relatedTo: { type: 'interview', id: interview._id },
                content: `Interview for ${job.title} scheduled. Candidate: ${candidate.name}. Recruiter: ${recruiterUser.name}. Time: ${scheduledAtLabel}.`,
                metadata: {
                    candidateName: candidate.name,
                    recruiterName: recruiterUser.name,
                    jobTitle: job.title,
                    scheduledAt: scheduledAtLabel
                }
            });
        }
    }

    await queueReminderComms({
        interview: { ...interview, meetingLink: meetingLinkForEmail },
        candidate,
        recruiterUser,
        jobTitle: job.title,
        scheduledAtLabel
    });
};

const processPair = async ({
    pair,
    job,
    batchId,
    gcalBusyMap,
    companyAdminTokenBundle
}) => {
    const db = getDb();
    const { candidate: application, recruiter } = pair;
    const normalizeMaybeObjectId = (value) => {
        if (!value) return null;
        try {
            return normalizeObjectId(value);
        } catch {
            return null;
        }
    };

    const candidateId = normalizeMaybeObjectId(application.candidateId);
    const recruiterUserId = normalizeMaybeObjectId(recruiter.userId || recruiter.user?._id);
    const jobId = normalizeMaybeObjectId(application.jobId || job._id);

    const candidateUser = candidateId
        ? await db.collection('users').findOne({ _id: candidateId })
        : null;
    if (!candidateUser) throw new Error(`Candidate user not found: ${application.candidateId}`);

    const recruiterUser = recruiter.user || (recruiterUserId
        ? await db.collection('users').findOne({ _id: recruiterUserId })
        : null);
    if (!recruiterUser) throw new Error(`Recruiter user not found: ${recruiter.userId}`);

    const candidateAvailability = candidateId
        ? await db.collection('calendarAvailability').findOne({ userId: candidateId })
        : null;
    const bufferMinutes = Number(recruiter.bufferMinutes ?? 15);

    // Candidate external calendar timeline (if connected) must also be free.
    let candidateGcalBusy = [];
    const candidateTokenBundle = candidateId
        ? await safeResolveGoogleTokensForUser({
            userId: candidateId,
            role: 'candidate'
        })
        : null;

    if (candidateTokenBundle?.tokens) {
        try {
            candidateGcalBusy = await getCalendarBusyTimes(
                candidateTokenBundle.tokens,
                new Date(),
                new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            );
        } catch (error) {
            console.warn(`[scheduling] Failed candidate busy load for ${candidateId}: ${error.message}`);
            candidateGcalBusy = [];
        }
    }

    const isSlotUsable = async (slotStart, slotEnd) => {
        if (!isSlotWithinCandidateAvailability(slotStart, slotEnd, candidateAvailability)) {
            return false;
        }

        const recruiterConflict = await hasDbConflict({
            recruiterId: recruiter._id,
            slotStart,
            slotEnd,
            bufferMinutes
        });
        if (recruiterConflict) return false;

        const candidateConflict = await hasCandidateConflict({
            candidateId,
            slotStart,
            slotEnd,
            bufferMinutes
        });
        if (candidateConflict) return false;

        const candidateExternalConflict = candidateGcalBusy.some((busy) =>
            hasTimeOverlap(slotStart, slotEnd, new Date(busy.start), new Date(busy.end), bufferMinutes)
        );
        if (candidateExternalConflict) return false;

        return true;
    };

    let slot = await findNextAvailableSlot({
        recruiter: {
            ...recruiter,
            workingHours: recruiter.workingHours || getDefaultWorkingHours()
        },
        gcalBusy: gcalBusyMap.get(recruiter._id.toString()) || []
    });

    if (slot && !(await isSlotUsable(slot.start, slot.end))) {
        slot = null;
    }

    if (!slot) {
        // Fallback: choose the earliest non-conflicting slot in next 7 days,
        // even if strict working-hour matching failed.
        const durationMinutes = Number(recruiter.interviewDuration ?? 120);
        const now = new Date();
        now.setMinutes(0, 0, 0);
        now.setHours(now.getHours() + 2);

        for (let i = 0; i < 7 * 10; i++) {
            const fallbackStart = new Date(now.getTime() + i * 60 * 60 * 1000);
            const fallbackEnd = new Date(fallbackStart.getTime() + durationMinutes * 60000);
            const usable = await isSlotUsable(fallbackStart, fallbackEnd);
            if (usable) {
                slot = { start: fallbackStart, end: fallbackEnd };
                break;
            }
        }
    }

    if (!slot) {
        console.warn(`[scheduling] No slot found for candidate ${candidateUser.email}, recruiter ${recruiter._id}`);
        return { scheduled: false, reason: 'NO_SLOT' };
    }

    const recruiterTokenBundle = await safeResolveGoogleTokensForUser({
        userId: recruiterUser._id,
        role: 'recruiter',
        recruiterId: recruiter._id,
        explicitTokens: recruiter.googleTokens || null
    });

    const activeTokenBundle = recruiterTokenBundle || companyAdminTokenBundle || null;
    let meetingLink = null;
    let calendarEventId = null;
    let calendarOwner = 'internal';

    if (activeTokenBundle?.tokens) {
        try {
            const gcalEvent = await createInterviewCalendarEvent({
                tokenBundle: activeTokenBundle,
                recruiter,
                recruiterUser,
                candidateUser,
                job,
                slot
            });
            meetingLink = gcalEvent.meetingLink;
            calendarEventId = gcalEvent.calendarEventId;
            calendarOwner = gcalEvent.calendarOwner;
        } catch (error) {
            console.warn(`[scheduling] Calendar event creation failed for recruiter ${recruiter._id}: ${error.message}`);
        }
    } else {
        console.warn(`[scheduling] Proceeding without Google Calendar token for recruiter ${recruiter._id}`);
    }

    const interview = await Interview.create({
        applicationId: application._id,
        candidateId: candidateId || application.candidateId,
        candidateName: candidateUser.name,
        candidateEmail: candidateUser.email,
        recruiterId: recruiter._id,
        jobId: jobId || job._id,
        jobTitle: job.title,
        scheduledAt: slot.start,
        endsAt: slot.end,
        duration: recruiter.interviewDuration ?? 120,
        meetingLink,
        calendarEventId,
        calendarOwner,
        status: 'scheduled',
        autoScheduled: true,
        batchId,
        type: 'Technical Round',
        scheduledBy: 'system'
    });

    await db.collection('applications').updateOne(
        { _id: application._id },
        {
            $set: {
                status: 'interview_scheduled',
                interviewScheduled: true,
                interviewId: interview._id,
                recruiterId: recruiter._id,
                movedToRecruiterAt: new Date(),
                updatedAt: new Date()
            }
        }
    );

    const existingMapping = await JobRecruiterMapping.findOne({
        jobId: job._id,
        recruiterId: recruiter._id,
        status: 'active'
    });
    if (!existingMapping) {
        await JobRecruiterMapping.create({
            jobId: job._id,
            recruiterId: recruiter._id,
            companyAdminId: job.postedBy,
            assignmentStrategy: 'interview_auto_schedule',
            status: 'active',
            matchScore: 0
        });
    }

    await db.collection('recruiters').updateOne(
        { _id: recruiter._id },
        { $inc: { pendingInterviews: 1 } }
    );

    await sendConfirmationAndComms({
        interview,
        candidate: candidateUser,
        recruiterUser,
        job
    });

    return { scheduled: true, interviewId: interview._id };
};

export const scheduleInterviewForApplication = async (applicationId, options = {}) => {
    const db = getDb();
    const appId = normalizeObjectId(applicationId);
    const preferredRecruiterUserId = options.preferredRecruiterUserId
        ? normalizeObjectId(options.preferredRecruiterUserId)
        : null;

    const application = await db.collection('applications').findOne({ _id: appId });
    if (!application) {
        throw new Error('Application not found');
    }

    const existingInterview = await db.collection('interviews').findOne({
        applicationId: appId,
        status: { $in: ['scheduled', 'in_progress', 'completed', 'no_show'] }
    });

    if (existingInterview) {
        return {
            scheduled: true,
            alreadyScheduled: true,
            interview: existingInterview,
            reason: 'ALREADY_SCHEDULED',
            diagnostics: {
                applicationId: String(appId),
                existingInterviewId: String(existingInterview._id)
            }
        };
    }

    const job = await Job.findById(application.jobId);
    if (!job) {
        throw new Error('Job not found');
    }

    const diagnostics = {
        applicationId: String(appId),
        jobId: String(job._id),
        preferredRecruiterUserId: preferredRecruiterUserId ? String(preferredRecruiterUserId) : null,
        recruiterPoolSource: 'companyAdminId',
        recruitersFound: 0,
        mappingCount: 0
    };

    let recruiters = await Recruiter.findWithUserDetails({
        companyAdminId: job.postedBy,
        status: 'active'
    });
    diagnostics.recruitersFound = recruiters.length;

    if (!recruiters.length && preferredRecruiterUserId) {
        const fallbackRecruiter = await db.collection('recruiters').findOne({
            userId: preferredRecruiterUserId,
            status: 'active'
        });
        if (fallbackRecruiter) {
            const fallbackUser = await db.collection('users').findOne({ _id: fallbackRecruiter.userId });
            recruiters = [{
                ...fallbackRecruiter,
                user: fallbackUser ? {
                    _id: fallbackUser._id,
                    name: fallbackUser.name,
                    email: fallbackUser.email,
                    phone: fallbackUser.phone,
                    avatar: fallbackUser.avatar
                } : null
            }];
            diagnostics.recruiterPoolSource = 'preferredRecruiterFallback';
            diagnostics.recruitersFound = recruiters.length;
        }
    }

    if (!recruiters.length) {
        const mapped = await JobRecruiterMapping.find({
            jobId: job._id,
            status: 'active'
        });
        diagnostics.mappingCount = mapped.length;
        if (mapped.length > 0) {
            const recruiterIds = mapped.map((m) => normalizeObjectId(m.recruiterId));
            const recruiterDocs = await db.collection('recruiters').find({
                _id: { $in: recruiterIds },
                status: 'active'
            }).toArray();
            const userIds = recruiterDocs.map((r) => normalizeObjectId(r.userId));
            const users = await db.collection('users').find({ _id: { $in: userIds } }).toArray();
            const userMap = new Map(users.map((u) => [String(u._id), u]));
            recruiters = recruiterDocs.map((r) => ({
                ...r,
                user: userMap.get(String(r.userId)) || null
            }));
            diagnostics.recruiterPoolSource = 'jobMappingFallback';
            diagnostics.recruitersFound = recruiters.length;
        }
    }

    if (!recruiters.length) {
        return { scheduled: false, reason: 'NO_RECRUITERS', diagnostics };
    }

    const mappings = await JobRecruiterMapping.find({
        jobId: job._id,
        status: 'active'
    });
    diagnostics.mappingCount = mappings.length;

    if (mappings.length > 0) {
        const mappedIds = new Set(mappings.map((m) => String(m.recruiterId)));
        const mappedRecruiters = recruiters.filter((r) => mappedIds.has(String(r._id)));
        if (mappedRecruiters.length > 0) {
            recruiters = mappedRecruiters;
            diagnostics.recruiterPoolSource = `${diagnostics.recruiterPoolSource}+filteredByMapping`;
            diagnostics.recruitersFound = recruiters.length;
        }
    }

    if (preferredRecruiterUserId) {
        const preferred = recruiters.find((r) => String(r.userId) === String(preferredRecruiterUserId));
        if (preferred) {
            recruiters = [preferred, ...recruiters.filter((r) => String(r._id) !== String(preferred._id))];
        }
    }

    const sortedRecruiters = [...recruiters].sort(
        (a, b) => Number(a.pendingInterviews || 0) - Number(b.pendingInterviews || 0)
    );
    const selectedRecruiter = sortedRecruiters[0];
    diagnostics.selectedRecruiterId = selectedRecruiter?._id ? String(selectedRecruiter._id) : null;
    diagnostics.selectedRecruiterUserId = selectedRecruiter?.userId ? String(selectedRecruiter.userId) : null;

    const companyAdmin = await db.collection('users').findOne({ _id: normalizeObjectId(job.postedBy) });
    const companyAdminTokenBundle = companyAdmin
        ? await safeResolveGoogleTokensForUser({
            userId: companyAdmin._id,
            role: 'company_admin',
            explicitTokens: companyAdmin.googleTokens || null
        })
        : null;

    const recruiterBundle = selectedRecruiter?.user?._id
        ? await safeResolveGoogleTokensForUser({
            userId: selectedRecruiter.user._id,
            role: 'recruiter',
            recruiterId: selectedRecruiter._id,
            explicitTokens: selectedRecruiter.googleTokens || null
        })
        : null;

    const { busy } = await loadGcalBusy({
        recruiter: selectedRecruiter,
        recruiterTokenBundle: recruiterBundle,
        companyAdminTokenBundle
    });
    const gcalBusyMap = new Map([[selectedRecruiter._id.toString(), busy]]);

    const result = await processPair({
        pair: { candidate: application, recruiter: selectedRecruiter },
        job,
        batchId: uuidv4(),
        gcalBusyMap,
        companyAdminTokenBundle
    });

    if (!result?.scheduled) {
        return {
            scheduled: false,
            reason: result?.reason || 'UNKNOWN',
            diagnostics
        };
    }

    const interview = await Interview.findById(result.interviewId);
    return {
        scheduled: true,
        alreadyScheduled: false,
        interview,
        diagnostics
    };
};

export const bulkScheduleInterviews = async (jobId) => {
    const batchId = uuidv4();
    const db = getDb();
    console.log(`[scheduling] Starting batch ${batchId} for job ${jobId}`);

    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    const limit = Number(job.requiredApplications || 999);
    const applications = await loadEligibleApplications(jobId, limit);
    if (applications.length === 0) {
        return { scheduled: 0, failed: 0, skipped: 0, batchId, message: 'No eligible candidates' };
    }

    const recruiters = await Recruiter.findWithUserDetails({
        companyAdminId: job.postedBy,
        status: 'active'
    });
    if (!recruiters.length) {
        return { scheduled: 0, failed: 0, skipped: applications.length, batchId, message: 'No active recruiters available' };
    }

    const companyAdmin = await db.collection('users').findOne({ _id: normalizeObjectId(job.postedBy) });
    const companyAdminTokenBundle = companyAdmin
        ? await safeResolveGoogleTokensForUser({
            userId: companyAdmin._id,
            role: 'company_admin',
            explicitTokens: companyAdmin.googleTokens || null
        })
        : null;

    const gcalBusyMap = new Map();
    await Promise.all(recruiters.map(async (recruiter) => {
        const recruiterBundle = recruiter?.user?._id
            ? await safeResolveGoogleTokensForUser({
                userId: recruiter.user._id,
                role: 'recruiter',
                recruiterId: recruiter._id,
                explicitTokens: recruiter.googleTokens || null
            })
            : null;

        const { busy } = await loadGcalBusy({
            recruiter,
            recruiterTokenBundle: recruiterBundle,
            companyAdminTokenBundle
        });
        gcalBusyMap.set(recruiter._id.toString(), busy);
    }));

    const pairs = distribute(applications, recruiters);
    let scheduled = 0;
    let failed = 0;
    let skipped = 0;
    const reasonCounts = {
        noSlot: 0,
        noGoogleToken: 0,
        apiDisabled: 0,
        calendarCreateError: 0,
        otherErrors: 0
    };

    for (let i = 0; i < pairs.length; i += PROCESS_CHUNK_SIZE) {
        const chunk = pairs.slice(i, i + PROCESS_CHUNK_SIZE);
        await new Promise((resolve) => setImmediate(resolve));

        const settled = await Promise.allSettled(chunk.map((pair) => processPair({
            pair,
            job,
            batchId,
            gcalBusyMap,
            companyAdminTokenBundle
        })));

        for (const result of settled) {
            if (result.status === 'fulfilled') {
                if (result.value?.scheduled) {
                    scheduled += 1;
                } else {
                    const reason = result.value?.reason;
                    if (reason === 'NO_SLOT') {
                        skipped += 1;
                        reasonCounts.noSlot += 1;
                    } else if (reason === 'NO_GCAL_TOKEN') {
                        failed += 1;
                        reasonCounts.noGoogleToken += 1;
                    } else {
                        failed += 1;
                        reasonCounts.otherErrors += 1;
                    }
                }
            } else {
                failed += 1;
                const message = result.reason?.message || String(result.reason || '');
                if (/GOOGLE_CALENDAR_API_DISABLED|api has not been used|it is disabled/i.test(message)) {
                    reasonCounts.apiDisabled += 1;
                } else if (/Google Calendar event created but Meet link was not generated|calendar|meet/i.test(message)) {
                    reasonCounts.calendarCreateError += 1;
                } else if (/NO_GCAL_TOKEN|OAuth|access_denied|unauthorized|insufficient/i.test(message)) {
                    reasonCounts.noGoogleToken += 1;
                } else {
                    reasonCounts.otherErrors += 1;
                }
                console.error('[scheduling] Pair failed:', message);
            }
        }
    }

    if (companyAdmin?.email) {
        await sendEmail(companyAdmin.email, 'schedulingBatchComplete', {
            adminName: companyAdmin.name || 'Admin',
            jobTitle: job.title,
            scheduled,
            failed,
            skipped,
            reasonCounts,
            batchId,
            completedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        }).catch((error) => {
            console.warn('[scheduling] Failed to send summary email:', error.message);
        });
    }

    console.log(`[scheduling] Batch ${batchId} complete: scheduled=${scheduled}, failed=${failed}, skipped=${skipped}, reasons=${JSON.stringify(reasonCounts)}`);
    return { scheduled, failed, skipped, reasonCounts, batchId };
};

export default { bulkScheduleInterviews, scheduleInterviewForApplication };
