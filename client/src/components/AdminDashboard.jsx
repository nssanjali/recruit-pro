import { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  TrendingUp,
  Sparkles,
  Star,
  Filter,
  Bot,
  Zap,
  ShieldCheck,
  Briefcase,
  UserPlus,
  UserCheck,
  BarChart3,
  Search,
  Plus,
  Settings2,
  Building,
  MapPin,
  Calendar
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
  TabsTrigger,
  Input
} from './ui';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { JobPosting } from './JobPosting';
import { getJobs } from '../lib/api';

export function AdminDashboard() {
  const [workloadData, setWorkloadData] = useState([
    { name: 'Sarah K.', value: 12 },
    { name: 'Mike R.', value: 8 },
    { name: 'Emma L.', value: 15 },
    { name: 'John D.', value: 10 },
  ]);

  const [timeToHireData, setTimeToHireData] = useState([
    { month: 'Jan', days: 18 },
    { month: 'Feb', days: 16 },
    { month: 'Mar', days: 14 },
    { month: 'Apr', days: 12 },
    { month: 'May', days: 11 },
  ]);

  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [showJobPosting, setShowJobPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const jobsData = await getJobs();
      setJobs(jobsData || []);

      // Mock data for candidates and recruiters
      setCandidates([
        { id: 1, name: 'Sarah Johnson', role: 'ML Engineer', status: 'In Review', score: 92, assignedTo: 'Sarah K.' },
        { id: 2, name: 'Michael Brown', role: 'Full Stack Dev', status: 'Interview', score: 88, assignedTo: 'Mike R.' },
        { id: 3, name: 'Emma Davis', role: 'DevOps Engineer', status: 'Offer', score: 95, assignedTo: 'Emma L.' },
      ]);

      setRecruiters([
        { id: 1, name: 'Sarah K.', department: 'Engineering', activeJobs: 5, candidates: 12, hireRate: '85%' },
        { id: 2, name: 'Mike R.', department: 'Product', activeJobs: 3, candidates: 8, hireRate: '78%' },
        { id: 3, name: 'Emma L.', department: 'Engineering', activeJobs: 6, candidates: 15, hireRate: '92%' },
      ]);
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
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Admin Console</h3>
        <p className="mt-2 text-slate-500 font-medium">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Control Center</h2>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
              <Zap className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
              Master v2.0
            </div>
          </div>
          <p className="text-slate-500 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#10b981]" />
            Full system oversight and management
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#4285f4] transition-colors" />
            <Input
              placeholder="Search system..."
              className="pl-10 w-full sm:w-72 bg-white border-slate-200 focus:ring-[#4285f4]/20 transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="border-slate-200 bg-white gap-2 hover:bg-slate-50 shadow-sm">
            <Settings2 className="w-4 h-4" />
            Settings
          </Button>
          <Button
            onClick={() => setShowJobPosting(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 gap-2 font-bold px-6"
          >
            <Plus className="w-4 h-4" />
            Post Job
          </Button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Candidates', value: candidates.length.toString(), icon: Users, color: 'from-[#4285f4] to-[#06b6d4]', trend: '+12%' },
          { label: 'Active Jobs', value: jobs.length.toString(), icon: Briefcase, color: 'from-[#8b5cf6] to-[#d946ef]', trend: `${jobs.length} Open` },
          { label: 'Recruiters', value: recruiters.length.toString(), icon: UserCheck, color: 'from-[#10b981] to-[#34d399]', trend: 'Active' },
          { label: 'Avg. Time to Hire', value: '12 days', icon: Clock, color: 'from-[#f59e0b] to-[#fbbf24]', trend: '-15%' },
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

      {/* Main Content Tabs */}
      <Card className="border-slate-100 shadow-lg overflow-hidden bg-white">
        <CardHeader className="p-8 border-b border-slate-50">
          <Tabs defaultValue="jobs" className="w-full">
            <TabsList className="bg-slate-100/80 p-1 rounded-xl mb-6">
              <TabsTrigger value="jobs" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">JOBS</TabsTrigger>
              <TabsTrigger value="candidates" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">CANDIDATES</TabsTrigger>
              <TabsTrigger value="recruiters" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">RECRUITERS</TabsTrigger>
              <TabsTrigger value="analytics" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">ANALYTICS</TabsTrigger>
            </TabsList>

            {/* Jobs Tab */}
            <TabsContent value="jobs" className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Active Job Postings</h3>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">Manage and monitor all job openings</p>
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
                            <Badge variant="success" className="uppercase tracking-widest text-[9px] font-black">Active</Badge>
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
                  <h4 className="text-lg font-bold text-slate-900 mb-2">No Jobs Posted</h4>
                  <p className="text-sm text-slate-500 font-medium mb-6">Start by creating your first job posting</p>
                  <Button onClick={() => setShowJobPosting(true)} className="bg-[#4285f4] hover:bg-[#3b79db] text-white font-bold">
                    <Plus className="w-4 h-4 mr-2" />
                    Post Your First Job
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Candidates Tab */}
            <TabsContent value="candidates" className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Candidate Pipeline</h3>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">Review and assign candidates to recruiters</p>
                </div>
                <Button variant="outline" className="font-bold">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>

              <div className="space-y-3">
                {candidates.map((candidate, index) => (
                  <motion.div
                    key={candidate.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-6 hover:shadow-md transition-all border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-black text-lg shadow-lg">
                            {candidate.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 mb-1">{candidate.name}</h4>
                            <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                              <span>{candidate.role}</span>
                              <span>•</span>
                              <span>AI Score: {candidate.score}%</span>
                              <span>•</span>
                              <span>Assigned to: {candidate.assignedTo}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={candidate.status === 'Offer' ? 'success' : 'default'} className="uppercase tracking-widest text-[9px] font-black">
                            {candidate.status}
                          </Badge>
                          <Button variant="outline" size="sm" className="font-bold">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Reassign
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* Recruiters Tab */}
            <TabsContent value="recruiters" className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Recruiter Team</h3>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">Monitor recruiter performance and workload</p>
                </div>
              </div>

              <div className="space-y-3">
                {recruiters.map((recruiter, index) => (
                  <motion.div
                    key={recruiter.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-6 hover:shadow-md transition-all border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] flex items-center justify-center text-white font-black text-lg shadow-lg">
                            {recruiter.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 mb-1">{recruiter.name}</h4>
                            <p className="text-sm text-slate-500 font-medium">{recruiter.department}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Jobs</p>
                            <p className="text-lg font-black text-slate-900">{recruiter.activeJobs}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Candidates</p>
                            <p className="text-lg font-black text-slate-900">{recruiter.candidates}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hire Rate</p>
                            <p className="text-lg font-black text-emerald-600">{recruiter.hireRate}</p>
                          </div>
                          <Button variant="outline" size="sm" className="font-bold">View Details</Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="mb-6">
                <h3 className="text-xl font-black text-slate-900">System Analytics</h3>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Performance metrics and insights</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recruiter Workload */}
                <Card className="p-6 border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-900">Recruiter Workload</h4>
                    <Badge variant="outline" className="border-[#8b5cf6] text-[#8b5cf6] text-[9px] font-black uppercase">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI-Balanced
                    </Badge>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={workloadData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4285f4" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Time to Hire Trend */}
                <Card className="p-6 border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-4">Average Time to Hire</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={timeToHireData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="days"
                        stroke="#4285f4"
                        strokeWidth={3}
                        dot={{ fill: '#8b5cf6', r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
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
