import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Video, CheckCircle2, Sparkles, Bot, XCircle, AlertCircle, RefreshCw, Users, Shield, Send } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Tabs, TabsContent, TabsList, TabsTrigger } from './ui';
import { motion } from 'motion/react';
import { scheduleInterview, getInterviews, getQueueItems, deleteQueueItem } from '../lib/api';

export function InterviewScheduling() {
  const [loading, setLoading] = useState(false);
  const [schedulingQueue, setSchedulingQueue] = useState([]);
  const [scheduledInterviews, setScheduledInterviews] = useState([]);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [interviews, queue] = await Promise.all([
        getInterviews(),
        getQueueItems()
      ]);
      setScheduledInterviews(interviews);
      setSchedulingQueue(queue);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleScheduleAction = async (item) => {
    setLoading(true);
    try {
      const interviewData = {
        candidate: { name: item.candidate, email: item.candidateEmail },
        recruiter: { name: item.recruiter, email: item.recruiterEmail },
        admin: { name: 'Super Admin', email: 'admin@recruitpro.com' },
        role: item.role,
        date: item.proposedSlots[0] || 'TBD',
        time: 'TBD'
      };

      const result = await scheduleInterview(interviewData);

      // Remove from queue
      await deleteQueueItem(item._id);

      // Refresh data
      await fetchData();

      alert('Interview scheduled! Proctored link generated and notifications sent to Candidate, Recruiter, and Admin.');
    } catch (error) {
      alert('Failed to schedule interview. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      checking_recruiter: {
        label: 'Checking Recruiter Availability',
        color: 'bg-[#06b6d4]',
        icon: Clock,
        description: 'Analyzing recruiter calendar and workload...'
      },
      checking_candidate: {
        label: 'Checking Candidate Availability',
        color: 'bg-[#8b5cf6]',
        icon: Clock,
        description: 'Reviewing candidate preferred time slots...'
      },
      matched: {
        label: 'Match Found',
        color: 'bg-[#10b981]',
        icon: CheckCircle2,
        description: 'Perfect time slot identified for both parties'
      },
      scheduling: {
        label: 'Scheduling Interview',
        color: 'bg-[#4285f4]',
        icon: CalendarIcon,
        description: 'Creating calendar event and sending invites...'
      }
    };
    return statusMap[status] || statusMap.checking_recruiter;
  };

  const getStepProgress = (step) => {
    const steps = [
      { num: 1, label: 'Check Recruiter', icon: Users },
      { num: 2, label: 'Check Candidate', icon: Users },
      { num: 3, label: 'Match', icon: CheckCircle2 },
      { num: 4, label: 'Schedule', icon: CalendarIcon },
      { num: 5, label: 'Alternative', icon: RefreshCw }
    ];
    return steps;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="p-8 space-y-6">
      {/* Automation Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-6 bg-gradient-to-r from-[#4285f4]/10 via-[#8b5cf6]/10 to-[#06b6d4]/10 border-[#4285f4]/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] flex items-center justify-center flex-shrink-0">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-foreground">Automated Interview Scheduling</h3>
                <Badge className="bg-gradient-to-r from-[#4285f4] to-[#8b5cf6]">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Automated Scheduling
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Intelligent scheduling system that checks recruiter availability, candidate availability, finds optimal matches,
                and automatically generates <strong>Proctored Meeting Links</strong> with instant notifications.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'In Queue', value: schedulingQueue.length.toString(), icon: Clock, color: 'from-[#06b6d4] to-[#4285f4]' },
          { label: 'Scheduled Today', value: scheduledInterviews.length.toString(), icon: CheckCircle2, color: 'from-[#10b981] to-[#06b6d4]' },
          { label: 'Success Rate', value: '100%', icon: Sparkles, color: 'from-[#8b5cf6] to-[#06b6d4]' },
          { label: 'Avg Schedule Time', value: 'N/A', icon: CalendarIcon, color: 'from-[#f59e0b] to-[#ef4444]' }

        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <h3 className="text-foreground">{stat.value}</h3>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Scheduling Queue</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Interviews</TabsTrigger>
        </TabsList>

        {/* Scheduling Queue */}
        <TabsContent value="queue" className="space-y-4">
          <h3 className="text-foreground mb-4">Active Scheduling Process</h3>
          {schedulingQueue.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No items in scheduling queue</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {schedulingQueue.map((item, index) => {
                const statusInfo = getStatusInfo(item.status);
                const StatusIcon = statusInfo.icon;
                const steps = getStepProgress(item.step);

                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-6 hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-foreground">{item.candidate}</h4>
                            <Badge className={`${statusInfo.color} hover:${statusInfo.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{item.role}</span>
                            <span>•</span>
                            <span>{item.candidateEmail}</span>
                          </div>
                        </div>
                        {item.status === 'matched' && (
                          <Button
                            onClick={() => handleScheduleAction(item)}
                            disabled={loading}
                            className="bg-gradient-to-r from-[#10b981] to-[#06b6d4]"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Finalize & Notify All
                          </Button>
                        )}
                      </div>

                      {/* Workflow Steps */}
                      <div className="bg-muted rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          {steps.map((step, idx) => {
                            const StepIcon = step.icon;
                            const isActive = step.num === item.step;
                            const isCompleted = step.num < item.step;

                            return (
                              <div key={step.num} className="flex items-center">
                                <div className="flex flex-col items-center">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] text-white' :
                                    isCompleted ? 'bg-[#10b981] text-white' :
                                      'bg-white border-2 border-border text-muted-foreground'
                                    }`}>
                                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                                  </div>
                                  <p className={`text-xs mt-2 ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                    {step.label}
                                  </p>
                                </div>
                                {idx < steps.length - 1 && (
                                  <div className={`h-0.5 w-12 mx-2 ${step.num < item.step ? 'bg-[#10b981]' : 'bg-border'}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-sm text-muted-foreground text-center">{statusInfo.description}</p>
                      </div>

                      {/* Availability Status */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className={`p-3 rounded-lg border ${item.recruiterAvailable === true ? 'bg-[#10b981]/10 border-[#10b981]/20' : 'bg-muted border-border'}`}>
                          <p className="text-sm font-medium text-foreground">Recruiter: {item.recruiter}</p>
                          <p className="text-xs text-muted-foreground">{item.recruiterAvailable ? '✓ Available' : 'Checking...'}</p>
                        </div>
                        <div className={`p-3 rounded-lg border ${item.candidateAvailable === true ? 'bg-[#10b981]/10 border-[#10b981]/20' : 'bg-muted border-border'}`}>
                          <p className="text-sm font-medium text-foreground">Candidate Availability</p>
                          <p className="text-xs text-muted-foreground">{item.candidateAvailable ? '✓ Slots Confirmed' : 'Analyzing preferences...'}</p>
                        </div>
                      </div>

                      {item.proposedSlots && item.proposedSlots.length > 0 && (
                        <div className="bg-gradient-to-r from-[#4285f4]/5 to-[#8b5cf6]/5 rounded-lg p-4">
                          <p className="text-sm font-medium text-foreground mb-2">Optimal Time Identified:</p>
                          <div className="flex flex-wrap gap-2">
                            {item.proposedSlots.map((slot, idx) => (
                              <Badge key={idx} variant="outline" className="border-[#8b5cf6] text-[#8b5cf6]">
                                {slot}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Scheduled Interviews */}
        <TabsContent value="scheduled" className="space-y-4">
          <h3 className="text-foreground mb-4">Successfully Scheduled Interviews</h3>
          {scheduledInterviews.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No scheduled interviews yet</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledInterviews.map((interview, index) => (
                <motion.div
                  key={interview._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 hover:shadow-lg transition-all border-l-4 border-l-[#4285f4]">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-foreground">{interview.candidate.name}</h4>
                          <Badge className="bg-[#10b981] hover:bg-[#10b981]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Confirmed
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{interview.role}</p>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="border-[#8b5cf6] text-[#8b5cf6]">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Auto-Scheduled
                          </Badge>
                          {interview.isProctored && (
                            <Badge variant="outline" className="border-[#06b6d4] text-[#06b6d4]">
                              <Shield className="w-3 h-3 mr-1" />
                              Proctored Session
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4 p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Date: {interview.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Time: {interview.time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Secure Proctored Link</p>
                        <p className="text-xs font-mono text-blue-600 truncate">{interview.meetingLink}</p>
                      </div>

                      <Button
                        className="w-full bg-gradient-to-r from-[#4285f4] to-[#8b5cf6]"
                        onClick={() => window.open(interview.meetingLink, '_blank')}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Join Secure Room
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
