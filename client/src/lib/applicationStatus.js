export const normalizeApplicationStatus = (status) => {
    const value = String(status || 'pending').toLowerCase().trim();

    // Legacy typo support
    if (value === 'sortlisted') return 'shortlisted';
    // Legacy status value used by older approve endpoint
    if (value === 'approved') return 'accepted';

    // For UI pipeline purposes, interview_scheduled belongs to shortlist lane.
    if (value === 'interview_scheduled') return 'shortlisted';

    return value;
};

export const getApplicationStatusLabel = (status) => {
    const normalized = normalizeApplicationStatus(status);
    if (normalized === 'shortlisted') return 'shortlisted';
    return normalized;
};
