import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    Mail,
    Lock,
    User,
    Building,
    MapPin,
    Users,
    Globe,
    ArrowRight,
    ShieldAlert,
    Briefcase,
    Phone,
    CheckCircle2
} from 'lucide-react';
import { Card, Button, Input, Badge } from './ui';

export function CompanySignup({ onSwitchToLogin }) {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
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
        const { name, value } = e.target;
        if (name === 'phone') {
            const numericPhone = value.replace(/\D/g, '');
            setFormData({
                ...formData,
                phone: numericPhone
            });
            return;
        }

        setFormData({
            ...formData,
            [name]: value
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
        if (formData.phone && !/^\d{7,15}$/.test(formData.phone)) {
            setError('Phone number must be 7 to 15 digits');
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
        <div className="min-h-screen w-full bg-slate-50 p-4 sm:p-6">
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,_#10b98118,_transparent_44%),radial-gradient(circle_at_bottom_left,_#4285f414,_transparent_42%)]" />

            <div className="relative z-10 mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-7xl grid-cols-1 items-center gap-6 lg:grid-cols-2">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hidden lg:block"
                >
                    <Card className="overflow-hidden border-slate-200 shadow-lg">
                        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-7 text-white">
                            <p className="text-xs font-black tracking-[0.2em] text-emerald-100 uppercase">Company Onboarding</p>
                            <h2 className="mt-2 text-3xl font-black">Register Your Company</h2>
                            <p className="mt-1 text-sm text-emerald-100">Create your company admin workspace and start posting jobs quickly.</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 p-4 bg-white">
                            {[
                                { label: 'Profile', icon: User },
                                { label: 'Company', icon: Building },
                                { label: 'Hiring', icon: Briefcase }
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                                        <Icon className="mx-auto mb-1 h-4 w-4 text-emerald-600" />
                                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{item.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="space-y-2 border-t border-slate-100 p-5">
                            {[
                                'Step 1: account details for primary admin',
                                'Step 2: company profile and hiring metadata',
                                'After signup you are redirected to Company Dashboard'
                            ].map((item) => (
                                <p key={item} className="flex items-center gap-2 text-sm text-slate-700">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    {item}
                                </p>
                            ))}
                        </div>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full"
                >
                    <Card className="mx-auto w-full max-w-[640px] border-slate-200 bg-white shadow-xl">
                        <div className="p-7 sm:p-8">
                            <div className="mb-7 text-center">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#10b981] to-[#06b6d4] shadow-lg shadow-[#10b981]/20">
                                    <Building className="h-6 w-6 text-white" />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-900">Company Registration</h1>
                                <p className="mt-1 text-sm text-slate-500">{step === 1 ? 'Create your admin account' : 'Add your company details'}</p>
                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <Badge className={`text-[10px] font-black ${step === 1 ? 'bg-[#10b981] text-white' : 'bg-slate-200 text-slate-600'}`}>Step 1</Badge>
                                    <div className={`h-1 w-10 rounded-full ${step === 2 ? 'bg-[#10b981]' : 'bg-slate-200'}`} />
                                    <Badge className={`text-[10px] font-black ${step === 2 ? 'bg-[#10b981] text-white' : 'bg-slate-200 text-slate-600'}`}>Step 2</Badge>
                                </div>
                            </div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                                    >
                                        <ShieldAlert className="h-4 w-4" />
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNext(); } : handleSubmit} className="space-y-4">
                                <AnimatePresence mode="wait">
                                    {step === 1 ? (
                                        <motion.div
                                            key="step1"
                                            initial={{ opacity: 0, x: -16 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 16 }}
                                            className="space-y-4"
                                        >
                                            <div className="space-y-1.5">
                                                <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Full Name *</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <Input
                                                        type="text"
                                                        name="name"
                                                        value={formData.name}
                                                        onChange={handleChange}
                                                        placeholder="John Doe"
                                                        className="h-11 rounded-xl border-slate-200 pl-10"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Address *</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <Input
                                                        type="email"
                                                        name="email"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        placeholder="john@company.com"
                                                        className="h-11 rounded-xl border-slate-200 pl-10"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Phone Number</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <Input
                                                        type="tel"
                                                        name="phone"
                                                        value={formData.phone}
                                                        onChange={handleChange}
                                                        placeholder="+1 (555) 000-0000"
                                                        className="h-11 rounded-xl border-slate-200 pl-10"
                                                        inputMode="numeric"
                                                        pattern="[0-9]{7,15}"
                                                        maxLength={15}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Password *</label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                        <Input
                                                            type="password"
                                                            name="password"
                                                            value={formData.password}
                                                            onChange={handleChange}
                                                            placeholder="********"
                                                            className="h-11 rounded-xl border-slate-200 pl-10"
                                                            required
                                                            minLength={6}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Confirm *</label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                        <Input
                                                            type="password"
                                                            name="confirmPassword"
                                                            value={formData.confirmPassword}
                                                            onChange={handleChange}
                                                            placeholder="********"
                                                            className="h-11 rounded-xl border-slate-200 pl-10"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <Button type="submit" className="h-11 w-full rounded-xl bg-[#10b981] text-sm font-bold text-white hover:bg-[#059669]">
                                                Next: Company Details
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="step2"
                                            initial={{ opacity: 0, x: 16 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -16 }}
                                            className="space-y-4"
                                        >
                                            <div className="space-y-1.5">
                                                <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Company Name *</label>
                                                <div className="relative">
                                                    <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <Input
                                                        type="text"
                                                        name="companyName"
                                                        value={formData.companyName}
                                                        onChange={handleChange}
                                                        placeholder="Acme Corporation"
                                                        className="h-11 rounded-xl border-slate-200 pl-10"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Company Email *</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                        <Input
                                                            type="email"
                                                            name="companyEmail"
                                                            value={formData.companyEmail}
                                                            onChange={handleChange}
                                                            placeholder="hr@company.com"
                                                            className="h-11 rounded-xl border-slate-200 pl-10"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Website</label>
                                                    <div className="relative">
                                                        <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                        <Input
                                                            type="url"
                                                            name="companyWebsite"
                                                            value={formData.companyWebsite}
                                                            onChange={handleChange}
                                                            placeholder="www.company.com"
                                                            className="h-11 rounded-xl border-slate-200 pl-10"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Industry *</label>
                                                    <div className="relative">
                                                        <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                        <select
                                                            name="industry"
                                                            value={formData.industry}
                                                            onChange={handleChange}
                                                            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]"
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
                                                    <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Company Size *</label>
                                                    <div className="relative">
                                                        <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                        <select
                                                            name="companySize"
                                                            value={formData.companySize}
                                                            onChange={handleChange}
                                                            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]"
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
                                                <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Location *</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <Input
                                                        type="text"
                                                        name="location"
                                                        value={formData.location}
                                                        onChange={handleChange}
                                                        placeholder="San Francisco, CA"
                                                        className="h-11 rounded-xl border-slate-200 pl-10"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Company Description</label>
                                                <textarea
                                                    name="description"
                                                    value={formData.description}
                                                    onChange={handleChange}
                                                    placeholder="Brief description of your company..."
                                                    className="h-24 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                                                    maxLength={500}
                                                />
                                            </div>

                                            <div className="flex gap-3">
                                                <Button type="button" onClick={handleBack} variant="outline" className="h-11 flex-1 rounded-xl text-sm font-bold">
                                                    Back
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    className="h-11 flex-1 rounded-xl bg-[#10b981] text-sm font-bold text-white hover:bg-[#059669]"
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Creating Account...' : 'Complete Registration'}
                                                    <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </form>

                            <p className="mt-7 text-center text-sm text-slate-500">
                                Already have an account?{' '}
                                <button onClick={onSwitchToLogin} className="font-bold text-[#10b981] hover:underline">
                                    Sign In
                                </button>
                            </p>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
