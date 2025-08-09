import { Resolvers } from '../types/generated'

export const templateResolvers: Partial<Resolvers> = {
  Query: {
    surveyTemplates: async (_: any, args: any, context: any) => {
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
    
    surveyTemplate: async (_: any, args: any, context: any) => {
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
    createTemplate: async (_: any, args: any, context: any) => {
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
    
    updateTemplate: async (_: any, args: any, context: any) => {
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
    
    deleteTemplate: async (_: any, args: any, context: any) => {
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
    createdBy: async (parent: any, _: any, context: any) => {
      if (!parent.createdBy) return null
      return context.dataSources.userLoader.load(parent.createdBy)
    },
    
    organization: async (parent: any, _: any, context: any) => {
      if (!parent.organizationId) return null
      return context.dataSources.organizationLoader.load(parent.organizationId)
    }
  }
}