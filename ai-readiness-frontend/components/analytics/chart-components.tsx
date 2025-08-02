'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BarChart3, 
  PieChart, 
  Target,
  Users,
  Clock,
  CheckCircle
} from 'lucide-react'
import { JTBDForces } from '@/lib/types'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: React.ReactNode
  description?: string
  trend?: number[]
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType,
  icon,
  description,
  className = ''
}) => {
  const getChangeIcon = () => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-3 w-3" />
      case 'decrease':
        return <TrendingDown className="h-3 w-3" />
      default:
        return <Minus className="h-3 w-3" />
    }
  }

  const getChangeColor = () => {
    switch (changeType) {
      case 'increase':
        return 'text-green-400'
      case 'decrease':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <Card className={`glass-card border-gray-600 p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {description && (
            <p className="text-gray-500 text-xs mt-1">{description}</p>
          )}
        </div>
        <div className="ml-4">
          {icon}
        </div>
      </div>
      
      {change !== undefined && (
        <div className="mt-4">
          <div className={`flex items-center space-x-1 ${getChangeColor()}`}>
            {getChangeIcon()}
            <span className="text-sm font-medium">
              {change > 0 ? '+' : ''}{change}%
            </span>
            <span className="text-gray-400 text-sm">vs last period</span>
          </div>
        </div>
      )}
    </Card>
  )
}

interface JTBDRadarChartProps {
  forces: JTBDForces
  className?: string
}

export const JTBDRadarChart: React.FC<JTBDRadarChartProps> = ({
  forces,
  className = ''
}) => {
  const maxValue = 5
  const center = 100
  const radius = 80

  const getPoint = (angle: number, value: number) => {
    const radian = (angle * Math.PI) / 180
    const distance = (value / maxValue) * radius
    return {
      x: center + distance * Math.cos(radian - Math.PI / 2),
      y: center + distance * Math.sin(radian - Math.PI / 2)
    }
  }

  const forceData = [
    { name: 'Push', value: forces.push, angle: 0, color: '#ef4444' },
    { name: 'Pull', value: forces.pull, angle: 90, color: '#22c55e' },
    { name: 'Anxiety', value: forces.anxiety, angle: 180, color: '#f59e0b' },
    { name: 'Habit', value: forces.habit, angle: 270, color: '#8b5cf6' }
  ]

  const pathData = forceData
    .map((force, index) => {
      const point = getPoint(force.angle, force.value)
      return index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    })
    .join(' ') + ' Z'

  return (
    <Card className={`glass-card border-gray-600 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">JTBD Forces</h3>
        <Target className="h-5 w-5 text-teal-400" />
      </div>
      
      <div className="relative">
        <svg width="200" height="200" className="mx-auto">
          {/* Background circles */}
          {[1, 2, 3, 4, 5].map(level => (
            <circle
              key={level}
              cx={center}
              cy={center}
              r={(level / maxValue) * radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />
          ))}
          
          {/* Axes */}
          {forceData.map(force => {
            const point = getPoint(force.angle, maxValue)
            return (
              <line
                key={force.name}
                x1={center}
                y1={center}
                x2={point.x}
                y2={point.y}
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1"
              />
            )
          })}
          
          {/* Data area */}
          <path
            d={pathData}
            fill="rgba(20, 184, 166, 0.2)"
            stroke="rgba(20, 184, 166, 0.8)"
            strokeWidth="2"
          />
          
          {/* Data points */}
          {forceData.map(force => {
            const point = getPoint(force.angle, force.value)
            return (
              <circle
                key={force.name}
                cx={point.x}
                cy={point.y}
                r="4"
                fill={force.color}
                stroke="white"
                strokeWidth="2"
              />
            )
          })}
          
          {/* Labels */}
          {forceData.map(force => {
            const labelPoint = getPoint(force.angle, maxValue + 0.3)
            return (
              <text
                key={force.name}
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-gray-300 text-xs font-medium"
              >
                {force.name}
              </text>
            )
          })}
        </svg>
        
        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {forceData.map(force => (
            <div key={force.name} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: force.color }}
              />
              <span className="text-gray-300 text-sm">
                {force.name}: {force.value.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

interface DepartmentBreakdownProps {
  departmentData: Record<string, number>
  totalResponses: number
  className?: string
}

export const DepartmentBreakdown: React.FC<DepartmentBreakdownProps> = ({
  departmentData,
  totalResponses,
  className = ''
}) => {
  const sortedDepartments = Object.entries(departmentData)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8) // Show top 8 departments

  const colors = [
    '#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b',
    '#ef4444', '#22c55e', '#f97316', '#6366f1'
  ]

  return (
    <Card className={`glass-card border-gray-600 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Department Distribution</h3>
        <PieChart className="h-5 w-5 text-teal-400" />
      </div>
      
      <div className="space-y-4">
        {sortedDepartments.map(([dept, count], index) => {
          const percentage = (count / totalResponses) * 100
          return (
            <div key={dept} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="text-gray-300 text-sm font-medium">{dept}</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-medium">{count}</span>
                  <span className="text-gray-400 text-sm ml-1">
                    ({percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <Progress 
                value={percentage} 
                className="h-2"
                style={{
                  '--progress-background': colors[index % colors.length]
                } as React.CSSProperties}
              />
            </div>
          )
        })}
      </div>
    </Card>
  )
}

interface CompletionTrendProps {
  data: Array<{ date: string; completed: number; total: number }>
  className?: string
}

export const CompletionTrend: React.FC<CompletionTrendProps> = ({
  data,
  className = ''
}) => {
  const maxTotal = Math.max(...data.map(d => d.total))
  const chartHeight = 120
  const chartWidth = 300

  return (
    <Card className={`glass-card border-gray-600 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Completion Trend</h3>
        <BarChart3 className="h-5 w-5 text-teal-400" />
      </div>
      
      <div className="relative">
        <svg width={chartWidth} height={chartHeight} className="mx-auto">
          {/* Background grid */}
          {[0.25, 0.5, 0.75, 1].map(level => (
            <line
              key={level}
              x1={0}
              y1={chartHeight * level}
              x2={chartWidth}
              y2={chartHeight * level}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />
          ))}
          
          {/* Bars */}
          {data.map((item, index) => {
            const barWidth = chartWidth / data.length - 10
            const x = (index * chartWidth) / data.length + 5
            const totalHeight = (item.total / maxTotal) * chartHeight
            const completedHeight = (item.completed / maxTotal) * chartHeight
            
            return (
              <g key={item.date}>
                {/* Total bar */}
                <rect
                  x={x}
                  y={chartHeight - totalHeight}
                  width={barWidth}
                  height={totalHeight}
                  fill="rgba(255, 255, 255, 0.1)"
                  rx="2"
                />
                {/* Completed bar */}
                <rect
                  x={x}
                  y={chartHeight - completedHeight}
                  width={barWidth}
                  height={completedHeight}
                  fill="#14b8a6"
                  rx="2"
                />
                {/* Date label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 15}
                  textAnchor="middle"
                  className="fill-gray-400 text-xs"
                >
                  {new Date(item.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </text>
              </g>
            )
          })}
        </svg>
        
        {/* Legend */}
        <div className="flex items-center justify-center space-x-4 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-teal-500 rounded" />
            <span className="text-gray-300 text-sm">Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-white/10 rounded" />
            <span className="text-gray-300 text-sm">Total</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

interface ResponseTimeDistributionProps {
  timeRanges: Record<string, number>
  className?: string
}

export const ResponseTimeDistribution: React.FC<ResponseTimeDistributionProps> = ({
  timeRanges,
  className = ''
}) => {
  const total = Object.values(timeRanges).reduce((sum, count) => sum + count, 0)
  
  return (
    <Card className={`glass-card border-gray-600 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Response Time Distribution</h3>
        <Clock className="h-5 w-5 text-teal-400" />
      </div>
      
      <div className="space-y-3">
        {Object.entries(timeRanges).map(([range, count]) => {
          const percentage = total > 0 ? (count / total) * 100 : 0
          return (
            <div key={range} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">{range}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">{count}</span>
                  <Badge variant="outline" className="text-xs">
                    {percentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// Summary stats component
interface SummaryStatsProps {
  stats: {
    totalSurveys: number
    totalResponses: number
    averageCompletion: number
    activeUsers: number
  }
  className?: string
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({
  stats,
  className = ''
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <MetricCard
        title="Total Surveys"
        value={stats.totalSurveys}
        icon={<BarChart3 className="h-8 w-8 text-teal-400" />}
        change={5.2}
        changeType="increase"
      />
      <MetricCard
        title="Total Responses"
        value={stats.totalResponses.toLocaleString()}
        icon={<Users className="h-8 w-8 text-blue-400" />}
        change={12.1}
        changeType="increase"
      />
      <MetricCard
        title="Avg. Completion"
        value={`${stats.averageCompletion.toFixed(1)}%`}
        icon={<CheckCircle className="h-8 w-8 text-green-400" />}
        change={-2.3}
        changeType="decrease"
      />
      <MetricCard
        title="Active Users"
        value={stats.activeUsers}
        icon={<Target className="h-8 w-8 text-purple-400" />}
        change={0}
        changeType="neutral"
      />
    </div>
  )
}