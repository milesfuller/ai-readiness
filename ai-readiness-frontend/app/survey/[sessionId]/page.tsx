'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { redirect, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { SurveyQuestion } from '@/components/survey/survey-question'
import { 
  Confetti, 
  ProgressMilestone, 
  FloatingHearts, 
  useKonamiCode 
} from '@/components/ui/whimsy'
import { 
  Save, 
  Clock,
  Brain,
  User,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Trophy
} from 'lucide-react'
import { surveyQuestions, surveyCategories, getTotalProgress, SurveyQuestion as QuestionType } from '@/lib/data/survey-questions'

interface Props {
  params: Promise<{ sessionId: string }>
}

interface SurveyAnswer {
  questionId: string
  answer: string
  inputMethod: 'text' | 'voice'
  lastSaved: Date
  audioUrl?: string
}

interface SurveySession {
  sessionId: string
  userId: string
  answers: Record<string, SurveyAnswer>
  currentQuestionIndex: number
  startedAt: Date
  lastUpdated: Date
  timeSpent: number
  status: 'in_progress' | 'completed' | 'paused'
}

const mockUser = {
  id: '1',
  email: 'john.doe@company.com',
  role: 'user' as const,
  organizationId: 'org-1',
  profile: {
    id: 'profile-1',
    userId: '1',
    firstName: 'John',
    lastName: 'Doe',
    avatar: undefined,
    department: 'Product Management',
    jobTitle: 'Senior Product Manager',
    preferences: {
      theme: 'dark' as const,
      notifications: true,
      voiceInput: true,
      language: 'en'
    }
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-08-01T00:00:00Z',
  lastLogin: '2024-08-02T19:00:00Z'
}

export default function SurveyPage({ params }: Props) {
  const [resolvedParams, setResolvedParams] = useState<{ sessionId: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    Promise.resolve(params).then(setResolvedParams)
  }, [params])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({})
  const [inputMethod, setInputMethod] = useState<'text' | 'voice'>('text')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [timeSpent, setTimeSpent] = useState(0)
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())
  const [session, setSession] = useState<SurveySession | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showMilestoneHearts, setShowMilestoneHearts] = useState(false)
  const [lastCelebratedMilestone, setLastCelebratedMilestone] = useState(0)
  const [konamiActivated, setKonamiActivated] = useState(false)
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const currentQuestion = surveyQuestions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestion?.id]
  const progress = getTotalProgress(Object.fromEntries(
    Object.entries(answers).map(([id, answer]) => [id, answer.answer])
  ))
  
  // Celebration milestones
  const celebrationMilestones = useMemo(() => [25, 50, 75, 100], [])
  
  // Handle milestone celebrations
  const handleMilestone = useCallback((milestone: number) => {
    // Debug milestone - removed in production
    
    if (milestone === 100) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 4000)
    } else {
      setShowMilestoneHearts(true)
      setTimeout(() => setShowMilestoneHearts(false), 2000)
    }
  }, [])

  // Auto-save progress (debounced)
  const saveProgress = useCallback(async () => {
    if (!session || saveStatus === 'saving') return

    setSaveStatus('saving')
    
    try {
      // Mock save to Supabase
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('Progress saved:', { sessionId: session.sessionId, answers })
      setSaveStatus('saved')
      
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Save failed:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [answers, session, saveStatus])

  // Resolve params and initialize session
  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params
      setResolvedParams(resolved)
      
      setSession({
        sessionId: resolved.sessionId,
        userId: mockUser.id,
        answers: {},
        currentQuestionIndex: 0,
        startedAt: new Date(),
        lastUpdated: new Date(),
        timeSpent: 0,
        status: 'in_progress'
      })
    }
    
    resolveParams()
  }, [params])

  // Track time spent
  useEffect(() => {
    timeIntervalRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1)
    }, 1000)

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current)
      }
    }
  }, [])

  // Auto-save functionality every 30 seconds
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    if (Object.keys(answers).length > 0) {
      setSaveStatus('saving')
      saveTimeoutRef.current = setTimeout(() => {
        saveProgress()
      }, 30000) // Auto-save every 30 seconds
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [answers, saveProgress])

  // Save on answer change (debounced)
  useEffect(() => {
    if (currentAnswer?.answer.trim()) {
      const debounceTimeout = setTimeout(() => {
        saveProgress()
      }, 3000) // Save 3 seconds after stopping typing

      return () => clearTimeout(debounceTimeout)
    }
    // Return undefined when {"there's"} no answer
    return undefined
  }, [currentAnswer?.answer, saveProgress])

  // Progress celebration effect  
  useEffect(() => {
    celebrationMilestones.forEach(milestone => {
      if (progress >= milestone && lastCelebratedMilestone < milestone) {
        setLastCelebratedMilestone(milestone)
        handleMilestone(milestone)
      }
    })
  }, [progress, lastCelebratedMilestone, handleMilestone, celebrationMilestones])
  
  // Konami code easter egg
  useKonamiCode(() => {
    setKonamiActivated(true)
    setShowConfetti(true)
    setTimeout(() => {
      setKonamiActivated(false)
      setShowConfetti(false)
    }, 5000)
  })

  // Navigation functions with useCallback
  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < surveyQuestions.length) {
      setCurrentQuestionIndex(index)
      setQuestionStartTime(Date.now())
      // Reset input method preference for new question
      const newQuestion = surveyQuestions[index]
      const existingAnswer = answers[newQuestion.id]
      if (existingAnswer?.inputMethod) {
        setInputMethod(existingAnswer.inputMethod)
      }
    }
  }, [answers])

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < surveyQuestions.length - 1) {
      goToQuestion(currentQuestionIndex + 1)
    }
  }, [currentQuestionIndex, goToQuestion])

  const goToPrevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1)
    }
  }, [currentQuestionIndex, goToQuestion])

  // Keyboard navigation with fun shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault()
            goToPrevQuestion()
            break
          case 'ArrowRight':
            event.preventDefault()
            goToNextQuestion()
            break
          case 's':
            event.preventDefault()
            saveProgress()
            break
        }
      }
      
      // Fun keyboard shortcuts
      if (event.shiftKey && event.key === 'H') {
        setShowMilestoneHearts(true)
        setTimeout(() => setShowMilestoneHearts(false), 1000)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrevQuestion, goToNextQuestion, saveProgress])


  const updateAnswer = (answer: string, method: 'text' | 'voice' = 'text') => {
    if (!currentQuestion) return
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        questionId: currentQuestion.id,
        answer,
        inputMethod: method,
        lastSaved: new Date()
      }
    }))
  }


  const completeSurvey = useCallback(async () => {
    console.log('completeSurvey called', { resolvedParams, session })
    
    if (!resolvedParams) {
      console.log('No resolved params, returning')
      return
    }
    
    try {
      console.log('Starting survey completion...')
      
      // Final save before completion
      await saveProgress()
      console.log('Progress saved')
      
      // Update session status
      if (session) {
        const completedSession = {
          ...session,
          status: 'completed' as const,
          lastUpdated: new Date()
        }
        setSession(completedSession)
        console.log('Session updated to completed')
      }
      
      // Navigate to completion page
      console.log('Navigating to completion page...')
      router.push(`/survey/${resolvedParams.sessionId}/complete`)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to complete survey:', error)
    }
  }, [resolvedParams, saveProgress, session, router])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const canGoNext = () => {
    if (!currentQuestion) return false
    const answer = currentAnswer?.answer?.trim()
    return currentQuestion.required ? !!answer : true
  }

  const canGoToPrevious = () => {
    return currentQuestionIndex > 0
  }

  const isLastQuestion = () => {
    return currentQuestionIndex === surveyQuestions.length - 1
  }

  if (!resolvedParams || !currentQuestion) {
    return null // or loading spinner
  }

  return (
    <MainLayout user={mockUser} currentPath={`/survey/${resolvedParams.sessionId}`}>
      <div className={`max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-0 ${konamiActivated ? 'konami-activated' : ''}`}>
        {/* Celebration Effects */}
        <Confetti 
          active={showConfetti} 
          intensity={progress === 100 ? 'high' : 'medium'}
          duration={progress === 100 ? 5000 : 3000}
        />
        <FloatingHearts active={showMilestoneHearts} count={progress >= 100 ? 10 : 5} />
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold gradient-text">
                AI Readiness Assessment
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Question {currentQuestion.number} of {surveyQuestions.length}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{formatTime(timeSpent)}</span>
              </div>
              <div className="flex items-center space-x-2">
                {saveStatus === 'saving' && <Save className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />}
                {saveStatus === 'saved' && <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />}
                {saveStatus === 'error' && <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />}
                <span className="hidden sm:inline">
                  {saveStatus === 'saving' && 'Saving...'}
                  {saveStatus === 'saved' && 'Saved'}
                  {saveStatus === 'error' && 'Save failed'}
                  {saveStatus === 'idle' && 'Auto-save enabled'}
                </span>
                <span className="sm:hidden">
                  {saveStatus === 'saving' && 'Saving'}
                  {saveStatus === 'saved' && 'Saved'}
                  {saveStatus === 'error' && 'Error'}
                  {saveStatus === 'idle' && 'Auto-save'}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar with Celebrations */}
          <div className="space-y-2 relative">
            <div className="flex justify-between text-sm">
              <div className="flex items-center space-x-2">
                <span>Overall Progress</span>
                {progress >= 25 && (
                  <Trophy className="h-4 w-4 text-yellow-400 animate-pulse" />
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium">{Math.round(progress)}%</span>
                {progress >= 50 && (
                  <Sparkles className="h-4 w-4 text-purple-400 animate-spin" />
                )}
              </div>
            </div>
            <div className="relative">
              <Progress 
                value={progress} 
                variant="gradient" 
                className={`h-3 rounded-full transition-all duration-500 ${
                  progress >= 75 ? 'progress-milestone' : ''
                }`}
              />
              <ProgressMilestone 
                progress={progress}
                milestones={celebrationMilestones}
                onMilestone={handleMilestone}
              />
            </div>
            {/* Progress encouragement */}
            {progress > 0 && progress < 100 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground animate-pulse">
                  {progress < 25 && "🚀 You&apos;re off to a great start!"}
                  {progress >= 25 && progress < 50 && "⭐ Making excellent progress!"}
                  {progress >= 50 && progress < 75 && "🔥 You&apos;re on fire! Keep going!"}
                  {progress >= 75 && progress < 100 && "🎯 Almost there! You&apos;ve got this!"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Integrated Survey Question Component */}
        <SurveyQuestion
          question={currentQuestion}
          answer={currentAnswer?.answer || ''}
          inputMethod={inputMethod}
          onAnswerChange={updateAnswer}
          onInputMethodChange={setInputMethod}
          onNext={isLastQuestion() ? (() => {
            console.log('Complete Survey button clicked - calling completeSurvey')
            completeSurvey()
          }) : (() => {
            console.log('Next Question button clicked - calling goToNextQuestion')
            goToNextQuestion()
          })}
          onPrevious={goToPrevQuestion}
          isFirst={!canGoToPrevious()}
          isLast={isLastQuestion()}
          canGoNext={canGoNext()}
          className=""
        />

        {/* Question Navigation Overview */}
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Question Navigation</h3>
            
            {/* Question Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {surveyQuestions.map((q, idx) => {
                const hasAnswer = answers[q.id]?.answer.trim()
                const isCurrent = idx === currentQuestionIndex
                
                return (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(idx)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center touch-target whimsy-hover ${
                      isCurrent
                        ? 'bg-teal-500 text-white ring-2 ring-teal-400 animate-pulse'
                        : hasAnswer
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 success-pulse'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
                    }`}
                    title={`Question ${q.number}: ${q.categoryLabel}`}
                    aria-label={`Go to question ${q.number}: ${q.categoryLabel}. ${isCurrent ? 'Current question' : hasAnswer ? 'Answered' : 'Not answered'}`}
                  >
                    {hasAnswer && !isCurrent ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      q.number
                    )}
                  </button>
                )
              })}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-teal-500 rounded"></div>
                <span>Current</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500/20 border border-green-500/30 rounded"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-muted border border-border rounded"></div>
                <span>Pending</span>
              </div>
            </div>
            
            {/* Keyboard shortcuts - hide on mobile */}
            <div className="text-center hidden sm:block">
              <p className="text-xs text-muted-foreground">
                Use <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+←</kbd> / <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+→</kbd> to navigate, <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+S</kbd> to save
                {konamiActivated && (
                  <span className="ml-2 text-rainbow animate-pulse">🎮 Konami Code Activated! 🎮</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                💡 Try <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Shift+H</kbd> for a little surprise
              </p>
            </div>
          </div>
        </Card>

        {/* Survey Progress Summary */}
        <Card variant="glass" className="p-4 sm:p-6">
          <h3 className="font-semibold mb-4 flex items-center space-x-2 text-base sm:text-lg">
            <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-teal-400" />
            <span>Progress by Category</span>
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {surveyCategories.map(category => {
              const categoryQuestions = surveyQuestions.filter(q => q.category === category.id)
              const answeredQuestions = categoryQuestions.filter(q => answers[q.id]?.answer.trim())
              const categoryProgress = categoryQuestions.length > 0 
                ? (answeredQuestions.length / categoryQuestions.length) * 100 
                : 0
              const isComplete = categoryProgress === 100

              return (
                <div key={category.id} className={`space-y-2 transition-all duration-300 ${
                  isComplete ? 'celebrate-bounce' : ''
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg transition-transform duration-300 ${
                        isComplete ? 'scale-110' : ''
                      }`}>{category.icon}</span>
                      <span className="font-medium text-sm">{category.label}</span>
                      {isComplete && (
                        <CheckCircle className="h-4 w-4 text-green-400 animate-pulse" />
                      )}
                    </div>
                    <span className={`text-sm transition-colors duration-300 ${
                      isComplete ? 'text-green-400 font-medium' : 'text-muted-foreground'
                    }`}>
                      {answeredQuestions.length}/{categoryQuestions.length}
                    </span>
                  </div>
                  <Progress 
                    value={categoryProgress} 
                    className={`h-2 transition-all duration-500 ${
                      isComplete ? 'success-pulse' : ''
                    }`} 
                    variant={isComplete ? 'gradient' : 'default'}
                  />
                </div>
              )
            })}
          </div>
        </Card>
        
        {/* Hidden easter egg message */}
        {konamiActivated && (
          <Card className="p-4 border-rainbow animate-pulse">
            <div className="text-center space-y-2">
              <div className="text-2xl">🎮✨🚀</div>
              <p className="text-sm font-medium text-rainbow">
                You found the secret! You&apos;re clearly ready for AI if you can master the Konami Code!
              </p>
              <div className="text-xs text-muted-foreground">
                Keep this energy for your AI journey!
              </div>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}