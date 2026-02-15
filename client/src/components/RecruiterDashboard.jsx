import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase,
    Users,
    Clock,
    TrendingUp,
    Eye,
    Calendar,
    Building,
    MapPin,
    Bot
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
import { motion } from 'motion/react';
import { getJobs } from '../lib/api';
import { getMyRecruiterProfile } from '../lib/recruiterApi';
import { toast } from 'sonner';

export function RecruiterDashboard({ user }) {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [recruiterProfile, setRecruiterProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [jobsData, profileData] = await Promise.all([
                getJobs(),
                getMyRecruiterProfile().catch(() => null)
            ]);

            setJobs(jobsData || []);
            if (profileData?.data) {
                setRecruiterProfile(profileData.data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const activeJobs = jobs.filter(j => j.status === 'open').length;
    const pendingInterviews = recruiterProfile?.pendingInterviews || 0;
    const completedInterviews = recruiterProfile?.completedInterviews || 0;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900">Recruiter Dashboard</h1>
                    <p className="text-slate-500 mt-2">Manage your assigned jobs and candidates</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2">
                        {recruiterProfile?.availability || 'Available'}
                    </Badge>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Assigned Jobs', value: jobs.length, icon: Briefcase, color: 'from-blue-500 to-cyan-500' },
                    { label: 'Active Jobs', value: activeJobs, icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
                    { label: 'Pending Interviews', value: pendingInterviews, icon: Clock, color: 'from-orange-500 to-amber-500' },
                    { label: 'Completed', value: completedInterviews, icon: Users, color: 'from-purple-500 to-pink-500' }
                ].map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="border-none shadow-lg hover:shadow-xl transition-all">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                                    <p className="text-sm text-slate-500 font-bold mt-1">{stat.label}</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {/* Main Content */}
            <Card className="border-slate-100 shadow-lg">
                <CardHeader className="border-b border-slate-100">
                    <Tabs defaultValue="jobs" className="w-full">
                        <TabsList className="bg-slate-100 p-1 rounded-xl">
                            <TabsTrigger value="jobs" className="font-bold">Assigned Jobs</TabsTrigger>
                        </TabsList>

                        <TabsContent value="jobs" className="space-y-4 mt-6">
                            {jobs.length === 0 ? (
                                <div className="text-center py-12">
                                    <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-black text-slate-900 mb-2">No Jobs Assigned</h3>
                                    <p className="text-slate-500">Your company admin will assign jobs to you soon.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {jobs.map((job, index) => (
                                        <motion.div
                                            key={job._id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <Card className="hover:shadow-lg transition-all border-l-4 border-l-blue-500">
                                                <CardContent className="p-6">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex gap-4 flex-1">
                                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                                                <Briefcase className="w-7 h-7 text-white" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h3 className="text-xl font-black text-slate-900 mb-1">{job.title}</h3>
                                                                <div className="flex flex-wrap gap-3 text-sm text-slate-600 mb-3">
                                                                    {job.department && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Building className="w-4 h-4" />
                                                                            {job.department}
                                                                        </span>
                                                                    )}
                                                                    {job.location && (
                                                                        <span className="flex items-center gap-1">
                                                                            <MapPin className="w-4 h-4" />
                                                                            {job.location}
                                                                        </span>
                                                                    )}
                                                                    {job.type && (
                                                                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                                                                            {job.type}
                                                                        </Badge>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-4 text-sm">
                                                                    <span className="flex items-center gap-1 text-slate-600">
                                                                        <Users className="w-4 h-4" />
                                                                        {job.candidates?.length || 0} Candidates
                                                                    </span>
                                                                    <span className="flex items-center gap-1 text-slate-600">
                                                                        <Calendar className="w-4 h-4" />
                                                                        Posted {new Date(job.createdAt).toLocaleDateString()}
                                                                    </span>
                                                                    <Badge className={job.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                                                                        {job.status}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <Button
                                                                onClick={() => navigate(`/jobs/${job._id}`)}
                                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                                            >
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                View Details
                                                            </Button>
                                                            {job.candidates && job.candidates.length > 0 && (
                                                                <Button
                                                                    onClick={() => navigate(`/jobs/${job._id}/candidates`)}
                                                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
                                                                >
                                                                    <Bot className="w-4 h-4 mr-2" />
                                                                    View Candidates
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardHeader>
            </Card>
        </div>
    );
}
