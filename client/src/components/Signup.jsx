import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, UserPlus, ArrowRight, ShieldCheck, Github, Chrome } from 'lucide-react';
import { Card, Button, Input, Badge } from './ui';

export function Signup({ onSwitchToLogin }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
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
                role: 'candidate'
            };

            const response = await fetch('http://localhost:5000/api/auth/register', {
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
            navigate('/candidate');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthSignup = (provider) => {
        window.location.href = `http://localhost:5000/api/auth/${provider}`;
    };


    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] p-4 font-sans">
            {/* Subtle Gradient Background */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_#4285f410,_transparent_40%),radial-gradient(circle_at_bottom_left,_#8b5cf610,_transparent_40%)] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[450px] z-10"
            >
                <Card className="shadow-xl bg-white border-white/20">
                    <div className="p-8">
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] flex items-center justify-center mb-4 shadow-lg shadow-[#4285f4]/20">
                                <UserPlus className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create Account</h2>
                            <p className="text-slate-500 text-sm mt-1">Join RecruitPro to start your journey</p>
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

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
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
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="name@example.com"
                                        className="pl-10 h-11"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
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
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Confirm</label>
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
                                variant="primary"
                                className="w-full h-11 text-sm font-bold"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Sign Up'}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </form>

                        <div className="mt-8 flex items-center gap-4 text-slate-300">
                            <div className="h-px bg-slate-200 flex-1" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Social Sign Up</span>
                            <div className="h-px bg-slate-200 flex-1" />
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOAuthSignup('google')}
                                className="h-10 text-xs font-semibold bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                                <Chrome className="w-4 h-4 mr-2 text-[#4285f4]" />
                                Google
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOAuthSignup('github')}
                                className="h-10 text-xs font-semibold bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                            >
                                <Github className="w-4 h-4 mr-2" />
                                GitHub
                            </Button>
                        </div>

                        <div className="mt-8 text-center">
                            <p className="text-slate-500 text-sm">
                                Already have an account?{' '}
                                <button
                                    onClick={onSwitchToLogin}
                                    className="text-[#4285f4] font-bold hover:underline"
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
