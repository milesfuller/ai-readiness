"use client"

import React, { useState, useEffect } from 'react'
import { 
  Download, 
  Share2, 
  Printer, 
  X, 
  FileText, 
  Image,
  FileSpreadsheet,
  FileVideo,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Copy,
  Mail,
  MessageSquare
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/lib/hooks/use-toast'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ReportData {
  id: string
  name: string
  type: 'executive' | 'analytics' | 'jtbd' | 'voice' | 'segment'
  format: 'pdf' | 'excel' | 'powerpoint' | 'json' | 'html' | 'png' | 'jpg'
  fileUrl?: string
  fileSize?: number
  createdAt: Date
  createdBy: string
  description?: string
  metadata?: {
    pages?: number
    dimensions?: { width: number; height: number }
    hasPassword?: boolean
    version?: string
    [key: string]: any
  }
}

interface ReportPreviewProps {
  report: ReportData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PreviewState {
  loading: boolean
  error: string | null
  content: string | null
  previewType: 'iframe' | 'image' | 'text' | 'metadata' | 'unsupported'
  isFullscreen: boolean
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getFileIcon = (format: ReportData['format']) => {
  switch (format) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />
    case 'excel':
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />
    case 'powerpoint':
      return <FileVideo className="h-5 w-5 text-orange-500" />
    case 'png':
    case 'jpg':
      return <Image className="h-5 w-5 text-blue-500" />
    case 'html':
      return <FileText className="h-5 w-5 text-purple-500" />
    case 'json':
      return <FileText className="h-5 w-5 text-yellow-600" />
    default:
      return <FileText className="h-5 w-5 text-gray-500" />
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatReportType = (type: ReportData['type']): string => {
  const typeMap = {
    executive: 'Executive Report',
    analytics: 'Analytics Report',
    jtbd: 'JTBD Analysis',
    voice: 'Voice Analytics',
    segment: 'Segment Analysis'
  }
  return typeMap[type]
}

const getPreviewType = (format: ReportData['format']): PreviewState['previewType'] => {
  switch (format) {
    case 'pdf':
    case 'html':
      return 'iframe'
    case 'png':
    case 'jpg':
      return 'image'
    case 'json':
      return 'text'
    case 'excel':
    case 'powerpoint':
      return 'metadata'
    default:
      return 'unsupported'
  }
}

const canPreviewInBrowser = (format: ReportData['format']): boolean => {
  return ['pdf', 'html', 'png', 'jpg', 'json'].includes(format)
}

// ============================================================================
// PREVIEW CONTENT COMPONENTS
// ============================================================================

const IframePreview: React.FC<{ url: string; format: string }> = ({ url, format }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="relative w-full h-full min-h-[500px] bg-gray-50 rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading preview...</p>
          </div>
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Preview not available</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.open(url, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in new tab
            </Button>
          </div>
        </div>
      ) : (
        <iframe
          src={url}
          className="w-full h-full border-0"
          title="Report Preview"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false)
            setError(`Unable to preview ${format.toUpperCase()} file in browser`)
          }}
          sandbox="allow-scripts allow-same-origin"
        />
      )}
    </div>
  )
}

const ImagePreview: React.FC<{ url: string; alt: string }> = ({ url, alt }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex items-center justify-center w-full min-h-[500px] bg-gray-50 rounded-lg">
      {loading && !error && (
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading image...</p>
        </div>
      )}
      {error ? (
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Image not available</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : (
        <img
          src={url}
          alt={alt}
          className="max-w-full max-h-[500px] object-contain"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false)
            setError('Unable to load image')
          }}
          style={{ display: loading ? 'none' : 'block' }}
        />
      )}
    </div>
  )
}

const JsonPreview: React.FC<{ content: string }> = ({ content }) => {
  const [formattedContent, setFormattedContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const parsed = JSON.parse(content)
      setFormattedContent(JSON.stringify(parsed, null, 2))
    } catch (e) {
      setError('Invalid JSON content')
      setFormattedContent(content)
    }
  }, [content])

  return (
    <div className="w-full min-h-[500px] bg-gray-50 rounded-lg">
      {error && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-t-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">{error}</span>
          </div>
        </div>
      )}
      <pre className="p-6 text-sm font-mono overflow-auto max-h-[500px] whitespace-pre-wrap">
        {formattedContent}
      </pre>
    </div>
  )
}

const MetadataPreview: React.FC<{ report: ReportData }> = ({ report }) => {
  return (
    <div className="w-full min-h-[500px] bg-gray-50 rounded-lg p-6">
      <div className="text-center mb-8">
        {getFileIcon(report.format)}
        <h3 className="text-2xl font-semibold mt-4 mb-2">{report.name}</h3>
        <p className="text-muted-foreground">
          This {report.format.toUpperCase()} file cannot be previewed directly in the browser
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm font-medium">File Type:</span>
            <Badge variant="outline">{report.format.toUpperCase()}</Badge>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm font-medium">Report Type:</span>
            <span className="text-sm">{formatReportType(report.type)}</span>
          </div>

          {report.fileSize && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">File Size:</span>
              <span className="text-sm">{formatFileSize(report.fileSize)}</span>
            </div>
          )}

          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm font-medium">Created:</span>
            <span className="text-sm">{report.createdAt.toLocaleDateString()}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm font-medium">Created by:</span>
            <span className="text-sm">{report.createdBy}</span>
          </div>

          {report.metadata?.pages && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Pages:</span>
              <span className="text-sm">{report.metadata.pages}</span>
            </div>
          )}

          {report.metadata?.version && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Version:</span>
              <span className="text-sm">{report.metadata.version}</span>
            </div>
          )}
        </div>

        <div className="pt-4">
          <Button 
            className="w-full" 
            onClick={() => report.fileUrl && window.open(report.fileUrl, '_blank')}
            disabled={!report.fileUrl}
          >
            <Download className="h-4 w-4 mr-2" />
            Download to View
          </Button>
        </div>
      </div>
    </div>
  )
}

const UnsupportedPreview: React.FC<{ report: ReportData }> = ({ report }) => {
  return (
    <div className="w-full min-h-[500px] bg-gray-50 rounded-lg flex items-center justify-center">
      <div className="text-center max-w-md">
        <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Preview not supported</h3>
        <p className="text-muted-foreground mb-6">
          This file type ({report.format.toUpperCase()}) cannot be previewed in the browser. 
          Please download the file to view its contents.
        </p>
        <Button 
          onClick={() => report.fileUrl && window.open(report.fileUrl, '_blank')}
          disabled={!report.fileUrl}
        >
          <Download className="h-4 w-4 mr-2" />
          Download File
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ReportPreview: React.FC<ReportPreviewProps> = ({ 
  report, 
  open, 
  onOpenChange 
}) => {
  const { toast } = useToast()
  const [previewState, setPreviewState] = useState<PreviewState>({
    loading: false,
    error: null,
    content: null,
    previewType: 'metadata',
    isFullscreen: false
  })

  // Initialize preview when report changes
  useEffect(() => {
    if (!report || !open) {
      setPreviewState(prev => ({ ...prev, loading: false, error: null, content: null }))
      return
    }

    const previewType = getPreviewType(report.format)
    setPreviewState(prev => ({ ...prev, previewType, loading: true, error: null }))

    // For text content (JSON), fetch and process
    if (previewType === 'text' && report.fileUrl) {
      fetch(report.fileUrl)
        .then(response => response.text())
        .then(content => {
          setPreviewState(prev => ({ 
            ...prev, 
            content, 
            loading: false 
          }))
        })
        .catch(error => {
          setPreviewState(prev => ({ 
            ...prev, 
            error: 'Failed to load file content', 
            loading: false 
          }))
        })
    } else {
      setPreviewState(prev => ({ ...prev, loading: false }))
    }
  }, [report, open])

  // Handle actions
  const handleDownload = () => {
    if (report?.fileUrl) {
      window.open(report.fileUrl, '_blank')
      toast({
        title: "Download Started",
        description: `${report.name} is being downloaded.`,
      })
    }
  }

  const handleShare = (method: 'link' | 'email') => {
    if (!report?.fileUrl) return

    if (method === 'link') {
      navigator.clipboard.writeText(report.fileUrl).then(() => {
        toast({
          title: "Link Copied",
          description: "Report link has been copied to your clipboard.",
        })
      })
    } else if (method === 'email') {
      const subject = encodeURIComponent(`Report: ${report.name}`)
      const body = encodeURIComponent(
        `I'm sharing this report with you:\n\n${report.name}\n\n${report.fileUrl}`
      )
      window.open(`mailto:?subject=${subject}&body=${body}`)
    }
  }

  const handlePrint = () => {
    if (report?.fileUrl && canPreviewInBrowser(report.format)) {
      const printWindow = window.open(report.fileUrl, '_blank')
      printWindow?.addEventListener('load', () => {
        printWindow.print()
      })
      toast({
        title: "Print Dialog",
        description: "Opening print dialog in new window.",
      })
    } else {
      toast({
        title: "Print Unavailable",
        description: "This file type cannot be printed directly. Please download and print locally.",
        variant: "destructive"
      })
    }
  }

  const toggleFullscreen = () => {
    setPreviewState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }))
  }

  // Render preview content
  const renderPreviewContent = () => {
    if (!report) return null

    if (previewState.loading) {
      return (
        <div className="w-full min-h-[500px] space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )
    }

    switch (previewState.previewType) {
      case 'iframe':
        return report.fileUrl ? (
          <IframePreview url={report.fileUrl} format={report.format} />
        ) : (
          <UnsupportedPreview report={report} />
        )

      case 'image':
        return report.fileUrl ? (
          <ImagePreview url={report.fileUrl} alt={report.name} />
        ) : (
          <UnsupportedPreview report={report} />
        )

      case 'text':
        return previewState.content ? (
          <JsonPreview content={previewState.content} />
        ) : (
          <UnsupportedPreview report={report} />
        )

      case 'metadata':
        return <MetadataPreview report={report} />

      default:
        return <UnsupportedPreview report={report} />
    }
  }

  if (!report) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`max-w-7xl ${previewState.isFullscreen ? 'w-[95vw] h-[95vh]' : 'w-[90vw] h-[80vh]'} flex flex-col`}
      >
        <DialogHeader className="flex-shrink-0 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {getFileIcon(report.format)}
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl font-semibold truncate pr-4">
                  {report.name}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {formatReportType(report.type)} • {report.format.toUpperCase()}
                  {report.fileSize && ` • ${formatFileSize(report.fileSize)}`}
                </DialogDescription>
                {report.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {report.description}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                title={previewState.isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {previewState.isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={!canPreviewInBrowser(report.format)}
                title="Print report"
              >
                <Printer className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Share Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleShare('link')}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('email')}>
                    <Mail className="h-4 w-4 mr-2" />
                    Share via Email
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={handleDownload} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Separator className="flex-shrink-0" />

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden py-4">
          {renderPreviewContent()}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Created by {report.createdBy}</span>
              <span>•</span>
              <span>{report.createdAt.toLocaleDateString()}</span>
              {report.metadata?.pages && (
                <>
                  <span>•</span>
                  <span>{report.metadata.pages} pages</span>
                </>
              )}
            </div>
            {canPreviewInBrowser(report.format) && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Preview available</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}