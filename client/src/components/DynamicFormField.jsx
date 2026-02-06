import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Badge } from './ui';

export function DynamicFormField({ field, value, onChange, error, userResume }) {
    const [fileName, setFileName] = useState('');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFileName(file.name);
            // In a real app, you'd upload the file here
            // For now, we'll just store the file name
            onChange(field.id, file.name);
        }
    };

    const renderField = () => {
        switch (field.type) {
            case 'text':
            case 'email':
            case 'tel':
            case 'url':
                return (
                    <input
                        type={field.type}
                        value={value || ''}
                        onChange={(e) => onChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        required={field.required}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                );

            case 'textarea':
                return (
                    <textarea
                        value={value || ''}
                        onChange={(e) => onChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        required={field.required}
                        rows={field.rows || 6}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                    />
                );

            case 'number':
                return (
                    <input
                        type="number"
                        value={value || ''}
                        onChange={(e) => onChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        required={field.required}
                        min={field.min}
                        max={field.max}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                );

            case 'date':
                return (
                    <input
                        type="date"
                        value={value || ''}
                        onChange={(e) => onChange(field.id, e.target.value)}
                        required={field.required}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                );

            case 'select':
                return (
                    <select
                        value={value || ''}
                        onChange={(e) => onChange(field.id, e.target.value)}
                        required={field.required}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                        <option value="">Select an option...</option>
                        {field.options?.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                );

            case 'radio':
                return (
                    <div className="space-y-2">
                        {field.options?.map((option) => (
                            <label key={option} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                                <input
                                    type="radio"
                                    name={field.id}
                                    value={option}
                                    checked={value === option}
                                    onChange={(e) => onChange(field.id, e.target.value)}
                                    required={field.required}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-slate-700">{option}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'checkbox':
                return (
                    <div className="space-y-2">
                        {field.options?.map((option) => (
                            <label key={option} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    value={option}
                                    checked={(value || []).includes(option)}
                                    onChange={(e) => {
                                        const currentValues = value || [];
                                        const newValues = e.target.checked
                                            ? [...currentValues, option]
                                            : currentValues.filter(v => v !== option);
                                        onChange(field.id, newValues);
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm text-slate-700">{option}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'file':
                // Special handling for resume field
                if (field.id === 'resume' && userResume) {
                    return (
                        <div className="space-y-3">
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-emerald-600" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-emerald-900">Resume from your profile</p>
                                        <p className="text-xs text-emerald-600 mt-0.5">{userResume}</p>
                                    </div>
                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                        Auto-filled
                                    </Badge>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-500 mb-2">Or upload a different resume</p>
                                <label className="inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors">
                                    <Upload className="w-4 h-4 text-slate-600" />
                                    <span className="text-sm text-slate-600">Choose file</span>
                                    <input
                                        type="file"
                                        accept={field.accept || '.pdf,.doc,.docx'}
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                                {fileName && (
                                    <p className="text-xs text-blue-600 mt-2">Selected: {fileName}</p>
                                )}
                            </div>
                        </div>
                    );
                }

                return (
                    <div>
                        <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors">
                            <Upload className="w-8 h-8 text-slate-400" />
                            <div className="text-center">
                                <p className="text-sm font-medium text-slate-700">
                                    {fileName || 'Click to upload file'}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {field.accept || 'Any file type'}
                                </p>
                            </div>
                            <input
                                type="file"
                                accept={field.accept}
                                onChange={handleFileChange}
                                required={field.required && !fileName}
                                className="hidden"
                            />
                        </label>
                    </div>
                );

            default:
                return (
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => onChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        required={field.required}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                );
        }
    };

    return (
        <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
            </label>
            {renderField()}
            {error && (
                <p className="text-xs text-red-600">{error}</p>
            )}
            {field.helpText && (
                <p className="text-xs text-slate-500">{field.helpText}</p>
            )}
        </div>
    );
}
