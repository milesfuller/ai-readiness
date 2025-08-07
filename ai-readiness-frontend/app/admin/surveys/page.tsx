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
  Download,
  MoreVertical,
  Calendar,
  Users,
  BarChart3,
  FileText,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { Survey, AdminFilters } from '@/lib/types'
import { fetchSurveys, type PaginationOptions, type PaginatedResult } from '@/lib/services/admin'
import { Pagination, type PaginationState } from '@/components/admin/pagination'
import { 
  SurveyCreateDialog, 
  SurveyEditDialog, 
  SurveyDeleteDialog,
  SurveyQuickActions 
} from '@/components/admin/survey-crud'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function SurveysPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [surveysResult, setSurveysResult] = useState<PaginatedResult<Survey>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 12,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AdminFilters>({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
  })
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 12,
    total: 0
  })
  
  // CRUD dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null)

  const loadSurveys = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const userRole = user.role as string
      const organizationId = user.organizationId

      const paginationOptions: PaginationOptions = {
        page: pagination.page,
        pageSize: pagination.pageSize
      }
      
      const surveysData = await fetchSurveys(userRole, organizationId, filters, paginationOptions)
      setSurveysResult(surveysData)
      setPagination(prev => ({
        ...prev,
        total: surveysData.total
      }))
    } catch (error) {
      console.error('Failed to fetch surveys:', error)
      setError(error instanceof Error ? error.message : 'Failed to load surveys')
      setSurveysResult({
        data: [],
        total: 0,
        page: 1,
        pageSize: 12,
        totalPages: 0
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSurveys()
  }, [user, filters, pagination.page, pagination.pageSize])

  // CRUD handlers
  const handleCreateSuccess = (survey: Survey) => {
    // Reload to get accurate pagination
    loadSurveys()
  }

  const handleEditSuccess = (updatedSurvey: Survey) => {
    setSurveysResult(prev => ({
      ...prev,
      data: prev.data.map(s => 
        s.id === updatedSurvey.id ? updatedSurvey : s
      )
    }))
  }

  const handleDeleteSuccess = () => {
    // Reload to get accurate pagination
    loadSurveys()
  }

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handlePageSizeChange = (pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }))
  }

  const handleEdit = (survey: Survey) => {
    setSelectedSurvey(survey)
    setEditDialogOpen(true)
  }

  const handleDelete = (survey: Survey) => {
    setSelectedSurvey(survey)
    setDeleteDialogOpen(true)
  }

  const handleStatusChange = async (survey: Survey, status: Survey['status']) => {
    try {
      // You could implement updateSurvey call here
      console.log(`Changing status of ${survey.title} to ${status}`)
      // For now, just reload the surveys
      loadSurveys()
    } catch (error) {
      console.error('Failed to update survey status:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'draft': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'archived': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Surveys</h1>
            <p className="text-gray-400">Manage and monitor survey campaigns</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Survey
          </Button>
        </div>

        {/* Error State */}
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Failed to Load Surveys</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <Button onClick={loadSurveys} variant="outline">
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
          <h1 className="text-3xl font-bold text-white">Surveys</h1>
          <p className="text-gray-400">Manage and monitor survey campaigns</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Survey
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search surveys..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filters.status}
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Surveys Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {surveysResult.data.map((survey) => (
          <Card key={survey.id} className="glass-card hover:bg-white/5 transition-all duration-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-white text-lg">{survey.title}</CardTitle>
                  <CardDescription className="mt-1">{survey.description}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/surveys/${survey.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/surveys/${survey.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Survey
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex items-center space-x-2 mt-2">
                <Badge className={getStatusColor(survey.status)}>
                  {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(survey.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Users className="h-4 w-4" />
                    <span>{survey.metadata.totalQuestions} questions</span>
                  </div>
                </div>

                {/* Progress Bar */}
                {survey.status === 'active' && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Completion Rate</span>
                      <span className="text-teal-400">{survey.metadata.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-teal-500 to-purple-500 h-2 rounded-full"
                        style={{ width: `${survey.metadata.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2">
                  <SurveyQuickActions
                    survey={survey}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {surveysResult.data.length === 0 && !loading && (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No surveys found</h3>
            <p className="text-gray-400 mb-4">
              {filters.search || filters.status 
                ? 'Try adjusting your filters to see more results.'
                : 'Get started by creating your first survey.'
              }
            </p>
            {!filters.search && !filters.status && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Survey
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {surveysResult.data.length > 0 && (
        <div className="mt-6">
          <Pagination
            pagination={pagination}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            className="border-t border-gray-700 pt-4"
          />
        </div>
      )}

      {/* CRUD Dialogs */}
      <SurveyCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
        organizationId={user?.organizationId}
        createdBy={user?.id || ''}
      />

      <SurveyEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
        survey={selectedSurvey}
      />

      <SurveyDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleDeleteSuccess}
        survey={selectedSurvey}
      />
    </div>
  )
}