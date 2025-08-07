'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  Settings,
  Type,
  ListChecks,
  ToggleLeft,
  Star,
  Calendar,
  Upload,
  Hash,
  Mail,
  Clock,
  Palette,
  PenTool,
  BarChart3,
  Users,
  ArrowUpDown,
  Eye,
  Zap
} from 'lucide-react'
import { TemplateQuestion, QuestionType, JTBDCategory, QuestionGroup } from '@/lib/types'
import { cn } from '@/lib/utils'

// Question type configurations
const QUESTION_TYPES = [
  { 
    type: 'text' as QuestionType, 
    label: 'Text Input', 
    icon: Type, 
    description: 'Single line text input',
    category: 'Basic'
  },
  { 
    type: 'textarea' as QuestionType, 
    label: 'Long Text', 
    icon: Type, 
    description: 'Multi-line text input',
    category: 'Basic'
  },
  { 
    type: 'multiple_choice' as QuestionType, 
    label: 'Multiple Choice', 
    icon: ListChecks, 
    description: 'Select multiple options',
    category: 'Choice'
  },
  { 
    type: 'single_choice' as QuestionType, 
    label: 'Single Choice', 
    icon: ListChecks, 
    description: 'Select one option',
    category: 'Choice'
  },
  { 
    type: 'boolean' as QuestionType, 
    label: 'Yes/No', 
    icon: ToggleLeft, 
    description: 'Boolean choice',
    category: 'Choice'
  },
  { 
    type: 'scale' as QuestionType, 
    label: 'Scale', 
    icon: Hash, 
    description: 'Numerical scale rating',
    category: 'Rating'
  },
  { 
    type: 'rating' as QuestionType, 
    label: 'Star Rating', 
    icon: Star, 
    description: 'Star-based rating',
    category: 'Rating'
  },
  { 
    type: 'ranking' as QuestionType, 
    label: 'Ranking', 
    icon: ArrowUpDown, 
    description: 'Drag to rank options',
    category: 'Advanced'
  },
  { 
    type: 'matrix' as QuestionType, 
    label: 'Matrix', 
    icon: BarChart3, 
    description: 'Matrix/grid of questions',
    category: 'Advanced'
  },
  { 
    type: 'jtbd' as QuestionType, 
    label: 'JTBD Forces', 
    icon: Zap, 
    description: 'Jobs-to-be-Done analysis',
    category: 'JTBD'
  },
  { 
    type: 'number' as QuestionType, 
    label: 'Number', 
    icon: Hash, 
    description: 'Numeric input',
    category: 'Input'
  },
  { 
    type: 'email' as QuestionType, 
    label: 'Email', 
    icon: Mail, 
    description: 'Email address input',
    category: 'Input'
  },
  { 
    type: 'date' as QuestionType, 
    label: 'Date', 
    icon: Calendar, 
    description: 'Date picker',
    category: 'Input'
  },
  { 
    type: 'time' as QuestionType, 
    label: 'Time', 
    icon: Clock, 
    description: 'Time picker',
    category: 'Input'
  },
  { 
    type: 'file_upload' as QuestionType, 
    label: 'File Upload', 
    icon: Upload, 
    description: 'File attachment',
    category: 'Input'
  },
  { 
    type: 'color' as QuestionType, 
    label: 'Color Picker', 
    icon: Palette, 
    description: 'Color selection',
    category: 'Input'
  },
  { 
    type: 'signature' as QuestionType, 
    label: 'Signature', 
    icon: PenTool, 
    description: 'Digital signature',
    category: 'Input'
  }
]

const QUESTION_CATEGORIES = [
  'Basic',
  'Choice', 
  'Rating',
  'Input',
  'Advanced',
  'JTBD'
]

const JTBD_CATEGORIES: JTBDCategory[] = [
  'functional',
  'emotional', 
  'social',
  'push_force',
  'pull_force',
  'habit_force',
  'anxiety_force'
]

interface QuestionBuilderProps {
  questions: TemplateQuestion[]
  groups: QuestionGroup[]
  onQuestionsChange: (questions: TemplateQuestion[]) => void
  onGroupsChange: (groups: QuestionGroup[]) => void
  className?: string
}

interface SortableQuestionProps {
  question: TemplateQuestion
  onEdit: (question: TemplateQuestion) => void
  onDelete: (questionId: string) => void
  onDuplicate: (question: TemplateQuestion) => void
}

function SortableQuestion({ question, onEdit, onDelete, onDuplicate }: SortableQuestionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const questionType = QUESTION_TYPES.find(t => t.type === question.questionType)
  const Icon = questionType?.icon || Type

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative',
        isDragging && 'opacity-50'
      )}
    >
      <Card className="glass-card hover:bg-white/5 transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start space-x-3">
            <div
              {...attributes}
              {...listeners}
              className="mt-1 cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity"
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Icon className="h-4 w-4 text-teal-400" />
                  <Badge variant="outline" className="text-xs">
                    {questionType?.label}
                  </Badge>
                  {question.required && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                  {question.jtbdCategory && (
                    <Badge variant="secondary" className="text-xs">
                      {question.jtbdCategory.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => onEdit(question)}
                    className="h-7 w-7 p-0"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => onDuplicate(question)}
                    className="h-7 w-7 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => onDelete(question.id)}
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <h4 className="font-medium text-white mt-2 line-clamp-2">
                {question.questionText}
              </h4>
              {question.description && (
                <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                  {question.description}
                </p>
              )}
              {question.options && question.options.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {question.options.slice(0, 3).map((option: any, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {typeof option === 'string' ? option : option.label || option.value}
                    </Badge>
                  ))}
                  {question.options.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{question.options.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}

export function QuestionBuilder({ 
  questions, 
  groups, 
  onQuestionsChange, 
  onGroupsChange, 
  className 
}: QuestionBuilderProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<TemplateQuestion | null>(null)
  const [showQuestionLibrary, setShowQuestionLibrary] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = questions.findIndex(q => q.id === active.id)
      const newIndex = questions.findIndex(q => q.id === over?.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newQuestions = arrayMove(questions, oldIndex, newIndex)
        // Update order indices
        const updatedQuestions = newQuestions.map((q, index) => ({
          ...q,
          orderIndex: index
        }))
        onQuestionsChange(updatedQuestions)
      }
    }

    setActiveId(null)
  }

  const addQuestion = (type: QuestionType) => {
    const newQuestion: TemplateQuestion = {
      id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      templateId: '',
      questionText: `New ${QUESTION_TYPES.find(t => t.type === type)?.label} Question`,
      questionType: type,
      required: false,
      orderIndex: questions.length,
      options: type === 'multiple_choice' || type === 'single_choice' ? ['Option 1', 'Option 2'] : [],
      validationRules: {},
      tags: [],
      analyticsEnabled: true,
      displayConditions: {},
      skipLogic: {},
      jtbdWeight: 1.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    onQuestionsChange([...questions, newQuestion])
  }

  const editQuestion = (question: TemplateQuestion) => {
    setEditingQuestion(question)
  }

  const updateQuestion = (updatedQuestion: TemplateQuestion) => {
    const updatedQuestions = questions.map(q => 
      q.id === updatedQuestion.id ? updatedQuestion : q
    )
    onQuestionsChange(updatedQuestions)
    setEditingQuestion(null)
  }

  const duplicateQuestion = (question: TemplateQuestion) => {
    const duplicatedQuestion: TemplateQuestion = {
      ...question,
      id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      questionText: `${question.questionText} (Copy)`,
      orderIndex: questions.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    onQuestionsChange([...questions, duplicatedQuestion])
  }

  const deleteQuestion = (questionId: string) => {
    const updatedQuestions = questions
      .filter(q => q.id !== questionId)
      .map((q, index) => ({ ...q, orderIndex: index }))
    onQuestionsChange(updatedQuestions)
  }

  const activeQuestion = activeId ? questions.find(q => q.id === activeId) : null

  return (
    <div className={cn('space-y-6', className)}>
      {/* Question Library */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Question Library</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowQuestionLibrary(!showQuestionLibrary)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showQuestionLibrary ? 'Hide' : 'Show'} Library
            </Button>
          </div>
        </CardHeader>
        {showQuestionLibrary && (
          <CardContent>
            <Tabs defaultValue="Basic">
              <TabsList className="grid w-full grid-cols-6">
                {QUESTION_CATEGORIES.map(category => (
                  <TabsTrigger key={category} value={category}>
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
              {QUESTION_CATEGORIES.map(category => (
                <TabsContent key={category} value={category}>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {QUESTION_TYPES
                      .filter(type => type.category === category)
                      .map(type => {
                        const Icon = type.icon
                        return (
                          <Button
                            key={type.type}
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-white/10"
                            onClick={() => addQuestion(type.type)}
                          >
                            <Icon className="h-6 w-6 text-teal-400" />
                            <div className="text-center">
                              <div className="text-sm font-medium">{type.label}</div>
                              <div className="text-xs text-gray-400">{type.description}</div>
                            </div>
                          </Button>
                        )
                      })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        )}
      </Card>

      {/* Questions List */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">
              Questions ({questions.length})
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button size="sm" variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <div className="text-center py-12">
              <Type className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No questions yet</h3>
              <p className="text-gray-400 mb-4">
                Add questions from the library above to get started.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions.map(q => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {questions.map((question) => (
                    <SortableQuestion
                      key={question.id}
                      question={question}
                      onEdit={editQuestion}
                      onDelete={deleteQuestion}
                      onDuplicate={duplicateQuestion}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeQuestion && (
                  <div className="opacity-95">
                    <SortableQuestion
                      question={activeQuestion}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      onDuplicate={() => {}}
                    />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Question Editor Modal */}
      {editingQuestion && (
        <QuestionEditor
          question={editingQuestion}
          onSave={updateQuestion}
          onCancel={() => setEditingQuestion(null)}
        />
      )}
    </div>
  )
}

// Question Editor Component
interface QuestionEditorProps {
  question: TemplateQuestion
  onSave: (question: TemplateQuestion) => void
  onCancel: () => void
}

function QuestionEditor({ question, onSave, onCancel }: QuestionEditorProps) {
  const [formData, setFormData] = useState<TemplateQuestion>(question)

  const handleSave = () => {
    onSave({
      ...formData,
      updatedAt: new Date().toISOString()
    })
  }

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), `Option ${(prev.options?.length || 0) + 1}`]
    }))
  }

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }))
  }

  const updateOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => i === index ? value : opt) || []
    }))
  }

  const needsOptions = ['multiple_choice', 'single_choice', 'scale', 'ranking'].includes(formData.questionType)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-white">Edit Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Question Text</Label>
            <Textarea
              value={formData.questionText}
              onChange={(e) => setFormData(prev => ({ ...prev, questionText: e.target.value }))}
              placeholder="Enter your question..."
              rows={3}
            />
          </div>

          <div>
            <Label>Description (Optional)</Label>
            <Input
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional context or instructions..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Question Type</Label>
              <Select
                value={formData.questionType}
                onValueChange={(value: QuestionType) => 
                  setFormData(prev => ({ ...prev, questionType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map(type => (
                    <SelectItem key={type.type} value={type.type}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>JTBD Category (Optional)</Label>
              <Select
                value={formData.jtbdCategory || 'none'}
                onValueChange={(value) => 
                  setFormData(prev => ({ 
                    ...prev, 
                    jtbdCategory: value === 'none' ? undefined : value as JTBDCategory 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No JTBD Category</SelectItem>
                  {JTBD_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {needsOptions && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Options</Label>
                <Button size="sm" variant="outline" onClick={addOption}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>
              <div className="space-y-2">
                {formData.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={typeof option === 'string' ? option : option.label || option.value || ''}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeOption(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.required}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, required: checked }))
                }
              />
              <Label>Required</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.analyticsEnabled}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, analyticsEnabled: checked }))
                }
              />
              <Label>Analytics Enabled</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Question
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}