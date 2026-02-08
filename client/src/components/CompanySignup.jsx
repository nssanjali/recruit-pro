import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    Mail, Lock, User, Building, MapPin, Users, Globe,
    ArrowRight, ShieldCheck, Briefcase, Phone, Hash
} from 'lucide-react';
import { Card, Button, Input } from './ui';

export function CompanySignup({ onSwitchToLogin }) {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // Multi-step form
    const [formData, setFormData] = useState({
        // Personal Info
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',

        // Company Info
        companyName: '',
        companyEmail: '',
        companyWebsite: '',
        companySize: '',
        industry: '',
        location: '',
        description: '',

        role: 'company_admin'
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const validateStep1 = () => {
        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
            setError('Please fill in all required fields');
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (!formData.companyName || !formData.companyEmail || !formData.industry || !formData.companySize || !formData.location) {
            setError('Please fill in all required company fields');
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.companyEmail)) {
            setError('Please enter a valid company email address');
            return false;
        }
        return true;
    };

    const handleNext = () => {
        setError('');
        if (step === 1 && validateStep1()) {
            setStep(2);
        }
    };

    const handleBack = () => {
        setError('');
        setStep(1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!validateStep2()) {
            setLoading(false);
            return;
        }

        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                phone: formData.phone,
                role: 'company_admin',
                companyInfo: {
                    companyName: formData.companyName,
                    companyEmail: formData.companyEmail,
                    companyWebsite: formData.companyWebsite,
                    companySize: formData.companySize,
                    industry: formData.industry,
                    location: formData.location,
                    description: formData.description
                }
            };

            const response = await fetch('http://localhost:5000/api/auth/register-company', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            navigate('/company-admin');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] p-4 font-sans">
            {/* Subtle Gradient Background */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_#4285f410,_transparent_40%),radial-gradient(circle_at_bottom_left,_#10b98110,_transparent_40%)] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[550px] z-10"
            >
                <Card className="shadow-xl bg-white border-white/20">
                    <div className="p-8">
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#10b981] to-[#34d399] flex items-center justify-center mb-4 shadow-lg shadow-[#10b981]/20">
                                <Building className="w-7 h-7 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Company Registration</h2>
                            <p className="text-slate-500 text-sm mt-1">
                                {step === 1 ? 'Create your admin account' : 'Tell us about your company'}
                            </p>

                            {/* Progress Indicator */}
                            <div className="flex items-center gap-2 mt-4">
                                <div className={`w-8 h-1 rounded-full transition-all ${step >= 1 ? 'bg-[#10b981]' : 'bg-slate-200'}`} />
                                <div className={`w-8 h-1 rounded-full transition-all ${step >= 2 ? 'bg-[#10b981]' : 'bg-slate-200'}`} />
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-medium flex items-center gap-2"
                                >
                                    <ShieldCheck className="w-4 h-4" />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNext(); } : handleSubmit} className="space-y-4">
                            <AnimatePresence mode="wait">
                                {step === 1 ? (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-4"
                                    >
                                        {/* Personal Information */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name *</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    placeholder="John Doe"
                                                    className="pl-10 h-11"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address *</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    placeholder="john@company.com"
                                                    className="pl-10 h-11"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Phone Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    placeholder="+1 (555) 000-0000"
                                                    className="pl-10 h-11"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Password *</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <Input
                                                        type="password"
                                                        name="password"
                                                        value={formData.password}
                                                        onChange={handleChange}
                                                        placeholder="••••••••"
                                                        className="pl-10 h-11"
                                                        required
                                                        minLength={6}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Confirm *</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <Input
                                                        type="password"
                                                        name="confirmPassword"
                                                        value={formData.confirmPassword}
                                                        onChange={handleChange}
                                                        placeholder="••••••••"
                                                        className="pl-10 h-11"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-11 text-sm font-bold bg-[#10b981] hover:bg-[#059669] text-white"
                                        >
                                            Next: Company Details
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        {/* Company Information */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Company Name *</label>
                                            <div className="relative">
                                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input
                                                    type="text"
                                                    name="companyName"
                                                    value={formData.companyName}
                                                    onChange={handleChange}
                                                    placeholder="Acme Corporation"
                                                    className="pl-10 h-11"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Company Email *</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <Input
                                                        type="email"
                                                        name="companyEmail"
                                                        value={formData.companyEmail}
                                                        onChange={handleChange}
                                                        placeholder="hr@company.com"
                                                        className="pl-10 h-11"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Website</label>
                                                <div className="relative">
                                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <Input
                                                        type="url"
                                                        name="companyWebsite"
                                                        value={formData.companyWebsite}
                                                        onChange={handleChange}
                                                        placeholder="www.company.com"
                                                        className="pl-10 h-11"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Industry *</label>
                                                <div className="relative">
                                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <select
                                                        name="industry"
                                                        value={formData.industry}
                                                        onChange={handleChange}
                                                        className="w-full h-11 pl-10 pr-4 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
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
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Company Size *</label>
                                                <div className="relative">
                                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <select
                                                        name="companySize"
                                                        value={formData.companySize}
                                                        onChange={handleChange}
                                                        className="w-full h-11 pl-10 pr-4 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
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
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Location *</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input
                                                    type="text"
                                                    name="location"
                                                    value={formData.location}
                                                    onChange={handleChange}
                                                    placeholder="San Francisco, CA"
                                                    className="pl-10 h-11"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Company Description</label>
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleChange}
                                                placeholder="Brief description of your company..."
                                                className="w-full h-20 px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent resize-none"
                                                maxLength={500}
                                            />
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                onClick={handleBack}
                                                variant="outline"
                                                className="flex-1 h-11 text-sm font-bold"
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                type="submit"
                                                className="flex-1 h-11 text-sm font-bold bg-[#10b981] hover:bg-[#059669] text-white"
                                                disabled={loading}
                                            >
                                                {loading ? 'Creating Account...' : 'Complete Registration'}
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-slate-500 text-sm">
                                Already have an account?{' '}
                                <button
                                    onClick={onSwitchToLogin}
                                    className="text-[#10b981] font-bold hover:underline"
                                >
                                    Sign In
                                </button>
                            </p>
                        </div>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
