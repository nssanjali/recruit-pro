import { useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Input,
    NativeSelect,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from './ui';
import { Building, Clock, Gauge, MapPin, Search, ShieldAlert, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { analyzeCandidateRoleFit, getApplications, getJobs, updateUserDetails, uploadFile } from '../lib/api';
import { getApplicationStatusLabel, normalizeApplicationStatus } from '../lib/applicationStatus';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function CandidateDashboard({ user }) {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [jobType, setJobType] = useState('all');
    const [appStatus, setAppStatus] = useState('all');
    const [fitOnly, setFitOnly] = useState(false);
    const [roleFitLoading, setRoleFitLoading] = useState(false);
    const [roleFitData, setRoleFitData] = useState(null);
    const [activeResumeUrl, setActiveResumeUrl] = useState(user?.resume || '');
    const [uploadedResumeUrl, setUploadedResumeUrl] = useState('');
    const [savingAsProfile, setSavingAsProfile] = useState(false);
    const [liveUser, setLiveUser] = useState(user);
    const reliability = liveUser?.interviewReliability || null;
    const credits = Number(reliability?.credits ?? 100);
    const restrictionLevel = reliability?.restrictionLevel || 'none';
    const restrictionActive = Boolean(reliability?.restrictedUntil) && new Date(reliability.restrictedUntil) > new Date();
    const statusTone = reliability?.isBanned
        ? 'rose'
        : restrictionActive
            ? 'amber'
            : 'emerald';

    const fetchLiveUser = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data?.data) setLiveUser(data.data);
        } catch { /* silent — fallback to prop */ }
    };

    useEffect(() => {
        const load = async () => {
            try {
                const [jobData, appData] = await Promise.all([getJobs(), getApplications()]);
                setJobs(jobData || []);
                setApplications(appData || []);
                fetchLiveUser(); // pull fresh reliability
            } catch (error) {
                toast.error(error.message || 'Failed to load candidate dashboard');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const latestApplicationByJob = useMemo(() => {
        const map = new Map();
        applications.forEach((app) => {
            const key = String(app.jobId || app.job?._id || '');
            if (!key || map.has(key)) return;
            map.set(key, app);
        });
        return map;
    }, [applications]);

    const jobTypes = useMemo(
        () => Array.from(new Set(jobs.map((j) => j.jobType).filter(Boolean))),
        [jobs]
    );

    const filteredJobs = useMemo(() => {
        let list = [...jobs];
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((job) =>
                [job.title, job.company, job.location]
                    .filter(Boolean)
                    .some((v) => String(v).toLowerCase().includes(q))
            );
        }
        if (jobType !== 'all') list = list.filter((job) => job.jobType === jobType);
        if (fitOnly && roleFitData?.recommendedJobIds?.length > 0) {
            const fitSet = new Set(roleFitData.recommendedJobIds.map((id) => String(id)));
            list = list.filter((job) => fitSet.has(String(job._id)));
        }
        return list;
    }, [jobs, search, jobType, fitOnly, roleFitData]);

    const filteredApplications = useMemo(() => {
        let list = [...applications];
        if (appStatus !== 'all') {
            list = list.filter((app) => normalizeApplicationStatus(app.status) === appStatus);
        }
        return list;
    }, [applications, appStatus]);

    const jobFitScoreById = useMemo(() => {
        const map = new Map();
        (roleFitData?.recommendedJobs || []).forEach((job) => {
            map.set(String(job._id), Number(job.fitScore || 0));
        });
        return map;
    }, [roleFitData]);

    const runRoleFitAnalysis = async (resumeUrl) => {
        try {
            setRoleFitLoading(true);
            const data = await analyzeCandidateRoleFit({ resumeUrl });
            setRoleFitData(data);
            setFitOnly(true);
            toast.success('Role fit analysis completed');
        } catch (error) {
            toast.error(error.message || 'Failed to analyze role fit');
        } finally {
            setRoleFitLoading(false);
        }
    };

    const handleUseProfileResume = async () => {
        const profileResume = String(user?.resume || '').trim();
        setActiveResumeUrl(profileResume);
        await runRoleFitAnalysis(profileResume || undefined);
    };

    const handleResumeUpload = async (file) => {
        if (!file) return;
        try {
            toast.info('Uploading resume...');
            const resumeUrl = await uploadFile(file, 'resume');
            setUploadedResumeUrl(resumeUrl);
            setActiveResumeUrl(resumeUrl);
            toast.success('Resume uploaded. Running role-fit analysis...');
            await runRoleFitAnalysis(resumeUrl);
        } catch (error) {
            toast.error(error.message || 'Failed to upload resume');
        }
    };

    const handleSaveUploadedAsProfile = async () => {
        if (!uploadedResumeUrl) return;
        try {
            setSavingAsProfile(true);
            await updateUserDetails({ resume: uploadedResumeUrl });
            const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...existingUser, resume: uploadedResumeUrl }));
            toast.success('Uploaded resume saved to profile');
        } catch (error) {
            toast.error(error.message || 'Failed to save resume to profile');
        } finally {
            setSavingAsProfile(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-blue-50 p-6">
                <h2 className="text-3xl font-black text-slate-900">
                    Welcome back, {user?.name?.split(' ')[0] || 'Candidate'}
                </h2>
                <p className="text-slate-600 mt-1">Use filters to find jobs quickly and track your application pipeline.</p>
            </div>

            <Card className="border-slate-200">
                <CardHeader className="border-b border-slate-100">
                    <CardTitle className="text-xl font-black flex items-center gap-2">
                        <Gauge className="w-5 h-5 text-blue-600" />
                        Interview Reliability
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-xl border border-slate-200 p-4 bg-white">
                            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Credits</p>
                            <p className="text-3xl font-black text-slate-900 mt-2">{credits}</p>
                            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`${statusTone === 'rose' ? 'bg-rose-500' : statusTone === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'} h-full`}
                                    style={{ width: `${Math.max(0, Math.min(100, credits))}%` }}
                                />
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4 bg-white">
                            <p className="text-xs font-black uppercase tracking-wider text-slate-500">No-shows (90 days)</p>
                            <p className="text-3xl font-black text-slate-900 mt-2">{reliability?.noShowsLast90Days ?? 0}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4 bg-white">
                            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Account Status</p>
                            <div className="mt-2 flex items-center gap-2">
                                {reliability?.isBanned || restrictionActive ? (
                                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                                ) : (
                                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                )}
                                <Badge className={`capitalize ${reliability?.isBanned ? 'bg-rose-100 text-rose-700 border-rose-200' : restrictionActive ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                                    {reliability?.isBanned ? 'banned' : restrictionLevel.replace('_', ' ')}
                                </Badge>
                            </div>
                            {restrictionActive && (
                                <p className="text-xs text-slate-500 mt-2">
                                    Restricted until {new Date(reliability.restrictedUntil).toLocaleString('en-IN')}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader className="border-b border-slate-100">
                    <CardTitle className="text-xl font-black flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-violet-600" />
                        AI Role Fit Finder
                    </CardTitle>
                    <p className="text-sm text-slate-600">
                        Use your profile resume or upload a new one. We will identify your best-fit roles and show matching jobs.
                    </p>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={handleUseProfileResume} disabled={roleFitLoading}>
                            {roleFitLoading ? 'Analyzing...' : 'Use Profile Resume'}
                        </Button>
                        <label className="inline-flex">
                            <input
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => handleResumeUpload(e.target.files?.[0])}
                            />
                            <span className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-sm font-medium cursor-pointer">
                                <Upload className="w-4 h-4 mr-2" />
                                Upload & Analyze Resume
                            </span>
                        </label>
                        {uploadedResumeUrl && uploadedResumeUrl !== user?.resume && (
                            <Button variant="outline" onClick={handleSaveUploadedAsProfile} disabled={savingAsProfile}>
                                {savingAsProfile ? 'Saving...' : 'Save Uploaded Resume to Profile'}
                            </Button>
                        )}
                    </div>
                    <p className="text-xs text-slate-500">
                        Active resume source: {activeResumeUrl ? 'available' : 'not selected'}
                    </p>
                    {roleFitData?.topRoles?.length > 0 && (
                        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                            <p className="text-xs font-black uppercase tracking-wide text-violet-700 mb-2">Top Recommended Roles</p>
                            <div className="flex flex-wrap gap-2">
                                {roleFitData.topRoles.map((role) => (
                                    <Badge key={role.role} className="bg-white border-violet-200 text-violet-700">
                                        {role.role} • {role.score}%
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader className="border-b border-slate-100">
                    <CardTitle className="text-xl font-black">Candidate Workspace</CardTitle>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="relative md:col-span-2">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, company, location" />
                        </div>
                        <NativeSelect value={jobType} onChange={(e) => setJobType(e.target.value)}>
                            <option value="all">All Job Types</option>
                            {jobTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                        </NativeSelect>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <Tabs defaultValue="discover">
                        <TabsList className="bg-slate-100">
                            <TabsTrigger value="discover">Discover Jobs</TabsTrigger>
                            <TabsTrigger value="applications">My Applications</TabsTrigger>
                        </TabsList>

                        <TabsContent value="discover" className="space-y-4 mt-4">
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    size="sm"
                                    variant={fitOnly ? 'default' : 'outline'}
                                    onClick={() => setFitOnly((prev) => !prev)}
                                    disabled={!roleFitData?.recommendedJobIds?.length}
                                >
                                    Fit Jobs Only
                                </Button>
                            </div>

                            {loading ? (
                                <p className="text-slate-500">Loading jobs...</p>
                            ) : filteredJobs.length === 0 ? (
                                <p className="text-slate-500">No jobs match your filters.</p>
                            ) : (
                                <div className="space-y-3">
                                    {filteredJobs.map((job) => {
                                        const app = latestApplicationByJob.get(String(job._id));
                                        return (
                                            <div key={job._id} className="rounded-xl border border-slate-200 p-4 bg-white">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900">{job.title}</p>
                                                        <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                                            <Building className="w-4 h-4" /> {job.company || 'Company'}
                                                            <MapPin className="w-4 h-4 ml-2" /> {job.location || 'Location'}
                                                        </p>
                                                    </div>
                                                    {app && <Badge className="capitalize bg-emerald-100 text-emerald-700 border-emerald-200">{getApplicationStatusLabel(app.status)}</Badge>}
                                                    {jobFitScoreById.has(String(job._id)) && (
                                                        <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                                                            Fit {jobFitScoreById.get(String(job._id))}%
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                                    <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(job.createdAt).toLocaleDateString()}</span>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" onClick={() => navigate(`/jobs/${job._id}`)}>View Details</Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="applications" className="space-y-4 mt-4">
                            <div className="flex gap-2 flex-wrap">
                                <Button size="sm" variant={appStatus === 'all' ? 'default' : 'outline'} onClick={() => setAppStatus('all')}>All</Button>
                                <Button size="sm" variant={appStatus === 'pending' ? 'default' : 'outline'} onClick={() => setAppStatus('pending')}>Pending</Button>
                                <Button size="sm" variant={appStatus === 'reviewing' ? 'default' : 'outline'} onClick={() => setAppStatus('reviewing')}>Reviewing</Button>
                                <Button size="sm" variant={appStatus === 'shortlisted' ? 'default' : 'outline'} onClick={() => setAppStatus('shortlisted')}>Shortlisted</Button>
                                <Button size="sm" variant={appStatus === 'rejected' ? 'default' : 'outline'} onClick={() => setAppStatus('rejected')}>Rejected</Button>
                            </div>
                            {filteredApplications.length === 0 ? (
                                <p className="text-slate-500">No applications found.</p>
                            ) : (
                                <div className="space-y-3">
                                    {filteredApplications.map((app) => {
                                        const jobStatus = app.job?.status || 'unknown';
                                        const isJobClosed = jobStatus === 'closed' || jobStatus === 'filled';
                                        return (
                                            <div key={app._id} className="rounded-xl border border-slate-200 p-4 bg-white">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-bold text-slate-900">{app.job?.title || 'Job'}</p>
                                                            {isJobClosed && (
                                                                <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
                                                                    Job {jobStatus}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-slate-500 mt-1">{app.job?.company || 'Company'} | {app.job?.location || 'Location'}</p>
                                                        <p className="text-xs text-slate-400 mt-1">Applied {new Date(app.appliedAt || app.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <Badge className="capitalize bg-slate-100 text-slate-700 border-slate-200">{getApplicationStatusLabel(app.status)}</Badge>
                                                        <Button size="sm" variant="outline" onClick={() => navigate(`/jobs/${app.job?._id || app.jobId}`)}>View Job</Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

        </div>
    );
}
