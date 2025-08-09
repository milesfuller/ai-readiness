import { Resolvers } from '../types/generated'

export const responseResolvers: Partial<Resolvers> = {
  Query: {
    responses: async (_: any, args: any, context: any) => {
      context.requireAuth()
      
      const query = context.supabase
        .from('survey_responses')
        .select('*')
      
      if (args.surveyId) {
        query.eq('survey_id', args.surveyId)
      }
      
      if (args.sessionId) {
        query.eq('session_id', args.sessionId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data || []
    }
  },
  Mutation: {
    submitResponse: async (_: any, args: any, context: any) => {
      const user = context.requireAuth()
      
      const { data, error } = await context.supabase
        .from('survey_responses')
        .insert({
          survey_id: args.input.surveyId,
          session_id: args.input.sessionId,
          user_id: user.id,
          answers: args.input.answers,
          completed: args.input.completed || false
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    
    updateResponse: async (_: any, args: any, context: any) => {
      context.requireAuth()
      
      const { data, error } = await context.supabase
        .from('survey_responses')
        .update({
          answers: args.input.answers,
          completed: args.input.completed
        })
        .eq('id', args.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    }
  },
  Response: {
    survey: async (parent: any, _, context: any) => {
      return context.dataSources.surveyLoader.load(parent.surveyId)
    },
    session: async (parent: any, _, context: any) => {
      if (!parent.sessionId) return null
      const { data } = await context.supabase
        .from('survey_sessions')
        .select('*')
        .eq('id', parent.sessionId)
        .single()
      return data
    },
    user: async (parent: any, _, context: any) => {
      if (!parent.userId) return null
      return context.dataSources.userLoader.load(parent.userId)
    }
  }
}