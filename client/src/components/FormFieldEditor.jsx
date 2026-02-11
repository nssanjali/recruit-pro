import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Input, Textarea, Button, Card } from './ui';
import { FIELD_TYPES } from '../lib/formFieldTypes';

export function FormFieldEditor({ field, onUpdate, onClose }) {
    const [localField, setLocalField] = useState({ ...field });

    const handleUpdate = (updates) => {
        const updated = { ...localField, ...updates };
        setLocalField(updated);
    };

    const handleConfigUpdate = (configUpdates) => {
        const updated = {
            ...localField,
            config: { ...localField.config, ...configUpdates }
        };
        setLocalField(updated);
    };

    const handleSave = () => {
        onUpdate(localField);
        onClose();
    };

    const handleAddOption = () => {
        const options = localField.config.options || [];
        handleConfigUpdate({ options: [...options, `Option ${options.length + 1}`] });
    };

    const handleUpdateOption = (index, value) => {
        const options = [...localField.config.options];
        options[index] = value;
        handleConfigUpdate({ options });
    };

    const handleRemoveOption = (index) => {
        const options = localField.config.options.filter((_, i) => i !== index);
        handleConfigUpdate({ options });
    };

    const needsOptions = [FIELD_TYPES.DROPDOWN, FIELD_TYPES.MULTI_SELECT, FIELD_TYPES.RADIO].includes(localField.type);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900">Edit Field</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                    >
                        <X className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Label */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">
                            Field Label *
                        </label>
                        <Input
                            value={localField.label}
                            onChange={(e) => handleUpdate({ label: e.target.value })}
                            placeholder="Enter field label"
                            className="h-12"
                        />
                    </div>

                    {/* Placeholder (if applicable) */}
                    {localField.config.placeholder !== undefined && (
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">
                                Placeholder Text
                            </label>
                            <Input
                                value={localField.config.placeholder || ''}
                                onChange={(e) => handleConfigUpdate({ placeholder: e.target.value })}
                                placeholder="Enter placeholder text"
                                className="h-12"
                            />
                        </div>
                    )}

                    {/* Required Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                            <p className="font-bold text-slate-900">Required Field</p>
                            <p className="text-sm text-slate-500">Candidates must fill this field</p>
                        </div>
                        <button
                            onClick={() => handleUpdate({ required: !localField.required })}
                            className={`relative w-12 h-6 rounded-full transition-colors ${localField.required ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                        >
                            <div
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${localField.required ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Options (for dropdown, multi-select, radio) */}
                    {needsOptions && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700">
                                    Options *
                                </label>
                                <Button
                                    onClick={handleAddOption}
                                    className="h-8 px-3 text-xs bg-emerald-500 hover:bg-emerald-600"
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Option
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {(localField.config.options || []).map((option, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input
                                            value={option}
                                            onChange={(e) => handleUpdateOption(index, e.target.value)}
                                            placeholder={`Option ${index + 1}`}
                                            className="h-10"
                                        />
                                        <button
                                            onClick={() => handleRemoveOption(index)}
                                            className="w-10 h-10 rounded-lg hover:bg-red-50 flex items-center justify-center flex-shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Min/Max Length (for text fields) */}
                    {(localField.type === FIELD_TYPES.SHORT_TEXT || localField.type === FIELD_TYPES.LONG_TEXT) && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">
                                    Min Length
                                </label>
                                <Input
                                    type="number"
                                    value={localField.config.minLength || 0}
                                    onChange={(e) => handleConfigUpdate({ minLength: parseInt(e.target.value) || 0 })}
                                    className="h-10"
                                    min="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">
                                    Max Length
                                </label>
                                <Input
                                    type="number"
                                    value={localField.config.maxLength || 100}
                                    onChange={(e) => handleConfigUpdate({ maxLength: parseInt(e.target.value) || 100 })}
                                    className="h-10"
                                    min="1"
                                />
                            </div>
                        </div>
                    )}

                    {/* Min/Max (for number fields) */}
                    {localField.type === FIELD_TYPES.NUMBER && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">
                                    Minimum Value
                                </label>
                                <Input
                                    type="number"
                                    value={localField.config.min || ''}
                                    onChange={(e) => handleConfigUpdate({ min: e.target.value ? parseFloat(e.target.value) : null })}
                                    placeholder="No minimum"
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">
                                    Maximum Value
                                </label>
                                <Input
                                    type="number"
                                    value={localField.config.max || ''}
                                    onChange={(e) => handleConfigUpdate({ max: e.target.value ? parseFloat(e.target.value) : null })}
                                    placeholder="No maximum"
                                    className="h-10"
                                />
                            </div>
                        </div>
                    )}

                    {/* File Upload Settings */}
                    {localField.type === FIELD_TYPES.FILE && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">
                                    Max File Size (MB)
                                </label>
                                <Input
                                    type="number"
                                    value={localField.config.maxSize || 10}
                                    onChange={(e) => handleConfigUpdate({ maxSize: parseInt(e.target.value) || 10 })}
                                    className="h-10"
                                    min="1"
                                    max="50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">
                                    Allowed File Types
                                </label>
                                <Input
                                    value={(localField.config.allowedTypes || []).join(', ')}
                                    onChange={(e) => handleConfigUpdate({
                                        allowedTypes: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                                    })}
                                    placeholder=".pdf, .doc, .docx"
                                    className="h-10"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex gap-3">
                    <Button
                        onClick={onClose}
                        className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-900"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                        Save Field
                    </Button>
                </div>
            </Card>
        </div>
    );
}
