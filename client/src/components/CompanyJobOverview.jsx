import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Briefcase,
    Building,
    Calendar,
    Clock,
    MapPin,
    Users,
    FileText,
    UserCheck,
    TrendingUp,
    ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card } from './ui';
import {
    getAdminCalendarData,
    getApplications,
    getJobById,
    getJobInterviews,
    getMappedRecruiters
} from '../lib/api';
import { normalizeApplicationStatus } from '../lib/applicationStatus';

const getAppJobId = (application) => {
    if (!application) return '';
    if (typeof application.jobId === 'string') return application.jobId;
    if (application.jobId?._id) return String(application.jobId._id);
    return '';
};

export function CompanyJobOverview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState(null);
    const [applications, setApplications] = useState([]);
    const [recruiters, setRecruiters] = useState([]);
    const [interviews, setInterviews] = useState([]);
    const [calendarEvents, setCalendarEvents] = useState([]);

    useEffect(() => {
        const fetchOverview = async () => {
            setLoading(true);
            try {
                const [jobData, allApplications, mappedRecruiters, jobInterviews, adminCalendar] = await Promise.all([
                    getJobById(id),
                    getApplications(),
                    getMappedRecruiters(id),
                    getJobInterviews(id),
                    getAdminCalendarData()
                ]);

                setJob(jobData || null);
                setApplications((allApplications || []).filter((app) => getAppJobId(app) === id));
                setRecruiters(mappedRecruiters || []);
                setInterviews(jobInterviews || []);
                setCalendarEvents(adminCalendar?.events || []);
            } catch (error) {
                toast.error(error.message || 'Failed to load job overview');
            } finally {
                setLoading(false);
            }
        };

        fetchOverview();
    }, [id]);

    const stats = useMemo(() => {
        const pending = applications.filter((app) => normalizeApplicationStatus(app.status) === 'pending').length;
        const shortlisted = applications.filter((app) => normalizeApplicationStatus(app.status) === 'shortlisted').length;
        const upcomingInterviews = interviews.filter((iv) => iv.scheduledAt && new Date(iv.scheduledAt) >= new Date()).length;
        return {
            totalApplications: applications.length,
            pending,
            shortlisted,
            recruiters: recruiters.length,
            upcomingInterviews
        };
    }, [applications, recruiters, interviews]);

    const upcomingEvents = useMemo(() => {
        if (!job) return [];
        const now = Date.now();
        return (calendarEvents || [])
            .filter((event) => {
                const eventTime = new Date(event.date).getTime();
                if (!Number.isFinite(eventTime) || eventTime < now) return false;
                if (event?.id?.endsWith(job._id)) return true;
                return event?.detail?.jobTitle === job.title;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 6);
    }, [calendarEvents, job]);

    if (loading) {
        return <div className="p-8 text-sm font-semibold text-slate-600">Loading job overview...</div>;
    }

    if (!job) {
        return (
            <div className="p-8">
                <p className="text-sm text-slate-600 mb-4">Job not found or access denied.</p>
                <Button variant="outline" onClick={() => navigate('/company-admin')}>Back to Dashboard</Button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Button variant="outline" size="sm" className="mb-3 font-bold" onClick={() => navigate('/company-admin')}>
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back
                    </Button>
                    <h2 className="text-2xl font-black text-slate-900">{job.title}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-semibold">
                        <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {job.department || 'Department not set'}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location || 'Location not set'}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="font-bold" onClick={() => navigate(`/edit-job/${job._id}`)}>Edit Job</Button>
                    <Button className="bg-[#4285f4] hover:bg-[#3b79db] text-white font-bold" onClick={() => navigate(`/jobs/${job._id}/candidates`)}>
                        View Candidates
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Applications', value: stats.totalApplications, icon: FileText },
                    { label: 'Pending', value: stats.pending, icon: Clock },
                    { label: 'Shortlisted', value: stats.shortlisted, icon: TrendingUp },
                    { label: 'Recruiters Linked', value: stats.recruiters, icon: UserCheck },
                    { label: 'Upcoming Interviews', value: stats.upcomingInterviews, icon: Users }
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <Card key={item.label} className="p-4 border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] uppercase tracking-wider font-black text-slate-500">{item.label}</p>
                                <Icon className="w-4 h-4 text-slate-400" />
                            </div>
                            <p className="text-2xl font-black text-slate-900">{item.value}</p>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <Card className="p-5 border-slate-100 xl:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-slate-900">Applications Received</h3>
                        <Button variant="outline" size="sm" className="font-bold" onClick={() => navigate(`/jobs/${job._id}/candidates`)}>
                            Open Candidate Board
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {applications.slice(0, 8).map((app) => (
                            <div key={app._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                                <div>
                                    <p className="text-sm font-bold text-slate-900">{app.candidateName || 'Candidate'}</p>
                                    <p className="text-xs text-slate-500">
                                        Applied {new Date(app.appliedAt || app.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className="capitalize bg-slate-100 text-slate-700 border-slate-200">
                                        {normalizeApplicationStatus(app.status)}
                                    </Badge>
                                    <Button size="sm" variant="outline" className="font-bold" onClick={() => navigate(`/applications/${app._id}/review`)}>
                                        Review
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {applications.length === 0 && (
                            <p className="text-sm text-slate-500">No applications for this job yet.</p>
                        )}
                    </div>
                </Card>

                <Card className="p-5 border-slate-100">
                    <h3 className="text-lg font-black text-slate-900 mb-4">Job Details</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Status</span>
                            <Badge className="uppercase bg-slate-900 text-white border-slate-900">{job.status || 'open'}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Deadline</span>
                            <span className="font-semibold text-slate-900">
                                {job.applicationCutoffDate ? new Date(job.applicationCutoffDate).toLocaleString('en-IN') : 'Not set'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Required Applications</span>
                            <span className="font-semibold text-slate-900">{job.requiredApplications || 'Not set'}</span>
                        </div>
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                            <Button variant="outline" className="w-full font-bold justify-between" onClick={() => navigate('/admin-calendar')}>
                                Upcoming Timeline
                                <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="outline" className="w-full font-bold justify-between" onClick={() => navigate('/company-admin?tab=recruiters')}>
                                Recruiter Management
                                <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="outline" className="w-full font-bold justify-between" onClick={() => navigate('/analytics')}>
                                Analytics Dashboard
                                <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <Card className="p-5 border-slate-100">
                    <h3 className="text-lg font-black text-slate-900 mb-4">Recruiters Linked</h3>
                    <div className="space-y-2">
                        {recruiters.slice(0, 8).map((recruiter) => (
                            <div key={recruiter._id} className="rounded-xl border border-slate-100 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-bold text-slate-900">{recruiter?.user?.name || 'Recruiter'}</p>
                                    <Badge className="bg-blue-50 text-blue-700 border-blue-200">{recruiter.matchScore}% match</Badge>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{recruiter?.user?.email || 'No email'}</p>
                            </div>
                        ))}
                        {recruiters.length === 0 && <p className="text-sm text-slate-500">No recruiters matched for this job yet.</p>}
                    </div>
                </Card>

                <Card className="p-5 border-slate-100">
                    <h3 className="text-lg font-black text-slate-900 mb-4">Upcoming Events In This Job</h3>
                    <div className="space-y-2">
                        {upcomingEvents.map((event) => (
                            <div key={event.id} className="rounded-xl border border-slate-100 p-3">
                                <p className="text-sm font-bold text-slate-900">{event.title}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {new Date(event.date).toLocaleString('en-IN')}
                                </p>
                            </div>
                        ))}
                        {upcomingEvents.length === 0 && (
                            <p className="text-sm text-slate-500">No upcoming events found for this job.</p>
                        )}
                    </div>
                </Card>
            </div>

            <Card className="p-5 border-slate-100">
                <h3 className="text-lg font-black text-slate-900 mb-3">Interviews</h3>
                <div className="space-y-2">
                    {interviews.slice(0, 8).map((iv) => (
                        <div key={iv._id} className="rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-slate-900">{iv.candidateName || 'Candidate'}</p>
                                <p className="text-xs text-slate-500">{new Date(iv.scheduledAt).toLocaleString('en-IN')}</p>
                            </div>
                            <Badge className="capitalize bg-slate-100 text-slate-700 border-slate-200">{iv.status || 'scheduled'}</Badge>
                        </div>
                    ))}
                    {interviews.length === 0 && <p className="text-sm text-slate-500">No interviews scheduled yet.</p>}
                </div>
            </Card>

            <div className="flex justify-end">
                <Button variant="outline" className="font-bold" onClick={() => navigate('/company-admin')}>
                    <Briefcase className="w-4 h-4 mr-2" />
                    Back to Company Dashboard
                </Button>
            </div>
        </div>
    );
}

export default CompanyJobOverview;
