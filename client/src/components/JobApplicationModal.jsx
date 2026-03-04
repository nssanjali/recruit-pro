import { useState, useEffect, useMemo } from 'react';
import { X, Briefcase, Send, Loader, MapPin, Building2, CircleAlert } from 'lucide-react';
import { Button, Badge } from './ui';
import { motion, AnimatePresence } from 'motion/react';
import { createApplication } from '../lib/applicationApi';
import { getTemplateForJob } from '../lib/templateApi';
import { DynamicFormField } from './DynamicFormField';

export function JobApplicationModal({ job, isOpen, onClose, onSuccess, user }) {
    const [formData, setFormData] = useState({});
    const [template, setTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen && job) {
            fetchTemplate();
        }
    }, [isOpen, job]);

    const requiredCount = useMemo(() => {
        return (template?.fields || []).filter((field) => field.required).length;
    }, [template]);

    const fetchTemplate = async () => {
        setLoading(true);
        setError('');
        try {
            const templateData = await getTemplateForJob(job._id);
            setTemplate(templateData);

            // Pre-fill resume from user profile if available
            if (user?.resume) {
                setFormData(prev => ({
                    ...prev,
                    resume: user.resume
                }));
            }
        } catch (err) {
            console.error('Error fetching template:', err);
            setError('Failed to load application form');
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (fieldId, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldId]: value
        }));
        // Clear error for this field
        if (errors[fieldId]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldId];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        template?.fields?.forEach(field => {
            const value = formData[field.id];
            const isMissing = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
            if (field.required && isMissing) {
                newErrors[field.id] = `${field.label} is required`;
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) {
            setError('Please fill in all required fields');
            return;
        }

        setSubmitting(true);

        try {
            await createApplication({
                jobId: job._id,
                formResponses: formData
            });

            onSuccess?.();
            onClose();
            setFormData({});
            setErrors({});
        } catch (err) {
            setError(err.message || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        onClose();
        setFormData({});
        setErrors({});
        setError('');
    };

    if (!isOpen || !job) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div
                            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden border border-slate-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-6 sm:px-8 py-5 border-b border-slate-200 bg-white">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                                            <Briefcase className="w-5 h-5 text-blue-700" />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Job Application</h2>
                                            <p className="text-sm text-slate-500">Fill details carefully before submitting.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClose}
                                        className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500"
                                        aria-label="Close application modal"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-y-auto max-h-[calc(92vh-190px)] px-6 sm:px-8 py-6 bg-slate-50/50">
                                <div className="mb-6 p-5 bg-white rounded-2xl border border-slate-200">
                                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">{job.title}</h3>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 inline-flex items-center gap-1">
                                            <Building2 className="w-3.5 h-3.5" />
                                            {job.company || 'Company'}
                                        </Badge>
                                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 inline-flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {job.location || 'Location'}
                                        </Badge>
                                        {job.jobType && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{job.jobType}</Badge>}
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                                        <span className="px-2.5 py-1 bg-slate-100 rounded-full border border-slate-200">
                                            {template?.fields?.length || 0} fields
                                        </span>
                                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                                            {requiredCount} required
                                        </span>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <Loader className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                                        <p className="text-sm text-slate-500">Loading application form...</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-5">
                                            {template?.fields?.length > 0 ? (
                                                template.fields.map((field) => (
                                                    <DynamicFormField
                                                        key={field.id}
                                                        field={field}
                                                        value={formData[field.id]}
                                                        onChange={handleFieldChange}
                                                        error={errors[field.id]}
                                                        userResume={user?.resume}
                                                    />
                                                ))
                                            ) : (
                                                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 text-sm text-slate-600">
                                                    This application has no custom fields configured. Submit to continue.
                                                </div>
                                            )}
                                        </div>

                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2"
                                            >
                                                <CircleAlert className="w-4 h-4 text-red-600 mt-0.5" />
                                                <p className="text-sm text-red-700 font-medium">{error}</p>
                                            </motion.div>
                                        )}

                                        <div className="sticky bottom-0 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-end">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleClose}
                                                className="h-11 rounded-xl border-slate-200 hover:bg-slate-50 font-bold"
                                                disabled={submitting}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm min-w-[190px]"
                                                disabled={submitting}
                                            >
                                                {submitting ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
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
                                    </form>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
