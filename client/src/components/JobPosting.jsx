import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Briefcase,
    MapPin,
    DollarSign,
    Building,
    Users,
    Code,
    Gift,
    Calendar,
    Target,
    Save,
    Send,
    ArrowLeft,
    CheckCircle2,
    Loader,
    Lock,
    Clock,
    Hash
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Button,
    Input,
    Textarea,
    Badge
} from './ui';
import { JobFormBuilderPlayground } from './JobFormBuilderPlayground';
import { createJob, getJobById, updateJob, getCurrentUser } from '../lib/api';
import { toast } from 'sonner';

export function JobPosting() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!!id);
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
        applicationFormConfig: null,
        status: 'draft',
        // Admin-only — not sent to candidates
        applicationCutoffDate: '',
        requiredApplications: ''
    });

    // Load existing job if editing, or load pending form config for new jobs
    useEffect(() => {
        const init = async () => {
            if (id) {
                await loadJob();
            } else {
                try {
                    const currentUser = await getCurrentUser();
                    if (currentUser && currentUser.role === 'company_admin') {
                        setFormData(prev => ({
                            ...prev,
                            company: currentUser.companyInfo?.companyName || '',
                            location: prev.location || currentUser.companyInfo?.location || ''
                        }));
                    }
                } catch (err) {
                    console.error('Failed to get user details:', err);
                }

                // Load pending form config from sessionStorage for new jobs
                const savedConfig = sessionStorage.getItem('pendingFormConfig');
                if (savedConfig) {
                    try {
                        const config = JSON.parse(savedConfig);
                        setFormData(prev => ({ ...prev, applicationFormConfig: config }));
                        // Clear it after loading so it doesn't persist incorrectly
                        sessionStorage.removeItem('pendingFormConfig');
                    } catch (err) {
                        console.error('Failed to parse saved config:', err);
                    }
                }
            }
        };
        init();
    }, [id]);

    const loadJob = async () => {
        try {
            const job = await getJobById(id);
            if (job) {
                setFormData({
                    title: job.title || '',
                    company: job.company || '',
                    department: job.department || '',
                    location: job.location || '',
                    jobType: job.jobType || 'Full-time',
                    workMode: job.workMode || 'On-site',
                    salary: job.salary || '',
                    description: job.description || '',
                    requirements: job.requirements || '',
                    responsibilities: job.responsibilities || '',
                    skills: job.skills || '',
                    benefits: job.benefits || '',
                    experience: job.experience || 'Mid-level',
                    openings: job.openings?.toString() || '1',
                    deadline: job.deadline || '',
                    applicationFormConfig: job.applicationFormConfig || null,
                    status: job.status || 'draft',
                    // Admin fields — load back for editing
                    applicationCutoffDate: job.applicationCutoffDate
                        ? new Date(job.applicationCutoffDate).toISOString().slice(0, 16)
                        : '',
                    requiredApplications: job.requiredApplications?.toString() || ''
                });
            }
        } catch (err) {
            toast.error('Failed to load job');
            navigate('/company-admin');
        } finally {
            setInitialLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormConfigSave = (config) => {
        setFormData(prev => ({ ...prev, applicationFormConfig: config }));
        toast.success('Application form configured successfully!');
    };

    const handleSaveDraft = async () => {
        setLoading(true);
        try {
            if (id) {
                await updateJob(id, { ...formData, status: 'draft' });
                toast.success('Draft updated successfully!');
            } else {
                await createJob({ ...formData, status: 'draft' });
                toast.success('Job saved as draft!');
            }
            setTimeout(() => navigate('/company-admin'), 1500);
        } catch (err) {
            toast.error(err.message || 'Failed to save draft');
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        // Validate required fields
        if (!formData.title || !formData.company || !formData.location ||
            !formData.description || !formData.requirements || !formData.skills) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            if (id) {
                await updateJob(id, { ...formData, status: 'open' });
                toast.success('Job updated and published!');
            } else {
                await createJob({ ...formData, status: 'open' });
                toast.success('Job posted successfully!');
            }
            setTimeout(() => navigate('/company-admin'), 1500);
        } catch (err) {
            toast.error(err.message || 'Failed to post job');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Loading job details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/company-admin')}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </button>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 mb-2">
                                {id ? 'Edit Job Posting' : 'Create New Job Posting'}
                            </h1>
                            <p className="text-slate-600">
                                {id ? 'Update the details below and save your changes' : 'Fill in the details below and customize the application form'}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                onClick={() => navigate(id ? `/build-form/${id}` : '/build-form')}
                                variant="outline"
                                className="h-12 px-6 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold"
                            >
                                <Code className="w-4 h-4 mr-2" />
                                Customize Application Form
                            </Button>
                            <Button
                                onClick={handleSaveDraft}
                                disabled={loading}
                                className="h-12 px-6 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save as Draft
                            </Button>
                            <Button
                                onClick={handlePublish}
                                disabled={loading}
                                className="h-12 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                                        Publishing...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Publish Job
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto">
                    {/* Main Content - Full Width */}
                    <div className="space-y-6">
                        {/* Basic Information */}
                        <Card className="border-slate-200 shadow-lg">
                            <CardHeader className="border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <Briefcase className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-black">Basic Information</CardTitle>
                                        <p className="text-sm text-slate-500 mt-0.5">Essential job details</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Job Title <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            name="title"
                                            value={formData.title}
                                            onChange={handleChange}
                                            placeholder="e.g. Senior Full Stack Developer"
                                            className="h-12"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Company <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            name="company"
                                            value={formData.company}
                                            onChange={handleChange}
                                            placeholder="e.g. TechCorp Inc."
                                            className="h-12 bg-slate-50 cursor-not-allowed"
                                            required
                                            readOnly
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Department <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            name="department"
                                            value={formData.department}
                                            onChange={handleChange}
                                            placeholder="e.g. Engineering"
                                            className="h-12"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Location <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            name="location"
                                            value={formData.location}
                                            onChange={handleChange}
                                            placeholder="e.g. San Francisco, CA"
                                            className="h-12"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Job Type <span className="text-red-500">*</span>
                                        </label>
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
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Work Mode <span className="text-red-500">*</span>
                                        </label>
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
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Experience Level <span className="text-red-500">*</span>
                                        </label>
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

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Salary Range <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            name="salary"
                                            value={formData.salary}
                                            onChange={handleChange}
                                            placeholder="e.g. $120k - $180k"
                                            className="h-12"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Number of Openings <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="number"
                                            name="openings"
                                            value={formData.openings}
                                            onChange={handleChange}
                                            placeholder="1"
                                            min="1"
                                            className="h-12"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Application Deadline
                                        </label>
                                        <Input
                                            type="date"
                                            name="deadline"
                                            value={formData.deadline}
                                            onChange={handleChange}
                                            className="h-12"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Job Description */}
                        <Card className="border-slate-200 shadow-lg">
                            <CardHeader className="border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                        <Building className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-black">Job Details</CardTitle>
                                        <p className="text-sm text-slate-500 mt-0.5">Description and responsibilities</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Job Description <span className="text-red-500">*</span>
                                    </label>
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
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Key Responsibilities <span className="text-red-500">*</span>
                                    </label>
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
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Benefits & Perks
                                    </label>
                                    <Textarea
                                        name="benefits"
                                        value={formData.benefits}
                                        onChange={handleChange}
                                        placeholder="• Health, dental, and vision insurance&#10;• 401(k) matching&#10;• Flexible PTO&#10;• Remote work options"
                                        className="min-h-[100px]"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Requirements */}
                        <Card className="border-slate-200 shadow-lg">
                            <CardHeader className="border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-black">Requirements</CardTitle>
                                        <p className="text-sm text-slate-500 mt-0.5">Qualifications and skills needed</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Required Qualifications <span className="text-red-500">*</span>
                                    </label>
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
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Required Skills & Technologies <span className="text-red-500">*</span>
                                    </label>
                                    <Textarea
                                        name="skills"
                                        value={formData.skills}
                                        onChange={handleChange}
                                        placeholder="React, Node.js, TypeScript, PostgreSQL, AWS, Docker, Kubernetes"
                                        className="min-h-[100px]"
                                        required
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Application Form Builder */}
                        <Card className="border-slate-200 shadow-lg">
                            <CardHeader className="border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-black">Application Form</CardTitle>
                                        <p className="text-sm text-slate-500 mt-0.5">Customize fields for candidates</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                                        <Code className="w-8 h-8 text-white" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900 mb-2">Visual Form Builder</h4>
                                    <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                                        Create a custom application form with our playground-style builder.
                                        Add fields, set validation, and preview in real-time.
                                    </p>
                                    <Button
                                        onClick={() => navigate(id ? `/build-form/${id}` : '/build-form')}
                                        className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold"
                                    >
                                        <Code className="w-4 h-4 mr-2" />
                                        Open Form Builder
                                    </Button>
                                    {formData.applicationFormConfig?.customFields?.length > 0 && (
                                        <p className="text-xs text-emerald-600 font-medium mt-3">
                                            ✓ {formData.applicationFormConfig.customFields.length} custom {formData.applicationFormConfig.customFields.length === 1 ? 'field' : 'fields'} configured
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* ====== ADMIN CONTROLS — never visible to candidates ====== */}
                        <Card className="border-amber-200 shadow-lg bg-gradient-to-br from-amber-50/60 to-orange-50/40">
                            <CardHeader className="border-b border-amber-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                        <Lock className="w-5 h-5 text-amber-700" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-xl font-black text-amber-900">Admin Controls</CardTitle>
                                            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-amber-200 text-amber-800 rounded-full">
                                                Not visible to candidates
                                            </span>
                                        </div>
                                        <p className="text-sm text-amber-700 mt-0.5">
                                            Internal settings for application intake management
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    {/* Application Cutoff Date + Time */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            Application Cutoff
                                            <span className="text-amber-600 font-normal normal-case text-[10px] ml-1">— last date &amp; time to accept</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            name="applicationCutoffDate"
                                            value={formData.applicationCutoffDate}
                                            onChange={handleChange}
                                            className="w-full h-12 px-4 border border-amber-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-800 text-sm font-medium"
                                        />
                                        {formData.applicationCutoffDate && (
                                            <p className="text-xs text-amber-700 font-medium mt-1">
                                                Applications close on{' '}
                                                <strong>
                                                    {new Date(formData.applicationCutoffDate).toLocaleString('en-IN', {
                                                        dateStyle: 'medium', timeStyle: 'short'
                                                    })}
                                                </strong>
                                            </p>
                                        )}
                                    </div>

                                    {/* Required Applications (quota) */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                                            <Hash className="w-3.5 h-3.5" />
                                            Application Quota
                                            <span className="text-amber-600 font-normal normal-case text-[10px] ml-1">— first N get interview call</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="requiredApplications"
                                            value={formData.requiredApplications}
                                            onChange={handleChange}
                                            min="1"
                                            placeholder="e.g. 10"
                                            className="w-full h-12 px-4 border border-amber-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-800 text-sm font-medium"
                                        />
                                        {formData.requiredApplications && (
                                            <p className="text-xs text-amber-700 font-medium mt-1">
                                                First <strong>{formData.requiredApplications}</strong> qualified applications will be shortlisted for interview.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Info banner */}
                                <div className="mt-5 flex items-start gap-3 p-3 bg-amber-100/70 border border-amber-200 rounded-xl">
                                    <Lock className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-800 leading-relaxed">
                                        These fields are <strong>strictly internal</strong>. Candidates will never see the cutoff datetime or quota number.
                                        They are used by admins and recruiters to manage the intake pipeline.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
