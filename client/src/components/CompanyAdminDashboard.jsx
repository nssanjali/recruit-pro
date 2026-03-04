import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase,
    Clock,
    TrendingUp,
    Users,
    Plus,
    Building,
    MapPin,
    Calendar,
    BarChart3,
    Power,
    Lock,
    Hash,
    Video,
    CheckCircle2,
    ExternalLink,
    RefreshCw,
    Search
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Badge,
    Button,
    Input,
    NativeSelect,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from './ui';
import { motion } from 'motion/react';
import { getJobs, deleteJob, updateJob, retryFailedSchedules } from '../lib/api';
import { getApplications } from '../lib/applicationApi';
import { toast } from 'sonner';
import { RecruiterManagement } from './RecruiterManagement';
import { JobRecruiterPanel } from './JobRecruiterPanel';
import { getApplicationStatusLabel, normalizeApplicationStatus } from '../lib/applicationStatus';

const API = 'http://localhost:5000/api';
const apiFetch = async (path, opts = {}) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API}${path}`, {
        ...opts,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(opts.headers || {})
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || 'Request failed');
    }
    return response.json();
};

export function CompanyAdminDashboard({ user }) {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recruiterPanelJob, setRecruiterPanelJob] = useState(null); // job shown in recruiter panel
    const [activeTab, setActiveTab] = useState('jobs');
    const [calendarConnected, setCalendarConnected] = useState(false);
    const [calendarStatusLoading, setCalendarStatusLoading] = useState(false);
    const [calendarStatus, setCalendarStatus] = useState(null);
    const [retrySchedulingLoading, setRetrySchedulingLoading] = useState(false);
    const [jobSearch, setJobSearch] = useState('');
    const [jobStatusFilter, setJobStatusFilter] = useState('all');
    const [jobDepartmentFilter, setJobDepartmentFilter] = useState('all');
    const [jobSortBy, setJobSortBy] = useState('newest');
    const [applicationSearch, setApplicationSearch] = useState('');
    const [applicationStatusFilter, setApplicationStatusFilter] = useState('all');
    const [applicationJobFilter, setApplicationJobFilter] = useState('all');
    const [applicationSortBy, setApplicationSortBy] = useState('latest');

    useEffect(() => {
        fetchData();
        fetchCalendarStatus();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const requestedTab = params.get('tab');
        if (requestedTab && ['jobs', 'applications', 'recruiters', 'analytics', 'calendar'].includes(requestedTab)) {
            setActiveTab(requestedTab);
        }
        if (params.get('calendar_connected') === 'true') {
            setActiveTab('calendar');
            toast.success('Google Calendar connected for company-admin scheduling.');
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchCalendarStatus();
        }
    }, []);

    const fetchData = async () => {
        try {
            const [jobsData, applicationsData] = await Promise.all([
                getJobs(),
                getApplications()
            ]);

            setJobs(jobsData || []);

            // Filter applications to only show those for this company admin's jobs
            const myJobIds = (jobsData || []).map(j => j._id);
            const myApplications = (applicationsData || []).filter(app =>
                myJobIds.includes(app.jobId)
            );

            // Enrich applications with job titles
            const enrichedApplications = myApplications.map(app => {
                const job = jobsData.find(j => j._id === app.jobId);
                return {
                    ...app,
                    jobTitle: job?.title || 'Unknown Position'
                };
            });

            setApplications(enrichedApplications);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleJobStatus = async (jobId, currentStatus) => {
        try {
            const newStatus = currentStatus === 'open' ? 'closed' : 'open';
            await updateJob(jobId, { status: newStatus });
            toast.success(`Job ${newStatus === 'open' ? 'activated' : 'deactivated'} successfully!`);
            fetchData();
        } catch (err) {
            toast.error('Failed to update job status');
        }
    };

    const fetchCalendarStatus = async () => {
        setCalendarStatusLoading(true);
        try {
            const data = await apiFetch('/calendar/status');
            setCalendarConnected(!!data.googleConnected);
            setCalendarStatus(data);
        } catch (err) {
            console.error('Calendar status error:', err);
            setCalendarConnected(false);
            setCalendarStatus(null);
        } finally {
            setCalendarStatusLoading(false);
        }
    };

    const connectCompanyCalendar = async () => {
        try {
            const data = await apiFetch('/calendar/auth');
            if (data.url) {
                window.location.href = data.url;
                return;
            }
            toast.error('Failed to open Google authorization');
        } catch (err) {
            toast.error(err.message || 'Failed to connect Google Calendar');
        }
    };

    const handleRetrySchedules = async () => {
        setRetrySchedulingLoading(true);
        try {
            const result = await retryFailedSchedules();
            toast.success(
                `Retry complete: ${result.totalScheduled || 0} scheduled, ${result.totalFailed || 0} failed, ${result.totalSkipped || 0} skipped`
            );
            await fetchData();
        } catch (err) {
            toast.error(err.message || 'Failed to retry scheduling');
        } finally {
            setRetrySchedulingLoading(false);
        }
    };

    const openJobs = jobs.filter(j => j.status === 'open').length;
    const totalCandidates = applications.length;
    const pendingApplications = applications.filter(a => normalizeApplicationStatus(a.status) === 'pending').length;
    const departments = useMemo(
        () => Array.from(new Set(jobs.map((j) => j.department).filter(Boolean))),
        [jobs]
    );
    const jobTitles = useMemo(
        () => Array.from(new Set(applications.map((a) => a.jobTitle).filter(Boolean))),
        [applications]
    );

    const filteredJobs = useMemo(() => {
        const filtered = jobs.filter((job) => {
            const searchTerm = jobSearch.trim().toLowerCase();
            const matchesSearch = !searchTerm || [
                job.title,
                job.department,
                job.location
            ].filter(Boolean).some((value) => String(value).toLowerCase().includes(searchTerm));
            const matchesStatus = jobStatusFilter === 'all' || (job.status || '').toLowerCase() === jobStatusFilter;
            const matchesDepartment = jobDepartmentFilter === 'all' || job.department === jobDepartmentFilter;
            return matchesSearch && matchesStatus && matchesDepartment;
        });
        const sorted = [...filtered];
        if (jobSortBy === 'newest') {
            sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        } else if (jobSortBy === 'oldest') {
            sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        } else if (jobSortBy === 'title_asc') {
            sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
        } else if (jobSortBy === 'title_desc') {
            sorted.sort((a, b) => String(b.title || '').localeCompare(String(a.title || '')));
        } else if (jobSortBy === 'status') {
            sorted.sort((a, b) => String(a.status || '').localeCompare(String(b.status || '')));
        }
        return sorted;
    }, [jobs, jobSearch, jobStatusFilter, jobDepartmentFilter, jobSortBy]);

    const filteredApplications = useMemo(() => {
        const filtered = applications.filter((app) => {
            const searchTerm = applicationSearch.trim().toLowerCase();
            const matchesSearch = !searchTerm || [
                app.candidateName,
                app.jobTitle
            ].filter(Boolean).some((value) => String(value).toLowerCase().includes(searchTerm));
            const appStatus = normalizeApplicationStatus(app.status);
            const matchesStatus = applicationStatusFilter === 'all' || appStatus === applicationStatusFilter;
            const matchesJob = applicationJobFilter === 'all' || app.jobTitle === applicationJobFilter;
            return matchesSearch && matchesStatus && matchesJob;
        });
        const sorted = [...filtered];
        if (applicationSortBy === 'latest') {
            sorted.sort((a, b) => new Date(b.appliedAt || b.createdAt || 0) - new Date(a.appliedAt || a.createdAt || 0));
        } else if (applicationSortBy === 'oldest') {
            sorted.sort((a, b) => new Date(a.appliedAt || a.createdAt || 0) - new Date(b.appliedAt || b.createdAt || 0));
        } else if (applicationSortBy === 'score_high') {
            sorted.sort((a, b) => Number((b.finalScore ?? b.matchScore) ?? -1) - Number((a.finalScore ?? a.matchScore) ?? -1));
        } else if (applicationSortBy === 'score_low') {
            sorted.sort((a, b) => Number((a.finalScore ?? a.matchScore) ?? -1) - Number((b.finalScore ?? b.matchScore) ?? -1));
        } else if (applicationSortBy === 'name_asc') {
            sorted.sort((a, b) => String(a.candidateName || '').localeCompare(String(b.candidateName || '')));
        }
        return sorted;
    }, [applications, applicationSearch, applicationStatusFilter, applicationJobFilter, applicationSortBy]);

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="relative mb-8">
                    <motion.div
                        className="w-24 h-24 rounded-3xl border-2 border-slate-100 border-t-[#4285f4] animate-spin"
                        style={{ borderRadius: '30%' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <BarChart3 className="w-8 h-8 text-[#8b5cf6] animate-pulse" />
                    </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Company Dashboard</h3>
                <p className="mt-2 text-slate-500 font-medium">Loading your data...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-4">
                        {user?.avatar && (
                            <img src={user.avatar} alt="Company Logo" className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-100" />
                        )}
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            {user?.companyInfo?.companyName ? `${user.companyInfo.companyName} Dashboard` : 'Company Dashboard'}
                        </h2>
                    </div>
                    <p className="text-slate-500 text-sm flex items-center gap-2">
                        <Building className="w-4 h-4 text-[#10b981]" />
                        Manage your job postings and track applications
                    </p>
                </div>

                <Button
                    onClick={() => navigate('/post-job')}
                    className="bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 gap-2 font-bold px-6"
                >
                    <Plus className="w-4 h-4" />
                    Post Job
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Jobs', value: jobs.length.toString(), icon: Briefcase, color: 'from-[#4285f4] to-[#06b6d4]', trend: `${openJobs} Open` },
                    { label: 'Applications', value: totalCandidates.toString(), icon: Users, color: 'from-[#8b5cf6] to-[#d946ef]', trend: `${pendingApplications} Pending` },
                    { label: 'Active Postings', value: openJobs.toString(), icon: TrendingUp, color: 'from-[#10b981] to-[#34d399]', trend: 'Live Now' },
                    {
                        label: 'This Month', value: jobs.filter(j => {
                            const jobDate = new Date(j.createdAt);
                            const now = new Date();
                            return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
                        }).length.toString(), icon: Clock, color: 'from-[#f59e0b] to-[#fbbf24]', trend: 'New Jobs'
                    },
                ].map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="relative overflow-hidden border-none shadow-sm hover:shadow-xl transition-all group p-6 bg-white">
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.03] rounded-bl-full group-hover:opacity-[0.06] transition-all duration-700`} />
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg shadow-[#4285f4]/5 group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <Badge variant="secondary" className="bg-slate-50 text-slate-500 border-slate-100 font-bold text-[10px]">
                                        {stat.trend}
                                    </Badge>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">{stat.value}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {/* Main Content */}
            <Card className="border-slate-100 shadow-lg overflow-hidden bg-white">
                <CardHeader className="p-6 sm:p-8 border-b border-slate-50">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="bg-slate-100/80 p-1 rounded-xl mb-6 flex-wrap h-auto">
                            <TabsTrigger value="jobs" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">MY JOBS</TabsTrigger>
                            <TabsTrigger value="applications" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">APPLICATIONS</TabsTrigger>
                            <TabsTrigger value="recruiters" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">RECRUITERS</TabsTrigger>
                            <TabsTrigger value="analytics" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">ANALYTICS</TabsTrigger>
                            <TabsTrigger value="calendar" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">CALENDAR API</TabsTrigger>
                        </TabsList>

                        {/* Jobs Tab */}
                        <TabsContent value="jobs" className="space-y-4">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">Your Job Postings</h3>
                                    <p className="text-sm text-slate-500 font-medium mt-0.5">Manage and monitor your job openings</p>
                                </div>
                                <Button onClick={() => navigate('/post-job')} className="bg-[#4285f4] hover:bg-[#3b79db] text-white font-bold">
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Job
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 md:grid-cols-5">
                                <div className="relative md:col-span-2">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={jobSearch}
                                        onChange={(e) => setJobSearch(e.target.value)}
                                        placeholder="Search title, department, location"
                                        className="h-10 border-slate-200 bg-white pl-9"
                                    />
                                </div>
                                <NativeSelect value={jobStatusFilter} onChange={(e) => setJobStatusFilter(e.target.value)} className="h-10 border-slate-200 bg-white text-sm">
                                    <option value="all">All Status</option>
                                    <option value="open">Open</option>
                                    <option value="closed">Closed</option>
                                    <option value="draft">Draft</option>
                                </NativeSelect>
                                <NativeSelect value={jobDepartmentFilter} onChange={(e) => setJobDepartmentFilter(e.target.value)} className="h-10 border-slate-200 bg-white text-sm">
                                    <option value="all">All Depts</option>
                                    {departments.map((department) => (
                                        <option key={department} value={department}>{department}</option>
                                    ))}
                                </NativeSelect>
                                <NativeSelect value={jobSortBy} onChange={(e) => setJobSortBy(e.target.value)} className="h-10 border-slate-200 bg-white text-sm">
                                    <option value="newest">Newest</option>
                                    <option value="oldest">Oldest</option>
                                    <option value="title_asc">Title A-Z</option>
                                    <option value="title_desc">Title Z-A</option>
                                    <option value="status">Status</option>
                                </NativeSelect>
                            </div>

                            {jobs.length > 0 ? (
                                <div className="space-y-3">
                                    {filteredJobs.map((job, index) => (
                                        <motion.div
                                            key={job._id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <Card className="p-5 sm:p-6 hover:shadow-md transition-all border-slate-100">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-4">
                                                        {user?.avatar ? (
                                                            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg border border-slate-100 flex-shrink-0">
                                                                <img src={user.avatar} alt="Company Logo" className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] flex items-center justify-center shadow-lg flex-shrink-0">
                                                                <Briefcase className="w-6 h-6 text-white" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 mb-1">{job.title}</h4>
                                                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                                                                <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {job.department}</span>
                                                                <span>|</span>
                                                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                                                                <span>|</span>
                                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                            {(job.applicationCutoffDate || job.requiredApplications) && (
                                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                                    <Lock className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                                                    {job.applicationCutoffDate && (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-bold text-amber-800">
                                                                            <Clock className="w-2.5 h-2.5" />
                                                                            Closes {new Date(job.applicationCutoffDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                                                        </span>
                                                                    )}
                                                                    {job.requiredApplications && (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-bold text-amber-800">
                                                                            <Hash className="w-2.5 h-2.5" />
                                                                            Quota: {job.requiredApplications}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
                                                    <Badge
                                                        variant={
                                                            job.status === 'open' ? 'success' :
                                                                job.status === 'closed' ? 'destructive' :
                                                                    'secondary'
                                                        }
                                                        className="uppercase tracking-wide text-[10px] font-black"
                                                    >
                                                        {job.status === 'closed' ? 'INACTIVE' : job.status}
                                                    </Badge>
                                                    {job.status === 'draft' ? (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="font-bold"
                                                                onClick={() => navigate(`/edit-job/${job._id}`)}
                                                            >
                                                                Edit Draft
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="font-bold text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                onClick={async () => {
                                                                    if (window.confirm('Are you sure you want to delete this draft?')) {
                                                                        try {
                                                                            await deleteJob(job._id);
                                                                            toast.success('Draft deleted');
                                                                            fetchData();
                                                                        } catch (err) {
                                                                            toast.error('Failed to delete draft');
                                                                        }
                                                                    }
                                                                }}
                                                            >
                                                                Delete
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className={`font-bold min-w-[100px] ${job.status === 'open'
                                                                    ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                                                                    : 'text-slate-600 hover:text-slate-700 hover:bg-slate-50'
                                                                    }`}
                                                                onClick={() => toggleJobStatus(job._id, job.status)}
                                                                title={job.status === 'open' ? 'Deactivate job' : 'Activate job'}
                                                            >
                                                                <Power className="w-4 h-4 mr-1" />
                                                                {job.status === 'open' ? 'Active' : 'Inactive'}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="font-bold min-w-[90px]"
                                                                onClick={() => navigate(`/company-admin/jobs/${job._id}`)}
                                                            >
                                                                View Job
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="font-bold min-w-[120px]"
                                                                onClick={() => navigate(`/jobs/${job._id}/candidates`)}
                                                            >
                                                                View Candidates
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="font-bold min-w-[110px] text-teal-700 border-teal-300 hover:bg-teal-50"
                                                                onClick={() => setRecruiterPanelJob(job)}
                                                            >
                                                                <Users className="w-3.5 h-3.5 mr-1" />
                                                                Recruiters
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
                                    {filteredJobs.length === 0 && (
                                        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                                            <p className="text-sm font-medium text-slate-500">No jobs match the selected filters.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                        <Briefcase className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900 mb-2">No Jobs Posted Yet</h4>
                                    <p className="text-sm text-slate-500 font-medium mb-6">Start by creating your first job posting</p>
                                    <Button onClick={() => navigate('/post-job')} className="bg-[#4285f4] hover:bg-[#3b79db] text-white font-bold">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Post Your First Job
                                    </Button>
                                </div>
                            )}
                        </TabsContent>

                        {/* Applications Tab */}
                        <TabsContent value="applications" className="space-y-4">
                            <div className="mb-6">
                                <h3 className="text-xl font-black text-slate-900">Applications</h3>
                                <p className="text-sm text-slate-500 font-medium mt-0.5">Review candidates who applied to your jobs</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 md:grid-cols-5">
                                <div className="relative md:col-span-2">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={applicationSearch}
                                        onChange={(e) => setApplicationSearch(e.target.value)}
                                        placeholder="Search candidate or job title"
                                        className="h-10 border-slate-200 bg-white pl-9"
                                    />
                                </div>
                                <NativeSelect value={applicationStatusFilter} onChange={(e) => setApplicationStatusFilter(e.target.value)} className="h-10 border-slate-200 bg-white text-sm">
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="reviewing">Reviewing</option>
                                    <option value="shortlisted">Shortlisted</option>
                                    <option value="accepted">Accepted</option>
                                    <option value="rejected">Rejected</option>
                                </NativeSelect>
                                <NativeSelect value={applicationJobFilter} onChange={(e) => setApplicationJobFilter(e.target.value)} className="h-10 border-slate-200 bg-white text-sm">
                                    <option value="all">All Jobs</option>
                                    {jobTitles.map((title) => (
                                        <option key={title} value={title}>{title}</option>
                                    ))}
                                </NativeSelect>
                                <NativeSelect value={applicationSortBy} onChange={(e) => setApplicationSortBy(e.target.value)} className="h-10 border-slate-200 bg-white text-sm">
                                    <option value="latest">Latest</option>
                                    <option value="oldest">Oldest</option>
                                    <option value="score_high">Score High-Low</option>
                                    <option value="score_low">Score Low-High</option>
                                    <option value="name_asc">Name A-Z</option>
                                </NativeSelect>
                            </div>

                            {applications.length > 0 ? (
                                <div className="space-y-3">
                                    {filteredApplications.map((app, index) => (
                                        <motion.div
                                            key={app._id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <Card className="p-5 sm:p-6 hover:shadow-md transition-all border-slate-100">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-black text-lg shadow-lg">
                                                            {app.candidateName?.split(' ').map(n => n[0]).join('') || 'C'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 mb-1">{app.candidateName || 'Candidate'}</h4>
                                                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                                                                <span className="flex items-center gap-1">
                                                                    <Briefcase className="w-3 h-3" />
                                                                    {app.jobTitle || 'Job Position'}
                                                                </span>
                                                                <span>|</span>
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    Applied {new Date(app.appliedAt || app.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                                        <Badge
                                                            className={`uppercase tracking-wide text-[10px] font-black ${normalizeApplicationStatus(app.status) === 'accepted' ? 'bg-green-100 text-green-700 border-green-200' :
                                                                normalizeApplicationStatus(app.status) === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                    normalizeApplicationStatus(app.status) === 'shortlisted' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                                }`}
                                                        >
                                                            {getApplicationStatusLabel(app.status)}
                                                        </Badge>
                                                        {(app.finalScore !== undefined || app.matchScore !== undefined) && (
                                                            <Badge
                                                                className={`font-black ${((app.finalScore ?? app.matchScore) ?? 0) >= 80
                                                                    ? 'bg-green-100 text-green-700 border-green-200'
                                                                    : ((app.finalScore ?? app.matchScore) ?? 0) >= 50
                                                                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                                        : 'bg-orange-100 text-orange-700 border-orange-200'
                                                                    }`}
                                                            >
                                                                {Math.round((app.finalScore ?? app.matchScore) ?? 0)}% Match
                                                            </Badge>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="font-bold"
                                                            onClick={() => navigate(`/applications/${app._id}/review`)}
                                                        >
                                                            Review
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
                                    {filteredApplications.length === 0 && (
                                        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                                            <p className="text-sm font-medium text-slate-500">No applications match the selected filters.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 rounded-xl">
                                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm text-slate-500">No applications yet</p>
                                </div>
                            )}
                        </TabsContent>

                        {/* Analytics Tab */}
                        <TabsContent value="analytics" className="space-y-6">
                            <div className="mb-6">
                                <h3 className="text-xl font-black text-slate-900">Analytics</h3>
                                <p className="text-sm text-slate-500 font-medium mt-0.5">Performance metrics for your job postings</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Application Status */}
                                <Card className="p-6 border-slate-100">
                                    <h4 className="font-bold text-slate-900 mb-4">Application Status</h4>
                                    <div className="space-y-3">
                                        {['pending', 'reviewing', 'shortlisted', 'rejected', 'accepted'].map(status => {
                                            const count = applications.filter(app => normalizeApplicationStatus(app.status) === status).length;
                                            const percentage = applications.length > 0 ? (count / applications.length * 100).toFixed(0) : 0;
                                            return (
                                                <div key={status} className="space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="font-medium text-slate-700 capitalize">{status}</span>
                                                        <span className="font-bold text-slate-900">{count} ({percentage}%)</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${status === 'accepted' ? 'bg-emerald-500' :
                                                                status === 'rejected' ? 'bg-red-500' :
                                                                    status === 'shortlisted' ? 'bg-blue-500' :
                                                                        status === 'reviewing' ? 'bg-yellow-500' :
                                                                            'bg-slate-400'
                                                                }`}
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>

                                {/* Jobs Overview */}
                                <Card className="p-6 border-slate-100">
                                    <h4 className="font-bold text-slate-900 mb-4">Jobs Overview</h4>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                            <div>
                                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Open Jobs</p>
                                                <p className="text-2xl font-black text-emerald-900 mt-1">
                                                    {jobs.filter(j => j.status === 'open').length}
                                                </p>
                                            </div>
                                            <Briefcase className="w-8 h-8 text-emerald-600" />
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <div>
                                                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Closed Jobs</p>
                                                <p className="text-2xl font-black text-slate-900 mt-1">
                                                    {jobs.filter(j => j.status === 'closed').length}
                                                </p>
                                            </div>
                                            <Briefcase className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                                            <div>
                                                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Applications</p>
                                                <p className="text-2xl font-black text-blue-900 mt-1">{applications.length}</p>
                                            </div>
                                            <Users className="w-8 h-8 text-blue-600" />
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* Recruiters Tab */}
                        <TabsContent value="recruiters" className="space-y-4">
                            <RecruiterManagement />
                        </TabsContent>

                        {/* Calendar API Tab */}
                        <TabsContent value="calendar" className="space-y-4">
                            <div className="mb-6">
                                <h3 className="text-xl font-black text-slate-900">Google Calendar Integration</h3>
                                <p className="text-sm text-slate-500 font-medium mt-0.5">
                                    Connect once as company admin so interview Meet links can still be generated even when recruiter calendars are not connected.
                                </p>
                            </div>

                            <Card className="p-6 border-slate-100">
                                <div className="flex flex-col lg:flex-row gap-6 lg:items-center lg:justify-between">
                                    <div className="space-y-3">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-black ${calendarConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                            {calendarConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                            {calendarConnected ? 'Connected' : 'Not Connected'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">Company-level Meet Link Provider</p>
                                            <p className="text-xs text-slate-500">
                                                Scheduler priority: recruiter calendar first, then this company-admin calendar.
                                            </p>
                                        </div>
                                        {calendarStatus?.tokenExpiry && (
                                            <p className="text-xs text-slate-500">
                                                Token expiry: {new Date(calendarStatus.tokenExpiry).toLocaleString('en-IN')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            className="font-bold"
                                            onClick={handleRetrySchedules}
                                            disabled={retrySchedulingLoading}
                                        >
                                            <RefreshCw className={`w-4 h-4 mr-2 ${retrySchedulingLoading ? 'animate-spin' : ''}`} />
                                            Retry Failed/Skipped
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="font-bold"
                                            onClick={fetchCalendarStatus}
                                            disabled={calendarStatusLoading}
                                        >
                                            <RefreshCw className={`w-4 h-4 mr-2 ${calendarStatusLoading ? 'animate-spin' : ''}`} />
                                            Refresh
                                        </Button>
                                        <Button
                                            className="bg-[#4285f4] hover:bg-[#3b79db] text-white font-bold"
                                            onClick={connectCompanyCalendar}
                                        >
                                            <Video className="w-4 h-4 mr-2" />
                                            {calendarConnected ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
                                            <ExternalLink className="w-3.5 h-3.5 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </CardHeader>
            </Card>

            {/* Job Posting Modal */}

            {/* Recruiter Panel — slide-in drawer */}
            {
                recruiterPanelJob && (
                    <JobRecruiterPanel
                        job={recruiterPanelJob}
                        onClose={() => setRecruiterPanelJob(null)}
                    />
                )
            }
        </div >
    );
}

