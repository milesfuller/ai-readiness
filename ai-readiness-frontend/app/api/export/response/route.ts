import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import PDFDocument from 'pdfkit'
import { fetchResponseById, fetchResponseAnalytics } from '@/lib/services/response-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user role and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        *,
        organization_members!inner(organization_id, role)
      `)
      .eq('user_id', session.user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const userRole = profile.organization_members?.role
    const organizationId = profile.organization_members?.organization_id

    // Check permissions
    if (!['system_admin', 'org_admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const {
      responseId,
      format = 'pdf',
      includePersonalData = true,
      includeAnalysis = true,
      includeTimeline = false,
      includeComparisons = false
    } = body

    if (!responseId) {
      return NextResponse.json({ error: 'Response ID is required' }, { status: 400 })
    }

    // Fetch response data
    const response = await fetchResponseById(responseId, userRole, organizationId)
    const analytics = includeAnalysis ? await fetchResponseAnalytics(responseId, userRole, organizationId) : null

    // Generate export based on format
    switch (format) {
      case 'pdf':
        return generatePDFExport(response, analytics, {
          includePersonalData,
          includeAnalysis,
          includeTimeline,
          includeComparisons
        })
      
      case 'csv':
        return generateCSVExport(response, analytics, {
          includePersonalData,
          includeAnalysis
        })
      
      case 'json':
        return generateJSONExport(response, analytics, {
          includePersonalData,
          includeAnalysis,
          includeTimeline,
          includeComparisons
        })
      
      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Export failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function generatePDFExport(response: any, analytics: any, options: any) {
  return new Promise<NextResponse>((resolve) => {
    const doc = new PDFDocument({ margin: 50 })
    const buffers: Buffer[] = []
    
    doc.on('data', (buffer) => buffers.push(buffer))
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers)
      
      resolve(new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="response-${response.id}-${new Date().toISOString().split('T')[0]}.pdf"`
        }
      }))
    })

    // Generate PDF content
    doc.fontSize(20).text('Survey Response Report', 50, 50)
    doc.fontSize(12).text(`Generated on ${new Date().toLocaleString()}`, 50, 80)
    
    // Participant information
    if (options.includePersonalData) {
      doc.moveDown(2)
      doc.fontSize(16).text('Participant Information', 50, doc.y)
      doc.fontSize(12)
      doc.text(`Name: ${response.participant.firstName} ${response.participant.lastName}`, 50, doc.y + 20)
      doc.text(`Email: ${response.participant.email}`, 50, doc.y + 15)
      doc.text(`Department: ${response.participant.department || 'Not specified'}`, 50, doc.y + 15)
      doc.text(`Job Title: ${response.participant.jobTitle || 'Not specified'}`, 50, doc.y + 15)
    }

    // Survey information
    doc.moveDown(2)
    doc.fontSize(16).text('Survey Information', 50, doc.y)
    doc.fontSize(12)
    doc.text(`Title: ${response.surveyTitle}`, 50, doc.y + 20)
    doc.text(`Status: ${response.status.toUpperCase()}`, 50, doc.y + 15)
    doc.text(`Started: ${new Date(response.startedAt).toLocaleString()}`, 50, doc.y + 15)
    if (response.completedAt) {
      doc.text(`Completed: ${new Date(response.completedAt).toLocaleString()}`, 50, doc.y + 15)
    }
    doc.text(`Progress: ${response.answers.length}/${response.totalQuestions} questions`, 50, doc.y + 15)

    // Responses
    doc.moveDown(2)
    doc.fontSize(16).text('Survey Responses', 50, doc.y)
    doc.fontSize(10)
    
    response.answers.forEach((answer: any, index: number) => {
      const question = response.questions.find((q: any) => q.id === answer.questionId)
      if (question && doc.y > 700) {
        doc.addPage()
      }
      
      doc.moveDown(1)
      doc.fontSize(11).text(`Question ${index + 1}: ${question?.question || 'Unknown question'}`, 50, doc.y)
      doc.fontSize(10).text(`Answer: ${typeof answer.answer === 'string' ? answer.answer : JSON.stringify(answer.answer)}`, 50, doc.y + 15)
      
      if (answer.confidence) {
        doc.text(`Confidence: ${answer.confidence}/5`, 50, doc.y + 10)
      }
    })

    // Analytics
    if (options.includeAnalysis && analytics) {
      doc.addPage()
      doc.fontSize(16).text('Analysis Results', 50, 50)
      doc.fontSize(12)
      
      doc.moveDown(1)
      doc.text(`Overall Sentiment: ${(analytics.overallSentimentScore * 100).toFixed(0)}%`, 50, doc.y)
      doc.text(`Readiness Score: ${(analytics.readinessScore * 100).toFixed(0)}%`, 50, doc.y + 15)
      doc.text(`Engagement Score: ${(analytics.engagementScore * 100).toFixed(0)}%`, 50, doc.y + 15)
      doc.text(`Business Impact Level: ${analytics.businessImpactLevel.toUpperCase()}`, 50, doc.y + 15)
      
      if (analytics.keyThemes.length > 0) {
        doc.moveDown(1)
        doc.text('Key Themes:', 50, doc.y)
        analytics.keyThemes.forEach((theme: string) => {
          doc.text(`• ${theme}`, 60, doc.y + 15)
        })
      }

      if (analytics.recommendations.length > 0) {
        doc.moveDown(1)
        doc.text('Recommendations:', 50, doc.y)
        analytics.recommendations.forEach((rec: string) => {
          doc.text(`• ${rec}`, 60, doc.y + 15)
        })
      }
    }

    doc.end()
  })
}

function generateCSVExport(response: any, analytics: any, options: any) {
  const csvRows: string[] = []
  
  // Headers
  const headers = [
    'Response ID',
    'Participant Name', 
    'Email',
    'Department',
    'Job Title',
    'Survey Title',
    'Status',
    'Started At',
    'Completed At',
    'Question ID',
    'Question Text',
    'Answer',
    'Confidence',
    'Time Spent'
  ]
  
  if (options.includeAnalysis && analytics) {
    headers.push(
      'Overall Sentiment',
      'Readiness Score',
      'Engagement Score',
      'Business Impact',
      'Key Themes'
    )
  }
  
  csvRows.push(headers.join(','))
  
  // Data rows
  response.answers.forEach((answer: any) => {
    const question = response.questions.find((q: any) => q.id === answer.questionId)
    
    const row = [
      response.id,
      options.includePersonalData ? `${response.participant.firstName} ${response.participant.lastName}` : '[REDACTED]',
      options.includePersonalData ? response.participant.email : '[REDACTED]',
      response.participant.department || '',
      response.participant.jobTitle || '',
      response.surveyTitle,
      response.status,
      response.startedAt,
      response.completedAt || '',
      answer.questionId,
      question?.question || '',
      typeof answer.answer === 'string' ? `"${answer.answer.replace(/"/g, '""')}"` : JSON.stringify(answer.answer),
      answer.confidence || '',
      answer.timeSpent || ''
    ]
    
    if (options.includeAnalysis && analytics) {
      row.push(
        analytics.overallSentimentScore.toString(),
        analytics.readinessScore.toString(),
        analytics.engagementScore.toString(),
        analytics.businessImpactLevel,
        `"${analytics.keyThemes.join(', ')}"`
      )
    }
    
    csvRows.push(row.join(','))
  })
  
  const csvContent = csvRows.join('\n')
  
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="response-${response.id}-${new Date().toISOString().split('T')[0]}.csv"`
    }
  })
}

function generateJSONExport(response: any, analytics: any, options: any) {
  const exportData: any = {
    meta: {
      exportedAt: new Date().toISOString(),
      format: 'json',
      options
    },
    response: {
      id: response.id,
      surveyId: response.surveyId,
      surveyTitle: response.surveyTitle,
      surveyDescription: response.surveyDescription,
      status: response.status,
      startedAt: response.startedAt,
      completedAt: response.completedAt,
      completionTime: response.completionTime,
      totalQuestions: response.totalQuestions
    }
  }
  
  if (options.includePersonalData) {
    exportData.participant = response.participant
  }
  
  exportData.answers = response.answers.map((answer: any) => ({
    questionId: answer.questionId,
    question: response.questions.find((q: any) => q.id === answer.questionId)?.question,
    answer: answer.answer,
    confidence: answer.confidence,
    timeSpent: answer.timeSpent
  }))
  
  if (options.includeAnalysis && analytics) {
    exportData.analytics = analytics
  }
  
  if (options.includeTimeline) {
    exportData.timeline = {
      // Timeline data would be generated here
      events: []
    }
  }
  
  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="response-${response.id}-${new Date().toISOString().split('T')[0]}.json"`
    }
  })
}