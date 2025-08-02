'use client'

import React, { useState, useEffect, useRef } from 'react'
import { redirect, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { SurveyQuestion } from '@/components/survey/survey-question'
import { 
  Save, 
  Clock,
  Brain,
  User,
  CheckCircle,
  AlertCircle
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

export default async function SurveyPage({ params }: Props) {
  const resolvedParams = await params
  const router = useRouter()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({})
  const [inputMethod, setInputMethod] = useState<'text' | 'voice'>('text')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [timeSpent, setTimeSpent] = useState(0)
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())
  const [session, setSession] = useState<SurveySession | null>(null)
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const currentQuestion = surveyQuestions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestion?.id]
  const progress = getTotalProgress(Object.fromEntries(
    Object.entries(answers).map(([id, answer]) => [id, answer.answer])
  ))

  // Initialize session
  useEffect(() => {
    const initSession = () => {
      setSession({
        sessionId: resolvedParams.sessionId,
        userId: mockUser.id,
        answers: {},
        currentQuestionIndex: 0,
        startedAt: new Date(),
        lastUpdated: new Date(),
        timeSpent: 0,
        status: 'in_progress'
      })
    }
    
    initSession()
  }, [resolvedParams.sessionId])

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
  }, [answers])

  // Save on answer change (debounced)
  useEffect(() => {
    if (currentAnswer?.answer.trim()) {
      const debounceTimeout = setTimeout(() => {
        saveProgress()
      }, 3000) // Save 3 seconds after stopping typing

      return () => clearTimeout(debounceTimeout)
    }
  }, [currentAnswer?.answer])

  // Keyboard navigation
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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentQuestionIndex])

  const saveProgress = async () => {
    try {
      setSaveStatus('saving')
      
      // Update session with current data
      const updatedSession = {
        ...session!,
        answers,
        currentQuestionIndex,
        lastUpdated: new Date(),
        timeSpent
      }
      
      // In a real app, this would save to Supabase
      console.log('Saving progress:', updatedSession)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setSession(updatedSession)
      setSaveStatus('saved')
      
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Save failed:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

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


  const goToQuestion = (index: number) => {
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
  }

  const goToNextQuestion = () => {
    if (currentQuestionIndex < surveyQuestions.length - 1) {
      goToQuestion(currentQuestionIndex + 1)
    }
  }

  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1)
    }
  }

  const completeSurvey = async () => {
    try {
      // Final save before completion
      await saveProgress()
      
      // Update session status
      if (session) {
        const completedSession = {
          ...session,
          status: 'completed' as const,
          lastUpdated: new Date()
        }
        setSession(completedSession)
      }
      
      // Navigate to completion page
      router.push(`/survey/${resolvedParams.sessionId}/complete`)
    } catch (error) {
      console.error('Failed to complete survey:', error)
    }
  }

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

  if (!currentQuestion) {
    redirect('/survey')
  }

  return (
    <MainLayout user={mockUser} currentPath={`/survey/${resolvedParams.sessionId}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">
                AI Readiness Assessment
              </h1>
              <p className="text-muted-foreground">
                Question {currentQuestion.number} of {surveyQuestions.length}
              </p>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>{formatTime(timeSpent)}</span>
              </div>
              <div className="flex items-center space-x-2">
                {saveStatus === 'saving' && <Save className="h-4 w-4 animate-spin" />}
                {saveStatus === 'saved' && <CheckCircle className="h-4 w-4 text-green-400" />}
                {saveStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
                <span>
                  {saveStatus === 'saving' && 'Saving...'}
                  {saveStatus === 'saved' && 'Saved'}
                  {saveStatus === 'error' && 'Save failed'}
                  {saveStatus === 'idle' && 'Auto-save enabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress 
              value={progress} 
              variant="gradient" 
              className="h-3 rounded-full"
            />
          </div>
        </div>

        {/* Integrated Survey Question Component */}
        <SurveyQuestion
          question={currentQuestion}
          answer={currentAnswer?.answer || ''}
          inputMethod={inputMethod}
          onAnswerChange={updateAnswer}
          onInputMethodChange={setInputMethod}
          onNext={isLastQuestion() ? completeSurvey : goToNextQuestion}
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
            <div className="grid grid-cols-8 gap-2">
              {surveyQuestions.map((q, idx) => {
                const hasAnswer = answers[q.id]?.answer.trim()
                const isCurrent = idx === currentQuestionIndex
                
                return (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(idx)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
                      isCurrent
                        ? 'bg-teal-500 text-white ring-2 ring-teal-400'
                        : hasAnswer
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
                    }`}
                    title={`Question ${q.number}: ${q.categoryLabel}`}
                  >
                    {q.number}
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
            
            {/* Keyboard shortcuts */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Use <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+←</kbd> / <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+→</kbd> to navigate, <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+S</kbd> to save
              </p>
            </div>
          </div>
        </Card>

        {/* Survey Progress Summary */}
        <Card variant="glass" className="p-6">
          <h3 className="font-semibold mb-4 flex items-center space-x-2">
            <Brain className="h-5 w-5 text-teal-400" />
            <span>Progress by Category</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {surveyCategories.map(category => {
              const categoryQuestions = surveyQuestions.filter(q => q.category === category.id)
              const answeredQuestions = categoryQuestions.filter(q => answers[q.id]?.answer.trim())
              const categoryProgress = categoryQuestions.length > 0 
                ? (answeredQuestions.length / categoryQuestions.length) * 100 
                : 0

              return (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{category.icon}</span>
                      <span className="font-medium text-sm">{category.label}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {answeredQuestions.length}/{categoryQuestions.length}
                    </span>
                  </div>
                  <Progress value={categoryProgress} className="h-2" />
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </MainLayout>
  )
}