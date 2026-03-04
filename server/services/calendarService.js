import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
];

const REFRESH_LEEWAY_MS = 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildOAuth2Client = () => new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

const toTokenObject = (tokens = {}) => {
    if (!tokens) return null;
    return {
        access_token: tokens.access_token || null,
        refresh_token: tokens.refresh_token || null,
        scope: tokens.scope || null,
        token_type: tokens.token_type || 'Bearer',
        expiry_date: tokens.expiry_date || null
    };
};

const tokensNeedRefresh = (tokens) => {
    if (!tokens?.refresh_token) return false;
    if (!tokens?.access_token) return true;
    if (!tokens?.expiry_date) return false;
    return Number(tokens.expiry_date) <= Date.now() + REFRESH_LEEWAY_MS;
};

const withGoogleErrorMessage = (error) => {
    const apiMsg =
        error?.response?.data?.error?.message ||
        error?.errors?.[0]?.message ||
        error?.message ||
        'Unknown Google Calendar error';

    if (/calendar-json\.googleapis\.com|api has not been used|it is disabled/i.test(apiMsg)) {
        throw new Error(
            `GOOGLE_CALENDAR_API_DISABLED: ${apiMsg}`
        );
    }

    if (/access_denied|unauthorized|insufficient/i.test(apiMsg)) {
        throw new Error(
            `${apiMsg}. If OAuth app is in Testing mode, add this account under Google Cloud Console -> OAuth consent screen -> Test users.`
        );
    }
    throw new Error(apiMsg);
};

const getCalendarClient = async (tokens, onRefreshedTokens) => {
    const oauth2Client = buildOAuth2Client();
    oauth2Client.setCredentials(toTokenObject(tokens));

    if (tokensNeedRefresh(tokens)) {
        try {
            const refreshed = await oauth2Client.refreshAccessToken();
            const newCreds = toTokenObject({
                ...tokens,
                ...refreshed.credentials,
                refresh_token: refreshed?.credentials?.refresh_token || tokens.refresh_token
            });
            oauth2Client.setCredentials(newCreds);
            if (typeof onRefreshedTokens === 'function') {
                await onRefreshedTokens(newCreds);
            }
        } catch (error) {
            withGoogleErrorMessage(error);
        }
    }

    return google.calendar({ version: 'v3', auth: oauth2Client });
};

export const extractMeetLink = (eventData) => {
    if (!eventData) return null;
    const videoUri = eventData?.conferenceData?.entryPoints?.find(
        (entry) => entry.entryPointType === 'video'
    )?.uri;
    return videoUri || eventData?.hangoutLink || null;
};

export const getAuthUrl = (state) => {
    const oauth2Client = buildOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
        state
    });
};

export const getTokensFromCode = async (code) => {
    try {
        const oauth2Client = buildOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        return toTokenObject(tokens);
    } catch (error) {
        withGoogleErrorMessage(error);
    }
};

export const refreshGoogleTokens = async (tokens) => {
    if (!tokens?.refresh_token) return toTokenObject(tokens);
    const oauth2Client = buildOAuth2Client();
    oauth2Client.setCredentials(toTokenObject(tokens));
    try {
        const refreshed = await oauth2Client.refreshAccessToken();
        return toTokenObject({
            ...tokens,
            ...refreshed.credentials,
            refresh_token: refreshed?.credentials?.refresh_token || tokens.refresh_token
        });
    } catch (error) {
        withGoogleErrorMessage(error);
    }
};

export const getCalendarBusyTimes = async (tokens, timeMin, timeMax, onRefreshedTokens) => {
    try {
        const calendar = await getCalendarClient(tokens, onRefreshedTokens);
        const response = await calendar.freebusy.query({
            requestBody: {
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                items: [{ id: 'primary' }]
            }
        });
        const busyTimes = response?.data?.calendars?.primary?.busy || [];
        return busyTimes.map((slot) => ({
            start: new Date(slot.start),
            end: new Date(slot.end)
        }));
    } catch (error) {
        withGoogleErrorMessage(error);
    }
};

export const createCalendarEvent = async (tokens, eventDetails, onRefreshedTokens) => {
    try {
        const calendar = await getCalendarClient(tokens, onRefreshedTokens);

        const requestBody = {
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
            attendees: (eventDetails.attendees || []).filter(Boolean).map((email) => ({ email })),
            conferenceData: {
                createRequest: {
                    requestId: uuidv4(),
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 60 },
                    { method: 'popup', minutes: 10 }
                ]
            }
        };

        const inserted = await calendar.events.insert({
            calendarId: 'primary',
            conferenceDataVersion: 1,
            sendUpdates: 'all',
            requestBody
        });

        let eventData = inserted.data;
        let meetingLink = extractMeetLink(eventData);

        // Conference entry points may arrive asynchronously.
        if (!meetingLink && eventData?.id) {
            for (let attempt = 0; attempt < 4; attempt++) {
                await sleep(750);
                const latest = await calendar.events.get({
                    calendarId: 'primary',
                    eventId: eventData.id
                });
                eventData = latest.data;
                meetingLink = extractMeetLink(eventData);
                if (meetingLink) break;
            }
        }

        if (!meetingLink) {
            throw new Error('Google Calendar event created but Meet link was not generated');
        }

        return {
            eventId: eventData.id,
            meetingLink,
            htmlLink: eventData.htmlLink
        };
    } catch (error) {
        withGoogleErrorMessage(error);
    }
};

export const updateCalendarEvent = async (tokens, eventId, updates, onRefreshedTokens) => {
    try {
        const calendar = await getCalendarClient(tokens, onRefreshedTokens);
        const response = await calendar.events.patch({
            calendarId: 'primary',
            eventId,
            sendUpdates: 'all',
            requestBody: updates
        });
        return response.data;
    } catch (error) {
        withGoogleErrorMessage(error);
    }
};

export const deleteCalendarEvent = async (tokens, eventId, onRefreshedTokens) => {
    try {
        const calendar = await getCalendarClient(tokens, onRefreshedTokens);
        await calendar.events.delete({
            calendarId: 'primary',
            eventId,
            sendUpdates: 'all'
        });
        return { success: true };
    } catch (error) {
        withGoogleErrorMessage(error);
    }
};

export const findCommonAvailableSlots = async (
    candidateTokens,
    recruiterTokens,
    candidateWorkingHours,
    recruiterWorkingHours,
    duration = 60,
    daysAhead = 7
) => {
    const now = new Date();
    const timeMin = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const timeMax = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const [candidateBusy, recruiterBusy] = await Promise.all([
        getCalendarBusyTimes(candidateTokens, timeMin, timeMax),
        getCalendarBusyTimes(recruiterTokens, timeMin, timeMax)
    ]);

    const allBusy = [...candidateBusy, ...recruiterBusy];
    const currentDate = new Date(timeMin);
    const availableSlots = [];

    while (currentDate < timeMax) {
        const dayName = currentDate
            .toLocaleDateString('en-US', { weekday: 'long' })
            .toLowerCase();
        const cHours = candidateWorkingHours?.[dayName];
        const rHours = recruiterWorkingHours?.[dayName];

        if (cHours?.enabled && rHours?.enabled) {
            const startHour = Math.max(
                Number(cHours.start.split(':')[0]),
                Number(rHours.start.split(':')[0])
            );
            const endHour = Math.min(
                Number(cHours.end.split(':')[0]),
                Number(rHours.end.split(':')[0])
            );

            for (let hour = startHour; hour < endHour; hour++) {
                const start = new Date(currentDate);
                start.setHours(hour, 0, 0, 0);
                const end = new Date(start.getTime() + duration * 60000);
                if (start <= now) continue;

                const conflict = allBusy.some((busy) => start < busy.end && end > busy.start);
                if (!conflict) availableSlots.push({ start, end });
            }
        }

        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(0, 0, 0, 0);
    }

    return availableSlots.slice(0, 10);
};

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
    refreshGoogleTokens,
    getCalendarBusyTimes,
    findCommonAvailableSlots,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    extractMeetLink,
    getDefaultWorkingHours
};
