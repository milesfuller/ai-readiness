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
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { Survey, AdminFilters } from '@/lib/types'
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
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<AdminFilters>({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
  })

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        // Mock data for demonstration
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const mockSurveys: Survey[] = [
          {
            id: '1',
            title: 'AI Readiness Assessment',
            description: 'Comprehensive assessment of AI readiness across departments',
            status: 'active',
            createdBy: 'admin@company.com',
            organizationId: 'org1',
            questions: [],
            metadata: {
              estimatedDuration: 15,
              totalQuestions: 25,
              completionRate: 78.5,
              averageScore: 7.2
            },
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-20T14:30:00Z',
            responses: []
          },
          {
            id: '2',
            title: 'Digital Transformation Survey',
            description: 'Understanding current digital capabilities and future needs',
            status: 'completed',
            createdBy: 'manager@company.com',
            organizationId: 'org1',
            questions: [],
            metadata: {
              estimatedDuration: 20,
              totalQuestions: 30,
              completionRate: 92.1,
              averageScore: 8.1
            },
            createdAt: '2024-01-10T08:00:00Z',
            updatedAt: '2024-01-25T16:00:00Z',
            responses: []
          },
          {
            id: '3',
            title: 'Automation Readiness Check',
            description: 'Assessing readiness for process automation initiatives',
            status: 'draft',
            createdBy: 'admin@company.com',
            organizationId: 'org1',
            questions: [],
            metadata: {
              estimatedDuration: 12,
              totalQuestions: 20,
              completionRate: 0,
              averageScore: 0
            },
            createdAt: '2024-01-28T12:00:00Z',
            updatedAt: '2024-01-28T12:00:00Z',
            responses: []
          }
        ]

        // Filter based on user role
        let filteredSurveys = mockSurveys
        if (user?.role === 'org_admin') {
          filteredSurveys = mockSurveys.filter(survey => 
            survey.organizationId === user.organizationId
          )
        }

        // Apply search and status filters
        if (filters.search) {
          filteredSurveys = filteredSurveys.filter(survey =>
            survey.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
            survey.description.toLowerCase().includes(filters.search!.toLowerCase())
          )
        }

        if (filters.status) {
          filteredSurveys = filteredSurveys.filter(survey =>
            survey.status === filters.status
          )
        }

        setSurveys(filteredSurveys)
      } catch (error) {
        console.error('Failed to fetch surveys:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSurveys()
  }, [user, filters])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Surveys</h1>
          <p className="text-gray-400">Manage and monitor survey campaigns</p>
        </div>
        <Button asChild>
          <Link href="/admin/surveys/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Survey
          </Link>
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
        {surveys.map((survey) => (
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
                <div className="flex space-x-2 pt-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/admin/surveys/${survey.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/surveys/${survey.id}/analytics`}>
                      <BarChart3 className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {surveys.length === 0 && (
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
              <Button asChild>
                <Link href="/admin/surveys/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Survey
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}