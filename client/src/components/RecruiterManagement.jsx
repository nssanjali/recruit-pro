import { useState, useEffect } from 'react';
import { Card, CardContent, Button, Input, Badge } from './ui';
import { Plus, Edit, Trash2, User, Mail, Phone, Briefcase, Award, TrendingUp } from 'lucide-react';
import { getRecruiters, createRecruiter, updateRecruiter, deleteRecruiter } from '../lib/recruiterApi';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export function RecruiterManagement() {
    const [recruiters, setRecruiters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRecruiter, setEditingRecruiter] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        skills: '',
        expertise: '',
        experience: ''
    });

    useEffect(() => {
        loadRecruiters();
    }, []);

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

        try {
            const data = {
                ...formData,
                skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
                expertise: formData.expertise.split(',').map(e => e.trim()).filter(Boolean)
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
            setFormData({
                name: '',
                email: '',
                password: '',
                phone: '',
                skills: '',
                expertise: '',
                experience: ''
            });
            loadRecruiters();
        } catch (error) {
            console.error('Error saving recruiter:', error);
            toast.error(error.message || 'Failed to save recruiter');
        }
    };

    const handleEdit = (recruiter) => {
        setEditingRecruiter(recruiter);
        setFormData({
            name: recruiter.user?.name || '',
            email: recruiter.user?.email || '',
            password: '', // Don't populate password
            phone: recruiter.user?.phone || '',
            skills: recruiter.skills?.join(', ') || '',
            expertise: recruiter.expertise?.join(', ') || '',
            experience: recruiter.experience || ''
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
            console.error('Error deleting recruiter:', error);
            toast.error('Failed to delete recruiter');
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingRecruiter(null);
        setFormData({
            name: '',
            email: '',
            password: '',
            phone: '',
            skills: '',
            expertise: '',
            experience: ''
        });
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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-black text-slate-900">Your Recruiters</h3>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">Manage and monitor your recruiting team</p>
                </div>
                <Button
                    onClick={() => setShowForm(true)}
                    className="bg-[#4285f4] hover:bg-[#3b79db] text-white font-bold"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Recruiter
                </Button>
            </div>

            {showForm && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="p-6 border-slate-100 mb-6">
                        <h4 className="font-bold text-slate-900 mb-4">
                            {editingRecruiter ? 'Edit Recruiter' : 'Add New Recruiter'}
                        </h4>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        disabled={editingRecruiter}
                                        className="border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {!editingRecruiter && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                            Password <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required={!editingRecruiter}
                                            className="border-slate-200"
                                        />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Phone</label>
                                    <Input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    Skills <span className="text-slate-400 text-[10px] normal-case">(comma-separated)</span>
                                </label>
                                <Input
                                    value={formData.skills}
                                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                    placeholder="JavaScript, React, Node.js, Python"
                                    className="border-slate-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    Expertise Areas <span className="text-slate-400 text-[10px] normal-case">(comma-separated)</span>
                                </label>
                                <Input
                                    value={formData.expertise}
                                    onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                                    placeholder="Frontend Development, Full Stack, DevOps"
                                    className="border-slate-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Experience</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285f4] text-sm"
                                    rows={3}
                                    value={formData.experience}
                                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                    placeholder="5 years of technical recruiting experience..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button type="submit" className="bg-[#4285f4] hover:bg-[#3b79db] text-white font-bold">
                                    {editingRecruiter ? 'Update' : 'Create'} Recruiter
                                </Button>
                                <Button type="button" variant="outline" onClick={handleCancel} className="font-bold">
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </Card>
                </motion.div>
            )}

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
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="p-6 hover:shadow-md transition-all border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] flex items-center justify-center shadow-lg flex-shrink-0">
                                            <span className="text-white font-black text-lg">
                                                {recruiter.user?.name?.split(' ').map(n => n[0]).join('') || 'R'}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-1">{recruiter.user?.name}</h4>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mb-3">
                                                <span className="flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    {recruiter.user?.email}
                                                </span>
                                                {recruiter.user?.phone && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {recruiter.user?.phone}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            {(recruiter.skills?.length > 0 || recruiter.expertise?.length > 0) && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {recruiter.skills?.slice(0, 3).map((skill, i) => (
                                                        <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                                                            {skill}
                                                        </Badge>
                                                    ))}
                                                    {recruiter.expertise?.slice(0, 2).map((exp, i) => (
                                                        <Badge key={i} variant="secondary" className="bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider">
                                                            {exp}
                                                        </Badge>
                                                    ))}
                                                    {(recruiter.skills?.length > 3 || recruiter.expertise?.length > 2) && (
                                                        <Badge variant="secondary" className="bg-slate-50 text-slate-500 text-[10px] font-bold">
                                                            +{(recruiter.skills?.length || 0) + (recruiter.expertise?.length || 0) - 5} more
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}

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

                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant={recruiter.status === 'active' ? 'success' : 'secondary'}
                                            className="uppercase tracking-widest text-[9px] font-black"
                                        >
                                            {recruiter.status || 'active'}
                                        </Badge>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="font-bold"
                                            onClick={() => handleEdit(recruiter)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="font-bold text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDelete(recruiter._id)}
                                        >
                                            Delete
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
