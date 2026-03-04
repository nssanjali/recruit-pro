import { v4 as uuidv4 } from 'uuid';
import Interview from '../models/Interview.js';
import Communication from '../models/Communication.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Recruiter from '../models/Recruiter.js';
import { sendEmail } from './emailService.js';
import { createCalendarEvent, getDefaultWorkingHours } from './calendarService.js';
import { getDb } from '../config/db.js';
import {
    normalizeObjectId,
    resolveGoogleTokensForUser,
    loadGcalBusy,
    distribute,
    findNextAvailableSlot,
    withRetry,
    persistRefreshedTokens
} from './schedulingHelpers.js';
import JobRecruiterMapping from '../models/JobRecruiterMapping.js';

const PROCESS_CHUNK_SIZE = 10;

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

    await sendEmail(candidate.email, 'interviewConfirmationCandidate', {
        candidateName: candidate.name,
        jobTitle: job.title,
        scheduledAt: scheduledAtLabel,
        duration: interview.duration || 120,
        recruiterName: recruiterUser.name,
        meetingLink: meetingLinkForEmail
    });

    await sendEmail(recruiterUser.email, 'interviewConfirmationRecruiter', {
        recruiterName: recruiterUser.name,
        candidateName: candidate.name,
        jobTitle: job.title,
        scheduledAt: scheduledAtLabel,
        duration: interview.duration || 120,
        meetingLink: meetingLinkForEmail,
        resumeLink: candidate.resume || '#'
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

    const candidateUser = await db.collection('users').findOne({ _id: application.candidateId });
    if (!candidateUser) throw new Error(`Candidate user not found: ${application.candidateId}`);

    const recruiterUser = recruiter.user || await db.collection('users').findOne({ _id: recruiter.userId });
    if (!recruiterUser) throw new Error(`Recruiter user not found: ${recruiter.userId}`);

    const slot = await findNextAvailableSlot({
        recruiter: {
            ...recruiter,
            workingHours: recruiter.workingHours || getDefaultWorkingHours()
        },
        gcalBusy: gcalBusyMap.get(recruiter._id.toString()) || []
    });

    if (!slot) {
        console.warn(`[scheduling] No slot found for candidate ${candidateUser.email}, recruiter ${recruiter._id}`);
        return { scheduled: false, reason: 'NO_SLOT' };
    }

    const recruiterTokenBundle = await resolveGoogleTokensForUser({
        userId: recruiterUser._id,
        role: 'recruiter',
        recruiterId: recruiter._id,
        explicitTokens: recruiter.googleTokens || null
    });

    const activeTokenBundle = recruiterTokenBundle || companyAdminTokenBundle || null;
    if (!activeTokenBundle?.tokens) {
        return { scheduled: false, reason: 'NO_GCAL_TOKEN' };
    }
    const { meetingLink, calendarEventId, calendarOwner } = await createInterviewCalendarEvent({
        tokenBundle: activeTokenBundle,
        recruiter,
        recruiterUser,
        candidateUser,
        job,
        slot
    });

    const interview = await Interview.create({
        applicationId: application._id,
        candidateId: application.candidateId,
        recruiterId: recruiter._id,
        jobId: job._id,
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
        ? await resolveGoogleTokensForUser({
            userId: companyAdmin._id,
            role: 'company_admin',
            explicitTokens: companyAdmin.googleTokens || null
        })
        : null;

    const gcalBusyMap = new Map();
    await Promise.all(recruiters.map(async (recruiter) => {
        const recruiterBundle = recruiter?.user?._id
            ? await resolveGoogleTokensForUser({
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

export default { bulkScheduleInterviews };
