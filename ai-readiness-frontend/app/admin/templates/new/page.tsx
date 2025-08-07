'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  ArrowLeft,
  Save,
  Eye,
  Share,
  Settings,
  Palette,
  Zap,
  Clock,
  Users,
  Layout,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { SurveyTemplate, TemplateQuestion, TemplateCategory, QuestionGroup } from '@/lib/types'
import { templateService } from '@/lib/services/template-service'
import { QuestionBuilder } from '@/components/templates/question-builder'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const DIFFICULTY_LEVELS = [
  { value: 1, label: 'Very Easy', description: '1-3 questions, < 2 minutes' },
  { value: 2, label: 'Easy', description: '4-8 questions, 2-5 minutes' },
  { value: 3, label: 'Medium', description: '9-15 questions, 5-10 minutes' },
  { value: 4, label: 'Hard', description: '16-25 questions, 10-20 minutes' },
  { value: 5, label: 'Very Hard', description: '25+ questions, 20+ minutes' }
]

export default function NewTemplatePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [questions, setQuestions] = useState<TemplateQuestion[]>([])
  const [groups, setGroups] = useState<QuestionGroup[]>([])
  const [templateData, setTemplateData] = useState({
    title: '',
    description: '',
    category: 'custom' as TemplateCategory,
    visibility: 'private',
    estimatedDuration: 10,
    difficultyLevel: 1,
    tags: [] as string[],
    introductionText: '',
    conclusionText: '',
    settings: {
      allowAnonymous: true,
      requireAllQuestions: false,
      voiceEnabled: true,
      aiAnalysisEnabled: false,
      randomizeQuestions: false,
      showProgressBar: true,
      allowSkipQuestions: false,
      saveProgress: true,
      customBranding: {
        primaryColor: '#14B8A6',
        secondaryColor: '#8B5CF6',
        logo: ''
      }
    }
  })
  const [currentTagInput, setCurrentTagInput] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const categoryData = await templateService.getTemplateCategories()
      setCategories(categoryData)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleSave = async (publish = false) => {
    try {
      setSaving(true)

      if (!templateData.title.trim()) {
        toast.error('Template title is required')
        return
      }

      if (questions.length === 0) {
        toast.error('At least one question is required')
        return
      }

      // Calculate estimated duration based on questions
      const estimatedDuration = Math.max(
        templateData.estimatedDuration,
        Math.ceil(questions.length * 0.5) // 30 seconds per question minimum
      )

      // Create template
      const template: Partial<SurveyTemplate> = {
        title: templateData.title,
        description: templateData.description,
        category: templateData.category,
        visibility: templateData.visibility as any,
        estimatedDuration,
        difficultyLevel: templateData.difficultyLevel,
        tags: templateData.tags,
        introductionText: templateData.introductionText,
        conclusionText: templateData.conclusionText,
        settings: templateData.settings,
        organizationId: user?.organizationId,
        status: publish ? 'published' : 'draft'
      }

      const createdTemplate = await templateService.createTemplate(template)

      // Add questions to template
      if (questions.length > 0) {
        await templateService.updateQuestions(createdTemplate.id, questions)
      }

      toast.success(`Template ${publish ? 'published' : 'saved'} successfully!`)
      router.push(`/admin/templates/${createdTemplate.id}`)

    } catch (error) {
      console.error('Failed to save template:', error)
      toast.error('Failed to save template. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const addTag = (tag: string) => {
    if (tag.trim() && !templateData.tags.includes(tag.trim())) {
      setTemplateData(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }))
    }
    setCurrentTagInput('')
  }

  const removeTag = (tagToRemove: string) => {
    setTemplateData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(currentTagInput)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/templates">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Create New Template</h1>
            <p className="text-gray-400">Build a reusable survey template</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" disabled={saving}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button 
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            <Share className="h-4 w-4 mr-2" />
            {saving ? 'Publishing...' : 'Publish Template'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Template Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Template Title *</Label>
                <Input
                  value={templateData.title}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter template title..."
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={templateData.description}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this template is used for..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Category</Label>
                <Select
                  value={templateData.category}
                  onValueChange={(value: TemplateCategory) => 
                    setTemplateData(prev => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        <div className="flex items-center space-x-2">
                          <span>{category.icon}</span>
                          <span>{category.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Visibility</Label>
                <Select
                  value={templateData.visibility}
                  onValueChange={(value) => 
                    setTemplateData(prev => ({ ...prev, visibility: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private - Only me</SelectItem>
                    <SelectItem value="organization">Organization - My organization</SelectItem>
                    <SelectItem value="public">Public - Everyone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    value={templateData.estimatedDuration}
                    onChange={(e) => setTemplateData(prev => ({ 
                      ...prev, 
                      estimatedDuration: parseInt(e.target.value) || 1 
                    }))}
                    min="1"
                    max="120"
                  />
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select
                    value={templateData.difficultyLevel.toString()}
                    onValueChange={(value) => 
                      setTemplateData(prev => ({ ...prev, difficultyLevel: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value.toString()}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="space-y-2">
                  <Input
                    value={currentTagInput}
                    onChange={(e) => setCurrentTagInput(e.target.value)}
                    onKeyDown={handleTagKeyPress}
                    onBlur={() => addTag(currentTagInput)}
                    placeholder="Add tags (press Enter or comma to add)..."
                  />
                  {templateData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {templateData.tags.map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary"
                          className="cursor-pointer hover:bg-red-500/20"
                          onClick={() => removeTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Options */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Template Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Allow Anonymous Responses</Label>
                <Switch
                  checked={templateData.settings.allowAnonymous}
                  onCheckedChange={(checked) => 
                    setTemplateData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, allowAnonymous: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Require All Questions</Label>
                <Switch
                  checked={templateData.settings.requireAllQuestions}
                  onCheckedChange={(checked) => 
                    setTemplateData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, requireAllQuestions: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Enable Voice Input</Label>
                <Switch
                  checked={templateData.settings.voiceEnabled}
                  onCheckedChange={(checked) => 
                    setTemplateData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, voiceEnabled: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>AI Analysis</Label>
                <Switch
                  checked={templateData.settings.aiAnalysisEnabled}
                  onCheckedChange={(checked) => 
                    setTemplateData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, aiAnalysisEnabled: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Show Progress Bar</Label>
                <Switch
                  checked={templateData.settings.showProgressBar}
                  onCheckedChange={(checked) => 
                    setTemplateData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, showProgressBar: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Save Progress</Label>
                <Switch
                  checked={templateData.settings.saveProgress}
                  onCheckedChange={(checked) => 
                    setTemplateData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, saveProgress: checked }
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Primary Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="color"
                    value={templateData.settings.customBranding.primaryColor}
                    onChange={(e) => 
                      setTemplateData(prev => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          customBranding: {
                            ...prev.settings.customBranding,
                            primaryColor: e.target.value
                          }
                        }
                      }))
                    }
                    className="w-12 h-8 p-1 border-none"
                  />
                  <Input
                    value={templateData.settings.customBranding.primaryColor}
                    onChange={(e) => 
                      setTemplateData(prev => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          customBranding: {
                            ...prev.settings.customBranding,
                            primaryColor: e.target.value
                          }
                        }
                      }))
                    }
                    placeholder="#14B8A6"
                  />
                </div>
              </div>

              <div>
                <Label>Secondary Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="color"
                    value={templateData.settings.customBranding.secondaryColor}
                    onChange={(e) => 
                      setTemplateData(prev => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          customBranding: {
                            ...prev.settings.customBranding,
                            secondaryColor: e.target.value
                          }
                        }
                      }))
                    }
                    className="w-12 h-8 p-1 border-none"
                  />
                  <Input
                    value={templateData.settings.customBranding.secondaryColor}
                    onChange={(e) => 
                      setTemplateData(prev => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          customBranding: {
                            ...prev.settings.customBranding,
                            secondaryColor: e.target.value
                          }
                        }
                      }))
                    }
                    placeholder="#8B5CF6"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="content" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
              <TabsTrigger value="logic">Logic & Flow</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">Introduction & Conclusion</CardTitle>
                  <CardDescription>
                    Customize the text shown at the beginning and end of your survey
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Introduction Text</Label>
                    <Textarea
                      value={templateData.introductionText}
                      onChange={(e) => setTemplateData(prev => ({ ...prev, introductionText: e.target.value }))}
                      placeholder="Welcome message shown to respondents at the start..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Conclusion Text</Label>
                    <Textarea
                      value={templateData.conclusionText}
                      onChange={(e) => setTemplateData(prev => ({ ...prev, conclusionText: e.target.value }))}
                      placeholder="Thank you message shown after completion..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="questions" className="space-y-6">
              <QuestionBuilder
                questions={questions}
                groups={groups}
                onQuestionsChange={setQuestions}
                onGroupsChange={setGroups}
              />
            </TabsContent>

            <TabsContent value="logic" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">Conditional Logic & Skip Patterns</CardTitle>
                  <CardDescription>
                    Configure advanced question flow and conditional display logic
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-400">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
                    <p>Advanced logic and skip patterns will be available in a future update.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}