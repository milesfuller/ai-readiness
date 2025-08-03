# Quick Setup Guide

## Prerequisites
- Vercel account
- Supabase account
- Anthropic API key (starts with `sk-ant-api03-`)

## Step 1: Set Up Supabase Database

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Save your project URL and anon key

2. **Run Database Setup**:
   - In Supabase Dashboard → SQL Editor
   - Click "New Query"
   - Copy ALL contents from `supabase/setup-database.sql`
   - Paste and click "Run"
   - You should see "Success. No rows returned"

3. **Verify Tables**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' ORDER BY table_name;
   ```

## Step 2: Deploy to Vercel

1. **Import Repository**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your Git repository

2. **Set Environment Variables**:
   **CRITICAL**: Add these in Vercel project settings → Environment Variables
   
   ⚠️ **DO NOT include quotes or brackets!**
   
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
   ```
   
   **Where to find these values:**
   - **Supabase URL & Anon Key**: Supabase Dashboard → Settings → API
   - **Anthropic API Key**: console.anthropic.com → API Keys
   
   **After adding variables:**
   - Must redeploy without cache
   - Go to Deployments → Latest → "..." → Redeploy
   - Uncheck "Use existing Build Cache"

3. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete

## Step 3: Connect Supabase Integration

1. **In Vercel Dashboard**:
   - Go to your project
   - Click "Integrations" tab
   - Search for "Supabase"
   - Click "Add Integration"
   - Select your Supabase project
   - This automatically syncs environment variables

## Step 4: Test Your Deployment

1. **Sign Up**:
   - Go to your-app.vercel.app/auth/register
   - Create an account
   - Check email for verification

2. **Verify Email**:
   - Click the link in your email
   - You'll be redirected to login

3. **Login**:
   - Use your credentials
   - You should see the dashboard

## Troubleshooting

### Login Issues
If login doesn't redirect:
1. Check browser console (F12)
2. Disable browser extensions
3. Try incognito mode
4. Clear cookies/localStorage

### Database Issues
If you get errors:
1. Ensure database script ran successfully
2. Check Supabase logs for errors
3. Verify environment variables in Vercel

### Rate Limiting
If you see "Rate limit exceeded":
- Wait 15 minutes
- Auth limit: 50 requests per 15 min
- API limit: 100 requests per 15 min

## Common Issues

1. **No tables in Supabase**: Run the database setup script
2. **Invalid API key**: Check ANTHROPIC_API_KEY format
3. **Login doesn't redirect**: Browser extension interference
4. **Build errors**: Ensure all env vars are set

## Support
- Check `TROUBLESHOOTING.md` for detailed debugging
- Vercel logs: Project → Functions tab
- Supabase logs: Project → Logs