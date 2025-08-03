# 🚀 NEW PROJECT SETUP CHECKLIST

## STOP! Run this BEFORE writing any code!

### 1️⃣ Project Initialization (5 minutes)
```bash
# Create project with all flags
npx create-next-app@latest my-app --typescript --tailwind --app --src-dir --import-alias "@/*"

# Install dependencies IMMEDIATELY
cd my-app
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 2️⃣ Supabase Setup (10 minutes)
```bash
# Create Supabase project at https://app.supabase.com

# CRITICAL: In Supabase Dashboard
# 1. Go to Authentication > Providers > Email
# 2. DISABLE "Confirm email" ❌
# 3. ENABLE "Enable email provider" ✅

# Run the setup SQL with permissions
# Copy from .claude/templates/supabase-setup-with-permissions.sql
```

### 3️⃣ Environment Setup (5 minutes)
```bash
# Create .env.local with EXACT names
cat > .env.local << 'EOF'
# Supabase (get from project settings)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Anthropic (if needed)
ANTHROPIC_API_KEY=sk-ant-api03-...
EOF

# Create validation script
cat > scripts/validate-env.js << 'EOF'
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
]

const missing = required.filter(key => !process.env[key])
if (missing.length > 0) {
  console.error('Missing:', missing)
  process.exit(1)
}
console.log('✅ Environment valid')
EOF
```

### 4️⃣ Auth Setup (10 minutes)
```typescript
// lib/supabase/client.ts
import { createBrowserClient as createClient } from '@supabase/ssr'

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// app/api/auth/signup/route.ts
export async function POST(request: Request) {
  const { email, password, firstName, lastName } = await request.json()
  const supabase = createBrowserClient()
  
  // Create user with metadata that matches trigger expectations
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { firstName, lastName } // Flat structure!
    }
  })
  
  if (error) {
    // Fallback: Create profile manually
    if (data?.user) {
      await supabase.from('profiles').insert({
        user_id: data.user.id,
        first_name: firstName,
        last_name: lastName
      })
    }
  }
  
  return Response.json({ success: !error })
}
```

### 5️⃣ Edge Runtime Compatibility (5 minutes)
```typescript
// ❌ NEVER use these in API routes:
import crypto from 'crypto' // Node.js only
Buffer.from() // Node.js only
process.cwd() // Node.js only

// ✅ ALWAYS use these instead:
const crypto = globalThis.crypto // Web Crypto API
new TextEncoder().encode() // Instead of Buffer
process.env.VARIABLE // Environment variables OK
```

### 6️⃣ Vercel Deployment Setup (5 minutes)
```bash
# Install Vercel CLI
npm i -g vercel

# Link to project
vercel link

# Set ALL environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add ANTHROPIC_API_KEY

# Verify
vercel env ls
```

### 7️⃣ Pre-Flight Validation (2 minutes)
```json
// package.json scripts
{
  "scripts": {
    "validate:env": "node scripts/validate-env.js",
    "validate:build": "next build",
    "validate:all": "npm run validate:env && npm run validate:build",
    "predeploy": "npm run validate:all"
  }
}
```

### 8️⃣ Test Endpoints (5 minutes)
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    env: {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    timestamp: new Date().toISOString()
  }
  
  return Response.json(checks)
}
```

## 🚨 COMMON MISTAKES TO AVOID

1. **DON'T** create tables without granting permissions
2. **DON'T** use complex nested metadata in auth.signUp
3. **DON'T** forget to disable email confirmation in Supabase
4. **DON'T** use Node.js APIs in Edge Runtime
5. **DON'T** deploy without testing locally first

## ✅ VERIFICATION COMMANDS

```bash
# Local testing
npm run dev
# Visit http://localhost:3000/api/health

# Test auth
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# Deploy only after ALL tests pass
npm run predeploy && vercel --prod
```

## 📝 Project Template Structure

```
my-app/
├── .env.local                 # Environment variables
├── .env.example              # Template for others
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── signup/
│   │   │       └── route.ts  # Signup with fallback
│   │   └── health/
│   │       └── route.ts      # Health check
│   └── auth/
│       ├── login/
│       │   └── page.tsx      # Login form
│       └── register/
│           └── page.tsx      # Register form
├── lib/
│   └── supabase/
│       ├── client.ts         # Browser client
│       └── server.ts         # Server client
├── scripts/
│   └── validate-env.js       # Environment validation
└── supabase/
    └── setup.sql            # Database setup WITH permissions
```

## 🎯 Time Saved: 4-6 hours per project

By following this checklist, you avoid ALL the issues we encountered!