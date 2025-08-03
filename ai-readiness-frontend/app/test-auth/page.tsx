'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle } from 'lucide-react'

export default function TestAuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testAuth = async (action: 'register' | 'login') => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/test-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, action })
      })
      
      const data = await response.json()
      setResult({
        action,
        status: response.status,
        data
      })
    } catch (error) {
      setResult({
        action,
        status: 'error',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold mb-8">Test Authentication</h1>
        
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Test Credentials</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
              />
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() => testAuth('register')}
                disabled={loading || !email || !password}
                className="flex-1"
              >
                Test Register
              </Button>
              <Button
                onClick={() => testAuth('login')}
                disabled={loading || !email || !password}
                variant="outline"
                className="flex-1"
              >
                Test Login
              </Button>
            </div>
          </div>
        </Card>

        {result && (
          <Card className={`p-6 ${result.status === 200 ? 'border-green-500/50' : 'border-red-500/50'}`}>
            <div className="flex items-start gap-3">
              {result.status === 200 ? (
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold mb-2">
                  {result.action === 'register' ? 'Registration' : 'Login'} Result
                </h3>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-muted/50">
          <h2 className="text-lg font-semibold mb-4">Common Issues</h2>
          <ul className="space-y-2 text-sm">
            <li>• <strong>Email already registered</strong>: User already exists</li>
            <li>• <strong>Invalid email</strong>: Check email format</li>
            <li>• <strong>Password too short</strong>: Minimum 6 characters</li>
            <li>• <strong>Database error</strong>: Tables might not exist</li>
            <li>• <strong>No API key found</strong>: Environment variables not set</li>
          </ul>
        </Card>

        <div className="flex gap-4">
          <Button 
            onClick={() => window.location.href = '/debug'}
            variant="outline"
            className="flex-1"
          >
            Back to Debug
          </Button>
          <Button 
            onClick={() => window.location.href = '/auth/register'}
            className="flex-1"
          >
            Go to Register Page
          </Button>
        </div>
      </div>
    </div>
  )
}