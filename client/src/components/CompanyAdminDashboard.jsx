import { useState, useEffect } from 'react';
import {
    Briefcase,
    Clock,
    TrendingUp,
    Users,
    Plus,
    Building,
    MapPin,
    Calendar,
    BarChart3
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Badge,
    Button,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from './ui';
import { motion, AnimatePresence } from 'motion/react';
import { JobPosting } from './JobPosting';
import { getJobs } from '../lib/api';
import { getApplications } from '../lib/applicationApi';

export function CompanyAdminDashboard({ user }) {
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [showJobPosting, setShowJobPosting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
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
            setApplications(myApplications);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

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

    const openJobs = jobs.filter(j => j.status === 'open').length;
    const totalCandidates = applications.length;
    const pendingApplications = applications.filter(a => a.status === 'pending').length;

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Company Dashboard</h2>
                    </div>
                    <p className="text-slate-500 text-sm flex items-center gap-2">
                        <Building className="w-4 h-4 text-[#10b981]" />
                        Manage your job postings and track applications
                    </p>
                </div>

                <Button
                    onClick={() => setShowJobPosting(true)}
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
                <CardHeader className="p-8 border-b border-slate-50">
                    <Tabs defaultValue="jobs" className="w-full">
                        <TabsList className="bg-slate-100/80 p-1 rounded-xl mb-6">
                            <TabsTrigger value="jobs" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">MY JOBS</TabsTrigger>
                            <TabsTrigger value="applications" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">APPLICATIONS</TabsTrigger>
                            <TabsTrigger value="analytics" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">ANALYTICS</TabsTrigger>
                        </TabsList>

                        {/* Jobs Tab */}
                        <TabsContent value="jobs" className="space-y-4">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">Your Job Postings</h3>
                                    <p className="text-sm text-slate-500 font-medium mt-0.5">Manage and monitor your job openings</p>
                                </div>
                                <Button onClick={() => setShowJobPosting(true)} className="bg-[#4285f4] hover:bg-[#3b79db] text-white font-bold">
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Job
                                </Button>
                            </div>

                            {jobs.length > 0 ? (
                                <div className="space-y-3">
                                    {jobs.map((job, index) => (
                                        <motion.div
                                            key={job._id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <Card className="p-6 hover:shadow-md transition-all border-slate-100">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] flex items-center justify-center shadow-lg">
                                                            <Briefcase className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 mb-1">{job.title}</h4>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                                                <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {job.department}</span>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Badge
                                                            variant={job.status === 'open' ? 'success' : 'secondary'}
                                                            className="uppercase tracking-widest text-[9px] font-black"
                                                        >
                                                            {job.status}
                                                        </Badge>
                                                        <Button variant="outline" size="sm" className="font-bold">Manage</Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                        <Briefcase className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900 mb-2">No Jobs Posted Yet</h4>
                                    <p className="text-sm text-slate-500 font-medium mb-6">Start by creating your first job posting</p>
                                    <Button onClick={() => setShowJobPosting(true)} className="bg-[#4285f4] hover:bg-[#3b79db] text-white font-bold">
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

                            {applications.length > 0 ? (
                                <div className="space-y-3">
                                    {applications.map((app, index) => (
                                        <motion.div
                                            key={app._id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <Card className="p-6 hover:shadow-md transition-all border-slate-100">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-black text-lg shadow-lg">
                                                            {app.candidateName?.split(' ').map(n => n[0]).join('') || 'C'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 mb-1">{app.candidateName || 'Candidate'}</h4>
                                                            <p className="text-sm text-slate-500 font-medium">Applied {new Date(app.createdAt).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Badge
                                                            className={`uppercase tracking-widest text-[9px] font-black ${app.status === 'accepted' ? 'bg-green-100 text-green-700 border-green-200' :
                                                                    app.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                        app.status === 'shortlisted' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                                            'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                                }`}
                                                        >
                                                            {app.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
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
                                            const count = applications.filter(app => app.status === status).length;
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
                    </Tabs>
                </CardHeader>
            </Card>

            {/* Job Posting Modal */}
            <AnimatePresence>
                {showJobPosting && (
                    <JobPosting
                        onComplete={() => {
                            setShowJobPosting(false);
                            fetchData();
                        }}
                        onCancel={() => setShowJobPosting(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
