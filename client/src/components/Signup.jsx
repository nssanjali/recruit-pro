import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    Mail,
    Lock,
    User,
    UserPlus,
    ArrowRight,
    ShieldAlert,
    Github,
    Chrome,
    CheckCircle2,
    Briefcase,
    Users
} from 'lucide-react';
import { Card, Button, Input, Badge } from './ui';
import { API_ORIGIN, buildApiUrl } from '../lib/apiBase';

export function Signup({ onSwitchToLogin }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'candidate'
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role
            };

            const response = await fetch(buildApiUrl('/auth/register'), {
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

            if (data.user.role === 'recruiter') {
                navigate('/recruiter');
            } else {
                navigate('/candidate');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthSignup = (provider) => {
        window.location.href = `${API_ORIGIN}/api/auth/${provider}`;
    };

    return (
        <div className="min-h-screen w-full bg-slate-50 p-4 sm:p-6">
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,_#4285f418,_transparent_44%),radial-gradient(circle_at_bottom_left,_#10b98114,_transparent_42%)]" />

            <div className="relative z-10 mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl grid-cols-1 items-center gap-6 lg:grid-cols-2">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hidden lg:block"
                >
                    <Card className="overflow-hidden border-slate-200 shadow-lg">
                        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-7 text-white">
                            <p className="text-xs font-black tracking-[0.2em] text-emerald-100 uppercase">RecruitPro Onboarding</p>
                            <h2 className="mt-2 text-3xl font-black">Create Account</h2>
                            <p className="mt-1 text-sm text-emerald-100">Set up your profile and start hiring or applying in minutes.</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 p-4 bg-white">
                            {[
                                { label: 'Profile', icon: User },
                                { label: 'Jobs', icon: Briefcase },
                                { label: 'Teams', icon: Users }
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
                                'Choose candidate or recruiter role while registering',
                                'Social sign up with Google or GitHub',
                                'Company admins can register through dedicated flow'
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
                    <Card className="mx-auto w-full max-w-[520px] border-slate-200 bg-white shadow-xl">
                        <div className="p-8">
                            <div className="mb-7 text-center">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#10b981] to-[#06b6d4] shadow-lg shadow-[#10b981]/20">
                                    <UserPlus className="h-6 w-6 text-white" />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-900">Sign Up</h1>
                                <p className="mt-1 text-sm text-slate-500">Create your RecruitPro account</p>
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

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
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
                                    <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="name@example.com"
                                            className="h-11 rounded-xl border-slate-200 pl-10"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Password</label>
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
                                        <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Confirm</label>
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

                                <Button
                                    type="submit"
                                    className="h-11 w-full rounded-xl bg-[#10b981] text-sm font-bold text-white hover:bg-[#059669]"
                                    disabled={loading}
                                >
                                    {loading ? 'Creating...' : 'Sign Up'}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </form>

                            <div className="mt-8 flex items-center gap-4">
                                <div className="h-px flex-1 bg-slate-200" />
                                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[10px] font-black tracking-[0.16em] text-slate-500 uppercase">
                                    Social Sign Up
                                </Badge>
                                <div className="h-px flex-1 bg-slate-200" />
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleOAuthSignup('google')}
                                    className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <Chrome className="mr-2 h-4 w-4 text-[#4285f4]" />
                                    Google
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleOAuthSignup('github')}
                                    className="h-10 rounded-xl border-slate-900 bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
                                >
                                    <Github className="mr-2 h-4 w-4" />
                                    GitHub
                                </Button>
                            </div>

                            <div className="mt-7 space-y-2 text-center">
                                <p className="text-sm text-slate-500">
                                    Already have an account?{' '}
                                    <button onClick={onSwitchToLogin} className="font-bold text-[#4285f4] hover:underline">
                                        Sign In
                                    </button>
                                </p>
                                <p className="text-xs text-slate-500">
                                    Representing a company?{' '}
                                    <a href="/company-signup" className="font-bold text-[#10b981] hover:underline">
                                        Register as Company Admin
                                    </a>
                                </p>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
