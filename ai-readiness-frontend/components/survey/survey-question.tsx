'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { VoiceRecorder } from './voice-recorder'
import { 
  Type, 
  Mic, 
  Clock,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle
} from 'lucide-react'
import { SurveyQuestion as QuestionType, surveyCategories } from '@/lib/data/survey-questions'

interface SurveyQuestionProps {
  question: QuestionType
  answer: string
  inputMethod: 'text' | 'voice'
  onAnswerChange: (answer: string, method: 'text' | 'voice') => void
  onInputMethodChange: (method: 'text' | 'voice') => void
  onNext?: () => void
  onPrevious?: () => void
  isFirst?: boolean
  isLast?: boolean
  canGoNext?: boolean
  className?: string
}

export const SurveyQuestion: React.FC<SurveyQuestionProps> = ({
  question,
  answer,
  inputMethod,
  onAnswerChange,
  onInputMethodChange,
  onNext,
  onPrevious,
  isFirst = false,
  isLast = false,
  canGoNext = false,
  className = ''
}) => {
  const [localAnswer, setLocalAnswer] = useState(answer)
  const [showHelp, setShowHelp] = useState(false)

  // Sync local answer with prop changes
  useEffect(() => {
    setLocalAnswer(answer)
  }, [answer])

  // Handle text input changes
  const handleTextChange = (value: string) => {
    setLocalAnswer(value)
    onAnswerChange(value, 'text')
  }

  // Handle voice transcription updates
  const handleVoiceChange = (transcription: string) => {
    setLocalAnswer(transcription)
    onAnswerChange(transcription, 'voice')
  }

  // Get category info for styling
  const categoryInfo = surveyCategories.find(c => c.id === question.category)
  const categoryColor = categoryInfo?.color || 'text-gray-400'
  const categoryIcon = categoryInfo?.icon || '❓'

  // Format estimated time
  const formatTime = (minutes: number) => {
    if (minutes === 1) return '1 min'
    return `${minutes} mins`
  }

  return (
    <div className={`max-w-4xl mx-auto space-y-4 sm:space-y-6 ${className}`}>
      {/* Question Header */}
      <Card className="border-teal-500/20 bg-gradient-to-br from-teal-950/10 to-purple-950/10 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start space-x-3">
              <span className={`text-2xl sm:text-3xl ${categoryColor} flex-shrink-0`}>
                {categoryIcon}
              </span>
              <div className="flex-1">
                <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                  Question {question.number} • {question.categoryLabel}
                </div>
                <CardTitle className="text-lg sm:text-xl leading-relaxed text-foreground">
                  {question.text}
                </CardTitle>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{formatTime(question.estimatedTime)}</span>
            </div>
          </div>
          
          {question.description && (
            <p className="text-muted-foreground leading-relaxed">
              {question.description}
            </p>
          )}

          {question.helpText && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
                className="text-teal-400 hover:text-teal-300 hover:bg-teal-950/20 p-0 h-auto"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                {showHelp ? 'Hide' : 'Show'} helpful tips
              </Button>
              
              {showHelp && (
                <div className="mt-3 p-4 bg-teal-950/20 border border-teal-500/20 rounded-lg">
                  <p className="text-sm text-teal-400">
                    💡 {question.helpText}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Input Method Toggle */}
      <Card className="p-4 sm:p-6 border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="text-base sm:text-lg font-semibold">Choose your input method</h3>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Button
                variant={inputMethod === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onInputMethodChange('text')}
                className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 touch-target"
                aria-label="Use text input"
              >
                <Type className="h-4 w-4" />
                <span>Text</span>
              </Button>
              <Button
                variant={inputMethod === 'voice' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onInputMethodChange('voice')}
                className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 touch-target"
                aria-label="Use voice input"
              >
                <Mic className="h-4 w-4" />
                <span>Voice</span>
              </Button>
            </div>
          </div>

          {/* Text Input */}
          {inputMethod === 'text' && (
            <div className="space-y-3">
              <Textarea
                value={localAnswer}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={question.placeholder}
                className="min-h-[200px] resize-none bg-background/50 border-border/50 focus:border-teal-500 focus:ring-teal-500"
                maxLength={question.maxLength}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {localAnswer.length} / {question.maxLength} characters
                </span>
                <span>
                  {question.required && localAnswer.trim().length === 0 && (
                    <span className="text-amber-400">Required</span>
                  )}
                  {localAnswer.trim().length > 0 && (
                    <span className="text-green-400 flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Answer provided</span>
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Voice Input */}
          {inputMethod === 'voice' && (
            <VoiceRecorder
              onTranscriptionUpdate={handleVoiceChange}
              initialValue={localAnswer}
              className="mt-4"
            />
          )}
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Mobile: Status and Navigation in column */}
        <div className="sm:hidden w-full space-y-4">
          {/* Answer Status */}
          <div className="flex items-center justify-center space-x-3 text-sm">
            <div className="flex items-center space-x-2">
              {localAnswer.trim().length > 0 ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-green-400">Answer provided</span>
                </>
              ) : question.required ? (
                <>
                  <div className="h-4 w-4 rounded-full border border-amber-400" />
                  <span className="text-amber-400">Required</span>
                </>
              ) : (
                <>
                  <div className="h-4 w-4 rounded-full border border-muted-foreground/50" />
                  <span>Optional</span>
                </>
              )}
            </div>
            
            {/* Input Method Badge */}
            <div className="flex items-center space-x-1 px-2 py-1 bg-muted/50 rounded text-xs">
              {inputMethod === 'voice' ? (
                <Mic className="h-3 w-3" />
              ) : (
                <Type className="h-3 w-3" />
              )}
              <span className="capitalize">{inputMethod}</span>
            </div>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={isFirst}
              className="flex items-center space-x-2 touch-target"
              aria-label="Go to previous question"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Back</span>
            </Button>

            <Button
              onClick={onNext}
              disabled={!canGoNext}
              className={`flex items-center space-x-2 touch-target ${
                isLast 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-teal-600 hover:bg-teal-700'
              }`}
              aria-label={isLast ? 'Complete the survey' : 'Go to next question'}
            >
              <span className="hidden sm:inline">{isLast ? 'Complete Survey' : 'Next Question'}</span>
              <span className="sm:hidden">{isLast ? 'Complete' : 'Next'}</span>
              {isLast ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Desktop: Original horizontal layout */}
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isFirst}
          className="hidden sm:flex items-center space-x-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>

        <div className="hidden sm:flex items-center space-x-4 text-sm text-muted-foreground">
          {/* Answer Status */}
          <div className="flex items-center space-x-2">
            {localAnswer.trim().length > 0 ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-green-400">Answer provided</span>
              </>
            ) : question.required ? (
              <>
                <div className="h-4 w-4 rounded-full border border-amber-400" />
                <span className="text-amber-400">Required</span>
              </>
            ) : (
              <>
                <div className="h-4 w-4 rounded-full border border-muted-foreground/50" />
                <span>Optional</span>
              </>
            )}
          </div>

          {/* Input Method Badge */}
          <div className="flex items-center space-x-1 px-2 py-1 bg-muted/50 rounded text-xs">
            {inputMethod === 'voice' ? (
              <Mic className="h-3 w-3" />
            ) : (
              <Type className="h-3 w-3" />
            )}
            <span className="capitalize">{inputMethod}</span>
          </div>
        </div>

        <Button
          onClick={onNext}
          disabled={!canGoNext}
          className={`hidden sm:flex items-center space-x-2 ${
            isLast 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          <span>{isLast ? 'Complete Survey' : 'Next Question'}</span>
          {isLast ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

export default SurveyQuestion