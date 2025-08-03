'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight, 
  ArrowLeft,
  Plus,
  Minus,
  Target,
  Zap,
  Shield,
  AlertCircle,
  TrendingUp,
  Users,
  Building2,
  Lightbulb
} from 'lucide-react'

interface Force {
  id: string
  type: 'pull' | 'push' | 'anxiety' | 'habit'
  label: string
  description: string
  strength: number // 1-10
  category: 'business' | 'technical' | 'cultural' | 'strategic'
  icon: React.ComponentType<{ className?: string }>
  color: string
}

interface JTBDScenario {
  id: string
  title: string
  subtitle: string
  description: string
  currentState: string
  desiredState: string
  forces: Force[]
}

const jtbdScenarios: JTBDScenario[] = [
  {
    id: 'ai-adoption',
    title: 'AI Adoption Journey',
    subtitle: 'From Traditional to AI-Powered Organization',
    description: 'Organizations face competing forces when considering AI adoption. Understanding these dynamics helps create effective change strategies.',
    currentState: 'Traditional Operations',
    desiredState: 'AI-Enhanced Organization',
    forces: [
      {
        id: 'competitive-pressure',
        type: 'push',
        label: 'Competitive Pressure',
        description: 'Competitors are gaining advantages through AI implementation',
        strength: 8,
        category: 'business',
        icon: TrendingUp,
        color: 'red'
      },
      {
        id: 'efficiency-gains',
        type: 'pull',
        label: 'Efficiency Gains',
        description: 'Potential for significant cost savings and productivity improvements',
        strength: 9,
        category: 'business',
        icon: Zap,
        color: 'green'
      },
      {
        id: 'innovation-opportunities',
        type: 'pull',
        label: 'Innovation Opportunities',
        description: 'New products, services, and business models enabled by AI',
        strength: 7,
        category: 'strategic',
        icon: Lightbulb,
        color: 'green'
      },
      {
        id: 'technical-complexity',
        type: 'anxiety',
        label: 'Technical Complexity',
        description: 'Concerns about implementation challenges and technical debt',
        strength: 6,
        category: 'technical',
        icon: AlertCircle,
        color: 'orange'
      },
      {
        id: 'cultural-resistance',
        type: 'habit',
        label: 'Cultural Resistance',
        description: 'Existing processes and employee comfort with current systems',
        strength: 7,
        category: 'cultural',
        icon: Users,
        color: 'purple'
      },
      {
        id: 'regulatory-concerns',
        type: 'anxiety',
        label: 'Regulatory Concerns',
        description: 'Uncertainty about compliance and governance requirements',
        strength: 5,
        category: 'strategic',
        icon: Shield,
        color: 'orange'
      }
    ]
  }
]

const forceTypeConfig = {
  pull: {
    label: 'Pull Forces',
    description: 'Attractive forces drawing toward the new solution',
    color: 'green',
    gradient: 'from-green-400 to-emerald-500',
    direction: 'right'
  },
  push: {
    label: 'Push Forces',
    description: 'Forces pushing away from the current situation',
    color: 'blue',
    gradient: 'from-blue-400 to-cyan-500',
    direction: 'right'
  },
  anxiety: {
    label: 'Anxiety Forces',
    description: 'Concerns about the new solution',
    color: 'orange',
    gradient: 'from-orange-400 to-red-500',
    direction: 'left'
  },
  habit: {
    label: 'Habit Forces',
    description: 'Comfort with current situation',
    color: 'purple',
    gradient: 'from-purple-400 to-pink-500',
    direction: 'left'
  }
}

interface JTBDForceDiagramProps {
  scenarioId?: string
  className?: string
  onForceClick?: (force: Force) => void
}

export function JTBDForceDiagram({ 
  scenarioId = 'ai-adoption', 
  className,
  onForceClick 
}: JTBDForceDiagramProps) {
  const [selectedForce, setSelectedForce] = useState<Force | null>(null)
  const [animationPhase, setAnimationPhase] = useState(0)
  
  const scenario = jtbdScenarios.find(s => s.id === scenarioId) || jtbdScenarios[0]
  
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4)
    }, 3000)
    
    return () => clearInterval(timer)
  }, [])

  const pullPushForces = scenario.forces.filter(f => f.type === 'pull' || f.type === 'push')
  const anxietyHabitForces = scenario.forces.filter(f => f.type === 'anxiety' || f.type === 'habit')
  
  const totalProgress = pullPushForces.reduce((sum, f) => sum + f.strength, 0)
  const totalResistance = anxietyHabitForces.reduce((sum, f) => sum + f.strength, 0)
  const netForce = totalProgress - totalResistance
  const changeReadiness = Math.max(0, Math.min(100, ((netForce + 30) / 60) * 100))

  const ForceBar = ({ force, index, side }: { force: Force, index: number, side: 'left' | 'right' }) => {
    const config = forceTypeConfig[force.type]
    const Icon = force.icon
    const maxWidth = 200
    const width = (force.strength / 10) * maxWidth
    
    return (
      <motion.div
        key={force.id}
        initial={{ opacity: 0, x: side === 'left' ? -50 : 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1, duration: 0.6 }}
        className={`relative cursor-pointer ${side === 'left' ? 'text-right' : 'text-left'}`}
        onClick={() => {
          setSelectedForce(force)
          onForceClick?.(force)
        }}
      >
        <div className={`flex items-center space-x-3 mb-2 ${side === 'left' ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <div className={`p-2 rounded-lg bg-${config.color}-100 dark:bg-${config.color}-900/20`}>
            <Icon className={`h-4 w-4 text-${config.color}-600 dark:text-${config.color}-400`} />
          </div>
          <div>
            <p className="font-semibold text-sm">{force.label}</p>
            <p className="text-xs text-muted-foreground">{force.description}</p>
          </div>
        </div>
        
        <div className={`relative h-6 mb-4 ${side === 'left' ? 'ml-auto' : ''}`} style={{ width: `${width}px` }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${width}px` }}
            transition={{ delay: index * 0.1 + 0.5, duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full bg-gradient-to-r ${config.gradient} shadow-lg relative overflow-hidden`}
          >
            {/* Animated shine effect */}
            <motion.div
              animate={{
                x: ['100%', '-100%'],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
                delay: index * 0.2
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
          </motion.div>
          
          <Badge 
            variant="outline" 
            className={`absolute -top-8 ${side === 'left' ? 'left-0' : 'right-0'} text-xs`}
          >
            {force.strength}/10
          </Badge>
        </div>
      </motion.div>
    )
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            {scenario.title}
          </h2>
          <p className="text-lg text-muted-foreground mt-2">{scenario.subtitle}</p>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto mt-2">
            {scenario.description}
          </p>
        </motion.div>

        {/* Change Readiness Meter */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="max-w-md mx-auto"
        >
          <Card className="p-4">
            <div className="text-center mb-3">
              <p className="text-sm font-medium text-muted-foreground">Change Readiness</p>
              <p className="text-2xl font-bold gradient-text">{Math.round(changeReadiness)}%</p>
            </div>
            <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${changeReadiness}%` }}
                transition={{ delay: 1, duration: 1.2, ease: 'easeOut' }}
                className={`h-full bg-gradient-to-r ${
                  changeReadiness > 70 ? 'from-green-400 to-emerald-500' :
                  changeReadiness > 40 ? 'from-yellow-400 to-orange-500' :
                  'from-red-400 to-pink-500'
                }`}
              />
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Force Diagram */}
      <Card className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Progress Forces (Left Side) */}
          <div className="space-y-6">
            <div className="text-center lg:text-right">
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                Progress Forces
              </h3>
              <p className="text-sm text-muted-foreground">
                Forces driving change toward AI adoption
              </p>
            </div>
            
            {pullPushForces.map((force, index) => (
              <ForceBar key={force.id} force={force} index={index} side="right" />
            ))}
          </div>

          {/* Center - Current to Desired State */}
          <div className="relative">
            <div className="text-center space-y-4">
              {/* Current State */}
              <motion.div
                animate={{
                  scale: animationPhase === 0 ? 1.05 : 1,
                  borderColor: animationPhase === 0 ? 'rgb(239 68 68)' : 'rgb(156 163 175)'
                }}
                transition={{ duration: 0.5 }}
                className="p-4 rounded-lg border-2 bg-red-50 dark:bg-red-900/10"
              >
                <Building2 className="h-6 w-6 text-red-600 dark:text-red-400 mx-auto mb-2" />
                <p className="font-semibold text-sm">{scenario.currentState}</p>
              </motion.div>

              {/* Progress Arrow */}
              <motion.div
                animate={{
                  x: [0, 10, 0],
                  scale: animationPhase === 1 ? 1.2 : 1
                }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                className="flex justify-center"
              >
                <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                  <ArrowRight className="h-6 w-6 text-white" />
                </div>
              </motion.div>

              {/* Desired State */}
              <motion.div
                animate={{
                  scale: animationPhase === 2 ? 1.05 : 1,
                  borderColor: animationPhase === 2 ? 'rgb(34 197 94)' : 'rgb(156 163 175)'
                }}
                transition={{ duration: 0.5 }}
                className="p-4 rounded-lg border-2 bg-green-50 dark:bg-green-900/10"
              >
                <Target className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <p className="font-semibold text-sm">{scenario.desiredState}</p>
              </motion.div>
            </div>

            {/* Net Force Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 0.6 }}
              className={`absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center ${
                netForce > 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <div className={`p-2 rounded-full ${netForce > 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                {netForce > 0 ? (
                  <Plus className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
              </div>
              <p className="text-xs font-medium mt-1">
                Net: {netForce > 0 ? '+' : ''}{netForce}
              </p>
            </motion.div>
          </div>

          {/* Resistance Forces (Right Side) */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-2">
                Resistance Forces
              </h3>
              <p className="text-sm text-muted-foreground">
                Forces preventing or slowing change
              </p>
            </div>
            
            {anxietyHabitForces.map((force, index) => (
              <ForceBar key={force.id} force={force} index={index} side="left" />
            ))}
          </div>
        </div>
      </Card>

      {/* Force Details Modal */}
      <AnimatePresence>
        {selectedForce && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedForce(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full"
            >
              <Card className="p-6">
                <CardHeader className="p-0 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-${forceTypeConfig[selectedForce.type].color}-100 dark:bg-${forceTypeConfig[selectedForce.type].color}-900/20`}>
                      <selectedForce.icon className={`h-6 w-6 text-${forceTypeConfig[selectedForce.type].color}-600 dark:text-${forceTypeConfig[selectedForce.type].color}-400`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{selectedForce.label}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {forceTypeConfig[selectedForce.type].label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0 space-y-4">
                  <p className="text-muted-foreground">{selectedForce.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Force Strength</span>
                      <span className="font-medium">{selectedForce.strength}/10</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(selectedForce.strength / 10) * 100}%` }}
                        className={`h-full bg-gradient-to-r ${forceTypeConfig[selectedForce.type].gradient}`}
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={() => setSelectedForce(null)}
                      className="w-full"
                      variant="outline"
                    >
                      Close
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <Card className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(forceTypeConfig).map(([type, config]) => (
            <div key={type} className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded bg-gradient-to-r ${config.gradient}`} />
              <div>
                <p className="text-sm font-medium">{config.label}</p>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}