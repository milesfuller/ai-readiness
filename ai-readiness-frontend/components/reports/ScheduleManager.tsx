"use client"

import React, { useState, useMemo } from 'react'
import { 
  Plus,
  Calendar,
  Clock,
  Mail,
  Users,
  Settings,
  Edit,
  Trash2,
  PlayCircle,
  PauseCircle,
  MoreHorizontal,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Timer,
  BarChart3,
  FileText,
  Eye
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly'
export type ScheduleStatus = 'active' | 'paused' | 'disabled' | 'error'
export type ReportType = 'executive' | 'analytics' | 'jtbd' | 'voice' | 'segment'
export type OutputFormat = 'pdf' | 'excel' | 'powerpoint' | 'json' | 'html'

export interface EmailRecipient {
  id: string
  email: string
  name?: string
  role?: string
}

export interface ScheduleConfig {
  id: string
  name: string
  description?: string
  reportType: ReportType
  outputFormat: OutputFormat
  frequency: ScheduleFrequency
  executionTime: string // HH:MM format
  executionDay?: number // For weekly (0-6, Sunday=0) or monthly (1-31)
  timezone: string
  isActive: boolean
  status: ScheduleStatus
  recipients: EmailRecipient[]
  parameters?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  createdBy: string
  lastRun?: {
    timestamp: Date
    status: 'success' | 'failed' | 'partial'
    reportId?: string
    errorMessage?: string
    duration?: number
  }
  nextRun?: Date
  runCount: number
  successRate: number
}

interface SortConfig {
  key: keyof ScheduleConfig | null
  direction: 'asc' | 'desc'
}

interface FilterConfig {
  frequencies: ScheduleFrequency[]
  statuses: ScheduleStatus[]
  reportTypes: ReportType[]
  activeOnly: boolean
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockSchedules: ScheduleConfig[] = [
  {
    id: 'schedule_001',
    name: 'Weekly Executive Summary',
    description: 'Comprehensive weekly executive report for leadership team',
    reportType: 'executive',
    outputFormat: 'pdf',
    frequency: 'weekly',
    executionTime: '08:00',
    executionDay: 1, // Monday
    timezone: 'America/New_York',
    isActive: true,
    status: 'active',
    recipients: [
      { id: '1', email: 'ceo@company.com', name: 'John Smith', role: 'CEO' },
      { id: '2', email: 'cto@company.com', name: 'Jane Doe', role: 'CTO' }
    ],
    createdAt: new Date('2024-11-01T10:00:00'),
    updatedAt: new Date('2024-12-01T10:00:00'),
    createdBy: 'admin@company.com',
    lastRun: {
      timestamp: new Date('2024-12-09T08:00:00'),
      status: 'success',
      reportId: 'report_123',
      duration: 45000 // 45 seconds
    },
    nextRun: new Date('2024-12-16T08:00:00'),
    runCount: 12,
    successRate: 100
  },
  {
    id: 'schedule_002',
    name: 'Daily Analytics Dashboard',
    description: 'Daily performance metrics and KPIs',
    reportType: 'analytics',
    outputFormat: 'html',
    frequency: 'daily',
    executionTime: '06:30',
    timezone: 'America/New_York',
    isActive: true,
    status: 'active',
    recipients: [
      { id: '3', email: 'analytics@company.com', name: 'Data Team' },
      { id: '4', email: 'marketing@company.com', name: 'Marketing Team' }
    ],
    createdAt: new Date('2024-10-15T14:30:00'),
    updatedAt: new Date('2024-12-12T06:30:00'),
    createdBy: 'data.lead@company.com',
    lastRun: {
      timestamp: new Date('2024-12-12T06:30:00'),
      status: 'success',
      reportId: 'report_456',
      duration: 15000 // 15 seconds
    },
    nextRun: new Date('2024-12-13T06:30:00'),
    runCount: 58,
    successRate: 98.3
  },
  {
    id: 'schedule_003',
    name: 'Monthly JTBD Analysis',
    description: 'Jobs-to-be-Done analysis with user journey insights',
    reportType: 'jtbd',
    outputFormat: 'excel',
    frequency: 'monthly',
    executionTime: '10:00',
    executionDay: 1, // 1st of month
    timezone: 'America/New_York',
    isActive: false,
    status: 'paused',
    recipients: [
      { id: '5', email: 'product@company.com', name: 'Product Team' },
      { id: '6', email: 'ux@company.com', name: 'UX Team' }
    ],
    createdAt: new Date('2024-09-01T09:00:00'),
    updatedAt: new Date('2024-12-01T10:15:00'),
    createdBy: 'product.manager@company.com',
    lastRun: {
      timestamp: new Date('2024-11-01T10:00:00'),
      status: 'success',
      reportId: 'report_789',
      duration: 120000 // 2 minutes
    },
    nextRun: new Date('2025-01-01T10:00:00'),
    runCount: 3,
    successRate: 100
  },
  {
    id: 'schedule_004',
    name: 'Quarterly Voice Analytics',
    description: 'Comprehensive voice of customer analysis',
    reportType: 'voice',
    outputFormat: 'powerpoint',
    frequency: 'quarterly',
    executionTime: '14:00',
    executionDay: 15, // 15th of quarter start month
    timezone: 'America/New_York',
    isActive: true,
    status: 'error',
    recipients: [
      { id: '7', email: 'customer.success@company.com', name: 'CS Team' }
    ],
    createdAt: new Date('2024-01-01T12:00:00'),
    updatedAt: new Date('2024-12-10T14:30:00'),
    createdBy: 'cs.manager@company.com',
    lastRun: {
      timestamp: new Date('2024-12-10T14:00:00'),
      status: 'failed',
      errorMessage: 'Insufficient data for analysis period',
      duration: 5000
    },
    nextRun: new Date('2025-01-15T14:00:00'),
    runCount: 4,
    successRate: 75
  },
  {
    id: 'schedule_005',
    name: 'Weekly Segment Performance',
    description: 'User segment performance and behavior analysis',
    reportType: 'segment',
    outputFormat: 'pdf',
    frequency: 'weekly',
    executionTime: '12:00',
    executionDay: 5, // Friday
    timezone: 'America/New_York',
    isActive: true,
    status: 'active',
    recipients: [
      { id: '8', email: 'growth@company.com', name: 'Growth Team' },
      { id: '9', email: 'sales@company.com', name: 'Sales Team' }
    ],
    createdAt: new Date('2024-11-15T11:00:00'),
    updatedAt: new Date('2024-12-06T12:00:00'),
    createdBy: 'growth.lead@company.com',
    lastRun: {
      timestamp: new Date('2024-12-06T12:00:00'),
      status: 'success',
      reportId: 'report_101',
      duration: 32000
    },
    nextRun: new Date('2024-12-13T12:00:00'),
    runCount: 4,
    successRate: 100
  }
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusIcon = (status: ScheduleStatus) => {
  switch (status) {
    case 'active':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'paused':
      return <PauseCircle className="h-4 w-4 text-yellow-500" />
    case 'disabled':
      return <X className="h-4 w-4 text-gray-400" />
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    default:
      return <RefreshCw className="h-4 w-4 text-blue-500" />
  }
}

const getStatusBadgeVariant = (status: ScheduleStatus) => {
  switch (status) {
    case 'active':
      return 'default' as const
    case 'paused':
      return 'secondary' as const
    case 'disabled':
      return 'outline' as const
    case 'error':
      return 'destructive' as const
    default:
      return 'secondary' as const
  }
}

const formatFrequency = (frequency: ScheduleFrequency): string => {
  return frequency.charAt(0).toUpperCase() + frequency.slice(1)
}

const formatReportType = (type: ReportType): string => {
  const typeMap = {
    executive: 'Executive',
    analytics: 'Analytics',
    jtbd: 'JTBD Analysis',
    voice: 'Voice Analytics',
    segment: 'Segment Analysis'
  }
  return typeMap[type]
}

const formatNextRunTime = (nextRun: Date): string => {
  const now = new Date()
  const diffMs = nextRun.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (diffDays > 0) {
    return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`
  } else if (diffHours > 0) {
    return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`
  } else {
    return 'Soon'
  }
}

const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

// ============================================================================
// CREATE/EDIT SCHEDULE DIALOG
// ============================================================================

interface CreateScheduleDialogProps {
  schedule?: ScheduleConfig
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSave: (schedule: Omit<ScheduleConfig, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'successRate'>) => void
}

const CreateScheduleDialog: React.FC<CreateScheduleDialogProps> = ({
  schedule,
  isOpen,
  onOpenChange,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: schedule?.name || '',
    description: schedule?.description || '',
    reportType: schedule?.reportType || 'analytics' as ReportType,
    outputFormat: schedule?.outputFormat || 'pdf' as OutputFormat,
    frequency: schedule?.frequency || 'weekly' as ScheduleFrequency,
    executionTime: schedule?.executionTime || '08:00',
    executionDay: schedule?.executionDay || 1,
    timezone: schedule?.timezone || 'America/New_York',
    isActive: schedule?.isActive ?? true,
    recipients: schedule?.recipients || []
  })
  
  const [recipientInput, setRecipientInput] = useState({ email: '', name: '', role: '' })

  const handleSave = () => {
    const newSchedule: Omit<ScheduleConfig, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'successRate'> = {
      ...formData,
      status: formData.isActive ? 'active' : 'paused',
      createdBy: 'current.user@company.com', // This would come from auth context
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mock next run time
    }
    onSave(newSchedule)
    onOpenChange(false)
  }

  const addRecipient = () => {
    if (recipientInput.email) {
      const newRecipient: EmailRecipient = {
        id: Date.now().toString(),
        email: recipientInput.email,
        name: recipientInput.name || undefined,
        role: recipientInput.role || undefined
      }
      setFormData(prev => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient]
      }))
      setRecipientInput({ email: '', name: '', role: '' })
    }
  }

  const removeRecipient = (id: string) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r.id !== id)
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {schedule ? 'Edit Schedule' : 'Create New Schedule'}
          </DialogTitle>
          <DialogDescription>
            Configure when and how reports should be automatically generated and delivered.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Schedule Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter schedule name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this scheduled report does"
                rows={2}
              />
            </div>
          </div>

          {/* Report Configuration */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Report Configuration</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select
                  value={formData.reportType}
                  onValueChange={(value: ReportType) => setFormData(prev => ({ ...prev, reportType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                    <SelectItem value="jtbd">JTBD Analysis</SelectItem>
                    <SelectItem value="voice">Voice Analytics</SelectItem>
                    <SelectItem value="segment">Segment Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Output Format</Label>
                <Select
                  value={formData.outputFormat}
                  onValueChange={(value: OutputFormat) => setFormData(prev => ({ ...prev, outputFormat: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="powerpoint">PowerPoint</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Schedule Configuration */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Schedule Configuration</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: ScheduleFrequency) => setFormData(prev => ({ ...prev, frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Execution Time</Label>
                <Input
                  type="time"
                  value={formData.executionTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, executionTime: e.target.value }))}
                />
              </div>

              {(formData.frequency === 'weekly' || formData.frequency === 'monthly') && (
                <div className="space-y-2">
                  <Label>
                    {formData.frequency === 'weekly' ? 'Day of Week' : 'Day of Month'}
                  </Label>
                  <Input
                    type="number"
                    min={formData.frequency === 'weekly' ? 0 : 1}
                    max={formData.frequency === 'weekly' ? 6 : 31}
                    value={formData.executionDay}
                    onChange={(e) => setFormData(prev => ({ ...prev, executionDay: parseInt(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.frequency === 'weekly' ? '0=Sunday, 1=Monday, ..., 6=Saturday' : '1-31'}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Email Recipients */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Email Recipients</h4>
            
            {/* Add Recipient Form */}
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={recipientInput.email}
                  onChange={(e) => setRecipientInput(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@company.com"
                />
              </div>
              <div className="col-span-3">
                <Label>Name (Optional)</Label>
                <Input
                  value={recipientInput.name}
                  onChange={(e) => setRecipientInput(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div className="col-span-3">
                <Label>Role (Optional)</Label>
                <Input
                  value={recipientInput.role}
                  onChange={(e) => setRecipientInput(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Manager"
                />
              </div>
              <div className="col-span-2">
                <Button onClick={addRecipient} size="sm" className="w-full">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Recipients List */}
            {formData.recipients.length > 0 && (
              <div className="space-y-2">
                {formData.recipients.map((recipient) => (
                  <div key={recipient.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{recipient.email}</div>
                        {(recipient.name || recipient.role) && (
                          <div className="text-xs text-muted-foreground">
                            {[recipient.name, recipient.role].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecipient(recipient.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
            <Label htmlFor="active">Enable schedule immediately</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.name || !formData.recipients.length}>
            {schedule ? 'Update Schedule' : 'Create Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ScheduleManager: React.FC = () => {
  // State management
  const [schedules, setSchedules] = useState<ScheduleConfig[]>(mockSchedules)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'nextRun', direction: 'asc' })
  const [filters, setFilters] = useState<FilterConfig>({
    frequencies: [],
    statuses: [],
    reportTypes: [],
    activeOnly: false
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleConfig | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null)

  // Filter and sort schedules
  const filteredAndSortedSchedules = useMemo(() => {
    let filtered = schedules.filter(schedule => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        schedule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.createdBy.toLowerCase().includes(searchTerm.toLowerCase())

      // Frequency filter
      const matchesFrequency = filters.frequencies.length === 0 || 
        filters.frequencies.includes(schedule.frequency)
      
      // Status filter
      const matchesStatus = filters.statuses.length === 0 || 
        filters.statuses.includes(schedule.status)
      
      // Report type filter
      const matchesReportType = filters.reportTypes.length === 0 || 
        filters.reportTypes.includes(schedule.reportType)
      
      // Active only filter
      const matchesActiveOnly = !filters.activeOnly || schedule.isActive

      return matchesSearch && matchesFrequency && matchesStatus && matchesReportType && matchesActiveOnly
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
  }, [schedules, sortConfig, filters, searchTerm])

  // Handlers
  const handleSort = (key: keyof ScheduleConfig) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSchedules(filteredAndSortedSchedules.map(s => s.id))
    } else {
      setSelectedSchedules([])
    }
  }

  const handleSelectSchedule = (scheduleId: string, checked: boolean) => {
    if (checked) {
      setSelectedSchedules(prev => [...prev, scheduleId])
    } else {
      setSelectedSchedules(prev => prev.filter(id => id !== scheduleId))
    }
  }

  const handleToggleSchedule = (scheduleId: string) => {
    setSchedules(prev => prev.map(s => 
      s.id === scheduleId 
        ? { 
            ...s, 
            isActive: !s.isActive, 
            status: !s.isActive ? 'active' : 'paused',
            updatedAt: new Date()
          }
        : s
    ))
  }

  const handleCreateSchedule = (scheduleData: Omit<ScheduleConfig, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'successRate'>) => {
    const newSchedule: ScheduleConfig = {
      ...scheduleData,
      id: `schedule_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      runCount: 0,
      successRate: 0
    }
    setSchedules(prev => [...prev, newSchedule])
  }

  const handleUpdateSchedule = (scheduleData: Omit<ScheduleConfig, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'successRate'>) => {
    if (!editingSchedule) return
    
    setSchedules(prev => prev.map(s => 
      s.id === editingSchedule.id
        ? {
            ...s,
            ...scheduleData,
            updatedAt: new Date()
          }
        : s
    ))
    setEditingSchedule(null)
  }

  const handleDeleteSchedule = (scheduleId: string) => {
    setSchedules(prev => prev.filter(s => s.id !== scheduleId))
    setDeleteDialogOpen(false)
    setScheduleToDelete(null)
  }

  const handleBulkToggle = (isActive: boolean) => {
    setSchedules(prev => prev.map(s => 
      selectedSchedules.includes(s.id)
        ? { 
            ...s, 
            isActive, 
            status: isActive ? 'active' : 'paused',
            updatedAt: new Date()
          }
        : s
    ))
    setSelectedSchedules([])
  }

  const clearAllFilters = () => {
    setFilters({
      frequencies: [],
      statuses: [],
      reportTypes: [],
      activeOnly: false
    })
    setSearchTerm('')
  }

  const isAllSelected = filteredAndSortedSchedules.length > 0 && 
    filteredAndSortedSchedules.every(s => selectedSchedules.includes(s.id))
  const isIndeterminate = selectedSchedules.length > 0 && !isAllSelected

  // Statistics
  const stats = useMemo(() => {
    const total = schedules.length
    const active = schedules.filter(s => s.isActive).length
    const avgSuccessRate = schedules.reduce((acc, s) => acc + s.successRate, 0) / total
    const totalRuns = schedules.reduce((acc, s) => acc + s.runCount, 0)
    
    return {
      total,
      active,
      avgSuccessRate: isNaN(avgSuccessRate) ? 0 : avgSuccessRate,
      totalRuns
    }
  }, [schedules])

  // Empty state
  if (schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No schedules configured</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Set up your first scheduled report to automatically generate and deliver 
          reports to your team on a regular basis.
        </p>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create First Schedule
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Schedule Manager</h2>
            <p className="text-muted-foreground">
              Manage automated report generation and delivery schedules
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedSchedules.length > 0 && (
              <>
                <Badge variant="secondary" className="mr-2">
                  {selectedSchedules.length} selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkToggle(true)}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Enable
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkToggle(false)}
                >
                  <PauseCircle className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              </>
            )}
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Schedules</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Calendar className="h-8 w-8 text-teal-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Schedules</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <PlayCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{stats.avgSuccessRate.toFixed(1)}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Runs</p>
                  <p className="text-2xl font-bold">{stats.totalRuns}</p>
                </div>
                <Timer className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search schedules by name, description, or creator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Frequency Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Frequency
                {filters.frequencies.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.frequencies.length}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Frequency</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {['daily', 'weekly', 'monthly', 'quarterly'].map(frequency => (
                <DropdownMenuCheckboxItem
                  key={frequency}
                  checked={filters.frequencies.includes(frequency as ScheduleFrequency)}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({
                      ...prev,
                      frequencies: checked 
                        ? [...prev.frequencies, frequency as ScheduleFrequency]
                        : prev.frequencies.filter(f => f !== frequency)
                    }))
                  }}
                >
                  {formatFrequency(frequency as ScheduleFrequency)}
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
              {['active', 'paused', 'disabled', 'error'].map(status => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={filters.statuses.includes(status as ScheduleStatus)}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({
                      ...prev,
                      statuses: checked 
                        ? [...prev.statuses, status as ScheduleStatus]
                        : prev.statuses.filter(s => s !== status)
                    }))
                  }}
                >
                  <span className="flex items-center gap-2">
                    {getStatusIcon(status as ScheduleStatus)}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Report Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Type
                {filters.reportTypes.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.reportTypes.length}
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
                  checked={filters.reportTypes.includes(type as ReportType)}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({
                      ...prev,
                      reportTypes: checked 
                        ? [...prev.reportTypes, type as ReportType]
                        : prev.reportTypes.filter(t => t !== type)
                    }))
                  }}
                >
                  {formatReportType(type as ReportType)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Active Only Toggle */}
          <Button
            variant={filters.activeOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters(prev => ({ ...prev, activeOnly: !prev.activeOnly }))}
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            Active Only
          </Button>

          {/* Clear Filters */}
          {(filters.frequencies.length > 0 || filters.statuses.length > 0 || 
            filters.reportTypes.length > 0 || filters.activeOnly || searchTerm) && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedSchedules.length} of {schedules.length} schedules
      </div>

      {/* Schedules Table */}
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
                  Schedule Name
                  {sortConfig.key === 'name' && (
                    sortConfig.direction === 'asc' ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('reportType')}
              >
                <div className="flex items-center gap-2">
                  Report Type
                  {sortConfig.key === 'reportType' && (
                    sortConfig.direction === 'asc' ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('frequency')}
              >
                <div className="flex items-center gap-2">
                  Frequency
                  {sortConfig.key === 'frequency' && (
                    sortConfig.direction === 'asc' ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('nextRun')}
              >
                <div className="flex items-center gap-2">
                  Next Run
                  {sortConfig.key === 'nextRun' && (
                    sortConfig.direction === 'asc' ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>Recipients</TableHead>
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
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedSchedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No schedules found</h3>
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
              filteredAndSortedSchedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedSchedules.includes(schedule.id)}
                      onCheckedChange={(checked) => handleSelectSchedule(schedule.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{schedule.name}</div>
                      {schedule.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {schedule.description}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Created by {schedule.createdBy}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatReportType(schedule.reportType)}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {schedule.outputFormat.toUpperCase()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {formatFrequency(schedule.frequency)}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {schedule.executionTime}
                    </div>
                  </TableCell>
                  <TableCell>
                    {schedule.nextRun ? (
                      <div>
                        <div className="text-sm font-medium">
                          {formatNextRunTime(schedule.nextRun)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {schedule.nextRun.toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Not scheduled</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{schedule.recipients.length}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(schedule.status)}
                      <Badge variant={getStatusBadgeVariant(schedule.status)}>
                        {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                      </Badge>
                    </div>
                    {schedule.lastRun && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Last: {schedule.lastRun.status} • {formatDuration(schedule.lastRun.duration || 0)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={schedule.isActive}
                      onCheckedChange={() => handleToggleSchedule(schedule.id)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {schedule.lastRun?.reportId && (
                          <>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Last Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => setEditingSchedule(schedule)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleSchedule(schedule.id)}
                        >
                          {schedule.isActive ? (
                            <>
                              <PauseCircle className="h-4 w-4 mr-2" />
                              Pause
                            </>
                          ) : (
                            <>
                              <PlayCircle className="h-4 w-4 mr-2" />
                              Enable
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setScheduleToDelete(schedule.id)
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

      {/* Create/Edit Dialog */}
      <CreateScheduleDialog
        schedule={editingSchedule || undefined}
        isOpen={createDialogOpen || !!editingSchedule}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false)
            setEditingSchedule(null)
          }
        }}
        onSave={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this schedule? This will stop all future 
              automatic report generation and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setScheduleToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => scheduleToDelete && handleDeleteSchedule(scheduleToDelete)}
            >
              Delete Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}