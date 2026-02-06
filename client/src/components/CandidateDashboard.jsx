import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from './ui';
import { Briefcase, MapPin, Building, Clock, TrendingUp, Star, DollarSign } from 'lucide-react';
import { getJobs, applyJob } from '../lib/api';
import { toast } from 'sonner';

import { useNavigate } from 'react-router-dom';

export function CandidateDashboard({ user }) {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const fetchedJobs = await getJobs();
                setJobs(fetchedJobs || []);
            } catch (error) {
                console.error('Error fetching jobs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, []);

    const handleApply = async (jobId) => {
        try {
            await applyJob(jobId);
            toast.success('Application submitted successfully!');
            // Optional: Update local state to show 'Applied' status
        } catch (error) {
            toast.error(error.message || 'Failed to apply');
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                    Welcome back, {user?.name?.split(' ')[0] || 'Candidate'}!
                </h2>
                <p className="text-slate-500 font-medium">Here's your job search overview</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-slate-200 shadow-lg">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Applications</p>
                                <p className="text-3xl font-black text-slate-900 mt-2">0</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                <Briefcase className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-lg">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Interviews</p>
                                <p className="text-3xl font-black text-slate-900 mt-2">0</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-lg">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Profile Views</p>
                                <p className="text-3xl font-black text-slate-900 mt-2">0</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Available Jobs */}
            <Card className="border-slate-200 shadow-lg">
                <CardHeader className="border-b border-slate-100">
                    <CardTitle className="text-xl font-black">Available Jobs</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-500 font-medium">Loading jobs...</p>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                <Briefcase className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 font-medium">No jobs available yet</p>
                            <p className="text-sm text-slate-400 mt-1">Check back later for new opportunities</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {jobs.map((job) => (
                                <div key={job._id} className="p-6 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                                <span className="flex items-center gap-1.5">
                                                    <Building className="w-4 h-4" />
                                                    {job.company}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <MapPin className="w-4 h-4" />
                                                    {job.location}
                                                </span>
                                                {job.salaryRange && (
                                                    <span className="flex items-center gap-1.5">
                                                        <DollarSign className="w-4 h-4" />
                                                        {job.salaryRange}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {job.jobType && (
                                                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                                    {job.jobType}
                                                </Badge>
                                            )}
                                            {job.status && (
                                                <Badge className={job.status === 'open' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}>
                                                    {job.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    {job.description && (
                                        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{job.description}</p>
                                    )}
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Clock className="w-3.5 h-3.5" />
                                            Posted {new Date(job.createdAt).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Button
                                                variant="outline"
                                                onClick={() => navigate(`/jobs/${job._id}`)}
                                                className="border-slate-200 hover:bg-slate-50 text-slate-600"
                                            >
                                                View Details
                                            </Button>
                                            <Button
                                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                                onClick={() => navigate(`/jobs/${job._id}`)}
                                            >
                                                Apply Now
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
