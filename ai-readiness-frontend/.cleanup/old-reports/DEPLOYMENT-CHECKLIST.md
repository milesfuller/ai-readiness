# 🚀 Deployment Checklist

## Pre-Deployment Checks

### ✅ Environment Variables
- [ ] All `NEXT_PUBLIC_*` variables are in Vercel
- [ ] `ANTHROPIC_API_KEY` is set (without NEXT_PUBLIC prefix)
- [ ] Database URL is configured
- [ ] Run: `npm run check:env`

### ✅ Database Setup
- [ ] All tables created with `supabase/setup-database.sql`
- [ ] Permissions granted with `supabase/fix-trigger-permissions.sql`
- [ ] RLS policies are appropriate
- [ ] Test user can sign up locally

### ✅ Build Verification
- [ ] `npm run build` succeeds locally
- [ ] `npm run type-check` passes
- [ ] `npm run lint` has no errors
- [ ] All tests pass: `npm test`

### ✅ Edge Runtime Compatibility
- [ ] No Node.js-specific APIs in edge routes
- [ ] No `crypto` module usage (use Web Crypto API)
- [ ] All API routes specify `export const runtime = 'edge'` if needed

## Deployment Steps

### 1️⃣ Prepare
```bash
# Ensure clean working directory
git status

# Update dependencies
npm install

# Run all checks
npm run predeploy
```

### 2️⃣ Deploy
```bash
# Push to GitHub (triggers Vercel)
git push origin main

# Or manual deploy
vercel --prod
```

### 3️⃣ Verify
```bash
# Check deployment
curl https://your-app.vercel.app/api/health

# Test auth
curl -X POST https://your-app.vercel.app/api/test-supabase

# Monitor logs
vercel logs --follow
```

## Common Issues & Quick Fixes

### 🔧 "Database error saving new user"
```sql
-- Run in Supabase SQL Editor
GRANT ALL ON public.profiles TO postgres;
GRANT INSERT, SELECT, UPDATE ON public.profiles TO authenticated;
```

### 🔧 "No API key found in request"
```bash
# Verify in Vercel dashboard
vercel env ls

# Re-add if missing
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 🔧 Edge Runtime Errors
```typescript
// Replace Node crypto
- import crypto from 'crypto'
+ const crypto = globalThis.crypto

// Use Web APIs
- Buffer.from(string)
+ new TextEncoder().encode(string)
```

### 🔧 Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

## Post-Deployment

### ✅ Monitoring
- [ ] Check Vercel Functions tab for errors
- [ ] Monitor Supabase logs for auth issues
- [ ] Set up alerts for 5xx errors
- [ ] Verify performance metrics

### ✅ Testing
- [ ] Complete user signup flow
- [ ] Test all critical paths
- [ ] Check mobile responsiveness
- [ ] Verify API rate limits

## Rollback Plan

### If Issues Occur:
1. **Immediate**: Revert in Vercel dashboard
2. **Git**: `git revert HEAD && git push`
3. **Database**: Run rollback scripts
4. **Cache**: Clear CDN cache

## Automation Scripts

### Create these helpful scripts:

**package.json**
```json
{
  "scripts": {
    "predeploy": "npm run check:env && npm run build && npm run test",
    "check:env": "node scripts/check-env.js",
    "validate:db": "node scripts/validate-db.js",
    "deploy:safe": "npm run predeploy && vercel --prod",
    "postdeploy": "npm run smoke-test"
  }
}
```

**scripts/check-env.js**
```javascript
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
]

const missing = required.filter(key => !process.env[key])
if (missing.length > 0) {
  console.error('❌ Missing environment variables:', missing)
  process.exit(1)
}
console.log('✅ All environment variables present')
```

## Quick Command Reference

```bash
# Local testing
npm run dev
npm run build
npm run test

# Deployment
vercel --prod
vercel logs
vercel env ls

# Supabase
npx supabase db push
npx supabase db reset
npx supabase functions deploy

# Troubleshooting
curl -X POST https://app.vercel.app/api/debug-auth
curl https://app.vercel.app/api/health
vercel logs --follow
```

## Remember
1. **Always test locally first**
2. **Use preview deployments**
3. **Keep credentials secure**
4. **Document any new issues**
5. **Update this checklist**