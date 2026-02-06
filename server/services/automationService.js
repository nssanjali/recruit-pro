import Application from '../models/Application.js';
import Interview from '../models/Interview.js';
import Communication from '../models/Communication.js';
import CalendarAvailability from '../models/CalendarAvailability.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import { sendEmail } from './emailService.js';
import {
    findCommonAvailableSlots,
    createCalendarEvent,
    getDefaultWorkingHours
} from './calendarService.js';

// Auto-schedule interview when application is approved
export const autoScheduleInterview = async (applicationId) => {
    try {
        console.log(`Starting auto-schedule for application: ${applicationId}`);

        // 1. Get application details
        const application = await Application.findById(applicationId);
        if (!application) {
            throw new Error('Application not found');
        }

        // 2. Get job and recruiter
        const job = await Job.findById(application.jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        // Get recruiter (job poster)
        const recruiter = await User.findById(job.postedBy);
        if (!recruiter) {
            throw new Error('Recruiter not found');
        }

        // Get candidate
        const candidate = await User.findById(application.candidateId);
        if (!candidate) {
            throw new Error('Candidate not found');
        }

        console.log(`Scheduling interview between ${candidate.name} and ${recruiter.name}`);

        // 3. Get calendar availability for both users
        let candidateAvailability = await CalendarAvailability.findByUserId(candidate._id);
        let recruiterAvailability = await CalendarAvailability.findByUserId(recruiter._id);

        // Create default availability if not exists
        if (!candidateAvailability) {
            candidateAvailability = {
                workingHours: getDefaultWorkingHours(),
                googleAccessToken: null,
                googleRefreshToken: null
            };
        }

        if (!recruiterAvailability) {
            recruiterAvailability = {
                workingHours: getDefaultWorkingHours(),
                googleAccessToken: null,
                googleRefreshToken: null
            };
        }

        // 4. Find available time slots
        let selectedSlot;

        // If both have Google Calendar connected, use smart scheduling
        if (candidateAvailability.googleAccessToken && recruiterAvailability.googleAccessToken) {
            const candidateTokens = {
                access_token: candidateAvailability.googleAccessToken,
                refresh_token: candidateAvailability.googleRefreshToken
            };

            const recruiterTokens = {
                access_token: recruiterAvailability.googleAccessToken,
                refresh_token: recruiterAvailability.googleRefreshToken
            };

            const availableSlots = await findCommonAvailableSlots(
                candidateTokens,
                recruiterTokens,
                candidateAvailability.workingHours,
                recruiterAvailability.workingHours,
                60, // 60 minutes duration
                7 // Look 7 days ahead
            );

            if (availableSlots.length === 0) {
                throw new Error('No available time slots found');
            }

            selectedSlot = availableSlots[0]; // Select the earliest slot
        } else {
            // Fallback: Schedule for next business day at 10 AM
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            // Skip weekends
            while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
                tomorrow.setDate(tomorrow.getDate() + 1);
            }

            selectedSlot = {
                start: tomorrow,
                end: new Date(tomorrow.getTime() + 60 * 60 * 1000) // 1 hour later
            };
        }

        console.log(`Selected time slot: ${selectedSlot.start}`);

        // 5. Create calendar event with Google Meet (if recruiter has calendar connected)
        let meetingLink = 'https://meet.google.com/'; // Default
        let calendarEventId = null;

        if (recruiterAvailability.googleAccessToken) {
            try {
                const recruiterTokens = {
                    access_token: recruiterAvailability.googleAccessToken,
                    refresh_token: recruiterAvailability.googleRefreshToken
                };

                const eventDetails = {
                    summary: `Interview - ${job.title} - ${candidate.name}`,
                    description: `Interview for ${job.title} position\n\nCandidate: ${candidate.name}\nEmail: ${candidate.email}`,
                    start: selectedSlot.start,
                    end: selectedSlot.end,
                    attendees: [candidate.email, recruiter.email],
                    timeZone: recruiterAvailability.timezone || 'Asia/Kolkata'
                };

                const calendarEvent = await createCalendarEvent(recruiterTokens, eventDetails);
                meetingLink = calendarEvent.meetingLink;
                calendarEventId = calendarEvent.eventId;

                console.log(`Calendar event created: ${calendarEventId}`);
            } catch (error) {
                console.error('Error creating calendar event:', error);
                // Continue with default meeting link
            }
        }

        // 6. Create interview record
        const interview = await Interview.create({
            applicationId: application._id,
            candidateId: candidate._id,
            recruiterId: recruiter._id,
            jobId: job._id,
            scheduledAt: selectedSlot.start,
            duration: 60,
            meetingLink: meetingLink,
            calendarEventId: calendarEventId,
            status: 'scheduled',
            autoScheduled: true,
            type: 'Technical Round',
            scheduledBy: 'AI'
        });

        console.log(`Interview created: ${interview._id}`);

        // 7. Send confirmation emails
        await sendInterviewConfirmation(interview, candidate, recruiter, job);

        // 8. Schedule reminder emails
        await scheduleReminders(interview, candidate, recruiter, job);

        // 9. Update application status
        await Application.findByIdAndUpdate(applicationId, {
            status: 'interview_scheduled'
        });

        console.log(`Auto-schedule completed for application: ${applicationId}`);

        return interview;
    } catch (error) {
        console.error('Error in auto-schedule:', error);
        throw error;
    }
};

// Send interview confirmation emails
const sendInterviewConfirmation = async (interview, candidate, recruiter, job) => {
    try {
        const scheduledAt = interview.scheduledAt.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
        });

        // Send to candidate
        const candidateEmailResult = await sendEmail(
            candidate.email,
            'interviewConfirmationCandidate',
            {
                candidateName: candidate.name,
                jobTitle: job.title,
                scheduledAt: scheduledAt,
                duration: interview.duration || 60,
                recruiterName: recruiter.name,
                meetingLink: interview.meetingLink
            }
        );

        // Log communication
        await Communication.create({
            type: 'email',
            subject: `Interview Scheduled - ${job.title}`,
            recipient: candidate.email,
            recipientId: candidate._id,
            status: candidateEmailResult.success ? 'sent' : 'failed',
            sentAt: new Date(),
            template: 'Interview Confirmation',
            automated: true,
            relatedTo: {
                type: 'interview',
                id: interview._id
            },
            content: `Your interview has been scheduled for ${scheduledAt}`
        });

        // Send to recruiter
        const recruiterEmailResult = await sendEmail(
            recruiter.email,
            'interviewConfirmationRecruiter',
            {
                recruiterName: recruiter.name,
                candidateName: candidate.name,
                jobTitle: job.title,
                scheduledAt: scheduledAt,
                duration: interview.duration || 60,
                meetingLink: interview.meetingLink,
                resumeLink: candidate.resume || '#'
            }
        );

        // Log communication
        await Communication.create({
            type: 'email',
            subject: `Interview Scheduled - ${candidate.name} for ${job.title}`,
            recipient: recruiter.email,
            recipientId: recruiter._id,
            status: recruiterEmailResult.success ? 'sent' : 'failed',
            sentAt: new Date(),
            template: 'Interview Confirmation',
            automated: true,
            relatedTo: {
                type: 'interview',
                id: interview._id
            },
            content: `Interview scheduled with ${candidate.name} for ${scheduledAt}`
        });

        console.log('Confirmation emails sent');
    } catch (error) {
        console.error('Error sending confirmation emails:', error);
    }
};

// Schedule reminder emails
const scheduleReminders = async (interview, candidate, recruiter, job) => {
    try {
        const interviewTime = new Date(interview.scheduledAt);

        // 24 hour reminder
        const reminder24h = new Date(interviewTime.getTime() - 24 * 60 * 60 * 1000);
        if (reminder24h > new Date()) {
            await Communication.create({
                type: 'reminder',
                subject: `Reminder: Interview Tomorrow - ${job.title}`,
                recipient: candidate.email,
                recipientId: candidate._id,
                status: 'scheduled',
                scheduledFor: reminder24h,
                template: 'Interview Reminder (24h)',
                automated: true,
                relatedTo: {
                    type: 'interview',
                    id: interview._id
                },
                content: `Reminder: Your interview is scheduled for tomorrow`,
                metadata: {
                    templateName: 'reminder24h',
                    data: {
                        name: candidate.name,
                        jobTitle: job.title,
                        scheduledAt: interviewTime.toLocaleString(),
                        meetingLink: interview.meetingLink
                    }
                }
            });

            await Communication.create({
                type: 'reminder',
                subject: `Reminder: Interview Tomorrow - ${candidate.name}`,
                recipient: recruiter.email,
                recipientId: recruiter._id,
                status: 'scheduled',
                scheduledFor: reminder24h,
                template: 'Interview Reminder (24h)',
                automated: true,
                relatedTo: {
                    type: 'interview',
                    id: interview._id
                },
                content: `Reminder: Interview with ${candidate.name} is scheduled for tomorrow`,
                metadata: {
                    templateName: 'reminder24h',
                    data: {
                        name: recruiter.name,
                        jobTitle: job.title,
                        scheduledAt: interviewTime.toLocaleString(),
                        meetingLink: interview.meetingLink
                    }
                }
            });
        }

        // 1 hour reminder
        const reminder1h = new Date(interviewTime.getTime() - 60 * 60 * 1000);
        if (reminder1h > new Date()) {
            await Communication.create({
                type: 'reminder',
                subject: `Interview Starting Soon - ${job.title}`,
                recipient: candidate.email,
                recipientId: candidate._id,
                status: 'scheduled',
                scheduledFor: reminder1h,
                template: 'Interview Reminder (1h)',
                automated: true,
                relatedTo: {
                    type: 'interview',
                    id: interview._id
                },
                content: `Your interview is starting in 1 hour`,
                metadata: {
                    templateName: 'reminder1h',
                    data: {
                        name: candidate.name,
                        jobTitle: job.title,
                        meetingLink: interview.meetingLink
                    }
                }
            });

            await Communication.create({
                type: 'reminder',
                subject: `Interview Starting Soon - ${candidate.name}`,
                recipient: recruiter.email,
                recipientId: recruiter._id,
                status: 'scheduled',
                scheduledFor: reminder1h,
                template: 'Interview Reminder (1h)',
                automated: true,
                relatedTo: {
                    type: 'interview',
                    id: interview._id
                },
                content: `Interview with ${candidate.name} is starting in 1 hour`,
                metadata: {
                    templateName: 'reminder1h',
                    data: {
                        name: recruiter.name,
                        jobTitle: job.title,
                        meetingLink: interview.meetingLink
                    }
                }
            });
        }

        console.log('Reminders scheduled');
    } catch (error) {
        console.error('Error scheduling reminders:', error);
    }
};

export default {
    autoScheduleInterview
};
