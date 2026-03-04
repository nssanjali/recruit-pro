import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase,
    Users,
    Clock,
    CheckCircle2,
    Calendar,
    Building2,
    MapPin,
    Eye,
    RefreshCw,
    Mail,
    FileSearch,
    ArrowUpRight
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    Badge,
    Button,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from './ui';
import { toast } from 'sonner';
import { getJobs } from '../lib/api';
import { getMyRecruiterProfile } from '../lib/recruiterApi';

const API = 'http://localhost:5000/api';
const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
});

const apiFetch = async (path) => {
    const response = await fetch(`${API}${path}`, { headers: authHeaders() });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(err.message || 'Request failed');
    }
    return response.json();
};

const formatDateTime = (value) => {
    if (!value) return 'TBD';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'TBD';
    return d.toLocaleString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const relativeTime = (value) => {
    if (!value) return 'Just now';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Just now';
    const diffMinutes = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
};

export function RecruiterDashboard({ user }) {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [recruiterProfile, setRecruiterProfile] = useState(null);
    const [calendarData, setCalendarData] = useState({ events: [], stats: {} });
    const [communications, setCommunications] = useState({ stats: {}, storedCommunications: [] });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
        setRefreshing(true);
        try {
            const [jobsData, profileData, recruiterCalendar, communicationData] = await Promise.all([
                getJobs(),
                getMyRecruiterProfile().catch(() => null),
                apiFetch('/calendar/data/recruiter').catch(() => ({ events: [], stats: {} })),
                apiFetch('/communications').catch(() => ({ data: { stats: {}, storedCommunications: [] } }))
            ]);

            setJobs(jobsData || []);
            if (profileData?.data) setRecruiterProfile(profileData.data);
            setCalendarData({
                events: recruiterCalendar?.events || [],
                stats: recruiterCalendar?.stats || {}
            });
            setCommunications({
                stats: communicationData?.data?.stats || {},
                storedCommunications: communicationData?.data?.storedCommunications || []
            });
        } catch (error) {
            console.error('Error loading recruiter dashboard:', error);
            toast.error(error.message || 'Failed to load dashboard');
        } finally {
            setRefreshing(false);
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const assignmentEvents = useMemo(
        () => (calendarData.events || []).filter((event) => event.type === 'assignment'),
        [calendarData.events]
    );

    const interviewEvents = useMemo(
        () => (calendarData.events || []).filter((event) => event.type === 'interview' || event.type === 'completed'),
        [calendarData.events]
    );

    const upcomingInterviews = useMemo(
        () => interviewEvents
            .filter((event) => {
                const d = new Date(event.date);
                return !Number.isNaN(d.getTime()) && d >= new Date();
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5),
        [interviewEvents]
    );

    const assignedApplications = useMemo(
        () => interviewEvents
            .filter((event) => !!event?.detail?.applicationId)
            .sort((a, b) => new Date(b.date) - new Date(a.date)),
        [interviewEvents]
    );

    const openJobs = jobs.filter((job) => job.status === 'open').length;
    const totalApplicants = assignmentEvents.reduce((sum, event) => sum + Number(event?.detail?.applicantCount || 0), 0);

    const statsCards = [
        { label: 'Assigned Jobs', value: jobs.length, icon: Briefcase },
        { label: 'Open Jobs', value: openJobs, icon: Building2 },
        { label: 'Assigned Apps', value: assignedApplications.length, icon: FileSearch },
        { label: 'Active Interviews', value: Number(calendarData.stats?.totalInterviews || 0), icon: Clock },
        { label: 'Completed', value: Number(calendarData.stats?.completedInterviews || 0), icon: CheckCircle2 },
        { label: 'Assigned Applicants', value: totalApplicants, icon: Users }
    ];

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[70vh]">
                <div className="w-14 h-14 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
                <p className="text-slate-500 font-semibold mt-4">Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <Card className="border-slate-200 overflow-hidden">
                <CardContent className="p-0">
                    <div className="bg-gradient-to-r from-sky-700 via-blue-700 to-cyan-700 text-white p-6 sm:p-7">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase font-bold tracking-[0.2em] text-blue-100">Recruiter Command Center</p>
                                <h2 className="text-3xl font-black mt-2">Recruiter Dashboard</h2>
                                <p className="text-sm text-blue-100 mt-1">
                                    {user?.name || 'Recruiter'} | {recruiterProfile?.availability || 'available'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20" onClick={() => fetchData(true)} disabled={refreshing}>
                                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                                <Button className="bg-white text-sky-800 hover:bg-blue-50" onClick={() => navigate('/calendar')}>
                                    Open Calendar
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 xl:grid-cols-6 gap-3 p-4">
                        {statsCards.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.label} className="rounded-xl border border-slate-200 p-3 bg-white">
                                    <div className="flex items-center justify-between mb-1">
                                        <Icon className="w-4 h-4 text-sky-700" />
                                        <span className="text-[10px] uppercase font-black text-slate-400">{item.label}</span>
                                    </div>
                                    <p className="text-2xl font-black text-slate-900">{item.value}</p>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="border-slate-100 shadow-sm">
                    <CardHeader className="border-b border-slate-100 pb-3">
                        <h3 className="text-lg font-black text-slate-900">Assigned Applications</h3>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        {assignedApplications.length === 0 ? (
                            <div className="p-6 text-center">
                                <FileSearch className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-500">No applications moved to you yet.</p>
                            </div>
                        ) : (
                            assignedApplications.slice(0, 6).map((event) => (
                                <div key={event.id} className="rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-bold text-slate-900">{event.detail?.candidateName || 'Candidate'}</p>
                                        <Badge className="bg-sky-100 text-sky-700">assigned</Badge>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">{event.detail?.jobTitle || 'Role'}</p>
                                    <div className="mt-3 flex items-center justify-between gap-2">
                                        <span className="text-xs text-slate-500">{formatDateTime(event.date)}</span>
                                        <Button
                                            size="sm"
                                            onClick={() => navigate(`/applications/${event.detail?.applicationId}/review`)}
                                        >
                                            Review
                                            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-100 shadow-sm">
                    <CardHeader className="border-b border-slate-100 pb-3">
                        <h3 className="text-lg font-black text-slate-900">Upcoming Interviews</h3>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        {upcomingInterviews.length === 0 ? (
                            <div className="p-8 text-center">
                                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-500">No upcoming interviews.</p>
                            </div>
                        ) : (
                            upcomingInterviews.map((event) => (
                                <div key={event.id} className="rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-bold text-slate-900">{event.detail?.candidateName || event.title}</p>
                                        <Badge className="bg-indigo-100 text-indigo-700">{event.status || 'scheduled'}</Badge>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">{event.detail?.jobTitle || 'Role'}</p>
                                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                                        <span className="inline-flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatDateTime(event.date)}
                                        </span>
                                        {event.detail?.meetingLink && (
                                            <a href={event.detail.meetingLink} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">
                                                Join Meet
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-100 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                    <Tabs defaultValue="jobs" className="w-full">
                        <TabsList className="bg-slate-100 p-1 rounded-xl">
                            <TabsTrigger value="jobs" className="text-xs font-bold">MY JOBS</TabsTrigger>
                            <TabsTrigger value="activity" className="text-xs font-bold">RECENT ACTIVITY</TabsTrigger>
                        </TabsList>

                        <TabsContent value="jobs" className="space-y-3 mt-4">
                            {jobs.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-500">No assigned jobs yet.</p>
                                </div>
                            ) : (
                                jobs.map((job) => (
                                    <div key={job._id} className="rounded-xl border border-slate-200 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-black text-slate-900">{job.title}</p>
                                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                                                    {job.department && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <Building2 className="w-3.5 h-3.5" />
                                                            {job.department}
                                                        </span>
                                                    )}
                                                    {job.location && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <MapPin className="w-3.5 h-3.5" />
                                                            {job.location}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge className={job.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                                                {job.status || 'unknown'}
                                            </Badge>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <Button size="sm" variant="outline" onClick={() => navigate(`/jobs/${job._id}`)}>
                                                <Eye className="w-3.5 h-3.5 mr-1.5" />
                                                View Job
                                            </Button>
                                            <Button size="sm" onClick={() => navigate(`/jobs/${job._id}/candidates`)}>
                                                <Users className="w-3.5 h-3.5 mr-1.5" />
                                                View Candidates
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </TabsContent>

                        <TabsContent value="activity" className="space-y-3 mt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Card className="border-slate-100">
                                    <CardContent className="p-4">
                                        <p className="text-xs text-slate-500">Emails Today</p>
                                        <p className="text-2xl font-black text-slate-900">{communications.stats?.emailsSent || 0}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-slate-100">
                                    <CardContent className="p-4">
                                        <p className="text-xs text-slate-500">Reminders</p>
                                        <p className="text-2xl font-black text-slate-900">{communications.stats?.scheduledReminders || 0}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-slate-100">
                                    <CardContent className="p-4">
                                        <p className="text-xs text-slate-500">Threads</p>
                                        <p className="text-2xl font-black text-slate-900">{communications.storedCommunications?.length || 0}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {(communications.storedCommunications || []).length === 0 ? (
                                <div className="p-8 text-center">
                                    <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-500">No communication history yet.</p>
                                </div>
                            ) : (
                                (communications.storedCommunications || []).slice(0, 8).map((thread, idx) => (
                                    <div key={`${thread.candidate}-${idx}`} className="rounded-xl border border-slate-200 p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-semibold text-slate-900 truncate">{thread.candidate || 'Candidate'}</p>
                                            <span className="text-xs text-slate-500">{relativeTime(thread.lastContact)}</span>
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500 flex gap-3">
                                            <span>{thread.totalMessages || 0} messages</span>
                                            <span>{thread.interviews || 0} interview updates</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
