import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Calendar as CalendarIcon,
    Clock,
    Sparkles,
    Video,
    TrendingUp,
    AlertCircle,
    Bell,
    Star,
    Filter,
    Search,
    CheckCircle2,
    ChevronRight,
    MoreVertical,
    Mail,
    Zap,
    ShieldCheck,
    LayoutDashboard,
    MessageSquare,
    ArrowUpRight,
    BrainCircuit,
    Settings2,
    Briefcase,
    Building,
    MapPin
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Badge,
    Button,
    Progress,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Input,
    Avatar,
    AvatarFallback
} from './ui';
import { motion, AnimatePresence } from 'motion/react';
import { JobPosting } from './JobPosting';
import { getJobs } from '../lib/api';

export function RecruiterDashboard({ user }) {
    const navigate = useNavigate();
    const [assignedCandidates, setAssignedCandidates] = useState([]);
    const [todaySchedule, setTodaySchedule] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [aiInsights, setAiInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showJobPosting, setShowJobPosting] = useState(false);
    const [jobs, setJobs] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const jobsData = await getJobs();
            setJobs(jobsData || []);
        } catch (error) {
            console.error('Error fetching jobs:', error);
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
                        <BrainCircuit className="w-8 h-8 text-[#8b5cf6] animate-pulse" />
                    </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">RecruitPro Intel</h3>
                <p className="mt-2 text-slate-500 font-medium">Calibrating talent matching engine...</p>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Premium Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Recruiter Command</h2>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                            <Zap className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                            Nexus v2.0
                        </div>
                    </div>
                    <p className="text-slate-500 text-sm flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                        Encrypted connection to Google Gemini Core established
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#4285f4] transition-colors" />
                        <Input
                            placeholder="Query talent nexus..."
                            className="pl-10 w-full sm:w-72 bg-white border-slate-200 focus:ring-[#4285f4]/20 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="border-slate-200 bg-white gap-2 hover:bg-slate-50 shadow-sm">
                        <Settings2 className="w-4 h-4" />
                        Config
                    </Button>
                    <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 gap-2 font-bold px-6">
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                        AI Sync
                    </Button>
                </div>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Active Pipeline', value: '0', icon: Users, color: 'from-[#4285f4] to-[#06b6d4]', trend: 'Steady' },
                    { label: 'Pending Feedback', value: '0', icon: MessageSquare, color: 'from-[#8b5cf6] to-[#d946ef]', trend: 'Optimal' },
                    { label: 'Success Velocity', value: '98%', icon: TrendingUp, color: 'from-[#10b981] to-[#34d399]', trend: '+4%' },
                    { label: 'AI Confidence', value: '99.2%', icon: BrainCircuit, color: 'from-[#f59e0b] to-[#fbbf24]', trend: 'Stable' },
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

            {/* Intelligence Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Pipeline Area */}
                <div className="lg:col-span-8 space-y-8">
                    <Card className="border-slate-100 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="p-8 border-b border-slate-50">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">Intelligence Pipeline</CardTitle>
                                    <p className="text-sm text-slate-500 font-medium">Active screening & automated evaluation</p>
                                </div>
                                <Tabs defaultValue="all" className="w-auto">
                                    <TabsList className="bg-slate-100/80 p-1 rounded-xl">
                                        <TabsTrigger value="all" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">ALL ENTRIES</TabsTrigger>
                                        <TabsTrigger value="review" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">REVIEW (0)</TabsTrigger>
                                        <TabsTrigger value="matched" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">MATCHED (0)</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="flex flex-col items-center justify-center py-24 text-center px-12">
                                <div className="relative mb-8">
                                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
                                        <Users className="w-10 h-10 text-slate-200" />
                                    </div>
                                    <motion.div
                                        className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center border border-slate-100"
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ repeat: Infinity, duration: 3 }}
                                    >
                                        <Sparkles className="w-4 h-4 text-[#8b5cf6]" />
                                    </motion.div>
                                </div>
                                <h4 className="text-xl font-bold text-slate-900 mb-2">Nexus is Empty</h4>
                                <p className="text-slate-500 text-sm max-w-sm mb-10 font-medium leading-relaxed">
                                    The talent marketplace is currently being indexed by our AI core. Sit back while we find the perfect matches for your open roles.
                                </p>
                                <div className="flex items-center gap-4">
                                    <Button variant="outline" className="border-slate-200 font-bold px-8 py-6 rounded-2xl hover:bg-slate-50 transition-all">
                                        <LayoutDashboard className="w-4 h-4 mr-2" />
                                        Browse All
                                    </Button>
                                    <Button
                                        onClick={() => setShowJobPosting(true)}
                                        className="bg-[#4285f4] hover:bg-[#3b79db] text-white font-bold px-8 py-6 rounded-2xl shadow-lg shadow-[#4285f4]/20"
                                    >
                                        Create Job Post
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Jobs List Section */}
                    {jobs.length > 0 && (
                        <Card className="border-slate-100 shadow-sm overflow-hidden bg-white">
                            <CardHeader className="p-8 border-b border-slate-50">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">Active Job Openings</CardTitle>
                                    <Button variant="outline" size="sm" onClick={() => setShowJobPosting(true)}>+ Post Job</Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50">
                                    {jobs.map((job) => (
                                        <div key={job._id} className="p-6 hover:bg-slate-50/50 transition-colors flex items-center justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                                                    <Briefcase className="w-5 h-5 text-slate-500" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{job.title}</h4>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                        <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {job.department}</span>
                                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant="success" className="bg-emerald-50 text-emerald-600 border-emerald-100 uppercase tracking-widest text-[9px]">ACTIVE</Badge>
                                                <Button size="sm" variant="outline" onClick={() => navigate(`/jobs/${job._id}/candidates`)}>
                                                    View Candidates
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Intelligence Feeds */}
                <div className="lg:col-span-4 space-y-8">
                    {/* User Status */}
                    <Card className="border-slate-100 shadow-sm bg-white overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#4285f4] to-[#8b5cf6]" />
                        <CardContent className="p-8">
                            <div className="flex items-center gap-4">
                                <Avatar className="w-14 h-14 border-4 border-slate-50 ring-2 ring-white rounded-2xl">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <AvatarFallback className="bg-slate-900 text-white font-black text-xl">
                                            {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                                <div className="flex-1">
                                    <h4 className="text-lg font-bold text-slate-900 leading-tight">{user?.name || 'User'}</h4>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{user?.title || user?.department || 'Recruiter'}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                    <ChevronRight className="w-5 h-5" />
                                </Button>
                            </div>
                            <div className="mt-8 grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 rounded-xl text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quota</p>
                                    <p className="text-lg font-black text-slate-900 tracking-tighter">12/15</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rank</p>
                                    <p className="text-lg font-black text-slate-900 tracking-tighter">Top 2%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Hero Modal for Job Posting */}
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
