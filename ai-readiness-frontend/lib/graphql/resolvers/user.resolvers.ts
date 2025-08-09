import { Resolvers } from '../types/generated'

export const userResolvers: Partial<Resolvers> = {
  Query: {
    // User queries will be implemented here
  },
  Mutation: {
    // User mutations will be implemented here
  },
  User: {
    // User field resolvers
    organization: async (parent: any, _: any, context: any) => {
      if (!parent.organizationId) return null
      return context.dataSources.organizationLoader.load(parent.organizationId)
    }
    // Commented out until added to schema
    // sessions: async (parent: any, _: any, context: any) => {
    //   const { data } = await context.supabase
    //     .from('survey_sessions')
    //     .select('*')
    //     .eq('user_id', parent.id)
    //   return data || []
    // },
    // responses: async (parent: any, _: any, context: any) => {
    //   const { data } = await context.supabase
    //     .from('survey_responses')
    //     .select('*')
    //     .eq('user_id', parent.id)
    //   return data || []
    // }
  }
}