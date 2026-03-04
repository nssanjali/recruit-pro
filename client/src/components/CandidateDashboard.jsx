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
import { Briefcase, Building, Clock, MapPin, Search } from 'lucide-react';
import { getApplications, getJobs } from '../lib/api';
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
    const [filter, setFilter] = useState('all');
    const [appStatus, setAppStatus] = useState('all');

    useEffect(() => {
        const load = async () => {
            try {
                const [jobData, appData] = await Promise.all([getJobs(), getApplications()]);
                setJobs(jobData || []);
                setApplications(appData || []);
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
        if (filter === 'applied') list = list.filter((job) => latestApplicationByJob.has(String(job._id)));
        if (filter === 'not_applied') list = list.filter((job) => !latestApplicationByJob.has(String(job._id)));
        return list;
    }, [jobs, search, jobType, filter, latestApplicationByJob]);

    const filteredApplications = useMemo(() => {
        let list = [...applications];
        if (appStatus !== 'all') {
            list = list.filter((app) => normalizeApplicationStatus(app.status) === appStatus);
        }
        return list;
    }, [applications, appStatus]);

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
                                <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
                                <Button size="sm" variant={filter === 'not_applied' ? 'default' : 'outline'} onClick={() => setFilter('not_applied')}>Not Applied</Button>
                                <Button size="sm" variant={filter === 'applied' ? 'default' : 'outline'} onClick={() => setFilter('applied')}>Applied</Button>
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
                                    {filteredApplications.map((app) => (
                                        <div key={app._id} className="rounded-xl border border-slate-200 p-4 bg-white flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900">{app.job?.title || 'Job'}</p>
                                                <p className="text-sm text-slate-500">{app.job?.company || 'Company'} | {app.job?.location || 'Location'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge className="capitalize bg-slate-100 text-slate-700 border-slate-200">{getApplicationStatusLabel(app.status)}</Badge>
                                                <Button variant="outline" onClick={() => navigate(`/jobs/${app.job?._id || app.jobId}`)}>View Job</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

        </div>
    );
}
