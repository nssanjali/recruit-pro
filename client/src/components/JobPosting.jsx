import { useState } from 'react';
import {
    Briefcase,
    MapPin,
    DollarSign,
    FileText,
    Users,
    Sparkles,
    Zap,
    ArrowRight,
    ShieldCheck,
    Building,
    Clock,
    CheckCircle2,
    X,
    AlertCircle,
    CloudUpload
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Badge,
    Button,
    Input,
    Textarea,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from './ui';
import { motion, AnimatePresence } from 'motion/react';
import { createJob, uploadFile } from '../lib/api';

export function JobPosting({ onComplete, onCancel }) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        department: '',
        location: '',
        type: 'Full-time',
        salary: '',
        description: '',
        requirements: '',
        experience: 'Mid-level',
        jdUrl: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setError('');
        try {
            const url = await uploadFile(file, 'jd');
            setFormData(prev => ({ ...prev, jdUrl: url }));
        } catch (err) {
            setError(err.message || 'Failed to upload JD. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await createJob(formData);
            setSuccess(true);
            setTimeout(() => {
                if (onComplete) onComplete();
            }, 2000);
        } catch (err) {
            setError(err.message || 'Failed to post job. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <Card className="border-none shadow-2xl bg-white p-12 text-center animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Job Posted Successfully!</h2>
                <p className="text-slate-500 mb-8">Your job listing is now live and being indexed by our AI sourcing engine.</p>
                <div className="flex justify-center gap-4">
                    <Button className="bg-slate-900" onClick={onComplete}>Back to Dashboard</Button>
                </div>
            </Card>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-4xl my-8"
            >
                <Card className="border-none shadow-2xl bg-white overflow-hidden relative">
                    {/* Close Button */}
                    <button
                        onClick={onCancel}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-3">
                        {/* Sidebar Info */}
                        <div className="bg-slate-900 p-10 text-white lg:col-span-1">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] flex items-center justify-center mb-8 shadow-lg shadow-[#4285f4]/20">
                                <Briefcase className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">Post a New Role</h2>
                            <p className="text-slate-400 text-sm leading-relaxed mb-8 font-medium">
                                Create a high-impact job listing. Our AI core will immediately start matching your requirements against 10M+ profiles.
                            </p>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                        <Zap className="w-4 h-4 text-yellow-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white mb-1">AI Sourcing</h4>
                                        <p className="text-xs text-slate-500">Automated candidate identification within seconds.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-4 h-4 text-[#8b5cf6]" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white mb-1">Gemin-Enhanced</h4>
                                        <p className="text-xs text-slate-500">Smart screening based on role complexity.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white mb-1">Verify First</h4>
                                        <p className="text-xs text-slate-500">Automated background and skill verification.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-16 p-6 rounded-2xl bg-gradient-to-br from-[#4285f4]/20 to-transparent border border-white/5">
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">System Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs font-bold text-emerald-500">Nexus Core Online</span>
                                </div>
                            </div>
                        </div>

                        {/* Form Area */}
                        <div className="p-10 lg:col-span-2">
                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center gap-3"
                                    >
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Title</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <Input
                                                name="title"
                                                value={formData.title}
                                                onChange={handleChange}
                                                placeholder="e.g. Senior Machine Learning Engineer"
                                                className="pl-10 h-12 bg-slate-50/50 border-slate-100 focus:bg-white transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                                        <div className="relative">
                                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <Input
                                                name="department"
                                                value={formData.department}
                                                onChange={handleChange}
                                                placeholder="e.g. Engineering"
                                                className="pl-10 h-12 bg-slate-50/50 border-slate-100 focus:bg-white transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <Input
                                                name="location"
                                                value={formData.location}
                                                onChange={handleChange}
                                                placeholder="e.g. Palo Alto, CA"
                                                className="pl-10 h-12 bg-slate-50/50 border-slate-100 focus:bg-white transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Salary Range</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <Input
                                                name="salary"
                                                value={formData.salary}
                                                onChange={handleChange}
                                                placeholder="e.g. $160k - $220k"
                                                className="pl-10 h-12 bg-slate-50/50 border-slate-100 focus:bg-white transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Type</label>
                                        <Select value={formData.type} onValueChange={(val) => handleSelectChange('type', val)}>
                                            <SelectTrigger className="h-12 bg-slate-50/50 border-slate-100">
                                                <SelectValue placeholder="Full-time" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Full-time">Full-time</SelectItem>
                                                <SelectItem value="Contract">Contract</SelectItem>
                                                <SelectItem value="Remote">Remote</SelectItem>
                                                <SelectItem value="Hybrid">Hybrid</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Description</label>
                                    <Textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Describe the role, impact, and team..."
                                        className="min-h-[120px] bg-slate-50/50 border-slate-100 focus:bg-white transition-all p-4"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Key Requirements</label>
                                    <Textarea
                                        name="requirements"
                                        value={formData.requirements}
                                        onChange={handleChange}
                                        placeholder="List key skills, tech stack, and qualifications..."
                                        className="min-h-[100px] bg-slate-50/50 border-slate-100 focus:bg-white transition-all p-4"
                                        required
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Job Description (Optional)</label>
                                    <div className={`flex items-center gap-4 p-4 border-2 border-dashed rounded-2xl transition-all ${formData.jdUrl ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.jdUrl ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                            {formData.jdUrl ? <CheckCircle2 className="w-6 h-6 text-white" /> : <CloudUpload className="w-6 h-6 text-slate-500" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-bold ${formData.jdUrl ? 'text-emerald-700' : 'text-slate-700'}`}>
                                                {formData.jdUrl ? 'JD successfully linked to Nexus' : 'Upload official detailed JD'}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Supports PDF, DOCX up to 10MB</p>
                                        </div>
                                        <label className="px-4 py-2 bg-white text-slate-900 text-xs font-black rounded-lg border border-slate-200 hover:bg-slate-900 hover:text-white transition-all cursor-pointer shadow-sm">
                                            {formData.jdUrl ? 'REPLACE SIGNAL' : 'SELECT SIGNAL'}
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.doc,.docx"
                                                onChange={handleFileUpload}
                                                disabled={loading}
                                            />
                                        </label>
                                    </div>
                                </div>


                                <div className="flex items-center justify-between pt-4 gap-6">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={onCancel}
                                        className="text-slate-500 font-bold hover:bg-slate-50 px-8 h-12 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 rounded-xl shadow-xl shadow-slate-900/10 gap-2 border-none"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                <span>Deploying...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <span>Post Job to Nexus</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
