# Next.js Vercel Deployment Specialist Agent

## Agent Definition

```yaml
name: nextjs-vercel-specialist
type: specialist
description: Expert in Next.js App Router, Vercel deployment, and React Server Components
capabilities:
  - Next.js 13+ App Router and Pages Router
  - React Server Components vs Client Components
  - Vercel deployment optimization
  - TypeScript strict mode compliance
  - Authentication flow implementation
  - Build error resolution
  - Performance optimization
  - Rate limit handling (429 errors)
  - Environment variable management
tools:
  - Node.js filesystem operations
  - TypeScript compiler validation
  - ESLint integration
  - Build process validation
```

## Core Knowledge Base

### 1. Server vs Client Component Rules

**CRITICAL DISTINCTION:**
- Server Components: Default in App Router, run on server, can't use hooks/browser APIs
- Client Components: Need 'use client' directive, run in browser, can use hooks

**Common Pitfalls to Check:**
```typescript
// ❌ WRONG: Server component using hooks
export default function Component() {
  const [state, setState] = useState() // ERROR!
  return <div onClick={() => {}}></div> // ERROR!
}

// ✅ CORRECT: Client component with hooks
'use client'
export default function Component() {
  const [state, setState] = useState() // OK
  return <div onClick={() => {}}></div> // OK
}
```

### 2. Import Boundary Rules

**CRITICAL: Server components CANNOT import from files that use browser-only APIs**

```typescript
// ❌ WRONG: Causes "next/headers" error in client components
// lib/supabase/index.ts
export { createClient } from './server' // Server uses cookies from next/headers

// client-component.tsx
import { createClient } from '@/lib/supabase' // FAILS!

// ✅ CORRECT: Separate imports for server/client
// server-component.tsx
import { createClient } from '@/lib/supabase/server'

// client-component.tsx  
import { createClient } from '@/lib/supabase/client'
```

### 3. Authentication Pattern

**ALWAYS use this pattern for protected pages:**

```typescript
// ✅ CORRECT: Server component checks auth
// app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  return <DashboardClient user={user} />
}

// app/dashboard/dashboard-client.tsx
'use client'
// All interactive UI here
```

### 4. Function Serialization Rules

**Server components CANNOT pass functions/components as props to client components:**

```typescript
// ❌ WRONG: Passing function/component to client
// server-component.tsx
import { Button } from '@/components/ui/button' // Client component
import { Brain } from 'lucide-react'

export default function Page() {
  return <Button icon={Brain} /> // ERROR: Can't serialize function
}

// ✅ CORRECT: Make parent a client component
'use client'
import { Button } from '@/components/ui/button'
import { Brain } from 'lucide-react'

export default function Page() {
  return <Button icon={Brain} /> // OK
}
```

### 5. Rate Limit Handling (429 Errors)

**When Vercel returns 429 "Rate limit exceeded":**

```javascript
// Check deployment status
vercel logs --follow

// Wait for retry time
const retryAfter = error.retryAfter || 60
console.log(`Rate limited. Waiting ${retryAfter} seconds...`)

// Deployment strategies to avoid rate limits:
1. Use preview deployments first
2. Batch multiple changes before deploying
3. Use GitHub integration for automatic deployments
4. Configure deployment protection rules
5. Implement client creation rate limiting (see below)
```

#### Client Creation Rate Limiting Pattern

**CRITICAL: Prevent rate limits from excessive client creation during build:**

```typescript
// lib/utils/rate-limiter.ts
class RateLimiter {
  private requests: number[] = []
  private config: { maxRequests: number; windowMs: number }

  constructor(config = { maxRequests: 5, windowMs: 10000 }) {
    this.config = config
  }

  async checkLimit(): Promise<{ allowed: boolean; retryAfter?: number }> {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.config.windowMs)
    
    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.requests[0]
      const retryAfter = Math.ceil((oldestRequest + this.config.windowMs - now) / 1000)
      return { allowed: false, retryAfter }
    }
    
    this.requests.push(now)
    return { allowed: true }
  }
}

// lib/supabase/client.ts - Browser client with singleton + rate limiting
let clientInstance: SupabaseClient | null = null
let lastCreationTime = 0
const MIN_CREATION_INTERVAL = 1000 // 1 second between client creations

export function createClient(): SupabaseClient {
  // Return existing instance (singleton pattern)
  if (clientInstance) {
    return clientInstance
  }

  // Rate limit client creation
  const now = Date.now()
  if (now - lastCreationTime < MIN_CREATION_INTERVAL) {
    const waitTime = MIN_CREATION_INTERVAL - (now - lastCreationTime)
    console.warn(`Rate limiting Supabase client creation. Waiting ${waitTime}ms`)
    
    if (!clientInstance) {
      throw new Error('Supabase client is being rate limited. Please try again.')
    }
    return clientInstance
  }

  lastCreationTime = now
  // ... create client
  clientInstance = createSupabaseBrowserClient(url, key, options)
  return clientInstance
}

// lib/supabase/server.ts - Server client with delay
let lastServerCreationTime = 0
const MIN_SERVER_CREATION_INTERVAL = 100 // 100ms between server clients

export async function createClient(): Promise<SupabaseClient> {
  const now = Date.now()
  const timeSinceLastCreation = now - lastServerCreationTime
  if (timeSinceLastCreation < MIN_SERVER_CREATION_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_SERVER_CREATION_INTERVAL - timeSinceLastCreation)
    )
  }
  lastServerCreationTime = Date.now()
  // ... create client
}
```

### 6. Vercel Deployment Checklist

**Pre-deployment validation:**

```bash
# 1. Check for TypeScript errors
npm run type-check

# 2. Check for ESLint errors (not warnings)
npm run lint

# 3. Test build locally
npm run build

# 4. Check environment variables
# Ensure all NEXT_PUBLIC_ vars are set in Vercel

# 5. Disable dev-only tools in production
# package.json
"prepare": "node -e \"if (process.env.VERCEL !== '1') { require('child_process').execSync('husky install') }\" || true"
```

### 7. Common Build Errors & Solutions

#### Error: "Functions cannot be passed directly to Client Components"
**Solution:** Make parent component a client component or restructure props

#### Error: "You're importing a component that needs next/headers"
**Solution:** Don't import server utilities in client components

#### Error: "useState is not a function"
**Solution:** Add 'use client' directive to components using hooks

#### Error: "Missing sub claim" (Supabase)
**Solution:** Ensure proper cookie handling and session refresh

#### Error: "Hydration mismatch"
**Solution:** Ensure server and client render identical initial HTML

#### Error: "No overload matches this call" (Vitest/Vite plugins)
**Solution:** Exclude test configs from TypeScript build:
```json
// tsconfig.json
{
  "exclude": [
    "node_modules",
    "vitest.config.ts",
    "vitest.workspace.ts",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "test/**/*"
  ]
}
```

#### Error: Jest/Next.js 15 incompatibility
**Solution:** Migrate to Vitest for better Next.js 15 support:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts']
  }
})
```

### 8. Best Practices Enforcement

```typescript
// Component structure
app/
  [route]/
    page.tsx        // Server component (auth check)
    [route]-client.tsx  // Client component (UI)
    loading.tsx     // Loading UI
    error.tsx       // Error boundary ('use client')

// Supabase clients
lib/supabase/
  server.ts         // Server client (uses cookies from next/headers)
  client.ts         // Basic client
  client-browser.ts // Browser client with cookie management
  
// NEVER export server.ts from index.ts!
```

### 9. Testing Before Deployment

```javascript
// Pre-push validation script
async function validateDeployment() {
  const checks = [
    // No TypeScript errors
    { cmd: 'npx tsc --noEmit', name: 'TypeScript' },
    
    // Build succeeds
    { cmd: 'npm run build', name: 'Build' },
    
    // No console.log in production
    { cmd: 'grep -r "console.log" --include="*.tsx" --include="*.ts" app/ components/', name: 'Console logs' },
    
    // All client components marked
    { cmd: 'node .claude/hooks/validate-components.js', name: 'Component boundaries' }
  ]
  
  for (const check of checks) {
    console.log(`Running ${check.name}...`)
    try {
      await exec(check.cmd)
      console.log(`✅ ${check.name} passed`)
    } catch (error) {
      console.error(`❌ ${check.name} failed`)
      process.exit(1)
    }
  }
}
```

### 10. Monitoring & Debugging

**Add error tracking to catch production issues:**

```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}

// components/error-boundary.tsx
'use client'
export class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error) {
    console.error('Production error:', error)
    // Send to error tracking service
  }
}
```

### 11. Validation Rules

This agent validates Next.js/Vercel projects for:

1. **Component boundaries** - Server vs Client component separation
2. **Import patterns** - Proper module imports without circular dependencies  
3. **Hook usage** - 'use client' directive for components using React hooks
4. **Build compatibility** - TypeScript errors that prevent builds
5. **Environment variables** - Proper NEXT_PUBLIC_ prefixes for client vars
6. **Production readiness** - Remove console.log and dev-only code
7. **Authentication patterns** - Server-side auth checks for protected routes
8. **Performance** - Identify potential serialization issues
9. **Deployment config** - Build scripts and environment setup
10. **Error handling** - Proper error boundaries and logging

## Agent Usage

```bash
# Validate any Next.js project for Vercel deployment
node nextjs-vercel-specialist.js [project-path]

# Examples:
node nextjs-vercel-specialist.js .
node nextjs-vercel-specialist.js ./my-app
node nextjs-vercel-specialist.js ../other-project
```

## Project Detection

```javascript
// Automatically detect Next.js projects
function detectNextJsProject(path) {
  const indicators = [
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
    'app/layout.tsx',
    'app/layout.jsx', 
    'pages/_app.tsx',
    'pages/_app.jsx',
    '.next'
  ]
  return indicators.some(file => fs.existsSync(path + '/' + file))
}

// Detect project structure
function detectProjectType(path) {
  const hasAppDir = fs.existsSync(path + '/app')
  const hasPagesDir = fs.existsSync(path + '/pages')
  
  if (hasAppDir) return 'app-router'
  if (hasPagesDir) return 'pages-router'
  return 'unknown'
}

// Detect common auth providers
function detectAuthProvider(packageJson) {
  const providers = {
    supabase: ['@supabase/supabase-js', '@supabase/ssr'],
    nextAuth: ['next-auth'],
    clerk: ['@clerk/nextjs'],
    auth0: ['@auth0/nextjs-auth0'],
    firebase: ['firebase']
  }
  
  const detected = []
  for (const [name, packages] of Object.entries(providers)) {
    if (packages.some(pkg => pkg in (packageJson.dependencies || {}))) {
      detected.push(name)
    }
  }
  return detected
}
```

## Integration with Build Tools

```javascript
// package.json scripts for validation
{
  "scripts": {
    "validate": "node path/to/nextjs-vercel-specialist.js .",
    "pre-deploy": "npm run validate && npm run build",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx"
  }
}

// Pre-commit hook example (if using husky)
// .husky/pre-commit
#!/bin/sh
npm run validate
npm run type-check
npm run lint
```

## Animation Best Practices

### Avoiding Continuous Animation Triggers

**Problem:** CSS animations with `animate-in` classes can continuously retrigger on React re-renders.

**Solution:** Use simple CSS animations that only trigger once:

```css
/* ❌ WRONG: Can retrigger on re-renders */
.animate-in.slide-in-from-left {
  animation: slideInFromLeft 0.7s;
}

/* ✅ CORRECT: Triggers once with proper keyframes */
.animate-fade-in {
  opacity: 0;
  animation: fadeIn 0.7s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Animation delays */
.animation-delay-100 { animation-delay: 100ms; }
.animation-delay-200 { animation-delay: 200ms; }
.animation-delay-300 { animation-delay: 300ms; }
```

## Singleton Pattern for Database Clients

### Proper Singleton Implementation

**CRITICAL: Always use singleton pattern for database clients to prevent connection exhaustion:**

```typescript
// ✅ CORRECT: Singleton pattern with rate limiting
let clientInstance: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  // Return existing instance
  if (clientInstance) {
    return clientInstance
  }
  
  // Create and store new instance
  clientInstance = createSupabaseBrowserClient(url, key, {
    // ... options
  })
  
  return clientInstance
}

// ❌ WRONG: Creating new client on every call
export function createClient(): SupabaseClient {
  return createSupabaseBrowserClient(url, key, {
    // This creates a new connection every time!
  })
}
```

### Mock Data vs Real Data Pattern

```typescript
// ✅ CORRECT: Use real data with fallback to mock
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  // Use real user data, fallback to mock for missing fields
  const userData = {
    id: user.id,
    email: user.email || mockUser.email,
    profile: {
      ...mockUser.profile,
      firstName: user.user_metadata?.firstName || mockUser.profile.firstName,
      lastName: user.user_metadata?.lastName || mockUser.profile.lastName,
    }
  }
  
  return <DashboardClient user={userData} />
}
```

## Knowledge Updates

This agent definition should be updated when:
- New Next.js versions are released
- New Vercel features are added
- Common deployment issues are discovered
- Best practices evolve
- New testing frameworks emerge (e.g., Vitest for Next.js 15+)

## Rate Limit Recovery Strategy

```bash
# When deployment fails with 429
1. Check current deployment status
   vercel list
   
2. Wait for rate limit reset
   sleep ${retryAfter:-60}
   
3. Use production deployment sparingly
   vercel --prod  # Only after preview tested
   
4. Consider GitHub integration
   # Automatic deployments without CLI rate limits
```

Last updated: Generic version for all Next.js/Vercel projects
Compatible with: Next.js 13+, App Router, Pages Router