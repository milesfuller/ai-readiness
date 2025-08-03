'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Brain,
  Users,
  Database,
  Shield,
  Lightbulb,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Zap,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'

// Sample data for different visualization types
const readinessData = [
  { category: 'Technology', score: 75, benchmark: 68, potential: 85 },
  { category: 'Data & Analytics', score: 82, benchmark: 71, potential: 90 },
  { category: 'Culture & People', score: 68, benchmark: 65, potential: 78 },
  { category: 'Strategy', score: 85, benchmark: 73, potential: 92 },
  { category: 'Governance', score: 58, benchmark: 62, potential: 75 }
]

const maturityEvolution = [
  { month: 'Jan', technology: 45, data: 50, culture: 35, strategy: 40, governance: 30 },
  { month: 'Feb', technology: 52, data: 58, culture: 42, strategy: 48, governance: 35 },
  { month: 'Mar', technology: 61, data: 65, culture: 48, strategy: 55, governance: 42 },
  { month: 'Apr', technology: 68, data: 72, culture: 55, strategy: 65, governance: 48 },
  { month: 'May', technology: 73, data: 78, culture: 62, strategy: 78, governance: 52 },
  { month: 'Jun', technology: 75, data: 82, culture: 68, strategy: 85, governance: 58 }
]

const implementationReadiness = [
  { name: 'Process Automation', readiness: 85, impact: 92, effort: 45 },
  { name: 'Predictive Analytics', readiness: 75, impact: 88, effort: 65 },
  { name: 'Customer Intelligence', readiness: 70, impact: 85, effort: 70 },
  { name: 'Risk Management', readiness: 68, impact: 78, effort: 55 },
  { name: 'Innovation Labs', readiness: 45, impact: 95, effort: 85 }
]

const organizationalDistribution = [
  { name: 'Champions', value: 25, color: '#10b981' },
  { name: 'Supporters', value: 35, color: '#3b82f6' },
  { name: 'Neutral', value: 30, color: '#f59e0b' },
  { name: 'Skeptics', value: 10, color: '#ef4444' }
]

interface ChartCardProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    timeframe: string
  }
  className?: string
}

function ChartCard({ title, description, icon: Icon, children, trend, className }: ChartCardProps) {
  const getTrendIcon = () => {
    if (trend?.direction === 'up') return ArrowUpRight
    if (trend?.direction === 'down') return ArrowDownRight
    return Minus
  }

  const getTrendColor = () => {
    if (trend?.direction === 'up') return 'text-green-500'
    if (trend?.direction === 'down') return 'text-red-500'
    return 'text-gray-500'
  }

  const TrendIcon = getTrendIcon()
  const trendColor = getTrendColor()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/50 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            
            {trend && (
              <div className={`flex items-center space-x-1 ${trendColor}`}>
                <TrendIcon className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {trend.direction === 'up' && '+'}
                  {trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {trend.timeframe}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Custom Tooltip component for better storytelling
function CustomTooltip({ active, payload, label, story }: any) {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background border border-border rounded-lg shadow-lg p-4 max-w-xs"
      >
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">
              {entry.name}: <span className="font-medium">{entry.value}</span>
            </span>
          </div>
        ))}
        {story && (
          <p className="text-xs text-muted-foreground mt-2 italic">
            {story}
          </p>
        )}
      </motion.div>
    )
  }
  return null
}

// Animated number counter
function AnimatedNumber({ value, duration = 2000, suffix = '' }: { value: number, duration?: number, suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let start = 0
    const increment = value / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value, duration])

  return <span>{displayValue}{suffix}</span>
}

interface DataVisualizationProps {
  className?: string
  interactive?: boolean
}

export function DataVisualization({ className, interactive = true }: DataVisualizationProps) {
  const [activeChart, setActiveChart] = useState('overview')
  const [animationPhase, setAnimationPhase] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4)
    }, 3000)
    
    return () => clearInterval(timer)
  }, [])

  const chartTypes = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'readiness', label: 'Readiness', icon: Target },
    { id: 'distribution', label: 'Culture', icon: Users }
  ]

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Chart Navigation */}
      {interactive && (
        <div className="flex justify-center">
          <div className="flex space-x-2 p-2 bg-muted/50 rounded-lg">
            {chartTypes.map((chart) => {
              const Icon = chart.icon
              return (
                <motion.button
                  key={chart.id}
                  onClick={() => setActiveChart(chart.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    activeChart === chart.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'hover:bg-muted-foreground/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{chart.label}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Key Metrics Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            <AnimatedNumber value={76} suffix="%" />
          </div>
          <div className="text-sm text-muted-foreground">Overall Readiness</div>
        </Card>
        
        <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            <AnimatedNumber value={12} suffix="%" />
          </div>
          <div className="text-sm text-muted-foreground">Month Growth</div>
        </Card>
        
        <Card className="p-4 text-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            <AnimatedNumber value={5} />
          </div>
          <div className="text-sm text-muted-foreground">Ready Initiatives</div>
        </Card>
        
        <Card className="p-4 text-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            <AnimatedNumber value={88} suffix="%" />
          </div>
          <div className="text-sm text-muted-foreground">Team Engagement</div>
        </Card>
      </motion.div>

      {/* Main Chart Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeChart}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
        >
          {activeChart === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard
                title="AI Readiness Radar"
                description="Current position across all dimensions"
                icon={Target}
                trend={{ value: 8, direction: 'up', timeframe: '30d' }}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={readinessData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" className="text-xs" />
                    <PolarRadiusAxis domain={[0, 100]} className="text-xs" />
                    <Radar
                      name="Your Score"
                      dataKey="score"
                      stroke="#14b8a6"
                      fill="#14b8a6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Industry Benchmark"
                      dataKey="benchmark"
                      stroke="#8b5cf6"
                      fill="transparent"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                    <Radar
                      name="Potential"
                      dataKey="potential"
                      stroke="#f59e0b"
                      fill="transparent"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Implementation Readiness"
                description="Readiness vs impact analysis"
                icon={Lightbulb}
                trend={{ value: 15, direction: 'up', timeframe: '30d' }}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={implementationReadiness}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="readiness"
                      stackId="1"
                      stroke="#14b8a6"
                      fill="#14b8a6"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="impact"
                      stackId="2"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          {activeChart === 'trends' && (
            <ChartCard
              title="Maturity Evolution"
              description="6-month progress across all dimensions"
              icon={TrendingUp}
              trend={{ value: 23, direction: 'up', timeframe: '6m' }}
              className="w-full"
            >
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={maturityEvolution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="technology"
                    stroke="#14b8a6"
                    strokeWidth={3}
                    dot={{ fill: '#14b8a6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#14b8a6', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="data"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="culture"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="strategy"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="governance"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {activeChart === 'readiness' && (
            <ChartCard
              title="Capability Comparison"
              description="Your scores vs industry benchmarks"
              icon={Target}
              trend={{ value: 5, direction: 'up', timeframe: '30d' }}
              className="w-full"
            >
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={readinessData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="score" fill="#14b8a6" name="Your Score" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="benchmark" fill="#8b5cf6" name="Industry Benchmark" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="potential" fill="#f59e0b" name="Potential" radius={[4, 4, 0, 0]} fillOpacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {activeChart === 'distribution' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard
                title="Cultural Adoption"
                description="Employee sentiment distribution"
                icon={Users}
                trend={{ value: 12, direction: 'up', timeframe: '30d' }}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={organizationalDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {organizationalDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Engagement Story"
                description="The journey of organizational change"
                icon={Brain}
              >
                <div className="space-y-4">
                  {organizationalDistribution.map((segment, index) => (
                    <motion.div
                      key={segment.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30"
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{segment.name}</span>
                          <span className="text-sm text-muted-foreground">{segment.value}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {segment.name === 'Champions' && 'Actively driving AI initiatives'}
                          {segment.name === 'Supporters' && 'Supportive but need guidance'}
                          {segment.name === 'Neutral' && 'Wait-and-see attitude'}
                          {segment.name === 'Skeptics' && 'Concerns about AI adoption'}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ChartCard>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Insights Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <Card className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <div className="flex items-start space-x-4">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Key Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span>Strategy shows strongest performance vs benchmarks</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    <span>Data & Analytics has highest growth potential</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span>60% of organization ready for AI initiatives</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-orange-500" />
                    <span>Process Automation shows highest implementation readiness</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}