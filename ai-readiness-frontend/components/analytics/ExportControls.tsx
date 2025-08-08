'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Image, 
  Settings,
  Calendar,
  Filter,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'png'
  dateRange?: {
    start: string
    end: string
  }
  includeCharts: boolean
  includeRawData: boolean
  includeSummary: boolean
  includeInsights: boolean
  sections: string[]
  emailDelivery: boolean
  compressionLevel: 'none' | 'standard' | 'maximum'
}

interface ExportControlsProps {
  onExport: (options: ExportOptions) => Promise<void>
  availableSections?: string[]
  className?: string
}

export const ExportControls: React.FC<ExportControlsProps> = ({
  onExport,
  availableSections = [
    'Overview',
    'JTBD Analysis', 
    'Voice Analytics',
    'User Engagement',
    'Department Breakdown',
    'Trend Analysis'
  ],
  className = ''
}) => {
  const [open, setOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeCharts: true,
    includeRawData: false,
    includeSummary: true,
    includeInsights: true,
    sections: availableSections,
    emailDelivery: false,
    compressionLevel: 'standard'
  })

  const formatOptions = [
    { 
      value: 'pdf', 
      label: 'PDF Report', 
      icon: FileText, 
      description: 'Comprehensive report with charts and analysis',
      size: '~2-5 MB',
      color: 'text-red-400'
    },
    { 
      value: 'csv', 
      label: 'CSV Data', 
      icon: FileSpreadsheet, 
      description: 'Raw data in spreadsheet format',
      size: '~100-500 KB',
      color: 'text-green-400'
    },
    { 
      value: 'json', 
      label: 'JSON Data', 
      icon: FileText, 
      description: 'Structured data for API integration',
      size: '~200-800 KB',
      color: 'text-blue-400'
    },
    { 
      value: 'png', 
      label: 'Chart Images', 
      icon: Image, 
      description: 'High-resolution chart exports',
      size: '~1-3 MB',
      color: 'text-purple-400'
    }
  ]

  const compressionOptions = [
    { value: 'none', label: 'No Compression', description: 'Highest quality, larger file size' },
    { value: 'standard', label: 'Standard', description: 'Balanced quality and size' },
    { value: 'maximum', label: 'Maximum', description: 'Smaller file size, reduced quality' }
  ]

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExport(exportOptions)
      setOpen(false)
      toast.success(
        `Analytics exported as ${exportOptions.format.toUpperCase()}`, 
        {
          description: exportOptions.emailDelivery 
            ? 'Export will be delivered to your email' 
            : 'Download started automatically'
        }
      )
    } catch (error) {
      toast.error('Export failed', {
        description: 'Please try again or contact support if the issue persists'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const updateExportOptions = (key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }))
  }

  const toggleSection = (section: string) => {
    setExportOptions(prev => ({
      ...prev,
      sections: prev.sections.includes(section)
        ? prev.sections.filter(s => s !== section)
        : [...prev.sections, section]
    }))
  }

  const selectAllSections = () => {
    setExportOptions(prev => ({
      ...prev,
      sections: availableSections
    }))
  }

  const clearAllSections = () => {
    setExportOptions(prev => ({
      ...prev,
      sections: []
    }))
  }

  const selectedFormat = formatOptions.find(f => f.value === exportOptions.format)
  const estimatedSize = selectedFormat?.size || 'Unknown'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("group", className)}>
          <Download className="h-4 w-4 mr-2 group-hover:animate-pulse" />
          Export
        </Button>
      </DialogTrigger>
      
      <DialogContent className="glass-card max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5 text-teal-400" />
            <span>Export Analytics</span>
          </DialogTitle>
          <DialogDescription>
            Customize your analytics export with various formats and options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {formatOptions.map((format) => {
                const Icon = format.icon
                const isSelected = exportOptions.format === format.value
                
                return (
                  <Card 
                    key={format.value}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:scale-105",
                      isSelected 
                        ? "border-teal-500/50 bg-teal-500/10" 
                        : "border-gray-600 hover:border-gray-500"
                    )}
                    onClick={() => updateExportOptions('format', format.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isSelected ? "bg-teal-500/20" : "bg-gray-500/20"
                        )}>
                          <Icon className={cn("h-5 w-5", format.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white">{format.label}</h4>
                          <p className="text-xs text-gray-400 mt-1">{format.description}</p>
                          <Badge variant="outline" className="mt-2 text-xs">
                            {format.size}
                          </Badge>
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-teal-400 flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* Content Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Content Options</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCharts"
                    checked={exportOptions.includeCharts}
                    onCheckedChange={(checked) => updateExportOptions('includeCharts', checked)}
                    disabled={exportOptions.format === 'csv'}
                  />
                  <Label htmlFor="includeCharts" className="text-sm">Include Charts</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeSummary"
                    checked={exportOptions.includeSummary}
                    onCheckedChange={(checked) => updateExportOptions('includeSummary', checked)}
                  />
                  <Label htmlFor="includeSummary" className="text-sm">Include Summary</Label>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeRawData"
                    checked={exportOptions.includeRawData}
                    onCheckedChange={(checked) => updateExportOptions('includeRawData', checked)}
                  />
                  <Label htmlFor="includeRawData" className="text-sm">Include Raw Data</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeInsights"
                    checked={exportOptions.includeInsights}
                    onCheckedChange={(checked) => updateExportOptions('includeInsights', checked)}
                    disabled={exportOptions.format === 'csv'}
                  />
                  <Label htmlFor="includeInsights" className="text-sm">Include AI Insights</Label>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Sections to Include</Label>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" onClick={selectAllSections}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAllSections}>
                  Clear All
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {availableSections.map((section) => (
                <div key={section} className="flex items-center space-x-2">
                  <Checkbox
                    id={section}
                    checked={exportOptions.sections.includes(section)}
                    onCheckedChange={() => toggleSection(section)}
                  />
                  <Label htmlFor={section} className="text-sm">{section}</Label>
                </div>
              ))}
            </div>
            
            <div className="text-xs text-gray-400">
              {exportOptions.sections.length} of {availableSections.length} sections selected
            </div>
          </div>

          <Separator />

          {/* Advanced Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Advanced Options</span>
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Compression */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Compression Level</Label>
                <Select 
                  value={exportOptions.compressionLevel} 
                  onValueChange={(value) => updateExportOptions('compressionLevel', value)}
                  disabled={exportOptions.format === 'csv'}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {compressionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-400">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email Delivery */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emailDelivery"
                    checked={exportOptions.emailDelivery}
                    onCheckedChange={(checked) => updateExportOptions('emailDelivery', checked)}
                  />
                  <Label htmlFor="emailDelivery" className="text-xs text-gray-400">
                    Email delivery
                  </Label>
                </div>
                <p className="text-xs text-gray-500">
                  Send export to registered email address
                </p>
              </div>
            </div>
          </div>

          {/* Export Preview */}
          <div className="p-4 rounded-lg bg-white/5 border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">Export Preview</h4>
              <Badge variant="outline" className="text-teal-400 border-teal-400/50">
                {selectedFormat?.label}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Format:</span>
                <span className="ml-2 text-white">{selectedFormat?.label}</span>
              </div>
              <div>
                <span className="text-gray-400">Estimated Size:</span>
                <span className="ml-2 text-white">{estimatedSize}</span>
              </div>
              <div>
                <span className="text-gray-400">Sections:</span>
                <span className="ml-2 text-white">{exportOptions.sections.length}</span>
              </div>
              <div>
                <span className="text-gray-400">Delivery:</span>
                <span className="ml-2 text-white">
                  {exportOptions.emailDelivery ? 'Email' : 'Download'}
                </span>
              </div>
            </div>

            {exportOptions.sections.length === 0 && (
              <div className="mt-3 flex items-center space-x-2 text-orange-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">No sections selected for export</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-gray-400">
            Export will include data from the current filtered view
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting || exportOptions.sections.length === 0}
              className="min-w-[100px]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ExportControls