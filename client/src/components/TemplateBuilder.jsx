import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from './ui';
import { Plus, Trash2, GripVertical, Save, Eye, FileText, Settings } from 'lucide-react';
import { getDefaultFields, createTemplate, updateTemplate, getTemplates } from '../lib/templateApi';
import { motion } from 'motion/react';

export function TemplateBuilder() {
    const [templates, setTemplates] = useState([]);
    const [defaultFields, setDefaultFields] = useState([]);
    const [currentTemplate, setCurrentTemplate] = useState({
        name: '',
        description: '',
        fields: [],
        isDefault: false
    });
    const [selectedFields, setSelectedFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [fieldsData, templatesData] = await Promise.all([
                getDefaultFields(),
                getTemplates()
            ]);
            setDefaultFields(fieldsData);
            setTemplates(templatesData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddField = (field) => {
        setSelectedFields([...selectedFields, { ...field, id: `${field.id}_${Date.now()}` }]);
    };

    const handleRemoveField = (index) => {
        setSelectedFields(selectedFields.filter((_, i) => i !== index));
    };

    const handleSaveTemplate = async () => {
        if (!currentTemplate.name || selectedFields.length === 0) {
            alert('Please provide a template name and add at least one field');
            return;
        }

        setSaving(true);
        try {
            const templateData = {
                ...currentTemplate,
                fields: selectedFields
            };

            if (editingId) {
                await updateTemplate(editingId, templateData);
            } else {
                await createTemplate(templateData);
            }

            await fetchData();
            resetForm();
            alert('Template saved successfully!');
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setCurrentTemplate({
            name: '',
            description: '',
            fields: [],
            isDefault: false
        });
        setSelectedFields([]);
        setEditingId(null);
    };

    const handleEditTemplate = (template) => {
        setCurrentTemplate({
            name: template.name,
            description: template.description || '',
            isDefault: template.isDefault || false
        });
        setSelectedFields(template.fields || []);
        setEditingId(template._id);
    };

    // Group default fields by category
    const fieldsByCategory = defaultFields.reduce((acc, field) => {
        const category = field.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(field);
        return acc;
    }, {});

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                    Application Form Templates
                </h2>
                <p className="text-slate-500 font-medium">Create custom application forms for your job postings</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Template Builder */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-slate-200 shadow-lg">
                        <CardHeader className="border-b border-slate-100">
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <Settings className="w-5 h-5" />
                                {editingId ? 'Edit Template' : 'New Template'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div>
                                <label className="text-sm font-bold text-slate-900 mb-2 block">
                                    Template Name *
                                </label>
                                <input
                                    type="text"
                                    value={currentTemplate.name}
                                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                                    placeholder="e.g., Software Engineer Application"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-900 mb-2 block">
                                    Description
                                </label>
                                <textarea
                                    value={currentTemplate.description}
                                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, description: e.target.value })}
                                    placeholder="Brief description of this template..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="isDefault"
                                    checked={currentTemplate.isDefault}
                                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, isDefault: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <label htmlFor="isDefault" className="text-sm font-medium text-slate-700">
                                    Set as default template
                                </label>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-sm font-bold text-slate-900">
                                        Form Fields ({selectedFields.length})
                                    </label>
                                    {selectedFields.length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowPreview(!showPreview)}
                                            className="text-xs"
                                        >
                                            <Eye className="w-3 h-3 mr-1" />
                                            {showPreview ? 'Hide' : 'Show'} Preview
                                        </Button>
                                    )}
                                </div>

                                {selectedFields.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500">No fields added yet</p>
                                        <p className="text-xs text-slate-400 mt-1">Select fields from the right panel</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedFields.map((field, index) => (
                                            <motion.div
                                                key={field.id}
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200"
                                            >
                                                <GripVertical className="w-4 h-4 text-slate-400" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-900">{field.label}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                                                            {field.type}
                                                        </Badge>
                                                        {field.required && (
                                                            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                                                                Required
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveField(index)}
                                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={resetForm}
                                    className="flex-1"
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSaveTemplate}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Template
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Existing Templates */}
                    {templates.length > 0 && (
                        <Card className="border-slate-200 shadow-lg">
                            <CardHeader className="border-b border-slate-100">
                                <CardTitle className="text-xl font-black">Saved Templates</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    {templates.map((template) => (
                                        <div
                                            key={template._id}
                                            className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                                            onClick={() => handleEditTemplate(template)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-900">{template.name}</h4>
                                                    {template.description && (
                                                        <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">
                                                            {template.fields?.length || 0} fields
                                                        </Badge>
                                                        {template.isDefault && (
                                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                                                                Default
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Field Library */}
                <div>
                    <Card className="border-slate-200 shadow-lg sticky top-4">
                        <CardHeader className="border-b border-slate-100">
                            <CardTitle className="text-lg font-black">Field Library</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                            {Object.entries(fieldsByCategory).map(([category, fields]) => (
                                <div key={category} className="mb-6 last:mb-0">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                        {category}
                                    </h4>
                                    <div className="space-y-2">
                                        {fields.map((field) => (
                                            <button
                                                key={field.id}
                                                onClick={() => handleAddField(field)}
                                                className="w-full text-left p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600">
                                                            {field.label}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-0.5">{field.type}</p>
                                                    </div>
                                                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
