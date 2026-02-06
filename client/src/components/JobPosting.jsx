import { useState, useEffect } from 'react';
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
    CloudUpload,
    Calendar,
    Award,
    Target,
    Gift,
    Code
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Badge,
    Button,
    Input,
    Textarea
} from './ui';
import { motion, AnimatePresence } from 'motion/react';
import { createJob, uploadFile } from '../lib/api';
import { getTemplates } from '../lib/templateApi';

export function JobPosting({ onComplete, onCancel }) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [templates, setTemplates] = useState([]);
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        title: '',
        company: '',
        department: '',
        location: '',
        jobType: 'Full-time',
        workMode: 'On-site',
        salary: '',
        description: '',
        requirements: '',
        responsibilities: '',
        skills: '',
        benefits: '',
        experience: 'Mid-level',
        openings: '1',
        deadline: '',
        templateId: '',
        jdUrl: ''
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const data = await getTemplates();
            setTemplates(data || []);
        } catch (err) {
            console.error('Error fetching templates:', err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
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

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    if (success) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl p-12 text-center shadow-2xl max-w-md"
                >
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Job Posted Successfully!</h2>
                    <p className="text-slate-500 mb-8">Your job listing is now live and ready to receive applications.</p>
                    <Button className="bg-slate-900 hover:bg-slate-800" onClick={onComplete}>Back to Dashboard</Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-6xl my-8"
            >
                <Card className="border-none shadow-2xl bg-white overflow-hidden">
                    {/* Close Button */}
                    <button
                        onClick={onCancel}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                                <Briefcase className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black tracking-tight">Post a New Job</h2>
                                <p className="text-white/80 text-sm font-medium mt-1">Create a comprehensive job listing</p>
                            </div>
                        </div>

                        {/* Progress Steps */}
                        <div className="flex items-center gap-4">
                            {[1, 2, 3].map((step) => (
                                <div key={step} className="flex items-center flex-1">
                                    <div className={`flex items-center gap-3 flex-1 ${step < 3 ? 'pr-4' : ''}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${currentStep >= step ? 'bg-white text-blue-600' : 'bg-white/20 text-white/60'
                                            }`}>
                                            {step}
                                        </div>
                                        <span className={`text-sm font-bold ${currentStep >= step ? 'text-white' : 'text-white/60'}`}>
                                            {step === 1 ? 'Basic Info' : step === 2 ? 'Details' : 'Requirements'}
                                        </span>
                                    </div>
                                    {step < 3 && (
                                        <div className={`h-0.5 flex-1 ${currentStep > step ? 'bg-white' : 'bg-white/20'}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-8 pt-6"
                            >
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5" />
                                    {error}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-8">
                        {/* Step 1: Basic Information */}
                        {currentStep === 1 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Job Title *</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                name="title"
                                                value={formData.title}
                                                onChange={handleChange}
                                                placeholder="e.g. Senior Full Stack Developer"
                                                className="pl-10 h-12"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Company *</label>
                                        <div className="relative">
                                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                name="company"
                                                value={formData.company}
                                                onChange={handleChange}
                                                placeholder="e.g. TechCorp Inc."
                                                className="pl-10 h-12"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department *</label>
                                        <div className="relative">
                                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                name="department"
                                                value={formData.department}
                                                onChange={handleChange}
                                                placeholder="e.g. Engineering"
                                                className="pl-10 h-12"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Location *</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                name="location"
                                                value={formData.location}
                                                onChange={handleChange}
                                                placeholder="e.g. San Francisco, CA"
                                                className="pl-10 h-12"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Job Type *</label>
                                        <select
                                            name="jobType"
                                            value={formData.jobType}
                                            onChange={handleChange}
                                            className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            <option value="Full-time">Full-time</option>
                                            <option value="Part-time">Part-time</option>
                                            <option value="Contract">Contract</option>
                                            <option value="Internship">Internship</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Work Mode *</label>
                                        <select
                                            name="workMode"
                                            value={formData.workMode}
                                            onChange={handleChange}
                                            className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            <option value="On-site">On-site</option>
                                            <option value="Remote">Remote</option>
                                            <option value="Hybrid">Hybrid</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Experience Level *</label>
                                        <select
                                            name="experience"
                                            value={formData.experience}
                                            onChange={handleChange}
                                            className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            <option value="Entry-level">Entry-level</option>
                                            <option value="Mid-level">Mid-level</option>
                                            <option value="Senior">Senior</option>
                                            <option value="Lead">Lead</option>
                                            <option value="Executive">Executive</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Salary Range *</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                name="salary"
                                                value={formData.salary}
                                                onChange={handleChange}
                                                placeholder="e.g. $120k - $180k"
                                                className="pl-10 h-12"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Number of Openings *</label>
                                        <div className="relative">
                                            <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                type="number"
                                                name="openings"
                                                value={formData.openings}
                                                onChange={handleChange}
                                                placeholder="1"
                                                min="1"
                                                className="pl-10 h-12"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Application Deadline</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                type="date"
                                                name="deadline"
                                                value={formData.deadline}
                                                onChange={handleChange}
                                                className="pl-10 h-12"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Job Details */}
                        {currentStep === 2 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6"
                            >
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Job Description *</label>
                                    <Textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
                                        className="min-h-[150px]"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Key Responsibilities *</label>
                                    <Textarea
                                        name="responsibilities"
                                        value={formData.responsibilities}
                                        onChange={handleChange}
                                        placeholder="• Lead development of new features&#10;• Mentor junior developers&#10;• Collaborate with product team"
                                        className="min-h-[120px]"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Benefits & Perks</label>
                                    <div className="relative">
                                        <Gift className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <Textarea
                                            name="benefits"
                                            value={formData.benefits}
                                            onChange={handleChange}
                                            placeholder="• Health, dental, and vision insurance&#10;• 401(k) matching&#10;• Flexible PTO&#10;• Remote work options"
                                            className="pl-10 min-h-[100px]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Upload Job Description (Optional)</label>
                                    <div className={`flex items-center gap-4 p-4 border-2 border-dashed rounded-xl transition-all ${formData.jdUrl ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                        }`}>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.jdUrl ? 'bg-emerald-500' : 'bg-slate-200'
                                            }`}>
                                            {formData.jdUrl ? <CheckCircle2 className="w-6 h-6 text-white" /> : <CloudUpload className="w-6 h-6 text-slate-500" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-bold ${formData.jdUrl ? 'text-emerald-700' : 'text-slate-700'}`}>
                                                {formData.jdUrl ? 'Document uploaded successfully' : 'Upload PDF or DOCX'}
                                            </p>
                                            <p className="text-xs text-slate-500">Max size: 10MB</p>
                                        </div>
                                        <label className="px-4 py-2 bg-white text-slate-900 text-sm font-bold rounded-lg border-2 border-slate-200 hover:bg-slate-900 hover:text-white transition-all cursor-pointer">
                                            {formData.jdUrl ? 'Replace' : 'Choose File'}
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
                            </motion.div>
                        )}

                        {/* Step 3: Requirements */}
                        {currentStep === 3 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6"
                            >
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Required Qualifications *</label>
                                    <Textarea
                                        name="requirements"
                                        value={formData.requirements}
                                        onChange={handleChange}
                                        placeholder="• Bachelor's degree in Computer Science or related field&#10;• 5+ years of experience in software development&#10;• Strong problem-solving skills"
                                        className="min-h-[150px]"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Required Skills & Technologies *</label>
                                    <div className="relative">
                                        <Code className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <Textarea
                                            name="skills"
                                            value={formData.skills}
                                            onChange={handleChange}
                                            placeholder="React, Node.js, TypeScript, PostgreSQL, AWS, Docker, Kubernetes"
                                            className="pl-10 min-h-[100px]"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Application Form Template</label>
                                    <select
                                        name="templateId"
                                        value={formData.templateId}
                                        onChange={handleChange}
                                        className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Default Application Form</option>
                                        {templates.map(template => (
                                            <option key={template._id} value={template._id}>
                                                {template.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-1">Select a custom application form template for this job</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-100">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={currentStep === 1 ? onCancel : prevStep}
                                className="px-6 h-12"
                            >
                                {currentStep === 1 ? 'Cancel' : 'Previous'}
                            </Button>

                            {currentStep < 3 ? (
                                <Button
                                    type="button"
                                    onClick={nextStep}
                                    className="px-8 h-12 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Next Step
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    className="px-8 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                            Posting...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Post Job
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </form>
                </Card>
            </motion.div>
        </div>
    );
}
