import { useState } from 'react';
import { Mic, MicOff, Sparkles, Star, MessageSquare, TrendingUp, Brain, Zap, ShieldCheck, Play, Pause } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Progress, ScrollArea } from './ui';
import { motion, AnimatePresence } from 'motion/react';

export function BrowserExtension() {
  const [isRecording, setIsRecording] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const handleAnalyze = () => {
    setShowFeedback(true);
  };

  const transcript = [
    { speaker: 'Interviewer', text: 'Can you explain how you would approach building a scalable ML pipeline?' },
    { speaker: 'Candidate', text: 'I would start by understanding the data requirements and then design a modular architecture using tools like Apache Airflow for orchestration...' },
    { speaker: 'Interviewer', text: 'What about handling real-time data?' },
    { speaker: 'Candidate', text: 'For real-time processing, I would implement a streaming architecture using Apache Kafka and Spark Streaming...' },
  ];

  const feedback = {
    overall: 85,
    communication: 88,
    technical: 82,
    confidence: 87,
    problemSolving: 83
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Interview Evaluations</h2>
          </div>
          <p className="text-slate-500 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#10b981]" />
            Real-time interview analysis and feedback
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isRecording && (
            <Badge className="bg-red-500 hover:bg-red-500 animate-pulse px-4 py-2 text-white font-black uppercase tracking-wider">
              <div className="w-2 h-2 rounded-full bg-white mr-2" />
              Recording Live
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Controls & Transcript */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recording Controls */}
          <Card className="border-slate-200 shadow-lg bg-white">
            <CardHeader className="pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-slate-900">Interview Assistant</CardTitle>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">Record and analyze interviews in real-time</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 pb-8">
              <div className="flex gap-4">
                <Button
                  onClick={handleToggleRecording}
                  className={`flex-1 h-14 font-bold text-base rounded-2xl shadow-xl transition-all ${isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gradient-to-r from-[#4285f4] to-[#8b5cf6] hover:from-[#3b79db] hover:to-[#7c4fe0] text-white'
                    }`}
                >
                  {isRecording ? (
                    <>
                      <Pause className="w-5 h-5 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start Recording
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleAnalyze}
                  variant="outline"
                  disabled={!isRecording && !showFeedback}
                  className="h-14 px-8 font-bold text-base rounded-2xl border-2 border-slate-200 hover:bg-slate-50"
                >
                  <Brain className="w-5 h-5 mr-2" />
                  Analyze
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live Transcript */}
          <Card className="border-slate-200 shadow-lg bg-white">
            <CardHeader className="pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-slate-900">Live Transcript</CardTitle>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">Real-time conversation capture</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 pb-6">
              <ScrollArea className="h-80 pr-4">
                <div className="space-y-4">
                  {transcript.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={item.speaker === 'Interviewer' ? 'default' : 'secondary'} className="text-[9px] font-black uppercase tracking-wider">
                          {item.speaker}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed pl-4 border-l-2 border-slate-200">
                        {item.text}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - AI Feedback */}
        <div className="lg:col-span-1 space-y-6">
          <AnimatePresence>
            {showFeedback ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Overall Score */}
                <Card className="border-slate-200 shadow-xl bg-gradient-to-br from-[#4285f4] via-[#8b5cf6] to-[#ec4899] text-white overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
                  <CardContent className="p-8 relative">
                    <div className="flex items-center gap-3 mb-6">
                      <Sparkles className="w-6 h-6" />
                      <h3 className="text-lg font-black uppercase tracking-wider">Analysis</h3>
                    </div>
                    <div className="text-center mb-4">
                      <div className="text-6xl font-black mb-2">{feedback.overall}%</div>
                      <p className="text-sm font-bold uppercase tracking-widest opacity-90">Overall Score</p>
                    </div>
                    <Progress value={feedback.overall} className="h-2 bg-white/20" />
                  </CardContent>
                </Card>

                {/* Detailed Metrics */}
                <Card className="border-slate-200 shadow-lg bg-white">
                  <CardHeader className="pb-6 border-b border-slate-100">
                    <CardTitle className="text-lg font-black text-slate-900">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 pb-6">
                    <div className="space-y-4">
                      {[
                        { label: 'Communication', value: feedback.communication, icon: MessageSquare, color: 'from-[#4285f4] to-[#06b6d4]' },
                        { label: 'Technical Skills', value: feedback.technical, icon: Star, color: 'from-[#8b5cf6] to-[#d946ef]' },
                        { label: 'Confidence', value: feedback.confidence, icon: TrendingUp, color: 'from-[#10b981] to-[#34d399]' },
                        { label: 'Problem Solving', value: feedback.problemSolving, icon: Brain, color: 'from-[#f59e0b] to-[#fbbf24]' },
                      ].map((metric, index) => {
                        const Icon = metric.icon;
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${metric.color} flex items-center justify-center`}>
                                  <Icon className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm font-bold text-slate-900">{metric.label}</span>
                              </div>
                              <span className="text-sm font-black text-slate-900">{metric.value}%</span>
                            </div>
                            <Progress value={metric.value} className="h-1.5" />
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* AI Insights */}
                <Card className="border-slate-200 shadow-lg bg-white">
                  <CardHeader className="pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      <CardTitle className="text-lg font-black text-slate-900">Key Insights</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 pb-6">
                    <ul className="space-y-3 text-sm font-medium">
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-emerald-600 text-xs font-black">✓</span>
                        </div>
                        <span className="text-slate-600">Strong technical knowledge in ML pipeline architecture</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-emerald-600 text-xs font-black">✓</span>
                        </div>
                        <span className="text-slate-600">Clear and structured communication style</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-amber-600 text-xs font-black">!</span>
                        </div>
                        <span className="text-slate-600">Could provide more specific examples from past experience</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card className="border-slate-200 shadow-lg bg-slate-50 border-dashed">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Brain className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">No Analysis Yet</h3>
                    <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto">
                      Start recording and click "Analyze" to get feedback on the interview
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
