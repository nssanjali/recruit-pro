import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJob, applyJob, uploadFile, updateUserDetails, getMySecureResumeUrl } from '../lib/api';
import { Card, Button, Badge, Input, Tabs, TabsList, TabsTrigger, TabsContent, Progress } from './ui';
import {
    Briefcase, MapPin, Building, Clock, DollarSign, ArrowLeft,
    CheckCircle2, Upload, FileText, Send, Loader, ShieldAlert, ShieldBan, AlertCircle
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
    const [openingResume, setOpeningResume] = useState(false);
    const applicationFormRef = useRef(null);

    // Reliability restriction check (read from user prop)
    const reliability = user?.interviewReliability || null;
    const isBanned = Boolean(reliability?.isBanned);
    const isRestricted = Boolean(reliability?.restrictedUntil) && new Date(reliability.restrictedUntil) > new Date();
    const restrictedUntilDate = isRestricted ? new Date(reliability.restrictedUntil) : null;
    const restrictionBlocked = isBanned || isRestricted;
    const restrictionMessage = isBanned
        ? 'Your account has been banned due to repeated interview no-shows. You cannot apply for jobs.'
        : isRestricted
        ? `Your account is temporarily restricted from applying until ${restrictedUntilDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.`
        : null;

    // Application form data
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        resume: null,
        customResponses: {}
    });
    const [formErrors, setFormErrors] = useState({});

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
            setFormErrors(prev => {
                const next = { ...prev };
                delete next.resume;
                return next;
            });
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
        const nextValue = name === 'phone' ? value.replace(/\D/g, '') : value;
        setFormData(prev => ({ ...prev, [name]: nextValue }));
        if (formErrors[name]) {
            setFormErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleCustomFieldChange = (fieldId, value) => {
        setFormData(prev => ({
            ...prev,
            customResponses: {
                ...prev.customResponses,
                [fieldId]: value
            }
        }));
        if (formErrors[fieldId]) {
            setFormErrors(prev => {
                const next = { ...prev };
                delete next[fieldId];
                return next;
            });
        }
    };

    const validateForm = () => {
        const config = job.applicationFormConfig;
        const nextErrors = {};
        const mandatoryFields = Object.values(config?.mandatoryFields || {});

        for (const field of mandatoryFields) {
            if (!field?.required) continue;
            if (field.id === 'name' && !formData.name.trim()) {
                nextErrors.name = 'Full name is required';
            }
            if (field.id === 'email' && !formData.email.trim()) {
                nextErrors.email = 'Email is required';
            }
            if (field.id === 'phone' && !formData.phone.trim()) {
                nextErrors.phone = 'Phone is required';
            }
        }

        if (formData.email?.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email.trim())) {
                nextErrors.email = 'Enter a valid email address';
            }
        }
        if (formData.phone?.trim() && !/^\d{7,15}$/.test(formData.phone.trim())) {
            nextErrors.phone = 'Phone must be 7 to 15 digits';
        }

        for (const field of config?.customFields || []) {
            if (!field?.required) continue;
            const value = formData.customResponses[field.id];
            const isMissing = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
            if (isMissing) {
                nextErrors[field.id] = `${field.label} is required`;
            }
        }

        setFormErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            toast.error('Please fill all required fields');
            return false;
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
            // Make restriction errors more readable
            const msg = error.message || 'Failed to submit application';
            if (msg.includes('restricted') || msg.includes('banned')) {
                toast.error(msg.replace(/\d{4}-\d{2}-\d{2}T[\d:.Z]+/, (iso) =>
                    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                ), { duration: 6000 });
            } else {
                toast.error(msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const getMandatoryField = (fieldId) => {
        const mandatoryFields = Object.values(job?.applicationFormConfig?.mandatoryFields || {});
        const existing = mandatoryFields.find(f => f.id === fieldId);
        if (existing) return existing;
        if (fieldId === 'resume') return { id: fieldId, enabled: true, required: false };
        return { id: fieldId, enabled: true, required: true };
    };

    useEffect(() => {
        if (showApplicationForm && applicationFormRef.current) {
            applicationFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [showApplicationForm]);

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
    const totalFormItems =
        (nameField.enabled ? 1 : 0) +
        (emailField.enabled ? 1 : 0) +
        (phoneField.enabled ? 1 : 0) +
        (resumeField.enabled ? 1 : 0) +
        customFields.length;
    const completedFormItems =
        (nameField.enabled && formData.name?.trim() ? 1 : 0) +
        (emailField.enabled && formData.email?.trim() ? 1 : 0) +
        (phoneField.enabled && formData.phone?.trim() ? 1 : 0) +
        (resumeField.enabled && formData.resume ? 1 : 0) +
        customFields.reduce((count, field) => {
            const value = formData.customResponses[field.id];
            const filled = value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
            return count + (filled ? 1 : 0);
        }, 0);
    const formCompletion = totalFormItems > 0 ? Math.round((completedFormItems / totalFormItems) * 100) : 0;

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
                        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 sm:p-6 mb-6">
                            <div className="flex items-start gap-4">
                                {job.companyLogo ? (
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm shrink-0">
                                        <img src={job.companyLogo} alt={`${job.company || 'Company'} Logo`} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-200 bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xl shrink-0">
                                        {(job.company || 'C').split(' ').map((w) => w[0]).join('').slice(0, 2)}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">{job.title}</h1>
                                    <p className="text-sm font-semibold text-slate-600">{job.company || 'Company'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><Building className="w-4 h-4" /> {job.company}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
                            <Badge className="bg-blue-100 text-blue-700">{job.jobType}</Badge>
                            <Badge className="bg-purple-100 text-purple-700">{job.workMode}</Badge>
                        </div>
                    </div>

                    {/* Job Details */}
                    <Card className="border-slate-200 shadow-lg overflow-hidden">
                        <div className="p-6 sm:p-8 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-xl font-black text-slate-900 mb-1 flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-blue-600" />
                                Role Details
                            </h3>
                            <p className="text-sm text-slate-600">Switch sections to understand expectations quickly.</p>
                            <div className="flex flex-wrap gap-2 mt-4">
                                {job.experience && <Badge className="bg-white border-slate-200 text-slate-700">{job.experience} experience</Badge>}
                                {job.openings && <Badge className="bg-white border-slate-200 text-slate-700">{job.openings} openings</Badge>}
                                {job.workMode && <Badge className="bg-white border-slate-200 text-slate-700">{job.workMode}</Badge>}
                            </div>
                        </div>
                        <div className="p-6 sm:p-8">
                            <Tabs defaultValue="overview" className="w-full">
                                <TabsList className="bg-slate-100 w-full sm:w-auto">
                                    <TabsTrigger value="overview">Overview</TabsTrigger>
                                    <TabsTrigger value="requirements">Requirements</TabsTrigger>
                                    {job.responsibilities && <TabsTrigger value="responsibilities">Responsibilities</TabsTrigger>}
                                </TabsList>
                                <TabsContent value="overview" className="mt-5">
                                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">{job.description || 'No overview provided.'}</p>
                                </TabsContent>
                                <TabsContent value="requirements" className="mt-5">
                                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">{job.requirements || 'No requirements provided.'}</p>
                                </TabsContent>
                                {job.responsibilities && (
                                    <TabsContent value="responsibilities" className="mt-5">
                                        <p className="text-slate-700 leading-relaxed whitespace-pre-line">{job.responsibilities}</p>
                                    </TabsContent>
                                )}
                            </Tabs>
                        </div>
                    </Card>

                    {/* Application Form */}
                    <AnimatePresence>
                        {showApplicationForm && !applied && (
                            <motion.div
                                ref={applicationFormRef}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <Card className="border-slate-200 shadow-xl overflow-hidden">
                                    <div className="p-6 sm:p-8 border-b border-slate-200 bg-slate-50">
                                        <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-2">
                                            <Send className="w-6 h-6 text-blue-600" />
                                            Apply for This Job
                                        </h3>
                                        <p className="text-sm text-slate-600">
                                            Complete the required details marked with <span className="text-red-500">*</span>.
                                        </p>
                                        <div className="mt-4 space-y-2">
                                            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                                                <span>Application completion</span>
                                                <span>{completedFormItems}/{totalFormItems} fields</span>
                                            </div>
                                            <Progress value={formCompletion} className="h-2 bg-slate-200" />
                                        </div>
                                    </div>

                                    <div className="p-6 sm:p-8 space-y-6 bg-white">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                        className={formErrors.name ? 'border-red-300 focus-visible:ring-red-400' : ''}
                                                    />
                                                    {formErrors.name && <p className="text-xs text-red-600">{formErrors.name}</p>}
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
                                                        className={formErrors.email ? 'border-red-300 focus-visible:ring-red-400' : ''}
                                                    />
                                                    {formErrors.email && <p className="text-xs text-red-600">{formErrors.email}</p>}
                                                </div>
                                            )}

                                            {phoneField.enabled && (
                                                <div className="space-y-2 md:col-span-2">
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
                                                        inputMode="numeric"
                                                        pattern="[0-9]{7,15}"
                                                        maxLength={15}
                                                        className={formErrors.phone ? 'border-red-300 focus-visible:ring-red-400' : ''}
                                                    />
                                                    {formErrors.phone && <p className="text-xs text-red-600">{formErrors.phone}</p>}
                                                </div>
                                            )}
                                        </div>

                                        {resumeField.enabled && (
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                                                <label className="text-sm font-bold text-slate-700">
                                                    Resume {resumeField.required && <span className="text-red-500">*</span>}
                                                </label>
                                                <div className="flex flex-wrap items-center gap-3">
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
                                                        className="border-slate-300 hover:bg-white"
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
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                try {
                                                                    setOpeningResume(true);
                                                                    const signedUrl = await getMySecureResumeUrl();
                                                                    window.open(signedUrl, '_blank', 'noopener,noreferrer');
                                                                } catch (error) {
                                                                    toast.error(error.message || 'Failed to open resume');
                                                                } finally {
                                                                    setOpeningResume(false);
                                                                }
                                                            }}
                                                            disabled={openingResume}
                                                            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 disabled:opacity-60"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            {openingResume ? 'Opening resume...' : 'View uploaded resume'}
                                                        </button>
                                                    )}
                                                </div>
                                                {formErrors.resume && <p className="text-xs text-red-600">{formErrors.resume}</p>}
                                            </div>
                                        )}

                                        {customFields.length > 0 && (
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">Additional Questions</h4>
                                                {customFields.map((field, index) => (
                                                    <div key={field.id || index}>
                                                        <DynamicFormField
                                                            field={field}
                                                            value={formData.customResponses[field.id] || ''}
                                                            onChange={(_fieldId, value) => handleCustomFieldChange(field.id, value)}
                                                            error={formErrors[field.id]}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowApplicationForm(false)}
                                                disabled={submitting}
                                                className="h-11 border-slate-300"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleSubmitApplication}
                                                disabled={submitting}
                                                className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold min-w-[190px]"
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
                        <div className="mb-5 pb-5 border-b border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Compensation</p>
                            <p className="text-2xl font-black text-slate-900 flex items-center gap-1">
                                <DollarSign className="w-5 h-5 text-emerald-500" />
                                {job.salary || 'Not specified'}
                            </p>
                        </div>

                        <div className="space-y-3">
                            {applied ? (
                                <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-emerald-700 font-bold">
                                    <CheckCircle2 className="w-5 h-5" />
                                    Applied Successfully
                                </div>
                            ) : restrictionBlocked ? (
                                <div className={`p-4 rounded-xl border-2 space-y-2 ${isBanned ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'}`}>
                                    <div className={`flex items-center gap-2 font-bold text-sm ${isBanned ? 'text-red-700' : 'text-amber-700'}`}>
                                        {isBanned ? <ShieldBan className="w-5 h-5 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
                                        {isBanned ? 'Account Banned' : 'Account Restricted'}
                                    </div>
                                    <p className={`text-xs leading-relaxed ${isBanned ? 'text-red-600' : 'text-amber-600'}`}>
                                        {restrictionMessage}
                                    </p>
                                    {!isBanned && restrictedUntilDate && (
                                        <p className="text-xs font-bold text-amber-700">
                                            Restriction lifts: {restrictedUntilDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    )}
                                    <Button
                                        disabled
                                        className="w-full mt-1 opacity-50 cursor-not-allowed bg-slate-300 text-slate-600 h-10 font-bold rounded-xl"
                                    >
                                        Cannot Apply
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-sm"
                                    onClick={() => {
                                        if (restrictionBlocked) {
                                            toast.error(restrictionMessage, { duration: 5000 });
                                            return;
                                        }
                                        setShowApplicationForm(true);
                                        if (applicationFormRef.current) {
                                            applicationFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }
                                    }}
                                >
                                    {showApplicationForm ? 'Continue Application' : 'Start Application'}
                                </Button>
                            )}

                        </div>

                        {/* Job Info */}
                        <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Quick Facts</p>
                            <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Experience</span>
                                <span className="font-bold text-slate-900">{job.experience}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Openings</span>
                                <span className="font-bold text-slate-900">{job.openings}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Posted</span>
                                <span className="font-bold text-slate-900">
                                    {new Date(job.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Company</span>
                                <span className="font-bold text-slate-900">{job.company}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
