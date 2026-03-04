import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    Briefcase,
    CalendarDays,
    CheckCircle2,
    Clock3,
    FileText,
    RefreshCw,
    Target,
    TrendingUp,
    Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { Badge, Button, Card, CardContent } from './ui';
import { getApplications, getJobs } from '../lib/api';
import { normalizeApplicationStatus } from '../lib/applicationStatus';

const WINDOW_OPTIONS = [
    { id: '7d', label: '7D', days: 7 },
    { id: '30d', label: '30D', days: 30 },
    { id: '90d', label: '90D', days: 90 }
];

const STATUS_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'reviewing', label: 'Reviewing' },
    { id: 'shortlisted', label: 'Shortlisted' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'rejected', label: 'Rejected' }
];

const statusPillClass = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    reviewing: 'bg-blue-100 text-blue-800 border-blue-200',
    shortlisted: 'bg-violet-100 text-violet-800 border-violet-200',
    interview_scheduled: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-rose-100 text-rose-800 border-rose-200'
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const normalizeId = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') {
        if (value.$oid) return String(value.$oid);
        if (value._id) return normalizeId(value._id);
    }
    try {
        const cast = String(value);
        return cast === '[object Object]' ? '' : cast;
    } catch {
        return '';
    }
};

const parseDate = (value) => {
    if (!value) return null;
    if (typeof value === 'object' && value.$date) {
        return parseDate(value.$date);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getApplicationDate = (app) =>
    parseDate(app?.appliedAt) || parseDate(app?.createdAt) || parseDate(app?.updatedAt);

const normalizeStatus = normalizeApplicationStatus;
const getApplicationJobId = (app) => normalizeId(app?.jobId || app?.job?._id || app?.job?.id);
const getApplicationCandidateName = (app) =>
    app?.candidateName || app?.name || app?.candidate?.name || app?.candidateEmail || 'Candidate';
const getApplicationJobTitle = (app, jobMap) => {
    if (app?.job?.title) return app.job.title;
    if (app?.jobTitle) return app.jobTitle;
    if (app?.position) return app.position;
    if (app?.role) return app.role;

    const id = getApplicationJobId(app);
    if (id && jobMap.has(id)) return jobMap.get(id)?.title || 'Untitled Job';
    return 'Untitled Job';
};

export function AnalyticsDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [hoveredTrendKey, setHoveredTrendKey] = useState('');
    const [pipelineSortBy, setPipelineSortBy] = useState('volume');
    const [activeTab, setActiveTab] = useState('overview');
    const [windowId, setWindowId] = useState('30d');
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            setError('');

            const [jobsData, applicationsData] = await Promise.all([
                getJobs(),
                getApplications()
            ]);

            const jobsList = asArray(jobsData);
            const allApplications = asArray(applicationsData);
            const myJobIds = new Set(jobsList.map((job) => normalizeId(job?._id)));

            // Company admin analytics should include only applications for this admin's jobs.
            const scopedApplications = allApplications.filter((app) => {
                const applicationJobId = getApplicationJobId(app);
                return applicationJobId && myJobIds.has(applicationJobId);
            });

            setJobs(jobsList);
            setApplications(scopedApplications);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Error loading analytics:', err);
            setError(err.message || 'Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnalytics();
    }, []);

    const selectedWindow = WINDOW_OPTIONS.find((option) => option.id === windowId) || WINDOW_OPTIONS[1];
    const jobsMap = useMemo(() => {
        const map = new Map();
        jobs.forEach((job) => {
            const id = normalizeId(job?._id);
            if (id) map.set(id, job);
        });
        return map;
    }, [jobs]);

    const filteredByWindow = useMemo(() => {
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - (selectedWindow.days - 1));
        start.setHours(0, 0, 0, 0);

        return applications.filter((app) => {
            const appDate = getApplicationDate(app);
            // Keep records even when date is missing so analytics does not go blank.
            return appDate ? appDate >= start : true;
        });
    }, [applications, selectedWindow.days]);

    const visibleApplications = useMemo(() => {
        if (statusFilter === 'all') return filteredByWindow;
        return filteredByWindow.filter((app) => normalizeStatus(app?.status) === statusFilter);
    }, [filteredByWindow, statusFilter]);

    const metrics = useMemo(() => {
        const openJobs = jobs.filter((job) => job?.status === 'open').length;
        const closedJobs = jobs.filter((job) => job?.status === 'closed').length;
        const pending = filteredByWindow.filter((app) => normalizeStatus(app?.status) === 'pending').length;
        const reviewing = filteredByWindow.filter((app) => normalizeStatus(app?.status) === 'reviewing').length;
        // Includes legacy typo "sortlisted"
        const shortlisted = filteredByWindow.filter((app) => normalizeStatus(app?.status) === 'shortlisted').length;
        const accepted = filteredByWindow.filter((app) => normalizeStatus(app?.status) === 'accepted').length;
        const rejected = filteredByWindow.filter((app) => normalizeStatus(app?.status) === 'rejected').length;

        const averageScoreRaw = filteredByWindow
            .map((app) => Number(app?.finalScore ?? app?.matchScore))
            .filter((score) => Number.isFinite(score));
        const avgScore = averageScoreRaw.length > 0
            ? (averageScoreRaw.reduce((sum, score) => sum + score, 0) / averageScoreRaw.length).toFixed(1)
            : '0.0';

        const hireRate = filteredByWindow.length > 0
            ? ((accepted / filteredByWindow.length) * 100).toFixed(1)
            : '0.0';

        return {
            totalJobs: jobs.length,
            openJobs,
            closedJobs,
            totalApplications: filteredByWindow.length,
            pending,
            reviewing,
            shortlisted,
            accepted,
            rejected,
            hireRate,
            avgScore
        };
    }, [jobs, filteredByWindow]);

    const trendSource = useMemo(() => {
        return statusFilter === 'all' ? filteredByWindow : visibleApplications;
    }, [statusFilter, filteredByWindow, visibleApplications]);

    const applicationTrend = useMemo(() => {
        const today = new Date();
        const days = selectedWindow.days;
        const buckets = [];

        for (let i = days - 1; i >= 0; i--) {
            const day = new Date(today);
            day.setDate(today.getDate() - i);
            day.setHours(0, 0, 0, 0);
            const key = day.toISOString().slice(0, 10);
            buckets.push({ key, label: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: 0 });
        }

        const indexByKey = new Map(buckets.map((bucket, index) => [bucket.key, index]));
        trendSource.forEach((app) => {
            const date = getApplicationDate(app) || new Date();
            date.setHours(0, 0, 0, 0);
            const key = date.toISOString().slice(0, 10);
            const idx = indexByKey.get(key);
            if (idx !== undefined) buckets[idx].value += 1;
        });

        const peak = Math.max(...buckets.map((bucket) => bucket.value), 1);
        return { points: buckets, peak };
    }, [trendSource, selectedWindow.days]);

    const hoveredTrendPoint = useMemo(() => {
        if (!hoveredTrendKey) return null;
        return applicationTrend.points.find((point) => point.key === hoveredTrendKey) || null;
    }, [hoveredTrendKey, applicationTrend.points]);

    const topJobs = useMemo(() => {
        const statsByJobId = new Map();
        filteredByWindow.forEach((app) => {
            const id = getApplicationJobId(app);
            if (!id) return;
            const status = normalizeStatus(app?.status);
            const score = Number(app?.finalScore ?? app?.matchScore);
            const current = statsByJobId.get(id) || {
                count: 0,
                accepted: 0,
                rejected: 0,
                shortlisted: 0,
                pendingReview: 0,
                scoreTotal: 0,
                scoreCount: 0
            };

            current.count += 1;
            if (status === 'accepted') current.accepted += 1;
            if (status === 'rejected') current.rejected += 1;
            if (status === 'shortlisted') current.shortlisted += 1;
            if (status === 'pending' || status === 'reviewing') current.pendingReview += 1;
            if (Number.isFinite(score)) {
                current.scoreTotal += score;
                current.scoreCount += 1;
            }
            statsByJobId.set(id, current);
        });

        const rows = jobs
            .map((job) => ({
                _id: normalizeId(job?._id),
                title: job?.title || 'Untitled Job',
                status: job?.status || 'draft',
                ...(statsByJobId.get(normalizeId(job?._id)) || {
                    count: 0,
                    accepted: 0,
                    rejected: 0,
                    shortlisted: 0,
                    pendingReview: 0,
                    scoreTotal: 0,
                    scoreCount: 0
                })
            }))
            .map((job) => ({
                ...job,
                conversion: job.count > 0 ? (job.accepted / job.count) * 100 : 0,
                avgScore: job.scoreCount > 0 ? job.scoreTotal / job.scoreCount : 0
            }));

        const sorted = [...rows];
        if (pipelineSortBy === 'conversion') {
            sorted.sort((a, b) => b.conversion - a.conversion || b.count - a.count);
        } else if (pipelineSortBy === 'score') {
            sorted.sort((a, b) => b.avgScore - a.avgScore || b.count - a.count);
        } else {
            sorted.sort((a, b) => b.count - a.count);
        }

        return sorted.slice(0, 8);
    }, [filteredByWindow, jobs, pipelineSortBy]);

    const pipelineStages = useMemo(() => {
        const total = metrics.totalApplications || 1;
        const reviewed = metrics.reviewing + metrics.shortlisted + metrics.accepted + metrics.rejected;
        const decisioned = metrics.accepted + metrics.rejected;
        return [
            {
                id: 'all',
                label: 'Applied',
                value: metrics.totalApplications,
                percent: 100
            },
            {
                id: 'pending',
                label: 'Pending',
                value: metrics.pending,
                percent: Math.round((metrics.pending / total) * 100)
            },
            {
                id: 'reviewing',
                label: 'Reviewed',
                value: reviewed,
                percent: Math.round((reviewed / total) * 100)
            },
            {
                id: 'shortlisted',
                label: 'Shortlisted',
                value: metrics.shortlisted,
                percent: Math.round((metrics.shortlisted / total) * 100)
            },
            {
                id: 'accepted',
                label: 'Accepted',
                value: metrics.accepted,
                percent: Math.round((metrics.accepted / total) * 100)
            },
            {
                id: 'rejected',
                label: 'Rejected',
                value: metrics.rejected,
                percent: Math.round((metrics.rejected / total) * 100)
            },
            {
                id: 'all',
                label: 'Decisioned',
                value: decisioned,
                percent: Math.round((decisioned / total) * 100)
            }
        ];
    }, [metrics]);

    const recentActivity = useMemo(() => {
        return [...visibleApplications]
            .sort((a, b) => {
                const aDate = getApplicationDate(a)?.getTime() || 0;
                const bDate = getApplicationDate(b)?.getTime() || 0;
                return bDate - aDate;
            })
            .slice(0, 7);
    }, [visibleApplications]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-semibold">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl p-6 md:p-8 border border-slate-200 bg-gradient-to-br from-white via-emerald-50/35 to-cyan-50/40">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">Hiring Intelligence</h1>
                        <p className="text-sm text-slate-600 mt-1">
                            Live performance for your jobs over the last {selectedWindow.days} days
                        </p>
                        {lastUpdated && (
                            <p className="text-xs text-slate-500 mt-2">
                                Updated {lastUpdated.toLocaleDateString()} {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {WINDOW_OPTIONS.map((option) => (
                            <Button
                                key={option.id}
                                variant={windowId === option.id ? 'default' : 'outline'}
                                className={windowId === option.id ? 'bg-slate-900 text-white' : 'text-slate-700'}
                                onClick={() => setWindowId(option.id)}
                            >
                                {option.label}
                            </Button>
                        ))}
                        <Button variant="outline" className="gap-2" onClick={loadAnalytics}>
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <Card className="border-rose-200 bg-rose-50">
                    <CardContent className="p-4 text-sm text-rose-800">
                        {error}
                    </CardContent>
                </Card>
            )}

            <div className="flex items-center gap-2 flex-wrap">
                {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'pipeline', label: 'Pipeline' },
                    { id: 'activity', label: 'Activity' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wide transition-all ${activeTab === tab.id
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
                {[
                    { key: 'all', label: 'Applications', value: metrics.totalApplications, icon: FileText, accent: 'from-cyan-500 to-blue-600' },
                    { key: 'pending', label: 'Pending', value: metrics.pending, icon: Clock3, accent: 'from-amber-500 to-orange-600' },
                    { key: 'reviewing', label: 'Reviewing', value: metrics.reviewing, icon: Activity, accent: 'from-blue-500 to-indigo-600' },
                    { key: 'shortlisted', label: 'Shortlisted', value: metrics.shortlisted, icon: Target, accent: 'from-violet-500 to-purple-600' },
                    { key: 'accepted', label: 'Accepted', value: metrics.accepted, icon: CheckCircle2, accent: 'from-emerald-500 to-green-600' },
                    { key: 'rejected', label: 'Rejected', value: metrics.rejected, icon: Users, accent: 'from-rose-500 to-red-600' }
                ].map((card, index) => {
                    const Icon = card.icon;
                    const isActive = statusFilter === card.key;
                    return (
                        <motion.button
                            key={card.key}
                            type="button"
                            onClick={() => setStatusFilter(card.key)}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            className={`text-left rounded-2xl border p-4 bg-white transition-all ${isActive ? 'border-slate-900 shadow-lg' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
                        >
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.accent} text-white flex items-center justify-center mb-3`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{card.label}</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">{card.value}</p>
                        </motion.button>
                    );
                })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-black text-slate-900">Application Flow</h3>
                            <div className="flex items-center gap-2">
                                {statusFilter !== 'all' && (
                                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 capitalize">
                                        Filter: {statusFilter}
                                    </Badge>
                                )}
                                <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                                    Peak: {applicationTrend.peak}/day
                                </Badge>
                            </div>
                        </div>
                        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-slate-600">
                                {hoveredTrendPoint
                                    ? `${hoveredTrendPoint.label}: ${hoveredTrendPoint.value} application${hoveredTrendPoint.value === 1 ? '' : 's'}`
                                    : 'Hover a bar to inspect daily volume'}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                                Total: {trendSource.length}
                            </p>
                        </div>
                        <div className="flex items-end gap-1.5 h-44">
                            {applicationTrend.points.length === 0 ? (
                                <div className="w-full h-full rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-sm text-slate-500 font-semibold">
                                    No application flow data in this window.
                                </div>
                            ) : (
                                applicationTrend.points.map((point, index) => (
                                    <div
                                        key={point.key}
                                        className="flex-1 min-w-0 group relative h-full flex flex-col justify-end"
                                        onMouseEnter={() => setHoveredTrendKey(point.key)}
                                        onMouseLeave={() => setHoveredTrendKey('')}
                                    >
                                        <div
                                            title={`${point.label}: ${point.value} applications`}
                                            className={`w-full rounded-t-md transition-all ${hoveredTrendKey === point.key
                                                ? 'bg-gradient-to-t from-slate-900 to-slate-700 shadow-md shadow-slate-900/20'
                                                : 'bg-gradient-to-t from-emerald-500 to-cyan-500 group-hover:from-slate-900 group-hover:to-slate-700'
                                                }`}
                                            style={{
                                                height: `${Math.max((point.value / applicationTrend.peak) * 130, point.value > 0 ? 8 : 2)}px`
                                            }}
                                        />
                                        {index % Math.ceil(applicationTrend.points.length / 6) === 0 && (
                                            <p className={`text-[10px] mt-2 truncate ${hoveredTrendKey === point.key ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                                                {point.label}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {STATUS_FILTERS.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setStatusFilter(item.id)}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${statusFilter === item.id
                                        ? 'border-slate-900 bg-slate-900 text-white'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6 space-y-4">
                        <h3 className="text-lg font-black text-slate-900">Snapshot</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                                <p className="text-xs text-slate-500 font-bold uppercase">Open Jobs</p>
                                <p className="text-2xl font-black text-slate-900 mt-1">{metrics.openJobs}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                                <p className="text-xs text-slate-500 font-bold uppercase">Closed Jobs</p>
                                <p className="text-2xl font-black text-slate-900 mt-1">{metrics.closedJobs}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                                <p className="text-xs text-slate-500 font-bold uppercase">Hire Rate</p>
                                <p className="text-2xl font-black text-emerald-700 mt-1">{metrics.hireRate}%</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                                <p className="text-xs text-slate-500 font-bold uppercase">Avg Score</p>
                                <p className="text-2xl font-black text-cyan-700 mt-1">{metrics.avgScore}</p>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4 bg-gradient-to-r from-slate-900 to-slate-700 text-white">
                            <p className="text-xs uppercase tracking-widest opacity-70 font-bold">Focus</p>
                            <p className="text-sm mt-2 leading-relaxed">
                                {metrics.pending > 0
                                    ? `${metrics.pending} applications are waiting. Prioritize reviews to shorten hiring cycle.`
                                    : 'Review queue is clear. Good throughput this window.'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                    </div>
                </>
            )}

            {activeTab !== 'overview' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {activeTab === 'pipeline' && (
                        <>
                            <Card className="border-slate-200 shadow-sm">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="text-lg font-black text-slate-900">Hiring Funnel</h3>
                                        <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                                            {metrics.totalApplications} in window
                                        </Badge>
                                    </div>
                                    <div className="space-y-2.5">
                                        {pipelineStages.map((stage) => (
                                            <button
                                                key={`${stage.label}-${stage.id}`}
                                                type="button"
                                                onClick={() => setStatusFilter(stage.id)}
                                                className={`w-full text-left rounded-xl border p-3 transition-all ${statusFilter === stage.id
                                                    ? 'border-slate-900 bg-slate-900 text-white'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={`text-sm font-bold ${statusFilter === stage.id ? 'text-white' : 'text-slate-800'}`}>{stage.label}</p>
                                                    <p className={`text-xs font-black ${statusFilter === stage.id ? 'text-slate-200' : 'text-slate-500'}`}>
                                                        {stage.value} ({stage.percent}%)
                                                    </p>
                                                </div>
                                                <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${statusFilter === stage.id ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                                    <div
                                                        className={`h-full rounded-full ${statusFilter === stage.id ? 'bg-cyan-300' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
                                                        style={{ width: `${Math.max(stage.percent, stage.value > 0 ? 6 : 2)}%` }}
                                                    />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200 shadow-sm xl:col-span-1">
                                <CardContent className="p-6">
                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                                        <h3 className="text-lg font-black text-slate-900">Role Performance</h3>
                                        <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-1 bg-white">
                                            {[
                                                { id: 'volume', label: 'Volume' },
                                                { id: 'conversion', label: 'Conversion' },
                                                { id: 'score', label: 'Score' }
                                            ].map((sort) => (
                                                <button
                                                    key={sort.id}
                                                    type="button"
                                                    onClick={() => setPipelineSortBy(sort.id)}
                                                    className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all ${pipelineSortBy === sort.id
                                                        ? 'bg-slate-900 text-white'
                                                        : 'text-slate-600 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    {sort.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {topJobs.length === 0 && (
                                            <div className="text-sm text-slate-500">No jobs available for analytics yet.</div>
                                        )}
                                        {topJobs.map((job) => {
                                            const maxCount = Math.max(topJobs[0]?.count || 1, 1);
                                            const volumeWidth = Math.max((job.count / maxCount) * 100, job.count > 0 ? 8 : 2);
                                            return (
                                                <button
                                                    key={job._id || job.title}
                                                    type="button"
                                                    onClick={() => job._id && navigate(`/jobs/${job._id}/candidates`)}
                                                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-900 truncate">{job.title}</p>
                                                            <p className="text-xs text-slate-500 capitalize mt-0.5">{job.status}</p>
                                                        </div>
                                                        <Badge className="bg-slate-100 text-slate-800 border-slate-200">{job.count}</Badge>
                                                    </div>

                                                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-semibold text-slate-600">
                                                        <p>Accept: <span className="text-emerald-700">{job.accepted}</span></p>
                                                        <p>Pending: <span className="text-amber-700">{job.pendingReview}</span></p>
                                                        <p>Conv: <span className="text-cyan-700">{job.conversion.toFixed(1)}%</span></p>
                                                    </div>

                                                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${volumeWidth}%` }} />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {activeTab === 'activity' && (
                        <Card className="border-slate-200 shadow-sm xl:col-span-2">
                    <CardContent className="p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                            <h3 className="text-lg font-black text-slate-900">Recent Activity</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                                {STATUS_FILTERS.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setStatusFilter(item.id)}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${statusFilter === item.id
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                            }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {recentActivity.length === 0 && (
                                <p className="text-sm text-slate-500">No matching activity in this window.</p>
                            )}
                            {recentActivity.map((app) => {
                                const displayDate = getApplicationDate(app);
                                const jobTitle = getApplicationJobTitle(app, jobsMap);
                                const candidateName = getApplicationCandidateName(app);
                                const appStatus = normalizeStatus(app?.status);
                                const score = Number(app?.finalScore ?? app?.matchScore);

                                return (
                                    <div key={app?._id} className="p-3 rounded-xl border border-slate-200 bg-white">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 truncate">{candidateName}</p>
                                                <p className="text-xs text-slate-500 truncate mt-0.5">{jobTitle}</p>
                                                {displayDate && (
                                                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                                                        <CalendarDays className="w-3 h-3" />
                                                        {displayDate.toLocaleDateString()} {displayDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                <Badge className={`capitalize border ${statusPillClass[appStatus] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                    {appStatus}
                                                </Badge>
                                                {Number.isFinite(score) && (
                                                    <Badge className="bg-slate-100 text-slate-800 border-slate-200">{Math.round(score)}% match</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {activeTab === 'pipeline' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase">Total Jobs</p>
                            <p className="text-xl font-black text-slate-900">{metrics.totalJobs}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-cyan-700" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase">Applications / Job</p>
                            <p className="text-xl font-black text-slate-900">
                                {metrics.totalJobs > 0 ? (metrics.totalApplications / metrics.totalJobs).toFixed(1) : '0.0'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-violet-700" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase">Visible Records</p>
                            <p className="text-xl font-black text-slate-900">{visibleApplications.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Target className="w-5 h-5 text-blue-700" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase">Selected Filter</p>
                            <p className="text-xl font-black text-slate-900 capitalize">{statusFilter}</p>
                        </div>
                    </CardContent>
                </Card>
                </div>
            )}
        </div>
    );
}
