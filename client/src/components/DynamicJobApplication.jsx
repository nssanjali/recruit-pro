import { useState, useEffect } from 'react';
import { Button, Card } from './ui';
import { FormFieldPreview } from './FormFieldPreview';
import { Send, Loader } from 'lucide-react';
import { toast } from 'sonner';

export function DynamicJobApplication({ jobId, formConfig, userProfile, onSubmit }) {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pre-fill mandatory fields from user profile
    useEffect(() => {
        if (userProfile && formConfig?.mandatoryFields) {
            const prefilled = {};
            const mandatory = formConfig.mandatoryFields;

            if (mandatory.fullName?.fromProfile) {
                prefilled['mandatory_fullName'] = userProfile.name || '';
            }
            if (mandatory.email?.fromProfile) {
                prefilled['mandatory_email'] = userProfile.email || '';
            }
            if (mandatory.phone?.fromProfile) {
                prefilled['mandatory_phone'] = userProfile.phone || '';
            }

            setFormData(prefilled);
        }
    }, [userProfile, formConfig]);

    const handleFieldChange = (fieldId, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldId]: value
        }));
        // Clear error when user starts typing
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
        const allFields = [
            ...Object.values(formConfig.mandatoryFields || {}),
            ...(formConfig.customFields || [])
        ];

        allFields.forEach(field => {
            const value = formData[field.id];

            // Required field validation
            if (field.required) {
                if (!value || (Array.isArray(value) && value.length === 0)) {
                    newErrors[field.id] = `${field.label} is required`;
                    return;
                }
            }

            // Type-specific validation
            if (value) {
                // Text length validation
                if (field.config?.minLength && value.length < field.config.minLength) {
                    newErrors[field.id] = `Minimum ${field.config.minLength} characters required`;
                }
                if (field.config?.maxLength && value.length > field.config.maxLength) {
                    newErrors[field.id] = `Maximum ${field.config.maxLength} characters allowed`;
                }

                // Number validation
                if (field.type === 'number') {
                    const numValue = parseFloat(value);
                    if (field.config?.min !== null && numValue < field.config.min) {
                        newErrors[field.id] = `Minimum value is ${field.config.min}`;
                    }
                    if (field.config?.max !== null && numValue > field.config.max) {
                        newErrors[field.id] = `Maximum value is ${field.config.max}`;
                    }
                }

                // Email validation
                if (field.type === 'email') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        newErrors[field.id] = 'Invalid email address';
                    }
                }

                // File validation
                if (field.type === 'file' && value instanceof File) {
                    const maxSizeMB = field.config?.maxSize || 10;
                    const maxSizeBytes = maxSizeMB * 1024 * 1024;
                    if (value.size > maxSizeBytes) {
                        newErrors[field.id] = `File size must be less than ${maxSizeMB}MB`;
                    }

                    const allowedTypes = field.config?.allowedTypes || [];
                    const fileExt = '.' + value.name.split('.').pop().toLowerCase();
                    if (allowedTypes.length > 0 && !allowedTypes.includes(fileExt)) {
                        newErrors[field.id] = `Only ${allowedTypes.join(', ')} files are allowed`;
                    }
                }
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        setIsSubmitting(true);

        try {
            // Prepare submission data
            const submissionData = {
                jobId,
                formData,
                submittedAt: new Date().toISOString()
            };

            await onSubmit(submissionData);
            toast.success('Application submitted successfully!');
        } catch (error) {
            console.error('Submission error:', error);
            toast.error('Failed to submit application. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!formConfig) {
        return (
            <div className="text-center py-12">
                <Loader className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
                <p className="text-slate-600">Loading application form...</p>
            </div>
        );
    }

    const allFields = [
        ...Object.values(formConfig.mandatoryFields || {}),
        ...(formConfig.customFields || [])
    ];

    return (
        <div className="max-w-4xl mx-auto">
            <Card className="p-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">
                        Job Application
                    </h2>
                    <p className="text-slate-600">
                        Please fill out all required fields marked with <span className="text-red-500">*</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {allFields.map(field => (
                        <FormFieldPreview
                            key={field.id}
                            field={field}
                            value={formData[field.id]}
                            onChange={(value) => handleFieldChange(field.id, value)}
                            error={errors[field.id]}
                        />
                    ))}

                    <div className="pt-6 border-t border-slate-200">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                                    Submitting Application...
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
            </Card>
        </div>
    );
}
