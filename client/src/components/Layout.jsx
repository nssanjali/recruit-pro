import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard,
    Calendar,
    BarChart3,
    Sparkles,
    Bell,
    MailOpen,
    Clock3,
    Settings,
    Shield,
    UserCheck,
    Mail,
    LogOut,
} from 'lucide-react';
import { Button, Avatar, AvatarFallback, Badge } from './ui';
import { motion, AnimatePresence } from 'motion/react';
import { buildApiUrl } from '../lib/apiBase';

// Animated Hamburger Menu Icon
function AnimatedMenuIcon({ isOpen, onClick }) {
    return (
        <button
            onClick={onClick}
            className="lg:hidden relative w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-center group"
            aria-label="Toggle menu"
        >
            <div className="w-6 h-5 flex flex-col justify-center items-center gap-1.5">
                <motion.span
                    animate={{
                        rotate: isOpen ? 45 : 0,
                        y: isOpen ? 8 : 0,
                    }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="w-full h-0.5 bg-slate-900 rounded-full origin-center"
                />
                <motion.span
                    animate={{
                        opacity: isOpen ? 0 : 1,
                        scale: isOpen ? 0 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-0.5 bg-slate-900 rounded-full"
                />
                <motion.span
                    animate={{
                        rotate: isOpen ? -45 : 0,
                        y: isOpen ? -8 : 0,
                    }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="w-full h-0.5 bg-slate-900 rounded-full origin-center"
                />
            </div>
        </button>
    );
}

export function Layout({ children, user, onLogout }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [notificationsError, setNotificationsError] = useState('');
    const [lastSeenAt, setLastSeenAt] = useState(null);
    const notificationRef = useRef(null);

    const activePage = location.pathname.split('/')[1] === 'profile' ? 'profile' : (location.pathname.split('/')[1] || 'candidate');

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [mobileMenuOpen]);

    useEffect(() => {
        const key = `notifications_last_seen_${user?._id || user?.email || 'guest'}`;
        const raw = localStorage.getItem(key);
        setLastSeenAt(raw ? new Date(raw) : null);
    }, [user?._id, user?.email]);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setNotificationOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const fetchNotifications = async () => {
        setNotificationsLoading(true);
        setNotificationsError('');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(buildApiUrl('/communications'), {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to load notifications');
            }

            const result = await response.json();
            const communications = result?.data?.communications || [];
            setNotifications(
                communications
                    .filter((item) => item?.subject || item?.content || item?.message)
                    .slice(0, 12)
            );
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            setNotificationsError(error.message || 'Failed to load notifications');
        } finally {
            setNotificationsLoading(false);
        }
    };

    const markNotificationsSeen = () => {
        const now = new Date();
        const key = `notifications_last_seen_${user?._id || user?.email || 'guest'}`;
        localStorage.setItem(key, now.toISOString());
        setLastSeenAt(now);
    };

    const handleToggleNotifications = async () => {
        const nextOpen = !notificationOpen;
        setNotificationOpen(nextOpen);
        if (nextOpen) {
            if (notifications.length === 0) {
                await fetchNotifications();
            }
            markNotificationsSeen();
        }
    };

    const formatNotificationTime = (rawDate) => {
        if (!rawDate) return 'Just now';
        const date = new Date(rawDate);
        if (Number.isNaN(date.getTime())) return 'Just now';
        const diffMinutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffMinutes < 24 * 60) return `${Math.floor(diffMinutes / 60)}h ago`;
        return date.toLocaleDateString();
    };

    const normalizeInterviewId = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        return raw.startsWith('iv-') ? raw.slice(3) : raw;
    };

    const extractInterviewIdFromNotification = (item) => {
        const rawId = item?.metadata?.interviewId
            || item?.interviewId
            || item?.relatedTo?.id
            || item?.relatedTo?._id;
        if (!rawId) return '';
        if (typeof rawId === 'string') return normalizeInterviewId(rawId);
        if (typeof rawId === 'object') {
            if (rawId.$oid) return normalizeInterviewId(rawId.$oid);
            if (rawId.toString) return normalizeInterviewId(rawId.toString());
        }
        return '';
    };

    const getNotificationTargetPath = (item) => {
        const role = user?.role;
        const text = [
            item?.subject,
            item?.content,
            item?.message,
            item?.type,
            item?.status
        ].filter(Boolean).join(' ').toLowerCase();

        const isCalendarRelated = String(item?.type || '').toLowerCase() === 'calendar' ||
            /(interview|calendar|rsvp|reschedule|meeting|scheduled|invitation|slot)/.test(text);

        if (isCalendarRelated) {
            const interviewId = extractInterviewIdFromNotification(item);
            const interviewQuery = interviewId ? `?interview=${encodeURIComponent(interviewId)}` : '';
            if (role === 'candidate') return `/candidate-calendar${interviewQuery}`;
            if (role === 'recruiter') return `/calendar${interviewQuery}`;
            if (role === 'company_admin') return `/admin-calendar${interviewQuery}`;
        }
        return '/communication';
    };

    const unreadNotifications = notifications.filter((item) => {
        const createdAt = item?.createdAt ? new Date(item.createdAt) : null;
        if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
        if (!lastSeenAt) return true;
        return createdAt.getTime() > lastSeenAt.getTime();
    }).length;

    const menuItems = [
        { id: 'candidate', icon: LayoutDashboard, label: 'Dashboard', path: '/candidate', roles: ['candidate'] },
        { id: 'candidate-calendar', icon: Calendar, label: 'My Calendar', path: '/candidate-calendar', roles: ['candidate'] },
        { id: 'recruiter', icon: LayoutDashboard, label: 'Dashboard', path: '/recruiter', roles: ['recruiter'] },
        { id: 'calendar', icon: Calendar, label: 'My Calendar', path: '/calendar', roles: ['recruiter'] },
        { id: 'communication', icon: Mail, label: 'Messages', path: '/communication', roles: ['recruiter'] },
        { id: 'scheduling', icon: Calendar, label: 'Scheduling', path: '/scheduling', roles: ['admin'] },
        { id: 'assignment', icon: UserCheck, label: 'Assignments', path: '/assignment', roles: ['admin'] },
        { id: 'company-admin', icon: LayoutDashboard, label: user?.role === 'company_admin' ? 'Home' : 'Company Dashboard', path: '/company-admin', roles: ['company_admin'] },
        { id: 'super-admin', icon: Shield, label: 'Super Admin', path: '/super-admin', roles: ['super_admin'] },
        { id: 'admin-calendar', icon: Calendar, label: 'Hiring Calendar', path: '/admin-calendar', roles: ['company_admin'] },
        { id: 'analytics', icon: BarChart3, label: 'Analytics', path: '/analytics', roles: ['company_admin'] },
        { id: 'communication-all', icon: Mail, label: user?.role === 'company_admin' ? 'Portal' : 'Messages', path: '/communication', roles: ['candidate', 'admin', 'company_admin', 'super_admin'] },
        { id: 'admin', icon: BarChart3, label: 'Admin Dashboard', path: '/admin', roles: ['admin'] },
    ];

    const filteredMenuItems = menuItems.filter(item =>
        !item.roles || item.roles.includes(user?.role)
    );

    // Separate settings from main menu
    const settingsItem = { id: 'settings', icon: Settings, label: 'Settings', path: '/profile' };

    const SidebarContent = () => (
        <>
            <div className="p-6 border-b border-slate-200 bg-white">
                <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                    <div className="flex items-center gap-3">
                        {user?.role === 'company_admin' && user?.avatar ? (
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/30 shrink-0 bg-white">
                                <img src={user.avatar} alt="Company Logo" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                                <Sparkles className="w-5 h-5 text-blue-300" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-sm font-black tracking-tight truncate" title={user?.role === 'company_admin' && user?.companyInfo?.companyName ? user.companyInfo.companyName : 'RecruitPro'}>
                                {user?.role === 'company_admin' && user?.companyInfo?.companyName ? user.companyInfo.companyName : 'RecruitPro'}
                            </h2>
                            <p className="text-[11px] text-white/70 capitalize">{(user?.role || 'user').replace('_', ' ')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto bg-slate-50/40">
                <div className="px-3 mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Navigation</p>
                </div>
                {filteredMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative border ${isActive
                                ? 'bg-white text-slate-900 border-slate-200 shadow-sm'
                                : 'text-slate-600 border-transparent hover:bg-white hover:text-slate-900 hover:border-slate-200'
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-semibold tracking-tight">{item.label}</span>
                            {isActive && (
                                <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-5 rounded-full bg-blue-600" />
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-200 bg-white">
                <button
                    onClick={() => navigate(settingsItem.path)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all border ${location.pathname === settingsItem.path
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm font-semibold tracking-tight">{settingsItem.label}</span>
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
            {/* Desktop Sidebar */}
            <div className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col z-20 relative">
                <SidebarContent />
            </div>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        />

                        {/* Sidebar */}
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="lg:hidden fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col shadow-2xl z-50"
                        >
                            <SidebarContent />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-16 lg:h-20 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between z-10">
                    <div className="flex items-center gap-4">
                        <AnimatedMenuIcon
                            isOpen={mobileMenuOpen}
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        />

                        <div className="flex flex-col">
                            <AnimatePresence mode="wait">
                                <motion.h1
                                    key={location.pathname}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-lg lg:text-xl font-black text-slate-900 tracking-tight capitalize"
                                >
                                    {menuItems.find(item => location.pathname.startsWith(item.path))?.label || 'Dashboard'}
                                </motion.h1>
                            </AnimatePresence>
                            <p className="text-[11px] font-semibold text-slate-500 capitalize">{(user?.role || 'user').replace('_', ' ')} workspace</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-4">
                        <div className="relative" ref={notificationRef}>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleToggleNotifications}
                                className="relative hover:bg-slate-100 rounded-xl w-10 h-10 border border-slate-200 bg-white"
                            >
                                <Bell className="w-4 h-4 text-slate-600" />
                                {unreadNotifications > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                    </span>
                                )}
                            </Button>

                            <AnimatePresence>
                                {notificationOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                        className="absolute right-0 mt-2 w-[360px] max-w-[90vw] rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden"
                                    >
                                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">Notifications</p>
                                                <p className="text-xs text-slate-500">Latest communication updates</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                className="h-8 px-2 text-xs font-semibold text-slate-600"
                                                onClick={async () => {
                                                    await fetchNotifications();
                                                    markNotificationsSeen();
                                                }}
                                            >
                                                Refresh
                                            </Button>
                                        </div>

                                        <div className="max-h-[380px] overflow-y-auto">
                                            {notificationsLoading ? (
                                                <div className="px-4 py-8 text-center text-sm text-slate-500">
                                                    Loading notifications...
                                                </div>
                                            ) : notificationsError ? (
                                                <div className="px-4 py-8 text-center">
                                                    <p className="text-sm text-red-600 font-medium">{notificationsError}</p>
                                                </div>
                                            ) : notifications.length === 0 ? (
                                                <div className="px-4 py-8 text-center">
                                                    <MailOpen className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                                                    <p className="text-sm text-slate-500">No notifications yet</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-slate-100">
                                                    {notifications.map((item, index) => {
                                                        const title = item.subject || 'New communication';
                                                        const body = item.content || item.message || 'You have a new update.';
                                                        const status = item.status || 'pending';
                                                        const createdAt = item.sentAt || item.createdAt || item.scheduledFor;
                                                        return (
                                                            <button
                                                                key={item._id || item.id || `${title}-${index}`}
                                                                onClick={() => {
                                                                    setNotificationOpen(false);
                                                                    navigate(getNotificationTargetPath(item));
                                                                }}
                                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                                                        <Mail className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
                                                                            <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0">{status}</span>
                                                                        </div>
                                                                        <p className="text-xs text-slate-600 line-clamp-2 mt-1">{body}</p>
                                                                        <p className="text-[11px] text-slate-400 mt-1 inline-flex items-center gap-1">
                                                                            <Clock3 className="w-3 h-3" />
                                                                            {formatNotificationTime(createdAt)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
                                            <Button
                                                variant="ghost"
                                                className="w-full h-9 text-sm font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                                                onClick={() => {
                                                    setNotificationOpen(false);
                                                    navigate('/communication');
                                                }}
                                            >
                                                Open Message Center
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-slate-900 tracking-tight leading-none">{user?.name || 'Authorized User'}</p>
                                <Badge variant="ghost" className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mt-1 p-0 h-auto hover:bg-transparent">
                                    {user?.role || 'Guest'}
                                </Badge>
                            </div>
                            <Avatar
                                onClick={() => navigate('/profile')}
                                className="w-10 h-10 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                            >
                                {user?.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <AvatarFallback className="bg-slate-900 text-blue-300 font-black text-base">
                                        {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                    </AvatarFallback>
                                )}
                            </Avatar>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onLogout}
                                className="hidden sm:flex hover:bg-red-50 hover:text-red-500 rounded-xl transition-all w-10 h-10 border border-slate-200 hover:border-red-100"
                            >
                                <LogOut className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto relative bg-slate-100">
                    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
