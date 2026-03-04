import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from './ui';
import { Save, Award, Briefcase, TrendingUp, User, Tag, X, Plus } from 'lucide-react';
import { getMyRecruiterProfile, updateMyRecruiterProfile } from '../lib/recruiterApi';
import { toast } from 'sonner';
import { motion } from 'motion/react';

const SUGGESTED_ROLES = [
    'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'DevOps Engineer', 'Data Scientist', 'Data Engineer', 'Machine Learning Engineer',
    'Product Manager', 'UX Designer', 'QA Engineer', 'Mobile Developer',
    'Cloud Architect', 'Cybersecurity Engineer', 'Business Analyst', 'Project Manager',
    'Technical Lead', 'Engineering Manager', 'Scrum Master',
];

function RolePicker({ selectedRoles, onChange }) {
    const [customInput, setCustomInput] = useState('');

    const toggleRole = (role) => {
        if (selectedRoles.includes(role)) onChange(selectedRoles.filter(r => r !== role));
        else onChange([...selectedRoles, role]);
    };

    const addCustom = () => {
        const trimmed = customInput.trim();
        if (trimmed && !selectedRoles.includes(trimmed)) onChange([...selectedRoles, trimmed]);
        setCustomInput('');
    };

    return (
        <div className="space-y-3">
            {selectedRoles.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-teal-50 border border-teal-200 rounded-xl min-h-[44px]">
                    {selectedRoles.map(role => (
                        <span key={role}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-teal-600 text-white text-xs font-bold rounded-full">
                            {role}
                            <button type="button" onClick={() => onChange(selectedRoles.filter(r => r !== role))}
                                className="hover:bg-teal-700 rounded-full p-0.5 ml-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {SUGGESTED_ROLES.filter(r => !selectedRoles.includes(r)).map(role => (
                    <button key={role} type="button" onClick={() => toggleRole(role)}
                        className="px-2.5 py-1 text-xs font-bold rounded-full border border-slate-300 text-slate-600 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 transition-colors">
                        {role}
                    </button>
                ))}
            </div>
            <div className="flex gap-2">
                <Input value={customInput} onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                    placeholder="Add custom role..." className="border-slate-300 text-sm h-9" />
                <Button type="button" onClick={addCustom} disabled={!customInput.trim()}
                    className="h-9 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
                    <Plus className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    );
}


export function RecruiterProfile({ user }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        skills: '',
        expertise: '',
        experience: '',
        availability: 'available',
        roles: []
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const response = await getMyRecruiterProfile();
            if (response.data) {
                setProfile(response.data);
                setFormData({
                    skills: response.data.skills?.join(', ') || '',
                    expertise: response.data.expertise?.join(', ') || '',
                    experience: response.data.experience || '',
                    availability: response.data.availability || 'available',
                    roles: response.data.roles || []
                });
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            toast.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);
            const data = {
                skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
                expertise: formData.expertise.split(',').map(e => e.trim()).filter(Boolean),
                experience: formData.experience,
                availability: formData.availability,
                roles: formData.roles
            };

            await updateMyRecruiterProfile(data);
            toast.success('Profile updated successfully');
            loadProfile();
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-black text-slate-900">Recruiter Profile</h2>
                <p className="text-slate-500 mt-1">Manage your professional information for AI job matching</p>
            </div>

            {/* Profile Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                                <Briefcase className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">{profile?.activeJobs?.length || 0}</p>
                                <p className="text-sm text-slate-600 font-bold">Active Jobs</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">{profile?.pendingInterviews || 0}</p>
                                <p className="text-sm text-slate-600 font-bold">Pending Interviews</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <User className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">{profile?.completedInterviews || 0}</p>
                                <p className="text-sm text-slate-600 font-bold">Completed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Profile Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Card className="border-slate-200 shadow-lg">
                    <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50">
                        <CardTitle className="text-xl font-black">Professional Information</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* User Info (Read-only) */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <label className="text-sm font-bold text-slate-600">Name</label>
                                    <p className="text-slate-900 font-bold mt-1">{user?.name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-600">Email</label>
                                    <p className="text-slate-900 font-bold mt-1">{user?.email}</p>
                                </div>
                            </div>

                            {/* Role Mapping */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-teal-600" />
                                    Role Mapping
                                    <span className="ml-1 text-xs text-slate-500 font-normal">— job types you handle (used for AI assignment matching)</span>
                                </label>
                                <RolePicker
                                    selectedRoles={formData.roles}
                                    onChange={roles => setFormData({ ...formData, roles })}
                                />
                            </div>

                            {/* Skills */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Award className="w-4 h-4 text-blue-600" />
                                    Skills <span className="text-slate-500 text-xs font-normal">(comma-separated)</span>
                                </label>
                                <Input
                                    value={formData.skills}
                                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                    placeholder="JavaScript, React, Node.js, Python, SQL"
                                    className="border-slate-300"
                                />
                                {formData.skills && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {formData.skills.split(',').map((skill, i) => (
                                            <Badge key={i} className="bg-blue-100 text-blue-700">
                                                {skill.trim()}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Expertise */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-purple-600" />
                                    Expertise Areas <span className="text-slate-500 text-xs font-normal">(comma-separated)</span>
                                </label>
                                <Input
                                    value={formData.expertise}
                                    onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                                    placeholder="Frontend Development, Full Stack, DevOps, Cloud Architecture"
                                    className="border-slate-300"
                                />
                                {formData.expertise && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {formData.expertise.split(',').map((exp, i) => (
                                            <Badge key={i} className="bg-purple-100 text-purple-700">
                                                {exp.trim()}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Experience */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Experience & Background</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={4}
                                    value={formData.experience}
                                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                    placeholder="Describe your recruiting experience, specializations, and background..."
                                />
                            </div>

                            {/* Availability */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Availability Status</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.availability}
                                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                                >
                                    <option value="available">Available</option>
                                    <option value="busy">Busy</option>
                                    <option value="unavailable">Unavailable</option>
                                </select>
                            </div>

                            {/* Submit Button */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {saving ? 'Saving...' : 'Save Profile'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Info Card */}
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardContent className="p-6">
                    <h4 className="font-black text-slate-900 mb-2 flex items-center gap-2">
                        <Award className="w-5 h-5 text-blue-600" />
                        Why Update Your Profile?
                    </h4>
                    <p className="text-sm text-slate-600">
                        Your skills and expertise help our AI system match you with the most suitable jobs.
                        Keep your profile updated to receive better job assignments that align with your strengths.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
