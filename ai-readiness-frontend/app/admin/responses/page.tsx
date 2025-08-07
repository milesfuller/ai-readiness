'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AdminPagination } from '@/components/admin/pagination'
import { ResponseExportDialog } from '@/components/admin/response-export-dialog'
import { 
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  Clock,
  User,
  Building2,
  Briefcase,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Flag,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Target,
  FileText,
  Users,
  Star
} from 'lucide-react'
import Link from 'next/link'
import { searchResponses, type DetailedSurveyResponse } from '@/lib/services/response-service'

interface ResponseFilters {
  search: string
  status: 'all' | 'completed' | 'in_progress' | 'abandoned'
  department: string
  surveyId: string
  confidenceThreshold: number
  completionThreshold: number
  dateRange: {
    start: string
    end: string
  } | null
}

export default function ResponsesPage() {
  const { user } = useAuth()
  const [responses, setResponses] = useState<DetailedSurveyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalResponses, setTotalResponses] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)

  const [filters, setFilters] = useState<ResponseFilters>({
    search: '',
    status: 'all',
    department: '',
    surveyId: '',
    confidenceThreshold: 0,
    completionThreshold: 0,
    dateRange: null
  })

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedResponses, setSelectedResponses] = useState<string[]>([])

  useEffect(() => {
    if (user) {
      loadResponses()
    }
  }, [user, currentPage, pageSize, filters])

  const loadResponses = async () => {
    try {
      setLoading(true)
      setError(null)

      const searchFilters = {
        search: filters.search || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        department: filters.department || undefined,
        surveyId: filters.surveyId || undefined,
        confidenceThreshold: filters.confidenceThreshold > 0 ? filters.confidenceThreshold : undefined,
        completionThreshold: filters.completionThreshold > 0 ? filters.completionThreshold : undefined,
        dateRange: filters.dateRange || undefined
      }

      const result = await searchResponses(
        user?.role as string,
        user?.organizationId,
        searchFilters,
        { page: currentPage, pageSize }
      )

      setResponses(result.data)
      setTotalResponses(result.total)
      setTotalPages(result.totalPages)
    } catch (err) {
      console.error('Failed to load responses:', err)
      setError(err instanceof Error ? err.message : 'Failed to load responses')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof ResponseFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleSelectResponse = (responseId: string) => {
    setSelectedResponses(prev => 
      prev.includes(responseId) 
        ? prev.filter(id => id !== responseId)
        : [...prev, responseId]
    )
  }

  const handleSelectAll = () => {
    if (selectedResponses.length === responses.length) {
      setSelectedResponses([])
    } else {
      setSelectedResponses(responses.map(r => r.id))
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
      case 'in_progress':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>
      case 'abandoned':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Abandoned</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.2) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (sentiment < -0.2) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <BarChart3 className="h-4 w-4 text-gray-500" />
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  if (!user) {
    return <div>Please log in to view responses.</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Survey Responses</h1>
          <p className="text-gray-400">Manage and analyze individual survey responses</p>
        </div>
        <div className="flex items-center space-x-2">
          {selectedResponses.length > 0 && (
            <>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Selected ({selectedResponses.length})
              </Button>
              <Button variant="outline" size="sm">
                <Flag className="h-4 w-4 mr-2" />
                Bulk Actions
              </Button>
            </>
          )}
          <Button onClick={loadResponses} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Responses</p>
                <p className="text-2xl font-bold text-white">{totalResponses}</p>
              </div>
              <FileText className="h-8 w-8 text-teal-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-white">
                  {responses.filter(r => r.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-white">
                  {responses.filter(r => r.status === 'in_progress').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Completion</p>
                <p className="text-2xl font-bold text-white">
                  {responses.length > 0 
                    ? Math.round((responses.reduce((sum, r) => sum + (r.answers.length / r.totalQuestions), 0) / responses.length) * 100)
                    : 0}%
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter Responses
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showAdvancedFilters ? 'Simple' : 'Advanced'} Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Name, email, survey..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Status</Label>
                <Select value={filters.status} onValueChange={(value: any) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="abandoned">Abandoned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Department</Label>
                <Select value={filters.department} onValueChange={(value) => handleFilterChange('department', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Departments</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="HR">Human Resources</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Results per page</Label>
                <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                <div className="space-y-4">
                  <h4 className="font-medium">Quality Filters</h4>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm">Min Confidence Score</Label>
                      <span className="text-sm text-gray-500">{filters.confidenceThreshold}/5</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={filters.confidenceThreshold}
                      onChange={(e) => handleFilterChange('confidenceThreshold', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm">Min Completion Rate</Label>
                      <span className="text-sm text-gray-500">{Math.round(filters.completionThreshold * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={filters.completionThreshold}
                      onChange={(e) => handleFilterChange('completionThreshold', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Date Range</h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-sm">From</Label>
                      <Input
                        type="date"
                        value={filters.dateRange?.start || ''}
                        onChange={(e) => handleFilterChange('dateRange', {
                          ...filters.dateRange,
                          start: e.target.value
                        })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">To</Label>
                      <Input
                        type="date"
                        value={filters.dateRange?.end || ''}
                        onChange={(e) => handleFilterChange('dateRange', {
                          ...filters.dateRange,
                          end: e.target.value
                        })}
                      />
                    </div>
                  </div>

                  {filters.dateRange?.start || filters.dateRange?.end ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('dateRange', null)}
                    >
                      Clear Date Range
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Response List */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Response List ({totalResponses} total)
              </CardTitle>
              <CardDescription>
                Individual survey responses with analysis insights
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedResponses.length === responses.length && responses.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label className="text-sm">Select All</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading responses...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Failed to Load Responses</h3>
              <p className="text-gray-400 mb-4">{error}</p>
              <Button onClick={loadResponses}>Try Again</Button>
            </div>
          ) : responses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No responses found matching your criteria</p>
              <p className="text-sm">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map((response) => {
                const completionRate = (response.answers.length / response.totalQuestions) * 100
                const avgConfidence = response.answers.reduce((sum, a) => sum + (a.confidence || 0), 0) / response.answers.length
                
                return (
                  <div
                    key={response.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50/5 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        checked={selectedResponses.includes(response.id)}
                        onCheckedChange={() => handleSelectResponse(response.id)}
                      />
                      
                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {/* Participant Info */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-white">
                              {response.participant.firstName} {response.participant.lastName}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <Building2 className="h-3 w-3" />
                            <span>{response.participant.department || 'No Dept'}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <Briefcase className="h-3 w-3" />
                            <span>{response.participant.jobTitle || 'No Title'}</span>
                          </div>
                        </div>

                        {/* Survey Info */}
                        <div className="space-y-2">
                          <div className="font-medium text-white text-sm">
                            {response.surveyTitle.length > 40 
                              ? response.surveyTitle.substring(0, 40) + '...' 
                              : response.surveyTitle}
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(response.status)}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <Calendar className="h-3 w-3" />
                            <span>{formatTimeAgo(response.startedAt)}</span>
                          </div>
                        </div>

                        {/* Progress & Quality */}
                        <div className="space-y-2">
                          <div className="text-sm">
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-400">Completion</span>
                              <span className="text-white font-medium">{Math.round(completionRate)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div 
                                className="bg-teal-400 h-1 rounded-full" 
                                style={{ width: `${completionRate}%` }}
                              />
                            </div>
                          </div>
                          
                          <div className="text-sm">
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-400">Confidence</span>
                              <span className="text-white font-medium">{avgConfidence.toFixed(1)}/5</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-3 w-3 ${
                                    i < Math.round(avgConfidence) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/organization/responses/${response.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </Button>
                          
                          <ResponseExportDialog responseId={response.id} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <AdminPagination
          pagination={{
            page: currentPage,
            pageSize: 10,
            total: totalPages * 10
          }}
          onPageChange={setCurrentPage}
          onPageSizeChange={() => {}}
        />
      )}
    </div>
  )
}