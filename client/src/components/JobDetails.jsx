import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJob, applyJob, checkJobMatch, uploadFile, updateUserDetails } from '../lib/api';
import { Card, Button, Badge, Input, Textarea } from './ui';
import {
    Briefcase, MapPin, Building, Clock, DollarSign, ArrowLeft,
    CheckCircle2, AlertCircle, Sparkles, BrainCircuit, Upload,
    FileText, Send, User, Mail, Phone, Loader
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { DynamicFormField } from './DynamicFormField';

export function JobDetails({ user }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showApplicationForm, setShowApplicationForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [applied, setApplied] = useState(false);
    const [uploadingResume, setUploadingResume] = useState(false);

    // Application form data
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        resume: null,
        customResponses: {}
    });

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const data = await getJob(id);
                setJob(data);
                if (data.candidates && user && data.candidates.includes(user._id)) {
                    setApplied(true);
                }

                // Pre-fill user data
                if (user) {
                    setFormData(prev => ({
                        ...prev,
                        name: user.name || '',
                        email: user.email || '',
                        phone: user.phone || '',
                        resume: user.resume || null
                    }));
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

    const handleResumeUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        setUploadingResume(true);
        try {
            toast.info('Uploading resume...');
            const url = await uploadFile(file, 'resume');
            setFormData(prev => ({ ...prev, resume: url }));
            await updateUserDetails({ resume: url });
            toast.success('Resume uploaded successfully!');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload resume');
        } finally {
            setUploadingResume(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCustomFieldChange = (fieldId, value) => {
        setFormData(prev => ({
            ...prev,
            customResponses: {
                ...prev.customResponses,
                [fieldId]: value
            }
        }));
    };

    const validateForm = () => {
        const config = job.applicationFormConfig;

        // Check mandatory fields
        if (config?.mandatoryFields) {
            for (const field of config.mandatoryFields) {
                if (field.required) {
                    if (field.id === 'resume' && !formData.resume) {
                        toast.error('Resume is required');
                        return false;
                    }
                    if (field.id === 'name' && !formData.name.trim()) {
                        toast.error('Name is required');
                        return false;
                    }
                    if (field.id === 'email' && !formData.email.trim()) {
                        toast.error('Email is required');
                        return false;
                    }
                    if (field.id === 'phone' && field.required && !formData.phone.trim()) {
                        toast.error('Phone is required');
                        return false;
                    }
                }
            }
        }

        // Check custom fields
        if (config?.customFields) {
            for (const field of config.customFields) {
                if (field.required && !formData.customResponses[field.id]) {
                    toast.error(`${field.label} is required`);
                    return false;
                }
            }
        }

        return true;
    };

    const handleSubmitApplication = async () => {
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            await applyJob(id, {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                resume: formData.resume,
                responses: formData.customResponses
            });
            setApplied(true);
            setShowApplicationForm(false);
            toast.success('Application submitted successfully!');
        } catch (error) {
            toast.error(error.message || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    const runMatchCheck = async () => {
        try {
            toast.info('Analyzing your resume...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            const data = await checkJobMatch(id);

            if (data && (data.analysis || data.matchScore)) {
                navigate(`/jobs/${id}/analysis`);
            } else {
                toast.error("Detailed analysis unavailable. Please try again.");
            }
        } catch (error) {
            console.error("Match Check Error:", error);
            toast.error(error.message || 'Failed to calculate match');
        }
    };

    const getMandatoryField = (fieldId) => {
        return job?.applicationFormConfig?.mandatoryFields?.find(f => f.id === fieldId) ||
            { id: fieldId, enabled: true, required: true };
    };

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading job details...</p>
            </div>
        );
    }

    if (!job) return <div className="p-10 text-center">Job not found</div>;

    const customFields = job.applicationFormConfig?.customFields || [];
    const nameField = getMandatoryField('name');
    const emailField = getMandatoryField('email');
    const phoneField = getMandatoryField('phone');
    const resumeField = getMandatoryField('resume');

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0 hover:pl-2 transition-all text-slate-500">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Jobs
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Job Header */}
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">{job.title}</h1>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><Building className="w-4 h-4" /> {job.company}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
                            <Badge className="bg-blue-100 text-blue-700">{job.jobType}</Badge>
                            <Badge className="bg-purple-100 text-purple-700">{job.workMode}</Badge>
                        </div>
                    </div>

                    {/* Job Details */}
                    <Card className="p-8 border-slate-200 shadow-lg">
                        <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                            About the Role
                        </h3>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line mb-6">{job.description}</p>

                        <h3 className="text-xl font-black text-slate-900 mt-8 mb-4">Requirements</h3>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line mb-6">{job.requirements}</p>

                        {job.responsibilities && (
                            <>
                                <h3 className="text-xl font-black text-slate-900 mt-8 mb-4">Responsibilities</h3>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-line">{job.responsibilities}</p>
                            </>
                        )}
                    </Card>

                    {/* Application Form */}
                    <AnimatePresence>
                        {showApplicationForm && !applied && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <Card className="p-8 border-blue-200 shadow-xl bg-gradient-to-br from-white to-blue-50">
                                    <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                                        <Send className="w-6 h-6 text-blue-600" />
                                        Application Form
                                    </h3>

                                    <div className="space-y-6">
                                        {/* Mandatory Fields */}
                                        {nameField.enabled && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-slate-700">
                                                    Full Name {nameField.required && <span className="text-red-500">*</span>}
                                                </label>
                                                <Input
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    placeholder="John Doe"
                                                    required={nameField.required}
                                                />
                                            </div>
                                        )}

                                        {emailField.enabled && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-slate-700">
                                                    Email {emailField.required && <span className="text-red-500">*</span>}
                                                </label>
                                                <Input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    placeholder="john@example.com"
                                                    required={emailField.required}
                                                />
                                            </div>
                                        )}

                                        {phoneField.enabled && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-slate-700">
                                                    Phone {phoneField.required && <span className="text-red-500">*</span>}
                                                </label>
                                                <Input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleInputChange}
                                                    placeholder="+1 (555) 123-4567"
                                                    required={phoneField.required}
                                                />
                                            </div>
                                        )}

                                        {resumeField.enabled && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-slate-700">
                                                    Resume {resumeField.required && <span className="text-red-500">*</span>}
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="file"
                                                        id="application-resume-upload"
                                                        className="hidden"
                                                        accept=".pdf,.doc,.docx"
                                                        onChange={handleResumeUpload}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => document.getElementById('application-resume-upload').click()}
                                                        disabled={uploadingResume}
                                                        className="flex-1"
                                                    >
                                                        {uploadingResume ? (
                                                            <>
                                                                <Loader className="w-4 h-4 mr-2 animate-spin" />
                                                                Uploading...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-4 h-4 mr-2" />
                                                                {formData.resume ? 'Change Resume' : 'Upload Resume'}
                                                            </>
                                                        )}
                                                    </Button>
                                                    {formData.resume && (
                                                        <a
                                                            href={formData.resume}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            View
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Custom Fields */}
                                        {customFields.map((field, index) => (
                                            <div key={field.id || index} className="space-y-2">
                                                <label className="text-sm font-bold text-slate-700">
                                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                                </label>
                                                <DynamicFormField
                                                    field={field}
                                                    value={formData.customResponses[field.id] || ''}
                                                    onChange={(value) => handleCustomFieldChange(field.id, value)}
                                                />
                                            </div>
                                        ))}

                                        {/* Submit Buttons */}
                                        <div className="flex gap-3 pt-4">
                                            <Button
                                                onClick={handleSubmitApplication}
                                                disabled={submitting}
                                                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold h-12"
                                            >
                                                {submitting ? (
                                                    <>
                                                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                                                        Submitting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="w-5 h-5 mr-2" />
                                                        Submit Application
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowApplicationForm(false)}
                                                disabled={submitting}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card className="p-6 border-slate-200 shadow-lg bg-white sticky top-6">
                        <div className="mb-6">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Salary Range</p>
                            <p className="text-2xl font-black text-slate-900 flex items-center gap-1">
                                <DollarSign className="w-5 h-5 text-emerald-500" />
                                {job.salary}
                            </p>
                        </div>

                        <div className="space-y-3">
                            {applied ? (
                                <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-emerald-700 font-bold">
                                    <CheckCircle2 className="w-5 h-5" />
                                    Applied Successfully
                                </div>
                            ) : (
                                <Button
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold h-12 rounded-xl text-lg shadow-lg"
                                    onClick={() => setShowApplicationForm(true)}
                                >
                                    Apply Now
                                </Button>
                            )}

                            {formData.resume && !applied && (
                                <Button
                                    variant="outline"
                                    className="w-full h-11 border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 font-bold"
                                    onClick={runMatchCheck}
                                >
                                    <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                                    Check Resume Fit
                                </Button>
                            )}
                        </div>

                        {/* Job Info */}
                        <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Experience</span>
                                <span className="font-bold text-slate-900">{job.experience}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Openings</span>
                                <span className="font-bold text-slate-900">{job.openings}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Posted</span>
                                <span className="font-bold text-slate-900">
                                    {new Date(job.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
