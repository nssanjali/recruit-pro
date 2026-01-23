import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, ShieldCheck, ArrowRight, ArrowLeft, KeyRound, Sparkles } from 'lucide-react';
import { Card, Button, Input, Badge } from './ui';

export function ForgotPassword({ onBackToLogin }) {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleRequestOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:5000/api/auth/forgotpassword', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to send OTP');
            setStep(2);
            setSuccess('OTP sent successfully to your email.');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:5000/api/auth/verifyotp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Invalid or expired OTP');
            setStep(3);
            setSuccess('OTP verified. You can now reset your password.');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:5000/api/auth/resetpassword', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, password: newPassword }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to reset password');
            setStep(4); // Success step
            setSuccess('Password reset successfully. You can now login.');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] p-4 font-sans">
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_#4285f410,_transparent_40%),radial-gradient(circle_at_bottom_left,_#8b5cf610,_transparent_40%)] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[420px] z-10"
            >
                <Card className="shadow-xl bg-white border-white/20">
                    <div className="p-8">
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] flex items-center justify-center mb-4 shadow-lg shadow-[#4285f4]/20">
                                <KeyRound className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                                {step === 1 && "Forgot Password"}
                                {step === 2 && "Verify OTP"}
                                {step === 3 && "Secure Reset"}
                                {step === 4 && "System Restored"}
                            </h2>
                            <p className="text-slate-500 text-sm mt-1">
                                {step === 1 && "Recover your access node credentials"}
                                {step === 2 && "Enter the 6-digit synchronization code"}
                                {step === 3 && "Initialize new security parameters"}
                                {step === 4 && "Your credentials have been synchronized"}
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-medium flex items-center gap-2"
                                >
                                    <ShieldCheck className="w-4 h-4" />
                                    {error}
                                </motion.div>
                            )}
                            {success && step !== 4 && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mb-6 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 text-xs font-medium flex items-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    {success}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {step === 1 && (
                            <form onSubmit={handleRequestOTP} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Identity Vector (Email)</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@example.com"
                                            className="pl-10 h-11"
                                            required
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-11 text-sm font-bold" disabled={loading}>
                                    {loading ? 'Transmitting...' : 'Request Reset OTP'}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={handleVerifyOTP} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Activation Code</label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            type="text"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            placeholder="6-digit code"
                                            className="pl-10 h-11 text-center tracking-[0.5em] font-black"
                                            maxLength={6}
                                            required
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-11 text-sm font-bold" disabled={loading}>
                                    {loading ? 'Verifying...' : 'Validate Code'}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </form>
                        )}

                        {step === 3 && (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">New Access Key</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="pl-10 h-11"
                                            required
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-11 text-sm font-bold" disabled={loading}>
                                    {loading ? 'Updating...' : 'Commit New Security'}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </form>
                        )}

                        {step === 4 && (
                            <div className="space-y-6">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                                    <Sparkles className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
                                    <p className="text-emerald-700 font-bold text-sm">Synchronization Successful</p>
                                    <p className="text-emerald-600/70 text-xs mt-1 font-medium">Your new security parameters are now live.</p>
                                </div>
                                <Button onClick={onBackToLogin} className="w-full h-11 text-sm font-bold bg-slate-900 border-none shadow-xl shadow-slate-900/10">
                                    Back to Login Control
                                </Button>
                            </div>
                        )}

                        {step !== 4 && (
                            <div className="mt-8 text-center">
                                <button
                                    onClick={onBackToLogin}
                                    className="flex items-center justify-center gap-2 text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors mx-auto"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Abandom Recovery
                                </button>
                            </div>
                        )}
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
