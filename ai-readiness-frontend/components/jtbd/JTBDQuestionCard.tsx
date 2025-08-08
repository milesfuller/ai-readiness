'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { JTBDForceType, SurveyTemplateQuestion } from "@/contracts/schema"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ForceIndicator } from "./ForceIndicator"
import { ForceScoreDisplay } from "./ForceScoreDisplay"

interface JTBDQuestionCardProps {
  question: SurveyTemplateQuestion
  showForceInfo?: boolean
  showScore?: boolean
  score?: number
  maxScore?: number
  variant?: 'default' | 'compact' | 'detailed'
  interactive?: boolean
  selected?: boolean
  onSelect?: (questionId: string) => void
  animated?: boolean
  className?: string
  style?: React.CSSProperties
}

const JTBDQuestionCard = React.forwardRef<
  HTMLDivElement,
  JTBDQuestionCardProps
>(({ 
  className,
  question,
  showForceInfo = true,
  showScore = false,
  score,
  maxScore = 10,
  variant = 'default',
  interactive = false,
  selected = false,
  onSelect,
  animated = false,
  style
}, ref) => {
  const handleSelect = () => {
    if (interactive && onSelect && question.id) {
      onSelect(question.id)
    }
  }
  
  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝'
      case 'textarea': return '📄'
      case 'select': return '📋'
      case 'multiselect': return '☑️'
      case 'radio': return '🔘'
      case 'checkbox': return '✅'
      case 'scale': return '📏'
      case 'rating': return '⭐'
      case 'date': return '📅'
      case 'time': return '⏰'
      case 'file': return '📎'
      case 'matrix': return '📊'
      case 'ranking': return '🏆'
      default: return '❓'
    }
  }
  
  const getQuestionTypeLabel = (type: string) => {
    return type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
  }
  
  if (variant === 'compact') {
    return (
      <Card
        ref={ref}
        className={cn(
          "transition-all duration-200 cursor-pointer",
          interactive && "hover:shadow-md hover:scale-[1.02]",
          selected && "ring-2 ring-teal-500 ring-offset-2",
          animated && "animate-fade-in",
          className
        )}
        onClick={handleSelect}
        style={style}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2 mb-2">
                {question.question_text}
              </p>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <span className="mr-1">{getQuestionTypeIcon(question.question_type)}</span>
                  {getQuestionTypeLabel(question.question_type)}
                </Badge>
                
                {question.validation?.required && (
                  <Badge variant="secondary" className="text-xs">
                    Required
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {showForceInfo && question.jtbd_force && (
                <ForceIndicator 
                  force={question.jtbd_force}
                  size="sm"
                  showLabel={false}
                />
              )}
              
              {showScore && typeof score === 'number' && (
                <div className="text-xs font-medium text-muted-foreground">
                  {score.toFixed(1)}/{maxScore}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (variant === 'detailed') {
    return (
      <Card
        ref={ref}
        className={cn(
          "transition-all duration-200",
          interactive && "cursor-pointer hover:shadow-lg hover:scale-[1.01]",
          selected && "ring-2 ring-teal-500 ring-offset-2",
          animated && "animate-fade-in-up",
          className
        )}
        onClick={handleSelect}
        style={style}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">
                  {getQuestionTypeIcon(question.question_type)}
                </span>
                <Badge variant="outline">
                  {getQuestionTypeLabel(question.question_type)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  #{question.order_index + 1}
                </span>
              </div>
              
              <h3 className="text-base font-medium leading-relaxed">
                {question.question_text}
              </h3>
              
              {question.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {question.description}
                </p>
              )}
            </div>
            
            {showForceInfo && question.jtbd_force && (
              <ForceIndicator 
                force={question.jtbd_force}
                size="md"
              />
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Question options preview */}
          {question.options && question.options.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Options:
              </p>
              <div className="space-y-1">
                {question.options.slice(0, 3).map((option, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    • {option.label}
                    {option.score && (
                      <span className="ml-2 text-xs">
                        (Score: {option.score})
                      </span>
                    )}
                  </div>
                ))}
                {question.options.length > 3 && (
                  <div className="text-xs text-muted-foreground italic">
                    +{question.options.length - 3} more options
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* JTBD Force information */}
          {showForceInfo && question.jtbd_force && (
            <div className="space-y-3">
              {question.force_description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Force Context:
                  </p>
                  <p className="text-sm">{question.force_description}</p>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                {question.force_weight !== null && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Force Weight:
                    </p>
                    <ForceScoreDisplay
                      force={question.jtbd_force}
                      score={question.force_weight}
                      maxScore={10}
                      variant="minimal"
                      size="sm"
                      showLabel={false}
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  {question.validation?.required && (
                    <Badge variant="destructive" className="text-xs">
                      Required
                    </Badge>
                  )}
                  
                  {question.scoring_weight !== 1 && (
                    <Badge variant="secondary" className="text-xs">
                      Weight: {question.scoring_weight}x
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Score display */}
          {showScore && typeof score === 'number' && question.jtbd_force && (
            <div className="pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Current Score:
              </p>
              <ForceScoreDisplay
                force={question.jtbd_force}
                score={score}
                maxScore={maxScore}
                variant="default"
                size="sm"
                showLabel={false}
                animated={animated}
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
  
  // Default variant
  return (
    <Card
      ref={ref}
      className={cn(
        "transition-all duration-200",
        interactive && "cursor-pointer hover:shadow-md hover:scale-[1.01]",
        selected && "ring-2 ring-teal-500 ring-offset-2",
        animated && "animate-fade-in",
        className
      )}
      onClick={handleSelect}
      style={style}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">
                {getQuestionTypeIcon(question.question_type)}
              </span>
              <Badge variant="outline" className="text-xs">
                {getQuestionTypeLabel(question.question_type)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                #{question.order_index + 1}
              </span>
            </div>
            
            {showForceInfo && question.jtbd_force && (
              <ForceIndicator 
                force={question.jtbd_force}
                size="sm"
              />
            )}
          </div>
          
          {/* Question text */}
          <p className="text-sm font-medium leading-relaxed">
            {question.question_text}
          </p>
          
          {/* Additional info */}
          {(question.description || question.help_text) && (
            <p className="text-xs text-muted-foreground">
              {question.description || question.help_text}
            </p>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              {question.validation?.required && (
                <Badge variant="secondary" className="text-xs">
                  Required
                </Badge>
              )}
              
              {question.jtbd_force && question.force_weight !== null && (
                <span className="text-xs text-muted-foreground">
                  Weight: {question.force_weight}/10
                </span>
              )}
            </div>
            
            {showScore && typeof score === 'number' && (
              <div className="text-xs font-medium">
                Score: {score.toFixed(1)}/{maxScore}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
JTBDQuestionCard.displayName = "JTBDQuestionCard"

// Grid component for displaying multiple question cards
interface JTBDQuestionGridProps {
  questions: SurveyTemplateQuestion[]
  showForceInfo?: boolean
  showScore?: boolean
  scores?: Record<string, number>
  maxScore?: number
  variant?: 'default' | 'compact' | 'detailed'
  interactive?: boolean
  selectedQuestions?: string[]
  onSelect?: (questionId: string) => void
  animated?: boolean
  filterByForce?: JTBDForceType | null
  sortBy?: 'order' | 'force' | 'score'
  className?: string
  style?: React.CSSProperties
}

const JTBDQuestionGrid = React.forwardRef<
  HTMLDivElement, 
  JTBDQuestionGridProps
>(({
  className,
  questions,
  showForceInfo = true,
  showScore = false,
  scores = {},
  maxScore = 10,
  variant = 'default',
  interactive = false,
  selectedQuestions = [],
  onSelect,
  animated = false,
  filterByForce,
  sortBy = 'order',
  style
}, ref) => {
  // Filter and sort questions
  let processedQuestions = [...questions]
  
  if (filterByForce) {
    processedQuestions = processedQuestions.filter(q => q.jtbd_force === filterByForce)
  }
  
  switch (sortBy) {
    case 'force':
      processedQuestions.sort((a, b) => {
        if (!a.jtbd_force && !b.jtbd_force) return 0
        if (!a.jtbd_force) return 1
        if (!b.jtbd_force) return -1
        return a.jtbd_force.localeCompare(b.jtbd_force)
      })
      break
    case 'score':
      processedQuestions.sort((a, b) => {
        const scoreA = a.id ? scores[a.id] || 0 : 0
        const scoreB = b.id ? scores[b.id] || 0 : 0
        return scoreB - scoreA // Descending order
      })
      break
    case 'order':
    default:
      processedQuestions.sort((a, b) => a.order_index - b.order_index)
      break
  }
  
  const gridClasses = {
    compact: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
    default: "grid grid-cols-1 lg:grid-cols-2 gap-4",
    detailed: "space-y-4"
  }
  
  return (
    <div
      ref={ref}
      className={cn(gridClasses[variant], className)}
      style={style}
    >
      {processedQuestions.map((question, index) => (
        <JTBDQuestionCard
          key={question.id || index}
          question={question}
          showForceInfo={showForceInfo}
          showScore={showScore}
          score={question.id ? scores[question.id] : undefined}
          maxScore={maxScore}
          variant={variant}
          interactive={interactive}
          selected={question.id ? selectedQuestions.includes(question.id) : false}
          onSelect={onSelect}
          animated={animated}
          style={animated ? {
            animationDelay: `${index * 100}ms`
          } : undefined}
        />
      ))}
    </div>
  )
})
JTBDQuestionGrid.displayName = "JTBDQuestionGrid"

export { JTBDQuestionCard, JTBDQuestionGrid }
export type { JTBDQuestionCardProps, JTBDQuestionGridProps }