import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { surveyCategories, surveyQuestions } from '@/lib/data/survey-questions'

/**
 * Get survey results and analysis for a specific session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const responseId = searchParams.get('responseId')

    if (!sessionId && !responseId) {
      return NextResponse.json({ 
        error: 'Either sessionId or responseId is required' 
      }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let surveyResponse = null

    if (responseId) {
      // Get response by ID
      const { data, error } = await supabase
        .from('survey_responses')
        .select(`
          id,
          survey_id,
          answers,
          metadata,
          completion_time,
          submitted_at,
          surveys (
            id,
            title,
            description,
            status
          )
        `)
        .eq('id', responseId)
        .eq('respondent_id', user.id)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Survey response not found' }, { status: 404 })
      }

      surveyResponse = data
    } else if (sessionId) {
      // Find response by session ID (from activity logs)
      const { data: sessionLogs } = await supabase
        .from('activity_logs')
        .select('details')
        .eq('resource_id', sessionId)
        .eq('user_id', user.id)
        .eq('action', 'survey_response_submitted')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!sessionLogs || sessionLogs.length === 0) {
        // No completed survey found for this session
        return NextResponse.json({
          status: 'not_completed',
          message: 'Survey not yet completed for this session'
        })
      }

      // Try to get the actual response
      const responseDetails = sessionLogs[0].details
      if (responseDetails?.survey_id) {
        const { data, error } = await supabase
          .from('survey_responses')
          .select(`
            id,
            survey_id,
            answers,
            metadata,
            completion_time,
            submitted_at,
            surveys (
              id,
              title,
              description,
              status
            )
          `)
          .eq('survey_id', responseDetails.survey_id)
          .eq('respondent_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(1)

        if (data && data.length > 0) {
          surveyResponse = data[0]
        }
      }
    }

    if (!surveyResponse) {
      return NextResponse.json({
        status: 'not_found',
        message: 'No survey response found'
      })
    }

    // Analyze the responses
    const analysis = analyzeSurveyResponses(surveyResponse.answers)

    // Get or create LLM analysis
    let llmAnalysis = null
    const { data: existingAnalysis } = await supabase
      .from('llm_analyses')
      .select('*')
      .eq('survey_id', surveyResponse.survey_id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingAnalysis && existingAnalysis.length > 0) {
      llmAnalysis = existingAnalysis[0]
    }

    return NextResponse.json({
      status: 'completed',
      response: {
        id: surveyResponse.id,
        surveyId: surveyResponse.survey_id,
        completedAt: surveyResponse.submitted_at,
        completionTime: surveyResponse.completion_time,
        metadata: surveyResponse.metadata
      },
      analysis,
      llmAnalysis: llmAnalysis?.results || null,
      survey: surveyResponse.surveys
    })

  } catch (error) {
    console.error('Survey results error:', error)
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * Analyze survey responses using JTBD framework
 */
function analyzeSurveyResponses(answers: Record<string, any>) {
  const categoryScores: Record<string, { score: number; count: number; responses: string[] }> = {}
  
  // Initialize categories
  surveyCategories.forEach(category => {
    categoryScores[category.id] = {
      score: 0,
      count: 0,
      responses: []
    }
  })

  // Analyze each answer
  Object.entries(answers).forEach(([questionId, answerData]) => {
    const question = surveyQuestions.find(q => q.id === questionId)
    if (!question) return

    const answer = answerData.answer || answerData
    if (typeof answer !== 'string' || answer.trim().length === 0) return

    const category = question.category
    if (!categoryScores[category]) return

    // Simple scoring based on answer length and sentiment indicators
    let score = Math.min(answer.length / 50, 10) // Base score from answer length
    
    // Adjust score based on category and content
    switch (category) {
      case 'pain_of_old':
        // Higher pain indicates higher motivation for change
        if (answer.includes('difficult') || answer.includes('slow') || answer.includes('frustrating')) {
          score += 3
        }
        if (answer.includes('impossible') || answer.includes('broken')) {
          score += 5
        }
        break
        
      case 'pull_of_new':
        // Positive language indicates attraction to AI
        if (answer.includes('excited') || answer.includes('opportunity') || answer.includes('benefit')) {
          score += 3
        }
        if (answer.includes('revolutionary') || answer.includes('game-changing')) {
          score += 5
        }
        break
        
      case 'anchors_to_old':
        // Lower scores are better here (less anchored)
        if (answer.includes('always done') || answer.includes('policy') || answer.includes('regulation')) {
          score -= 2
        }
        break
        
      case 'anxiety_of_new':
        // Lower anxiety is better
        if (answer.includes('worried') || answer.includes('concerned') || answer.includes('scared')) {
          score -= 2
        }
        if (answer.includes('confident') || answer.includes('ready')) {
          score += 2
        }
        break
    }

    categoryScores[category].score += Math.max(0, score)
    categoryScores[category].count += 1
    categoryScores[category].responses.push(answer)
  })

  // Calculate final scores and overall readiness
  const finalScores: Record<string, { score: number; strength: string; trend: string }> = {}
  let totalScore = 0
  let categoryCount = 0

  Object.entries(categoryScores).forEach(([categoryId, data]) => {
    if (data.count === 0) {
      finalScores[categoryId] = { score: 0, strength: 'No Data', trend: 'neutral' }
      return
    }

    let avgScore = data.score / data.count
    
    // Normalize to 0-100 scale
    avgScore = Math.min(Math.max(avgScore * 10, 0), 100)

    // Special handling for negative categories
    if (categoryId === 'anchors_to_old' || categoryId === 'anxiety_of_new') {
      // For these categories, lower raw scores are actually better
      avgScore = Math.max(0, 80 - avgScore)
    }

    const strength = avgScore >= 80 ? 'High' : avgScore >= 60 ? 'Medium' : 'Low'
    const trend = avgScore >= 75 ? 'up' : avgScore <= 40 ? 'down' : 'neutral'

    finalScores[categoryId] = {
      score: Math.round(avgScore),
      strength,
      trend
    }

    totalScore += avgScore
    categoryCount += 1
  })

  const overallScore = categoryCount > 0 ? Math.round(totalScore / categoryCount) : 0

  // Generate insights and recommendations
  const insights = generateInsights(finalScores, categoryScores)
  const recommendations = generateRecommendations(finalScores, overallScore)

  return {
    overallScore,
    categoryScores: finalScores,
    insights,
    recommendations,
    readinessLevel: getReadinessLevel(overallScore),
    confidenceLevel: Math.min(90, Math.max(60, overallScore + 10)),
    completionDate: new Date().toISOString(),
    analysisVersion: '1.0.0'
  }
}

function generateInsights(scores: Record<string, any>, rawData: Record<string, any>): string[] {
  const insights: string[] = []

  // Pain of old insights
  if (scores.pain_of_old?.score >= 70) {
    insights.push('Strong motivation for change driven by current inefficiencies')
  } else if (scores.pain_of_old?.score <= 40) {
    insights.push('Current processes are working reasonably well, may need compelling reasons for change')
  }

  // Pull of new insights
  if (scores.pull_of_new?.score >= 70) {
    insights.push('Clear vision of AI benefits and competitive advantages')
  } else {
    insights.push('Need to better articulate the value proposition of AI adoption')
  }

  // Anchors to old insights
  if (scores.anchors_to_old?.score <= 40) {
    insights.push('Significant organizational barriers to change exist')
  } else {
    insights.push('Relatively few barriers preventing adoption of new approaches')
  }

  // Anxiety of new insights
  if (scores.anxiety_of_new?.score >= 60) {
    insights.push('Healthy awareness of challenges while maintaining optimism')
  } else {
    insights.push('High anxiety about AI implementation may slow adoption')
  }

  return insights
}

function generateRecommendations(scores: Record<string, any>, overallScore: number): string[] {
  const recommendations: string[] = []

  if (overallScore >= 70) {
    recommendations.push('Ready to begin AI implementation with pilot projects')
    recommendations.push('Focus on quick wins to build momentum')
  } else if (overallScore >= 50) {
    recommendations.push('Start with high-impact, low-risk AI pilot projects')
    recommendations.push('Invest in change management and training programs')
  } else {
    recommendations.push('Focus on building foundational capabilities first')
    recommendations.push('Address organizational barriers before technology implementation')
  }

  // Category-specific recommendations
  if (scores.pain_of_old?.score <= 50) {
    recommendations.push('Identify and quantify current pain points more clearly')
  }

  if (scores.pull_of_new?.score <= 50) {
    recommendations.push('Develop clearer AI value proposition and success stories')
  }

  if (scores.anchors_to_old?.score <= 50) {
    recommendations.push('Address organizational resistance and process barriers')
  }

  if (scores.anxiety_of_new?.score <= 50) {
    recommendations.push('Invest in AI education and change management')
  }

  recommendations.push('Establish clear governance and ethical guidelines')
  recommendations.push('Focus on augmentation rather than replacement strategies')

  return recommendations
}

function getReadinessLevel(score: number): string {
  if (score >= 80) return 'Ready to Scale'
  if (score >= 70) return 'Ready to Implement'
  if (score >= 60) return 'Ready with Preparation'
  if (score >= 40) return 'Needs Significant Preparation'
  return 'Not Ready - Build Foundation First'
}