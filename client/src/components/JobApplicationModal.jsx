import { useState, useEffect } from 'react';
import { X, Briefcase, Send, Loader } from 'lucide-react';
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
            if (field.required && !formData[field.id]) {
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
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white relative overflow-hidden">
                                <div className="relative">
                                    <button
                                        onClick={handleClose}
                                        className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                                            <Briefcase className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black tracking-tight">Apply for Position</h2>
                                            <p className="text-white/80 text-sm font-medium">Submit your application</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
                                <div className="mb-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">{job.title}</h3>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                            {job.company}
                                        </Badge>
                                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                                            {job.location}
                                        </Badge>
                                        {job.jobType && (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                                {job.jobType}
                                            </Badge>
                                        )}
                                    </div>
                                    {job.description && (
                                        <p className="text-sm text-slate-600 line-clamp-3">{job.description}</p>
                                    )}
                                </div>

                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <Loader className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                                        <p className="text-sm text-slate-500">Loading application form...</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {template?.fields?.map((field) => (
                                            <DynamicFormField
                                                key={field.id}
                                                field={field}
                                                value={formData[field.id]}
                                                onChange={handleFieldChange}
                                                error={errors[field.id]}
                                                userResume={user?.resume}
                                            />
                                        ))}

                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 bg-red-50 border border-red-200 rounded-xl"
                                            >
                                                <p className="text-sm text-red-600 font-medium">{error}</p>
                                            </motion.div>
                                        )}

                                        <div className="flex gap-3 pt-4">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleClose}
                                                className="flex-1 h-12 rounded-xl border-2 border-slate-200 hover:bg-slate-50 font-bold"
                                                disabled={submitting}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold shadow-lg"
                                                disabled={submitting}
                                            >
                                                {submitting ? (
                                                    <>
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
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
