import { Resolvers, QueryResolvers, MutationResolvers, SurveyTemplateResolvers, SurveyTemplate, User, Organization } from '../types/generated'
import { GraphQLContext } from '../context'

export const templateResolvers: Partial<Resolvers<GraphQLContext>> = {
  Query: {
    surveyTemplates: async (_, args: { category?: string; isPublic?: boolean }, context: GraphQLContext) => {
      context.requireAuth()
      
      const query = context.supabase
        .from('survey_templates')
        .select('*')
      
      if (args.category) {
        query.eq('category', args.category)
      }
      
      if (args.isPublic !== undefined) {
        query.eq('is_public', args.isPublic)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data || []
    },
    
    surveyTemplate: async (_, args: { id: string }, context: GraphQLContext) => {
      context.requireAuth()
      
      const { data, error } = await context.supabase
        .from('survey_templates')
        .select('*')
        .eq('id', args.id)
        .single()
      
      if (error) throw error
      return data
    }
  },
  
  Mutation: {
    createTemplate: async (_, args: { input: any }, context: GraphQLContext) => {
      const user = context.requireAuth()
      
      const { data, error } = await context.supabase
        .from('survey_templates')
        .insert({
          ...args.input,
          created_by: user.id,
          organization_id: user.organizationId
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    
    updateTemplate: async (_, args: { id: string; input: any }, context: GraphQLContext) => {
      context.requireAuth()
      
      const { data, error } = await context.supabase
        .from('survey_templates')
        .update(args.input)
        .eq('id', args.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    
    deleteTemplate: async (_, args: { id: string }, context: GraphQLContext) => {
      context.requireAuth()
      
      const { error } = await context.supabase
        .from('survey_templates')
        .delete()
        .eq('id', args.id)
      
      if (error) throw error
      return { success: true, message: 'Template deleted successfully' }
    }
  },
  
  SurveyTemplate: {
    createdBy: async (parent: SurveyTemplate, _: any, context: GraphQLContext) => {
      if (!parent.createdBy) return null
      return context.dataSources.userLoader.load(parent.createdBy)
    },
    
    organization: async (parent: SurveyTemplate, _: any, context: GraphQLContext) => {
      if (!parent.organizationId) return null
      return context.dataSources.organizationLoader.load(parent.organizationId)
    }
  } as any
}