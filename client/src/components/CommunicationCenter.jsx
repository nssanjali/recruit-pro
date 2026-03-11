import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Mail,
    Bell,
    Calendar,
    MessageSquare,
    Search,
    Clock3,
    RefreshCw,
    CheckCircle2,
    XCircle,
    CalendarClock,
    AlertTriangle,
    ChevronRight,
    Video,
    User,
    Clock,
    ExternalLink,
    Plus,
    Trash2,
    CheckCheck
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Badge,
    Button,
    Input,
    Textarea
} from './ui';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
});

const getCurrentUserRole = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.role || 'candidate';
    } catch { return 'candidate'; }
};

const isCalendarRelatedCommunication = (comm) => {
    const text = [
        comm?.subject,
        comm?.content,
        comm?.message,
        comm?.type,
        comm?.status
    ].filter(Boolean).join(' ').toLowerCase();

    if (String(comm?.type || '').toLowerCase() === 'calendar') return true;
    return /(interview|calendar|rsvp|reschedule|meeting|scheduled|invitation|slot)/.test(text);
};

const getCalendarPathForRole = (role) => {
    if (role === 'candidate') return '/candidate-calendar';
    if (role === 'recruiter') return '/calendar';
    if (role === 'company_admin') return '/admin-calendar';
    return '/communication';
};

const normalizeInterviewId = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.startsWith('iv-') ? raw.slice(3) : raw;
};

const extractInterviewIdFromCommunication = (comm) => {
    const rawId = comm?.metadata?.interviewId
        || comm?.interviewId
        || comm?.relatedTo?.id
        || comm?.relatedTo?._id;

    if (!rawId) return '';
    if (typeof rawId === 'string') return normalizeInterviewId(rawId);
    if (typeof rawId === 'object') {
        if (rawId.$oid) return normalizeInterviewId(rawId.$oid);
        if (rawId.toString) return normalizeInterviewId(rawId.toString());
    }
    return '';
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatTime = (rawDate) => {
    if (!rawDate) return 'Just now';
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return 'Just now';
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (rawDate) => {
    if (!rawDate) return '—';
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
    });
};

const TYPE_CONFIG = {
    email: { icon: Mail, badge: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Email' },
    reminder: { icon: Bell, badge: 'bg-violet-100 text-violet-700 border-violet-200', label: 'Reminder' },
    calendar: { icon: Calendar, badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Calendar' },
    notification: { icon: MessageSquare, badge: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Notification' }
};

const INTERVIEW_STATUS = {
    scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CalendarClock },
    rsvp_pending: { label: 'Awaiting RSVP', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    reschedule_requested: { label: 'Reschedule Requested', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertTriangle },
    completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    no_show: { label: 'No Show', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertTriangle },
    cancelled: { label: 'Cancelled', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle }
};

// ─── RSVP Modal ─────────────────────────────────────────────────────────────

function RsvpModal({ interview, onClose, onSubmit }) {
    const [response, setResponse] = useState(null);
    const [message, setMessage] = useState('');
    const [proposedSlots, setProposedSlots] = useState(['']);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('rsvp'); // 'rsvp' | 'reschedule'

    const handleRsvp = async (rsvpResponse) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/communications/interviews/${interview._id}/rsvp`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ response: rsvpResponse, message })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast.success(data.message);
            onSubmit(interview._id, rsvpResponse);
            onClose();
        } catch (err) {
            toast.error(err.message || 'Failed to submit RSVP');
        } finally {
            setLoading(false);
        }
    };

    const handleRescheduleRequest = async () => {
        const validSlots = proposedSlots.filter(s => s.trim());
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/communications/interviews/${interview._id}/reschedule-request`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ reason: message, proposedSlots: validSlots })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast.success('Reschedule request sent to recruiter');
            onSubmit(interview._id, 'reschedule_requested');
            onClose();
        } catch (err) {
            toast.error(err.message || 'Failed to send reschedule request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
            >
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Video className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900">Interview Invitation</h3>
                            <p className="text-xs text-slate-500">{interview.jobTitle} {interview.jobCompany ? `@ ${interview.jobCompany}` : ''}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {/* Interview Details */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                            <CalendarClock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="font-semibold">{formatDateTime(interview.scheduledAt)}</span>
                        </div>
                        {interview.recruiterName && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <span>Recruiter: {interview.recruiterName}</span>
                            </div>
                        )}
                        {interview.meetingLink && (
                            <a
                                href={interview.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                            >
                                <Video className="w-4 h-4 flex-shrink-0" />
                                Join Google Meet
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>

                    {step === 'rsvp' ? (
                        <>
                            <Textarea
                                placeholder="Add a note (optional)..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="resize-none text-sm"
                                rows={3}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                                    onClick={() => handleRsvp('accepted')}
                                    disabled={loading}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Confirm ✓
                                </Button>
                                <Button
                                    variant="outline"
                                    className="border-orange-200 text-orange-700 hover:bg-orange-50 font-bold gap-2"
                                    onClick={() => setStep('reschedule')}
                                    disabled={loading}
                                >
                                    <CalendarClock className="w-4 h-4" />
                                    Request Reschedule
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-3">
                                <Textarea
                                    placeholder="Reason for rescheduling (e.g., conflict, travel, etc.)..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="resize-none text-sm"
                                    rows={2}
                                />
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-700">Proposed available slots (optional)</p>
                                    {proposedSlots.map((slot, i) => (
                                        <div key={i} className="flex gap-2">
                                            <input
                                                type="datetime-local"
                                                value={slot}
                                                onChange={(e) => {
                                                    const updated = [...proposedSlots];
                                                    updated[i] = e.target.value;
                                                    setProposedSlots(updated);
                                                }}
                                                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                            {proposedSlots.length > 1 && (
                                                <button onClick={() => setProposedSlots(proposedSlots.filter((_, j) => j !== i))}
                                                    className="text-slate-400 hover:text-rose-500">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {proposedSlots.length < 3 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs border-dashed"
                                            onClick={() => setProposedSlots([...proposedSlots, ''])}
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Add Slot
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setStep('rsvp')}
                                    disabled={loading}
                                >
                                    Back
                                </Button>
                                <Button
                                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold"
                                    onClick={handleRescheduleRequest}
                                    disabled={loading}
                                >
                                    {loading ? 'Sending...' : 'Send Request'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>

                <div className="px-6 pb-6">
                    <button
                        onClick={onClose}
                        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Reschedule Confirm Modal (Recruiter) ────────────────────────────────────

function ConfirmRescheduleModal({ interview, onClose, onConfirm }) {
    const [newTime, setNewTime] = useState('');
    const [newLink, setNewLink] = useState(interview.meetingLink || '');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!newTime) { toast.error('Please select a new interview time'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/communications/interviews/${interview._id}/confirm-reschedule`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ newScheduledAt: newTime, newMeetingLink: newLink || undefined, note })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast.success('Interview rescheduled and candidate notified');
            onConfirm(interview._id);
            onClose();
        } catch (err) {
            toast.error(err.message || 'Failed to confirm reschedule');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            >
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-black text-slate-900">Confirm New Interview Time</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        {interview.candidateName} — {interview.jobTitle}
                    </p>
                    {interview.rescheduleRequest?.reason && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                            <strong>Reason:</strong> {interview.rescheduleRequest.reason}
                        </div>
                    )}
                    {interview.rescheduleRequest?.proposedSlots?.length > 0 && (
                        <div className="mt-2 space-y-1">
                            <p className="text-xs font-bold text-slate-600">Candidate's proposed slots:</p>
                            {interview.rescheduleRequest.proposedSlots.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => setNewTime(new Date(s).toISOString().slice(0, 16))}
                                    className="block text-xs text-blue-600 hover:underline"
                                >
                                    {formatDateTime(s)} ← click to use
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 block">New Date & Time *</label>
                        <input
                            type="datetime-local"
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 block">Meeting Link (optional)</label>
                        <Input
                            value={newLink}
                            onChange={(e) => setNewLink(e.target.value)}
                            placeholder="https://meet.google.com/..."
                            className="text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 block">Note to candidate (optional)</label>
                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add a note..."
                            className="resize-none text-sm"
                            rows={2}
                        />
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
                        <Button
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            <CheckCheck className="w-4 h-4" />
                            {loading ? 'Confirming...' : 'Confirm & Notify'}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Candidate Interview Card ────────────────────────────────────────────────

function InterviewCard({ interview, onRsvp }) {
    const statusInfo = INTERVIEW_STATUS[interview.status] || INTERVIEW_STATUS.scheduled;
    const StatusIcon = statusInfo.icon;
    const rsvpDone = !!interview.candidateRsvp;
    const rsvpResponse = interview.candidateRsvp?.response;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-all"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Video className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900">{interview.jobTitle}</p>
                            {interview.jobCompany && (
                                <span className="text-xs text-slate-500">@ {interview.jobCompany}</span>
                            )}
                        </div>
                        {interview.recruiterName && (
                            <p className="text-sm text-slate-500 mt-0.5">Recruiter: {interview.recruiterName}</p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-sm font-semibold text-slate-700">
                            <CalendarClock className="w-4 h-4 text-blue-500" />
                            {formatDateTime(interview.scheduledAt)}
                        </div>
                        {interview.meetingLink && (
                            <a
                                href={interview.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                            >
                                <Video className="w-3 h-3" /> Open Google Meet <ExternalLink className="w-3 h-3" />
                            </a>
                        )}

                        {/* RSVP acknowledgement */}
                        {rsvpDone && (
                            <div className={`inline-flex items-center gap-1.5 mt-2 text-xs font-bold px-2.5 py-1 rounded-full ${rsvpResponse === 'accepted'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-orange-100 text-orange-700'
                                }`}>
                                {rsvpResponse === 'accepted' ? <CheckCircle2 className="w-3 h-3" /> : <CalendarClock className="w-3 h-3" />}
                                {rsvpResponse === 'accepted' ? 'You confirmed this interview' : 'You requested a reschedule'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Badge className={`capitalize text-[10px] font-bold ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                    </Badge>

                    {/* Show RSVP button only if interview is still upcoming and no RSVP yet */}
                    {!rsvpDone && interview.status === 'scheduled' && new Date(interview.scheduledAt) > new Date() && (
                        <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1"
                            onClick={() => onRsvp(interview)}
                        >
                            Respond <ChevronRight className="w-3 h-3" />
                        </Button>
                    )}

                    {interview.status === 'reschedule_requested' && !rsvpDone && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-orange-200 text-orange-700 text-xs font-bold gap-1"
                            onClick={() => onRsvp(interview)}
                        >
                            Update Request
                        </Button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Reschedule Request Card (Recruiter) ─────────────────────────────────────

function RescheduleRequestCard({ interview, onConfirm }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border-2 border-orange-200 bg-orange-50 p-5"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-orange-200 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-slate-900">{interview.candidateName}</p>
                        <p className="text-sm text-slate-600">{interview.jobTitle}</p>
                        <p className="text-xs text-slate-500 mt-1">
                            Originally: {formatDateTime(interview.scheduledAt)}
                        </p>
                        {interview.rescheduleRequest?.reason && (
                            <p className="text-sm text-orange-800 mt-2 font-medium">
                                Reason: "{interview.rescheduleRequest.reason}"
                            </p>
                        )}
                        {interview.candidateRsvp?.message && !interview.rescheduleRequest?.reason && (
                            <p className="text-sm text-orange-800 mt-2 font-medium">
                                Note: "{interview.candidateRsvp.message}"
                            </p>
                        )}
                        {interview.rescheduleRequest?.proposedSlots?.length > 0 && (
                            <div className="mt-2">
                                <p className="text-xs font-bold text-slate-600">Proposed slots:</p>
                                {interview.rescheduleRequest.proposedSlots.map((s, i) => (
                                    <p key={i} className="text-xs text-slate-700">{formatDateTime(s)}</p>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1 flex-shrink-0"
                    onClick={() => onConfirm(interview)}
                >
                    <CalendarClock className="w-4 h-4" />
                    Reschedule
                </Button>
            </div>
        </motion.div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CommunicationCenter() {
    const navigate = useNavigate();
    const userRole = getCurrentUserRole();
    const isCandidate = userRole === 'candidate';
    const isRecruiterOrCompanyAdmin = ['recruiter', 'company_admin'].includes(userRole);
    const isRecruiterOrAdmin = ['recruiter', 'admin', 'company_admin'].includes(userRole);
    const calendarTargetPath = getCalendarPathForRole(userRole);

    const [communications, setCommunications] = useState([]);
    const [candidateInterviews, setCandidateInterviews] = useState([]);
    const [rescheduleRequests, setRescheduleRequests] = useState([]);
    const [stats, setStats] = useState({ emailsSent: 0, scheduledReminders: 0, calendarInvites: 0, storedRecords: 0 });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [showHistory, setShowHistory] = useState(false);
    const [rsvpModal, setRsvpModal] = useState(null); // interview to RSVP
    const [rescheduleModal, setRescheduleModal] = useState(null); // interview to reschedule (recruiter)

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const requests = [
                fetch(`${API_URL}/communications`, { headers: authHeaders() })
            ];

            if (isCandidate) {
                requests.push(fetch(`${API_URL}/communications/my-interviews`, { headers: authHeaders() }));
            }
            if (isRecruiterOrAdmin) {
                requests.push(fetch(`${API_URL}/communications/reschedule-requests`, { headers: authHeaders() }));
            }

            const responses = await Promise.all(requests);
            const [commsRes, secondRes] = await Promise.all(responses.map(r => r.json()));

            if (commsRes.success) {
                setCommunications(commsRes.data.communications || []);
                setStats(commsRes.data.stats || { emailsSent: 0, scheduledReminders: 0, calendarInvites: 0, storedRecords: 0 });
            }

            if (isCandidate && secondRes?.success) {
                setCandidateInterviews(secondRes.data || []);
            }
            if (isRecruiterOrAdmin && secondRes?.success) {
                setRescheduleRequests(secondRes.data || []);
            }
        } catch (err) {
            console.error('Error fetching communications:', err);
            toast.error('Failed to load message center');
        } finally {
            setLoading(false);
        }
    }, [isCandidate, isRecruiterOrAdmin]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filteredCommunications = useMemo(() => {
        return communications.filter((comm) => {
            const matchesSearch = !searchQuery.trim() ||
                [comm.subject, comm.recipient, comm.content, comm.message]
                    .filter(Boolean)
                    .some((v) => String(v).toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesType = typeFilter === 'all' || comm.type === typeFilter;
            return matchesSearch && matchesType;
        });
    }, [communications, searchQuery, typeFilter]);

    const { recentCommunications, historyCommunications } = useMemo(() => {
        const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const recent = [];
        const history = [];

        filteredCommunications.forEach((comm) => {
            const rawDate = comm.sentAt || comm.createdAt || comm.scheduledFor;
            const date = rawDate ? new Date(rawDate) : null;
            const ts = date && !Number.isNaN(date.getTime()) ? date.getTime() : Date.now();
            if (ts >= cutoff) recent.push(comm);
            else history.push(comm);
        });

        return { recentCommunications: recent, historyCommunications: history };
    }, [filteredCommunications]);

    const upcomingInterviews = useMemo(() =>
        candidateInterviews.filter(iv => new Date(iv.scheduledAt) > new Date() || iv.status === 'reschedule_requested'),
        [candidateInterviews]
    );

    const pastInterviews = useMemo(() =>
        candidateInterviews.filter(iv => new Date(iv.scheduledAt) <= new Date() && iv.status !== 'reschedule_requested'),
        [candidateInterviews]
    );

    const handleRsvpSubmit = (interviewId, response) => {
        setCandidateInterviews(prev => prev.map(iv =>
            iv._id === interviewId
                ? { ...iv, candidateRsvp: { response, respondedAt: new Date() }, status: response === 'declined' ? 'reschedule_requested' : iv.status }
                : iv
        ));
    };

    const handleRescheduleConfirm = (interviewId) => {
        setRescheduleRequests(prev => prev.filter(iv => iv._id !== interviewId));
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                            {isCandidate ? 'My Notifications' : 'Message Center'}
                        </h2>
                        <p className="text-slate-500 mt-1 text-sm">
                            {isCandidate
                                ? 'View interview invitations, confirmations, and notifications sent to you.'
                                : 'Review interview communications, reschedule requests, and candidate messages.'}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="border-slate-200 bg-white hover:bg-slate-50 flex-shrink-0"
                        onClick={fetchAll}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    { key: 'emailsSent', label: isCandidate ? 'Emails Received' : 'Emails Sent', icon: Mail, style: 'bg-blue-100 text-blue-700' },
                    { key: 'scheduledReminders', label: 'Reminders', icon: Bell, style: 'bg-violet-100 text-violet-700' },
                    ...(isCandidate ? [
                        { key: '_upcoming', label: 'Upcoming Interviews', icon: CalendarClock, style: 'bg-emerald-100 text-emerald-700', value: upcomingInterviews.length },
                        { key: '_pending_rsvp', label: 'Awaiting RSVP', icon: Clock, style: 'bg-amber-100 text-amber-700', value: upcomingInterviews.filter(i => !i.candidateRsvp && i.status === 'scheduled').length }
                    ] : [
                        { key: 'calendarInvites', label: 'Calendar Invites', icon: Calendar, style: 'bg-emerald-100 text-emerald-700' },
                        { key: '_reschedule', label: 'Reschedule Requests', icon: AlertTriangle, style: 'bg-amber-100 text-amber-700', value: rescheduleRequests.length }
                    ])
                ].map((item) => {
                    const Icon = item.icon;
                    const val = item.value !== undefined ? item.value : stats[item.key] ?? 0;
                    return (
                        <Card key={item.key} className="border-slate-200">
                            <CardContent className="pt-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{item.label}</p>
                                        <p className="text-3xl font-black text-slate-900 mt-2">{val}</p>
                                    </div>
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.style}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Recruiter: reschedule requests banner */}
            {isRecruiterOrAdmin && rescheduleRequests.length > 0 && (
                <Card className="border-2 border-orange-200 bg-orange-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-black text-orange-900 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            {rescheduleRequests.length} Reschedule Request{rescheduleRequests.length > 1 ? 's' : ''} Pending Action
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {rescheduleRequests.map(iv => (
                            <RescheduleRequestCard
                                key={iv._id}
                                interview={iv}
                                onConfirm={(interview) => setRescheduleModal(interview)}
                            />
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Candidate: Interview RSVP section */}
            {isCandidate && upcomingInterviews.length > 0 && (
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                                <Video className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black text-slate-900">Upcoming Interviews</CardTitle>
                                <p className="text-sm text-slate-500">Confirm or request a reschedule</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-3">
                        {upcomingInterviews.map(iv => (
                            <InterviewCard
                                key={iv._id}
                                interview={iv}
                                onRsvp={(interview) => setRsvpModal(interview)}
                            />
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Main communications feed */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900">
                                {isCandidate ? 'My Messages' : 'Communications'}
                            </CardTitle>
                            <p className="text-sm text-slate-500">
                                {isCandidate
                                    ? 'Only messages sent to you are shown here'
                                    : 'Messages sent to or from your account'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="relative md:col-span-2">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search subject, content..."
                                className="pl-9 border-slate-200"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {['all', 'email', 'reminder', 'notification'].map((type) => (
                                <Button
                                    key={type}
                                    size="sm"
                                    variant={typeFilter === type ? 'default' : 'outline'}
                                    className={typeFilter === type ? 'bg-slate-900 text-white' : 'border-slate-200 capitalize'}
                                    onClick={() => setTypeFilter(type)}
                                >
                                    {type}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    {loading ? (
                        <div className="py-12 text-center space-y-3">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-sm text-slate-500">Loading messages...</p>
                        </div>
                    ) : filteredCommunications.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                <MessageSquare className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="font-bold text-slate-700">No messages yet</p>
                            <p className="text-sm text-slate-500 mt-1">
                                {isCandidate
                                    ? 'Messages from recruiters and the system will appear here once sent to you.'
                                    : 'No communications match the selected filters.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Recent Messages (Last 30 Days)</p>
                                <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                                    {recentCommunications.length}
                                </Badge>
                            </div>
                            {recentCommunications.map((comm, index) => {
                                const cfg = TYPE_CONFIG[comm.type] || TYPE_CONFIG.notification;
                                const Icon = cfg.icon;
                                const canOpenCalendar = (isCandidate || isRecruiterOrCompanyAdmin) && isCalendarRelatedCommunication(comm);
                                const deepLinkInterviewId = extractInterviewIdFromCommunication(comm);
                                const calendarPath = deepLinkInterviewId
                                    ? `${calendarTargetPath}?interview=${encodeURIComponent(deepLinkInterviewId)}`
                                    : calendarTargetPath;

                                return (
                                    <motion.div
                                        key={comm._id || index}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="rounded-xl border border-slate-200 p-4 bg-white hover:shadow-sm transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.badge}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="font-bold text-slate-900 truncate">
                                                        {comm.subject || 'No subject'}
                                                    </p>
                                                    <Badge className={`capitalize flex-shrink-0 text-[10px] ${cfg.badge}`}>
                                                        {cfg.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                                    {comm.content || comm.message || 'No content'}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Clock3 className="w-3 h-3" />
                                                        {formatTime(comm.sentAt || comm.createdAt)}
                                                    </span>
                                                    {/* Only show recipient for recruiters/admins */}
                                                    {!isCandidate && comm.recipient && (
                                                        <span>To: {comm.recipient}</span>
                                                    )}
                                                    {canOpenCalendar && (
                                                            <button
                                                                type="button"
                                                            onClick={() => navigate(calendarPath)}
                                                            className="ml-auto inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                                                        >
                                                            <Calendar className="w-3 h-3" />
                                                            Open Calendar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {historyCommunications.length > 0 && (
                                <div className="pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowHistory((prev) => !prev)}
                                        className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors"
                                    >
                                        <span className="text-sm font-bold text-slate-700">Message History (Older than 30 days)</span>
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-white border-slate-200 text-slate-700">{historyCommunications.length}</Badge>
                                            <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                                        </div>
                                    </button>
                                    {showHistory && (
                                        <div className="mt-3 space-y-3">
                                            {historyCommunications.map((comm, index) => {
                                                const cfg = TYPE_CONFIG[comm.type] || TYPE_CONFIG.notification;
                                                const Icon = cfg.icon;
                                                const canOpenCalendar = (isCandidate || isRecruiterOrCompanyAdmin) && isCalendarRelatedCommunication(comm);
                                                const deepLinkInterviewId = extractInterviewIdFromCommunication(comm);
                                                const calendarPath = deepLinkInterviewId
                                                    ? `${calendarTargetPath}?interview=${encodeURIComponent(deepLinkInterviewId)}`
                                                    : calendarTargetPath;

                                                return (
                                                    <motion.div
                                                        key={`history-${comm._id || index}`}
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: index * 0.02 }}
                                                        className="rounded-xl border border-slate-200 p-4 bg-slate-50/70"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.badge}`}>
                                                                <Icon className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <p className="font-bold text-slate-900 truncate">
                                                                        {comm.subject || 'No subject'}
                                                                    </p>
                                                                    <Badge className={`capitalize flex-shrink-0 text-[10px] ${cfg.badge}`}>
                                                                        {cfg.label}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                                                    {comm.content || comm.message || 'No content'}
                                                                </p>
                                                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                                                    <span className="inline-flex items-center gap-1">
                                                                        <Clock3 className="w-3 h-3" />
                                                                        {formatTime(comm.sentAt || comm.createdAt)}
                                                                    </span>
                                                                    {!isCandidate && comm.recipient && (
                                                                        <span>To: {comm.recipient}</span>
                                                                    )}
                                                                    {canOpenCalendar && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => navigate(calendarPath)}
                                                                            className="ml-auto inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                                                                        >
                                                                            <Calendar className="w-3 h-3" />
                                                                            Open Calendar
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Candidate past interviews section */}
                    {isCandidate && pastInterviews.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Past Interviews</p>
                            <div className="space-y-3">
                                {pastInterviews.map(iv => (
                                    <div key={iv._id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">{iv.jobTitle}</p>
                                            <p className="text-xs text-slate-500">{formatDateTime(iv.scheduledAt)}</p>
                                        </div>
                                        <Badge className={`text-[10px] font-bold ${INTERVIEW_STATUS[iv.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                            {INTERVIEW_STATUS[iv.status]?.label || iv.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            <AnimatePresence>
                {rsvpModal && (
                    <RsvpModal
                        interview={rsvpModal}
                        onClose={() => setRsvpModal(null)}
                        onSubmit={handleRsvpSubmit}
                    />
                )}
                {rescheduleModal && (
                    <ConfirmRescheduleModal
                        interview={rescheduleModal}
                        onClose={() => setRescheduleModal(null)}
                        onConfirm={handleRescheduleConfirm}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
