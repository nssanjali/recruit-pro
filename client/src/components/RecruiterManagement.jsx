import { useState, useEffect } from 'react';
import { Card, CardContent, Button, Input, Badge } from './ui';
import { Plus, Edit, Trash2, User, Mail, Phone, Briefcase, TrendingUp, Tag, X, Check } from 'lucide-react';
import { getRecruiters, createRecruiter, updateRecruiter, deleteRecruiter } from '../lib/recruiterApi';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

// Suggested common job role types for quick selection
const SUGGESTED_ROLES = [
    'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'DevOps Engineer', 'Data Scientist', 'Data Engineer', 'Machine Learning Engineer',
    'Product Manager', 'UX Designer', 'UI Designer', 'QA Engineer',
    'Mobile Developer', 'Cloud Architect', 'Cybersecurity Engineer', 'Business Analyst',
    'Project Manager', 'Scrum Master', 'Technical Lead', 'Engineering Manager',
];

/** Interactive role tag picker component */
function RolePicker({ selectedRoles, onChange }) {
    const [customInput, setCustomInput] = useState('');

    const toggleRole = (role) => {
        if (selectedRoles.includes(role)) {
            onChange(selectedRoles.filter(r => r !== role));
        } else {
            onChange([...selectedRoles, role]);
        }
    };

    const addCustom = () => {
        const trimmed = customInput.trim();
        if (trimmed && !selectedRoles.includes(trimmed)) {
            onChange([...selectedRoles, trimmed]);
        }
        setCustomInput('');
    };

    const removeRole = (role) => onChange(selectedRoles.filter(r => r !== role));

    return (
        <div className="space-y-3">
            {/* Selected roles */}
            {selectedRoles.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-teal-50 border border-teal-200 rounded-lg min-h-[44px]">
                    {selectedRoles.map(role => (
                        <span key={role}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-600 text-white text-xs font-bold rounded-full">
                            {role}
                            <button type="button" onClick={() => removeRole(role)}
                                className="hover:bg-teal-700 rounded-full p-0.5 ml-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Suggestion pills */}
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {SUGGESTED_ROLES.filter(r => !selectedRoles.includes(r)).map(role => (
                    <button key={role} type="button" onClick={() => toggleRole(role)}
                        className="px-2.5 py-1 text-xs font-bold rounded-full border border-slate-300 text-slate-600 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 transition-colors">
                        {role}
                    </button>
                ))}
            </div>

            {/* Custom role input */}
            <div className="flex gap-2">
                <Input
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                    placeholder="Add custom role (e.g. Blockchain Developer)..."
                    className="border-slate-200 text-sm h-9"
                />
                <Button type="button" onClick={addCustom} disabled={!customInput.trim()}
                    className="h-9 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
                    <Plus className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    );
}

const EMPTY_FORM = {
    name: '', email: '', password: '', phone: '',
    skills: '', expertise: '', experience: '',
    roles: []
};

const sanitizePhone = (value) => value.replace(/\D/g, '');

export function RecruiterManagement() {
    const [recruiters, setRecruiters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRecruiter, setEditingRecruiter] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);

    useEffect(() => { loadRecruiters(); }, []);

    const loadRecruiters = async () => {
        try {
            setLoading(true);
            const response = await getRecruiters();
            setRecruiters(response.data || []);
        } catch (error) {
            console.error('Error loading recruiters:', error);
            toast.error('Failed to load recruiters');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.phone && !/^\d{7,15}$/.test(formData.phone)) {
            toast.error('Phone number must be 7 to 15 digits');
            return;
        }
        try {
            const data = {
                ...formData,
                skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
                expertise: formData.expertise.split(',').map(e => e.trim()).filter(Boolean),
                roles: formData.roles
            };

            if (editingRecruiter) {
                await updateRecruiter(editingRecruiter._id, data);
                toast.success('Recruiter updated successfully');
            } else {
                await createRecruiter(data);
                toast.success('Recruiter created successfully');
            }

            setShowForm(false);
            setEditingRecruiter(null);
            setFormData(EMPTY_FORM);
            loadRecruiters();
        } catch (error) {
            toast.error(error.message || 'Failed to save recruiter');
        }
    };

    const handleEdit = (recruiter) => {
        setEditingRecruiter(recruiter);
        setFormData({
            name: recruiter.user?.name || '',
            email: recruiter.user?.email || '',
            password: '',
            phone: recruiter.user?.phone || '',
            skills: recruiter.skills?.join(', ') || '',
            expertise: recruiter.expertise?.join(', ') || '',
            experience: recruiter.experience || '',
            roles: recruiter.roles || []
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this recruiter?')) return;
        try {
            await deleteRecruiter(id);
            toast.success('Recruiter deleted successfully');
            loadRecruiters();
        } catch (error) {
            toast.error('Failed to delete recruiter');
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingRecruiter(null);
        setFormData(EMPTY_FORM);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-12 h-12 border-4 border-[#4285f4] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-black text-slate-900">Your Recruiters</h3>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Manage your recruiting team · Role mapping drives AI job assignments
                    </p>
                </div>
                <Button
                    onClick={() => setShowForm(true)}
                    className="bg-[#4285f4] hover:bg-[#3b79db] text-white font-bold"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Recruiter
                </Button>
            </div>

            {/* Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                    >
                        <Card className="border-slate-200 shadow-lg mb-6 overflow-hidden">
                            <div className="h-1 bg-gradient-to-r from-[#4285f4] via-teal-500 to-[#8b5cf6]" />
                            <CardContent className="p-6">
                                <h4 className="font-black text-slate-900 mb-5 flex items-center gap-2">
                                    {editingRecruiter
                                        ? <><Edit className="w-4 h-4 text-blue-600" /> Edit Recruiter</>
                                        : <><Plus className="w-4 h-4 text-blue-600" /> Add New Recruiter</>}
                                </h4>
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Basic info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                                                Full Name <span className="text-red-500">*</span>
                                            </label>
                                            <Input value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                required className="border-slate-200" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                                                Email <span className="text-red-500">*</span>
                                            </label>
                                            <Input type="email" value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                required disabled={!!editingRecruiter} className="border-slate-200" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {!editingRecruiter && (
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                                                    Password <span className="text-red-500">*</span>
                                                </label>
                                                <Input type="password" value={formData.password}
                                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                    required className="border-slate-200" />
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Phone</label>
                                            <Input type="tel" value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: sanitizePhone(e.target.value) })}
                                                inputMode="numeric"
                                                pattern="[0-9]{7,15}"
                                                maxLength={15}
                                                className="border-slate-200" />
                                        </div>
                                    </div>

                                    {/* Role Mapping — the new primary field */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                            <Tag className="w-3.5 h-3.5 text-teal-600" />
                                            Role Mapping
                                            <span className="text-slate-400 text-[10px] normal-case font-normal ml-1">
                                                — click to select job roles this recruiter handles
                                            </span>
                                        </label>
                                        <RolePicker
                                            selectedRoles={formData.roles}
                                            onChange={roles => setFormData({ ...formData, roles })}
                                        />
                                    </div>

                                    {/* Skills & Expertise */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                                                Skills <span className="text-slate-400 text-[10px] normal-case">(comma-separated)</span>
                                            </label>
                                            <Input value={formData.skills}
                                                onChange={e => setFormData({ ...formData, skills: e.target.value })}
                                                placeholder="JavaScript, React, Python" className="border-slate-200" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                                                Expertise <span className="text-slate-400 text-[10px] normal-case">(comma-separated)</span>
                                            </label>
                                            <Input value={formData.expertise}
                                                onChange={e => setFormData({ ...formData, expertise: e.target.value })}
                                                placeholder="Full Stack, DevOps, ML" className="border-slate-200" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Experience</label>
                                        <textarea
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285f4] text-sm"
                                            rows={2}
                                            value={formData.experience}
                                            onChange={e => setFormData({ ...formData, experience: e.target.value })}
                                            placeholder="5 years of technical recruiting experience..."
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button type="submit" className="bg-[#4285f4] hover:bg-[#3b79db] text-white font-bold">
                                            <Check className="w-4 h-4 mr-2" />
                                            {editingRecruiter ? 'Update' : 'Create'} Recruiter
                                        </Button>
                                        <Button type="button" variant="outline" onClick={handleCancel} className="font-bold">
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Recruiter list */}
            <div className="space-y-3">
                {recruiters.length === 0 ? (
                    <Card className="p-10 text-center border-slate-100">
                        <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-bold">No recruiters yet</p>
                        <p className="text-sm text-slate-400 mt-1">Add your first recruiter to get started</p>
                    </Card>
                ) : (
                    recruiters.map((recruiter, index) => (
                        <motion.div
                            key={recruiter._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="p-5 hover:shadow-md transition-all border-slate-100">
                                <div className="flex items-start justify-between gap-4">
                                    {/* Avatar + info */}
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] flex items-center justify-center shadow-lg flex-shrink-0">
                                            <span className="text-white font-black text-lg">
                                                {recruiter.user?.name?.split(' ').map(n => n[0]).join('') || 'R'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-black text-slate-900">{recruiter.user?.name}</h4>
                                                <Badge
                                                    variant={recruiter.status === 'active' ? 'success' : 'secondary'}
                                                    className="uppercase tracking-widest text-[9px] font-black"
                                                >
                                                    {recruiter.status || 'active'}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mb-3">
                                                <span className="flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />{recruiter.user?.email}
                                                </span>
                                                {recruiter.user?.phone && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />{recruiter.user.phone}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Role mapping badges — teal, prominent */}
                                            {recruiter.roles?.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mb-2">
                                                    <span className="flex items-center gap-1 text-[10px] font-black text-teal-700 uppercase tracking-wider mr-1">
                                                        <Tag className="w-3 h-3" /> Roles:
                                                    </span>
                                                    {recruiter.roles.slice(0, 4).map((role, i) => (
                                                        <Badge key={i} className="bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-bold">
                                                            {role}
                                                        </Badge>
                                                    ))}
                                                    {recruiter.roles.length > 4 && (
                                                        <Badge className="bg-teal-50 text-teal-600 border border-teal-200 text-[10px] font-bold">
                                                            +{recruiter.roles.length - 4} more
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}

                                            {/* Skills & Expertise */}
                                            {(recruiter.skills?.length > 0 || recruiter.expertise?.length > 0) && (
                                                <div className="flex flex-wrap gap-1.5 mb-2">
                                                    {recruiter.skills?.slice(0, 3).map((skill, i) => (
                                                        <Badge key={i} className="bg-blue-50 text-blue-700 text-[10px] font-bold">
                                                            {skill}
                                                        </Badge>
                                                    ))}
                                                    {recruiter.expertise?.slice(0, 2).map((exp, i) => (
                                                        <Badge key={i} className="bg-purple-50 text-purple-700 text-[10px] font-bold">
                                                            {exp}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Workload */}
                                            <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                                                    {recruiter.activeJobs?.length || 0} Active Jobs
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Briefcase className="w-3 h-3 text-orange-600" />
                                                    {recruiter.pendingInterviews || 0} Pending
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button variant="outline" size="sm" className="font-bold"
                                            onClick={() => handleEdit(recruiter)}>
                                            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                                        </Button>
                                        <Button variant="outline" size="sm"
                                            className="font-bold text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDelete(recruiter._id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
