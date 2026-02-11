import { useState } from 'react';
import {
    GripVertical,
    Trash2,
    Plus,
    Type,
    AlignLeft,
    Hash,
    Mail,
    Phone,
    ChevronDown,
    CheckSquare,
    Circle,
    Calendar,
    Upload,
    Settings,
    Eye,
    EyeOff
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, Button, Input, Textarea, Badge } from './ui';
import { FIELD_TYPES, FIELD_TYPE_CONFIG, MANDATORY_FIELDS, generateFieldId, createField } from '../lib/formFieldTypes';

// Field Block Component
function FieldBlock({ field, onEdit, onDelete, isPreview }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const config = field.config || {};
    const fieldTypeConfig = FIELD_TYPE_CONFIG[field.type];

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group relative bg-white border-2 rounded-2xl p-6 mb-4 hover:border-blue-300 transition-all ${isDragging ? 'shadow-2xl border-blue-500' : 'border-slate-200'
                }`}
        >
            {/* Drag Handle */}
            {!isPreview && (
                <div
                    {...attributes}
                    {...listeners}
                    className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <GripVertical className="w-5 h-5 text-slate-400" />
                </div>
            )}

            {/* Field Content */}
            <div className={isPreview ? '' : 'ml-6'}>
                {/* Field Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${fieldTypeConfig?.color || 'bg-slate-100'
                            }`}>
                            {fieldTypeConfig?.icon && <fieldTypeConfig.icon className="w-5 h-5 text-white" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-lg">{field.label}</h4>
                                {field.required && (
                                    <Badge className="bg-red-100 text-red-700 text-xs px-2 py-0.5">Required</Badge>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5">{fieldTypeConfig?.label}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    {!isPreview && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onEdit(field)}
                                className="h-8 px-3"
                            >
                                <Settings className="w-4 h-4" />
                            </Button>
                            {onDelete && onDelete.toString() !== '() => { }' && onDelete.toString() !== '() => {}' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onDelete(field.id)}
                                    className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Field Preview */}
                <div className="space-y-2">
                    {config.placeholder && (
                        <p className="text-sm text-slate-400 italic">Placeholder: {config.placeholder}</p>
                    )}

                    {/* Show options for select/radio/checkbox fields */}
                    {(field.type === FIELD_TYPES.DROPDOWN ||
                        field.type === FIELD_TYPES.MULTI_SELECT ||
                        field.type === FIELD_TYPES.RADIO) && config.options && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {config.options.map((option, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                        {option}
                                    </Badge>
                                ))}
                            </div>
                        )}

                    {/* Show validation rules */}
                    {(config.minLength || config.maxLength || config.min || config.max) && (
                        <div className="flex gap-3 mt-2 text-xs text-slate-500">
                            {config.minLength && <span>Min: {config.minLength} chars</span>}
                            {config.maxLength && <span>Max: {config.maxLength} chars</span>}
                            {config.min && <span>Min: {config.min}</span>}
                            {config.max && <span>Max: {config.max}</span>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Field Type Selector - Block Style
function FieldTypeSelector({ onSelect }) {
    const fieldTypes = [
        { type: FIELD_TYPES.SHORT_TEXT, icon: Type, label: 'Short Text', color: 'from-blue-500 to-blue-600' },
        { type: FIELD_TYPES.LONG_TEXT, icon: AlignLeft, label: 'Long Text', color: 'from-purple-500 to-purple-600' },
        { type: FIELD_TYPES.NUMBER, icon: Hash, label: 'Number', color: 'from-emerald-500 to-emerald-600' },
        { type: FIELD_TYPES.EMAIL, icon: Mail, label: 'Email', color: 'from-orange-500 to-orange-600' },
        { type: FIELD_TYPES.PHONE, icon: Phone, label: 'Phone', color: 'from-pink-500 to-pink-600' },
        { type: FIELD_TYPES.DROPDOWN, icon: ChevronDown, label: 'Dropdown', color: 'from-indigo-500 to-indigo-600' },
        { type: FIELD_TYPES.MULTI_SELECT, icon: CheckSquare, label: 'Multi-Select', color: 'from-cyan-500 to-cyan-600' },
        { type: FIELD_TYPES.RADIO, icon: Circle, label: 'Radio Buttons', color: 'from-violet-500 to-violet-600' },
        { type: FIELD_TYPES.CHECKBOX, icon: CheckSquare, label: 'Checkbox', color: 'from-teal-500 to-teal-600' },
        { type: FIELD_TYPES.DATE, icon: Calendar, label: 'Date', color: 'from-rose-500 to-rose-600' },
        { type: FIELD_TYPES.FILE, icon: Upload, label: 'File Upload', color: 'from-amber-500 to-amber-600' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {fieldTypes.map(({ type, icon: Icon, label, color }) => (
                <button
                    key={type}
                    onClick={() => onSelect(type)}
                    className="group relative p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 bg-white hover:shadow-lg transition-all text-left"
                >
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="font-bold text-sm text-slate-900">{label}</p>
                    <p className="text-xs text-slate-500 mt-1">{FIELD_TYPE_CONFIG[type]?.description}</p>
                </button>
            ))}
        </div>
    );
}

// Field Editor Modal
function FieldEditorModal({ field, onSave, onClose }) {
    const [editedField, setEditedField] = useState({ ...field });
    const config = editedField.config || {};

    const updateConfig = (key, value) => {
        setEditedField(prev => ({
            ...prev,
            config: { ...prev.config, [key]: value }
        }));
    };

    const needsOptions = [FIELD_TYPES.DROPDOWN, FIELD_TYPES.MULTI_SELECT, FIELD_TYPES.RADIO].includes(editedField.type);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 p-6">
                    <h3 className="text-2xl font-black text-slate-900">Edit Field</h3>
                    <p className="text-sm text-slate-500 mt-1">Customize your form field</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Label */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Field Label *</label>
                        <Input
                            value={editedField.label}
                            onChange={(e) => setEditedField({ ...editedField, label: e.target.value })}
                            placeholder="e.g., What's your experience level?"
                            className="h-12"
                        />
                    </div>

                    {/* Placeholder */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Placeholder Text</label>
                        <Input
                            value={config.placeholder || ''}
                            onChange={(e) => updateConfig('placeholder', e.target.value)}
                            placeholder="e.g., Enter your answer here..."
                            className="h-12"
                        />
                    </div>

                    {/* Required Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                            <p className="font-bold text-slate-900">Required Field</p>
                            <p className="text-sm text-slate-500">Candidates must answer this question</p>
                        </div>
                        <button
                            onClick={() => setEditedField({ ...editedField, required: !editedField.required })}
                            className={`relative w-14 h-8 rounded-full transition-colors ${editedField.required ? 'bg-blue-600' : 'bg-slate-300'
                                }`}
                        >
                            <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${editedField.required ? 'translate-x-6' : ''
                                }`} />
                        </button>
                    </div>

                    {/* Options for select/radio fields */}
                    {needsOptions && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Options</label>
                            <Textarea
                                value={(config.options || []).join('\n')}
                                onChange={(e) => updateConfig('options', e.target.value.split('\n').filter(o => o.trim()))}
                                placeholder="Enter each option on a new line"
                                rows={5}
                            />
                        </div>
                    )}

                    {/* Validation for text fields */}
                    {[FIELD_TYPES.SHORT_TEXT, FIELD_TYPES.LONG_TEXT].includes(editedField.type) && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Min Length</label>
                                <Input
                                    type="number"
                                    value={config.minLength || ''}
                                    onChange={(e) => updateConfig('minLength', parseInt(e.target.value) || undefined)}
                                    className="h-12"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Max Length</label>
                                <Input
                                    type="number"
                                    value={config.maxLength || ''}
                                    onChange={(e) => updateConfig('maxLength', parseInt(e.target.value) || undefined)}
                                    className="h-12"
                                />
                            </div>
                        </div>
                    )}

                    {/* Validation for number fields */}
                    {editedField.type === FIELD_TYPES.NUMBER && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Min Value</label>
                                <Input
                                    type="number"
                                    value={config.min || ''}
                                    onChange={(e) => updateConfig('min', parseInt(e.target.value) || undefined)}
                                    className="h-12"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Max Value</label>
                                <Input
                                    type="number"
                                    value={config.max || ''}
                                    onChange={(e) => updateConfig('max', parseInt(e.target.value) || undefined)}
                                    className="h-12"
                                />
                            </div>
                        </div>
                    )}

                    {/* File upload settings */}
                    {editedField.type === FIELD_TYPES.FILE && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Max File Size (MB)</label>
                                <Input
                                    type="number"
                                    value={config.maxSize || 10}
                                    onChange={(e) => updateConfig('maxSize', parseInt(e.target.value) || 10)}
                                    className="h-12"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Allowed File Types</label>
                                <Input
                                    value={(config.allowedTypes || []).join(', ')}
                                    onChange={(e) => updateConfig('allowedTypes', e.target.value.split(',').map(t => t.trim()))}
                                    placeholder=".pdf, .doc, .docx"
                                    className="h-12"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex gap-3">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="flex-1 h-12 font-bold"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => onSave(editedField)}
                        className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                        Save Field
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function JobFormBuilderPlayground({ initialFields = null, onSave }) {
    const [mandatoryFields, setMandatoryFields] = useState(
        initialFields?.mandatoryFields || MANDATORY_FIELDS
    );
    const [customFields, setCustomFields] = useState(
        initialFields?.customFields || (Array.isArray(initialFields) ? initialFields : [])
    );
    const [showFieldSelector, setShowFieldSelector] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [previewMode, setPreviewMode] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setCustomFields((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleAddField = (type) => {
        const newField = createField(type);
        setEditingField(newField);
        setShowFieldSelector(false);
    };

    const handleSaveField = (field) => {
        // Check if it's a mandatory field
        const mandatoryIndex = mandatoryFields.findIndex(f => f.id === field.id);
        if (mandatoryIndex !== -1) {
            setMandatoryFields(mandatoryFields.map(f => f.id === field.id ? field : f));
        } else if (customFields.find(f => f.id === field.id)) {
            setCustomFields(customFields.map(f => f.id === field.id ? field : f));
        } else {
            setCustomFields([...customFields, field]);
        }
        setEditingField(null);
    };

    const handleDeleteField = (id) => {
        setCustomFields(customFields.filter(f => f.id !== id));
    };

    const handleSaveForm = () => {
        const formConfig = {
            mandatoryFields: mandatoryFields,
            customFields: customFields
        };
        onSave(formConfig);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {/* Header */}
            <div className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-slate-200 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Application Form Builder</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Design your custom application form</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => setPreviewMode(!previewMode)}
                            variant="outline"
                            className="h-11 px-5 font-bold"
                        >
                            {previewMode ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                            {previewMode ? 'Edit Mode' : 'Preview'}
                        </Button>
                        <Button
                            onClick={handleSaveForm}
                            className="h-11 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold"
                        >
                            Save Form
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Default Fields Section */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full" />
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Default Application Fields</h3>
                            <p className="text-sm text-slate-500">Standard fields - you can customize labels and settings</p>
                        </div>
                    </div>

                    {!previewMode && (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event) => {
                                const { active, over } = event;
                                if (active.id !== over.id) {
                                    setMandatoryFields((items) => {
                                        const oldIndex = items.findIndex(item => item.id === active.id);
                                        const newIndex = items.findIndex(item => item.id === over.id);
                                        return arrayMove(items, oldIndex, newIndex);
                                    });
                                }
                            }}
                        >
                            <SortableContext
                                items={mandatoryFields.map(f => f.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-4">
                                    {mandatoryFields.map(field => (
                                        <FieldBlock
                                            key={field.id}
                                            field={field}
                                            onEdit={setEditingField}
                                            onDelete={() => { }} // Can't delete mandatory fields
                                            isPreview={false}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}

                    {previewMode && (
                        <div className="space-y-4">
                            {mandatoryFields.map(field => (
                                <FieldBlock
                                    key={field.id}
                                    field={field}
                                    isPreview={true}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Custom Fields Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-8 bg-gradient-to-b from-emerald-600 to-teal-600 rounded-full" />
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Custom Questions</h3>
                                <p className="text-sm text-slate-500">Add your own questions to gather specific information</p>
                            </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 px-3 py-1">
                            {customFields.length} {customFields.length === 1 ? 'field' : 'fields'}
                        </Badge>
                    </div>

                    {/* Custom Fields List */}
                    {customFields.length > 0 && !previewMode && (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={customFields.map(f => f.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-4 mb-6">
                                    {customFields.map(field => (
                                        <FieldBlock
                                            key={field.id}
                                            field={field}
                                            onEdit={setEditingField}
                                            onDelete={handleDeleteField}
                                            isPreview={previewMode}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}

                    {customFields.length > 0 && previewMode && (
                        <div className="space-y-4 mb-6">
                            {customFields.map(field => (
                                <FieldBlock
                                    key={field.id}
                                    field={field}
                                    isPreview={true}
                                />
                            ))}
                        </div>
                    )}

                    {/* Add Field Button */}
                    {!previewMode && (
                        <button
                            onClick={() => setShowFieldSelector(!showFieldSelector)}
                            className="w-full p-8 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                        >
                            <Plus className="w-8 h-8 text-slate-400 group-hover:text-blue-600 mx-auto mb-2" />
                            <p className="font-bold text-slate-600 group-hover:text-blue-600">Add New Field</p>
                            <p className="text-sm text-slate-400 mt-1">Choose from 11 different field types</p>
                        </button>
                    )}

                    {/* Field Type Selector */}
                    {showFieldSelector && !previewMode && (
                        <div className="mt-6 p-6 bg-white border-2 border-blue-200 rounded-2xl">
                            <h4 className="text-lg font-black text-slate-900 mb-4">Choose Field Type</h4>
                            <FieldTypeSelector onSelect={handleAddField} />
                        </div>
                    )}
                </div>
            </div>

            {/* Field Editor Modal */}
            {editingField && (
                <FieldEditorModal
                    field={editingField}
                    onSave={handleSaveField}
                    onClose={() => setEditingField(null)}
                />
            )}
        </div>
    );
}
