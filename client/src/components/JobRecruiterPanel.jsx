import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    X, Users, Tag, Briefcase, Star, CheckCircle2, AlertCircle,
    Clock, Zap, ChevronRight, Phone, Mail, TrendingUp
} from 'lucide-react';
import { Badge, Button } from './ui';

const API_URL = 'http://localhost:5000/api';

async function fetchMappedRecruiters(jobId) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/jobs/${jobId}/mapped-recruiters`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch recruiters');
    return res.json();
}

/** Tier config — colours + icons */
const TIER = {
    strong: { label: 'Strong Match', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-600', text: 'text-emerald-700', icon: CheckCircle2, bar: 'bg-emerald-500' },
    good: { label: 'Good Match', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-600', text: 'text-blue-700', icon: Star, bar: 'bg-blue-500' },
    partial: { label: 'Partial Match', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-500', text: 'text-amber-700', icon: AlertCircle, bar: 'bg-amber-400' },
    low: { label: 'Low Match', bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-400', text: 'text-slate-500', icon: Clock, bar: 'bg-slate-300' },
};

function AvailabilityDot({ status }) {
    const cls = status === 'available' ? 'bg-emerald-500'
        : status === 'busy' ? 'bg-amber-500'
            : 'bg-red-500';
    return <span className={`inline-block w-2 h-2 rounded-full ${cls} flex-shrink-0`} />;
}

function ScoreBar({ score, color }) {
    return (
        <div className="flex items-center gap-2 w-full">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                    className={`h-full rounded-full ${color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                />
            </div>
            <span className="text-xs font-black text-slate-700 w-9 text-right">{score}%</span>
        </div>
    );
}

function RecruiterCard({ recruiter, index }) {
    const tier = TIER[recruiter.matchTier] || TIER.low;
    const TierIcon = tier.icon;
    const initials = recruiter.user?.name?.split(' ').map(n => n[0]).join('') || 'R';

    return (
        <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06, ease: 'easeOut' }}
            className={`rounded-2xl border ${tier.border} ${tier.bg} p-4 space-y-3`}
        >
            {/* Top row */}
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] flex items-center justify-center text-white font-black text-base shadow">
                        {initials}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5">
                        <AvailabilityDot status={recruiter.availability} />
                    </span>
                </div>

                {/* Name & meta */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-slate-900 text-sm leading-tight">{recruiter.user?.name}</h4>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black text-white ${tier.badge}`}>
                            <TierIcon className="w-2.5 h-2.5" />
                            {tier.label}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                        {recruiter.user?.email && (
                            <span className="flex items-center gap-1 truncate">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{recruiter.user.email}</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Score bubble */}
                <div className="flex-shrink-0 text-right">
                    <div className="text-2xl font-black text-slate-900 leading-none">{recruiter.matchScore}%</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-0.5">match</div>
                </div>
            </div>

            {/* Score bar */}
            <ScoreBar score={recruiter.matchScore} color={tier.bar} />

            {/* Matched roles — highlighted in teal */}
            {recruiter.matchedRoles?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-black text-teal-700 uppercase tracking-wide flex items-center gap-1 mr-1">
                        <Tag className="w-2.5 h-2.5" /> Matched:
                    </span>
                    {recruiter.matchedRoles.map(role => (
                        <span key={role} className="px-2 py-0.5 bg-teal-600 text-white text-[10px] font-bold rounded-full">
                            {role}
                        </span>
                    ))}
                </div>
            )}

            {/* Other roles (non-matched) if any */}
            {recruiter.roles?.filter(r => !recruiter.matchedRoles?.includes(r)).length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {recruiter.roles.filter(r => !recruiter.matchedRoles?.includes(r)).slice(0, 4).map(role => (
                        <span key={role} className="px-2 py-0.5 bg-teal-100 text-teal-700 text-[10px] font-bold rounded-full border border-teal-200">
                            {role}
                        </span>
                    ))}
                </div>
            )}

            {/* Skills */}
            {recruiter.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {recruiter.skills.slice(0, 5).map(skill => (
                        <span key={skill} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                            {skill}
                        </span>
                    ))}
                    {recruiter.skills.length > 5 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">
                            +{recruiter.skills.length - 5}
                        </span>
                    )}
                </div>
            )}

            {/* Workload */}
            <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium pt-1 border-t border-white/60">
                <span className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-orange-500" />
                    {recruiter.activeJobs?.length || 0} active jobs
                </span>
                <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-purple-500" />
                    {recruiter.pendingInterviews || 0} pending
                </span>
                <span className="flex items-center gap-1 capitalize">
                    <AvailabilityDot status={recruiter.availability} />
                    {recruiter.availability || 'available'}
                </span>
            </div>
        </motion.div>
    );
}

/**
 * JobRecruiterPanel — slide-in drawer
 * Props:
 *   job      { _id, title, department }  — the job to show recruiters for
 *   onClose  () => void
 */
export function JobRecruiterPanel({ job, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const panelRef = useRef(null);

    useEffect(() => {
        if (!job?._id) return;
        setLoading(true);
        setError(null);
        fetchMappedRecruiters(job._id)
            .then(res => setData(res))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [job?._id]);

    // Close on Escape
    useEffect(() => {
        const handler = e => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const recruiters = data?.data || [];
    const strongCount = recruiters.filter(r => r.matchTier === 'strong').length;
    const goodCount = recruiters.filter(r => r.matchTier === 'good').length;

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
                key="panel"
                ref={panelRef}
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
                {/* Header */}
                <div className="flex-shrink-0 bg-gradient-to-r from-[#4285f4] to-[#8b5cf6] p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                    <Users className="w-4 h-4 text-white" />
                                </div>
                                <p className="text-white/80 text-xs font-bold uppercase tracking-wider">Mapped Recruiters</p>
                            </div>
                            <h2 className="text-white font-black text-lg leading-tight truncate">{job?.title}</h2>
                            {job?.department && (
                                <p className="text-white/70 text-xs mt-0.5 font-medium">{job.department}</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    {/* Summary pills */}
                    {!loading && !error && (
                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                            <span className="px-2.5 py-1 bg-white/20 rounded-full text-white text-[11px] font-black flex items-center gap-1">
                                <Users className="w-3 h-3" /> {recruiters.length} recruiters
                            </span>
                            {strongCount > 0 && (
                                <span className="px-2.5 py-1 bg-emerald-500/80 rounded-full text-white text-[11px] font-black flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> {strongCount} strong match
                                </span>
                            )}
                            {goodCount > 0 && (
                                <span className="px-2.5 py-1 bg-blue-500/80 rounded-full text-white text-[11px] font-black flex items-center gap-1">
                                    <Star className="w-3 h-3" /> {goodCount} good match
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-12 h-12 border-4 border-[#4285f4] border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-500 font-bold text-sm">Matching recruiters to role…</p>
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-16">
                            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                            <p className="text-slate-700 font-bold">Failed to load recruiters</p>
                            <p className="text-slate-400 text-sm mt-1">{error}</p>
                        </div>
                    )}

                    {!loading && !error && recruiters.length === 0 && (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-700 font-black">No recruiters found</p>
                            <p className="text-slate-400 text-sm mt-1 max-w-52 mx-auto">
                                Add recruiters from the Recruiters tab and assign them job roles.
                            </p>
                        </div>
                    )}

                    {!loading && !error && recruiters.map((recruiter, i) => (
                        <RecruiterCard key={recruiter._id} recruiter={recruiter} index={i} />
                    ))}
                </div>

                {/* Footer hint */}
                {!loading && recruiters.length > 0 && (
                    <div className="flex-shrink-0 border-t border-slate-100 px-5 py-3 bg-slate-50">
                        <p className="text-[11px] text-slate-400 font-medium text-center">
                            Scores based on role mapping · skills · expertise · workload
                        </p>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
