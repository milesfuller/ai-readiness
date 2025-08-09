import { Resolvers, UserResolvers, User, Organization } from '../types/generated'
import { GraphQLContext } from '../context'

export const userResolvers: Partial<Resolvers<GraphQLContext>> = {
  Query: {
    // User queries will be implemented here
  },
  Mutation: {
    // User mutations will be implemented here
  },
  User: {
    // User field resolvers
    organization: async (parent: User, _, context: GraphQLContext) => {
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