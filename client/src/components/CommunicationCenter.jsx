import { useEffect, useMemo, useState } from 'react';
import {
    Mail,
    Bell,
    Calendar,
    MessageSquare,
    Search,
    Clock3,
    RefreshCw,
    Database
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Badge,
    Button,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Input
} from './ui';
import { motion } from 'motion/react';

const STATUS_STYLES = {
    sent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    scheduled: 'bg-amber-100 text-amber-700 border-amber-200',
    pending: 'bg-blue-100 text-blue-700 border-blue-200',
    failed: 'bg-rose-100 text-rose-700 border-rose-200'
};

const TYPE_STYLES = {
    email: {
        icon: Mail,
        badge: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    reminder: {
        icon: Bell,
        badge: 'bg-violet-100 text-violet-700 border-violet-200'
    },
    calendar: {
        icon: Calendar,
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    },
    notification: {
        icon: MessageSquare,
        badge: 'bg-slate-100 text-slate-700 border-slate-200'
    }
};

const formatTime = (rawDate) => {
    if (!rawDate) return 'Just now';
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return 'Just now';

    const mins = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return date.toLocaleDateString();
};

export function CommunicationCenter() {
    const [communications, setCommunications] = useState([]);
    const [storedCommunications, setStoredCommunications] = useState([]);
    const [stats, setStats] = useState({
        emailsSent: 0,
        scheduledReminders: 0,
        calendarInvites: 0,
        storedRecords: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchCommunications = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/communications', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load message center');
            }

            const result = await response.json();
            setCommunications(result.data.communications || []);
            setStoredCommunications(result.data.storedCommunications || []);
            setStats(result.data.stats || {
                emailsSent: 0,
                scheduledReminders: 0,
                calendarInvites: 0,
                storedRecords: 0
            });
        } catch (err) {
            console.error('Error fetching communications:', err);
            setError(err.message || 'Failed to load communications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCommunications();
    }, []);

    const filteredCommunications = useMemo(() => {
        return communications.filter((comm) => {
            const matchesSearch = searchQuery.trim() === '' ||
                [comm.subject, comm.recipient, comm.content, comm.message]
                    .filter(Boolean)
                    .some((v) => String(v).toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesType = typeFilter === 'all' || comm.type === typeFilter;
            const matchesStatus = statusFilter === 'all' || comm.status === statusFilter;
            return matchesSearch && matchesType && matchesStatus;
        });
    }, [communications, searchQuery, typeFilter, statusFilter]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Message Center</h2>
                        <p className="text-slate-600 mt-1">Track interview messages, reminders, and automation updates.</p>
                    </div>
                    <Button
                        variant="outline"
                        className="border-slate-200 bg-white hover:bg-slate-50"
                        onClick={fetchCommunications}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    { key: 'emailsSent', label: 'Emails Sent', icon: Mail, style: 'bg-blue-100 text-blue-700' },
                    { key: 'scheduledReminders', label: 'Scheduled Reminders', icon: Bell, style: 'bg-violet-100 text-violet-700' },
                    { key: 'calendarInvites', label: 'Calendar Invites', icon: Calendar, style: 'bg-emerald-100 text-emerald-700' },
                    { key: 'storedRecords', label: 'Stored Records', icon: Database, style: 'bg-slate-100 text-slate-700' }
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <Card key={item.key} className="border-slate-200">
                            <CardContent className="pt-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{item.label}</p>
                                        <p className="text-3xl font-black text-slate-900 mt-2">{stats[item.key]}</p>
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

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900">Communications</CardTitle>
                            <p className="text-sm text-slate-500">Role-specific updates only</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="relative md:col-span-2">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search subject, recipient, content..."
                                className="pl-9 border-slate-200"
                            />
                        </div>
                        <div className="flex gap-2">
                            {['all', 'email', 'reminder', 'notification'].map((type) => (
                                <Button
                                    key={type}
                                    size="sm"
                                    variant={typeFilter === type ? 'default' : 'outline'}
                                    className={typeFilter === type ? 'bg-slate-900 text-white' : 'border-slate-200'}
                                    onClick={() => setTypeFilter(type)}
                                >
                                    {type}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {['all', 'sent', 'scheduled', 'pending', 'failed'].map((status) => (
                            <Button
                                key={status}
                                size="sm"
                                variant={statusFilter === status ? 'default' : 'outline'}
                                className={statusFilter === status ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border-slate-200'}
                                onClick={() => setStatusFilter(status)}
                            >
                                {status}
                            </Button>
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    <Tabs defaultValue="recent" className="w-full">
                        <TabsList className="bg-slate-100">
                            <TabsTrigger value="recent">Recent Feed</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>

                        <TabsContent value="recent" className="mt-5 space-y-3">
                            {loading ? (
                                <p className="text-sm text-slate-500">Loading communications...</p>
                            ) : error ? (
                                <p className="text-sm text-red-600">{error}</p>
                            ) : filteredCommunications.length === 0 ? (
                                <div className="py-12 text-center">
                                    <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">No messages for the selected filters.</p>
                                </div>
                            ) : (
                                filteredCommunications.map((comm, index) => {
                                    const typeCfg = TYPE_STYLES[comm.type] || TYPE_STYLES.notification;
                                    const TypeIcon = typeCfg.icon;
                                    const statusClass = STATUS_STYLES[comm.status] || 'bg-slate-100 text-slate-700 border-slate-200';

                                    return (
                                        <motion.div
                                            key={comm._id || comm.id || index}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="rounded-xl border border-slate-200 p-4 bg-white hover:shadow-sm transition-all"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeCfg.badge}`}>
                                                    <TypeIcon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="font-bold text-slate-900 truncate">{comm.subject || 'No subject'}</p>
                                                        <Badge className={`capitalize ${statusClass}`}>{comm.status || 'unknown'}</Badge>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                                        {comm.content || comm.message || 'No content'}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                                                        <span className="inline-flex items-center gap-1">
                                                            <Clock3 className="w-3 h-3" />
                                                            {formatTime(comm.sentAt || comm.createdAt || comm.scheduledFor)}
                                                        </span>
                                                        {comm.recipient && <span>To: {comm.recipient}</span>}
                                                        <Badge className={`capitalize ${typeCfg.badge}`}>{comm.type || 'notification'}</Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </TabsContent>

                        <TabsContent value="history" className="mt-5 space-y-3">
                            {storedCommunications.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Database className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">No history available.</p>
                                </div>
                            ) : (
                                storedCommunications.map((record, index) => (
                                    <motion.div
                                        key={`${record.candidate}-${index}`}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 truncate">{record.candidate || 'Contact'}</p>
                                            <p className="text-sm text-slate-500">
                                                {record.totalMessages || 0} messages | {record.interviews || 0} interviews
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                                {record.status || 'Active'}
                                            </Badge>
                                            <p className="text-xs text-slate-500 mt-1">{formatTime(record.lastContact)}</p>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
