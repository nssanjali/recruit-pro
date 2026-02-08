
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJobCandidates, getJob } from '../lib/api';
import { Card, Button, Badge, Progress } from './ui';
import { Bot, Sparkles, User, FileText, ArrowLeft, Mail } from 'lucide-react';
import { motion } from 'motion/react';

export function JobCandidates() {
    const { id } = useParams(); // Job ID
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState([]);
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [includeMatchAnalysis, setIncludeMatchAnalysis] = useState(false);

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
        if (score >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getScoreLabel = (score) => {
        if (score >= 80) return 'Good Match';
        if (score >= 50) return 'Average Match';
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
                        <div>
                            <h1 className="text-2xl font-bold mb-2">{job?.title}</h1>
                            <p className="text-slate-400">{job?.department} • {job?.location}</p>
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
                        const score = candidate.matchScore || 0;
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
                                                    <h3 className="text-lg font-bold text-slate-900">{candidate.name}</h3>
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
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 mt-4">
                                                {candidate.resume && (
                                                    <Button variant="outline" size="sm" onClick={() => window.open(candidate.resume, '_blank')}>
                                                        <FileText className="w-4 h-4 mr-2" />
                                                        View Resume
                                                    </Button>
                                                )}
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
