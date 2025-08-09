"use client"

import React, { useState, useEffect } from 'react'
import { DateRange } from 'react-day-picker'
import { CalendarIcon, FileText, Download, Clock, CheckCircle, AlertCircle, Settings, RefreshCw } from 'lucide-react'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button,
  Select,
  Badge,
  Checkbox,
  Progress,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { useToast } from '@/lib/hooks/use-toast'
import { ReportTemplateFactory, templateUtils } from '@/lib/templates/reports'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface ReportGenerationOptions {
  templateType: 'executive' | 'analytics' | 'jtbd' | 'voice' | 'segment'
  dateRange?: DateRange
  format: 'pdf' | 'excel' | 'powerpoint' | 'json' | 'html'
  sections: {
    id: string
    title: string
    enabled: boolean
    required: boolean
  }[]
  filters?: {
    departments?: string[]
    roles?: string[]
    segments?: string[]
  }
  branding?: {
    includeLogo: boolean
    includeCompanyColors: boolean
    customFooter?: string
  }
}

interface GenerationStatus {
  reportId: string
  status: 'initializing' | 'processing' | 'completed' | 'error'
  progress: number
  estimatedTimeRemaining?: string
  currentStep?: string
  error?: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ReportGenerator: React.FC = React.memo(() => {
  const { toast } = useToast()
  
  // State management
  const [selectedTemplate, setSelectedTemplate] = useState<string>('executive')
  const [options, setOptions] = useState<ReportGenerationOptions>({
    templateType: 'executive',
    format: 'pdf',
    sections: [],
    filters: {},
    branding: {
      includeLogo: true,
      includeCompanyColors: true
    }
  })
  const [dateRange, setDateRange] = useState<DateRange>()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null)
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([])

  // Initialize available templates and default sections
  useEffect(() => {
    const templates = ReportTemplateFactory.getAvailableTemplates()
    setAvailableTemplates(templates)
    
    // Set default sections based on selected template
    if (selectedTemplate && templateUtils.isValidTemplateType(selectedTemplate)) {
      const template = templateUtils.getTemplate(selectedTemplate as keyof typeof templateUtils.getTemplate)
      const defaultSections = template.config.sections.map((section: any) => ({
        id: section.id,
        title: section.title,
        enabled: true,
        required: section.required
      }))
      setOptions(prev => ({
        ...prev,
        templateType: selectedTemplate as any,
        sections: defaultSections
      }))
    }
  }, [selectedTemplate])

  // Handle template selection
  const handleTemplateChange = (templateType: string) => {
    setSelectedTemplate(templateType)
    const template = availableTemplates.find(t => t.type === templateType)
    if (template) {
      // Reset sections based on new template
      const defaultSections = [
        { id: 'summary', title: 'Executive Summary', enabled: true, required: true },
        { id: 'metrics', title: 'Key Metrics', enabled: true, required: false },
        { id: 'charts', title: 'Data Visualizations', enabled: true, required: false },
        { id: 'insights', title: 'AI-Generated Insights', enabled: true, required: false },
        { id: 'recommendations', title: 'Recommendations', enabled: true, required: false },
        { id: 'appendix', title: 'Technical Appendix', enabled: false, required: false }
      ]
      
      setOptions(prev => ({
        ...prev,
        templateType: templateType as any,
        sections: defaultSections
      }))
    }
  }

  // Handle section toggle
  const handleSectionToggle = (sectionId: string, enabled: boolean) => {
    setOptions(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId 
          ? { ...section, enabled: enabled }
          : section
      )
    }))
  }

  // Generate report
  const handleGenerateReport = async () => {
    if (!options.templateType) {
      toast({
        title: "Template Required",
        description: "Please select a report template to continue.",
        variant: "destructive"
      })
      return
    }

    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Date Range Required",
        description: "Please select a date range for your report.",
        variant: "destructive"
      })
      return
    }

    const enabledSections = options.sections.filter(s => s.enabled)
    if (enabledSections.length === 0) {
      toast({
        title: "Sections Required",
        description: "Please select at least one section to include in your report.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    setGenerationStatus({
      reportId: `report_${Date.now()}`,
      status: 'initializing',
      progress: 0,
      currentStep: 'Preparing report generation...'
    })

    try {
      // Simulate API call to generate report
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: `${options.templateType}_template`,
          organizationId: 'current_org_id', // This should come from context
          format: options.format,
          filters: {
            dateRange: {
              start: dateRange.from?.toISOString(),
              end: dateRange.to?.toISOString()
            },
            ...options.filters
          },
          options: {
            sections: enabledSections,
            branding: options.branding,
            title: `${options.templateType.charAt(0).toUpperCase() + options.templateType.slice(1)} Report - ${new Date().toLocaleDateString()}`
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      const result = await response.json()
      
      // Start polling for status updates
      pollGenerationStatus(result.data.reportId)

    } catch (error) {
      console.error('Error generating report:', error)
      setGenerationStatus({
        reportId: '',
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
      setIsGenerating(false)
      toast({
        title: "Generation Failed",
        description: "Failed to start report generation. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Poll generation status
  const pollGenerationStatus = async (reportId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/reports/generate?reportId=${reportId}&organizationId=current_org_id`)
        if (!response.ok) throw new Error('Failed to check status')
        
        const result = await response.json()
        const status = result.data

        setGenerationStatus({
          reportId: status.reportId,
          status: status.status,
          progress: status.progress || 0,
          currentStep: getStatusMessage(status.status, status.progress),
          estimatedTimeRemaining: status.estimatedCompletionTime
        })

        if (status.status === 'completed') {
          clearInterval(pollInterval)
          setIsGenerating(false)
          toast({
            title: "Report Generated",
            description: "Your report has been generated successfully and is ready for download.",
            variant: "default"
          })
          
          // Trigger download
          if (status.file_url) {
            window.open(status.file_url, '_blank')
          }
        } else if (status.status === 'error') {
          clearInterval(pollInterval)
          setIsGenerating(false)
          setGenerationStatus(prev => ({
            ...prev!,
            status: 'error',
            error: status.error_message || 'Generation failed'
          }))
          toast({
            title: "Generation Error",
            description: status.error_message || "An error occurred during report generation.",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error('Error polling status:', error)
      }
    }, 2000) // Poll every 2 seconds

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
      if (isGenerating) {
        setIsGenerating(false)
        toast({
          title: "Generation Timeout",
          description: "Report generation is taking longer than expected. Please check back later.",
          variant: "destructive"
        })
      }
    }, 600000)
  }

  // Get status message based on progress
  const getStatusMessage = (status: string, progress?: number): string => {
    switch (status) {
      case 'initializing':
        return 'Initializing report generation...'
      case 'processing':
        if (progress && progress < 25) return 'Collecting and analyzing data...'
        if (progress && progress < 50) return 'Generating insights and metrics...'
        if (progress && progress < 75) return 'Creating visualizations...'
        if (progress && progress < 90) return 'Formatting report...'
        return 'Finalizing report...'
      case 'completed':
        return 'Report completed successfully!'
      case 'error':
        return 'An error occurred during generation'
      default:
        return 'Processing...'
    }
  }

  // Get selected template info
  const selectedTemplateInfo = availableTemplates.find(t => t.type === selectedTemplate)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Generate Report</h2>
        <p className="text-muted-foreground">
          Create customized reports with AI-powered insights and analytics
        </p>
      </div>

      <Tabs value={isGenerating ? "status" : "configure"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configure" disabled={isGenerating}>
            <Settings className="h-4 w-4 mr-2" />
            Configure Report
          </TabsTrigger>
          <TabsTrigger value="status" disabled={!isGenerating && !generationStatus}>
            <Clock className="h-4 w-4 mr-2" />
            Generation Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configure" className="space-y-6">
          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Report Template</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableTemplates.map((template) => (
                  <Card 
                    key={template.type}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate === template.type 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleTemplateChange(template.type)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm">{template.name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {template.complexity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {template.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>~{template.estimatedGenerationTime}</span>
                          <span>{template.category}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {template.supportedFormats.slice(0, 3).map((format: string) => (
                            <Badge key={format} variant="outline" className="text-xs">
                              {format.toUpperCase()}
                            </Badge>
                          ))}
                          {template.supportedFormats.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.supportedFormats.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Configuration Options */}
          {selectedTemplateInfo && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Date Range and Format */}
              <Card>
                <CardHeader>
                  <CardTitle>Report Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date Range</label>
                    <DatePickerWithRange
                      value={dateRange}
                      onChange={setDateRange}
                      placeholder="Select report period"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Output Format</label>
                    <Select
                      value={options.format}
                      onValueChange={(value) => setOptions(prev => ({ ...prev, format: value as any }))}
                    >
                      {selectedTemplateInfo.supportedFormats.map((format: string) => (
                        <option key={format} value={format}>
                          {format.toUpperCase()}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Branding Options</label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm">
                        <Checkbox
                          checked={options.branding?.includeLogo || false}
                          onCheckedChange={(checked) =>
                            setOptions(prev => ({
                              ...prev,
                              branding: { 
                                includeLogo: !!checked,
                                includeCompanyColors: prev.branding?.includeCompanyColors || true,
                                customFooter: prev.branding?.customFooter
                              }
                            }))
                          }
                        />
                        <span>Include company logo</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm">
                        <Checkbox
                          checked={options.branding?.includeCompanyColors || false}
                          onCheckedChange={(checked) =>
                            setOptions(prev => ({
                              ...prev,
                              branding: { 
                                includeLogo: prev.branding?.includeLogo || true,
                                includeCompanyColors: !!checked,
                                customFooter: prev.branding?.customFooter
                              }
                            }))
                          }
                        />
                        <span>Use company colors</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sections Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Report Sections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {options.sections.map((section) => (
                      <div key={section.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={section.enabled}
                            onCheckedChange={(checked) => handleSectionToggle(section.id, !!checked)}
                            disabled={section.required}
                          />
                          <div>
                            <p className="text-sm font-medium">{section.title}</p>
                            {section.required && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Generate Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Ready to Generate</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplateInfo ? 
                      `Estimated generation time: ${selectedTemplateInfo.estimatedGenerationTime}` :
                      'Select a template to see generation time'
                    }
                  </p>
                </div>
                <Button 
                  onClick={handleGenerateReport}
                  disabled={!selectedTemplate || !dateRange?.from || !dateRange?.to || isGenerating}
                  size="lg"
                  className="min-w-[120px]"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          {generationStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {generationStatus.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {generationStatus.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                  {(generationStatus.status === 'processing' || generationStatus.status === 'initializing') && 
                    <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
                  }
                  <span>Generation Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{generationStatus.currentStep || 'Processing...'}</span>
                    <span>{generationStatus.progress}%</span>
                  </div>
                  <Progress value={generationStatus.progress} className="w-full" />
                </div>

                {generationStatus.estimatedTimeRemaining && (
                  <p className="text-sm text-muted-foreground">
                    Estimated time remaining: {generationStatus.estimatedTimeRemaining}
                  </p>
                )}

                {generationStatus.status === 'completed' && (
                  <div className="flex items-center justify-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-green-800">Report Generated Successfully</p>
                      <p className="text-xs text-green-600 mt-1">Your report is ready for download</p>
                    </div>
                  </div>
                )}

                {generationStatus.status === 'error' && (
                  <div className="flex items-center justify-center p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-red-800">Generation Failed</p>
                      <p className="text-xs text-red-600 mt-1">
                        {generationStatus.error || 'An unexpected error occurred'}
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-3"
                        onClick={() => {
                          setGenerationStatus(null)
                          setIsGenerating(false)
                        }}
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
})