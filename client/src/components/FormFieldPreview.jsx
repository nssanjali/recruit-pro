import { Input, Textarea, Button } from './ui';
import { FIELD_TYPES } from '../lib/formFieldTypes';
import { Upload } from 'lucide-react';

export function FormFieldPreview({ field, value, onChange, error }) {
    const renderField = () => {
        const config = field.config || {};

        switch (field.type) {
            case FIELD_TYPES.SHORT_TEXT:
            case FIELD_TYPES.EMAIL:
            case FIELD_TYPES.PHONE:
                return (
                    <Input
                        type={field.type === FIELD_TYPES.EMAIL ? 'email' : field.type === FIELD_TYPES.PHONE ? 'tel' : 'text'}
                        placeholder={config.placeholder || ''}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className={`h-12 ${error ? 'border-red-500' : ''}`}
                        maxLength={config.maxLength}
                        minLength={config.minLength}
                        required={field.required}
                    />
                );

            case FIELD_TYPES.LONG_TEXT:
                return (
                    <Textarea
                        placeholder={config.placeholder || ''}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className={`${error ? 'border-red-500' : ''}`}
                        rows={config.rows || 4}
                        maxLength={config.maxLength}
                        minLength={config.minLength}
                        required={field.required}
                    />
                );

            case FIELD_TYPES.NUMBER:
                return (
                    <Input
                        type="number"
                        placeholder={config.placeholder || ''}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className={`h-12 ${error ? 'border-red-500' : ''}`}
                        min={config.min}
                        max={config.max}
                        required={field.required}
                    />
                );

            case FIELD_TYPES.DROPDOWN:
                return (
                    <select
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className={`w-full h-12 px-4 border rounded-xl bg-white ${error ? 'border-red-500' : 'border-slate-200'
                            }`}
                        required={field.required}
                    >
                        <option value="">{config.placeholder || 'Select an option...'}</option>
                        {(config.options || []).map((option, index) => (
                            <option key={index} value={option}>{option}</option>
                        ))}
                    </select>
                );

            case FIELD_TYPES.MULTI_SELECT:
                return (
                    <div className="space-y-2">
                        {(config.options || []).map((option, index) => (
                            <label key={index} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={(value || []).includes(option)}
                                    onChange={(e) => {
                                        const newValue = e.target.checked
                                            ? [...(value || []), option]
                                            : (value || []).filter(v => v !== option);
                                        onChange(newValue);
                                    }}
                                    className="w-4 h-4 text-emerald-500 rounded"
                                />
                                <span className="text-sm font-medium text-slate-900">{option}</span>
                            </label>
                        ))}
                    </div>
                );

            case FIELD_TYPES.RADIO:
                return (
                    <div className="space-y-2">
                        {(config.options || []).map((option, index) => (
                            <label key={index} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="radio"
                                    name={field.id}
                                    value={option}
                                    checked={value === option}
                                    onChange={(e) => onChange(e.target.value)}
                                    className="w-4 h-4 text-emerald-500"
                                    required={field.required}
                                />
                                <span className="text-sm font-medium text-slate-900">{option}</span>
                            </label>
                        ))}
                    </div>
                );

            case FIELD_TYPES.CHECKBOX:
                return (
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={value || false}
                            onChange={(e) => onChange(e.target.checked)}
                            className="w-5 h-5 text-emerald-500 rounded"
                            required={field.required}
                        />
                        <span className="text-sm font-medium text-slate-900">
                            {config.label || field.label}
                        </span>
                    </label>
                );

            case FIELD_TYPES.DATE:
                return (
                    <Input
                        type="date"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className={`h-12 ${error ? 'border-red-500' : ''}`}
                        min={config.minDate}
                        max={config.maxDate}
                        required={field.required}
                    />
                );

            case FIELD_TYPES.FILE:
                return (
                    <div>
                        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer transition-all">
                            <Upload className="w-10 h-10 text-slate-400 mb-3" />
                            <p className="text-sm font-bold text-slate-900 mb-1">
                                {config.placeholder || 'Click to upload file'}
                            </p>
                            <p className="text-xs text-slate-500">
                                Max {config.maxSize || 10}MB • {(config.allowedTypes || ['.pdf', '.doc', '.docx']).join(', ')}
                            </p>
                            <input
                                type="file"
                                className="hidden"
                                accept={(config.allowedTypes || []).join(',')}
                                onChange={(e) => onChange(e.target.files[0])}
                                required={field.required}
                            />
                        </label>
                        {value && (
                            <p className="mt-2 text-sm text-emerald-600 font-medium">
                                ✓ {value.name || 'File selected'}
                            </p>
                        )}
                    </div>
                );

            default:
                return <p className="text-slate-500">Unsupported field type</p>;
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField()}
            {error && (
                <p className="text-sm text-red-500 font-medium">{error}</p>
            )}
        </div>
    );
}
