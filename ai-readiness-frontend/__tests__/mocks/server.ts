import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock API handlers for testing (MSW v2 syntax)
export const handlers = [
  // Mock Supabase auth endpoints
  http.post('*/auth/v1/signup', () => {
    return HttpResponse.json({
      user: { id: '1', email: 'test@example.com' },
      session: { access_token: 'mock-token' }
    })
  }),

  http.post('*/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-token',
      user: { id: '1', email: 'test@example.com' }
    })
  }),

  // Mock API endpoints
  http.get('/api/test', () => {
    return HttpResponse.json({ message: 'Test API' })
  }),

  http.post('/api/auth/signup', () => {
    return HttpResponse.json({ user: { id: '1', email: 'test@example.com' } })
  }),

  http.get('/api/export', () => {
    return HttpResponse.json({ data: 'mock export data' })
  }),

  http.post('/api/llm/analyze', () => {
    return HttpResponse.json({ analysis: 'mock analysis' })
  }),

  http.post('/api/llm/batch', () => {
    return HttpResponse.json({ results: ['mock batch result'] })
  })
]

// Create MSW server instance
export const server = setupServer(...handlers)