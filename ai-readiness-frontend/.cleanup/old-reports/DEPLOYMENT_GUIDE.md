# 🚀 Vercel + Supabase Deployment Guide

This guide uses the official Vercel-Supabase integration for seamless deployment.

## Prerequisites
- Vercel account
- Supabase account  
- GitHub account (recommended)
- OpenAI or Anthropic API key

## Option A: Deploy via GitHub (Recommended)

### 1. Push to GitHub
```bash
# Create a new repository on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/ai-readiness.git
git branch -M main
git push -u origin main
```

### 2. Deploy with Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your `ai-readiness` repository
4. **IMPORTANT**: Set the Root Directory to `ai-readiness-frontend`
5. Click "Deploy"

### 3. Add Supabase Integration
1. After deployment, go to your project dashboard
2. Click "Integrations" tab
3. Browse and find "Supabase"
4. Click "Add Integration"
5. Follow the prompts to:
   - Connect your Supabase account
   - Create a new Supabase project OR connect existing one
   - Vercel will automatically add all Supabase environment variables

### 4. Set Up Database Schema
1. Go to your Supabase dashboard
2. Click "SQL Editor"
3. Click "New query"
4. Copy contents from `revised_database_schema_v2.sql`
5. Run the query

### 5. Add Additional Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

```env
# LLM API Keys (at least one required)
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...

# Security (generate these with the script below)
CSRF_SECRET=[32-char-string]
NEXTAUTH_SECRET=[32-char-string]
```

Generate secrets by running:
```bash
node scripts/generate-secrets.js
```

### 6. Configure Supabase Auth
1. In Supabase Dashboard → Authentication → URL Configuration
2. Site URL: `https://your-project.vercel.app`
3. Redirect URLs: Add `https://your-project.vercel.app/**`

### 7. Redeploy
1. In Vercel, go to Deployments
2. Click "..." on latest deployment → "Redeploy"
3. Use production branch

---

## Option B: Deploy via Vercel CLI

### 1. Install and Login
```bash
npm i -g vercel
vercel login
```

### 2. Link Supabase First
1. Go to [vercel.com/integrations/supabase](https://vercel.com/integrations/supabase)
2. Click "Add Integration"
3. Select your Vercel scope
4. Configure Supabase connection

### 3. Deploy Project
```bash
cd ai-readiness-frontend
vercel

# Answer prompts:
# - Set up and deploy? Y
# - Which scope? [select your account]
# - Link to existing project? N
# - Project name? ai-readiness
# - Directory? ./
# - Override settings? N
```

### 4. Link to Supabase Project
After initial deployment:
1. Go to Vercel dashboard
2. Select your project
3. Go to Integrations
4. Connect the Supabase integration
5. It will auto-populate all Supabase env vars

### 5. Add Remaining Environment Variables
```bash
# Add LLM keys
vercel env add OPENAI_API_KEY production
# Enter your OpenAI key when prompted

# Add security secrets
vercel env add CSRF_SECRET production
# Enter generated secret

vercel env add NEXTAUTH_SECRET production  
# Enter generated secret
```

### 6. Deploy to Production
```bash
vercel --prod
```

---

## Post-Deployment Setup

### 1. Create Admin User
1. Register a new account on your deployed app
2. Go to Supabase SQL Editor
3. Run:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### 2. Test Core Features
- ✅ Registration with email verification
- ✅ Login/Logout
- ✅ Take a survey
- ✅ View analytics (after completing survey)
- ✅ Admin panel access (if admin)
- ✅ LLM analysis (check survey results)

### 3. Security Verification
Visit these endpoints:
- `/api/security/health` - Should show security status
- `/api/security/report` - Should show security report (requires auth)

### 4. Monitor Performance
- Vercel Dashboard: Function logs, errors, usage
- Supabase Dashboard: Database queries, auth logs
- Browser Console: Check for CSP violations

---

## Environment Variables Reference

### Automatically Set by Integration
```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  
SUPABASE_SERVICE_ROLE_KEY
```

### Required Manual Setup
```env
# LLM (at least one)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Security
CSRF_SECRET=[32 chars]
NEXTAUTH_SECRET=[32 chars]
```

### Optional
```env
# Monitoring
SECURITY_WEBHOOK_URL=https://...
SENTRY_DSN=https://...
```

---

## Troubleshooting

### "Database connection failed"
- Check Supabase integration is connected
- Verify env vars are set in Vercel
- Check Supabase project is active

### "Invalid environment variables"
- Go to Vercel → Settings → Environment Variables
- Ensure no quotes around values
- Redeploy after changes

### "Build failed"
- Check build logs in Vercel
- Ensure root directory is set to `ai-readiness-frontend`
- Try `npm run build` locally

### "CORS errors"  
- Add your Vercel URL to Supabase Auth settings
- Check browser console for specific domain issues

---

## Quick Commands

```bash
# View all env vars
vercel env ls

# Pull env vars locally
vercel env pull

# Open project dashboard
vercel

# View deployment logs
vercel logs

# Promote to production
vercel promote
```

---

## Next Steps

1. **Custom Domain**
   - Add in Vercel → Settings → Domains
   - Update Supabase Auth URLs

2. **Enable Analytics**
   - Vercel Analytics (built-in)
   - Vercel Speed Insights
   - Set up Sentry for errors

3. **Scale Resources**
   - Upgrade Vercel for more functions
   - Upgrade Supabase for more storage
   - Consider Redis for caching

Need help? Check:
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Integration Guide](https://vercel.com/integrations/supabase)