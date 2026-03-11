/**
 * AdminCalendar.jsx — Light Glossy Calendar for Company Admins
 * Shows: job postings, application cutoff deadlines, interviews across all jobs
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion, AnimatePresence } from 'motion/react';
import {
    X, Clock, Video, Loader2, Calendar, ChevronLeft, ChevronRight,
    BellRing, RefreshCw, AlertCircle, Briefcase, Users,
    MapPin, TrendingUp, CalendarDays, Building
} from 'lucide-react';
import { toast } from 'sonner';

const API = 'http://localhost:5000/api';
const token = () => localStorage.getItem('token');
const authHdr = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });
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

/* ── Event type config ── */
const TYPE = {
    job_posted: { hex: '#059669', soft: '#d1fae5', text: '#065f46', label: 'Job Posted', icon: Briefcase },
    cutoff: { hex: '#dc2626', soft: '#fee2e2', text: '#7f1d1d', label: 'Cutoff Date', icon: AlertCircle },
    interview: { hex: CAL_ACCENT, soft: CAL_ACCENT_SOFT, text: '#1d4ed8', label: 'Interview', icon: Users },
};
const STATUS_COLOR = {
    scheduled: CAL_ACCENT,
    in_progress: CAL_ACCENT,
    completed: '#10b981',
    cancelled: '#f43f5e',
    rescheduled: '#f59e0b',
};

const FC_CSS = `
.rp-cal .fc { font-family: inherit; height: 100%; }
.rp-cal .fc .fc-toolbar { display: none; }
.rp-cal .fc .fc-scrollgrid { border: none; }
.rp-cal .fc-theme-standard td, .rp-cal .fc-theme-standard th { border-color: #e2e8f0; }
.rp-cal .fc .fc-col-header-cell {
    background: #f8fafc;
    border: none; border-bottom: 1px solid #e2e8f0; padding: 10px 0;
}
.rp-cal .fc .fc-col-header-cell-cushion {
    font-size: 11px; font-weight: 900; text-transform: uppercase;
    letter-spacing: 0.1em; color: #475569; text-decoration: none;
}
.rp-cal .fc .fc-timegrid-slot { height: 54px; border-color: #f1f5f9; }
.rp-cal .fc .fc-timegrid-slot-minor { border-color: #f8fafc; }
.rp-cal .fc .fc-timegrid-slot-label-cushion { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; }
.rp-cal .fc .fc-timegrid-axis { background: #f8fafc; }
.rp-cal .fc .fc-day { background: #fff; }
.rp-cal .fc .fc-day-today { background: #eff6ff !important; }
.rp-cal .fc .fc-daygrid-day { background: #fff; }
.rp-cal .fc .fc-daygrid-day-number { font-weight: 900; font-size: 13px; color: #64748b; text-decoration: none; padding: 8px 10px; }
.rp-cal .fc .fc-day-today .fc-daygrid-day-number {
    background: ${CAL_ACCENT}; color: white;
    border-radius: 10px; padding: 4px 10px;
}
.rp-cal .fc .fc-event {
    border-radius: 8px; border: none; padding: 4px 8px;
    font-weight: 800; font-size: 11px; cursor: pointer;
    transition: filter .15s;
}
.rp-cal .fc .fc-event:hover { filter: brightness(1.05); }
.rp-cal .fc .fc-event-title { font-weight: 900; }
.rp-cal .fc .fc-daygrid-event { border-radius: 8px; }
.rp-cal .fc .fc-daygrid-more-link { font-size: 10px; font-weight: 900; color: #1d4ed8; background: ${CAL_ACCENT_SOFT}; border-radius: 6px; padding: 2px 7px; }
.rp-cal .fc .fc-now-indicator-line { border-color: ${CAL_ACCENT}; border-width: 2px; }
.rp-cal .fc .fc-now-indicator-arrow { border-top-color: ${CAL_ACCENT}; border-bottom-color: ${CAL_ACCENT}; }
.rp-cal .fc-scroller::-webkit-scrollbar { width: 5px; }
.rp-cal .fc-scroller::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
`;

const Glass = ({ children, className = '', style = {} }) => (
    <div className={`rounded-2xl overflow-hidden ${className}`} style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06)', ...style
    }}>
        {children}
    </div>
);

/* ── Detail Drawer ── */
function EventDrawer({ event, onClose }) {
    if (!event) return null;
    const cfg = TYPE[event.type] || TYPE.job_posted;
    const Icon = cfg.icon;
    const d = event.detail;
    const fmtDate = s => s ? new Date(s).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    const fmtTime = s => s ? new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        applicationCutoffDate: d.cutoff ? new Date(d.cutoff).toISOString().split('T')[0] : '',
        requiredApplications: d.required || '',
        status: d.status || 'open'
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`http://localhost:5000/api/jobs/${event.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    applicationCutoffDate: formData.applicationCutoffDate ? new Date(formData.applicationCutoffDate) : null,
                    requiredApplications: formData.requiredApplications ? parseInt(formData.requiredApplications) : null,
                    status: formData.status
                })
            });
            if (response.ok) {
                toast.success('Job updated successfully!');
                setIsEditing(false);
                onClose();
                // Trigger refresh
                window.location.reload();
            } else {
                toast.error('Failed to update job');
            }
        } catch (err) {
            toast.error('Error updating job: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-slate-900/30" onClick={onClose} />
            <motion.aside key="dr"
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                className="fixed right-0 top-0 h-full w-full max-w-[400px] z-50 flex flex-col"
                style={{
                    background: '#ffffff',
                    borderLeft: '1px solid #e2e8f0',
                    boxShadow: '-8px 0 32px rgba(15,23,42,0.08)'
                }}>
                <div className="relative overflow-hidden p-7 pb-6"
                    style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <button onClick={onClose}
                        className="absolute top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: `${cfg.hex}15`, border: `1px solid ${cfg.hex}25` }}>
                        <X className="w-4 h-4" style={{ color: cfg.hex }} />
                    </button>
                    <div className="relative">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3"
                            style={{ background: `${cfg.hex}15`, border: `1px solid ${cfg.hex}30` }}>
                            <Icon className="w-3 h-3" style={{ color: cfg.hex }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: cfg.text }}>{cfg.label}</span>
                        </div>
                        <h2 className="text-slate-900 font-black text-xl leading-tight">{event.title}</h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {event.type === 'job_posted' && (
                        <>
                            {d.department && <InfoRow icon={Building} label="Department" value={d.department} cfg={cfg} />}
                            {d.location && <InfoRow icon={MapPin} label="Location" value={d.location} cfg={cfg} />}
                            <InfoRow icon={TrendingUp} label="Status" value={d.status || '—'} cfg={cfg}
                                valueStyle={{ color: d.status === 'open' ? '#10b981' : '#64748b', textTransform: 'capitalize' }} />
                            <InfoRow icon={CalendarDays} label="Posted On" value={fmtDate(event.date)} cfg={cfg} />
                        </>
                    )}

                    {event.type === 'cutoff' && (
                        <>
                            <InfoRow icon={AlertCircle} label="Deadline" value={fmtDate(d.cutoff)} cfg={cfg} />
                            {d.required && <InfoRow icon={Users} label="Required Applications" value={d.required} cfg={cfg} />}
                            {d.schedulingStatus && (
                                <InfoRow icon={TrendingUp} label="Scheduling" value={d.schedulingStatus.replace(/_/g, ' ')} cfg={cfg}
                                valueStyle={{ textTransform: 'capitalize', color: d.schedulingStatus === 'completed' ? '#10b981' : CAL_ACCENT }} />
                            )}
                        </>
                    )}

                    {event.type === 'interview' && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <InfoBlock icon={CalendarDays} label="Date" value={fmtDate(d.scheduledAt)} cfg={cfg} />
                                <InfoBlock icon={Clock} label="Time" value={fmtTime(d.scheduledAt)} sub={d.endsAt ? `→ ${fmtTime(d.endsAt)}` : ''} cfg={cfg} />
                            </div>
                            {d.candidateName && <InfoRow icon={Users} label="Candidate" value={d.candidateName} cfg={cfg} />}
                            {d.recruiterName && <InfoRow icon={Users} label="Recruiter" value={d.recruiterName} cfg={cfg} />}
                            {d.status && (
                                <InfoRow icon={TrendingUp} label="Status" value={d.status.replace(/_/g, ' ')} cfg={cfg}
                                    valueStyle={{ color: STATUS_COLOR[d.status] || '#64748b', textTransform: 'capitalize' }} />
                            )}
                            {d.meetingLink && (
                                <div className="rounded-2xl p-4" style={{ background: cfg.soft, border: `1.5px solid ${cfg.hex}30` }}>
                                    <p className="text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5"
                                        style={{ color: cfg.text }}><Video className="w-3 h-3" /> Meet Link</p>
                                    <a href={d.meetingLink} target="_blank" rel="noreferrer"
                                        className="text-xs font-bold block truncate hover:underline" style={{ color: cfg.hex }}>
                                        {d.meetingLink}
                                    </a>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {isEditing && event.type === 'job_posted' && (
                    <div className="p-6 space-y-4 border-t border-slate-200">
                        <div>
                            <label className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 block">Application Cutoff Date</label>
                            <input type="date" value={formData.applicationCutoffDate} onChange={e => setFormData({...formData, applicationCutoffDate: e.target.value})}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#4285f4]" />
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 block">Required Applications (Quota)</label>
                            <input type="number" value={formData.requiredApplications} onChange={e => setFormData({...formData, requiredApplications: e.target.value})}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#4285f4]" />
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 block">Job Status</label>
                            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#4285f4]">
                                <option value="open">Open</option>
                                <option value="closed">Closed</option>
                                <option value="filled">Filled</option>
                            </select>
                        </div>
                    </div>
                )}

                <div className="p-6" style={{ borderTop: '1px solid #f1f5f9' }}>
                    {!isEditing ? (
                        <div className="flex gap-3">
                            {event.type === 'job_posted' && (
                                <button onClick={() => setIsEditing(true)}
                                    className="flex-1 py-3 rounded-2xl font-black text-white text-sm transition-all hover:scale-105"
                                    style={{ background: cfg.hex }}>
                                    ✎ Edit Details
                                </button>
                            )}
                            <button onClick={onClose}
                                className="flex-1 py-3 rounded-2xl font-black text-slate-600 text-sm border border-slate-200 hover:bg-slate-50 transition-colors">
                                Close
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <button onClick={handleSave} disabled={isSaving}
                                className="flex-1 py-3 rounded-2xl font-black text-white text-sm transition-all hover:scale-105 disabled:opacity-50"
                                style={{ background: cfg.hex }}>
                                {isSaving ? 'Saving...' : '💾 Save'}
                            </button>
                            <button onClick={() => setIsEditing(false)}
                                className="flex-1 py-3 rounded-2xl font-black text-slate-600 text-sm border border-slate-200 hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </motion.aside>
        </AnimatePresence>
    );
}

function InfoRow({ icon: Icon, label, value, cfg, valueStyle = {} }) {
    return (
        <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.soft }}>
                <Icon className="w-4 h-4" style={{ color: cfg.hex }} />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-black text-slate-800" style={valueStyle}>{value}</p>
            </div>
        </div>
    );
}
function InfoBlock({ icon: Icon, label, value, sub, cfg }) {
    return (
        <div className="rounded-2xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Icon className="w-3 h-3" />{label}
            </p>
            <p className="text-sm font-black text-slate-800 leading-snug">{value}</p>
            {sub && <p className="text-[11px] text-slate-700 mt-0.5 font-bold">{sub}</p>}
        </div>
    );
}

/* ── Main ── */
export function AdminCalendar() {
    const calRef = useRef(null);
    const [events, setEvents] = useState([]);
    const [stats, setStats] = useState({ totalJobs: 0, totalInterviews: 0 });
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [viewTitle, setViewTitle] = useState('');
    const [activeView, setActiveView] = useState('dayGridMonth');
    const [filter, setFilter] = useState('all'); // 'all' | 'job_posted' | 'cutoff' | 'interview'

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { events: evts, stats: s } = await apiFetch('/calendar/data/admin');
            setEvents(evts || []);
            setStats(s || { totalJobs: 0, totalInterviews: 0 });
        } catch { toast.error('Failed to load admin calendar'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!events.length) return;
        const params = new URLSearchParams(window.location.search);
        const interviewId = params.get('interview');
        if (!interviewId) return;
        const normalizedId = normalizeInterviewId(interviewId);
        const match = events.find((ev) => {
            if (ev.type !== 'interview') return false;
            return normalizeInterviewId(ev.id) === normalizedId;
        });
        if (match) {
            setSelected(match);
            if (match.date && calRef.current?.getApi) {
                calRef.current.getApi().gotoDate(match.date);
            }
        }
    }, [events]);

    const now = new Date();
    const upcoming = events
        .filter(e => new Date(e.date) > now)
        .sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6);

    const counts = {
        job_posted: events.filter(e => e.type === 'job_posted').length,
        cutoff: events.filter(e => e.type === 'cutoff').length,
        interview: events.filter(e => e.type === 'interview').length,
    };

    const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);

    const calEvents = filtered.map(ev => {
        const cfg = TYPE[ev.type] || TYPE.job_posted;
        const color = ev.type === 'interview' ? (STATUS_COLOR[ev.status] || cfg.hex) : cfg.hex;
        return {
            id: ev.id,
            title: ev.title,
            start: ev.date,
            end: ev.endDate || undefined,
            allDay: ev.allDay,
            backgroundColor: color,
            borderColor: 'transparent',
            textColor: '#fff',
            extendedProps: ev
        };
    });

    const calApi = () => calRef.current?.getApi();
    const nav = fn => { calApi()?.[fn](); setViewTitle(calApi()?.view.title || ''); };
    const changeView = v => { setActiveView(v); calApi()?.changeView(v); setViewTitle(calApi()?.view.title || ''); };

const filterBtnClass = (f) => ({
        padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 900,
        cursor: 'pointer', transition: 'all .15s', border: 'none',
        ...(filter === f
            ? { background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }
            : { background: 'transparent', color: '#64748b' })
    });

    return (
        <div className="flex flex-col xl:flex-row gap-4" style={{ minHeight: 'calc(100vh - 140px)' }}>
            <style>{FC_CSS}</style>

            {/* Sidebar */}
            <div className="flex-shrink-0 space-y-4 xl:w-[285px] w-full">

                {/* Hero */}
                <div className="relative overflow-hidden rounded-3xl p-6"
                    style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                    <div className="relative">
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="w-10 h-10 rounded-2xl bg-[#e8f0fe] flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-[#4285f4]" />
                            </div>
                            <div>
                                <p className="font-black text-slate-900 text-sm leading-none">Hiring Timeline</p>
                                <p className="text-slate-500 text-[10px] mt-0.5 font-semibold">Jobs & Interviews</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {[
                                { val: stats.totalJobs, label: 'Jobs' },
                                { val: counts.cutoff, label: 'Cutoffs' },
                                { val: stats.totalInterviews, label: 'Interviews' }
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

                {/* Filter */}
                <Glass>
                    <div className="p-4">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.18em] mb-3">Filter Events</p>
                        <div className="space-y-1">
                            <button style={filterBtnClass('all')} onClick={() => setFilter('all')} className="w-full text-left">
                                All Events ({events.length})
                            </button>
                            {Object.entries(TYPE).map(([key, cfg]) => {
                                const Icon = cfg.icon;
                                return (
                                    <button key={key} style={filterBtnClass(key)} onClick={() => setFilter(key)}
                                        className="w-full text-left flex items-center gap-2">
                                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                        {cfg.label} ({counts[key] || 0})
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </Glass>

                {/* Legend */}
                <Glass>
                    <div className="p-4">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.18em] mb-3">Legend</p>
                        <div className="space-y-2">
                            {Object.entries(TYPE).map(([, cfg]) => {
                                const Icon = cfg.icon;
                                return (
                                    <div key={cfg.label} className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ background: cfg.soft }}>
                                            <Icon className="w-3.5 h-3.5" style={{ color: cfg.hex }} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-600">{cfg.label}</span>
                                        <div className="ml-auto w-2 h-2 rounded-full" style={{ background: cfg.hex }} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Glass>

                {/* Upcoming */}
                <Glass>
                    <div className="px-4 pt-4 pb-1 flex items-center justify-between">
                        <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                            <BellRing className="w-3.5 h-3.5 text-[#4285f4]" /> Coming Up
                        </p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
                            style={{ background: CAL_ACCENT_SOFT, color: '#1d4ed8' }}>{upcoming.length}</span>
                    </div>
                    {upcoming.length === 0 ? (
                        <div className="py-8 text-center">
                            <Calendar className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-600">Nothing coming up</p>
                        </div>
                    ) : (
                        <div className="py-2 px-1">
                            {upcoming.map(ev => {
                                const cfg = TYPE[ev.type] || TYPE.job_posted;
                                const d = new Date(ev.date);
                                return (
                                    <motion.button key={ev.id} whileHover={{ x: 3 }}
                                        onClick={() => setSelected(ev)}
                                        className="w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all group">
                                        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex flex-col items-center justify-center"
                                            style={{ background: cfg.soft, border: `1.5px solid ${cfg.hex}30` }}>
                                            <span className="text-[8px] font-black uppercase" style={{ color: cfg.hex }}>
                                                {d.toLocaleDateString('en-IN', { month: 'short' })}
                                            </span>
                                            <span className="text-sm font-black leading-none" style={{ color: cfg.hex }}>{d.getDate()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-slate-800 truncate">{ev.title}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.hex }} />
                                                <span className="text-[10px] font-bold text-slate-600">{cfg.label}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}
                </Glass>
            </div>

            {/* Main Calendar */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">

                {/* Toolbar */}
                <Glass className="px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        {[['prev', ChevronLeft], ['next', ChevronRight]].map(([fn, Icon]) => (
                            <motion.button key={fn} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => nav(fn)}
                                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:border-slate-300 flex items-center justify-center transition-all">
                                <Icon className="w-4 h-4 text-slate-500" />
                            </motion.button>
                        ))}
                        <motion.button whileHover={{ scale: 1.02 }} onClick={() => nav('today')}
                            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-black text-slate-700 transition-all">
                            Today
                        </motion.button>
                        <h2 className="text-base font-black text-slate-900 ml-2 tracking-tight">{viewTitle}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <motion.button whileHover={{ rotate: 180 }} transition={{ duration: 0.4 }} onClick={fetchData}
                            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:border-slate-300 transition-all">
                            <RefreshCw className="w-4 h-4 text-slate-600" />
                        </motion.button>
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100">
                            {[['dayGridMonth', 'Month'], ['timeGridWeek', 'Week'], ['timeGridDay', 'Day']].map(([v, label]) => (
                                <motion.button key={v} whileTap={{ scale: 0.95 }} onClick={() => changeView(v)}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all"
                                    style={activeView === v
                                        ? { background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }
                                        : { color: '#64748b' }}>
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
                            <p className="text-sm font-bold text-slate-600">Loading hiring timeline…</p>
                        </div>
                    ) : (
                        <div className="rp-cal p-5 h-full">
                            <FullCalendar
                                ref={calRef}
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                initialView="dayGridMonth"
                                headerToolbar={false}
                                events={calEvents}
                                eventClick={({ event }) => setSelected(event.extendedProps)}
                                height="100%"
                                nowIndicator={true}
                                dayMaxEvents={4}
                                datesSet={({ view }) => setViewTitle(view.title)}
                                eventDidMount={info => {
                                    info.el.title = info.event.title;
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <EventDrawer event={selected} onClose={() => setSelected(null)} />
        </div>
    );
}

export default AdminCalendar;
