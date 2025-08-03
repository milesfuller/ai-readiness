"use client"

import * as React from "react"
import { Button } from "./button"
import { Input } from "./input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, StatsCard } from "./card"
import { Progress, CircularProgress, StepProgress } from "./progress"
import { User, Mail, Lock, TrendingUp, Users, Activity } from "lucide-react"

// Component to showcase all enhanced UI features
export function UIShowcase() {
  const [inputValue, setInputValue] = React.useState("")
  const [progress, setProgress] = React.useState(65)
  
  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(85), 2000)
    return () => clearTimeout(timer)
  }, [])

  const steps = [
    { label: "Account", description: "Create your account", completed: true },
    { label: "Profile", description: "Set up your profile", completed: true },
    { label: "Preferences", description: "Configure settings", current: true },
    { label: "Complete", description: "All done!", completed: false },
  ]

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <Card variant="glass" shimmer className="p-8">
        <CardHeader animated>
          <CardTitle gradient size="xl">Enhanced UI Components</CardTitle>
          <CardDescription animated>
            Showcasing modern design patterns with animations and micro-interactions
          </CardDescription>
        </CardHeader>
        
        <CardContent animated spacing="loose">
          {/* Button Variations */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold gradient-text-teal">Enhanced Buttons</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="default" size="lg">
                Primary Action
              </Button>
              <Button variant="secondary" size="lg">
                Secondary
              </Button>
              <Button variant="glass" size="lg">
                Glass Effect
              </Button>
              <Button variant="shimmer" size="lg">
                Shimmer Effect
              </Button>
              <Button variant="outline" size="lg" leftIcon={User}>
                With Icon
              </Button>
              <Button loading loadingText="Processing...">
                Loading State
              </Button>
            </div>
          </section>

          {/* Input Variations */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold gradient-text-purple">Enhanced Inputs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                leftIcon={Mail}
                clearable
                onClear={() => setInputValue("")}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                success={inputValue.includes("@")}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter password"
                leftIcon={Lock}
                description="Must be at least 8 characters"
              />
              <Input
                variant="glass"
                label="Glass Input"
                placeholder="Glassmorphism style"
                leftIcon={User}
              />
              <Input
                label="With Error"
                placeholder="This has an error"
                error="This field is required"
                leftIcon={Mail}
              />
            </div>
          </section>

          {/* Card Variations */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Enhanced Cards</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard
                title="Total Users"
                value="12,345"
                description="Active users"
                icon={Users}
                trend={{ value: 12, label: "vs last month", direction: "up" }}
                animated
              />
              <StatsCard
                title="Revenue"
                value="$54,321"
                description="Monthly revenue"
                icon={TrendingUp}
                trend={{ value: 8, label: "vs last month", direction: "up" }}
                animated
              />
              <StatsCard
                title="Activity"
                value="98.5%"
                description="System uptime"
                icon={Activity}
                trend={{ value: 2, label: "vs last month", direction: "down" }}
                animated
              />
            </div>
          </section>

          {/* Progress Variations */}
          <section className="space-y-6">
            <h3 className="text-lg font-semibold">Enhanced Progress</h3>
            
            <div className="space-y-4">
              <Progress 
                value={progress} 
                variant="gradient" 
                size="lg" 
                animated 
                showValue 
                label="Overall Progress" 
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CircularProgress
                  value={75}
                  size={80}
                  variant="gradient"
                  label="Completion"
                  animated
                />
                <CircularProgress
                  value={92}
                  size={80}
                  variant="success"
                  label="Success Rate"
                  animated
                />
                <CircularProgress
                  value={45}
                  size={80}
                  variant="warning"
                  label="In Progress"
                  animated
                />
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-md font-medium mb-4">Step Progress</h4>
              <StepProgress steps={steps} />
            </div>
          </section>

          {/* Interactive Cards */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Interactive Cards</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card variant="interactive" className="p-6">
                <h4 className="font-semibold mb-2">Hover me!</h4>
                <p className="text-muted-foreground">This card has interactive hover effects</p>
              </Card>
              <Card variant="floating" className="p-6">
                <h4 className="font-semibold mb-2">Floating Card</h4>
                <p className="text-muted-foreground">This card has a floating animation</p>
              </Card>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

export default UIShowcase