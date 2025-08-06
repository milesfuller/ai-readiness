import { setupServer } from 'msw/node'
import { rest } from 'msw'

// Mock API handlers for testing
export const handlers = [
  // Mock Supabase auth endpoints
  rest.post('*/auth/v1/signup', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        user: { id: '1', email: 'test@example.com' },
        session: { access_token: 'mock-token' }
      })
    )
  }),

  rest.post('*/auth/v1/token', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: 'mock-token',
        user: { id: '1', email: 'test@example.com' }
      })
    )
  }),

  // Mock API endpoints
  rest.get('/api/test', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Test API' }))
  }),

  rest.post('/api/auth/signup', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ user: { id: '1', email: 'test@example.com' } })
    )
  }),

  rest.get('/api/export', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ data: 'mock export data' })
    )
  }),

  rest.post('/api/llm/analyze', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ analysis: 'mock analysis' })
    )
  }),

  rest.post('/api/llm/batch', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ results: ['mock batch result'] })
    )
  })
]

// Create MSW server instance
export const server = setupServer(...handlers)