'use client'

import React, { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'

export default function DebugPage() {
  const [envStatus, setEnvStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkEnvironment()
  }, [])

  const checkEnvironment = async () => {
    try {
      // Check client-side env vars
      const clientEnv = {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }

      // Try to check server-side env vars
      let serverEnv = null
      let serverError = null
      try {
        const response = await fetch('/api/debug/env')
        if (!response.ok) {
          serverError = `Server returned ${response.status}: ${response.statusText}`
        } else {
          serverEnv = await response.json()
        }
      } catch (error) {
        serverError = `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error('Server check error:', error)
      }

      setEnvStatus({
        client: clientEnv,
        server: serverEnv,
        serverError
      })
    } catch (error) {
      console.error('Error checking environment:', error)
      setEnvStatus({
        client: {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        },
        server: null,
        serverError: 'Failed to check environment'
      })
    } finally {
      setLoading(false)
    }
  }

  const StatusIcon = ({ status }: { status: boolean }) => {
    return status ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking environment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 mb-8">
          <AlertCircle className="w-6 h-6 text-yellow-500" />
          <h1 className="text-2xl font-bold">Environment Debug</h1>
        </div>

        {/* Client-side Environment */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Client-side Environment Variables</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">NEXT_PUBLIC_SUPABASE_URL</span>
              <div className="flex items-center gap-2">
                <StatusIcon status={!!envStatus?.client?.supabaseUrl} />
                <span className="text-sm text-muted-foreground">
                  {envStatus?.client?.supabaseUrl ? 'Set' : 'Not Set'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
              <div className="flex items-center gap-2">
                <StatusIcon status={!!envStatus?.client?.supabaseKey} />
                <span className="text-sm text-muted-foreground">
                  {envStatus?.client?.supabaseKey ? 'Set' : 'Not Set'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Current Values (for debugging) */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Current Environment Values</h2>
          <div className="space-y-2 font-mono text-xs">
            <div>
              <span className="text-muted-foreground">NEXT_PUBLIC_SUPABASE_URL:</span>
              <div className="ml-4 break-all">
                {envStatus?.client?.supabaseUrl || 'Not Set'}
              </div>
            </div>
            <div className="mt-4">
              <span className="text-muted-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
              <div className="ml-4 break-all">
                {envStatus?.client?.supabaseKey ? 
                  `${envStatus.client.supabaseKey.substring(0, 40)}...` : 
                  'Not Set'}
              </div>
            </div>
          </div>
        </Card>

        {/* Server Error */}
        {envStatus?.serverError && (
          <Card className="p-6 border-red-500/50">
            <h2 className="text-lg font-semibold mb-4 text-red-500">Server Check Error</h2>
            <p className="text-sm text-red-400">{envStatus.serverError}</p>
            <p className="text-sm text-muted-foreground mt-2">
              This might be normal in production. The server-side check only works in development mode.
            </p>
          </Card>
        )}

        {/* Server-side Environment */}
        {envStatus?.server && !envStatus.server.error && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Server-side Environment Check</h2>
            <div className="space-y-4">
              {/* Supabase */}
              <div>
                <h3 className="font-medium mb-2">Supabase Configuration</h3>
                <div className="space-y-2 ml-4">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={envStatus.server.supabase.url.exists} />
                    <span className="text-sm">URL exists</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={envStatus.server.supabase.url.format} />
                    <span className="text-sm">URL format correct</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={envStatus.server.supabase.anonKey.exists} />
                    <span className="text-sm">Anon key exists</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={envStatus.server.supabase.anonKey.format} />
                    <span className="text-sm">Anon key format correct (JWT)</span>
                  </div>
                </div>
              </div>

              {/* Anthropic */}
              <div>
                <h3 className="font-medium mb-2">Anthropic Configuration</h3>
                <div className="space-y-2 ml-4">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={envStatus.server.anthropic.apiKey.exists} />
                    <span className="text-sm">API key exists</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={envStatus.server.anthropic.apiKey.format} />
                    <span className="text-sm">API key format correct</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Instructions */}
        <Card className="p-6 bg-muted/50">
          <h2 className="text-lg font-semibold mb-4">Fixing Environment Variables</h2>
          <ol className="space-y-3 text-sm">
            <li>1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables</li>
            <li>2. Add the missing variables (no quotes!):</li>
            <li className="ml-4 font-mono bg-background p-2 rounded">
              NEXT_PUBLIC_SUPABASE_URL=https://[your-ref].supabase.co
            </li>
            <li className="ml-4 font-mono bg-background p-2 rounded">
              NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
            </li>
            <li className="ml-4 font-mono bg-background p-2 rounded">
              ANTHROPIC_API_KEY=sk-ant-api03-[your-key]
            </li>
            <li>3. After adding variables, redeploy without cache</li>
          </ol>
        </Card>

        {/* Test Supabase Connection */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Test Supabase Connection</h2>
          <Button 
            onClick={async () => {
              try {
                const { createClient } = await import('@/lib/supabase/client')
                const supabase = createClient()
                const { data, error } = await supabase.auth.getSession()
                
                if (error) {
                  alert(`Supabase Error: ${error.message}`)
                } else {
                  alert(`Supabase Connected! Session: ${data.session ? 'Active' : 'No session'}`)
                }
              } catch (error) {
                alert(`Connection Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
              }
            }}
            className="w-full"
          >
            Test Supabase Connection
          </Button>
        </Card>

        <Button 
          onClick={() => window.location.href = '/'}
          className="w-full"
        >
          Go to Home
        </Button>
      </div>
    </div>
  )
}