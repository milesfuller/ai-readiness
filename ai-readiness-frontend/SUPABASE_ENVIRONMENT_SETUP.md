# 🔐 Supabase Environment Setup Guide

## Why Separate Environments?

**NEVER use the same Supabase project for staging and production!**

Reasons:
- 🔒 **Security**: Staging tests won't corrupt production data
- 🧪 **Testing**: Can reset staging database without losing real data
- 👥 **Access**: Different team members can access different environments
- 📊 **Analytics**: Separate metrics for real vs test usage
- 💰 **Billing**: Track costs separately

## Step 1: Create Two Supabase Projects

### A. Create Staging Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Configure:
   - **Name**: `ai-readiness-staging` (or similar)
   - **Database Password**: Generate a strong one (save it!)
   - **Region**: Same as production for consistency
   - **Plan**: Free tier is fine for staging
4. Click "Create Project"
5. Save these values:
   ```
   STAGING_PROJECT_ID = [project-ref from URL]
   STAGING_DATABASE_PASSWORD = [the password you set]
   ```

### B. Create Production Project
1. Click "New Project" again
2. Configure:
   - **Name**: `ai-readiness-production` (or similar)
   - **Database Password**: Different strong password (save it!)
   - **Region**: Choose closest to your users
   - **Plan**: Free to start, upgrade as needed
3. Click "Create Project"
4. Save these values:
   ```
   PRODUCTION_PROJECT_ID = [project-ref from URL]
   PRODUCTION_DATABASE_PASSWORD = [the password you set]
   ```

## Step 2: Get Your Access Token

This token is for your Supabase account (same for all projects):

1. Go to [Supabase Account](https://app.supabase.com/account/tokens)
2. Click "Generate New Token"
3. Name it: "GitHub Actions CI/CD"
4. Copy the token (you won't see it again!)
5. Save as:
   ```
   SUPABASE_ACCESS_TOKEN = [your-token]
   ```

## Step 3: Apply Database Schema

### For Staging:
```bash
# Use Supabase CLI or Dashboard SQL Editor
# Run FIX_EXISTING_DATABASE.sql first
# Then run all migration files in order
```

### For Production:
```bash
# Same process, but be extra careful!
# Consider taking a backup first
```

## Step 4: Configure Each Project

### In Staging Project (Supabase Dashboard):
1. Go to Settings → API
2. Copy:
   - `URL`: Save as `NEXT_PUBLIC_SUPABASE_URL` (staging)
   - `anon public`: Save as `NEXT_PUBLIC_SUPABASE_ANON_KEY` (staging)
   - `service_role`: Save as `SUPABASE_SERVICE_KEY` (staging)

### In Production Project (Supabase Dashboard):
1. Go to Settings → API  
2. Copy:
   - `URL`: Save as `NEXT_PUBLIC_SUPABASE_URL` (production)
   - `anon public`: Save as `NEXT_PUBLIC_SUPABASE_ANON_KEY` (production)
   - `service_role`: Save as `SUPABASE_SERVICE_KEY` (production)

## Step 5: GitHub Secrets Summary

Add to GitHub Secrets (Settings → Secrets and variables → Actions):

```bash
# Vercel
VERCEL_TOKEN=xxx

# Supabase Account (same for both environments)
SUPABASE_ACCESS_TOKEN=xxx

# Staging Environment
STAGING_PROJECT_ID=abc123def
SUPABASE_DB_PASSWORD=staging_password_here

# Production Environment  
PRODUCTION_PROJECT_ID=xyz789ghi
# Production uses the same SUPABASE_DB_PASSWORD secret name
# but GitHub Actions will use PRODUCTION_PROJECT_ID to connect
```

## Step 6: Vercel Environment Variables

### In Vercel Staging Project:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://abc123def.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ_staging_anon_key
SUPABASE_SERVICE_KEY=eyJ_staging_service_key
NEXT_PUBLIC_ENVIRONMENT=staging
```

### In Vercel Production Project:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xyz789ghi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ_production_anon_key
SUPABASE_SERVICE_KEY=eyJ_production_service_key
NEXT_PUBLIC_ENVIRONMENT=production
```

## Security Checklist

✅ **Different passwords** for staging and production databases
✅ **Different API keys** for each environment
✅ **Row Level Security (RLS)** enabled in both projects
✅ **Backups enabled** for production (automatic in Supabase)
✅ **Email templates** configured separately
✅ **Auth settings** configured appropriately (stricter in production)

## Common Mistakes to Avoid

❌ **DON'T** use production database for testing
❌ **DON'T** share service keys in client code
❌ **DON'T** commit any keys to Git
❌ **DON'T** use same passwords across environments
❌ **DON'T** give staging same permissions as production

## Testing Your Setup

### Test Staging Connection:
```bash
# Set your staging environment variables
export NEXT_PUBLIC_SUPABASE_URL=your_staging_url
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your_staging_anon_key

# Run the app
npm run dev

# Should connect to staging database
```

### Verify Separation:
1. Create test data in staging
2. Verify it doesn't appear in production
3. Confirm different project IDs in Supabase dashboard

## Migration Commands

### Apply to Staging:
```bash
supabase link --project-ref your-staging-project-id
supabase db push
```

### Apply to Production (careful!):
```bash
supabase link --project-ref your-production-project-id
supabase db push --dry-run  # Preview first!
supabase db push           # Actually apply
```

## Environment Variable Reference

| Variable | Staging | Production | Where Used |
|----------|---------|------------|------------|
| PROJECT_ID | abc123 | xyz789 | GitHub Actions |
| DB_PASSWORD | staging_pass | prod_pass | GitHub Actions |
| SUPABASE_URL | staging.supabase.co | prod.supabase.co | Vercel, App |
| ANON_KEY | staging_anon | prod_anon | Vercel, App |
| SERVICE_KEY | staging_service | prod_service | Vercel, API |

## Quick Verification

Run this to verify your setup:
```bash
echo "Staging Project: $STAGING_PROJECT_ID"
echo "Production Project: $PRODUCTION_PROJECT_ID"
echo "Are they different? (Should be YES)"
[ "$STAGING_PROJECT_ID" != "$PRODUCTION_PROJECT_ID" ] && echo "YES ✅" || echo "NO ❌"
```

Remember: **Separate environments save you from disasters!**