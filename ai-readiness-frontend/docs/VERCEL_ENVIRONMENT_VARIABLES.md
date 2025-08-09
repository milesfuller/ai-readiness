# Vercel Environment Variables Complete Setup

## Required Variables by Environment

### 🔶 Preview Environment (Vercel Preview Deployments)

These variables MUST be set in Vercel's **Preview** environment settings:

```bash
# ===== STAGING DATABASE (Required) =====
STAGING_NEXT_PUBLIC_SUPABASE_URL=https://kxzhuxhakwflvgjpikqp.supabase.co
STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
STAGING_SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key

# ⚠️ MISSING - Add this to fix "not configured" warning:
STAGING_DATABASE_URL=postgresql://postgres.kxzhuxhakwflvgjpikqp:your-password@aws-0-us-west-1.pooler.supabase.com:5432/postgres

# ===== SECURITY (Required) =====
# ⚠️ MISSING - Add this to protect migrations API:
MIGRATION_ADMIN_TOKEN=generate-a-secure-random-token-here

# ===== OPTIONAL BUT RECOMMENDED =====
NEXT_PUBLIC_ENABLE_DEBUG=false
REQUIRE_MIGRATION_TESTS=true
BLOCK_DIRECT_PRODUCTION=true
```

### 🔴 Production Environment

These variables MUST be set in Vercel's **Production** environment settings:

```bash
# ===== PRODUCTION DATABASE (Required) =====
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
DATABASE_URL=postgresql://postgres.your-production-project:password@aws-0-region.pooler.supabase.com:5432/postgres

# ===== SECURITY (Required) =====
MIGRATION_ADMIN_TOKEN=different-secure-token-for-production
NEXTAUTH_SECRET=your-nextauth-secret
CSRF_SECRET=your-csrf-secret

# ===== ENVIRONMENT FLAGS =====
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_ENABLE_DEBUG=false
```

## How to Add Missing Variables

### 1. Get Your Staging Database URL

1. Go to your Supabase staging project (kxzhuxhakwflvgjpikqp)
2. Navigate to Settings → Database
3. Copy the "Connection string" (URI format)
4. It should look like: `postgresql://postgres.kxzhuxhakwflvgjpikqp:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres`

### 2. Generate MIGRATION_ADMIN_TOKEN

```bash
# Generate a secure random token (run locally)
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Add to Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable:
   - Name: `STAGING_DATABASE_URL`
   - Value: Your database connection string
   - Environment: Select **Preview** only
   - Click "Save"

4. Add MIGRATION_ADMIN_TOKEN:
   - Name: `MIGRATION_ADMIN_TOKEN`
   - Value: Your generated token
   - Environment: Select **Preview** and **Production**
   - Click "Save"

### 4. Trigger Redeployment

After adding variables:
1. Go to Deployments tab
2. Find your latest preview deployment
3. Click the three dots menu → "Redeploy"
4. Wait for deployment to complete

## Verification

After redeployment, verify configuration:

```bash
# Visit your preview URL
https://your-preview-url.vercel.app/api/debug/env

# Expected result:
{
  "environment": {
    "name": "Staging",  # ✅ Should now show "Staging"
    "isStaging": true,
    "isPreview": true
  },
  "supabase": {
    "activeConfig": {
      "databaseUrl": "configured"  # ✅ Should now show "configured"
    }
  },
  "warnings": []  # ✅ Should be empty
}
```

## Security Notes

### Migration Admin Token
- **Purpose**: Protects the `/api/migrations` endpoint from unauthorized access
- **Usage**: Required header for migration API calls: `Authorization: Bearer YOUR_TOKEN`
- **Important**: Use different tokens for preview and production

### Database URL Security
- **Never commit** database URLs to your repository
- **Always use** environment variables
- **Rotate passwords** regularly
- **Use connection pooling** for better performance

## Troubleshooting

### Still showing "Unknown" environment?
- Vercel automatically sets `VERCEL_ENV=preview` for preview deployments
- Our code now treats all preview deployments as staging
- No need to set `NEXT_PUBLIC_ENVIRONMENT` manually

### Database connection errors?
1. Check if Supabase project is active (not paused)
2. Verify password in connection string is correct
3. Ensure connection pooler is enabled in Supabase
4. Check if IP is whitelisted (if using IP restrictions)

### Migration token not working?
- Ensure the token matches exactly (no extra spaces)
- Token must be set in both preview and production environments
- Use the header: `Authorization: Bearer YOUR_TOKEN`

## Current Status (Based on Your Output)

✅ **Working**:
- Staging Supabase URL configured
- Staging Anon Key configured
- Staging Service Key configured
- Preview detection working

⚠️ **Needs Attention**:
1. Add `STAGING_DATABASE_URL` for direct database access
2. Add `MIGRATION_ADMIN_TOKEN` for security

## Next Steps

1. Add the two missing environment variables to Vercel
2. Redeploy your preview branch
3. Verify all warnings are resolved at `/api/debug/env`
4. Run the migration to secure your schema_migrations table:
   ```bash
   curl -X POST https://your-preview-url.vercel.app/api/migrations \
     -H "Authorization: Bearer YOUR_MIGRATION_ADMIN_TOKEN"
   ```

---

**Last Updated**: January 2025
**Priority**: HIGH - Add missing variables to complete setup