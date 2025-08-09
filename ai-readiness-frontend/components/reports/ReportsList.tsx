"use client"

import React, { useState, useMemo } from 'react'
import { DateRange } from 'react-day-picker'
import { 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Eye, 
  Trash2, 
  Filter, 
  Search, 
  Calendar,
  FileText,
  MoreHorizontal,
  Check,
  X,
  AlertCircle,
  Clock,
  CheckCircle,
  RefreshCw,
  Calendar as CalendarIcon
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface Report {
  id: string
  name: string
  type: 'executive' | 'analytics' | 'jtbd' | 'voice' | 'segment'
  format: 'pdf' | 'excel' | 'powerpoint' | 'json' | 'html'
  createdAt: Date
  status: 'generating' | 'completed' | 'failed' | 'queued'
  progress?: number
  fileUrl?: string
  fileSize?: number
  errorMessage?: string
  createdBy: string
  organization: string
  description?: string
  tags?: string[]
}

interface SortConfig {
  key: keyof Report | null
  direction: 'asc' | 'desc'
}

interface FilterConfig {
  types: string[]
  statuses: string[]
  formats: string[]
  dateRange?: DateRange
}

interface BulkAction {
  type: 'download' | 'delete'
  reportIds: string[]
}

// ============================================================================
// MOCK DATA (In a real app, this would come from an API)
// ============================================================================

const mockReports: Report[] = [
  {
    id: 'report_001',
    name: 'Q4 2024 Executive Summary',
    type: 'executive',
    format: 'pdf',
    createdAt: new Date('2024-12-15T10:30:00'),
    status: 'completed',
    fileUrl: '/reports/q4-exec-summary.pdf',
    fileSize: 2048576, // 2MB
    createdBy: 'John Doe',
    organization: 'Acme Corp',
    description: 'Comprehensive executive summary covering Q4 performance metrics',
    tags: ['quarterly', 'executive', 'performance']
  },
  {
    id: 'report_002',
    name: 'User Journey Analytics Report',
    type: 'jtbd',
    format: 'excel',
    createdAt: new Date('2024-12-14T14:22:00'),
    status: 'completed',
    fileUrl: '/reports/user-journey-analytics.xlsx',
    fileSize: 1536000, // 1.5MB
    createdBy: 'Jane Smith',
    organization: 'Acme Corp',
    description: 'JTBD analysis with force diagrams and user insights',
    tags: ['jtbd', 'analytics', 'user-journey']
  },
  {
    id: 'report_003',
    name: 'Voice Analytics Dashboard',
    type: 'voice',
    format: 'html',
    createdAt: new Date('2024-12-13T16:45:00'),
    status: 'generating',
    progress: 65,
    createdBy: 'Mike Johnson',
    organization: 'Acme Corp',
    description: 'Interactive voice analytics with sentiment analysis',
    tags: ['voice', 'sentiment', 'interactive']
  },
  {
    id: 'report_004',
    name: 'Segment Performance Analysis',
    type: 'segment',
    format: 'powerpoint',
    createdAt: new Date('2024-12-12T09:15:00'),
    status: 'failed',
    errorMessage: 'Insufficient data for requested time period',
    createdBy: 'Sarah Wilson',
    organization: 'Acme Corp',
    description: 'Detailed segment performance with recommendations',
    tags: ['segments', 'performance', 'recommendations']
  },
  {
    id: 'report_005',
    name: 'Monthly Analytics Summary',
    type: 'analytics',
    format: 'pdf',
    createdAt: new Date('2024-12-10T11:00:00'),
    status: 'queued',
    createdBy: 'Tom Brown',
    organization: 'Acme Corp',
    description: 'Monthly overview of key metrics and trends',
    tags: ['monthly', 'metrics', 'trends']
  }
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusIcon = (status: Report['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'generating':
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    case 'queued':
      return <Clock className="h-4 w-4 text-yellow-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-400" />
  }
}

const getStatusBadgeVariant = (status: Report['status']) => {
  switch (status) {
    case 'completed':
      return 'default' as const
    case 'generating':
      return 'secondary' as const
    case 'failed':
      return 'destructive' as const
    case 'queued':
      return 'outline' as const
    default:
      return 'secondary' as const
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatReportType = (type: Report['type']): string => {
  const typeMap = {
    executive: 'Executive',
    analytics: 'Analytics',
    jtbd: 'JTBD Analysis',
    voice: 'Voice Analytics',
    segment: 'Segment Analysis'
  }
  return typeMap[type]
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ReportsList: React.FC = () => {
  // State management
  const [reports, setReports] = useState<Report[]>(mockReports)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' })
  const [filters, setFilters] = useState<FilterConfig>({
    types: [],
    statuses: [],
    formats: [],
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReports, setSelectedReports] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<string | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  // Filter and sort reports
  const filteredAndSortedReports = useMemo(() => {
    let filtered = reports.filter(report => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description?.toLowerCase().includes(searchTerm.toLowerCase())

      // Type filter
      const matchesType = filters.types.length === 0 || filters.types.includes(report.type)
      
      // Status filter
      const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(report.status)
      
      // Format filter
      const matchesFormat = filters.formats.length === 0 || filters.formats.includes(report.format)
      
      // Date range filter
      const matchesDateRange = !filters.dateRange?.from || !filters.dateRange?.to ||
        (report.createdAt >= filters.dateRange.from && report.createdAt <= filters.dateRange.to)

      return matchesSearch && matchesType && matchesStatus && matchesFormat && matchesDateRange
    })

    // Sort
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key!]
        const bValue = b[sortConfig.key!]
        
        if (aValue === undefined || bValue === undefined) return 0
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [reports, sortConfig, filters, searchTerm])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedReports.length / itemsPerPage)
  const paginatedReports = filteredAndSortedReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Handlers
  const handleSort = (key: keyof Report) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReports(paginatedReports.map(r => r.id))
    } else {
      setSelectedReports([])
    }
  }

  const handleSelectReport = (reportId: string, checked: boolean) => {
    if (checked) {
      setSelectedReports(prev => [...prev, reportId])
    } else {
      setSelectedReports(prev => prev.filter(id => id !== reportId))
    }
  }

  const handleDownload = (report: Report) => {
    if (report.fileUrl && report.status === 'completed') {
      // In a real app, this would trigger a file download
      window.open(report.fileUrl, '_blank')
    }
  }

  const handlePreview = (report: Report) => {
    if (report.fileUrl && report.status === 'completed') {
      // In a real app, this would open a preview modal or new tab
      console.log('Opening preview for:', report.name)
    }
  }

  const handleDelete = (reportId: string) => {
    setReports(prev => prev.filter(r => r.id !== reportId))
    setDeleteDialogOpen(false)
    setReportToDelete(null)
  }

  const handleBulkDelete = () => {
    setReports(prev => prev.filter(r => !selectedReports.includes(r.id)))
    setSelectedReports([])
    setBulkDeleteDialogOpen(false)
  }

  const handleBulkDownload = () => {
    const completedReports = reports.filter(r => 
      selectedReports.includes(r.id) && r.status === 'completed' && r.fileUrl
    )
    
    completedReports.forEach(report => {
      if (report.fileUrl) {
        window.open(report.fileUrl, '_blank')
      }
    })
  }

  const clearAllFilters = () => {
    setFilters({
      types: [],
      statuses: [],
      formats: [],
    })
    setSearchTerm('')
  }

  const isAllSelected = paginatedReports.length > 0 && 
    paginatedReports.every(r => selectedReports.includes(r.id))
  const isIndeterminate = selectedReports.length > 0 && 
    !isAllSelected

  // Empty state
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No reports generated yet</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Start by generating your first report using the Report Generator. 
          Once created, all your reports will appear here for easy access and management.
        </p>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Generate First Report
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reports</h2>
          <p className="text-muted-foreground">
            Manage and download your generated reports
          </p>
        </div>
        
        {/* Bulk Actions */}
        {selectedReports.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="mr-2">
              {selectedReports.length} selected
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDownload}
              disabled={!reports.some(r => selectedReports.includes(r.id) && r.status === 'completed')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports by name, creator, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Type
                {filters.types.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.types.length}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Report Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {['executive', 'analytics', 'jtbd', 'voice', 'segment'].map(type => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={filters.types.includes(type)}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({
                      ...prev,
                      types: checked 
                        ? [...prev.types, type]
                        : prev.types.filter(t => t !== type)
                    }))
                  }}
                >
                  {formatReportType(type as Report['type'])}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Status
                {filters.statuses.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.statuses.length}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {['completed', 'generating', 'failed', 'queued'].map(status => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={filters.statuses.includes(status)}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({
                      ...prev,
                      statuses: checked 
                        ? [...prev.statuses, status]
                        : prev.statuses.filter(s => s !== status)
                    }))
                  }}
                >
                  <span className="flex items-center gap-2">
                    {getStatusIcon(status as Report['status'])}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Format Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Format
                {filters.formats.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.formats.length}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {['pdf', 'excel', 'powerpoint', 'json', 'html'].map(format => (
                <DropdownMenuCheckboxItem
                  key={format}
                  checked={filters.formats.includes(format)}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({
                      ...prev,
                      formats: checked 
                        ? [...prev.formats, format]
                        : prev.formats.filter(f => f !== format)
                    }))
                  }}
                >
                  {format.toUpperCase()}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date Range Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Date Range
                {filters.dateRange?.from && (
                  <Badge variant="secondary" className="ml-2">
                    1
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-4">
              <DropdownMenuLabel>Filter by Creation Date</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="pt-2">
                <DatePickerWithRange
                  value={filters.dateRange}
                  onChange={(range) => setFilters(prev => ({ ...prev, dateRange: range }))}
                  placeholder="Select date range"
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters */}
          {(filters.types.length > 0 || filters.statuses.length > 0 || filters.formats.length > 0 || 
            filters.dateRange?.from || searchTerm) && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {paginatedReports.length} of {filteredAndSortedReports.length} reports
        </span>
        <Select value={itemsPerPage.toString()} onValueChange={(value) => {
          setItemsPerPage(Number(value))
          setCurrentPage(1)
        }}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  ref={(el) => {
                    if (el) (el as any).indeterminate = isIndeterminate
                  }}
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Report Name
                  {sortConfig.key === 'name' && (
                    sortConfig.direction === 'asc' ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center gap-2">
                  Type
                  {sortConfig.key === 'type' && (
                    sortConfig.direction === 'asc' ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('format')}
              >
                <div className="flex items-center gap-2">
                  Format
                  {sortConfig.key === 'format' && (
                    sortConfig.direction === 'asc' ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center gap-2">
                  Created Date
                  {sortConfig.key === 'createdAt' && (
                    sortConfig.direction === 'asc' ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-2">
                  Status
                  {sortConfig.key === 'status' && (
                    sortConfig.direction === 'asc' ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No reports found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or filter criteria
                    </p>
                    <Button variant="outline" onClick={clearAllFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedReports.includes(report.id)}
                      onCheckedChange={(checked) => handleSelectReport(report.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{report.name}</div>
                      {report.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {report.description}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Created by {report.createdBy}
                      </div>
                      {report.fileSize && report.status === 'completed' && (
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(report.fileSize)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatReportType(report.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {report.format.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {report.createdAt.toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {report.createdAt.toLocaleTimeString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(report.status)}
                      <Badge variant={getStatusBadgeVariant(report.status)}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </Badge>
                      {report.status === 'generating' && report.progress && (
                        <span className="text-xs text-muted-foreground">
                          {report.progress}%
                        </span>
                      )}
                    </div>
                    {report.status === 'failed' && report.errorMessage && (
                      <div className="text-xs text-red-500 mt-1 line-clamp-1">
                        {report.errorMessage}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {report.status === 'completed' && report.fileUrl && (
                          <>
                            <DropdownMenuItem onClick={() => handlePreview(report)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(report)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setReportToDelete(report.id)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setReportToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => reportToDelete && handleDelete(reportToDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Reports</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedReports.length} selected reports? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
            >
              Delete {selectedReports.length} Reports
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}