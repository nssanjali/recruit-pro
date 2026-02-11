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
import { GripVertical, Edit2, Trash2, Eye, EyeOff, Plus } from 'lucide-react';
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
                {!isMandatory && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <GripVertical className="w-5 h-5 text-slate-400" />
                    </div>
                )}

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

export function JobFormBuilderInline({ initialFields = [], onSave }) {
    const [customFields, setCustomFields] = useState(initialFields);
    const [editingField, setEditingField] = useState(null);
    const [showFieldSelector, setShowFieldSelector] = useState(false);
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
        setShowFieldSelector(false);
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

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">
                    Customize Application Form
                </h3>
                <p className="text-slate-600">
                    Add custom fields to collect specific information from candidates
                </p>
            </div>

            {/* Cover Letter Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                    <p className="font-bold text-slate-900">Include Cover Letter</p>
                    <p className="text-sm text-slate-500">Ask candidates for a cover letter</p>
                </div>
                <button
                    onClick={() => setIncludeCoverLetter(!includeCoverLetter)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${includeCoverLetter ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                >
                    <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${includeCoverLetter ? 'translate-x-7' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-slate-900">
                        Form Fields ({customFields.length} custom)
                    </h4>
                    <Button
                        onClick={() => setShowFieldSelector(!showFieldSelector)}
                        className="h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Field
                    </Button>
                </div>

                {/* Field Selector */}
                {showFieldSelector && (
                    <Card className="p-4 border-2 border-emerald-200">
                        <FieldTypeSelector onSelectField={handleAddField} />
                    </Card>
                )}

                {/* Mandatory Fields */}
                <div className="space-y-3">
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
                </div>

                {/* Custom Fields */}
                {customFields.length > 0 && (
                    <div className="pt-4 border-t-2 border-slate-200">
                        <p className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">
                            Custom Fields
                        </p>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={customFields.map(f => f.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-3">
                                    {customFields.map(field => (
                                        <SortableField
                                            key={field.id}
                                            field={field}
                                            isMandatory={false}
                                            onEdit={setEditingField}
                                            onDelete={handleDeleteField}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                )}

                {customFields.length === 0 && !showFieldSelector && (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <p className="text-slate-500 font-medium">
                            No custom fields yet. Click "Add Field" to get started.
                        </p>
                    </div>
                )}
            </div>

            {/* Field Editor Modal */}
            {editingField && (
                <FormFieldEditor
                    field={editingField}
                    onUpdate={handleUpdateField}
                    onClose={() => setEditingField(null)}
                />
            )}
        </div>
    );
}
