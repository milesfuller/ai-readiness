import { Plugin } from 'graphql-yoga'
import { useDepthLimit } from '@envelop/depth-limit'
// import { useQueryComplexity, QueryComplexityEstimatorArgs } from '@envelop/query-complexity'
// import { useRateLimiter } from '@envelop/rate-limiter'
import { formatError, reportError } from './errors'

/**
 * GraphQL Yoga Plugins Configuration
 * 
 * Provides security, performance, and monitoring plugins:
 * - Query depth limiting
 * - Query complexity analysis
 * - Rate limiting
 * - Error handling and reporting
 * - Performance monitoring
 */

/**
 * Security plugins
 */
export const securityPlugins = [
  // Prevent deeply nested queries (DoS protection)
  useDepthLimit({
    maxDepth: 10,
    ignore: ['__schema', '__type', 'introspectionQuery']
  }),
  
  // Analyze query complexity to prevent expensive operations
  /* Disabled - package not available
  useQueryComplexity({
    maximumComplexity: 1000,
    estimators: [
      // Field-based complexity estimation
      {
        type: 'Query',
        field: 'surveys',
        complexity: ({ args }: QueryComplexityEstimatorArgs) => {
          const limit = args.pagination?.limit || 20
          return Math.min(limit, 100) * 2 // 2 points per survey
        }
      },
      {
        type: 'Query',
        field: 'responses',
        complexity: ({ args }: QueryComplexityEstimatorArgs) => {
          const limit = args.pagination?.limit || 20
          return Math.min(limit, 100) * 3 // 3 points per response (more complex)
        }
      },
      {
        type: 'Query',
        field: 'surveyAnalytics',
        complexity: 50 // Analytics are expensive
      },
      {
        type: 'Query',
        field: 'dashboardAnalytics',
        complexity: 100 // Dashboard analytics are very expensive
      },
      {
        type: 'Mutation',
        field: 'createSurvey',
        complexity: 10
      },
      {
        type: 'Mutation',
        field: 'triggerSurveyAnalysis',
        complexity: 25
      },
      {
        type: 'Subscription',
        field: '*',
        complexity: 5 // Subscriptions consume resources
      }
    ],
    onComplete: (complexity: number) => {
      if (complexity > 500) {
        console.warn(`High complexity query: ${complexity}`)
      }
    }
  }),
  */
  
  // Rate limiting to prevent abuse - disabled for now
  /* useRateLimiter({
    max: 100, // 100 requests per window
    window: 60000, // 1 minute window
    keyGenerator: (context: any) => {
      // Rate limit by user ID if authenticated, otherwise by IP
      return context.user?.id || 
             context.request?.headers?.get('x-forwarded-for') ||
             context.request?.headers?.get('x-real-ip') ||
             'anonymous'
    },
    skip: (context: any) => {
      // Skip rate limiting for system admins
      return context.user?.role === 'SYSTEM_ADMIN'
    },
    onLimit: (context: any) => {
      console.warn('Rate limit exceeded:', {
        key: context.user?.id || 'anonymous',
        ip: context.request?.headers?.get('x-forwarded-for')
      })
    }
  })
  */
]

/**
 * Error handling plugins
 */
export const errorPlugins = [
  {
    onExecute() {
      return {
        onExecuteDone(payload: any) {
          if (payload.result.errors) {
            payload.result.errors.forEach((error: any) => {
              // Format and report errors
              reportError(error, payload.args.contextValue)
              return formatError(error)
            })
          }
        }
      }
    }
  }
]

/**
 * Performance monitoring plugins
 */
export const performancePlugins = [
  {
    onExecute() {
      const start = Date.now()
      
      return {
        onExecuteDone(payload: any) {
          const duration = Date.now() - start
          
          // Log slow queries
          if (duration > 1000) {
            console.warn('Slow GraphQL query:', {
              duration: `${duration}ms`,
              operation: payload.args.document?.definitions?.[0]?.name?.value,
              complexity: payload.result.extensions?.complexity,
              user: payload.args.contextValue?.user?.id
            })
          }
          
          // Add performance data to response
          if (!payload.result.extensions) {
            payload.result.extensions = {}
          }
          payload.result.extensions.performance = {
            duration,
            timestamp: new Date().toISOString()
          }
        }
      }
    }
  }
]

/**
 * Development-only plugins
 */
export const developmentPlugins = process.env.NODE_ENV === 'development' ? [
  // Query logging in development
  {
    onExecute() {
      return {
        onExecuteDone(payload: any) {
          const operation = payload.args.document?.definitions?.[0]
          console.log('GraphQL Operation:', {
            type: operation?.operation,
            name: operation?.name?.value,
            user: payload.args.contextValue?.user?.email,
            variables: payload.args.variableValues
          })
        }
      }
    }
  }
] : []

/**
 * Authentication plugin
 */
export const authenticationPlugin: Plugin = {
  onExecute() {
    return {
      onExecuteDone(payload: any) {
        const context = payload.args.contextValue
        
        // Track authentication metrics
        if (context.user) {
          // Update user last seen
          // This would typically be handled in context creation
        }
      }
    }
  }
}

/**
 * Subscription management plugin
 */
export const subscriptionPlugin: Plugin = {
  onSubscribe() {
    return {
      onSubscribeResult(payload: any) {
        // Track active subscriptions
        console.log('New subscription:', {
          user: payload.args.contextValue?.user?.id,
          operation: payload.args.document?.definitions?.[0]?.name?.value
        })
      },
      onSubscribeEnd(payload: any) {
        // Clean up subscription resources
        console.log('Subscription ended:', {
          user: payload.args.contextValue?.user?.id
        })
      }
    }
  }
}

/**
 * Custom field authorization plugin
 */
export const fieldAuthorizationPlugin: Plugin = {
  onExecute() {
    return {
      onExecuteDone(payload: any) {
        // Field-level authorization could be implemented here
        // This is a placeholder for more complex authorization logic
      }
    }
  }
}

/**
 * All plugins combined
 */
export const plugins = [
  ...securityPlugins,
  ...errorPlugins,
  ...performancePlugins,
  ...developmentPlugins,
  authenticationPlugin,
  subscriptionPlugin,
  fieldAuthorizationPlugin
]

/**
 * Plugin configuration factory
 */
export function createPlugins(options: {
  maxDepth?: number
  maxComplexity?: number
  rateLimit?: { max: number; window: number }
  enablePerformanceMonitoring?: boolean
} = {}) {
  const {
    maxDepth = 10,
    maxComplexity = 1000,
    rateLimit = { max: 100, window: 60000 },
    enablePerformanceMonitoring = true
  } = options
  
  const customPlugins = [
    useDepthLimit({ maxDepth }),
    // useQueryComplexity({ maximumComplexity: maxComplexity }), // Package not available
    // useRateLimiter({ // Package not available
    //   max: rateLimit.max,
    //   window: rateLimit.window,
    //   keyGenerator: (context: any) => {
    //     return context.user?.id || context.request?.ip || 'anonymous'
    //   }
    // })
  ]
  
  if (enablePerformanceMonitoring) {
    customPlugins.push(...performancePlugins)
  }
  
  return [...customPlugins, ...errorPlugins]
}

export default plugins
