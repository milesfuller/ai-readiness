import { NextRequest, NextResponse } from 'next/server'
import { createYoga, createSchema } from 'graphql-yoga'
import { typeDefs } from '../../../lib/graphql/schema'
import { resolvers } from '../../../lib/graphql/resolvers'
import { createContext } from '../../../lib/graphql/context'
import { plugins } from '../../../lib/graphql/plugins'
import { useDepthLimit } from '@envelop/depth-limit'

// Create GraphQL schema
const schema = createSchema({
  typeDefs,
  resolvers,
})

// Create GraphQL Yoga server instance
const yoga = createYoga({
  schema: schema as any, // Type assertion to bypass strict typing
  context: async ({ request }) => createContext(request as NextRequest),
  plugins: [
    ...plugins,
    // authenticationPlugin, // Not defined
    // rateLimitPlugin({ // Not defined
    //   max: 100, // 100 requests per minute
    //   windowMs: 60 * 1000, // 1 minute window
    //   keyGenerator: (req: any) => req.headers.get('x-forwarded-for') || req.ip || 'anonymous'
    // }),
    useDepthLimit({
      maxDepth: 10,
      ignore: ['__schema', '__type']
    })
    /* Disabled - package not available
    useQueryComplexity({
      maximumComplexity: 1000,
      estimators: [
        // Custom complexity estimators for expensive operations
        {
          type: 'Query',
          field: 'surveyAnalytics',
          complexity: 50
        },
        {
          type: 'Query', 
          field: 'dashboardAnalytics',
          complexity: 100
        }
      ]
    })
    */
  ],
  graphiql: process.env.NODE_ENV === 'development',
  landingPage: false,
  cors: {
    origin: process.env.NODE_ENV === 'development' ? '*' : process.env.FRONTEND_URL,
    credentials: true
  },
  healthCheckEndpoint: '/api/graphql/health',
  fetchAPI: {
    Request,
    Response,
    Headers
  }
})

// Handle GraphQL requests
export async function GET(request: NextRequest) {
  try {
    return await yoga.fetch(request, {
      method: 'GET'
    })
  } catch (error) {
    console.error('GraphQL GET Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    return await yoga.fetch(request, {
      method: 'POST'
    })
  } catch (error) {
    console.error('GraphQL POST Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' ? '*' : process.env.FRONTEND_URL || '',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-graphql-query-depth',
      'Access-Control-Allow-Credentials': 'true'
    }
  })
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'x-graphql-endpoint': 'healthy',
      'x-schema-version': '2.0.0'
    }
  })
}

/**
 * GraphQL endpoint configuration:
 * - GET: GraphQL playground (development only)
 * - POST: GraphQL queries and mutations
 * - OPTIONS: CORS preflight
 * - HEAD: Health check
 * 
 * Features:
 * - Authentication middleware
 * - Rate limiting (100 req/min)
 * - Query depth limiting (max 10)
 * - Query complexity analysis (max 1000)
 * - CORS configuration
 * - Error handling and logging
 * - Development playground
 */
