'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  Target, 
  Shield, 
  Zap,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { JTBDForces } from '@/lib/types'

interface JTBDChartProps {
  forces: JTBDForces
  className?: string
}

export const JTBDChart: React.FC<JTBDChartProps> = ({ forces, className }) => {
  const forceData = [
    {
      name: 'Pain of the Old',
      description: 'Friction pushing users toward change',
      value: forces.push,
      icon: TrendingUp,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      progressColor: '[&>div]:bg-red-400',
      insight: forces.push > 7 ? 'Strong driver for change' : forces.push > 5 ? 'Moderate frustration' : 'Low dissatisfaction'
    },
    {
      name: 'Pull of the New',
      description: 'Attraction to AI benefits',
      value: forces.pull,
      icon: Target,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      progressColor: '[&>div]:bg-green-400',
      insight: forces.pull > 7 ? 'High excitement for AI' : forces.pull > 5 ? 'Moderate interest' : 'Limited enthusiasm'
    },
    {
      name: 'Anchors to the Old',
      description: 'What holds people back',
      value: forces.habit,
      icon: Shield,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      progressColor: '[&>div]:bg-yellow-400',
      insight: forces.habit > 7 ? 'Strong resistance' : forces.habit > 5 ? 'Some hesitation' : 'Ready for change'
    },
    {
      name: 'Anxiety of the New',
      description: 'Concerns about switching',
      value: forces.anxiety,
      icon: Zap,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      progressColor: '[&>div]:bg-orange-400',
      insight: forces.anxiety > 7 ? 'High anxiety levels' : forces.anxiety > 5 ? 'Some concerns' : 'Confident about change'
    }
  ]

  // Calculate change momentum
  const pushPull = forces.push + forces.pull
  const habitAnxiety = forces.habit + forces.anxiety
  const momentum = pushPull - habitAnxiety
  
  const getMomentumDirection = () => {
    if (momentum > 2) return { icon: ArrowUp, color: 'text-green-400', text: 'Strong momentum for change' }
    if (momentum > 0) return { icon: ArrowUp, color: 'text-yellow-400', text: 'Positive momentum' }
    if (momentum > -2) return { icon: Minus, color: 'text-gray-400', text: 'Neutral momentum' }
    return { icon: ArrowDown, color: 'text-red-400', text: 'Resistance to change' }
  }

  const momentumData = getMomentumDirection()

  return (
    <div className={className}>
      {/* Forces Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {forceData.map((force) => (
          <Card key={force.name} className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <force.icon className={`h-5 w-5 ${force.color}`} />
                  <CardTitle className="text-sm font-medium text-white">{force.name}</CardTitle>
                </div>
                <Badge className={`${force.bgColor} ${force.color} border-current`}>
                  {force.value.toFixed(1)}/10
                </Badge>
              </div>
              <CardDescription className="text-xs">{force.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <Progress 
                  value={force.value * 10} 
                  className={`bg-gray-700 ${force.progressColor}`} 
                />
                <p className="text-xs text-gray-400">{force.insight}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Momentum Analysis */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <momentumData.icon className={`h-5 w-5 ${momentumData.color}`} />
            <span>Change Momentum</span>
          </CardTitle>
          <CardDescription>Overall readiness for AI transformation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Momentum Score */}
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Momentum Score</span>
              <div className="flex items-center space-x-2">
                <span className={`font-bold ${momentumData.color}`}>
                  {momentum > 0 ? '+' : ''}{momentum.toFixed(1)}
                </span>
                <Badge className={`${momentumData.color.replace('text-', 'bg-').replace('400', '500/20')} ${momentumData.color} border-current`}>
                  {momentumData.text}
                </Badge>
              </div>
            </div>

            {/* Force Balance Visualization */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Drivers (Push + Pull)</span>
                <span>Barriers (Habit + Anxiety)</span>
              </div>
              <div className="relative h-8 bg-gray-700 rounded-lg overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-400 via-green-400 to-green-400 opacity-80"
                  style={{ width: `${(pushPull / 20) * 100}%` }}
                />
                <div 
                  className="absolute right-0 top-0 h-full bg-gradient-to-l from-yellow-400 via-orange-400 to-orange-400 opacity-80"
                  style={{ width: `${(habitAnxiety / 20) * 100}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {pushPull.toFixed(1)} vs {habitAnxiety.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="pt-2 border-t border-gray-600">
              <h4 className="text-sm font-medium text-white mb-2">Recommendations</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                {forces.push < 5 && (
                  <li>• Focus on demonstrating current workflow pain points</li>
                )}
                {forces.pull < 6 && (
                  <li>• Showcase compelling AI success stories and benefits</li>
                )}
                {forces.habit > 6 && (
                  <li>• Address organizational inertia and change management</li>
                )}
                {forces.anxiety > 6 && (
                  <li>• Provide more training and support for AI adoption</li>
                )}
                {momentum > 2 && (
                  <li>• Strong readiness - accelerate AI implementation</li>
                )}
                {momentum < -2 && (
                  <li>• Address barriers before proceeding with AI initiatives</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}