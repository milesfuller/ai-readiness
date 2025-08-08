"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import { ReportPreview, ReportData } from './ReportPreview'

/**
 * Example usage of ReportPreview component
 * This shows how to integrate the preview functionality with existing components
 */

// Example report data
const exampleReports: ReportData[] = [
  {
    id: 'report_001',
    name: 'Q4 2024 Executive Summary',
    type: 'executive',
    format: 'pdf',
    fileUrl: '/reports/q4-exec-summary.pdf',
    fileSize: 2048576, // 2MB
    createdAt: new Date('2024-12-15T10:30:00'),
    createdBy: 'John Doe',
    description: 'Comprehensive executive summary covering Q4 performance metrics',
    metadata: {
      pages: 24,
      version: '1.0'
    }
  },
  {
    id: 'report_002',
    name: 'User Journey Analytics',
    type: 'jtbd',
    format: 'excel',
    fileUrl: '/reports/user-journey-analytics.xlsx',
    fileSize: 1536000, // 1.5MB
    createdAt: new Date('2024-12-14T14:22:00'),
    createdBy: 'Jane Smith',
    description: 'JTBD analysis with force diagrams and user insights',
    metadata: {
      pages: 5,
      version: '2.1'
    }
  },
  {
    id: 'report_003',
    name: 'Voice Analytics Data',
    type: 'voice',
    format: 'json',
    fileUrl: '/reports/voice-analytics.json',
    fileSize: 512000, // 500KB
    createdAt: new Date('2024-12-13T16:45:00'),
    createdBy: 'Mike Johnson',
    description: 'Raw voice analytics data with sentiment analysis results'
  },
  {
    id: 'report_004',
    name: 'Dashboard Screenshot',
    type: 'analytics',
    format: 'png',
    fileUrl: '/reports/dashboard-screenshot.png',
    fileSize: 1024000, // 1MB
    createdAt: new Date('2024-12-12T09:15:00'),
    createdBy: 'Sarah Wilson',
    description: 'Visual snapshot of the analytics dashboard',
    metadata: {
      dimensions: { width: 1920, height: 1080 }
    }
  }
]

export const ReportPreviewExample: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const handlePreview = (report: ReportData) => {
    setSelectedReport(report)
    setPreviewOpen(true)
  }

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">ReportPreview Component Examples</h2>
      
      <div className="space-y-4">
        {exampleReports.map((report) => (
          <div 
            key={report.id} 
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
          >
            <div className="flex-1">
              <h3 className="font-semibold">{report.name}</h3>
              <p className="text-sm text-muted-foreground">{report.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  {report.format.toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {report.createdBy} • {report.createdAt.toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreview(report)}
              className="ml-4"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        ))}
      </div>

      {/* ReportPreview Component */}
      <ReportPreview
        report={selectedReport}
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open)
          if (!open) {
            setSelectedReport(null)
          }
        }}
      />

      {/* Usage Documentation */}
      <div className="mt-12 space-y-4 p-6 bg-muted/20 rounded-lg">
        <h3 className="text-lg font-semibold">Usage Documentation</h3>
        
        <div className="space-y-3">
          <h4 className="font-medium">Features Demonstrated:</h4>
          <ul className="space-y-1 text-sm">
            <li><strong>PDF Preview:</strong> Iframe-based preview for PDF files</li>
            <li><strong>Excel/PowerPoint:</strong> Metadata display with download prompt</li>
            <li><strong>JSON Preview:</strong> Formatted text display with syntax highlighting</li>
            <li><strong>Image Preview:</strong> Direct image display with loading states</li>
            <li><strong>Quick Actions:</strong> Download, Share (copy link, email), Print buttons</li>
            <li><strong>Fullscreen Mode:</strong> Toggle between normal and fullscreen view</li>
            <li><strong>Loading States:</strong> Skeleton loading and error handling</li>
            <li><strong>Responsive Design:</strong> Works on desktop and mobile devices</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Integration Notes:</h4>
          <ul className="space-y-1 text-sm">
            <li>• Use the <code>ReportData</code> interface to ensure type safety</li>
            <li>• The component handles all preview logic internally</li>
            <li>• Toast notifications are built-in for user feedback</li>
            <li>• Supports both controlled and uncontrolled usage patterns</li>
            <li>• Error boundaries handle preview failures gracefully</li>
          </ul>
        </div>
      </div>
    </div>
  )
}