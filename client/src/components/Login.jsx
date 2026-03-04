import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    Mail,
    Lock,
    LogIn,
    ArrowRight,
    ShieldAlert,
    Github,
    Chrome,
    CheckCircle2,
    Briefcase,
    Calendar,
    Users
} from 'lucide-react';
import { Card, Button, Input, Badge } from './ui';

export function Login({ onSwitchToSignup, onForgotPassword }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
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

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            navigate(`/${data.user.role}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthLogin = (provider) => {
        window.location.href = `http://localhost:5000/api/auth/${provider}`;
    };

    return (
        <div className="min-h-screen w-full bg-slate-50 p-4 sm:p-6">
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,_#4285f418,_transparent_44%),radial-gradient(circle_at_bottom_left,_#8b5cf612,_transparent_42%)]" />

            <div className="relative z-10 mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl grid-cols-1 items-center gap-6 lg:grid-cols-2">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hidden lg:block"
                >
                    <Card className="overflow-hidden border-slate-200 shadow-lg">
                        <div className="bg-gradient-to-r from-sky-700 via-blue-700 to-cyan-700 p-7 text-white">
                            <p className="text-xs font-black tracking-[0.2em] text-blue-100 uppercase">Recruiter Command Center</p>
                            <h2 className="mt-2 text-3xl font-black">Welcome Back</h2>
                            <p className="mt-1 text-sm text-blue-100">Sign in to continue managing jobs, applications, and interviews.</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 p-4 bg-white">
                            {[
                                { label: 'Pipelines', icon: Briefcase },
                                { label: 'Interviews', icon: Calendar },
                                { label: 'Candidates', icon: Users }
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                                        <Icon className="mx-auto mb-1 h-4 w-4 text-sky-700" />
                                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{item.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="space-y-2 border-t border-slate-100 p-5">
                            {[
                                'One account for recruiter, candidate, and admin roles',
                                'Secure role-based authentication and session handling',
                                'Google and GitHub login available'
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
                    <Card className="mx-auto w-full max-w-[460px] border-slate-200 bg-white shadow-xl">
                        <div className="p-8">
                            <div className="mb-8 text-center">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] shadow-lg shadow-[#4285f4]/20">
                                    <LogIn className="h-6 w-6 text-white" />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-900">Sign In</h1>
                                <p className="mt-1 text-sm text-slate-500">Access your RecruitPro workspace</p>
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

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Password</label>
                                        <button
                                            type="button"
                                            onClick={onForgotPassword}
                                            className="text-[11px] font-bold uppercase tracking-wider text-[#4285f4] hover:underline"
                                        >
                                            Forgot?
                                        </button>
                                    </div>
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
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="h-11 w-full rounded-xl bg-[#4285f4] text-sm font-bold text-white hover:bg-[#3b79db]"
                                    disabled={loading}
                                >
                                    {loading ? 'Authorizing...' : 'Sign In'}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </form>

                            <div className="mt-8 flex items-center gap-4">
                                <div className="h-px flex-1 bg-slate-200" />
                                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[10px] font-black tracking-[0.16em] text-slate-500 uppercase">
                                    Continue With
                                </Badge>
                                <div className="h-px flex-1 bg-slate-200" />
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleOAuthLogin('google')}
                                    className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <Chrome className="mr-2 h-4 w-4 text-[#4285f4]" />
                                    Google
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleOAuthLogin('github')}
                                    className="h-10 rounded-xl border-slate-900 bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
                                >
                                    <Github className="mr-2 h-4 w-4" />
                                    GitHub
                                </Button>
                            </div>

                            <p className="mt-7 text-center text-sm text-slate-500">
                                New here?{' '}
                                <button onClick={onSwitchToSignup} className="font-bold text-[#4285f4] hover:underline">
                                    Create Account
                                </button>
                            </p>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
