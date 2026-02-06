import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJob, checkJobMatch } from '../lib/api';
import { Card, Button, Progress } from './ui';
import { ArrowLeft, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Share2, Download } from 'lucide-react';
import { motion } from 'motion/react';

export function MatchAnalysis({ user }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState(null);
    const [expandedSkills, setExpandedSkills] = useState(true);
    const [expandedExp, setExpandedExp] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch analysis immediately on load
                const data = await checkJobMatch(id);
                // Robust data handling: check for analysis OR matchScore
                const result = data.analysis || data.matchScore;

                if (result) {
                    // Ensure all expected fields exist even if using older backend logic
                    const safeAnalysis = {
                        score: result.score || 0,
                        skillsScore: result.skillsScore || Math.round((result.score || 0) * 0.7), // Fallback approximation
                        experienceScore: result.experienceScore || Math.round((result.score || 0) * 0.3), // Fallback approximation
                        missingKeywords: result.missingKeywords || [],
                        strongMatches: result.strongMatches || [],
                        experienceMatches: result.experienceMatches || [],
                        summary: result.summary || "Analysis complete."
                    };
                    setAnalysis(safeAnalysis);
                }
            } catch (error) {
                console.error("Analysis Error", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Generating score report...</p>
                </div>
            </div>
        );
    }

    if (!analysis) return <div className="p-10 text-center">Analysis unavailable</div>;

    const getScoreColor = (score) => {
        if (score >= 70) return 'text-emerald-500';
        if (score >= 40) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0 text-slate-500">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Job
                    </Button>
                    <h1 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Score Analysis</h1>
                    <div className="w-20" /> {/* Spacer */}
                </div>

                {/* Main Score Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-100" />

                    <h2 className="bg-slate-800 text-white text-xs font-bold py-1 px-4 inline-block rounded-b-lg mb-6 shadow-sm">
                        JD-Resume Match Score
                    </h2>

                    <div className="flex items-end justify-center leading-none mb-2">
                        <span className="text-8xl font-black text-slate-800 tracking-tighter">
                            {Math.round(analysis.score)}
                        </span>
                        <span className="text-4xl font-bold text-slate-300 mb-2 ml-1">
                            /100
                        </span>
                    </div>
                </motion.div>

                {/* Skills Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"
                >
                    <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => setExpandedSkills(!expandedSkills)}
                    >
                        <div className="flex items-center gap-3">
                            <span className="transform transition-transform duration-200">
                                {expandedSkills ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />}
                            </span>
                            <span className="font-bold text-slate-800">Matching skills Score</span>
                        </div>
                        <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-md">
                            {analysis.skillsScore}/70
                        </span>
                    </div>

                    {expandedSkills && (
                        <div className="p-4 pt-0 border-t border-slate-100">
                            <div className="flex items-start gap-2 mt-4 mb-4 text-slate-500 text-sm">
                                <AlertCircle className="w-4 h-4 mt-0.5 text-[#4285f4]" />
                                <p>Consider adding these skills to increase your score. Click skill to view resume point where it can be added.</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {analysis.missingKeywords.map((skill, i) => (
                                    <span
                                        key={i}
                                        className="px-3 py-1.5 bg-white border border-[#4285f4] text-[#4285f4] text-xs font-bold rounded-md hover:bg-[#4285f4] hover:text-white cursor-pointer transition-colors"
                                    >
                                        {skill}
                                    </span>
                                ))}
                                {analysis.missingKeywords.length === 0 && (
                                    <span className="text-sm text-emerald-600 font-medium italic">
                                        No major missing skills found!
                                    </span>
                                )}
                            </div>

                            <div className="mt-6">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-3 text-center">Matched Skills present in Resume</p>
                                <div className="flex flex-wrap gap-2 justify-center opacity-70">
                                    {analysis.strongMatches.map((skill, i) => (
                                        <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Experience Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"
                >
                    <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => setExpandedExp(!expandedExp)}
                    >
                        <div className="flex items-center gap-3">
                            <span className="transform transition-transform duration-200">
                                {expandedExp ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />}
                            </span>
                            <span className="font-bold text-slate-400">Relevant Experience Score</span>
                        </div>
                        <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-md">
                            {analysis.experienceScore ?? 12}/30
                        </span>
                    </div>

                    {expandedExp && (
                        <div className="p-4 pt-0 border-t border-slate-100">
                            <div className="mt-4 mb-4 text-slate-500 text-sm leading-relaxed">
                                <p className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 mt-1 text-emerald-500 shrink-0" />
                                    <span>
                                        This score reflects how well your resume matches the broader context of the job,
                                        including soft skills, industry terminology, and role-specific language.
                                    </span>
                                </p>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Context Loops & Keywords Found</h4>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.experienceMatches && analysis.experienceMatches.length > 0 ? (
                                        analysis.experienceMatches.map((term, i) => (
                                            <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded border border-indigo-100">
                                                {term}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">
                                            No specific context matches found. Try adding more industry-standard terms.
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>

            </div>
        </div >
    );
}
