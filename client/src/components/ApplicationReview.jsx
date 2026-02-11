import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Clock,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    GraduationCap,
    Award,
    TrendingUp,
    AlertCircle,
    FileText,
    Download,
    Calendar,
    User,
    Target,
    Sparkles,
    Brain,
    BarChart3,
    ThumbsUp,
    ThumbsDown,
    MessageSquare
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Textarea } from './ui';
import { getApplicationById, updateApplicationStatus } from '../lib/api';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export function ApplicationReview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [application, setApplication] = useState(null);
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadApplication();
    }, [id]);

    const loadApplication = async () => {
        try {
            setLoading(true);
            const response = await getApplicationById(id);
            setApplication(response.data);
            setNotes(response.data.reviewNotes || '');
        } catch (error) {
            console.error('Error loading application:', error);
            toast.error('Failed to load application');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (status) => {
        try {
            setProcessing(true);
            await updateApplicationStatus(id, {
                status,
                reviewNotes: notes
            });
            toast.success(`Application ${status}`);
            navigate(-1);
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update application');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-bold">Loading application...</p>
                </div>
            </div>
        );
    }

    if (!application) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-900 mb-2">Application Not Found</h3>
                <Button onClick={() => navigate(-1)} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                </Button>
            </div>
        );
    }

    const matchScore = application.matchScore || application.aiAnalysis?.matchScore || 0;
    const aiInsights = application.aiAnalysis?.insights || application.aiInsights || {};
    const aiSummary = application.aiAnalysis?.summary || application.aiSummary || 'No AI analysis available yet.';

    const getScoreColor = (score) => {
        if (score >= 80) return 'from-emerald-500 to-green-600';
        if (score >= 60) return 'from-blue-500 to-cyan-600';
        if (score >= 40) return 'from-orange-500 to-amber-600';
        return 'from-red-500 to-rose-600';
    };

    const getScoreLabel = (score) => {
        if (score >= 80) return 'Excellent Match';
        if (score >= 60) return 'Good Match';
        if (score >= 40) return 'Fair Match';
        return 'Poor Match';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={() => navigate(-1)}
                        className="rounded-xl"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">Application Review</h1>
                        <p className="text-slate-500 mt-1">
                            {application.job?.title || 'Position'} • Applied {new Date(application.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <Badge className={`px-4 py-2 text-sm font-bold ${application.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        application.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                    }`}>
                    {application.status?.toUpperCase() || 'PENDING'}
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Candidate Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* AI Match Score */}
                    <Card className="border-slate-200 shadow-lg overflow-hidden">
                        <div className={`h-2 bg-gradient-to-r ${getScoreColor(matchScore)}`} />
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                        <Brain className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900">AI Match Analysis</h3>
                                        <p className="text-sm text-slate-500">Resume-JD compatibility score</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-5xl font-black bg-gradient-to-r ${getScoreColor(matchScore)} bg-clip-text text-transparent`}>
                                        {matchScore}%
                                    </div>
                                    <p className="text-sm font-bold text-slate-600 mt-1">{getScoreLabel(matchScore)}</p>
                                </div>
                            </div>

                            {/* AI Summary */}
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 mb-6">
                                <div className="flex items-start gap-3 mb-3">
                                    <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-black text-slate-900 mb-2">AI-Generated Context</h4>
                                        <p className="text-sm text-slate-700 leading-relaxed">{aiSummary}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Key Insights */}
                            {aiInsights && Object.keys(aiInsights).length > 0 && (
                                <div className="grid grid-cols-2 gap-4">
                                    {aiInsights.strengths && (
                                        <div className="p-4 bg-emerald-50 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ThumbsUp className="w-4 h-4 text-emerald-600" />
                                                <p className="font-bold text-emerald-900 text-sm">Strengths</p>
                                            </div>
                                            <p className="text-xs text-emerald-700">{aiInsights.strengths}</p>
                                        </div>
                                    )}
                                    {aiInsights.concerns && (
                                        <div className="p-4 bg-orange-50 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertCircle className="w-4 h-4 text-orange-600" />
                                                <p className="font-bold text-orange-900 text-sm">Concerns</p>
                                            </div>
                                            <p className="text-xs text-orange-700">{aiInsights.concerns}</p>
                                        </div>
                                    )}
                                    {aiInsights.experience && (
                                        <div className="p-4 bg-blue-50 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Briefcase className="w-4 h-4 text-blue-600" />
                                                <p className="font-bold text-blue-900 text-sm">Experience</p>
                                            </div>
                                            <p className="text-xs text-blue-700">{aiInsights.experience}</p>
                                        </div>
                                    )}
                                    {aiInsights.skills && (
                                        <div className="p-4 bg-purple-50 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Award className="w-4 h-4 text-purple-600" />
                                                <p className="font-bold text-purple-900 text-sm">Skills Match</p>
                                            </div>
                                            <p className="text-xs text-purple-700">{aiInsights.skills}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Candidate Details */}
                    <Card className="border-slate-200 shadow-lg">
                        <CardHeader className="border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-black text-2xl">
                                    {application.candidate?.name?.split(' ').map(n => n[0]).join('') || 'C'}
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black">{application.candidate?.name || 'Candidate'}</CardTitle>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Mail className="w-4 h-4" />
                                            {application.candidate?.email || application.email}
                                        </span>
                                        {application.phone && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="w-4 h-4" />
                                                {application.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Application Responses */}
                            {application.responses && Object.keys(application.responses).length > 0 && (
                                <div>
                                    <h4 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-blue-600" />
                                        Application Responses
                                    </h4>
                                    <div className="space-y-3">
                                        {Object.entries(application.responses).map(([key, value]) => (
                                            <div key={key} className="p-4 bg-slate-50 rounded-xl">
                                                <p className="text-sm font-bold text-slate-700 mb-1">{key}</p>
                                                <p className="text-sm text-slate-600">{value || 'No response'}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resume */}
                            {application.resume && (
                                <div>
                                    <h4 className="font-black text-slate-900 mb-3 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                        Resume
                                    </h4>
                                    <a
                                        href={application.resume}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                                                <FileText className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-blue-900">Resume.pdf</p>
                                                <p className="text-xs text-blue-600">Click to view</p>
                                            </div>
                                        </div>
                                        <Download className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                                    </a>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Actions */}
                <div className="space-y-6">
                    {/* Quick Stats */}
                    <Card className="border-slate-200 shadow-lg">
                        <CardHeader className="border-b border-slate-100">
                            <CardTitle className="text-lg font-black flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-600" />
                                Quick Stats
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <span className="text-sm font-bold text-slate-600">Match Score</span>
                                <span className="text-lg font-black text-slate-900">{matchScore}%</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <span className="text-sm font-bold text-slate-600">Applied</span>
                                <span className="text-sm font-bold text-slate-900">
                                    {new Date(application.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <span className="text-sm font-bold text-slate-600">Status</span>
                                <Badge className="text-xs">
                                    {application.status?.toUpperCase() || 'PENDING'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Review Notes */}
                    <Card className="border-slate-200 shadow-lg">
                        <CardHeader className="border-b border-slate-100">
                            <CardTitle className="text-lg font-black">Review Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add your review notes here..."
                                rows={6}
                                className="mb-4"
                            />
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <Card className="border-slate-200 shadow-lg">
                        <CardHeader className="border-b border-slate-100">
                            <CardTitle className="text-lg font-black">Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-3">
                            <Button
                                onClick={() => handleStatusUpdate('accepted')}
                                disabled={processing || application.status === 'accepted'}
                                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold h-12"
                            >
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                                Accept Application
                            </Button>
                            <Button
                                onClick={() => handleStatusUpdate('rejected')}
                                disabled={processing || application.status === 'rejected'}
                                variant="outline"
                                className="w-full border-2 border-red-200 text-red-600 hover:bg-red-50 font-bold h-12"
                            >
                                <XCircle className="w-5 h-5 mr-2" />
                                Reject Application
                            </Button>
                            <Button
                                onClick={() => handleStatusUpdate('pending')}
                                disabled={processing}
                                variant="outline"
                                className="w-full font-bold h-12"
                            >
                                <Clock className="w-5 h-5 mr-2" />
                                Mark as Pending
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
