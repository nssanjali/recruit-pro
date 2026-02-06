import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

// Initialize OAuth2 client
const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
};

// Generate auth URL for user to connect their Google Calendar
export const getAuthUrl = () => {
    const oauth2Client = getOAuth2Client();
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
    });
};

// Exchange authorization code for tokens
export const getTokensFromCode = async (code) => {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
};

// Set credentials for OAuth2 client
const setCredentials = (oauth2Client, tokens) => {
    oauth2Client.setCredentials(tokens);
    return oauth2Client;
};

// Get calendar instance
const getCalendar = (tokens) => {
    const oauth2Client = getOAuth2Client();
    setCredentials(oauth2Client, tokens);
    return google.calendar({ version: 'v3', auth: oauth2Client });
};

// Get user's busy times from Google Calendar
export const getCalendarBusyTimes = async (tokens, timeMin, timeMax) => {
    try {
        const calendar = getCalendar(tokens);

        const response = await calendar.freebusy.query({
            requestBody: {
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                items: [{ id: 'primary' }]
            }
        });

        const busyTimes = response.data.calendars.primary.busy || [];
        return busyTimes.map(slot => ({
            start: new Date(slot.start),
            end: new Date(slot.end)
        }));
    } catch (error) {
        console.error('Error fetching busy times:', error);
        throw error;
    }
};

// Find available time slots between two users
export const findCommonAvailableSlots = async (
    candidateTokens,
    recruiterTokens,
    candidateWorkingHours,
    recruiterWorkingHours,
    duration = 60, // minutes
    daysAhead = 7
) => {
    try {
        const now = new Date();
        const timeMin = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Start from tomorrow
        const timeMax = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

        // Get busy times for both users
        const candidateBusy = await getCalendarBusyTimes(candidateTokens, timeMin, timeMax);
        const recruiterBusy = await getCalendarBusyTimes(recruiterTokens, timeMin, timeMax);

        // Combine all busy times
        const allBusyTimes = [...candidateBusy, ...recruiterBusy];

        // Generate potential time slots based on working hours
        const availableSlots = [];
        const currentDate = new Date(timeMin);

        while (currentDate < timeMax) {
            const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
            const candidateHours = candidateWorkingHours[dayName];
            const recruiterHours = recruiterWorkingHours[dayName];

            // Check if both are available on this day
            if (candidateHours?.enabled && recruiterHours?.enabled) {
                // Find overlapping working hours
                const startHour = Math.max(
                    parseInt(candidateHours.start.split(':')[0]),
                    parseInt(recruiterHours.start.split(':')[0])
                );
                const endHour = Math.min(
                    parseInt(candidateHours.end.split(':')[0]),
                    parseInt(recruiterHours.end.split(':')[0])
                );

                // Generate slots for this day
                for (let hour = startHour; hour < endHour; hour++) {
                    const slotStart = new Date(currentDate);
                    slotStart.setHours(hour, 0, 0, 0);
                    const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

                    // Check if slot is in the future
                    if (slotStart <= now) continue;

                    // Check if slot conflicts with any busy time
                    const hasConflict = allBusyTimes.some(busy => {
                        return (slotStart < busy.end && slotEnd > busy.start);
                    });

                    if (!hasConflict) {
                        availableSlots.push({
                            start: slotStart,
                            end: slotEnd
                        });
                    }
                }
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(0, 0, 0, 0);
        }

        return availableSlots.slice(0, 10); // Return top 10 slots
    } catch (error) {
        console.error('Error finding available slots:', error);
        throw error;
    }
};

// Create calendar event with Google Meet link
export const createCalendarEvent = async (tokens, eventDetails) => {
    try {
        const calendar = getCalendar(tokens);

        const event = {
            summary: eventDetails.summary,
            description: eventDetails.description,
            start: {
                dateTime: eventDetails.start.toISOString(),
                timeZone: eventDetails.timeZone || 'Asia/Kolkata'
            },
            end: {
                dateTime: eventDetails.end.toISOString(),
                timeZone: eventDetails.timeZone || 'Asia/Kolkata'
            },
            attendees: eventDetails.attendees.map(email => ({ email })),
            conferenceData: {
                createRequest: {
                    requestId: uuidv4(),
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, // 24 hours before
                    { method: 'popup', minutes: 60 }, // 1 hour before
                    { method: 'popup', minutes: 10 } // 10 minutes before
                ]
            }
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            conferenceDataVersion: 1,
            sendUpdates: 'all', // Send invites to all attendees
            requestBody: event
        });

        return {
            eventId: response.data.id,
            meetingLink: response.data.hangoutLink,
            htmlLink: response.data.htmlLink
        };
    } catch (error) {
        console.error('Error creating calendar event:', error);
        throw error;
    }
};

// Update calendar event
export const updateCalendarEvent = async (tokens, eventId, updates) => {
    try {
        const calendar = getCalendar(tokens);

        const response = await calendar.events.patch({
            calendarId: 'primary',
            eventId: eventId,
            sendUpdates: 'all',
            requestBody: updates
        });

        return response.data;
    } catch (error) {
        console.error('Error updating calendar event:', error);
        throw error;
    }
};

// Delete calendar event
export const deleteCalendarEvent = async (tokens, eventId) => {
    try {
        const calendar = getCalendar(tokens);

        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
            sendUpdates: 'all'
        });

        return { success: true };
    } catch (error) {
        console.error('Error deleting calendar event:', error);
        throw error;
    }
};

// Get default working hours
export const getDefaultWorkingHours = () => ({
    monday: { start: '09:00', end: '17:00', enabled: true },
    tuesday: { start: '09:00', end: '17:00', enabled: true },
    wednesday: { start: '09:00', end: '17:00', enabled: true },
    thursday: { start: '09:00', end: '17:00', enabled: true },
    friday: { start: '09:00', end: '17:00', enabled: true },
    saturday: { start: '09:00', end: '17:00', enabled: false },
    sunday: { start: '09:00', end: '17:00', enabled: false }
});

export default {
    getAuthUrl,
    getTokensFromCode,
    getCalendarBusyTimes,
    findCommonAvailableSlots,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    getDefaultWorkingHours
};
