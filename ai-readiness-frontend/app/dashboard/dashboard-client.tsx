'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { Button, Card, CardHeader, CardTitle, CardContent, StatsCard, CircularProgress, Progress } from '@/components/ui'
import { AnimatedCounter } from '@/components/ui/whimsy'
import { Brain, Users, TrendingUp, Clock, CheckCircle2, BarChart3, Sparkles, Trophy, Zap } from 'lucide-react'

interface DashboardClientProps {
  user: any
}

export function DashboardClient({ user }: DashboardClientProps) {
  return (
    <MainLayout user={user} currentPath="/dashboard">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center space-x-3">
            <h1 className="text-4xl font-bold gradient-text">
              AI Readiness Dashboard
            </h1>
            <Sparkles className="h-8 w-8 text-yellow-400 animate-pulse" />
          </div>
          <p className="text-muted-foreground text-lg">
            Welcome back, {user.profile?.firstName}! Here&apos;s your organization&apos;s AI readiness overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="animate-fade-in animation-delay-100">
            <StatsCard
              title="Total Surveys"
              value={<AnimatedCounter value={247} duration={2000} />}
              description="Active assessments"
              icon={Brain}
              className="stats-card-hover"
              trend={{
                value: 12,
                label: "vs last month",
                direction: "up"
              }}
            />
          </div>
          <div className="animate-fade-in animation-delay-200">
            <StatsCard
              title="Completion Rate"
              value={<AnimatedCounter value={89} suffix="%" duration={2000} />}
              description="Survey completions"
              icon={CheckCircle2}
              className="stats-card-hover"
              trend={{
                value: 5,
                label: "improvement",
                direction: "up"
              }}
            />
          </div>
          <div className="animate-fade-in animation-delay-300">
            <StatsCard
              title="Active Users"
              value={<AnimatedCounter value={156} duration={2000} />}
              description="Organization members"
              icon={Users}
              className="stats-card-hover"
              trend={{
                value: 8,
                label: "new this week",
                direction: "up"
              }}
            />
          </div>
          <div className="animate-fade-in animation-delay-400">
            <StatsCard
              title="Avg. Time"
              value={<AnimatedCounter value={18} suffix=" min" duration={2000} />}
              description="Per assessment"
              icon={Clock}
              className="stats-card-hover"
              trend={{
                value: 2,
                label: "faster",
                direction: "down"
              }}
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Readiness Score */}
          <Card variant="glass" className="lg:col-span-1 animate-fade-in animation-delay-500 whimsy-hover">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-teal-400 animate-pulse" />
                <span>Overall AI Readiness</span>
                <Trophy className="h-4 w-4 text-yellow-400" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="celebrate-bounce">
                <CircularProgress
                  value={73}
                  size={140}
                  strokeWidth={10}
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Your organization shows <span className="text-teal-400 font-medium animate-pulse">strong readiness</span> for AI adoption
                </p>
                <Button variant="outline" size="sm" className="wobble-on-hover">
                  View Detailed Analysis
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card variant="glass" className="lg:col-span-2 animate-fade-in animation-delay-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-purple-400 animate-pulse" />
                <span>JTBD Forces Analysis</span>
                <Zap className="h-4 w-4 text-yellow-400" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Force indicators */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Pull of New Solutions</span>
                    <span className="text-teal-400">8.2/10</span>
                  </div>
                  <Progress value={82} variant="gradient" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Pain of Current State</span>
                    <span className="text-orange-400">7.1/10</span>
                  </div>
                  <Progress value={71} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Anxiety of Change</span>
                    <span className="text-red-400">4.8/10</span>
                  </div>
                  <Progress value={48} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Anchor to Current</span>
                    <span className="text-blue-400">3.9/10</span>
                  </div>
                  <Progress value={39} />
                </div>
              </div>

              <div className="pt-4 border-t border-border/40">
                <Button variant="secondary" className="w-full">
                  Generate Detailed Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="animate-fade-in animation-delay-100">
            <Card variant="interactive" className="cursor-pointer whimsy-hover">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 transition-all duration-300 hover:scale-110">
                    <Brain className="h-6 w-6 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Take Assessment</h3>
                    <p className="text-sm text-muted-foreground">
                      Start your AI readiness survey
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in animation-delay-200">
            <Card variant="interactive" className="cursor-pointer whimsy-hover">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 transition-all duration-300 hover:scale-110">
                    <Users className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Team Analytics</h3>
                    <p className="text-sm text-muted-foreground">
                      View organization insights
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in animation-delay-300">
            <Card variant="interactive" className="cursor-pointer whimsy-hover">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/20 transition-all duration-300 hover:scale-110">
                    <BarChart3 className="h-6 w-6 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Export Reports</h3>
                    <p className="text-sm text-muted-foreground">
                      Download analysis data
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}