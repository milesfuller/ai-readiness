'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Edit,
  Copy,
  Share,
  Download,
  Eye,
  MoreVertical,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Star,
  Globe,
  Building,
  Lock,
  Zap,
  AlertCircle,
  BarChart3,
  History,
  Settings,
  Trash2,
  Layout
} from 'lucide-react'
import Link from 'next/link'
import { SurveyTemplate, TemplateQuestion, TemplateVersion } from '@/lib/types'
import { templateService } from '@/lib/services/template-service'
import { TemplatePreview } from '@/components/templates/template-preview'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const CATEGORY_COLORS: Record<string, string> = {
  ai_readiness: 'from-blue-500 to-cyan-500',
  customer_feedback: 'from-green-500 to-emerald-500',
  employee_engagement: 'from-purple-500 to-pink-500',
  market_research: 'from-orange-500 to-red-500',
  product_evaluation: 'from-teal-500 to-blue-500',
  training_assessment: 'from-indigo-500 to-purple-500',
  custom: 'from-slate-500 to-gray-600'
}

export default function TemplateDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const templateId = params.templateId as string

  const [template, setTemplate] = useState<SurveyTemplate | null>(null)
  const [questions, setQuestions] = useState<TemplateQuestion[]>([])
  const [versions, setVersions] = useState<TemplateVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (templateId) {
      loadTemplate()
    }
  }, [templateId])

  const loadTemplate = async () => {
    try {
      setLoading(true)
      setError(null)

      const [templateData, questionsData] = await Promise.all([
        templateService.getTemplate(templateId),
        templateService.getTemplateQuestions(templateId)
      ])

      setTemplate(templateData)
      setQuestions(questionsData)

      // Load versions if available
      try {
        const versionsData = await templateService.getTemplateVersions(templateId)
        setVersions(versionsData)
      } catch (error) {
        // Versions might not be available
        console.warn('Could not load template versions:', error)
      }

    } catch (error) {
      console.error('Failed to load template:', error)
      setError(error instanceof Error ? error.message : 'Failed to load template')
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicate = async () => {
    if (!template) return

    try {
      const newTitle = `${template.title} (Copy)`
      await templateService.duplicateTemplate(templateId, newTitle, user?.organizationId)
      toast.success('Template duplicated successfully!')
      router.push('/admin/templates')
    } catch (error) {
      toast.error('Failed to duplicate template')
      console.error('Failed to duplicate template:', error)
    }
  }

  const handleDelete = async () => {
    if (!template) return

    if (confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      try {
        await templateService.deleteTemplate(templateId)
        toast.success('Template deleted successfully!')
        router.push('/admin/templates')
      } catch (error) {
        toast.error('Failed to delete template')
        console.error('Failed to delete template:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'marketplace': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'draft': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'archived': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public': return <Globe className="h-4 w-4" />
      case 'organization': return <Building className="h-4 w-4" />
      case 'marketplace': return <Star className="h-4 w-4" />
      default: return <Lock className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/templates">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Link>
          </Button>
        </div>

        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Template Not Found</h3>
            <p className="text-gray-400 mb-4">
              {error || 'The requested template could not be found.'}
            </p>
            <Button asChild>
              <Link href="/admin/templates">
                Return to Templates
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
        </div>
        <div className="flex items-center space-x-3">
          <TemplatePreview 
            template={template} 
            questions={questions}
            trigger={
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            }
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreVertical className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/templates/${templateId}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Template
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Share className="h-4 w-4 mr-2" />
                Share Template
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-400 focus:text-red-300"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Template Header Info */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div 
                  className={cn(
                    'w-4 h-4 rounded-full bg-gradient-to-r',
                    CATEGORY_COLORS[template.category] || CATEGORY_COLORS.custom
                  )}
                />
                <span className="text-sm text-gray-400 capitalize">
                  {template.category.replace('_', ' ')}
                </span>
                {template.isSystemTemplate && (
                  <Badge variant="outline">System Template</Badge>
                )}
              </div>
              
              <CardTitle className="text-2xl text-white mb-2">
                {template.title}
              </CardTitle>
              
              {template.description && (
                <CardDescription className="text-base">
                  {template.description}
                </CardDescription>
              )}

              <div className="flex items-center space-x-4 mt-4">
                <Badge className={getStatusColor(template.status)}>
                  {template.status.charAt(0).toUpperCase() + template.status.slice(1)}
                </Badge>
                <div className="flex items-center text-gray-400">
                  {getVisibilityIcon(template.visibility)}
                  <span className="ml-1 text-sm capitalize">{template.visibility}</span>
                </div>
                <div className="text-sm text-gray-400">
                  v{template.version}
                </div>
              </div>
            </div>

            <div className="text-right space-y-2">
              <div className="flex items-center text-gray-400 text-sm">
                <Calendar className="h-4 w-4 mr-1" />
                Updated {formatDate(template.updatedAt)}
              </div>
              {template.publishedAt && (
                <div className="flex items-center text-gray-400 text-sm">
                  <Star className="h-4 w-4 mr-1" />
                  Published {formatDate(template.publishedAt)}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Questions</p>
                <p className="text-2xl font-bold text-white">{questions.length}</p>
              </div>
              <Layout className="h-8 w-8 text-teal-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Duration</p>
                <p className="text-2xl font-bold text-white">{template.estimatedDuration}m</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Usage Count</p>
                <p className="text-2xl font-bold text-white">{template.usageCount}</p>
              </div>
              <Users className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Completion Rate</p>
                <p className="text-2xl font-bold text-white">{template.completionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="versions">Versions ({versions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Content Preview */}
            <div className="lg:col-span-2 space-y-6">
              {template.introductionText && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-white">Introduction</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {template.introductionText}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">Question Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {questions.slice(0, 5).map((question, index) => (
                      <div key={question.id} className="flex items-start space-x-3 p-3 rounded-lg bg-white/5">
                        <div className="flex-shrink-0 w-6 h-6 bg-teal-500/20 rounded-full flex items-center justify-center text-xs text-teal-400 font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium line-clamp-2">
                            {question.questionText}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {question.questionType.replace('_', ' ')}
                            </Badge>
                            {question.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {questions.length > 5 && (
                      <p className="text-center text-gray-400 text-sm">
                        ... and {questions.length - 5} more questions
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {template.conclusionText && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-white">Conclusion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {template.conclusionText}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar Info */}
            <div className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">Template Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-400">Difficulty Level</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <Star 
                            key={level}
                            className={cn(
                              'h-4 w-4',
                              level <= template.difficultyLevel
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-600'
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-white text-sm">
                        {template.difficultyLevel}/5
                      </span>
                    </div>
                  </div>

                  {template.tags.length > 0 && (
                    <div>
                      <Label className="text-gray-400">Tags</Label>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-gray-400">Created By</Label>
                    <p className="text-white text-sm mt-1">
                      {(template as any).created_by_profile?.first_name} {(template as any).created_by_profile?.last_name} 
                      {!(template as any).created_by_profile && 'Unknown User'}
                    </p>
                  </div>

                  {(template as any).organization && (
                    <div>
                      <Label className="text-gray-400">Organization</Label>
                      <p className="text-white text-sm mt-1">
                        {(template as any).organization.name}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {template.usageCount > 0 && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-white">Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Completion Rate</span>
                        <span className="text-teal-400">{template.completionRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={template.completionRate} />
                    </div>
                    
                    <div>
                      <Label className="text-gray-400">Average Time</Label>
                      <p className="text-white text-sm mt-1">
                        {template.averageTime.toFixed(1)} minutes
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">All Questions</CardTitle>
              <CardDescription>
                Complete list of questions in this template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="p-4 rounded-lg bg-white/5 border border-gray-700">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center text-sm text-teal-400 font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-white">
                            {question.questionText}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {question.questionType.replace('_', ' ')}
                            </Badge>
                            {question.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                        </div>
                        
                        {question.description && (
                          <p className="text-gray-400 text-sm mb-2">
                            {question.description}
                          </p>
                        )}
                        
                        {question.options && question.options.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {question.options.map((option: any, optIndex: number) => (
                              <Badge key={optIndex} variant="secondary" className="text-xs">
                                {typeof option === 'string' ? option : option.label || option.value}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Template Settings</CardTitle>
              <CardDescription>
                Configuration options for this template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-white">Survey Options</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <span className="text-gray-300">Allow Anonymous</span>
                      <Badge variant={template.settings.allowAnonymous ? 'default' : 'secondary'}>
                        {template.settings.allowAnonymous ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <span className="text-gray-300">Voice Input</span>
                      <Badge variant={template.settings.voiceEnabled ? 'default' : 'secondary'}>
                        {template.settings.voiceEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <span className="text-gray-300">AI Analysis</span>
                      <Badge variant={template.settings.aiAnalysisEnabled ? 'default' : 'secondary'}>
                        {template.settings.aiAnalysisEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-white">Display Options</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <span className="text-gray-300">Progress Bar</span>
                      <Badge variant={template.settings.showProgressBar ? 'default' : 'secondary'}>
                        {template.settings.showProgressBar ? 'Show' : 'Hide'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <span className="text-gray-300">Save Progress</span>
                      <Badge variant={template.settings.saveProgress ? 'default' : 'secondary'}>
                        {template.settings.saveProgress ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {template.settings.customBranding && (
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium text-white">Branding</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-white/5">
                      <Label className="text-gray-400">Primary Color</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: template.settings.customBranding.primaryColor }}
                        />
                        <span className="text-white text-sm">
                          {template.settings.customBranding.primaryColor}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <Label className="text-gray-400">Secondary Color</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: template.settings.customBranding.secondaryColor }}
                        />
                        <span className="text-white text-sm">
                          {template.settings.customBranding.secondaryColor}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Template Analytics
              </CardTitle>
              <CardDescription>
                Usage statistics and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {template.usageCount > 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Analytics Available</h3>
                  <p>This template has been used {template.usageCount} times.</p>
                  <p className="text-sm mt-2">Detailed analytics coming soon!</p>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Usage Data</h3>
                  <p>This template hasn't been used yet.</p>
                  <p className="text-sm mt-2">Analytics will appear once the template is used in surveys.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <History className="h-5 w-5 mr-2" />
                Version History
              </CardTitle>
              <CardDescription>
                Track changes and revert to previous versions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {versions.length > 0 ? (
                <div className="space-y-3">
                  {versions.map((version) => (
                    <div key={version.id} className="p-4 rounded-lg bg-white/5 border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">v{version.versionNumber}</Badge>
                            {version.versionNumber === template.version && (
                              <Badge>Current</Badge>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm mt-1">
                            {formatDate(version.createdAt)}
                          </p>
                          {version.versionNotes && (
                            <p className="text-white text-sm mt-2">
                              {version.versionNotes}
                            </p>
                          )}
                        </div>
                        {version.versionNumber !== template.version && (
                          <Button variant="outline" size="sm">
                            Restore
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <History className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Version History</h3>
                  <p>Version history will appear when you make changes to the template.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}