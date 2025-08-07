'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  ArrowLeft,
  ArrowRight,
  Send,
  Clock,
  CheckCircle,
  Star,
  Upload,
  Palette,
  Calendar,
  Mail,
  Hash,
  ToggleLeft,
  Zap,
  Grid,
  ArrowUpDown,
  PenTool,
  X
} from 'lucide-react'
import { SurveyTemplate, TemplateQuestion, QuestionType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TemplatePreviewProps {
  template: SurveyTemplate
  questions: TemplateQuestion[]
  trigger?: React.ReactNode
  onTestSubmit?: (responses: Record<string, any>) => void
}

type PreviewDevice = 'desktop' | 'tablet' | 'mobile'

export function TemplatePreview({ template, questions, trigger, onTestSubmit }: TemplatePreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  const [currentStep, setCurrentStep] = useState<'intro' | 'survey' | 'conclusion'>('intro')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [startTime] = useState(Date.now())

  const deviceClasses = {
    desktop: 'max-w-4xl',
    tablet: 'max-w-2xl',
    mobile: 'max-w-sm'
  }

  const handleResponse = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      setCurrentStep('conclusion')
    }
  }

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    } else {
      setCurrentStep('intro')
    }
  }

  const startSurvey = () => {
    setCurrentStep('survey')
    setCurrentQuestionIndex(0)
  }

  const submitTest = () => {
    const testData = {
      responses,
      completionTime: Date.now() - startTime,
      device,
      completedAt: new Date().toISOString()
    }
    
    onTestSubmit?.(testData)
    setIsOpen(false)
    
    // Reset preview state
    setCurrentStep('intro')
    setCurrentQuestionIndex(0)
    setResponses({})
  }

  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0
  const currentQuestion = questions[currentQuestionIndex]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex h-[90vh]">
          {/* Device Selection Sidebar */}
          <div className="w-64 border-r border-gray-700 bg-gray-900/50 p-4 space-y-4">
            <div>
              <h3 className="font-semibold text-white mb-3">Preview Device</h3>
              <div className="space-y-2">
                <Button
                  variant={device === 'desktop' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setDevice('desktop')}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop
                </Button>
                <Button
                  variant={device === 'tablet' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setDevice('tablet')}
                >
                  <Tablet className="h-4 w-4 mr-2" />
                  Tablet
                </Button>
                <Button
                  variant={device === 'mobile' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setDevice('mobile')}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile
                </Button>
              </div>
            </div>

            {/* Template Info */}
            <div className="pt-4 border-t border-gray-700">
              <h4 className="font-medium text-white mb-2">{template.title}</h4>
              <div className="text-sm text-gray-400 space-y-1">
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {template.estimatedDuration} min
                </div>
                <div className="flex items-center">
                  <Star className="h-3 w-3 mr-1" />
                  Difficulty: {template.difficultyLevel}/5
                </div>
                <div>{questions.length} questions</div>
              </div>
            </div>

            {/* Progress in Survey */}
            {currentStep === 'survey' && (
              <div className="pt-4 border-t border-gray-700">
                <h4 className="font-medium text-white mb-2">Progress</h4>
                <Progress value={progress} className="mb-2" />
                <p className="text-sm text-gray-400">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
            )}

            {/* Responses Summary */}
            {Object.keys(responses).length > 0 && (
              <div className="pt-4 border-t border-gray-700">
                <h4 className="font-medium text-white mb-2">Test Responses</h4>
                <div className="text-sm text-gray-400">
                  {Object.keys(responses).length} responses collected
                </div>
              </div>
            )}
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-y-auto">
            <div className={cn('mx-auto min-h-full', deviceClasses[device])}>
              <div 
                className="min-h-full"
                style={{
                  background: `linear-gradient(135deg, ${template.settings.customBranding?.primaryColor || '#14B8A6'}, ${template.settings.customBranding?.secondaryColor || '#8B5CF6'})`
                }}
              >
                <div className="min-h-full bg-gray-900/90 backdrop-blur-sm">
                  {/* Introduction */}
                  {currentStep === 'intro' && (
                    <div className="p-8 min-h-full flex items-center justify-center">
                      <Card className="glass-card max-w-2xl w-full">
                        <CardHeader className="text-center">
                          <CardTitle className="text-2xl text-white mb-4">
                            {template.title}
                          </CardTitle>
                          {template.description && (
                            <CardDescription className="text-lg">
                              {template.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="text-center space-y-6">
                          {template.introductionText && (
                            <div className="text-gray-300 whitespace-pre-wrap">
                              {template.introductionText}
                            </div>
                          )}
                          
                          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {template.estimatedDuration} minutes
                            </div>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 mr-1" />
                              {questions.length} questions
                            </div>
                            {template.settings.voiceEnabled && (
                              <Badge variant="outline">Voice Enabled</Badge>
                            )}
                          </div>
                          
                          <Button 
                            size="lg"
                            onClick={startSurvey}
                            className="w-full"
                            style={{
                              background: `linear-gradient(135deg, ${template.settings.customBranding?.primaryColor || '#14B8A6'}, ${template.settings.customBranding?.secondaryColor || '#8B5CF6'})`
                            }}
                          >
                            Start Survey
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Survey Questions */}
                  {currentStep === 'survey' && currentQuestion && (
                    <div className="p-4 md:p-8 min-h-full flex items-center justify-center">
                      <Card className="glass-card max-w-2xl w-full">
                        <CardHeader>
                          {template.settings.showProgressBar && (
                            <Progress value={progress} className="mb-4" />
                          )}
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">
                              Question {currentQuestionIndex + 1} of {questions.length}
                            </Badge>
                            {currentQuestion.required && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl text-white">
                            {currentQuestion.questionText}
                          </CardTitle>
                          {currentQuestion.description && (
                            <CardDescription className="mt-2">
                              {currentQuestion.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <QuestionRenderer
                            question={currentQuestion}
                            value={responses[currentQuestion.id]}
                            onChange={(value) => handleResponse(currentQuestion.id, value)}
                          />
                          
                          <div className="flex justify-between">
                            <Button
                              variant="outline"
                              onClick={prevQuestion}
                              disabled={currentQuestionIndex === 0}
                            >
                              <ArrowLeft className="h-4 w-4 mr-2" />
                              Previous
                            </Button>
                            <Button
                              onClick={nextQuestion}
                              disabled={currentQuestion.required && !responses[currentQuestion.id]}
                            >
                              {currentQuestionIndex === questions.length - 1 ? (
                                <>
                                  Complete
                                  <CheckCircle className="h-4 w-4 ml-2" />
                                </>
                              ) : (
                                <>
                                  Next
                                  <ArrowRight className="h-4 w-4 ml-2" />
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Conclusion */}
                  {currentStep === 'conclusion' && (
                    <div className="p-8 min-h-full flex items-center justify-center">
                      <Card className="glass-card max-w-2xl w-full">
                        <CardHeader className="text-center">
                          <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-8 w-8 text-green-400" />
                          </div>
                          <CardTitle className="text-2xl text-white mb-4">
                            Survey Complete!
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-6">
                          {template.conclusionText && (
                            <div className="text-gray-300 whitespace-pre-wrap">
                              {template.conclusionText}
                            </div>
                          )}
                          
                          <div className="text-sm text-gray-400">
                            Completion time: {Math.round((Date.now() - startTime) / 1000)}s
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button 
                              variant="outline"
                              onClick={() => {
                                setCurrentStep('intro')
                                setCurrentQuestionIndex(0)
                                setResponses({})
                              }}
                              className="flex-1"
                            >
                              Test Again
                            </Button>
                            <Button 
                              onClick={submitTest}
                              className="flex-1"
                              style={{
                                background: `linear-gradient(135deg, ${template.settings.customBranding?.primaryColor || '#14B8A6'}, ${template.settings.customBranding?.secondaryColor || '#8B5CF6'})`
                              }}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Submit Test
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Question Renderer Component
interface QuestionRendererProps {
  question: TemplateQuestion
  value: any
  onChange: (value: any) => void
}

function QuestionRenderer({ question, value, onChange }: QuestionRendererProps) {
  const renderQuestionInput = () => {
    switch (question.questionType) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <Input
            type={question.questionType === 'email' ? 'email' : question.questionType === 'number' ? 'number' : 'text'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholderText || `Enter your ${question.questionType}...`}
          />
        )

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholderText || 'Enter your response...'}
            rows={4}
          />
        )

      case 'single_choice':
        return (
          <RadioGroup value={value || ''} onValueChange={onChange}>
            <div className="space-y-2">
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={typeof option === 'string' ? option : option.value || option.label} 
                    id={`option-${index}`} 
                  />
                  <Label htmlFor={`option-${index}`}>
                    {typeof option === 'string' ? option : option.label || option.value}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        )

      case 'multiple_choice':
        const currentValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => {
              const optionValue = typeof option === 'string' ? option : option.value || option.label
              const isChecked = currentValues.includes(optionValue)
              
              return (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`option-${index}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange([...currentValues, optionValue])
                      } else {
                        onChange(currentValues.filter((v: any) => v !== optionValue))
                      }
                    }}
                  />
                  <Label htmlFor={`option-${index}`}>
                    {typeof option === 'string' ? option : option.label || option.value}
                  </Label>
                </div>
              )
            })}
          </div>
        )

      case 'scale':
        const min = question.options?.[0]?.min || 1
        const max = question.options?.[0]?.max || 10
        return (
          <div className="space-y-4">
            <div className="px-2">
              <Slider
                value={[value || min]}
                onValueChange={(values) => onChange(values[0])}
                min={min}
                max={max}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>{min}</span>
              <span className="text-white font-medium">{value || min}</span>
              <span>{max}</span>
            </div>
          </div>
        )

      case 'rating':
        return (
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                variant="ghost"
                size="sm"
                className="p-1"
                onClick={() => onChange(rating)}
              >
                <Star 
                  className={cn(
                    'h-6 w-6',
                    rating <= (value || 0) 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-gray-400'
                  )} 
                />
              </Button>
            ))}
          </div>
        )

      case 'boolean':
        return (
          <div className="flex space-x-4">
            <Button
              variant={value === true ? 'default' : 'outline'}
              onClick={() => onChange(true)}
            >
              Yes
            </Button>
            <Button
              variant={value === false ? 'default' : 'outline'}
              onClick={() => onChange(false)}
            >
              No
            </Button>
          </div>
        )

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )

      case 'time':
        return (
          <Input
            type="time"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )

      case 'color':
        return (
          <div className="flex items-center space-x-2">
            <Input
              type="color"
              value={value || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-16 h-10 p-1"
            />
            <Input
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
            />
          </div>
        )

      case 'file_upload':
        return (
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 mb-2">Drop files here or click to upload</p>
            <Button variant="outline" size="sm">
              Choose Files
            </Button>
          </div>
        )

      case 'jtbd':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Rate the strength of each force (1-10)
            </p>
            {['Push Forces', 'Pull Forces', 'Habit Forces', 'Anxiety Forces'].map((force) => (
              <div key={force} className="space-y-2">
                <Label>{force}</Label>
                <Slider
                  value={[value?.[force.toLowerCase().replace(' ', '_')] || 5]}
                  onValueChange={(values) => onChange({
                    ...value,
                    [force.toLowerCase().replace(' ', '_')]: values[0]
                  })}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        )

      default:
        return (
          <div className="text-center py-4 text-gray-400">
            <p>Question type "{question.questionType}" preview not implemented</p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-4">
      {renderQuestionInput()}
      {question.helpText && (
        <p className="text-sm text-gray-400">{question.helpText}</p>
      )}
    </div>
  )
}