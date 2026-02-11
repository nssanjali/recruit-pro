import { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button, Card } from './ui';
import { FieldTypeSelector } from './FieldTypeSelector';
import { FormFieldEditor } from './FormFieldEditor';
import { FormFieldPreview } from './FormFieldPreview';
import { createField, MANDATORY_FIELDS } from '../lib/formFieldTypes';

function SortableField({ field, onEdit, onDelete, isMandatory }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group relative bg-white border-2 rounded-xl p-4 ${isDragging ? 'border-emerald-500 shadow-lg' : 'border-slate-200'
                } ${isMandatory ? 'bg-blue-50/30' : ''}`}
        >
            <div className="flex items-start gap-3">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <GripVertical className="w-5 h-5 text-slate-400" />
                </div>

                {/* Field Preview */}
                <div className="flex-1 min-w-0">
                    <FormFieldPreview field={field} value="" onChange={() => { }} />
                </div>

                {/* Actions */}
                {!isMandatory && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onEdit(field)}
                            className="w-8 h-8 rounded-lg hover:bg-emerald-100 flex items-center justify-center"
                        >
                            <Edit2 className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button
                            onClick={() => onDelete(field.id)}
                            className="w-8 h-8 rounded-lg hover:bg-red-100 flex items-center justify-center"
                        >
                            <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                    </div>
                )}
                {isMandatory && (
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">
                        Mandatory
                    </div>
                )}
            </div>
        </div>
    );
}

export function JobFormBuilder({ initialFields = [], onSave }) {
    const [customFields, setCustomFields] = useState(initialFields);
    const [editingField, setEditingField] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [includeCoverLetter, setIncludeCoverLetter] = useState(true);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleAddField = (fieldType) => {
        const newField = createField(fieldType);
        newField.order = customFields.length;
        setCustomFields([...customFields, newField]);
        setEditingField(newField);
    };

    const handleUpdateField = (updatedField) => {
        setCustomFields(customFields.map(f =>
            f.id === updatedField.id ? updatedField : f
        ));
    };

    const handleDeleteField = (fieldId) => {
        setCustomFields(customFields.filter(f => f.id !== fieldId));
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setCustomFields((fields) => {
                const oldIndex = fields.findIndex(f => f.id === active.id);
                const newIndex = fields.findIndex(f => f.id === over.id);
                return arrayMove(fields, oldIndex, newIndex);
            });
        }
    };

    const handleSave = () => {
        const formConfig = {
            mandatoryFields: {
                ...MANDATORY_FIELDS,
                coverLetter: {
                    ...MANDATORY_FIELDS.coverLetter,
                    required: includeCoverLetter
                }
            },
            customFields: customFields.map((field, index) => ({
                ...field,
                order: index
            }))
        };
        onSave(formConfig);
    };

    const allFields = [
        ...Object.values(MANDATORY_FIELDS).filter(f =>
            f.id !== 'mandatory_coverLetter' || includeCoverLetter
        ),
        ...customFields
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900">
                                Application Form Builder
                            </h1>
                            <p className="text-slate-600 mt-1">
                                Customize the application form for this job posting
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={() => setShowPreview(!showPreview)}
                                className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-900"
                            >
                                {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                                {showPreview ? 'Hide' : 'Show'} Preview
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="h-11 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                            >
                                Save Form Configuration
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Sidebar - Field Types */}
                    <div className="lg:col-span-1">
                        <Card className="p-5 sticky top-6">
                            <FieldTypeSelector onSelectField={handleAddField} />

                            {/* Cover Letter Toggle */}
                            <div className="mt-6 pt-6 border-t border-slate-200">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                                    Optional Fields
                                </h3>
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Cover Letter</p>
                                        <p className="text-xs text-slate-500">Include cover letter field</p>
                                    </div>
                                    <button
                                        onClick={() => setIncludeCoverLetter(!includeCoverLetter)}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${includeCoverLetter ? 'bg-emerald-500' : 'bg-slate-300'
                                            }`}
                                    >
                                        <div
                                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${includeCoverLetter ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Main Area - Form Builder */}
                    <div className="lg:col-span-3">
                        <Card className="p-6">
                            <div className="mb-6">
                                <h2 className="text-xl font-black text-slate-900 mb-2">
                                    Form Fields
                                </h2>
                                <p className="text-sm text-slate-600">
                                    Drag to reorder • Click to edit • {customFields.length} custom field{customFields.length !== 1 ? 's' : ''}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Mandatory Fields (Non-draggable) */}
                                {Object.values(MANDATORY_FIELDS)
                                    .filter(f => f.id !== 'mandatory_coverLetter' || includeCoverLetter)
                                    .map(field => (
                                        <SortableField
                                            key={field.id}
                                            field={field}
                                            isMandatory={true}
                                            onEdit={() => { }}
                                            onDelete={() => { }}
                                        />
                                    ))}

                                {/* Custom Fields (Draggable) */}
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={customFields.map(f => f.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {customFields.map(field => (
                                            <SortableField
                                                key={field.id}
                                                field={field}
                                                isMandatory={false}
                                                onEdit={setEditingField}
                                                onDelete={handleDeleteField}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>

                                {customFields.length === 0 && (
                                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                                        <p className="text-slate-500 font-medium">
                                            No custom fields yet. Add fields from the left sidebar.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Field Editor Modal */}
            {editingField && (
                <FormFieldEditor
                    field={editingField}
                    onUpdate={handleUpdateField}
                    onClose={() => setEditingField(null)}
                />
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900">Form Preview</h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                            >
                                <EyeOff className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {allFields.map(field => (
                                <FormFieldPreview
                                    key={field.id}
                                    field={field}
                                    value=""
                                    onChange={() => { }}
                                />
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
