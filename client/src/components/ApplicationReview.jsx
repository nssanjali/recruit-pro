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
    Upload,
    Calendar,
    User,
    Target,
    Sparkles,
    Brain,
    BarChart3,
    ThumbsUp,
    ThumbsDown,
    MessageSquare,
    Lock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Textarea } from './ui';
import {
    getApplicationById,
    updateApplicationStatus,
    reanalyzeApplication,
    submitInterviewReview,
    uploadFile,
    getSecureResumeUrl
} from '../lib/api';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { getApplicationStatusLabel, normalizeApplicationStatus } from '../lib/applicationStatus';

export function ApplicationReview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [application, setApplication] = useState(null);
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [reanalyzing, setReanalyzing] = useState(false);
    const [submittingInterviewReview, setSubmittingInterviewReview] = useState(false);
    const [interviewReviewNotes, setInterviewReviewNotes] = useState('');
    const [interviewRecommendation, setInterviewRecommendation] = useState('consider');
    const [transcriptFile, setTranscriptFile] = useState(null);
    const [transcriptText, setTranscriptText] = useState('');
    const [insightMode, setInsightMode] = useState('strengths');
    const [resumeLoading, setResumeLoading] = useState(false);

    const currentUserRole = (() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}')?.role || '';
        } catch {
            return '';
        }
    })();
    const isCompanyAdminView = ['company_admin', 'super_admin'].includes(currentUserRole);
    const canUpdateApplicationStatus = ['company_admin', 'super_admin'].includes(currentUserRole);

    useEffect(() => {
        loadApplication();
    }, [id]);

    const loadApplication = async () => {
        try {
            setLoading(true);
            const response = await getApplicationById(id);
            setApplication(response.data);
            setNotes(response.data.reviewNotes || '');
            const existingInterviewReview = response.data.interviewReview || response.data.interview?.interviewReview;
            if (existingInterviewReview) {
                setInterviewReviewNotes(existingInterviewReview.notes || '');
                setInterviewRecommendation(existingInterviewReview.recruiterRecommendation || 'consider');
            } else {
                setInterviewReviewNotes('');
                setInterviewRecommendation('consider');
            }
            setTranscriptFile(null);
        } catch (error) {
            console.error('Error loading application:', error);
            toast.error('Failed to load application');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (status) => {
        if (!canUpdateApplicationStatus) {
            toast.error('Only company admins can update application status');
            return;
        }
        if (
            currentUserRole === 'recruiter' &&
            ['accepted', 'rejected'].includes(status) &&
            requiresInterviewDecisionFlow &&
            !hasInterviewReview
        ) {
            toast.error('Submit post-interview review and transcript first for final decision');
            return;
        }
        try {
            setProcessing(true);
            const response = await updateApplicationStatus(id, {
                status,
                reviewNotes: notes
            });

            if (status === 'shortlisted') {
                if (response?.interviewScheduled) {
                    toast.success(response?.message || 'Application shortlisted and interview scheduled');
                    await loadApplication();
                    navigate(-1);
                } else {
                    if (response?.schedulingDiagnostics) {
                        console.warn('Scheduling diagnostics:', response.schedulingDiagnostics);
                    }
                    toast.info(response?.message || 'Application shortlisted. Interview scheduling is pending.');
                    await loadApplication();
                }
                return;
            }

            toast.success(response?.message || `Application ${status}`);
            navigate(-1);
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error(error.message || 'Failed to update application');
        } finally {
            setProcessing(false);
        }
    };

    const handleReanalyze = async () => {
        try {
            setReanalyzing(true);
            toast.info('Running Gemini AI analysis... this may take ~10s');
            const result = await reanalyzeApplication(id);
            toast.success(result.message || 'Re-analysis complete!');
            // Reload fresh data from DB
            await loadApplication();
        } catch (error) {
            console.error('Re-analysis error:', error);
            toast.error(error.message || 'Re-analysis failed');
        } finally {
            setReanalyzing(false);
        }
    };

    const handleSubmitInterviewReview = async () => {
        if (!interview?._id) {
            toast.error('No interview found for this application');
            return;
        }
        if (!canSubmitInterviewReview) {
            toast.error('Interview review unlocks only after interview end time');
            return;
        }
        if (!interviewReviewNotes.trim()) {
            toast.error('Please add recruiter interview review notes');
            return;
        }

        const isAbsent = interviewRecommendation === 'absent';

        if (!isAbsent && !transcriptFile && !transcriptText.trim() && !interviewReview?.transcript?.url) {
            toast.error('Please upload transcript PDF or paste transcript text');
            return;
        }

        try {
            setSubmittingInterviewReview(true);
            let transcriptUrl = interviewReview?.transcript?.url || '';
            let transcriptName = interviewReview?.transcript?.name || '';

            if (!isAbsent && transcriptFile) {
                transcriptUrl = await uploadFile(transcriptFile, 'file');
                transcriptName = transcriptFile.name;
            }

            await submitInterviewReview(interview._id, {
                recruiterRecommendation: interviewRecommendation,
                reviewNotes: interviewReviewNotes.trim(),
                transcriptUrl: isAbsent ? undefined : transcriptUrl,
                transcriptText: isAbsent ? undefined : (transcriptText.trim() || undefined),
                transcriptName: isAbsent ? undefined : transcriptName
            });

            toast.success(
                isAbsent
                    ? 'Candidate marked absent - reliability credits have been deducted'
                    : 'Interview review submitted and AI analysis generated'
            );
            await loadApplication();
        } catch (error) {
            console.error('Interview review submit error:', error);
            toast.error(error.message || 'Failed to submit interview review');
        } finally {
            setSubmittingInterviewReview(false);
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

    // Map new evaluation fields with fallbacks for old data
    const matchScore = application.finalScore || application.matchScore || application.aiAnalysis?.matchScore || 0;
    const aiSummary = application.aiSummary || application.aiAnalysis?.summary || 'No AI analysis available yet.';

    // Build arrays (prefer new flat fields, fall back to old aiAnalysis string)
    const aiStrengthsArr = application.aiStrengths?.length > 0
        ? application.aiStrengths
        : (application.aiAnalysis?.insights?.strengths ? [application.aiAnalysis.insights.strengths] : []);
    const aiWeaknessesArr = application.aiWeaknesses?.length > 0
        ? application.aiWeaknesses
        : (application.aiAnalysis?.insights?.concerns ? [application.aiAnalysis.insights.concerns] : []);

    const resumeScore = application.resumeScore ?? null;
    const profileScore = application.profileScore ?? null;
    const strongMatches = application.aiAnalysis?.strongMatches || [];
    const missingKeywords = application.aiAnalysis?.missingKeywords || [];

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

    const normalizedStatus = normalizeApplicationStatus(application.status);
    const interview = application.interview || null;
    const interviewReview = application.interviewReview || interview?.interviewReview || null;
    const interviewAi = application.interviewAiAnalysis || interview?.aiInterviewAnalysis || null;
    const toNormalizedScore = (value) => {
        const score = Number(value);
        if (!Number.isFinite(score)) return null;
        return Math.max(0, Math.min(100, score));
    };
    const deriveRecruiterReviewScore = () => {
        const directScore = toNormalizedScore(interviewReview?.score ?? interviewReview?.overallScore);
        if (directScore !== null) return Math.round(directScore);

        const ratingValues = Object.values(interviewReview?.ratings || {})
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value >= 0);
        if (ratingValues.length > 0) {
            const maxRatingValue = Math.max(...ratingValues);
            const normalized = maxRatingValue <= 5
                ? ratingValues.map((value) => value * 20)
                : ratingValues;
            const avg = normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
            return Math.round(Math.max(0, Math.min(100, avg)));
        }

        const rec = String(interviewReview?.recruiterRecommendation || '').toLowerCase();
        if (rec === 'hire') return 85;
        if (rec === 'consider') return 65;
        if (rec === 'reject') return 40;
        return null;
    };
    const initialShortlistScore = Math.round(toNormalizedScore(matchScore) ?? 0);
    const recruiterReviewScore = deriveRecruiterReviewScore();
    const interviewAiScore = toNormalizedScore(interviewAi?.score);
    const hasAllSelectionScores = recruiterReviewScore !== null && interviewAiScore !== null;
    const adminSelectionAverage = hasAllSelectionScores
        ? Math.round((initialShortlistScore + recruiterReviewScore + interviewAiScore) / 3)
        : null;
    const hasInterviewReview = Boolean(interviewReview);
    const interviewEndTime = interview?.endsAt || interview?.scheduledAt || null;
    const interviewUnlocked = interviewEndTime ? new Date(interviewEndTime).getTime() <= Date.now() : false;
    const interviewUnlockLabel = interviewEndTime ? new Date(interviewEndTime).toLocaleString() : 'interview completion';
    const canReviewInterview = ['recruiter', 'company_admin', 'admin', 'super_admin'].includes(currentUserRole);
    const requiresInterviewDecisionFlow = canReviewInterview && Boolean(interview);
    const canSubmitInterviewReview = requiresInterviewDecisionFlow && interviewUnlocked;
    const canFinalizeDecision = !requiresInterviewDecisionFlow || hasInterviewReview;
    const statusBadgeClass = normalizedStatus === 'accepted'
        ? 'bg-green-100 text-green-700'
        : normalizedStatus === 'rejected'
            ? 'bg-red-100 text-red-700'
            : normalizedStatus === 'shortlisted' || normalizedStatus === 'interview_scheduled'
                ? 'bg-violet-100 text-violet-700'
                : 'bg-yellow-100 text-yellow-700';
    const scoreBreakdown = [
        { label: 'Resume Match', value: resumeScore, card: 'bg-blue-50', valueText: 'text-blue-700', labelText: 'text-blue-500' },
        { label: 'Profile Score', value: profileScore, card: 'bg-purple-50', valueText: 'text-purple-700', labelText: 'text-purple-500' },
        { label: 'Final Score', value: matchScore, card: 'bg-emerald-50', valueText: 'text-emerald-700', labelText: 'text-emerald-500' }
    ].filter((item) => item.value !== null && item.value !== undefined);
    const appliedDate = new Date(application.appliedAt || application.createdAt).toLocaleDateString();
    const scoreValue = Math.max(0, Math.min(100, Number(matchScore) || 0));
    const ringRadius = 34;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference - (scoreValue / 100) * ringCircumference;

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-2">
            {/* Header */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-500" />
                <div className="p-5 sm:p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Button
                            variant="outline"
                            onClick={() => navigate(-1)}
                            className="rounded-xl"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleReanalyze}
                            disabled={reanalyzing}
                            className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-bold"
                        >
                            {reanalyzing ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Brain className="w-3 h-3 mr-2" />
                                    Re-Analyze [DEV]
                                </>
                            )}
                        </Button>
                        <div className="flex items-center gap-4">
                            {application.job?.companyLogo && (
                                <img src={application.job.companyLogo} alt="Company Logo" className="w-12 h-12 rounded-xl object-cover shadow-sm border border-slate-200" />
                            )}
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Application Intelligence</p>
                                <h1 className="text-3xl font-black text-slate-900 mt-1">Application Review</h1>
                                <p className="text-slate-500 mt-1 text-sm">
                                    {application.job?.title || 'Position'} {application.job?.company ? `at ${application.job.company}` : ''} | Applied {appliedDate}
                                </p>
                            </div>
                        </div>
                    </div>
                    <Badge className={`px-4 py-2 text-sm font-bold ${statusBadgeClass}`}>
                        {getApplicationStatusLabel(normalizedStatus).toUpperCase() || 'PENDING'}
                    </Badge>
                </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left Column - Candidate Info */}
                <div className="xl:col-span-8 space-y-6">
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
                                <div className="relative h-20 w-20">
                                    <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                                        <circle cx="40" cy="40" r={ringRadius} stroke="#e2e8f0" strokeWidth="8" fill="none" />
                                        <motion.circle
                                            cx="40"
                                            cy="40"
                                            r={ringRadius}
                                            stroke="url(#scoreGradient)"
                                            strokeWidth="8"
                                            fill="none"
                                            strokeLinecap="round"
                                            initial={{ strokeDashoffset: ringCircumference }}
                                            animate={{ strokeDashoffset: ringOffset }}
                                            transition={{ duration: 0.9, ease: 'easeOut' }}
                                            style={{ strokeDasharray: ringCircumference }}
                                        />
                                        <defs>
                                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#0ea5e9" />
                                                <stop offset="100%" stopColor="#8b5cf6" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-800">
                                        {scoreValue}%
                                    </div>
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

                            {/* Score Breakdown */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                                {scoreBreakdown.map((item) => (
                                    <div key={item.label} className={`p-3 rounded-xl text-center ${item.card}`}>
                                        <div className={`text-2xl font-black ${item.valueText}`}>{item.value}%</div>
                                        <div className={`text-xs font-bold mt-1 ${item.labelText}`}>{item.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-2">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {[
                                        { id: 'strengths', label: 'Strengths', icon: ThumbsUp, activeClass: 'bg-emerald-600 text-white', idleClass: 'bg-emerald-50 text-emerald-700' },
                                        { id: 'concerns', label: 'Concerns', icon: AlertCircle, activeClass: 'bg-orange-600 text-white', idleClass: 'bg-orange-50 text-orange-700' },
                                        { id: 'skills', label: 'Skills Gap', icon: Target, activeClass: 'bg-rose-600 text-white', idleClass: 'bg-rose-50 text-rose-700' }
                                    ].map((item) => {
                                        const Icon = item.icon;
                                        const active = insightMode === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setInsightMode(item.id)}
                                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${active ? item.activeClass : item.idleClass}`}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                {item.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <motion.div
                                    key={insightMode}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="rounded-2xl border border-slate-200 p-4 bg-white"
                                >
                                    {insightMode === 'strengths' && (
                                        aiStrengthsArr.length > 0 ? (
                                            <ul className="space-y-2">
                                                {aiStrengthsArr.map((item, idx) => (
                                                    <li key={`strength-${idx}`} className="flex items-start gap-2 text-sm text-slate-700">
                                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-slate-500">No strengths detected by AI.</p>
                                        )
                                    )}
                                    {insightMode === 'concerns' && (
                                        aiWeaknessesArr.length > 0 ? (
                                            <ul className="space-y-2">
                                                {aiWeaknessesArr.map((item, idx) => (
                                                    <li key={`concern-${idx}`} className="flex items-start gap-2 text-sm text-slate-700">
                                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-slate-500">No major concerns flagged.</p>
                                        )
                                    )}
                                    {insightMode === 'skills' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Matched Skills</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {strongMatches.length > 0 ? strongMatches.map((s) => (
                                                        <span key={s} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">{s}</span>
                                                    )) : (
                                                        <span className="text-xs text-slate-500">No exact keyword matches.</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Missing Skills</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {missingKeywords.length > 0 ? missingKeywords.map((s) => (
                                                        <span key={s} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">{s}</span>
                                                    )) : (
                                                        <span className="text-xs text-slate-500">No explicit gaps identified.</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
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
                            {application.responses && Object.keys(application.responses).length > 0 && (() => {
                                // Filter out entries whose key looks like a raw field ID (e.g. "field_1234_abc")
                                // This is a client-side safety net; the backend should already resolve them.
                                const isFieldId = (key) => /^field_\d+_[a-z0-9]+$/.test(key) || /^mandatory_/.test(key);
                                const displayResponses = Object.entries(application.responses)
                                    .filter(([key]) => !isFieldId(key));

                                if (displayResponses.length === 0) return null;

                                const formatValue = (value) => {
                                    if (Array.isArray(value)) return value.join(', ');
                                    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
                                    return value || 'No response';
                                };

                                return (
                                    <div>
                                        <h4 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                                            <MessageSquare className="w-5 h-5 text-blue-600" />
                                            Application Responses
                                        </h4>
                                        <div className="space-y-3">
                                            {displayResponses.map(([key, value]) => (
                                                <motion.div
                                                    key={key}
                                                    whileHover={{ y: -2, scale: 1.01 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="p-4 bg-slate-50 rounded-xl border border-slate-100"
                                                >
                                                    <p className="text-sm font-bold text-slate-700 mb-1">{key}</p>
                                                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{formatValue(value)}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}


                            {/* Resume — secure access via signed URL */}
                            {application.resume && (
                                <div>
                                    <h4 className="font-black text-slate-900 mb-3 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                        Resume
                                    </h4>
                                    <button
                                        type="button"
                                        disabled={resumeLoading}
                                        onClick={async () => {
                                            try {
                                                setResumeLoading(true);
                                                const signedUrl = await getSecureResumeUrl(id);
                                                window.open(signedUrl, '_blank', 'noopener,noreferrer');
                                            } catch (err) {
                                                toast.error(err.message || 'Could not open resume');
                                            } finally {
                                                setResumeLoading(false);
                                            }
                                        }}
                                        className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                                                <FileText className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-blue-900">Resume.pdf</p>
                                                <p className="text-xs text-blue-600 flex items-center gap-1">
                                                    <Lock className="w-3 h-3" />
                                                    {resumeLoading ? 'Generating secure link...' : 'Secure access — click to view'}
                                                </p>
                                            </div>
                                        </div>
                                        {resumeLoading ? (
                                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Download className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                                        )}
                                    </button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Actions */}
                <div className="xl:col-span-4 space-y-6 xl:sticky xl:top-4 self-start">
                    {/* Quick Stats */}
                    <Card className="border-slate-200 shadow-lg">
                        <CardHeader className="border-b border-slate-100">
                            <CardTitle className="text-lg font-black flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-600" />
                                Quick Stats
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                                <span className="text-sm font-bold text-slate-700">Final Score</span>
                                <span className="text-xl font-black text-blue-600">{matchScore}%</span>
                            </div>
                            {isCompanyAdminView && (
                                <div className="p-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-emerald-800">Selection Average (3 Metrics)</span>
                                        <span className="text-xl font-black text-emerald-700">
                                            {adminSelectionAverage !== null ? `${adminSelectionAverage}%` : 'Pending'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-semibold text-emerald-700">
                                        {adminSelectionAverage !== null
                                            ? `Initial ${initialShortlistScore}% | Recruiter ${recruiterReviewScore}% | Interview AI ${Math.round(interviewAiScore)}%`
                                            : `Initial ${initialShortlistScore}% | waiting for recruiter review score and interview AI score`}
                                    </p>
                                </div>
                            )}
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                                    <span>AI Confidence Meter</span>
                                    <span>{scoreValue}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${scoreValue}%` }}
                                        transition={{ duration: 0.7, ease: 'easeOut' }}
                                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500"
                                    />
                                </div>
                            </div>
                            {application.resumeScore !== undefined && (
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <span className="text-xs font-bold text-slate-600">Resume Match</span>
                                    <span className="text-sm font-black text-slate-900">{application.resumeScore}%</span>
                                </div>
                            )}
                            {application.profileScore !== undefined && (
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <span className="text-xs font-bold text-slate-600">Profile Score</span>
                                    <span className="text-sm font-black text-slate-900">{application.profileScore}%</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <span className="text-sm font-bold text-slate-600">Applied</span>
                                <span className="text-sm font-bold text-slate-900">
                                    {appliedDate}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <span className="text-sm font-bold text-slate-600">Status</span>
                                <Badge className="text-xs">
                                    {getApplicationStatusLabel(normalizedStatus).toUpperCase() || 'PENDING'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Review Notes */}
                    {interview && (
                        <Card className="border-slate-200 shadow-lg">
                            <CardHeader className="border-b border-slate-100">
                                <CardTitle className="text-lg font-black">Post-Interview Final Review</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                                    <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Decision Source</p>
                                    <p className="text-sm font-semibold text-indigo-900 mt-1">
                                        Recruiter review + transcript AI analysis
                                    </p>
                                    <p className="text-xs text-indigo-700 mt-1">
                                        {canSubmitInterviewReview
                                            ? 'Interview completed. You can now submit final review.'
                                            : `Unlocks after ${interviewUnlockLabel}`}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-600">Outcome / Recommendation</label>
                                    <select
                                        value={interviewRecommendation}
                                        onChange={(e) => setInterviewRecommendation(e.target.value)}
                                        className="mt-1 w-full h-10 rounded-xl border border-slate-300 px-3 text-sm font-semibold bg-white"
                                        disabled={!canSubmitInterviewReview || submittingInterviewReview}
                                    >
                                        <option value="hire">Hire</option>
                                        <option value="consider">Consider</option>
                                        <option value="reject">Reject</option>
                                        <option value="absent">Absent (No-Show)</option>
                                    </select>
                                    {interviewRecommendation === 'absent' && (
                                        <div className="mt-2 p-3 rounded-xl bg-red-50 border border-red-200">
                                            <p className="text-xs font-bold text-red-700">No-Show Penalty</p>
                                            <p className="text-xs text-red-600 mt-1">
                                                Selecting <strong>Absent</strong> will deduct <strong>20 reliability credits</strong> from the candidate and automatically reject the application. No transcript is required.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <Textarea
                                    value={interviewReviewNotes}
                                    onChange={(e) => setInterviewReviewNotes(e.target.value)}
                                    placeholder="Add interview feedback, strengths, concerns, and final reasoning..."
                                    rows={4}
                                    disabled={!canSubmitInterviewReview || submittingInterviewReview}
                                />

                                {interviewRecommendation !== 'absent' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-600">Transcript PDF (Upload)</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)}
                                                    disabled={!canSubmitInterviewReview || submittingInterviewReview}
                                                    className="w-full text-xs"
                                                />
                                            </div>
                                            {interviewReview?.transcript?.url && !transcriptFile && (
                                                <a
                                                    href={interviewReview.transcript.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-bold text-blue-600 hover:underline"
                                                >
                                                    View submitted transcript
                                                </a>
                                            )}
                                        </div>

                                        <Textarea
                                            value={transcriptText}
                                            onChange={(e) => setTranscriptText(e.target.value)}
                                            placeholder="Optional: paste transcript text here if PDF is unavailable"
                                            rows={3}
                                            disabled={!canSubmitInterviewReview || submittingInterviewReview}
                                        />
                                    </>
                                )}

                                <Button
                                    onClick={handleSubmitInterviewReview}
                                    disabled={!canSubmitInterviewReview || submittingInterviewReview}
                                    className={`w-full font-bold text-white ${interviewRecommendation === 'absent' ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700' : 'bg-gradient-to-r from-indigo-600 to-blue-600'}`}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {submittingInterviewReview
                                        ? 'Submitting...'
                                        : interviewRecommendation === 'absent'
                                            ? 'Mark as Absent & Deduct Credits'
                                            : hasInterviewReview
                                                ? 'Update Final Interview Review'
                                                : 'Submit Final Interview Review'}
                                </Button>

                                {hasInterviewReview && interviewAi && (
                                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 space-y-2">
                                        <p className="text-xs font-black text-emerald-700 uppercase tracking-wide">AI Interview Analysis</p>
                                        <p className="text-sm text-emerald-900">{interviewAi.summary}</p>
                                        <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                                            <span>Recommendation: {String(interviewAi.recommendation || 'consider').toUpperCase()}</span>
                                            <span>Score: {interviewAi.score ?? '-'}%</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

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
                            {canUpdateApplicationStatus ? (
                                <>
                                    <Button
                                        onClick={() => handleStatusUpdate('accepted')}
                                        disabled={processing || normalizedStatus === 'accepted' || !canFinalizeDecision}
                                        className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold h-12 transition-transform hover:-translate-y-0.5"
                                    >
                                        <CheckCircle2 className="w-5 h-5 mr-2" />
                                        Accept Application
                                    </Button>
                                    <Button
                                        onClick={() => handleStatusUpdate('shortlisted')}
                                        disabled={processing || normalizedStatus === 'shortlisted' || normalizedStatus === 'interview_scheduled'}
                                        variant="outline"
                                        className="w-full border-2 border-violet-200 text-violet-700 hover:bg-violet-50 font-bold h-12 transition-transform hover:-translate-y-0.5"
                                    >
                                        <Target className="w-5 h-5 mr-2" />
                                        Shortlist & Schedule Interview
                                    </Button>
                                    <Button
                                        onClick={() => handleStatusUpdate('rejected')}
                                        disabled={processing || normalizedStatus === 'rejected' || !canFinalizeDecision}
                                        variant="outline"
                                        className="w-full border-2 border-red-200 text-red-600 hover:bg-red-50 font-bold h-12 transition-transform hover:-translate-y-0.5"
                                    >
                                        <XCircle className="w-5 h-5 mr-2" />
                                        Reject Application
                                    </Button>
                                    <Button
                                        onClick={() => handleStatusUpdate('pending')}
                                        disabled={processing}
                                        variant="outline"
                                        className="w-full font-bold h-12 transition-transform hover:-translate-y-0.5"
                                    >
                                        <Clock className="w-5 h-5 mr-2" />
                                        Mark as Pending
                                    </Button>
                                    {!canFinalizeDecision && (
                                        <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                                            Final decisions (Accept/Reject) unlock after recruiter submits post-interview review and transcript analysis.
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                                    Application status can only be changed by company admins.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}


