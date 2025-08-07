'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  User,
  Brain,
  BarChart3,
  MessageCircle,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface ResponseExportDialogProps {
  responseId: string
}

export function ResponseExportDialog({ responseId }: ResponseExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'json'>('pdf')
  const [includePersonalData, setIncludePersonalData] = useState(true)
  const [includeAnalysis, setIncludeAnalysis] = useState(true)
  const [includeTimeline, setIncludeTimeline] = useState(false)
  const [includeComparisons, setIncludeComparisons] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [open, setOpen] = useState(false)

  const formatOptions = [
    { value: 'pdf', label: 'PDF Report', icon: FileText, description: 'Comprehensive formatted report' },
    { value: 'csv', label: 'CSV Data', icon: FileSpreadsheet, description: 'Raw data for analysis' },
    { value: 'json', label: 'JSON Export', icon: FileJson, description: 'Machine-readable format' }
  ]

  const handleExport = async () => {
    try {
      setIsExporting(true)
      
      const exportOptions = {
        format: exportFormat,
        includePersonalData,
        includeAnalysis,
        includeTimeline,
        includeComparisons,
        responseId
      }

      const response = await fetch('/api/export/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportOptions)
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Handle file download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `response-${responseId}-${new Date().toISOString().split('T')[0]}.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Response Data
          </DialogTitle>
          <DialogDescription>
            Generate a comprehensive export of this individual response with selected data and analysis
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {formatOptions.map((format) => {
                const Icon = format.icon
                return (
                  <div
                    key={format.value}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      exportFormat === format.value 
                        ? 'border-blue-500 bg-blue-50/10' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setExportFormat(format.value as any)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <div>
                        <div className="font-medium text-sm">{format.label}</div>
                        <div className="text-xs text-gray-500">{format.description}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Data Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Include in Export</Label>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="personal-data"
                  checked={includePersonalData}
                  onCheckedChange={(checked) => setIncludePersonalData(checked === true)}
                />
                <Label htmlFor="personal-data" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  Personal Data
                  <Badge variant="outline" className="text-xs">Required</Badge>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="analysis"
                  checked={includeAnalysis}
                  onCheckedChange={(checked) => setIncludeAnalysis(checked === true)}
                />
                <Label htmlFor="analysis" className="flex items-center gap-2 cursor-pointer">
                  <Brain className="h-4 w-4" />
                  AI Analysis Results
                  <Badge variant="secondary" className="text-xs">Recommended</Badge>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="timeline"
                  checked={includeTimeline}
                  onCheckedChange={(checked) => setIncludeTimeline(checked === true)}
                />
                <Label htmlFor="timeline" className="flex items-center gap-2 cursor-pointer">
                  <Clock className="h-4 w-4" />
                  Response Timeline
                </Label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="comparisons"
                  checked={includeComparisons}
                  onCheckedChange={(checked) => setIncludeComparisons(checked === true)}
                />
                <Label htmlFor="comparisons" className="flex items-center gap-2 cursor-pointer">
                  <BarChart3 className="h-4 w-4" />
                  Peer Comparisons
                  {exportFormat === 'csv' && (
                    <Badge variant="outline" className="text-xs">Limited</Badge>
                  )}
                </Label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50/5 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Export Preview
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Format</span>
                <Badge variant="outline">{exportFormat.toUpperCase()}</Badge>
              </div>
              
              {includePersonalData && (
                <div className="flex items-center justify-between">
                  <span>Participant Info</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span>Survey Responses</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              
              {includeAnalysis && (
                <div className="flex items-center justify-between">
                  <span>AI Analysis</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              )}
              
              {includeTimeline && (
                <div className="flex items-center justify-between">
                  <span>Timeline Data</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              )}
              
              {includeComparisons && exportFormat !== 'csv' && (
                <div className="flex items-center justify-between">
                  <span>Comparison Charts</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              )}
            </div>
          </div>

          {/* Export Options by Format */}
          {exportFormat === 'pdf' && (
            <div className="bg-blue-50/10 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2">PDF Report Features</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Executive summary with key insights</li>
                <li>• Formatted charts and visualizations</li>
                <li>• JTBD forces analysis diagrams</li>
                <li>• Participant profile and context</li>
                <li>• Actionable recommendations</li>
              </ul>
            </div>
          )}

          {exportFormat === 'csv' && (
            <div className="bg-green-50/10 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2">CSV Data Export</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Raw response data in structured format</li>
                <li>• Confidence scores and timing data</li>
                <li>• Analysis scores and metrics</li>
                <li>• Compatible with Excel and analytics tools</li>
                <li>• Note: Visual charts not included</li>
              </ul>
            </div>
          )}

          {exportFormat === 'json' && (
            <div className="bg-purple-50/10 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2">JSON Technical Export</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Complete response object with metadata</li>
                <li>• Analysis results in structured format</li>
                <li>• Timeline events with timestamps</li>
                <li>• Ideal for API integration and processing</li>
                <li>• Machine-readable format</li>
              </ul>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="bg-yellow-50/10 border border-yellow-200 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <strong className="text-yellow-800">Privacy Notice:</strong>
                <span className="text-gray-700">
                  {' '}This export contains individual response data. Ensure you comply with your organization's data handling policies and applicable privacy regulations.
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}