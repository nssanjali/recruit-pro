import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { getCalendarBusyTimes, refreshGoogleTokens } from './calendarService.js';

const SLOT_STEP_MINUTES = 30;

const DATE_FORMATTER_CACHE = new Map();

const getFormatter = (timeZone, options) => {
    const key = `${timeZone}:${JSON.stringify(options)}`;
    if (!DATE_FORMATTER_CACHE.has(key)) {
        DATE_FORMATTER_CACHE.set(key, new Intl.DateTimeFormat('en-CA', { timeZone, ...options }));
    }
    return DATE_FORMATTER_CACHE.get(key);
};

export const normalizeObjectId = (value) => (
    typeof value === 'string' ? new ObjectId(value) : value
);

export const toLocalDateKey = (date, timeZone = 'Asia/Kolkata') => (
    getFormatter(timeZone, { year: 'numeric', month: '2-digit', day: '2-digit' })
        .format(date)
);

const getWeekdayName = (date, timeZone = 'Asia/Kolkata') => (
    getFormatter(timeZone, { weekday: 'long' }).format(date).toLowerCase()
);

const getTzOffsetMinutes = (date, timeZone = 'Asia/Kolkata') => {
    const parts = getFormatter(timeZone, { timeZoneName: 'longOffset' }).formatToParts(date);
    const token = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT+00:00';
    const match = token.match(/GMT([+-]\d{2}):?(\d{2})?/i);
    if (!match) return 0;
    const sign = match[1].startsWith('-') ? -1 : 1;
    const hours = Math.abs(parseInt(match[1], 10));
    const mins = parseInt(match[2] || '0', 10);
    return sign * (hours * 60 + mins);
};

const localDateParts = (date, timeZone) => {
    const str = toLocalDateKey(date, timeZone); // YYYY-MM-DD
    const [year, month, day] = str.split('-').map(Number);
    return { year, month, day };
};

const makeZonedDate = (baseDate, timeString, timeZone = 'Asia/Kolkata') => {
    const [hour, minute] = timeString.split(':').map(Number);
    const { year, month, day } = localDateParts(baseDate, timeZone);
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    const offsetMinutes = getTzOffsetMinutes(new Date(utcGuess), timeZone);
    return new Date(utcGuess - offsetMinutes * 60000);
};

const overlaps = (startA, endA, startB, endB, bufferMinutes = 0) => {
    const bufferMs = bufferMinutes * 60000;
    const adjustedStartA = new Date(startA.getTime() - bufferMs);
    const adjustedEndA = new Date(endA.getTime() + bufferMs);
    return adjustedStartA < endB && adjustedEndA > startB;
};

const shouldRetryGoogleOperation = (error) => {
    const code = error?.code || error?.response?.status;
    return [408, 409, 425, 429, 500, 502, 503, 504].includes(code);
};

export const withRetry = async (fn, retries = 2, delayMs = 500, context = 'operation') => {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt === retries || !shouldRetryGoogleOperation(error)) break;
            const waitMs = delayMs * Math.pow(2, attempt);
            console.warn(`[scheduling] retrying ${context} (attempt ${attempt + 2}/${retries + 1}) after ${waitMs}ms: ${error.message}`);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
    }
    throw lastError;
};

export const persistRefreshedTokens = async ({
    userId,
    role,
    recruiterId,
    tokens
}) => {
    const db = getDb();
    const normalizedUserId = normalizeObjectId(userId);
    const now = new Date();

    await db.collection('calendarAvailability').updateOne(
        { userId: normalizedUserId },
        {
            $set: {
                userId: normalizedUserId,
                googleAccessToken: tokens.access_token || null,
                googleRefreshToken: tokens.refresh_token || null,
                googleTokenExpiry: tokens.expiry_date || null,
                updatedAt: now
            },
            $setOnInsert: {
                createdAt: now
            }
        },
        { upsert: true }
    );

    if (role === 'recruiter' && recruiterId) {
        await db.collection('recruiters').updateOne(
            { _id: normalizeObjectId(recruiterId) },
            { $set: { googleTokens: tokens, updatedAt: now } }
        );
    } else {
        await db.collection('users').updateOne(
            { _id: normalizedUserId },
            { $set: { googleTokens: tokens, updatedAt: now } }
        );
    }
};

export const resolveGoogleTokensForUser = async ({
    userId,
    role = 'user',
    recruiterId = null,
    explicitTokens = null
}) => {
    if (!userId) return null;

    const db = getDb();
    const normalizedUserId = normalizeObjectId(userId);

    let source = 'none';
    let tokens = explicitTokens || null;

    if (!tokens && role === 'recruiter' && recruiterId) {
        const recruiter = await db.collection('recruiters').findOne(
            { _id: normalizeObjectId(recruiterId) },
            { projection: { googleTokens: 1 } }
        );
        if (recruiter?.googleTokens) {
            tokens = recruiter.googleTokens;
            source = 'recruiter.googleTokens';
        }
    }

    if (!tokens) {
        const user = await db.collection('users').findOne(
            { _id: normalizedUserId },
            { projection: { googleTokens: 1 } }
        );
        if (user?.googleTokens) {
            tokens = user.googleTokens;
            source = 'users.googleTokens';
        }
    }

    if (!tokens) {
        const availability = await db.collection('calendarAvailability').findOne(
            { userId: normalizedUserId },
            { projection: { googleAccessToken: 1, googleRefreshToken: 1, googleTokenExpiry: 1 } }
        );
        if (availability?.googleAccessToken || availability?.googleRefreshToken) {
            tokens = {
                access_token: availability.googleAccessToken || null,
                refresh_token: availability.googleRefreshToken || null,
                expiry_date: availability.googleTokenExpiry || null
            };
            source = 'calendarAvailability';
        }
    }

    if (!tokens) return null;

    const refreshed = await refreshGoogleTokens(tokens);
    const accessChanged = refreshed?.access_token && refreshed.access_token !== tokens.access_token;
    const expiryChanged = refreshed?.expiry_date && refreshed.expiry_date !== tokens.expiry_date;
    if (accessChanged || expiryChanged) {
        await persistRefreshedTokens({
            userId: normalizedUserId,
            role,
            recruiterId,
            tokens: refreshed
        });
    }

    return {
        tokens: refreshed,
        source,
        ownerRole: role,
        ownerUserId: normalizedUserId
    };
};

export const hasDbConflict = async ({
    recruiterId,
    slotStart,
    slotEnd,
    bufferMinutes = 0
}) => {
    const db = getDb();
    const rid = normalizeObjectId(recruiterId);
    const bufferedStart = new Date(slotStart.getTime() - bufferMinutes * 60000);
    const bufferedEnd = new Date(slotEnd.getTime() + bufferMinutes * 60000);

    const conflict = await db.collection('interviews').findOne({
        recruiterId: rid,
        status: { $in: ['scheduled', 'in_progress'] },
        scheduledAt: { $lt: bufferedEnd },
        endsAt: { $gt: bufferedStart }
    });

    return !!conflict;
};

export const findNextAvailableSlot = async ({
    recruiter,
    gcalBusy = [],
    daysAhead = 14
}) => {
    const now = new Date();
    const timeZone = recruiter.timezone || 'Asia/Kolkata';
    const durationMinutes = Number(recruiter.interviewDuration ?? 120);
    const bufferMinutes = Number(recruiter.bufferMinutes ?? 15);
    const maxPerDay = Number(recruiter.maxInterviewsPerDay ?? 4);
    const workingHours = recruiter.workingHours || {};
    const leaveDates = new Set(recruiter.leaveDates || []);

    for (let offset = 0; offset < daysAhead; offset++) {
        const day = new Date(now);
        day.setDate(day.getDate() + offset);

        const dayName = getWeekdayName(day, timeZone);
        const dayCfg = workingHours?.[dayName];
        if (!dayCfg?.enabled || !dayCfg?.start || !dayCfg?.end) continue;

        const dayKey = toLocalDateKey(day, timeZone);
        if (leaveDates.has(dayKey)) continue;

        const dayStart = makeZonedDate(day, '00:00', timeZone);
        const dayEnd = makeZonedDate(day, '23:59', timeZone);
        const interviewsThisDay = await getDb().collection('interviews').countDocuments({
            recruiterId: normalizeObjectId(recruiter._id),
            status: { $in: ['scheduled', 'in_progress'] },
            scheduledAt: { $gte: dayStart, $lte: dayEnd }
        });
        if (interviewsThisDay >= maxPerDay) continue;

        const workStart = makeZonedDate(day, dayCfg.start, timeZone);
        const workEnd = makeZonedDate(day, dayCfg.end, timeZone);
        let cursor = new Date(workStart);

        while (cursor.getTime() + durationMinutes * 60000 <= workEnd.getTime()) {
            const slotStart = new Date(cursor);
            const slotEnd = new Date(cursor.getTime() + durationMinutes * 60000);
            cursor = new Date(cursor.getTime() + SLOT_STEP_MINUTES * 60000);

            if (slotStart <= now) continue;

            const dbConflict = await hasDbConflict({
                recruiterId: recruiter._id,
                slotStart,
                slotEnd,
                bufferMinutes
            });
            if (dbConflict) continue;

            const gcalConflict = gcalBusy.some((busy) =>
                overlaps(slotStart, slotEnd, busy.start, busy.end, bufferMinutes)
            );
            if (gcalConflict) continue;

            return { start: slotStart, end: slotEnd };
        }
    }

    return null;
};

export const loadGcalBusy = async ({
    recruiter,
    recruiterTokenBundle,
    companyAdminTokenBundle
}) => {
    const tokenBundle = recruiterTokenBundle || companyAdminTokenBundle;
    if (!tokenBundle?.tokens) {
        return {
            busy: [],
            tokenBundle: null
        };
    }

    try {
        const timeMin = new Date();
        const timeMax = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        const busy = await getCalendarBusyTimes(
            tokenBundle.tokens,
            timeMin,
            timeMax,
            async (refreshedTokens) => {
                await persistRefreshedTokens({
                    userId: tokenBundle.ownerUserId,
                    role: tokenBundle.ownerRole,
                    recruiterId: tokenBundle.ownerRole === 'recruiter' ? recruiter._id : null,
                    tokens: refreshedTokens
                });
            }
        );
        return { busy, tokenBundle };
    } catch (error) {
        console.warn(`[scheduling] Failed to load Google busy for recruiter ${recruiter._id}: ${error.message}`);
        return { busy: [], tokenBundle };
    }
};

export const distribute = (applications, recruiters) => {
    const sorted = [...recruiters].sort(
        (a, b) => Number(a.pendingInterviews || 0) - Number(b.pendingInterviews || 0)
    );

    return applications.map((candidate, index) => ({
        candidate,
        recruiter: sorted[index % sorted.length]
    }));
};

