import { useState } from 'react';
import { Mail, Send, Calendar, CheckCircle2, Clock, Bot, Sparkles, Bell, Database, MessageSquare, Zap, ShieldCheck, Filter, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger, Input } from './ui';
import { motion } from 'motion/react';

export function CommunicationCenter() {
    const [communications, setCommunications] = useState([
        {
            id: 1,
            type: 'email',
            subject: 'Interview Confirmation - Senior ML Engineer',
            recipient: 'sarah.johnson@email.com',
            status: 'sent',
            sentAt: '2 hours ago',
            template: 'Interview Confirmation',
            automated: true,
            content: 'Your interview has been scheduled for Oct 23, 2025 at 2 PM'
        },
        {
            id: 2,
            type: 'reminder',
            subject: 'Interview Reminder - Tomorrow at 10 AM',
            recipient: 'michael.brown@email.com',
            status: 'scheduled',
            scheduledFor: 'Tomorrow 9:00 AM',
            template: 'Interview Reminder',
            automated: true,
            content: 'Reminder: Your interview is scheduled for tomorrow'
        },
        {
            id: 3,
            type: 'calendar',
            subject: 'Google Meet Invite - DevOps Engineer Interview',
            recipient: 'emma.davis@email.com',
            status: 'sent',
            sentAt: '1 hour ago',
            template: 'Calendar Invite',
            automated: true,
            content: 'Calendar invite with Google Meet link sent'
        },
        {
            id: 4,
            type: 'email',
            subject: 'Interview Confirmation - Data Scientist',
            recipient: 'david.lee@email.com',
            status: 'sent',
            sentAt: '30 minutes ago',
            template: 'Interview Confirmation',
            automated: true,
            content: 'Your interview has been scheduled for Oct 26, 2025 at 3 PM'
        }
    ]);

    const [storedCommunications] = useState([
        {
            candidate: 'Sarah Johnson',
            totalMessages: 8,
            lastContact: '2 hours ago',
            interviews: 2,
            status: 'Active'
        },
        {
            candidate: 'Michael Brown',
            totalMessages: 5,
            lastContact: '1 day ago',
            interviews: 1,
            status: 'Scheduled'
        },
        {
            candidate: 'Emma Davis',
            totalMessages: 12,
            lastContact: '1 hour ago',
            interviews: 3,
            status: 'Active'
        },
        {
            candidate: 'David Lee',
            totalMessages: 6,
            lastContact: '30 minutes ago',
            interviews: 1,
            status: 'Active'
        }
    ]);

    const [searchQuery, setSearchQuery] = useState('');

    const getTypeIcon = (type) => {
        const icons = {
            email: Mail,
            reminder: Bell,
            calendar: Calendar
        };
        return icons[type] || Mail;
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            sent: { label: 'Sent', variant: 'success' },
            scheduled: { label: 'Scheduled', variant: 'default' },
            pending: { label: 'Pending', variant: 'secondary' }
        };
        const config = statusConfig[status];
        return (
            <Badge variant={config.variant} className="uppercase tracking-widest text-[9px] font-black">
                {config.label}
            </Badge>
        );
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Premium Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Signal Center</h2>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                            <Zap className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                            Auto v2.0
                        </div>
                    </div>
                    <p className="text-slate-500 text-sm flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                        Automated communication system active
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#4285f4] transition-colors" />
                        <Input
                            placeholder="Search communications..."
                            className="pl-10 w-full sm:w-72 bg-white border-slate-200 focus:ring-[#4285f4]/20 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="border-slate-200 bg-white gap-2 hover:bg-slate-50 shadow-sm">
                        <Filter className="w-4 h-4" />
                        Filter
                    </Button>
                    <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 gap-2 font-bold px-6">
                        <Send className="w-4 h-4" />
                        New Message
                    </Button>
                </div>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Emails Sent Today', value: '47', icon: Mail, color: 'from-[#4285f4] to-[#06b6d4]', trend: '+12%' },
                    { label: 'Scheduled Reminders', value: '23', icon: Bell, color: 'from-[#8b5cf6] to-[#d946ef]', trend: 'Active' },
                    { label: 'Calendar Invites', value: '38', icon: Calendar, color: 'from-[#10b981] to-[#34d399]', trend: '+8%' },
                    { label: 'Stored Records', value: '248', icon: Database, color: 'from-[#f59e0b] to-[#fbbf24]', trend: 'Total' }
                ].map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="relative overflow-hidden border-none shadow-sm hover:shadow-xl transition-all group p-6 bg-white">
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.03] rounded-bl-full group-hover:opacity-[0.06] transition-all duration-700`} />
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg shadow-[#4285f4]/5 group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <Badge variant="secondary" className="bg-slate-50 text-slate-500 border-slate-100 font-bold text-[10px]">
                                        {stat.trend}
                                    </Badge>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">{stat.value}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {/* Main Content */}
            <Card className="border-slate-100 shadow-lg overflow-hidden bg-white">
                <CardHeader className="p-8 border-b border-slate-50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900">Communication Hub</CardTitle>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">Automated messages and tracking</p>
                        </div>
                    </div>

                    <Tabs defaultValue="recent" className="w-full">
                        <TabsList className="bg-slate-100/80 p-1 rounded-xl">
                            <TabsTrigger value="recent" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">RECENT</TabsTrigger>
                            <TabsTrigger value="database" className="text-[11px] font-bold px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">DATABASE</TabsTrigger>
                        </TabsList>

                        {/* Recent Communications */}
                        <TabsContent value="recent" className="mt-6 space-y-4">
                            {communications.map((comm, index) => {
                                const TypeIcon = getTypeIcon(comm.type);
                                return (
                                    <motion.div
                                        key={comm.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <Card className="p-6 hover:shadow-md transition-all border-slate-100">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${comm.type === 'email' ? 'from-[#4285f4] to-[#06b6d4]' :
                                                        comm.type === 'reminder' ? 'from-[#8b5cf6] to-[#d946ef]' :
                                                            'from-[#10b981] to-[#34d399]'
                                                    } flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                                    <TypeIcon className="w-6 h-6 text-white" />
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-bold text-slate-900">{comm.subject}</h4>
                                                                {comm.automated && (
                                                                    <Badge variant="outline" className="border-[#8b5cf6] text-[#8b5cf6] text-[9px] font-black uppercase tracking-wider">
                                                                        <Bot className="w-3 h-3 mr-1" />
                                                                        Auto
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-slate-500 font-medium">To: {comm.recipient}</p>
                                                        </div>
                                                        {getStatusBadge(comm.status)}
                                                    </div>

                                                    <div className="bg-slate-50 rounded-xl p-4 mb-3">
                                                        <p className="text-sm text-slate-600 font-medium">{comm.content}</p>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {comm.status === 'sent' ? comm.sentAt : comm.scheduledFor}
                                                            </span>
                                                            <span>Template: {comm.template}</span>
                                                        </div>
                                                        <Button variant="ghost" size="sm" className="text-[#4285f4] hover:text-[#3b79db] font-bold">
                                                            View Details
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </TabsContent>

                        {/* Communication Database */}
                        <TabsContent value="database" className="mt-6 space-y-4">
                            {storedCommunications.map((record, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="p-6 hover:shadow-md transition-all border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-black text-lg shadow-lg">
                                                    {record.candidate.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 mb-1">{record.candidate}</h4>
                                                    <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                                                        <span className="flex items-center gap-1">
                                                            <MessageSquare className="w-3 h-3" />
                                                            {record.totalMessages} messages
                                                        </span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {record.interviews} interviews
                                                        </span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {record.lastContact}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Badge variant={record.status === 'Active' ? 'success' : 'default'} className="uppercase tracking-widest text-[9px] font-black">
                                                    {record.status}
                                                </Badge>
                                                <Button variant="outline" size="sm" className="font-bold">
                                                    View History
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </TabsContent>
                    </Tabs>
                </CardHeader>
            </Card>

            {/* Automation Info */}
            <Card className="border-slate-200 shadow-lg bg-white p-8">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-900 mb-3 text-lg">Automated Communication Workflow</h4>
                        <ul className="space-y-3 text-sm text-slate-600 font-medium">
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                                <span>Interview confirmations are automatically sent within 5 minutes of scheduling</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                                <span>Google Meet invites are generated and sent with calendar integration</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                                <span>Reminders are scheduled 24 hours and 1 hour before interviews</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                                <span>All communications are stored in the database for compliance and tracking</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </Card>
        </div>
    );
}
