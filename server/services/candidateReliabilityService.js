import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';

const MAX_CREDITS = 100;
const NO_SHOW_PENALTY = 20;
const NO_SHOW_WINDOW_DAYS = 90;
const SOFT_RESTRICTION_DAYS = 14;
const HARD_RESTRICTION_DAYS = 30;
const BAN_NO_SHOW_COUNT = 5;

const toOid = (id) => {
    try {
        return id instanceof ObjectId ? id : new ObjectId(id.toString());
    } catch {
        return null;
    }
};

const getDefaultReliabilityProfile = () => ({
    credits: MAX_CREDITS,
    totalNoShows: 0,
    noShowsLast90Days: 0,
    noShowEvents: [],
    restrictionLevel: 'none',
    restrictedUntil: null,
    isBanned: false,
    banReason: null,
    lastNoShowAt: null,
    lastUpdatedAt: new Date()
});

const withDefaults = (profile = {}) => ({
    ...getDefaultReliabilityProfile(),
    ...profile,
    noShowEvents: Array.isArray(profile?.noShowEvents) ? profile.noShowEvents : []
});

const countNoShowsWithinDays = (events = [], days, now = new Date()) => {
    const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return events.filter((event) => new Date(event.occurredAt) >= threshold).length;
};

const computeEnforcementState = ({ credits, totalNoShows, noShowsLast90Days, now = new Date() }) => {
    if (credits <= 0 || totalNoShows >= BAN_NO_SHOW_COUNT) {
        return {
            restrictionLevel: 'banned',
            restrictedUntil: null,
            isBanned: true,
            banReason: 'Repeated interview no-shows'
        };
    }

    if (noShowsLast90Days >= 3 || credits <= 40) {
        return {
            restrictionLevel: 'hard_restriction',
            restrictedUntil: new Date(now.getTime() + HARD_RESTRICTION_DAYS * 24 * 60 * 60 * 1000),
            isBanned: false,
            banReason: null
        };
    }

    if (noShowsLast90Days >= 2 || credits <= 60) {
        return {
            restrictionLevel: 'soft_restriction',
            restrictedUntil: new Date(now.getTime() + SOFT_RESTRICTION_DAYS * 24 * 60 * 60 * 1000),
            isBanned: false,
            banReason: null
        };
    }

    return {
        restrictionLevel: 'none',
        restrictedUntil: null,
        isBanned: false,
        banReason: null
    };
};

export const getCandidateReliabilityProfile = (candidate = {}) =>
    withDefaults(candidate?.interviewReliability);

export const getCandidateApplicationRestriction = (candidate = {}, now = new Date()) => {
    const profile = getCandidateReliabilityProfile(candidate);
    if (profile.isBanned) {
        return {
            blocked: true,
            type: 'banned',
            message: 'Your account is banned from applying due to repeated interview no-shows.',
            profile
        };
    }

    if (profile.restrictedUntil && new Date(profile.restrictedUntil) > now) {
        return {
            blocked: true,
            type: profile.restrictionLevel || 'restricted',
            restrictedUntil: profile.restrictedUntil,
            message: `Your account is temporarily restricted from applying until ${new Date(profile.restrictedUntil).toISOString()}.`,
            profile
        };
    }

    return { blocked: false, type: 'none', profile };
};

export const assertCandidateCanApply = (candidate = {}) => {
    const restriction = getCandidateApplicationRestriction(candidate);
    if (restriction.blocked) {
        const error = new Error(restriction.message);
        error.statusCode = 403;
        error.code = `candidate_${restriction.type}`;
        error.meta = restriction;
        throw error;
    }
};

export const applyNoShowPenalty = async ({ interviewId, candidateId, markedBy, reason, force = false }) => {
    const db = getDb();
    const now = new Date();
    const interviewOid = toOid(interviewId);
    const candidateOid = toOid(candidateId);

    if (!interviewOid || !candidateOid) {
        throw new Error('Invalid interview or candidate id for no-show penalty');
    }

    const [interview, candidate] = await Promise.all([
        db.collection('interviews').findOne({ _id: interviewOid }),
        db.collection('users').findOne({ _id: candidateOid })
    ]);

    if (!interview) throw new Error('Interview not found');
    if (!candidate) throw new Error('Candidate not found');

    if (interview.noShowPenalty?.applied) {
        return {
            applied: false,
            reason: 'already_penalized',
            profile: getCandidateReliabilityProfile(candidate)
        };
    }

    // When called by automated cron: only penalise if RSVP was accepted.
    // When force=true (explicit recruiter action): always penalise.
    if (!force && interview.candidateRsvp?.response !== 'accepted') {
        return {
            applied: false,
            reason: 'rsvp_not_accepted',
            profile: getCandidateReliabilityProfile(candidate)
        };
    }


    const profile = getCandidateReliabilityProfile(candidate);
    const updatedEvents = [
        ...profile.noShowEvents,
        {
            interviewId: interviewOid,
            occurredAt: now,
            penalty: NO_SHOW_PENALTY,
            reason: reason || 'Candidate absent after RSVP acceptance',
            markedBy: toOid(markedBy)
        }
    ];

    const credits = Math.max(0, Number(profile.credits || 0) - NO_SHOW_PENALTY);
    const totalNoShows = Number(profile.totalNoShows || 0) + 1;
    const noShowsLast90Days = countNoShowsWithinDays(updatedEvents, NO_SHOW_WINDOW_DAYS, now);

    const enforcement = computeEnforcementState({
        credits,
        totalNoShows,
        noShowsLast90Days,
        now
    });

    const updatedProfile = {
        ...profile,
        credits,
        totalNoShows,
        noShowsLast90Days,
        noShowEvents: updatedEvents,
        lastNoShowAt: now,
        lastUpdatedAt: now,
        ...enforcement
    };

    await db.collection('users').updateOne(
        { _id: candidateOid },
        { $set: { interviewReliability: updatedProfile, updatedAt: now } }
    );

    await db.collection('interviews').updateOne(
        { _id: interviewOid },
        {
            $set: {
                noShowPenalty: {
                    applied: true,
                    penalty: NO_SHOW_PENALTY,
                    appliedAt: now,
                    candidateCreditsAfterPenalty: credits,
                    enforcementLevel: enforcement.restrictionLevel
                },
                updatedAt: now
            }
        }
    );

    return {
        applied: true,
        reason: 'penalty_applied',
        penalty: NO_SHOW_PENALTY,
        profile: updatedProfile
    };
};

export default {
    getCandidateReliabilityProfile,
    getCandidateApplicationRestriction,
    assertCandidateCanApply,
    applyNoShowPenalty
};
