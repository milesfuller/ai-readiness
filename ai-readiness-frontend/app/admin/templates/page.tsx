'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Copy,
  Share,
  MoreVertical,
  Calendar,
  Users,
  Clock,
  Star,
  AlertCircle,
  RefreshCw,
  Layout,
  Zap,
  Globe,
  Building,
  Lock,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { SurveyTemplate, TemplateFilters, TemplateCategory } from '@/lib/types'
import { templateService, PaginatedTemplateResult } from '@/lib/services/template-service'
import { Pagination, type PaginationState } from '@/components/admin/pagination'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  ai_readiness: 'from-blue-500 to-cyan-500',
  customer_feedback: 'from-green-500 to-emerald-500',
  employee_engagement: 'from-purple-500 to-pink-500',
  market_research: 'from-orange-500 to-red-500',
  product_evaluation: 'from-teal-500 to-blue-500',
  training_assessment: 'from-indigo-500 to-purple-500',
  health_wellness: 'from-green-500 to-teal-500',
  event_feedback: 'from-yellow-500 to-orange-500',
  recruitment: 'from-gray-600 to-gray-800',
  ux_research: 'from-pink-500 to-rose-500',
  compliance: 'from-gray-500 to-slate-600',
  satisfaction: 'from-cyan-500 to-blue-600',
  performance: 'from-emerald-500 to-green-600',
  custom: 'from-slate-500 to-gray-600'
}

export default function TemplatesPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [templatesResult, setTemplatesResult] = useState<PaginatedTemplateResult<SurveyTemplate>>({
    data: [],
    pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 }
  })
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<TemplateFilters>({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    category: searchParams.get('category') as TemplateCategory || undefined,
    visibility: searchParams.get('visibility') || ''
  })
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 12,
    total: 0
  })

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const result = await templateService.getTemplates(filters, pagination.page, pagination.pageSize)
      setTemplatesResult(result)
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total
      }))
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      setError(error instanceof Error ? error.message : 'Failed to load templates')
      setTemplatesResult({
        data: [],
        pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 }
      })
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const categoryData = await templateService.getTemplateCategories(true)
      setCategories(categoryData)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [user, filters, pagination.page, pagination.pageSize])

  useEffect(() => {
    loadCategories()
  }, [])

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handlePageSizeChange = (pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }))
  }

  const handleDuplicate = async (template: SurveyTemplate) => {
    try {
      const newTitle = `${template.title} (Copy)`
      await templateService.duplicateTemplate(template.id, newTitle, user?.organizationId)
      loadTemplates()
    } catch (error) {
      console.error('Failed to duplicate template:', error)
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
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Survey Templates</h1>
            <p className="text-gray-400">Create and manage survey templates</p>
          </div>
          <Button asChild>
            <Link href="/admin/templates/new">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Link>
          </Button>
        </div>

        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Failed to Load Templates</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <Button onClick={loadTemplates} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
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
        <div>
          <h1 className="text-3xl font-bold text-white">Survey Templates</h1>
          <p className="text-gray-400">Create, manage, and share reusable survey templates</p>
        </div>
        <div className="flex space-x-3">
          <Button asChild variant="outline">
            <Link href="/admin/templates/marketplace">
              <Star className="h-4 w-4 mr-2" />
              Marketplace
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/templates/new">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Templates</p>
                <p className="text-2xl font-bold text-white">{templatesResult.pagination.total}</p>
              </div>
              <Layout className="h-8 w-8 text-teal-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Published</p>
                <p className="text-2xl font-bold text-white">
                  {templatesResult.data.filter(t => t.status === 'published').length}
                </p>
              </div>
              <Zap className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">In Marketplace</p>
                <p className="text-2xl font-bold text-white">
                  {templatesResult.data.filter(t => t.status === 'marketplace').length}
                </p>
              </div>
              <Star className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Usage</p>
                <p className="text-2xl font-bold text-white">
                  {templatesResult.data.reduce((sum, t) => sum + t.usageCount, 0).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filters.category || 'all'}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                category: value === 'all' ? undefined : value as TemplateCategory
              }))}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.icon} {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                status: value === 'all' ? '' : value 
              }))}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="marketplace">Marketplace</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.visibility || 'all'}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                visibility: value === 'all' ? '' : value 
              }))}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Access</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="marketplace">Marketplace</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {templatesResult.data.map((template) => (
          <Card key={template.id} className="glass-card hover:bg-white/5 transition-all duration-200 group">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div 
                      className={cn(
                        'w-3 h-3 rounded-full bg-gradient-to-r',
                        CATEGORY_COLORS[template.category] || CATEGORY_COLORS.custom
                      )}
                    />
                    <span className="text-xs text-gray-400 capitalize">
                      {template.category.replace('_', ' ')}
                    </span>
                    {template.isSystemTemplate && (
                      <Badge variant="outline" className="text-xs">System</Badge>
                    )}
                  </div>
                  <CardTitle className="text-white text-lg group-hover:text-teal-400 transition-colors">
                    {template.title}
                  </CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">
                    {template.description}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/templates/${template.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/templates/${template.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Template
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Share className="h-4 w-4 mr-2" />
                      Share Template
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(template.status)}>
                    {template.status.charAt(0).toUpperCase() + template.status.slice(1)}
                  </Badge>
                  <div className="flex items-center text-gray-400">
                    {getVisibilityIcon(template.visibility)}
                    <span className="ml-1 text-xs capitalize">{template.visibility}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  v{template.version}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(template.updatedAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Users className="h-4 w-4" />
                    <span>{template.questionGroups.reduce((sum, group) => sum + group.questions.length, 0)} questions</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>{template.estimatedDuration}min</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <TrendingUp className="h-4 w-4" />
                    <span>{template.usageCount} uses</span>
                  </div>
                </div>

                {/* Performance Metrics */}
                {template.usageCount > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Completion Rate</span>
                      <span className="text-teal-400">{template.completionRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-teal-500 to-purple-500 h-2 rounded-full"
                        style={{ width: `${Math.min(template.completionRate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templatesResult.data.length === 0 && !loading && (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Layout className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
            <p className="text-gray-400 mb-4">
              {Object.values(filters).some(f => f) 
                ? 'Try adjusting your filters to see more results.'
                : 'Get started by creating your first survey template.'
              }
            </p>
            {!Object.values(filters).some(f => f) && (
              <Button asChild>
                <Link href="/admin/templates/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {templatesResult.data.length > 0 && (
        <div className="mt-6">
          <Pagination
            pagination={pagination}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            className="border-t border-gray-700 pt-4"
          />
        </div>
      )}
    </div>
  )
}