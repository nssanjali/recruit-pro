
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJobCandidates, getJob, getSecureResumeUrl } from '../lib/api';
import { Card, Button, Badge, Progress } from './ui';
import { Bot, Sparkles, User, FileText, ArrowLeft, Mail, Eye, Briefcase, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { getApplicationStatusLabel, normalizeApplicationStatus } from '../lib/applicationStatus';
import { toast } from 'sonner';

export function JobCandidates() {
    const { id } = useParams(); // Job ID
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState([]);
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [includeMatchAnalysis, setIncludeMatchAnalysis] = useState(false);
    // Track resume loading per application to avoid double-clicks
    const [resumeLoading, setResumeLoading] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [jobData, candidatesResponse] = await Promise.all([
                    getJob(id),
                    getJobCandidates(id)
                ]);
                setJob(jobData);
                setCandidates(candidatesResponse.candidates || []); // Extract candidates array
                setIncludeMatchAnalysis(candidatesResponse.includeMatchAnalysis || false);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError('Failed to load data.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-10 text-center">Loading candidates...</div>;
    if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

    const getScoreColor = (score) => {
        if (score >= 80) return 'bg-emerald-500';
        if (score >= 60) return 'bg-blue-500';
        if (score >= 40) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getScoreLabel = (score) => {
        if (score >= 80) return 'Excellent Match';
        if (score >= 60) return 'Good Match';
        if (score >= 40) return 'Fair Match';
        return 'Low Match';
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 pl-0 hover:pl-2 transition-all">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </Button>

            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-6 bg-slate-900 text-white border-none shadow-xl">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            {job?.companyLogo ? (
                                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border border-slate-700 flex-shrink-0 bg-white">
                                    <img src={job.companyLogo} alt={job.company || "Company Logo"} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 flex-shrink-0 bg-gradient-to-br from-slate-800 to-slate-900 shadow-inner">
                                    <Briefcase className="w-8 h-8 text-slate-400" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold mb-1">{job?.title}</h1>
                                <p className="text-slate-400">{job?.department} • {job?.location}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                            <Bot className="w-5 h-5 text-emerald-400" />
                            <span className="font-semibold">
                                {candidates?.length || 0} {includeMatchAnalysis ? 'Candidates Analyzed' : 'Candidates'}
                            </span>
                        </div>
                    </div>
                </Card>
            </motion.div>

            <div className="grid grid-cols-1 gap-4">
                {candidates?.length === 0 ? (
                    <Card className="p-10 text-center">
                        <p className="text-slate-500">No candidates have applied to this job yet.</p>
                    </Card>
                ) : (
                    candidates.map((candidate, index) => {
                        const ultimateScore = Number(candidate.ultimateAverageScore);
                        const hasUltimateScore = Number.isFinite(ultimateScore);
                        const score = hasUltimateScore
                            ? ultimateScore
                            : Number(candidate.finalScore ?? candidate.matchScore ?? 0);
                        const status = candidate.applicationStatusNormalized || normalizeApplicationStatus(candidate.applicationStatus);
                        const statusLabel = getApplicationStatusLabel(status);
                        return (
                            <motion.div
                                key={candidate._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="p-6 hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-[#4285f4]">
                                    <div className="flex items-start gap-6">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                            {candidate.avatar ? (
                                                <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-8 h-8 text-slate-400" />
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-lg font-bold text-slate-900">{candidate.name}</h3>
                                                        <Badge
                                                            className={`text-[10px] uppercase tracking-wide font-black ${status === 'accepted'
                                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                : status === 'rejected'
                                                                    ? 'bg-red-100 text-red-700 border-red-200'
                                                                    : status === 'shortlisted'
                                                                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                                        : status === 'reviewing'
                                                                            ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                                            : 'bg-slate-100 text-slate-700 border-slate-200'
                                                                }`}
                                                        >
                                                            {statusLabel}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                                        <Mail className="w-3 h-3" />
                                                        {candidate.email}
                                                    </div>
                                                </div>
                                                {includeMatchAnalysis && (
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-2 mb-1 justify-end">
                                                            <span className="text-2xl font-bold text-slate-900">
                                                                {Math.round(score)}%
                                                            </span>
                                                            <Badge className={getScoreColor(score)}>
                                                                {getScoreLabel(score)}
                                                            </Badge>
                                                        </div>
                                                        <Progress value={score} className="w-32 h-2 ml-auto" />
                                                        {hasUltimateScore && (
                                                            <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                                                                Ultimate Average
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 mt-4">
                                                {candidate.resume && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={!!resumeLoading[candidate.applicationId]}
                                                        onClick={async () => {
                                                            try {
                                                                setResumeLoading(prev => ({ ...prev, [candidate.applicationId]: true }));
                                                                const signedUrl = await getSecureResumeUrl(candidate.applicationId);
                                                                window.open(signedUrl, '_blank', 'noopener,noreferrer');
                                                            } catch (err) {
                                                                toast.error(err.message || 'Could not open resume');
                                                            } finally {
                                                                setResumeLoading(prev => ({ ...prev, [candidate.applicationId]: false }));
                                                            }
                                                        }}
                                                    >
                                                        {resumeLoading[candidate.applicationId] ? (
                                                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2" />
                                                        ) : (
                                                            <FileText className="w-4 h-4 mr-2" />
                                                        )}
                                                        <Lock className="w-3 h-3 mr-1 text-slate-400" />
                                                        {resumeLoading[candidate.applicationId] ? 'Loading...' : 'View Resume'}
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    onClick={() => navigate(`/applications/${candidate.applicationId}/review`)}
                                                >
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Review Application
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )
                    })
                )}
            </div>
        </div>
    );
}
