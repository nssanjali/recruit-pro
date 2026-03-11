/**
 * RecruiterCalendar.jsx — Light Glossy Premium Calendar
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion, AnimatePresence } from 'motion/react';
import {
    X, Clock, Users, Video,
    Settings, CheckCircle, Loader2, Calendar,
    ChevronLeft, ChevronRight, Sparkles, BellRing, CalendarDays,
    RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const API = import.meta.env.VITE_API_URL || '/api';
const token = () => localStorage.getItem('token');
const authHdr = () => ({ 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' });
const apiFetch = async (path, opts = {}) => {
    const res = await fetch(`${API}${path}`, { ...opts, headers: { ...authHdr(), ...(opts.headers || {}) } });
    if (!res.ok) { const e = await res.json().catch(() => ({ message: res.statusText })); throw new Error(e.message); }
    return res.json();
};
const normalizeInterviewId = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.startsWith('iv-') ? raw.slice(3) : raw;
};
const CAL_ACCENT = '#4285f4';
const CAL_ACCENT_SOFT = '#e8f0fe';

/* ── Status palette ─────────────────────────────────────────────────────────── */
const STATUS = {
    scheduled: { hex: CAL_ACCENT, soft: CAL_ACCENT_SOFT, textColor: '#1d4ed8', label: 'Scheduled' },
    reschedule_requested: { hex: '#f59e0b', soft: '#fffbeb', textColor: '#b45309', label: 'Reschedule Requested' },
    in_progress: { hex: '#ec4899', soft: '#fce7f3', textColor: '#9d174d', label: 'In Progress' },
    completed: { hex: '#10b981', soft: '#ecfdf5', textColor: '#047857', label: 'Completed' },
    no_show: { hex: '#f97316', soft: '#fff7ed', textColor: '#9a3412', label: 'No Show' },
    cancelled: { hex: '#ef4444', soft: '#fee2e2', textColor: '#991b1b', label: 'Cancelled' },
    rescheduled: { hex: '#f59e0b', soft: '#fffbeb', textColor: '#b45309', label: 'Rescheduled' },
};

/* ── FullCalendar custom CSS — light but premium ────────────────────────────── */
const FC_CSS = `
/* Base */
.rp-cal .fc { font-family: inherit; height: 100%; }
.rp-cal .fc .fc-toolbar { display: none; }

/* Outer border */
.rp-cal .fc .fc-scrollgrid { border: none; border-radius: 0; }
.rp-cal .fc-theme-standard td,
.rp-cal .fc-theme-standard th { border-color: #e2e8f0; }

/* Column headers — frosted strip */
.rp-cal .fc .fc-col-header-cell {
    background: #f8fafc;
    border: none;
    border-bottom: 1px solid #e2e8f0;
    padding: 10px 0;
}
.rp-cal .fc .fc-col-header-cell-cushion {
    font-size: 11px; font-weight: 900; text-transform: uppercase;
    letter-spacing: 0.1em; color: #475569; text-decoration: none;
}

/* Slot rows */
.rp-cal .fc .fc-timegrid-slot        { height: 54px; border-color: #f1f5f9; }
.rp-cal .fc .fc-timegrid-slot-minor  { border-color: #f8fafc; }
.rp-cal .fc .fc-timegrid-slot-label-cushion {
    font-size: 10px; font-weight: 800; color: #64748b;
    text-transform: uppercase; letter-spacing: 0.05em;
}
.rp-cal .fc .fc-timegrid-axis { background: #f8fafc; }

/* Day cells */
.rp-cal .fc .fc-day { background: #ffffff; }
.rp-cal .fc .fc-day-today {
    background: #eff6ff !important;
}
.rp-cal .fc .fc-daygrid-day { background: #ffffff; }

/* Day numbers */
.rp-cal .fc .fc-daygrid-day-number {
    font-weight: 900; font-size: 13px; color: #64748b;
    text-decoration: none; padding: 8px 10px;
}
.rp-cal .fc .fc-day-today .fc-daygrid-day-number {
    background: ${CAL_ACCENT};
    color: white; border-radius: 10px; padding: 4px 10px;
    
}

/* Events — glossy pill look */
.rp-cal .fc .fc-event {
    border-radius: 8px;
    border: none;
    padding: 4px 8px;
    font-weight: 800;
    font-size: 11px;
    cursor: pointer;
    transition: filter 0.15s ease;
}
.rp-cal .fc .fc-event:hover {
    filter: brightness(1.05);
}
.rp-cal .fc .fc-event-title  { font-weight: 900; letter-spacing: -0.01em; }
.rp-cal .fc .fc-event-time   { opacity: 0.82; font-weight: 700; font-size: 10px; }
.rp-cal .fc .fc-daygrid-event { border-radius: 8px; }

/* "more" link */
.rp-cal .fc .fc-daygrid-more-link {
    font-size: 10px; font-weight: 900; color: #4338ca;
    background: ${CAL_ACCENT_SOFT}; border-radius: 6px; padding: 2px 7px;
}

/* now indicator */
.rp-cal .fc .fc-now-indicator-line {
    border-color: ${CAL_ACCENT}; border-width: 2px;
}
.rp-cal .fc .fc-now-indicator-arrow {
    border-top-color: ${CAL_ACCENT}; border-bottom-color: ${CAL_ACCENT};
}

/* Scrollbar */
.rp-cal .fc-scroller::-webkit-scrollbar        { width: 5px; }
.rp-cal .fc-scroller::-webkit-scrollbar-track  { background: transparent; }
.rp-cal .fc-scroller::-webkit-scrollbar-thumb  { background: #e2e8f0; border-radius: 99px; }
`;

/* ── Glassmorphism card wrapper ─────────────────────────────────────────────── */
const Glass = ({ children, className = '', style = {} }) => (
    <div
        className={`rounded-2xl overflow-hidden ${className}`}
        style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
            ...style
        }}
    >
        {children}
    </div>
);

/* ── Upcoming card ──────────────────────────────────────────────────────────── */
function UpcomingCard({ iv, onClick }) {
    const status = iv.status || 'scheduled';
    const cfg = STATUS[status] || STATUS.scheduled;
    const dateStr = iv.start || iv.scheduledAt || iv.date;
    const d = new Date(dateStr);
    const isToday = new Date().toDateString() === d.toDateString();
    const isTomorrow = new Date(Date.now() + 86400000).toDateString() === d.toDateString();
    const tag = isToday ? 'Today' : isTomorrow ? 'Tomorrow'
        : d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <motion.button
            whileHover={{ x: 3, backgroundColor: `${cfg.hex}08` }}
            onClick={onClick}
            className="w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all group"
        >
            <div className="w-11 h-11 rounded-xl flex-shrink-0 flex flex-col items-center justify-center"
                style={{ background: cfg.soft, border: `1.5px solid ${cfg.hex}30` }}>
                <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: cfg.hex }}>
                    {d.toLocaleDateString('en-IN', { month: 'short' })}
                </span>
                <span className="text-base font-black leading-none" style={{ color: cfg.hex }}>{d.getDate()}</span>
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">{iv.title || iv.candidateName || 'Candidate'}</p>
                <p className="text-xs text-slate-600 truncate">{iv.detail?.jobTitle || iv.jobTitle || ''}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.hex }} />
                    <span className="text-[10px] font-black text-slate-700">{tag}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-[10px] font-bold text-slate-600">
                        {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
        </motion.button>
    );
}

/* ── Detail Drawer ──────────────────────────────────────────────────────────── */
function InterviewDrawer({ interview, onClose, onAttendanceMarked }) {
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    if (!interview) return null;
    const status = interview.status || 'scheduled';
    const cfg = STATUS[status] || STATUS.scheduled;
    const startDate = interview.start || interview.scheduledAt || interview.date;
    const endDate = interview.end || interview.endDate || interview.endsAt;
    const start = new Date(startDate);
    const end = new Date(endDate || new Date(start.getTime() + 2 * 60 * 60 * 1000));
    const fmtTime = d => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const fmtDate = d => d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const canMarkAttendance = ['scheduled', 'in_progress', 'rescheduled'].includes(status);

    const markAttendance = async (attendanceStatus) => {
        const interviewId = normalizeInterviewId(interview._id || interview.id);
        if (!interviewId) {
            toast.error('Interview ID missing');
            return;
        }

        setAttendanceLoading(true);
        try {
            const response = await apiFetch(`/interviews/${interviewId}/attendance`, {
                method: 'POST',
                body: JSON.stringify({ attendanceStatus })
            });
            const updated = response?.data?.interview;
            if (updated) {
                onAttendanceMarked?.(updated);
            }
            toast.success(attendanceStatus === 'present' ? 'Marked as attended' : 'Marked as no-show');
            onClose();
        } catch (error) {
            toast.error(error.message || 'Failed to mark attendance');
        } finally {
            setAttendanceLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-slate-900/30" onClick={onClose} />

            <motion.aside key="dr"
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                className="fixed right-0 top-0 h-full w-full max-w-[420px] z-50 flex flex-col"
                style={{
                    background: '#ffffff',
                    borderLeft: '1px solid #e2e8f0',
                    boxShadow: '-8px 0 32px rgba(15,23,42,0.08)'
                }}
            >
                {/* Gradient header */}
                <div className="relative overflow-hidden p-7 pb-8"
                    style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>

                    <button onClick={onClose}
                        className="absolute top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: `${cfg.hex}15`, border: `1px solid ${cfg.hex}25` }}>
                        <X className="w-4 h-4" style={{ color: cfg.hex }} />
                    </button>

                    <div className="relative">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4"
                            style={{ background: `${cfg.hex}15`, border: `1px solid ${cfg.hex}30` }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.hex }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: cfg.textColor }}>
                                {cfg.label}
                            </span>
                        </div>
                        <h2 className="text-slate-900 font-black text-2xl leading-tight tracking-tight">
                            {interview.title || interview.candidateName || 'Interview'}
                        </h2>
                        <p className="text-slate-700 text-sm mt-1 font-semibold">{interview.detail?.jobTitle || interview.jobTitle || 'Position'}</p>
                        {(interview.detail?.jobDepartment || interview.jobDepartment) && <p className="text-slate-600 text-xs mt-0.5">{interview.detail?.jobDepartment || interview.jobDepartment}</p>}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">

                    {/* Date / Time */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { icon: CalendarDays, label: 'Date', value: fmtDate(start), sub: null },
                            { icon: Clock, label: 'Time', value: fmtTime(start), sub: `→ ${fmtTime(end)}` }
                        ].map(({ icon: Icon, label, value, sub }) => (
                            <div key={label} className="rounded-2xl p-4"
                                style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0'
                                }}>
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Icon className="w-3 h-3" /> {label}
                                </p>
                                <p className="text-sm font-black text-slate-900 leading-snug">{value}</p>
                                {sub && <p className="text-[11px] text-slate-700 mt-0.5 font-bold">{sub}</p>}
                            </div>
                        ))}
                    </div>

                    {/* Duration */}
                    <div className="rounded-2xl p-4 flex items-center gap-3"
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: cfg.soft }}>
                            <Clock className="w-5 h-5" style={{ color: cfg.hex }} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Duration</p>
                            <p className="text-sm font-black text-slate-900">{interview.detail?.duration || interview.duration || 120} minutes</p>
                        </div>
                    </div>

                    {/* Candidate */}
                    {(interview.candidateEmail || interview.detail?.candidateEmail) && (
                        <div className="rounded-2xl p-4 flex items-center gap-3"
                            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: cfg.soft }}>
                                <Users className="w-5 h-5" style={{ color: cfg.hex }} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Candidate</p>
                                <p className="text-sm font-black text-slate-900">{interview.title || interview.candidateName || 'Candidate'}</p>
                                <p className="text-xs text-slate-700 truncate">{interview.detail?.candidateEmail || interview.candidateEmail || ''}</p>
                            </div>
                        </div>
                    )}

                    {/* Meet link */}
                    {(interview.meetingLink || interview.detail?.meetingLink) && (
                        <div className="rounded-2xl p-4"
                            style={{ background: cfg.soft, border: `1.5px solid ${cfg.hex}30` }}>
                            <p className="text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5"
                                style={{ color: cfg.textColor }}>
                                <Video className="w-3 h-3" /> Google Meet
                            </p>
                            <a href={interview.meetingLink || interview.detail?.meetingLink} target="_blank" rel="noreferrer"
                                className="text-xs font-bold truncate block hover:underline"
                                style={{ color: cfg.hex }}>
                                {interview.meetingLink || interview.detail?.meetingLink}
                            </a>
                        </div>
                    )}

                    {(interview.autoScheduled || interview.detail?.autoScheduled) && (
                        <div className="rounded-2xl p-3 flex items-center gap-2.5"
                            style={{ background: '#f5f3ff', border: '1.5px solid #c4b5fd' }}>
                            <Sparkles className="w-4 h-4 text-[#4285f4] flex-shrink-0" />
                            <p className="text-xs font-black text-[#1d4ed8]">Auto-scheduled by RecruitPro AI</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 space-y-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                    {canMarkAttendance && (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => markAttendance('present')}
                                disabled={attendanceLoading}
                                className="py-2.5 rounded-xl font-black text-white text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                            >
                                Mark Attended
                            </button>
                            <button
                                onClick={() => markAttendance('absent')}
                                disabled={attendanceLoading}
                                className="py-2.5 rounded-xl font-black text-white text-xs bg-orange-600 hover:bg-orange-700 disabled:opacity-60 transition-colors"
                            >
                                Mark No-Show
                            </button>
                        </div>
                    )}
                    {interview.meetingLink && (
                        <a href={interview.meetingLink} target="_blank" rel="noreferrer">
                            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                className="w-full py-3.5 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2"
                                style={{ background: cfg.hex }}>
                                <Video className="w-4 h-4" /> Join Meeting
                            </motion.button>
                        </a>
                    )}
                    <button onClick={onClose}
                        className="w-full py-3 rounded-2xl font-black text-slate-500 text-sm border border-slate-200 hover:bg-slate-50 transition-colors">
                        Close
                    </button>
                </div>
            </motion.aside>
        </AnimatePresence>
    );
}

/* ── Settings Panel ─────────────────────────────────────────────────────────── */
function SchedulingSettings({ onClose }) {
    const [settings, setSettings] = useState(null);
    const [saving, setSaving] = useState(false);
    const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    useEffect(() => {
        apiFetch('/calendar/settings').then(setSettings).catch(() => toast.error('Failed to load'));
    }, []);

    const save = async () => {
        setSaving(true);
        try { await apiFetch('/calendar/settings', { method: 'PUT', body: JSON.stringify(settings) }); toast.success('Saved!'); onClose(); }
        catch { toast.error('Failed to save'); }
        finally { setSaving(false); }
    };

    if (!settings) return (
        <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
    );

    return (
        <div className="space-y-3 text-sm">
            {DAYS.map(day => {
                const d = settings.workingHours?.[day] || {};
                return (
                    <div key={day} className="flex items-center gap-3">
                        <button
                            onClick={() => setSettings(s => ({ ...s, workingHours: { ...s.workingHours, [day]: { ...d, enabled: !d.enabled } } }))}
                            className={`relative w-9 h-5 rounded-full transition-all flex-shrink-0 ${d.enabled ? 'bg-[#4285f4]' : 'bg-slate-200'}`}
                            style={{ boxShadow: d.enabled ? '0 2px 8px rgba(99,102,241,0.4)' : 'none' }}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${d.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                        <span className="text-xs font-black text-slate-700 capitalize w-8">{day.slice(0, 3)}</span>
                        {d.enabled ? (
                            <div className="flex items-center gap-2 flex-1">
                                <input type="time" value={d.start || '09:00'}
                                    onChange={e => setSettings(s => ({ ...s, workingHours: { ...s.workingHours, [day]: { ...d, start: e.target.value } } }))}
                                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 bg-white focus:border-[#4285f4] focus:outline-none flex-1" />
                                <span className="text-slate-300 text-xs">→</span>
                                <input type="time" value={d.end || '18:00'}
                                    onChange={e => setSettings(s => ({ ...s, workingHours: { ...s.workingHours, [day]: { ...d, end: e.target.value } } }))}
                                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 bg-white focus:border-[#4285f4] focus:outline-none flex-1" />
                            </div>
                        ) : <span className="text-xs text-slate-600 font-bold">Off</span>}
                    </div>
                );
            })}

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                {[{ label: 'Max/Day', key: 'maxInterviewsPerDay' }, { label: 'Duration', key: 'interviewDuration' }, { label: 'Buffer', key: 'bufferMinutes' }]
                    .map(({ label, key }) => (
                        <div key={key} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">{label}</label>
                            <input type="number" value={settings[key] ?? 0}
                                onChange={e => setSettings(s => ({ ...s, [key]: Number(e.target.value) }))}
                                className="w-full bg-transparent text-lg font-black text-slate-900 focus:outline-none" />
                        </div>
                    ))}
            </div>

            <div className="pt-3 border-t border-slate-100">
                {settings.googleConnected ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 mb-3">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs font-black">Google Calendar Connected</span>
                    </div>
                ) : (
                    <button type="button" onClick={async () => {
                        try {
                            const res = await apiFetch('/calendar/auth');
                            if (res.url) window.location.href = res.url;
                        } catch { toast.error('Failed to get auth URL'); }
                    }}
                        className="w-full py-3 rounded-xl font-black text-slate-700 text-xs flex items-center justify-center gap-2 mb-3 bg-white border border-slate-200 hover:shadow-sm transition-all hover:bg-slate-50">
                        <Video className="w-4 h-4 text-rose-500" />
                        Connect Google Schedule & Meet
                    </button>
                )}
            </div>

            <button onClick={save} disabled={saving}
                className="w-full py-3 rounded-xl font-black text-white text-xs flex items-center justify-center gap-2 transition-all"
                style={{ background: '#4285f4' }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save Availability
            </button>
        </div>
    );
}

/* ── Main ────────────────────────────────────────────────────────────────────── */
export function RecruiterCalendar() {
    const calRef = useRef(null);
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [viewTitle, setViewTitle] = useState('');
    const [activeView, setActiveView] = useState('timeGridWeek');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch('/calendar/data/recruiter');
            setInterviews(data.events || []);
        } catch { toast.error('Failed to load calendar'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchData();
        const params = new URLSearchParams(window.location.search);
        if (params.get('calendar_connected') === 'true') {
            toast.success('Successfully connected Google Calendar!');
            window.history.replaceState({}, document.title, window.location.pathname);
            setShowSettings(true);
        }
    }, [fetchData]);

    useEffect(() => {
        if (!interviews.length) return;
        const params = new URLSearchParams(window.location.search);
        const interviewId = params.get('interview');
        if (!interviewId) return;
        const normalizedId = normalizeInterviewId(interviewId);
        const match = interviews.find((iv) => {
            const id = normalizeInterviewId(iv.id || iv._id);
            return id === normalizedId;
        });
        if (match) {
            setSelected(match);
            const date = match.start || match.scheduledAt || match.date;
            if (date && calRef.current?.getApi) {
                calRef.current.getApi().gotoDate(date);
            }
        }
    }, [interviews]);

    const now = new Date();
    const today = interviews.filter(iv => {
        const date = iv.start || iv.scheduledAt || iv.date;
        return date && new Date(date).toDateString() === now.toDateString();
    });
    const upcoming = interviews
        .filter(iv => {
            const date = iv.start || iv.scheduledAt || iv.date;
            const status = iv.status || 'scheduled';
            return date && new Date(date) > now && status === 'scheduled';
        })
        .sort((a, b) => new Date(a.start || a.scheduledAt || a.date) - new Date(b.start || b.scheduledAt || b.date)).slice(0, 5);
    const done = interviews.filter(iv => (iv.status || 'scheduled') === 'completed').length;
    const handleAttendanceMarked = (updatedInterview) => {
        const updatedId = normalizeInterviewId(updatedInterview?._id || updatedInterview?.id);
        if (!updatedId) return;

        setInterviews((prev) => prev.map((iv) => {
            const id = normalizeInterviewId(iv._id || iv.id);
            return id === updatedId
                ? { ...iv, ...updatedInterview, id: iv.id || `iv-${updatedId}`, _id: updatedId }
                : iv;
        }));
        setSelected((prev) => {
            if (!prev) return prev;
            const id = normalizeInterviewId(prev._id || prev.id);
            return id === updatedId
                ? { ...prev, ...updatedInterview, id: prev.id || `iv-${updatedId}`, _id: updatedId }
                : prev;
        });
    };

    const calEvents = interviews.map(iv => {
        // Handle both formats: calendar event format and legacy interview format
        const status = iv.status || 'scheduled';
        const cfg = STATUS[status] || STATUS.scheduled;
        const startDate = iv.start || iv.scheduledAt || iv.date;
        const endDate = iv.end || iv.endDate || iv.endsAt || new Date(new Date(startDate).getTime() + 2 * 60 * 60 * 1000).toISOString();
        const title = iv.title || iv.candidateName || 'Interview';

        return {
            id: iv.id || iv._id,
            title: title,
            start: startDate,
            end: endDate,
            backgroundColor: cfg.hex,
            borderColor: 'transparent',
            textColor: '#fff',
            extendedProps: iv
        };
    });

    const calApi = () => calRef.current?.getApi();
    const nav = fn => { calApi()?.[fn](); setViewTitle(calApi()?.view.title || ''); };
    const changeView = v => { setActiveView(v); calApi()?.changeView(v); setViewTitle(calApi()?.view.title || ''); };

    return (
        <div className="flex flex-col xl:flex-row gap-4" style={{ minHeight: 'calc(100vh - 140px)' }}>
            <style>{FC_CSS}</style>

            {/* ── Sidebar ─────────────────────────────────────────────── */}
            <div className="flex-shrink-0 space-y-4 xl:w-[292px] w-full">

                {/* Hero stats card */}
                <div className="relative overflow-hidden rounded-3xl p-6"
                    style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(15,23,42,0.06)'
                    }}>
                    <div className="relative">
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-black text-slate-900 text-sm leading-none">My Calendar</p>
                                <p className="text-slate-500 text-[10px] mt-0.5 font-semibold">Interview Schedule</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {[
                                { val: today.length, label: 'Today' },
                                { val: upcoming.length, label: 'Upcoming' },
                                { val: done, label: 'Done' }
                            ].map(({ val, label }) => (
                                <div key={label} className="flex-1 rounded-2xl py-3 text-center"
                                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <p className="text-xl font-black text-slate-900">{val}</p>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>



                {/* Legend */}
                <Glass>
                    <div className="p-4">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.18em] mb-3">Status Legend</p>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                            {Object.entries(STATUS).map(([, cfg]) => (
                                <div key={cfg.label} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ background: cfg.hex }} />
                                    <span className="text-xs font-bold text-slate-700">{cfg.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Glass>

                {/* Upcoming */}
                <Glass>
                    <div className="px-4 pt-4 pb-1 flex items-center justify-between">
                        <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                            <BellRing className="w-3.5 h-3.5 text-[#4285f4]" /> Upcoming
                        </p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
                            style={{ background: CAL_ACCENT_SOFT, color: '#1d4ed8' }}>
                            {upcoming.length}
                        </span>
                    </div>
                    {upcoming.length === 0 ? (
                        <div className="py-10 text-center">
                            <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-600">No upcoming interviews</p>
                        </div>
                    ) : (
                        <div className="py-2 px-1">
                            {upcoming.map(iv => <UpcomingCard key={iv._id} iv={iv} onClick={() => setSelected(iv)} />)}
                        </div>
                    )}
                </Glass>

                {/* Availability settings */}
                <Glass>
                    <button onClick={() => setShowSettings(!showSettings)}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/80 transition-all rounded-2xl">
                        <span className="flex items-center gap-2 text-xs font-black text-slate-700">
                            <Settings className="w-3.5 h-3.5 text-slate-600" /> Availability Settings
                        </span>
                        <motion.div animate={{ rotate: showSettings ? 90 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                        </motion.div>
                    </button>
                    <AnimatePresence>
                        {showSettings && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-100">
                                <div className="p-4">
                                    <SchedulingSettings onClose={() => setShowSettings(false)} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Glass>
            </div>

            {/* ── Main Calendar Area ───────────────────────────────────── */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">

                {/* Custom toolbar */}
                <Glass className="px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        {[['prev', ChevronLeft], ['next', ChevronRight]].map(([fn, Icon]) => (
                            <motion.button key={fn} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => nav(fn)}
                                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:border-slate-300 flex items-center justify-center transition-all">
                                <Icon className="w-4 h-4 text-slate-500" />
                            </motion.button>
                        ))}
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={() => nav('today')}
                            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-black text-slate-700 transition-all">
                            Today
                        </motion.button>
                        <h2 className="text-base font-black text-slate-900 ml-2 tracking-tight">{viewTitle}</h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <motion.button whileHover={{ rotate: 180 }} transition={{ duration: 0.4 }}
                            onClick={fetchData}
                            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:border-slate-300 transition-all">
                            <RefreshCw className="w-4 h-4 text-slate-400" />
                        </motion.button>

                        {/* View switcher */}
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100">
                            {[
                                ['dayGridMonth', 'Month'],
                                ['timeGridWeek', 'Week'],
                                ['timeGridDay', 'Day']
                            ].map(([v, label]) => (
                                <motion.button key={v} whileTap={{ scale: 0.95 }}
                                    onClick={() => changeView(v)}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all"
                                    style={activeView === v ? {
                                        background: '#ffffff',
                                        color: '#0f172a',
                                        border: '1px solid #cbd5e1'
                                    } : { color: '#64748b' }}>
                                    {label}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </Glass>

                {/* Calendar */}
                <div className="flex-1 rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm"
                    style={{ minHeight: '560px' }}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: '520px' }}>
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-100 border border-slate-200">
                                <Loader2 className="w-8 h-8 text-[#4285f4] animate-spin" />
                            </div>
                            <p className="text-sm font-bold text-slate-600">Loading your schedule…</p>
                        </div>
                    ) : (
                        <div className="rp-cal p-5 h-full">
                            <FullCalendar
                                ref={calRef}
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                initialView="timeGridWeek"
                                headerToolbar={false}
                                events={calEvents}
                                eventClick={({ event }) => setSelected(event.extendedProps)}
                                slotMinTime="07:00:00"
                                slotMaxTime="21:00:00"
                                allDaySlot={false}
                                height="100%"
                                nowIndicator={true}
                                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: true }}
                                dayMaxEvents={3}
                                datesSet={({ view }) => setViewTitle(view.title)}
                                eventDidMount={info => {
                                    info.el.title = info.event.title;
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <InterviewDrawer
                interview={selected}
                onClose={() => setSelected(null)}
                onAttendanceMarked={handleAttendanceMarked}
            />
        </div>
    );
}

export default RecruiterCalendar;
