import { useState, useEffect } from 'react';
import { Users, Sparkles, CheckCircle2, XCircle, Clock, TrendingUp, Bot, Zap, FileText, Star } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Progress } from './ui';
import { motion } from 'motion/react';
import { getAssignments, assignRecruiter } from '../lib/api';

export function RecruiterAssignment() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const data = await getAssignments();
      setAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      analyzing: { label: 'Analyzing', color: 'bg-[#06b6d4]', icon: Bot },
      matched: { label: 'Match Found', color: 'bg-[#8b5cf6]', icon: Sparkles },
      assigned: { label: 'Assigned', color: 'bg-[#10b981]', icon: CheckCircle2 },
      no_match: { label: 'No Match', color: 'bg-[#ef4444]', icon: XCircle }
    };
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} hover:${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleAssign = async (id) => {
    setLoading(true);
    try {
      await assignRecruiter(id);
      await fetchAssignments();
    } catch (error) {
      console.error('Error assigning recruiter:', error);
      alert('Failed to assign recruiter');
    } finally {
      setLoading(false);
    }
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

  // Calculate stats
  const stats = {
    activeJobs: assignments.length,
    autoAssigned: assignments.filter(a => a.status === 'assigned').length,
    matchRate: assignments.length > 0
      ? Math.round((assignments.filter(a => a.status !== 'no_match').length / assignments.length) * 100)
      : 0,
    avgMatchScore: assignments.length > 0
      ? Math.round(assignments.reduce((sum, a) => sum + (a.matchScore || 0), 0) / assignments.length)
      : 0
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header Banner */}
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
                <h3 className="text-foreground">Recruiter Assignment</h3>
                <Badge className="bg-gradient-to-r from-[#4285f4] to-[#8b5cf6]">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Smart Matching
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Automatically matches job descriptions with the most suitable recruiters based on expertise,
                workload, and historical success rates. The system analyzes recruiter profiles and performance
                metrics to ensure optimal assignments.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Jobs', value: stats.activeJobs.toString(), icon: FileText, color: 'from-[#4285f4] to-[#06b6d4]' },
          { label: 'Auto-Assigned', value: stats.autoAssigned.toString(), icon: Zap, color: 'from-[#8b5cf6] to-[#06b6d4]' },
          { label: 'Match Rate', value: `${stats.matchRate}%`, icon: TrendingUp, color: 'from-[#10b981] to-[#06b6d4]' },
          { label: 'Avg Match Score', value: stats.avgMatchScore.toString(), icon: Star, color: 'from-[#f59e0b] to-[#ef4444]' }
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

      {/* Assignment Queue */}
      <div>
        <h3 className="text-foreground mb-4">Recruiter Assignment Queue</h3>
        {assignments.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No assignments in queue</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment, index) => (
              <motion.div
                key={assignment._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-foreground">{assignment.jobTitle}</h4>
                        {getStatusBadge(assignment.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{assignment.department}</span>
                        <span>•</span>
                        <span>{assignment.candidatesFound} candidates found</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(assignment.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Analysis */}
                  {assignment.status !== 'no_match' && (
                    <div className="bg-gradient-to-r from-[#4285f4]/5 to-[#8b5cf6]/5 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm font-medium text-foreground">Recommendation</p>
                            <Badge variant="outline" className="border-[#8b5cf6] text-[#8b5cf6]">
                              {assignment.matchScore}% Match
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            <span className="font-medium text-foreground">{assignment.aiRecommendation}</span> - {assignment.aiReason}
                          </p>

                          {/* Match Score Progress */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Match Confidence</span>
                              <span className="text-foreground font-medium">{assignment.matchScore}%</span>
                            </div>
                            <Progress value={assignment.matchScore} className="h-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {assignment.status === 'no_match' && (
                    <div className="bg-[#ef4444]/10 rounded-lg p-4 mb-4 border border-[#ef4444]/20">
                      <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">No Suitable Match Found</p>
                          <p className="text-sm text-muted-foreground">{assignment.aiReason}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assigned Recruiter */}
                  {assignment.recruiter && (
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4285f4] to-[#8b5cf6] flex items-center justify-center text-white">
                          {assignment.recruiter.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{assignment.recruiter}</p>
                          <p className="text-xs text-muted-foreground">Assigned Recruiter</p>
                        </div>
                      </div>
                      {assignment.status === 'assigned' && (
                        <Badge className="bg-[#10b981]">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {assignment.status === 'matched' && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        className="flex-1 bg-gradient-to-r from-[#4285f4] to-[#8b5cf6]"
                        onClick={() => handleAssign(assignment._id)}
                        disabled={loading}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Confirm Assignment
                      </Button>
                      <Button variant="outline">
                        Reassign
                      </Button>
                    </div>
                  )}

                  {assignment.status === 'no_match' && (
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" className="flex-1">
                        Manual Assignment
                      </Button>
                      <Button variant="outline">
                        Retry Analysis
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
