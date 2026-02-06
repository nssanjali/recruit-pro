
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJob, applyJob, checkJobMatch, uploadFile, updateUserDetails } from '../lib/api';
import { Card, Button, Badge, Progress } from './ui';
import { Briefcase, MapPin, Building, Clock, DollarSign, ArrowLeft, CheckCircle2, AlertCircle, Sparkles, BrainCircuit, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export function JobDetails({ user }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState(null);
    const [calculating, setCalculating] = useState(false);
    const [applied, setApplied] = useState(false);
    const [uploadingResume, setUploadingResume] = useState(false);

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const data = await getJob(id);
                setJob(data);
                if (data.candidates && user && data.candidates.includes(user._id)) {
                    setApplied(true);
                }
            } catch (error) {
                console.error('Error fetching job:', error);
                toast.error('Failed to load job details');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchJob();
        }
    }, [id, user]);

    const handleApply = async () => {
        try {
            await applyJob(id);
            setApplied(true);
            toast.success('Application submitted successfully!');
        } catch (error) {
            toast.error(error.message || 'Failed to apply');
        }
    };

    const handleResumeUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingResume(true);
        try {
            toast.info('Uploading resume...');
            const url = await uploadFile(file, 'resume');
            await updateUserDetails({ resume: url });
            toast.success('Resume uploaded! Analyzing match...');
            await runMatchCheck();
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload resume');
        } finally {
            setUploadingResume(false);
        }
    };

    const runMatchCheck = async () => {
        setCalculating(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.log("Calling API checkJobMatch...");
            const data = await checkJobMatch(id);
            console.log("API Response:", data);

            // Handle both new 'analysis' key (new backend) and legacy 'matchScore' key (old backend)
            // This ensures it works even if the server is not restarted immediately
            if (data && (data.analysis || data.matchScore)) {
                console.log("Redirecting to analysis page...");
                navigate(`/jobs/${id}/analysis`);
            } else {
                console.error("Invalid response data:", data);
                toast.error("Detailed analysis unavailable. Please try again.");
            }
        } catch (error) {
            console.error("Match Check Error:", error);
            toast.error(error.message || 'Failed to calculate match');
        } finally {
            setCalculating(false);
        }
    };

    const handleCheckMatch = () => {
        if (!user.resume) {
            document.getElementById('resume-upload-input').click();
            return;
        }
        runMatchCheck();
    };

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-[#4285f4] animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading job details...</p>
            </div>
        );
    }

    if (!job) return <div className="p-10 text-center">Job not found</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0 hover:pl-2 transition-all text-slate-500">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Jobs
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{job.title}</h1>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><Building className="w-4 h-4" /> {job.department}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
                            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <Card className="p-8 border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">About the Role</h3>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line">{job.description}</p>

                        <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">Requirements</h3>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line">{job.requirements}</p>
                    </Card>
                </div>

                {/* Sidebar / Action Area */}
                <div className="space-y-6">
                    <Card className="p-6 border-slate-100 shadow-lg bg-white sticky top-6">
                        <div className="mb-6">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Salary Range</p>
                            <p className="text-2xl font-black text-slate-900 flex items-center gap-1">
                                <DollarSign className="w-5 h-5 text-emerald-500" />
                                {job.salary}
                            </p>
                        </div>

                        <div className="space-y-4">
                            {applied ? (
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center gap-2 text-emerald-700 font-bold">
                                    <CheckCircle2 className="w-5 h-5" />
                                    Applied Successfully
                                </div>
                            ) : (
                                <Button
                                    className="w-full bg-[#4285f4] hover:bg-[#3367d6] text-white font-bold h-12 rounded-xl text-lg shadow-lg shadow-blue-500/20"
                                    onClick={handleApply}
                                >
                                    Apply Now
                                </Button>
                            )}

                            <div className="relative pt-6 mt-6 border-t border-slate-100">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-slate-400 font-bold uppercase tracking-widest">
                                    AI Analysis
                                </div>

                                <input
                                    type="file"
                                    id="resume-upload-input"
                                    className="hidden"
                                    accept=".pdf"
                                    onChange={handleResumeUpload}
                                />

                                {analysis === null && !calculating && (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="w-full h-12 border-2 border-slate-100 hover:border-[#8b5cf6] hover:text-[#8b5cf6] hover:bg-white font-bold transition-all group mb-3"
                                            onClick={handleCheckMatch}
                                            disabled={uploadingResume}
                                        >
                                            {uploadingResume ? (
                                                <span className="flex items-center gap-2">
                                                    <Upload className="w-4 h-4 animate-bounce" />
                                                    Uploading...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-yellow-400 group-hover:rotate-12 transition-transform" />
                                                    {user.resume ? 'Check Resume Fit' : 'Upload Resume & Check Fit'}
                                                </span>
                                            )}
                                        </Button>

                                        {user.resume && (
                                            <div className="text-center">
                                                <p className="text-xs text-slate-400 mb-2">Current Resume Active</p>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs text-[#4285f4] hover:bg-[#4285f4]/10 h-auto py-1"
                                                    onClick={() => document.getElementById('resume-upload-input').click()}
                                                >
                                                    <Upload className="w-3 h-3 mr-1" />
                                                    Update Resume
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {calculating && (
                                    <div className="p-4 bg-slate-50 rounded-xl text-center">
                                        <BrainCircuit className="w-8 h-8 text-[#8b5cf6] mx-auto mb-2 animate-pulse" />
                                        <p className="text-xs font-bold text-slate-500">Analyzing keywords...</p>
                                    </div>
                                )}


                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
