import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    FileText,
    Users,
    Calendar,
    BarChart3,
    Sparkles,
    Bell,
    Settings,
    User,
    UserCheck,
    Mail,
    GitBranch,
    LogOut,
    ShieldCheck,
    Cpu,
    Globe,
    Zap
} from 'lucide-react';
import { Button, Avatar, AvatarFallback, Badge } from './ui';
import { motion, AnimatePresence } from 'motion/react';

export function Layout({ children, user, onLogout }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [latency, setLatency] = useState(12);

    const activePage = location.pathname.split('/')[1] === 'profile' ? 'profile' : (location.pathname.split('/')[1] || 'candidate');

    useEffect(() => {
        const interval = setInterval(() => {
            setLatency(prev => {
                const jitter = Math.floor(Math.random() * 5) - 2;
                return Math.max(8, Math.min(45, prev + jitter));
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const menuItems = [
        { id: 'candidate', icon: LayoutDashboard, label: 'Dashboard', path: '/candidate', roles: ['candidate'] },
        { id: 'recruiter', icon: Users, label: 'Recruiter Dashboard', path: '/recruiter', roles: ['recruiter'] },
        { id: 'scheduling', icon: Calendar, label: 'Scheduling', path: '/scheduling', roles: ['recruiter', 'admin'] },
        { id: 'assignment', icon: UserCheck, label: 'Assignments', path: '/assignment', roles: ['recruiter', 'admin'] },
        { id: 'communication', icon: Mail, label: 'Messages', path: '/communication', roles: ['candidate', 'recruiter', 'admin', 'company_admin'] },
        { id: 'extension', icon: Sparkles, label: 'Evaluations', path: '/extension', roles: ['candidate', 'recruiter', 'admin', 'company_admin'] },
        { id: 'profile', icon: User, label: 'Profile', path: '/profile', roles: ['candidate', 'recruiter', 'admin', 'company_admin'] },
        { id: 'admin', icon: BarChart3, label: 'Admin Dashboard', path: '/admin', roles: ['admin'] },
        { id: 'company-admin', icon: ShieldCheck, label: 'Company Dashboard', path: '/company-admin', roles: ['company_admin'] },
    ];

    const filteredMenuItems = menuItems.filter(item =>
        !item.roles || item.roles.includes(user?.role)
    );

    return (
        <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
            {/* Sidebar with Premium Styling */}
            <div className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20 relative group/sidebar">
                {/* Subtle Sidebar Decoration */}
                <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-slate-200 to-transparent" />

                {/* Logo Section */}
                <div className="p-8 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-900/10 group-hover/sidebar:rotate-6 transition-transform">
                            <Sparkles className="w-6 h-6 text-[#4285f4]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 tracking-tighter leading-none">RecruitPro</h2>
                            <div className="flex items-center gap-1.5 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Online</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Section */}
                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                    <div className="px-4 mb-4">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">Navigation</p>
                    </div>
                    {filteredMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <button
                                key={item.id}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative ${isActive
                                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:text-slate-900'}`} />
                                <span className={`text-sm font-bold tracking-tight ${isActive ? 'text-white' : ''}`}>{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4285f4]"
                                    />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer Sidebar Section */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm border border-transparent hover:border-slate-100 transition-all group"
                    >
                        <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-700" />
                        <span className="text-sm font-bold tracking-tight">Settings</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header with Premium Glass Effect */}
                <header className="h-24 bg-white/70 backdrop-blur-xl border-b border-slate-100 px-10 flex items-center justify-between z-10">
                    <div className="flex flex-col">
                        <AnimatePresence mode="wait">
                            <motion.h1
                                key={location.pathname}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-2xl font-black text-slate-900 tracking-tighter capitalize"
                            >
                                {menuItems.find(item => location.pathname.startsWith(item.path))?.label || 'Dashboard'}
                            </motion.h1>
                        </AnimatePresence>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 rounded-full bg-[#4285f4] shadow-[0_0_8px_#4285f4]" />
                            <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Connected</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="hidden lg:flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                                <Globe className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">US-EAST</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5 text-yellow-500" />
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{latency}ms</span>
                            </div>
                        </div>

                        <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 rounded-2xl w-12 h-12 bg-white shadow-sm border border-slate-100">
                            <Bell className="w-5 h-5 text-slate-600" />
                            <div className="absolute top-3 right-3 w-2 h-2 bg-[#ef4444] rounded-full ring-2 ring-white" />
                        </Button>

                        <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-black text-slate-900 tracking-tight leading-none">{user?.name || 'Authorized User'}</p>
                                <Badge variant="ghost" className="text-[9px] font-black text-[#4285f4] uppercase tracking-widest mt-1.5 p-0 h-auto hover:bg-transparent">
                                    {user?.role || 'Guest'}
                                </Badge>
                            </div>
                            <Avatar
                                onClick={() => navigate('/profile')}
                                className="w-12 h-12 rounded-2xl border-2 border-white shadow-lg shadow-slate-200 ring-1 ring-slate-100 cursor-pointer hover:scale-105 transition-transform"
                            >
                                {user?.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <AvatarFallback className="bg-slate-900 text-[#4285f4] font-black text-base">
                                        {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                    </AvatarFallback>
                                )}
                            </Avatar>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onLogout}
                                className="hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all w-10 h-10 border border-transparent hover:border-red-100"
                            >
                                <LogOut className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Page Content with Subtle Micro-Gradient */}
                <main className="flex-1 overflow-auto relative bg-[#fcfdfe]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#4285f405,_transparent_40%),radial-gradient(circle_at_bottom_left,_#8b5cf605,_transparent_40%)] pointer-events-none" />
                    <div className="p-10 max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
