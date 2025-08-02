'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Download,
  FileText,
  Table,
  Code,
  Calendar,
  Shield,
  AlertTriangle
} from 'lucide-react'
import { ExportOptions } from '@/lib/types'

interface ExportDialogProps {
  title?: string
  description?: string
  onExport: (options: ExportOptions) => void
  children?: React.ReactNode
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  title = "Export Data",
  description = "Configure your export settings",
  onExport,
  children
}) => {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    includePersonalData: false,
    dateRange: {
      start: '',
      end: ''
    },
    filters: {}
  })
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      await onExport(options)
      setOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatOptions = [
    {
      value: 'csv',
      label: 'CSV',
      description: 'Comma-separated values for spreadsheets',
      icon: Table
    },
    {
      value: 'pdf',
      label: 'PDF',
      description: 'Formatted report document',
      icon: FileText
    },
    {
      value: 'json',
      label: 'JSON',
      description: 'Structured data for developers',
      icon: Code
    }
  ]

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  const getLastMonthDate = () => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-card border-gray-600 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-white">Export Format</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {formatOptions.map((format) => (
                <div 
                  key={format.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    options.format === format.value
                      ? 'border-teal-500 bg-teal-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => setOptions(prev => ({ ...prev, format: format.value as any }))}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <format.icon className="h-4 w-4 text-teal-400" />
                    <span className="text-white font-medium">{format.label}</span>
                  </div>
                  <p className="text-xs text-gray-400">{format.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-white flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Date Range</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-gray-400">Start Date</Label>
                <Input
                  type="date"
                  value={options.dateRange?.start || getLastMonthDate()}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    dateRange: { 
                      start: e.target.value, 
                      end: prev.dateRange?.end || getTodayDate() 
                    }
                  }))}
                  max={getTodayDate()}
                />
              </div>
              <div>
                <Label className="text-sm text-gray-400">End Date</Label>
                <Input
                  type="date"
                  value={options.dateRange?.end || getTodayDate()}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    dateRange: { 
                      start: prev.dateRange?.start || getLastMonthDate(),
                      end: e.target.value 
                    }
                  }))}
                  max={getTodayDate()}
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <Label className="text-white">Filters</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-gray-400">Department</Label>
                <Select
                  value={options.filters?.department || 'all'}
                  onValueChange={(value) => setOptions(prev => ({
                    ...prev,
                    filters: { ...prev.filters, department: value === 'all' ? undefined : value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-gray-400">Status</Label>
                <Select
                  value={options.filters?.status || 'all'}
                  onValueChange={(value) => setOptions(prev => ({
                    ...prev,
                    filters: { ...prev.filters, status: value === 'all' ? undefined : value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="abandoned">Abandoned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Privacy Options */}
          <div className="space-y-3">
            <Label className="text-white flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Privacy & Data</span>
            </Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="personal-data"
                  checked={options.includePersonalData}
                  onCheckedChange={(checked: boolean) => 
                    setOptions(prev => ({ ...prev, includePersonalData: checked }))
                  }
                />
                <Label htmlFor="personal-data" className="text-sm text-gray-300">
                  Include personal data (names, emails)
                </Label>
              </div>
              
              {options.includePersonalData && (
                <div className="flex items-start space-x-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-yellow-300">
                    <p className="font-medium mb-1">Privacy Notice</p>
                    <p>Including personal data requires additional data protection measures. Ensure compliance with your organization's privacy policies.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Export Preview */}
          <div className="space-y-3">
            <Label className="text-white">Export Summary</Label>
            <div className="p-3 bg-white/5 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Format:</span>
                <Badge variant="outline">{options.format.toUpperCase()}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Date Range:</span>
                <span className="text-white text-xs">
                  {options.dateRange?.start || getLastMonthDate()} to {options.dateRange?.end || getTodayDate()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Personal Data:</span>
                <Badge variant={options.includePersonalData ? "destructive" : "default"}>
                  {options.includePersonalData ? "Included" : "Excluded"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            loading={loading}
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Exporting...' : 'Export Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}