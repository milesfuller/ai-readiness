# Troubleshooting Guide

## Login Issues

### Error: "A listener indicated an asynchronous response..."

This error typically occurs due to:

1. **Browser Extensions**: Disable password managers, ad blockers, or other extensions temporarily
2. **Missing Supabase Configuration**: Ensure Supabase environment variables are set

### Quick Fixes:

#### 1. Check Supabase Integration
In Vercel Dashboard:
- Go to your project → Integrations
- Ensure Supabase is connected
- Check that these env vars exist:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 2. Verify Supabase URL
Your Supabase URL should look like:
```
https://[your-project-ref].supabase.co
```

#### 3. Check Browser Console
Open Developer Tools (F12) and check:
- Network tab for failed requests
- Console for specific error messages

#### 4. Test Direct Supabase Connection
Visit your Supabase dashboard and try:
1. Go to Authentication → Users
2. Create a user manually
3. Check if the user appears

#### 5. Clear Browser Data
- Clear cookies for your app domain
- Clear localStorage
- Try incognito/private browsing

### If Login Still Fails:

#### Database Setup Required!
**IMPORTANT**: If you see "no tables in supabase", you need to run the database setup script:

1. **Go to Supabase SQL Editor**:
   - Open your Supabase project dashboard
   - Navigate to SQL Editor (left sidebar)
   - Click "New Query"

2. **Run the Setup Script**:
   - Copy the entire contents of `supabase/setup-database.sql`
   - Paste into the SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

3. **Verify Tables Were Created**:
   ```sql
   -- Check if tables exist
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

   You should see these tables:
   - activity_logs
   - llm_analyses
   - organization_members
   - organizations
   - profiles
   - survey_responses
   - surveys

4. **Check Your User Profile**:
   ```sql
   -- Find your user ID
   SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
   
   -- Check if profile was created
   SELECT * FROM public.profiles WHERE user_id = 'your-user-id';
   ```

#### Manual Database Check
In Supabase SQL Editor, run:
```sql
-- Check if auth schema exists
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'auth';

-- Check if users can be created
SELECT * FROM auth.users LIMIT 1;

-- Check profiles table
SELECT * FROM public.profiles LIMIT 1;
```

#### Environment Variable Check
In Vercel, ensure NO quotes around values:
```
✅ CORRECT:
NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co

❌ WRONG:
NEXT_PUBLIC_SUPABASE_URL="https://abc.supabase.co"
```

## Common Issues & Solutions

### 1. "No API key found in request" Error
This means Supabase environment variables are not set properly in Vercel.

**Fix:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Ensure these are set (NO quotes!):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[your-ref].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
   ```
3. **IMPORTANT**: After adding/updating env vars:
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"
   - Select "Use existing Build Cache" = NO
   - Click "Redeploy"

**Verify Environment Variables:**
- In development: Visit `/api/debug/env` to check env vars
- Check Vercel Functions logs for errors

### 2. "Invalid API Key"
- Verify `ANTHROPIC_API_KEY` is set correctly
- No quotes around the key
- Key starts with `sk-ant-api03-`

### 2. "Rate limit exceeded"
- Wait 15 minutes for rate limit to reset
- Check if you're making too many requests
- The limits are:
  - Auth: 50 requests per 15 minutes
  - API: 100 requests per 15 minutes

### 3. "Database connection failed"
- Check Supabase project is active (not paused)
- Verify Row Level Security (RLS) is enabled
- Run the database schema script

### 4. Blank Page After Login
- Check browser console for errors
- Verify `/dashboard` route exists
- Check middleware redirects

### 5. Email Verification Not Working
- Check spam folder
- Verify email settings in Supabase:
  - Auth → Email Templates
  - Auth → SMTP Settings (if custom)

## Debug Mode

Add this to your `.env.local` for detailed logs:
```
NEXT_PUBLIC_DEBUG=true
```

Then check console for detailed auth flow logs.

## Need More Help?

1. **Check Logs**:
   - Vercel: Functions tab → View logs
   - Supabase: Logs → API logs

2. **Test Endpoints**:
   ```bash
   # Test security health
   curl https://your-app.vercel.app/api/security/health
   
   # Test auth (should fail without token)
   curl https://your-app.vercel.app/api/security/report
   ```

3. **Contact Support**:
   - Vercel: vercel.com/support
   - Supabase: supabase.com/support