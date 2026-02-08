import { useState, useEffect } from 'react';
import {
    User,
    Mail,
    Phone,
    Briefcase,
    MapPin,
    Globe,
    Linkedin,
    Github,
    Save,
    ShieldCheck,
    Zap,
    Sparkles,
    Camera,
    GraduationCap,
    Award,
    Building2,
    Trophy,
    FileText,
    CheckCircle2,
    Upload,
    X
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Badge,
    Button,
    Input,
    Textarea,
    Avatar,
    AvatarFallback
} from './ui';
import { motion, AnimatePresence } from 'motion/react';
import { updateUserDetails, uploadFile } from '../lib/api';

export function ProfileSettings({ user, onUpdate }) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        avatar: user?.avatar || '',
        skills: Array.isArray(user?.skills) ? user.skills.join(', ') : '',
        experience: user?.experience || 0,
        location: user?.location || '',
        bio: user?.bio || '',
        department: user?.department || '',
        specialization: Array.isArray(user?.specialization) ? user.specialization.join(', ') : '',
        title: user?.title || '',
        resume: user?.resume || '',
        // Company admin fields
        companyName: user?.companyInfo?.companyName || '',
        companyEmail: user?.companyInfo?.companyEmail || '',
        companyWebsite: user?.companyInfo?.companyWebsite || '',
        industry: user?.companyInfo?.industry || '',
        companySize: user?.companyInfo?.companySize || '',
        companyLocation: user?.companyInfo?.location || '',
        companyDescription: user?.companyInfo?.description || ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                avatar: user.avatar || '',
                skills: Array.isArray(user.skills) ? user.skills.join(', ') : '',
                experience: user.experience || 0,
                location: user.location || '',
                bio: user.bio || '',
                department: user.department || '',
                specialization: Array.isArray(user.specialization) ? user.specialization.join(', ') : '',
                title: user.title || '',
                resume: user.resume || '',
                // Company admin fields
                companyName: user.companyInfo?.companyName || '',
                companyEmail: user.companyInfo?.companyEmail || '',
                companyWebsite: user.companyInfo?.companyWebsite || '',
                industry: user.companyInfo?.industry || '',
                companySize: user.companyInfo?.companySize || '',
                companyLocation: user.companyInfo?.location || '',
                companyDescription: user.companyInfo?.description || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const isAvatar = type === 'avatar';
        isAvatar ? setUploadingAvatar(true) : setUploadingResume(true);
        setError('');

        try {
            const url = await uploadFile(file, type);
            setFormData(prev => ({ ...prev, [type]: url }));

            // Automatically save the profile when avatar or resume is uploaded
            const payload = { [type]: url };
            const result = await updateUserDetails(payload);
            if (onUpdate) onUpdate(result.data);

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.message || `Failed to upload ${type}`);
        } finally {
            isAvatar ? setUploadingAvatar(false) : setUploadingResume(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const payload = {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            bio: formData.bio,
            location: formData.location,
            avatar: formData.avatar
        };

        if (user?.role === 'candidate') {
            payload.skills = formData.skills.split(',').map(s => s.trim()).filter(s => s !== '');
            payload.experience = Number(formData.experience);
            payload.resume = formData.resume;
        } else if (user?.role === 'recruiter') {
            payload.department = formData.department;
            payload.specialization = formData.specialization.split(',').map(s => s.trim()).filter(s => s !== '');
            payload.title = formData.title;
        } else if (user?.role === 'company_admin') {
            payload.companyInfo = {
                companyName: formData.companyName,
                companyEmail: formData.companyEmail,
                companyWebsite: formData.companyWebsite,
                industry: formData.industry,
                companySize: formData.companySize,
                location: formData.companyLocation,
                description: formData.companyDescription
            };
        }

        try {
            const result = await updateUserDetails(payload);
            setSuccess(true);
            if (onUpdate) onUpdate(result.data);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Header Section */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] flex items-center justify-center shadow-xl shadow-[#4285f4]/20">
                            <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Profile Settings</h1>
                            <p className="text-slate-500 font-medium mt-1">Manage your personal information and preferences</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column - Profile Card */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Avatar Card */}
                            <Card className="border-slate-200 shadow-xl overflow-hidden bg-white">
                                <div className="h-32 bg-gradient-to-br from-[#4285f4] via-[#8b5cf6] to-[#ec4899] relative">
                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
                                </div>
                                <CardContent className="pt-0 pb-8 px-8 -mt-16 relative">
                                    <div className="flex flex-col items-center">
                                        <div className="relative group">
                                            <Avatar className="w-32 h-32 rounded-3xl border-4 border-white shadow-2xl ring-4 ring-slate-100 group-hover:scale-105 transition-all duration-300">
                                                {formData.avatar ? (
                                                    <img src={formData.avatar} alt={user?.role === 'company_admin' ? formData.companyName : formData.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <AvatarFallback className={`text-white text-4xl font-black ${user?.role === 'company_admin'
                                                            ? 'bg-gradient-to-br from-emerald-600 to-emerald-800'
                                                            : 'bg-gradient-to-br from-slate-900 to-slate-700'
                                                        }`}>
                                                        {user?.role === 'company_admin'
                                                            ? (formData.companyName ? formData.companyName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'CO')
                                                            : (formData.name ? formData.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U')
                                                        }
                                                    </AvatarFallback>
                                                )}
                                            </Avatar>
                                            <label className={`absolute -bottom-2 -right-2 w-12 h-12 text-white rounded-2xl flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-110 transition-all cursor-pointer border-4 border-white ${user?.role === 'company_admin'
                                                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/30'
                                                    : 'bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] shadow-[#4285f4]/30'
                                                }`}>
                                                {uploadingAvatar ? (
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Camera className="w-5 h-5" />
                                                )}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileUpload(e, 'avatar')}
                                                    disabled={uploadingAvatar}
                                                />
                                            </label>
                                        </div>

                                        <div className="text-center mt-6 w-full">
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                                {user?.role === 'company_admin' ? (formData.companyName || 'Company Name') : (formData.name || 'Your Name')}
                                            </h3>
                                            <Badge className={`mt-3 text-white border-none px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${user?.role === 'company_admin'
                                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-700'
                                                    : 'bg-gradient-to-r from-[#4285f4] to-[#8b5cf6]'
                                                }`}>
                                                {user?.role === 'company_admin' ? 'Company' : (user?.role || 'User')}
                                            </Badge>
                                        </div>

                                        <div className="w-full mt-8 space-y-3">
                                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</p>
                                                        <p className="text-sm font-black text-slate-900">Verified</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                                        <Zap className="w-5 h-5 text-amber-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Member Since</p>
                                                        <p className="text-sm font-black text-slate-900">2026</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Actions */}
                            <Card className="border-slate-200 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
                                <CardContent className="p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <Sparkles className="w-5 h-5 text-yellow-400" />
                                        <h3 className="text-lg font-black">Quick Actions</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-gradient-to-r from-[#4285f4] to-[#8b5cf6] hover:from-[#3b79db] hover:to-[#7c4fe0] text-white font-bold h-14 rounded-2xl shadow-xl shadow-[#4285f4]/20 border-none text-base"
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                                    Saving Changes...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-5 h-5 mr-2" />
                                                    Save All Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column - Form Fields */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Basic Information */}
                            <Card className="border-slate-200 shadow-lg bg-white">
                                <CardHeader className="pb-6 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user?.role === 'company_admin' ? 'bg-emerald-100' : 'bg-blue-100'
                                            }`}>
                                            {user?.role === 'company_admin' ? (
                                                <Building2 className="w-5 h-5 text-emerald-600" />
                                            ) : (
                                                <User className="w-5 h-5 text-blue-600" />
                                            )}
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl font-black text-slate-900">
                                                {user?.role === 'company_admin' ? 'Company Profile' : 'Basic Information'}
                                            </CardTitle>
                                            <p className="text-sm text-slate-500 font-medium mt-0.5">
                                                {user?.role === 'company_admin' ? 'Your company details and contact information' : 'Your personal details'}
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-8 pb-8">
                                    {user?.role === 'company_admin' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    Company Name
                                                </label>
                                                <Input
                                                    name="companyName"
                                                    value={formData.companyName}
                                                    onChange={handleChange}
                                                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#10b981] transition-all rounded-xl font-medium"
                                                    placeholder="Acme Corporation"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                    <Briefcase className="w-3.5 h-3.5" />
                                                    Industry
                                                </label>
                                                <select
                                                    name="industry"
                                                    value={formData.industry}
                                                    onChange={handleChange}
                                                    className="w-full h-12 px-4 border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#10b981] rounded-xl text-sm font-medium transition-all"
                                                    required
                                                >
                                                    <option value="">Select Industry</option>
                                                    <option value="Technology">Technology</option>
                                                    <option value="Finance">Finance</option>
                                                    <option value="Healthcare">Healthcare</option>
                                                    <option value="Education">Education</option>
                                                    <option value="Retail">Retail</option>
                                                    <option value="Manufacturing">Manufacturing</option>
                                                    <option value="Consulting">Consulting</option>
                                                    <option value="Media">Media & Entertainment</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    Company Email
                                                </label>
                                                <Input
                                                    name="companyEmail"
                                                    value={formData.companyEmail}
                                                    onChange={handleChange}
                                                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#10b981] transition-all rounded-xl font-medium"
                                                    placeholder="hr@company.com"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    Company Phone
                                                </label>
                                                <Input
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#10b981] transition-all rounded-xl font-medium"
                                                    placeholder="+1 (555) 000-0000"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                    <Globe className="w-3.5 h-3.5" />
                                                    Website
                                                </label>
                                                <Input
                                                    name="companyWebsite"
                                                    value={formData.companyWebsite}
                                                    onChange={handleChange}
                                                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#10b981] transition-all rounded-xl font-medium"
                                                    placeholder="www.company.com"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    Location
                                                </label>
                                                <Input
                                                    name="companyLocation"
                                                    value={formData.companyLocation}
                                                    onChange={handleChange}
                                                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#10b981] transition-all rounded-xl font-medium"
                                                    placeholder="San Francisco, CA"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5" />
                                                    Company Size
                                                </label>
                                                <select
                                                    name="companySize"
                                                    value={formData.companySize}
                                                    onChange={handleChange}
                                                    className="w-full h-12 px-4 border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#10b981] rounded-xl text-sm font-medium transition-all"
                                                    required
                                                >
                                                    <option value="">Select Size</option>
                                                    <option value="1-10">1-10 employees</option>
                                                    <option value="11-50">11-50 employees</option>
                                                    <option value="51-200">51-200 employees</option>
                                                    <option value="201-500">201-500 employees</option>
                                                    <option value="501-1000">501-1000 employees</option>
                                                    <option value="1000+">1000+ employees</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5" />
                                                    Admin Name (Your Name)
                                                </label>
                                                <Input
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#10b981] transition-all rounded-xl font-medium"
                                                    placeholder="John Doe"
                                                    required
                                                />
                                            </div>

                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                    <FileText className="w-3.5 h-3.5" />
                                                    Company Description
                                                </label>
                                                <Textarea
                                                    name="companyDescription"
                                                    value={formData.companyDescription}
                                                    onChange={handleChange}
                                                    className="min-h-[120px] bg-slate-50 border-slate-200 focus:bg-white focus:border-[#10b981] transition-all rounded-xl p-4 font-medium resize-none"
                                                    placeholder="Tell us about your company, culture, and what makes you unique..."
                                                    maxLength={500}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5" />
                                                    Full Name
                                                </label>
                                                <Input
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#4285f4] transition-all rounded-xl font-medium"
                                                    placeholder="Enter your full name"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    Email Address
                                                </label>
                                                <Input
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className="h-12 bg-slate-100 border-slate-200 rounded-xl font-medium cursor-not-allowed"
                                                    required
                                                    disabled
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    Phone Number
                                                </label>
                                                <Input
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#4285f4] transition-all rounded-xl font-medium"
                                                    placeholder="+1 (555) 000-0000"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    Location
                                                </label>
                                                <Input
                                                    name="location"
                                                    value={formData.location}
                                                    onChange={handleChange}
                                                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#4285f4] transition-all rounded-xl font-medium"
                                                    placeholder="City, Country"
                                                />
                                            </div>

                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                    <FileText className="w-3.5 h-3.5" />
                                                    Bio
                                                </label>
                                                <Textarea
                                                    name="bio"
                                                    value={formData.bio}
                                                    onChange={handleChange}
                                                    className="min-h-[120px] bg-slate-50 border-slate-200 focus:bg-white focus:border-[#4285f4] transition-all rounded-xl p-4 font-medium resize-none"
                                                    placeholder="Tell us about yourself..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Role-Specific Information - Only for candidates and recruiters */}
                            {user?.role !== 'company_admin' && (
                                <Card className="border-slate-200 shadow-lg bg-white">
                                    <CardHeader className="pb-6 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                                <Sparkles className="w-5 h-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl font-black text-slate-900">
                                                    {user?.role === 'candidate' ? 'Professional Details' : 'Recruiter Details'}
                                                </CardTitle>
                                                <p className="text-sm text-slate-500 font-medium mt-0.5">
                                                    {user?.role === 'candidate' ? 'Your skills and experience' : 'Your department and specialization'}
                                                </p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-8 pb-8">
                                        {user?.role === 'candidate' ? (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                            <GraduationCap className="w-3.5 h-3.5" />
                                                            Years of Experience
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            name="experience"
                                                            value={formData.experience}
                                                            onChange={handleChange}
                                                            className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#4285f4] transition-all rounded-xl font-medium"
                                                            placeholder="0"
                                                            min="0"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                            <Trophy className="w-3.5 h-3.5" />
                                                            Status
                                                        </label>
                                                        <div className="h-12 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-center justify-center">
                                                            <span className="text-sm font-black text-emerald-700 uppercase tracking-wider">Actively Looking</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                        <Award className="w-3.5 h-3.5" />
                                                        Skills (Comma separated)
                                                    </label>
                                                    <Textarea
                                                        name="skills"
                                                        value={formData.skills}
                                                        onChange={handleChange}
                                                        className="min-h-[100px] bg-slate-50 border-slate-200 focus:bg-white focus:border-[#4285f4] transition-all rounded-xl p-4 font-medium resize-none"
                                                        placeholder="e.g. React, Node.js, Python, Machine Learning..."
                                                    />
                                                </div>

                                                {/* Resume Upload */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                        <FileText className="w-3.5 h-3.5" />
                                                        Resume
                                                    </label>
                                                    <div className="relative">
                                                        <div className={`p-6 border-2 border-dashed rounded-2xl transition-all ${formData.resume
                                                            ? 'border-emerald-300 bg-emerald-50'
                                                            : 'border-slate-300 bg-slate-50 hover:border-[#4285f4] hover:bg-blue-50'
                                                            }`}>
                                                            {formData.resume ? (
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                                                                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-slate-900">Resume Uploaded</p>
                                                                            <p className="text-xs text-slate-500 font-medium mt-0.5">Successfully stored on cloud</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <a
                                                                            href={formData.resume}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all"
                                                                        >
                                                                            View
                                                                        </a>
                                                                        <label className="px-4 py-2 bg-[#4285f4] hover:bg-[#3b79db] text-white text-xs font-bold rounded-xl cursor-pointer transition-all">
                                                                            {uploadingResume ? 'Uploading...' : 'Replace'}
                                                                            <input
                                                                                type="file"
                                                                                className="hidden"
                                                                                accept=".pdf,.doc,.docx"
                                                                                onChange={(e) => handleFileUpload(e, 'resume')}
                                                                                disabled={uploadingResume}
                                                                            />
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <label className="flex flex-col items-center justify-center cursor-pointer">
                                                                    <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
                                                                        {uploadingResume ? (
                                                                            <div className="w-8 h-8 border-3 border-[#4285f4] border-t-transparent rounded-full animate-spin" />
                                                                        ) : (
                                                                            <Upload className="w-8 h-8 text-slate-400" />
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm font-bold text-slate-900 mb-1">
                                                                        {uploadingResume ? 'Uploading resume...' : 'Click to upload resume'}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500 font-medium">PDF, DOC, DOCX (Max 10MB)</p>
                                                                    <input
                                                                        type="file"
                                                                        className="hidden"
                                                                        accept=".pdf,.doc,.docx"
                                                                        onChange={(e) => handleFileUpload(e, 'resume')}
                                                                        disabled={uploadingResume}
                                                                    />
                                                                </label>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : user?.role === 'company_admin' ? (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                            <Building2 className="w-3.5 h-3.5" />
                                                            Company Name
                                                        </label>
                                                        <Input
                                                            name="companyName"
                                                            value={formData.companyName}
                                                            onChange={handleChange}
                                                            className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#10b981] transition-all rounded-xl font-medium"
                                                            placeholder="Acme Corporation"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                            <Mail className="w-3.5 h-3.5" />
                                                            Company Email
                                                        </label>
                                                        <Input
                                                            name="companyEmail"
                                                            value={formData.companyEmail}
                                                            onChange={handleChange}
                                                            className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#10b981] transition-all rounded-xl font-medium"
                                                            placeholder="hr@company.com"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                            <Globe className="w-3.5 h-3.5" />
                                                            Website
                                                        </label>
                                                        <Input
                                                            name="companyWebsite"
                                                            value={formData.companyWebsite}
                                                            onChange={handleChange}
                                                            className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#10b981] transition-all rounded-xl font-medium"
                                                            placeholder="www.company.com"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                            <Briefcase className="w-3.5 h-3.5" />
                                                            Industry
                                                        </label>
                                                        <select
                                                            name="industry"
                                                            value={formData.industry}
                                                            onChange={handleChange}
                                                            className="w-full h-12 px-4 border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#10b981] rounded-xl text-sm font-medium transition-all"
                                                            required
                                                        >
                                                            <option value="">Select Industry</option>
                                                            <option value="Technology">Technology</option>
                                                            <option value="Finance">Finance</option>
                                                            <option value="Healthcare">Healthcare</option>
                                                            <option value="Education">Education</option>
                                                            <option value="Retail">Retail</option>
                                                            <option value="Manufacturing">Manufacturing</option>
                                                            <option value="Consulting">Consulting</option>
                                                            <option value="Media">Media & Entertainment</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                            <User className="w-3.5 h-3.5" />
                                                            Company Size
                                                        </label>
                                                        <select
                                                            name="companySize"
                                                            value={formData.companySize}
                                                            onChange={handleChange}
                                                            className="w-full h-12 px-4 border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#10b981] rounded-xl text-sm font-medium transition-all"
                                                            required
                                                        >
                                                            <option value="">Select Size</option>
                                                            <option value="1-10">1-10 employees</option>
                                                            <option value="11-50">11-50 employees</option>
                                                            <option value="51-200">51-200 employees</option>
                                                            <option value="201-500">201-500 employees</option>
                                                            <option value="501-1000">501-1000 employees</option>
                                                            <option value="1000+">1000+ employees</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                            <MapPin className="w-3.5 h-3.5" />
                                                            Company Location
                                                        </label>
                                                        <Input
                                                            name="companyLocation"
                                                            value={formData.companyLocation}
                                                            onChange={handleChange}
                                                            className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#10b981] transition-all rounded-xl font-medium"
                                                            placeholder="San Francisco, CA"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                        <FileText className="w-3.5 h-3.5" />
                                                        Company Description
                                                    </label>
                                                    <Textarea
                                                        name="companyDescription"
                                                        value={formData.companyDescription}
                                                        onChange={handleChange}
                                                        className="min-h-[120px] bg-slate-50 border-slate-200 focus:bg-white focus:border-[#10b981] transition-all rounded-xl p-4 font-medium resize-none"
                                                        placeholder="Brief description of your company..."
                                                        maxLength={500}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                            <Building2 className="w-3.5 h-3.5" />
                                                            Department
                                                        </label>
                                                        <Input
                                                            name="department"
                                                            value={formData.department}
                                                            onChange={handleChange}
                                                            className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#4285f4] transition-all rounded-xl font-medium"
                                                            placeholder="e.g. Engineering, HR, Sales"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                            <Briefcase className="w-3.5 h-3.5" />
                                                            Job Title
                                                        </label>
                                                        <Input
                                                            name="title"
                                                            value={formData.title}
                                                            onChange={handleChange}
                                                            className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#4285f4] transition-all rounded-xl font-medium"
                                                            placeholder="e.g. Senior Recruiter"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                        <Award className="w-3.5 h-3.5" />
                                                        Specialization (Comma separated)
                                                    </label>
                                                    <Textarea
                                                        name="specialization"
                                                        value={formData.specialization}
                                                        onChange={handleChange}
                                                        className="min-h-[100px] bg-slate-50 border-slate-200 focus:bg-white focus:border-[#4285f4] transition-all rounded-xl p-4 font-medium resize-none"
                                                        placeholder="e.g. Technical Recruiting, Executive Search, Campus Hiring..."
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Social Links (Optional) */}
                            <Card className="border-slate-200 shadow-lg bg-white">
                                <CardHeader className="pb-6 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                            <Globe className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl font-black text-slate-900">Social Links</CardTitle>
                                            <p className="text-sm text-slate-500 font-medium mt-0.5">Connect your professional profiles</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-8 pb-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                <Linkedin className="w-3.5 h-3.5 text-[#0a66c2]" />
                                                LinkedIn
                                            </label>
                                            <Input
                                                placeholder="linkedin.com/in/username"
                                                className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0a66c2] transition-all rounded-xl font-medium"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                                <Github className="w-3.5 h-3.5" />
                                                GitHub
                                            </label>
                                            <Input
                                                placeholder="github.com/username"
                                                className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-slate-900 transition-all rounded-xl font-medium"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </div>

            {/* Success/Error Notifications */}
            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-8 right-8 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-4 z-50 max-w-md"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-black text-lg">Success!</p>
                            <p className="text-sm text-emerald-50 font-medium">Your profile has been updated</p>
                        </div>
                    </motion.div>
                )}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-8 right-8 bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-4 z-50 max-w-md"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <X className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-black text-lg">Error</p>
                            <p className="text-sm text-red-50 font-medium">{error}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
