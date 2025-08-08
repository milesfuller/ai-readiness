'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Target, TrendingUp, AlertTriangle, Zap, Shield } from 'lucide-react'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from 'recharts'

interface JTBDForces {
  push: number
  pull: number
  habit: number
  anxiety: number
}

interface JTBDAnalyticsChartProps {
  forces: JTBDForces
  className?: string
  showInsights?: boolean
  variant?: 'radar' | 'bar' | 'both'
}

export const JTBDAnalyticsChart: React.FC<JTBDAnalyticsChartProps> = ({
  forces,
  className = '',
  showInsights = true,
  variant = 'both'
}) => {
  // Prepare data for charts
  const radarData = [
    { force: 'Push', value: forces.push, fullMark: 10 },
    { force: 'Pull', value: forces.pull, fullMark: 10 },
    { force: 'Habit', value: forces.habit, fullMark: 10 },
    { force: 'Anxiety', value: forces.anxiety, fullMark: 10 }
  ]

  const barData = [
    { name: 'Push Forces', value: forces.push, color: '#ef4444', icon: '⚡' },
    { name: 'Pull Forces', value: forces.pull, color: '#22c55e', icon: '🎯' },
    { name: 'Habit Forces', value: forces.habit, color: '#f59e0b', icon: '🔄' },
    { name: 'Anxiety Forces', value: forces.anxiety, color: '#f97316', icon: '⚠️' }
  ]

  // Calculate insights
  const strongestForce = Object.entries(forces).reduce((a, b) => forces[a[0] as keyof JTBDForces] > forces[b[0] as keyof JTBDForces] ? a : b)
  const weakestForce = Object.entries(forces).reduce((a, b) => forces[a[0] as keyof JTBDForces] < forces[b[0] as keyof JTBDForces] ? a : b)
  const averageForce = (forces.push + forces.pull + forces.habit + forces.anxiety) / 4
  
  // Adoption likelihood based on forces balance
  const adoptionScore = (forces.push + forces.pull) - (forces.habit + forces.anxiety)
  const adoptionLikelihood = Math.max(0, Math.min(100, (adoptionScore / 20 + 0.5) * 100))

  const getForceDescription = (forceName: string) => {
    const descriptions = {
      push: 'Problems and frustrations with current solutions that push users away',
      pull: 'Benefits and outcomes that attract users to new solutions',
      habit: 'Existing habits and comfort with current ways of working',
      anxiety: 'Concerns, fears, and uncertainties about adopting new solutions'
    }
    return descriptions[forceName.toLowerCase() as keyof typeof descriptions] || ''
  }

  const getForceIcon = (forceName: string) => {
    const icons = {
      push: <AlertTriangle className="h-5 w-5 text-red-400" />,
      pull: <Target className="h-5 w-5 text-green-400" />,
      habit: <TrendingUp className="h-5 w-5 text-yellow-400" />,
      anxiety: <Shield className="h-5 w-5 text-orange-400" />
    }
    return icons[forceName.toLowerCase() as keyof typeof icons] || <Zap className="h-5 w-5" />
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{`${label}: ${payload[0].value.toFixed(1)}/10`}</p>
          <p className="text-gray-400 text-sm">{getForceDescription(label)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        {(variant === 'radar' || variant === 'both') && (
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-teal-400" />
                  <CardTitle>JTBD Forces Radar</CardTitle>
                </div>
                <Badge variant="outline" className="text-teal-400 border-teal-400/50">
                  Balance: {adoptionScore.toFixed(1)}
                </Badge>
              </div>
              <CardDescription>Visual representation of adoption forces</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis 
                      dataKey="force" 
                      tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                    />
                    <PolarRadiusAxis 
                      domain={[0, 10]}
                      tick={{ fill: '#9CA3AF', fontSize: 10 }}
                      angle={90}
                    />
                    <Radar
                      name="Forces"
                      dataKey="value"
                      stroke="#14b8a6"
                      fill="#14b8a6"
                      fillOpacity={0.3}
                      strokeWidth={3}
                      dot={{ fill: '#14b8a6', strokeWidth: 2, r: 4 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {radarData.map((item) => (
                  <div key={item.force} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <div className="flex items-center space-x-2">
                      {getForceIcon(item.force)}
                      <span className="text-sm font-medium text-gray-300">{item.force}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {item.value.toFixed(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bar Chart */}
        {(variant === 'bar' || variant === 'both') && (
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-teal-400" />
                <CardTitle>Force Intensity</CardTitle>
              </div>
              <CardDescription>Comparative strength of each force</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" domain={[0, 10]} stroke="#9CA3AF" />
                    <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={100} />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
                              <p className="text-white font-medium">{`${label}: ${payload[0].value}/10`}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Force Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(forces).map(([forceName, value]) => {
          const forceConfig = {
            push: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
            pull: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
            habit: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
            anxiety: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' }
          }[forceName as keyof typeof forces]

          return (
            <Card key={forceName} className={cn("glass-card hover:scale-105 transition-all duration-300", forceConfig?.border)}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getForceIcon(forceName)}
                      <h4 className="font-semibold text-white capitalize">{forceName} Forces</h4>
                    </div>
                    <Badge variant="outline" className={forceConfig?.color}>
                      {value.toFixed(1)}/10
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-gray-400">
                    {getForceDescription(forceName)}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={cn("h-2 rounded-full transition-all duration-500", forceConfig?.bg)}
                        style={{ width: `${(value / 10) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Weak</span>
                      <span className="text-gray-500">Strong</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Insights Panel */}
      {showInsights && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-teal-400" />
              <span>AI-Powered Insights</span>
            </CardTitle>
            <CardDescription>Analysis and recommendations based on JTBD forces</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Adoption Likelihood */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-teal-500/10 to-purple-500/10 border border-teal-500/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-white">Adoption Likelihood</h4>
                <Badge variant="outline" className={cn(
                  adoptionLikelihood > 70 ? "text-green-400 border-green-400/50" :
                  adoptionLikelihood > 40 ? "text-yellow-400 border-yellow-400/50" :
                  "text-red-400 border-red-400/50"
                )}>
                  {adoptionLikelihood.toFixed(1)}%
                </Badge>
              </div>
              <Progress value={adoptionLikelihood} className="h-2 mb-2" />
              <p className="text-sm text-gray-400">
                {adoptionLikelihood > 70 
                  ? "High likelihood of successful adoption. Strong pull and push forces overcome resistance."
                  : adoptionLikelihood > 40
                  ? "Moderate adoption potential. Consider addressing habit and anxiety forces."
                  : "Low adoption likelihood. Focus on increasing pull forces and reducing barriers."
                }
              </p>
            </div>

            {/* Key Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/5">
                <h4 className="font-semibold text-white mb-2">Strongest Force</h4>
                <div className="flex items-center space-x-2 mb-1">
                  {getForceIcon(strongestForce[0])}
                  <span className="text-teal-400 font-medium capitalize">{strongestForce[0]} Forces</span>
                  <Badge variant="outline">{strongestForce[1].toFixed(1)}/10</Badge>
                </div>
                <p className="text-sm text-gray-400">
                  This is your primary driver. Leverage this force in your strategy.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-white/5">
                <h4 className="font-semibold text-white mb-2">Improvement Area</h4>
                <div className="flex items-center space-x-2 mb-1">
                  {getForceIcon(weakestForce[0])}
                  <span className="text-orange-400 font-medium capitalize">{weakestForce[0]} Forces</span>
                  <Badge variant="outline">{weakestForce[1].toFixed(1)}/10</Badge>
                </div>
                <p className="text-sm text-gray-400">
                  Address this area to improve overall adoption success.
                </p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <h4 className="font-semibold text-white mb-3">Strategic Recommendations</h4>
              <div className="space-y-2">
                {forces.pull < 6 && (
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-gray-300">
                      <strong>Enhance Pull Forces:</strong> Highlight key benefits and positive outcomes to increase attraction to the solution.
                    </p>
                  </div>
                )}
                {forces.push < 6 && (
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-gray-300">
                      <strong>Address Push Forces:</strong> Identify and articulate current pain points more clearly to create urgency.
                    </p>
                  </div>
                )}
                {forces.habit > 6 && (
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-gray-300">
                      <strong>Reduce Habit Resistance:</strong> Provide easy migration paths and maintain familiar workflows where possible.
                    </p>
                  </div>
                )}
                {forces.anxiety > 6 && (
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-gray-300">
                      <strong>Reduce Anxiety:</strong> Provide training, support, and clear success stories to build confidence.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default JTBDAnalyticsChart