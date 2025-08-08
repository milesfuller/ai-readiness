'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { 
  Mic, 
  Clock, 
  Volume2, 
  FileText, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Activity,
  Headphones,
  MessageCircle,
  Zap
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'

interface VoiceAnalytics {
  totalRecordings: number
  averageDuration: number
  transcriptionAccuracy: number
  sentimentDistribution: Record<string, number>
}

interface VoiceAnalyticsChartProps {
  voiceAnalytics: VoiceAnalytics
  className?: string
  showDetails?: boolean
}

export const VoiceAnalyticsChart: React.FC<VoiceAnalyticsChartProps> = ({
  voiceAnalytics,
  className = '',
  showDetails = true
}) => {
  const [activeTab, setActiveTab] = useState('overview')

  // Generate mock detailed data for demonstration
  const generateTimeSeriesData = () => {
    return Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      recordings: Math.floor(Math.random() * 20) + 10,
      avgDuration: Math.floor(Math.random() * 30) + 30,
      accuracy: Math.floor(Math.random() * 10) + 90
    }))
  }

  const generateDurationDistribution = () => {
    return [
      { range: '0-15s', count: 87, percentage: 20.3 },
      { range: '15-30s', count: 134, percentage: 31.3 },
      { range: '30-60s', count: 156, percentage: 36.4 },
      { range: '60-120s', count: 51, percentage: 11.9 }
    ]
  }

  const generateTopics = () => {
    return [
      { topic: 'AI Implementation', mentions: 89, sentiment: 'positive' },
      { topic: 'Team Collaboration', mentions: 76, sentiment: 'neutral' },
      { topic: 'Process Efficiency', mentions: 65, sentiment: 'positive' },
      { topic: 'Training Needs', mentions: 54, sentiment: 'negative' },
      { topic: 'Tool Integration', mentions: 43, sentiment: 'neutral' },
      { topic: 'Budget Concerns', mentions: 32, sentiment: 'negative' }
    ]
  }

  const timeSeriesData = generateTimeSeriesData()
  const durationData = generateDurationDistribution()
  const topicsData = generateTopics()

  // Prepare sentiment data for pie chart
  const sentimentData = Object.entries(voiceAnalytics.sentimentDistribution).map(([sentiment, percentage]) => ({
    name: sentiment,
    value: percentage,
    color: sentiment === 'Positive' ? '#22c55e' : sentiment === 'Negative' ? '#ef4444' : '#6b7280'
  }))

  const COLORS = ['#22c55e', '#6b7280', '#ef4444']

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Voice Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card hover:scale-105 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Recordings</p>
                <p className="text-2xl font-bold text-teal-400">{voiceAnalytics.totalRecordings}</p>
              </div>
              <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                <Mic className="h-6 w-6 text-teal-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
              <span className="text-green-400">+12.5%</span>
              <span className="text-gray-400 ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover:scale-105 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Avg. Duration</p>
                <p className="text-2xl font-bold text-purple-400">{voiceAnalytics.averageDuration}s</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Clock className="h-6 w-6 text-purple-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <Activity className="h-3 w-3 text-blue-400 mr-1" />
              <span className="text-blue-400">Optimal range</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover:scale-105 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Transcription Accuracy</p>
                <p className="text-2xl font-bold text-green-400">{voiceAnalytics.transcriptionAccuracy}%</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <FileText className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <div className="mt-2">
              <Progress value={voiceAnalytics.transcriptionAccuracy} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover:scale-105 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Sentiment Score</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {(voiceAnalytics.sentimentDistribution.Positive - voiceAnalytics.sentimentDistribution.Negative).toFixed(1)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <MessageCircle className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <span className="text-green-400">
                {voiceAnalytics.sentimentDistribution.Positive.toFixed(1)}% positive
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      {showDetails && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="sentiment" className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>Sentiment</span>
            </TabsTrigger>
            <TabsTrigger value="duration" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Duration</span>
            </TabsTrigger>
            <TabsTrigger value="topics" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Topics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recording Trends */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-teal-400" />
                    <span>Recording Trends</span>
                  </CardTitle>
                  <CardDescription>Daily recording activity over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                        <YAxis stroke="#9CA3AF" fontSize={12} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="recordings"
                          stroke="#14b8a6"
                          fill="url(#colorRecordings)"
                          strokeWidth={2}
                        />
                        <defs>
                          <linearGradient id="colorRecordings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Quality Metrics */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Volume2 className="h-5 w-5 text-teal-400" />
                    <span>Quality Metrics</span>
                  </CardTitle>
                  <CardDescription>Transcription accuracy over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                        <YAxis domain={[85, 100]} stroke="#9CA3AF" fontSize={12} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="accuracy"
                          stroke="#22c55e"
                          strokeWidth={3}
                          dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sentiment" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sentiment Distribution */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5 text-teal-400" />
                    <span>Sentiment Distribution</span>
                  </CardTitle>
                  <CardDescription>Emotional tone of voice recordings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={sentimentData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name} ${value.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {sentimentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
                                  <p className="text-white font-medium">
                                    {payload[0].name}: {typeof payload[0].value === 'number' ? payload[0].value.toFixed(1) : payload[0].value}%
                                  </p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Sentiment Breakdown */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Sentiment Details</CardTitle>
                  <CardDescription>Detailed sentiment analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sentimentData.map((item) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-gray-300 font-medium">{item.name}</span>
                        </div>
                        <Badge variant="outline" style={{ color: item.color, borderColor: item.color }}>
                          {item.value.toFixed(1)}%
                        </Badge>
                      </div>
                      <Progress value={item.value} className="h-2" />
                    </div>
                  ))}
                  
                  <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <h4 className="font-semibold text-green-400 mb-2">Positive Sentiment Insights</h4>
                    <p className="text-sm text-gray-300">
                      High positive sentiment indicates strong user engagement and satisfaction with voice features.
                      Consider leveraging this positive feedback to encourage more voice participation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="duration" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-teal-400" />
                  <span>Recording Duration Analysis</span>
                </CardTitle>
                <CardDescription>Distribution of recording lengths</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Duration Bar Chart */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={durationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="range" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Duration Statistics */}
                  <div className="space-y-4">
                    {durationData.map((item, index) => (
                      <div key={item.range} className="p-3 rounded-lg bg-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">{item.range}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{item.count}</Badge>
                            <span className="text-sm text-gray-400">{item.percentage}%</span>
                          </div>
                        </div>
                        <Progress value={item.percentage} className="h-2" />
                      </div>
                    ))}
                    
                    <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <h4 className="font-semibold text-purple-400 mb-1">Optimal Duration</h4>
                      <p className="text-sm text-gray-300">
                        30-60 second recordings provide the best balance of detail and engagement.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="topics" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-teal-400" />
                  <span>Topic Analysis</span>
                </CardTitle>
                <CardDescription>Most discussed topics in voice recordings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topicsData.map((topic, index) => {
                    const sentimentColor = topic.sentiment === 'positive' ? 'text-green-400' : 
                                         topic.sentiment === 'negative' ? 'text-red-400' : 'text-gray-400'
                    const maxMentions = Math.max(...topicsData.map(t => t.mentions))
                    const percentage = (topic.mentions / maxMentions) * 100

                    return (
                      <div key={topic.topic} className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-white">{topic.topic}</span>
                            <Badge variant="outline" className={sentimentColor}>
                              {topic.sentiment}
                            </Badge>
                          </div>
                          <span className="text-gray-400">{topic.mentions} mentions</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

export default VoiceAnalyticsChart