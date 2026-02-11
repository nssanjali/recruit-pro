import { useState, useEffect } from 'react';
import {
    TrendingUp,
    Users,
    Briefcase,
    FileText,
    DollarSign,
    Calendar,
    Target,
    Award,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ArrowUp,
    ArrowDown,
    BarChart3,
    PieChart,
    Activity
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from './ui';
import { getJobs, getApplications } from '../lib/api';
import { motion } from 'motion/react';

export function AnalyticsDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalJobs: 0,
        activeJobs: 0,
        totalApplications: 0,
        pendingApplications: 0,
        acceptedApplications: 0,
        rejectedApplications: 0,
        avgApplicationsPerJob: 0,
        recentActivity: []
    });

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const [jobsData, applicationsData] = await Promise.all([
                getJobs(),
                getApplications()
            ]);

            const jobs = jobsData.data || [];
            const applications = applicationsData.data || [];

            const activeJobs = jobs.filter(j => j.status === 'published').length;
            const pendingApps = applications.filter(a => a.status === 'pending').length;
            const acceptedApps = applications.filter(a => a.status === 'accepted').length;
            const rejectedApps = applications.filter(a => a.status === 'rejected').length;

            setStats({
                totalJobs: jobs.length,
                activeJobs,
                totalApplications: applications.length,
                pendingApplications: pendingApps,
                acceptedApplications: acceptedApps,
                rejectedApplications: rejectedApps,
                avgApplicationsPerJob: jobs.length > 0 ? (applications.length / jobs.length).toFixed(1) : 0,
                recentActivity: applications.slice(0, 5)
            });
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total Jobs',
            value: stats.totalJobs,
            icon: Briefcase,
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
            change: '+12%',
            trend: 'up'
        },
        {
            title: 'Active Jobs',
            value: stats.activeJobs,
            icon: Target,
            color: 'from-emerald-500 to-emerald-600',
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-600',
            change: '+8%',
            trend: 'up'
        },
        {
            title: 'Total Applications',
            value: stats.totalApplications,
            icon: FileText,
            color: 'from-purple-500 to-purple-600',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600',
            change: '+24%',
            trend: 'up'
        },
        {
            title: 'Pending Review',
            value: stats.pendingApplications,
            icon: Clock,
            color: 'from-orange-500 to-orange-600',
            bgColor: 'bg-orange-50',
            textColor: 'text-orange-600',
            change: '-5%',
            trend: 'down'
        },
        {
            title: 'Accepted',
            value: stats.acceptedApplications,
            icon: CheckCircle2,
            color: 'from-green-500 to-green-600',
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
            change: '+18%',
            trend: 'up'
        },
        {
            title: 'Rejected',
            value: stats.rejectedApplications,
            icon: XCircle,
            color: 'from-red-500 to-red-600',
            bgColor: 'bg-red-50',
            textColor: 'text-red-600',
            change: '+3%',
            trend: 'up'
        },
        {
            title: 'Avg Apps/Job',
            value: stats.avgApplicationsPerJob,
            icon: Activity,
            color: 'from-indigo-500 to-indigo-600',
            bgColor: 'bg-indigo-50',
            textColor: 'text-indigo-600',
            change: '+15%',
            trend: 'up'
        },
        {
            title: 'Success Rate',
            value: stats.totalApplications > 0
                ? `${((stats.acceptedApplications / stats.totalApplications) * 100).toFixed(1)}%`
                : '0%',
            icon: Award,
            color: 'from-pink-500 to-pink-600',
            bgColor: 'bg-pink-50',
            textColor: 'text-pink-600',
            change: '+7%',
            trend: 'up'
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-bold">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analytics Dashboard</h1>
                    <p className="text-slate-500 mt-2">Track your recruitment performance and metrics</p>
                </div>
                <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 text-sm font-bold">
                    Live Data
                </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    const TrendIcon = stat.trend === 'up' ? ArrowUp : ArrowDown;

                    return (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="border-slate-200 shadow-lg hover:shadow-xl transition-all group overflow-hidden relative">
                                {/* Gradient Accent */}
                                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color}`} />

                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-12 h-12 rounded-2xl ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <Icon className={`w-6 h-6 ${stat.textColor}`} />
                                        </div>
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${stat.trend === 'up' ? 'bg-emerald-50' : 'bg-red-50'
                                            }`}>
                                            <TrendIcon className={`w-3 h-3 ${stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                                                }`} />
                                            <span className={`text-xs font-bold ${stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                                                }`}>
                                                {stat.change}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-500 mb-1">{stat.title}</p>
                                        <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Application Status Distribution */}
                <Card className="border-slate-200 shadow-lg">
                    <CardHeader className="border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                <PieChart className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black">Application Status</CardTitle>
                                <p className="text-sm text-slate-500 mt-0.5">Distribution breakdown</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                                    <span className="text-sm font-bold text-slate-700">Pending</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-black text-slate-900">{stats.pendingApplications}</span>
                                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-orange-500 rounded-full"
                                            style={{ width: `${(stats.pendingApplications / stats.totalApplications) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="text-sm font-bold text-slate-700">Accepted</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-black text-slate-900">{stats.acceptedApplications}</span>
                                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 rounded-full"
                                            style={{ width: `${(stats.acceptedApplications / stats.totalApplications) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <span className="text-sm font-bold text-slate-700">Rejected</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-black text-slate-900">{stats.rejectedApplications}</span>
                                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-red-500 rounded-full"
                                            style={{ width: `${(stats.rejectedApplications / stats.totalApplications) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="border-slate-200 shadow-lg">
                    <CardHeader className="border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black">Performance Overview</CardTitle>
                                <p className="text-sm text-slate-500 mt-0.5">Key metrics at a glance</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                                <div>
                                    <p className="text-sm font-bold text-slate-600">Conversion Rate</p>
                                    <p className="text-2xl font-black text-blue-600 mt-1">
                                        {stats.totalApplications > 0
                                            ? `${((stats.acceptedApplications / stats.totalApplications) * 100).toFixed(1)}%`
                                            : '0%'
                                        }
                                    </p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-blue-600" />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                                <div>
                                    <p className="text-sm font-bold text-slate-600">Active Positions</p>
                                    <p className="text-2xl font-black text-emerald-600 mt-1">{stats.activeJobs}</p>
                                </div>
                                <Briefcase className="w-8 h-8 text-emerald-600" />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                                <div>
                                    <p className="text-sm font-bold text-slate-600">Total Candidates</p>
                                    <p className="text-2xl font-black text-purple-600 mt-1">{stats.totalApplications}</p>
                                </div>
                                <Users className="w-8 h-8 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Info Banner */}
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black text-slate-900 mb-2">Analytics Insights</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Your recruitment performance is trending positively! You have <span className="font-bold text-blue-600">{stats.pendingApplications} applications</span> waiting for review.
                                Consider reviewing them to maintain a good candidate experience and improve your conversion rate.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
