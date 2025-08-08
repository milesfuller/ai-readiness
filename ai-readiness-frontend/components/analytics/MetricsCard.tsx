'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface Trend {
  value: number
  label: string
  direction: 'up' | 'down' | 'neutral'
}

interface MetricsCardProps {
  title: string
  value: string | number | React.ReactNode
  description?: string
  icon: LucideIcon
  trend?: Trend
  variant?: 'default' | 'chart' | 'progress' | 'comparison'
  progress?: number
  comparisonValue?: string | number
  loading?: boolean
  className?: string
  animated?: boolean
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = 'default',
  progress,
  comparisonValue,
  loading = false,
  className = '',
  animated = true
}) => {
  const getTrendIcon = () => {
    switch (trend?.direction) {
      case 'up':
        return '↗'
      case 'down':
        return '↘'
      default:
        return '→'
    }
  }

  const getTrendColor = () => {
    switch (trend?.direction) {
      case 'up':
        return 'text-green-400'
      case 'down':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  if (loading) {
    return (
      <Card className={cn("glass-card group transition-all duration-300 hover:scale-[1.02]", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-32 bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-12 w-12 bg-gray-700 rounded-lg animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "glass-card group transition-all duration-300 hover:scale-[1.02] hover:glow-teal overflow-hidden", 
      className
    )}>
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between">
          <div className={cn("space-y-1 flex-1", animated && "animate-fade-in-up")}>
            <p className="text-sm font-medium text-gray-400 transition-colors duration-200 group-hover:text-teal-300">
              {title}
            </p>
            <div className="text-3xl font-bold gradient-text transition-all duration-300 group-hover:scale-105">
              {value}
            </div>
            {description && (
              <p className="text-xs text-gray-500 transition-colors duration-200 group-hover:text-gray-400">
                {description}
              </p>
            )}
          </div>
          
          <div className={cn(
            "ml-4 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 transition-all duration-300",
            "group-hover:bg-teal-500/20 group-hover:border-teal-500/40 group-hover:shadow-lg group-hover:shadow-teal-500/20"
          )}>
            <Icon className="h-6 w-6 text-teal-400 transition-all duration-300 group-hover:text-teal-300 group-hover:scale-110" />
          </div>
        </div>

        {/* Progress bar for progress variant */}
        {variant === 'progress' && progress !== undefined && (
          <div className={cn("mt-4 space-y-2", animated && "animate-fade-in-up")}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Progress</span>
              <span className="text-white font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Comparison value for comparison variant */}
        {variant === 'comparison' && comparisonValue && (
          <div className={cn("mt-4 flex items-center justify-between", animated && "animate-fade-in-up")}>
            <span className="text-sm text-gray-400">vs Previous</span>
            <Badge variant="outline" className="text-purple-400 border-purple-400/50">
              {comparisonValue}
            </Badge>
          </div>
        )}

        {/* Trend indicator */}
        {trend && (
          <div className={cn(
            "mt-4 flex items-center space-x-2",
            animated && "animate-fade-in-up"
          )}>
            <div className={cn(
              "flex items-center text-sm font-medium transition-all duration-200",
              getTrendColor()
            )}>
              <span className="text-base mr-1">{getTrendIcon()}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
            <span className="text-xs text-gray-400 transition-colors duration-200">
              {trend.label}
            </span>
          </div>
        )}

        {/* Chart placeholder for chart variant */}
        {variant === 'chart' && (
          <div className={cn("mt-4 h-16 flex items-end space-x-1", animated && "animate-fade-in-up")}>
            {/* Mini chart bars */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-teal-500/30 to-teal-500/10 rounded-sm transition-all duration-300 hover:from-teal-500/50 hover:to-teal-500/20"
                style={{
                  height: `${Math.random() * 60 + 20}%`,
                  animationDelay: `${i * 50}ms`
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Specialized metric cards for different data types

interface VoiceMetricsCardProps {
  totalRecordings: number
  averageDuration: number
  transcriptionAccuracy: number
  className?: string
}

export const VoiceMetricsCard: React.FC<VoiceMetricsCardProps> = ({
  totalRecordings,
  averageDuration,
  transcriptionAccuracy,
  className = ''
}) => {
  return (
    <Card className={cn("glass-card group hover:scale-[1.02] transition-all duration-300", className)}>
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <span>🎤</span>
          <span>Voice Analytics</span>
        </CardTitle>
        <CardDescription>Voice recording insights</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-teal-400">{totalRecordings}</div>
            <div className="text-xs text-gray-400">Recordings</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-purple-400">{averageDuration}s</div>
            <div className="text-xs text-gray-400">Avg Duration</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-400">{transcriptionAccuracy}%</div>
            <div className="text-xs text-gray-400">Accuracy</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Transcription Quality</span>
            <span className="text-white">{transcriptionAccuracy}%</span>
          </div>
          <Progress value={transcriptionAccuracy} className="h-2" />
        </div>
      </CardContent>
    </Card>
  )
}

interface JTBDMetricsCardProps {
  forces: {
    push: number
    pull: number
    habit: number
    anxiety: number
  }
  className?: string
}

export const JTBDMetricsCard: React.FC<JTBDMetricsCardProps> = ({
  forces,
  className = ''
}) => {
  const forceData = [
    { name: 'Push', value: forces.push, color: 'text-red-400', bg: 'bg-red-500/20' },
    { name: 'Pull', value: forces.pull, color: 'text-green-400', bg: 'bg-green-500/20' },
    { name: 'Habit', value: forces.habit, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    { name: 'Anxiety', value: forces.anxiety, color: 'text-orange-400', bg: 'bg-orange-500/20' }
  ]

  return (
    <Card className={cn("glass-card group hover:scale-[1.02] transition-all duration-300", className)}>
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <span>🎯</span>
          <span>JTBD Forces</span>
        </CardTitle>
        <CardDescription>Jobs-to-be-Done analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {forceData.map((force, index) => (
            <div key={force.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">{force.name}</span>
                <Badge variant="outline" className={cn("text-xs", force.color)}>
                  {force.value.toFixed(1)}/10
                </Badge>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={cn("h-2 rounded-full transition-all duration-500", force.bg)}
                  style={{ width: `${(force.value / 10) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default MetricsCard