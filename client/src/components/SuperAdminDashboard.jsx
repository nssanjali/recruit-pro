import { useEffect, useMemo, useState } from 'react';
import {
    Shield,
    Users,
    Briefcase,
    FileText,
    UserCheck,
    Activity,
    Trash2,
    RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, NativeSelect, Tabs, TabsContent, TabsList, TabsTrigger } from './ui';
import { getJobs, getApplications } from '../lib/api';
import { getRecruiters } from '../lib/recruiterApi';
import { getUsers, getUserStats, removeUser, updateUserRole } from '../lib/userApi';
import { normalizeApplicationStatus } from '../lib/applicationStatus';

const API_URL = 'http://localhost:5000/api';

export function SuperAdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [recruiters, setRecruiters] = useState([]);
    const [interviews, setInterviews] = useState([]);
    const [communicationStats, setCommunicationStats] = useState(null);
    const [activeTab, setActiveTab] = useState('users');
    const [updatingUserId, setUpdatingUserId] = useState('');

    const fetchSuperAdminData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [usersData, statsData, jobsData, appsData, recruitersRes, interviewsRes, commStatsRes] = await Promise.all([
                getUsers(),
                getUserStats(),
                getJobs(),
                getApplications(),
                getRecruiters(),
                fetch(`${API_URL}/interviews`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/communications/stats`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const interviewsJson = interviewsRes.ok ? await interviewsRes.json() : [];
            const commStatsJson = commStatsRes.ok ? await commStatsRes.json() : null;

            setUsers(usersData || []);
            setStats(statsData || null);
            setJobs(jobsData || []);
            setApplications(appsData || []);
            setRecruiters(recruitersRes?.data || []);
            setInterviews(Array.isArray(interviewsJson) ? interviewsJson : []);
            setCommunicationStats(commStatsJson?.data || null);
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to load super admin data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuperAdminData();
    }, []);

    const appStats = useMemo(() => {
        const pending = applications.filter((a) => normalizeApplicationStatus(a.status) === 'pending').length;
        const shortlisted = applications.filter((a) => normalizeApplicationStatus(a.status) === 'shortlisted').length;
        const accepted = applications.filter((a) => normalizeApplicationStatus(a.status) === 'accepted').length;
        const rejected = applications.filter((a) => normalizeApplicationStatus(a.status) === 'rejected').length;
        return { pending, shortlisted, accepted, rejected };
    }, [applications]);

    const handleRoleChange = async (userId, role) => {
        setUpdatingUserId(userId);
        try {
            await updateUserRole(userId, role);
            toast.success('User role updated');
            await fetchSuperAdminData();
        } catch (error) {
            toast.error(error.message || 'Failed to update role');
        } finally {
            setUpdatingUserId('');
        }
    };

    const handleDeleteUser = async (userId) => {
        const confirmed = window.confirm('Delete this user from the platform? This action cannot be undone.');
        if (!confirmed) return;

        setUpdatingUserId(userId);
        try {
            await removeUser(userId);
            toast.success('User deleted');
            await fetchSuperAdminData();
        } catch (error) {
            toast.error(error.message || 'Failed to delete user');
        } finally {
            setUpdatingUserId('');
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-600">Loading super admin control center...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Super Admin Control Center</h1>
                        <p className="text-sm text-slate-600 mt-1">Global authority across users, hiring, recruiters, interviews, and communications.</p>
                    </div>
                    <Button variant="outline" className="font-bold" onClick={fetchSuperAdminData}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
                {[
                    { label: 'Users', value: stats?.total || users.length, icon: Users },
                    { label: 'Super Admins', value: stats?.superAdmins || 0, icon: Shield },
                    { label: 'Jobs', value: jobs.length, icon: Briefcase },
                    { label: 'Applications', value: applications.length, icon: FileText },
                    { label: 'Recruiters', value: recruiters.length, icon: UserCheck },
                    { label: 'Interviews', value: interviews.length, icon: Activity }
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <Card key={item.label} className="p-4 border-slate-200">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                                <Icon className="w-4 h-4 text-slate-400" />
                            </div>
                            <p className="text-2xl font-black text-slate-900">{item.value}</p>
                        </Card>
                    );
                })}
            </div>

            <Card className="border-slate-200">
                <div className="p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="mb-6 flex-wrap h-auto">
                            <TabsTrigger value="users">Users & Roles</TabsTrigger>
                            <TabsTrigger value="hiring">Hiring Ops</TabsTrigger>
                            <TabsTrigger value="recruiters">Recruiters</TabsTrigger>
                            <TabsTrigger value="system">System Pulse</TabsTrigger>
                        </TabsList>

                        <TabsContent value="users" className="space-y-3">
                            {users.map((user) => (
                                <div key={user._id} className="rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
                                    <div className="min-w-[230px]">
                                        <p className="font-bold text-slate-900">{user.name}</p>
                                        <p className="text-xs text-slate-500">{user.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge className="capitalize bg-slate-100 text-slate-700 border-slate-200">{String(user.role || '').replace('_', ' ')}</Badge>
                                        <NativeSelect
                                            className="h-9 text-sm"
                                            value={user.role || 'candidate'}
                                            disabled={updatingUserId === user._id}
                                            onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                        >
                                            <option value="candidate">candidate</option>
                                            <option value="recruiter">recruiter</option>
                                            <option value="company_admin">company_admin</option>
                                            <option value="admin">admin</option>
                                            <option value="super_admin">super_admin</option>
                                        </NativeSelect>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:bg-red-50 border-red-200"
                                            disabled={updatingUserId === user._id}
                                            onClick={() => handleDeleteUser(user._id)}
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </TabsContent>

                        <TabsContent value="hiring" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <StatCard label="Pending" value={appStats.pending} />
                                <StatCard label="Shortlisted" value={appStats.shortlisted} />
                                <StatCard label="Accepted" value={appStats.accepted} />
                                <StatCard label="Rejected" value={appStats.rejected} />
                            </div>
                            <div className="rounded-xl border border-slate-200 p-4">
                                <p className="text-sm font-bold text-slate-900 mb-2">Global Jobs ({jobs.length})</p>
                                <div className="max-h-72 overflow-auto space-y-2">
                                    {jobs.map((job) => (
                                        <div key={job._id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5">
                                            <p className="text-sm font-semibold text-slate-800">{job.title || 'Untitled Job'}</p>
                                            <Badge className="capitalize bg-slate-100 text-slate-700 border-slate-200">{job.status || 'draft'}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="recruiters" className="space-y-2">
                            <p className="text-sm font-bold text-slate-900">Recruiter Network ({recruiters.length})</p>
                            <div className="max-h-80 overflow-auto space-y-2">
                                {recruiters.map((rec) => (
                                    <div key={rec._id} className="rounded-xl border border-slate-200 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-slate-900">{rec?.user?.name || 'Recruiter'}</p>
                                                <p className="text-xs text-slate-500">{rec?.user?.email || 'No email'}</p>
                                            </div>
                                            <Badge className="capitalize bg-slate-100 text-slate-700 border-slate-200">{rec.status || 'active'}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="system" className="space-y-3">
                            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Communication Metrics</p>
                                <p className="text-sm text-slate-700">
                                    Total: <span className="font-bold text-slate-900">{communicationStats?.total || 0}</span> |
                                    Sent: <span className="font-bold text-slate-900"> {communicationStats?.sent || 0}</span> |
                                    Failed: <span className="font-bold text-slate-900"> {communicationStats?.failed || 0}</span>
                                </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Interviews Scheduled</p>
                                <p className="text-2xl font-black text-slate-900">{interviews.length}</p>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </Card>
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide font-bold text-slate-500">{label}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
        </div>
    );
}

export default SuperAdminDashboard;
