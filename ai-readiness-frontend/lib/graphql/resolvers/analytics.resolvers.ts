import { Resolvers, QueryResolvers, SurveyAnalyticsResolvers, SurveyAnalytics, Survey } from '../types/generated'
import { GraphQLContext } from '../context'

export const analyticsResolvers: Partial<Resolvers<GraphQLContext>> = {
  Query: {
    surveyAnalytics: async (_: any, args: { surveyId: string; refresh?: boolean }, context: GraphQLContext) => {
      context.requireAuth()
      
      // Check if cached analytics exist
      const { data: cached } = await context.supabase
        .from('survey_analytics_cache')
        .select('*')
        .eq('survey_id', args.surveyId)
        .single()
      
      if (cached && !args.refresh) {
        return cached
      }
      
      // Generate fresh analytics
      const { data: survey } = await context.supabase
        .from('surveys')
        .select('*, survey_responses(*)')
        .eq('id', args.surveyId)
        .single()
      
      if (!survey) throw new Error('Survey not found')
      
      const analytics = {
        surveyId: args.surveyId,
        totalResponses: survey.survey_responses?.length || 0,
        completedResponses: survey.survey_responses?.filter((r: any) => r.completed).length || 0,
        averageCompletionTime: 0,
        completionRate: 0,
        responsesByDate: [],
        questionAnalytics: [],
        demographicBreakdown: {},
        sentimentAnalysis: {},
        jtbdAnalysis: {
          pushForces: [],
          pullForces: [],
          anxieties: [],
          habits: []
        }
      }
      
      // Cache the results
      await context.supabase
        .from('survey_analytics_cache')
        .upsert(analytics)
      
      return analytics
    },
    
    dashboardAnalytics: async (_: any, args: {}, context: GraphQLContext) => {
      const user = context.requireAuth()
      
      // Get organization stats
      const { data: surveys } = await context.supabase
        .from('surveys')
        .select('*, survey_responses(*)')
        .eq('organization_id', user.organizationId)
      
      const totalSurveys = surveys?.length || 0
      const totalResponses = surveys?.reduce((acc: number, s: any) => 
        acc + (s.survey_responses?.length || 0), 0) || 0
      
      return {
        totalSurveys,
        activeSurveys: surveys?.filter((s: any) => s.status === 'active').length || 0,
        totalResponses,
        averageResponseRate: totalSurveys > 0 ? totalResponses / totalSurveys : 0,
        recentActivity: [],
        surveyPerformance: surveys?.map((s: any) => ({
          surveyId: s.id,
          title: s.title,
          responses: s.survey_responses?.length || 0,
          completionRate: 0
        })) || []
      }
    }
  },
  
  SurveyAnalytics: {
    survey: async (parent: SurveyAnalytics, _: any, context: GraphQLContext) => {
      return context.dataSources.surveyLoader.load(parent.surveyId)
    }
  }
}