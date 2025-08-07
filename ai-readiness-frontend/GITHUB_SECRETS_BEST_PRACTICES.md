# GitHub Secrets - Best Practices for Multiple Environments

## Two Approaches for Managing Environment Secrets

### Option 1: Repository Secrets with Different Names (Simple)
**What we're using in this guide**

```
Repository Secrets:
├── VERCEL_TOKEN (shared)
├── SUPABASE_ACCESS_TOKEN (shared)
├── STAGING_PROJECT_ID
├── STAGING_DB_PASSWORD
├── PRODUCTION_PROJECT_ID
└── PRODUCTION_DB_PASSWORD
```

**Pros:**
- Simple to set up
- All secrets in one place
- Clear naming shows which is which

**Cons:**
- All secrets visible to all workflows
- Must use different variable names

### Option 2: Environment Secrets (More Secure)
**GitHub's recommended approach for production**

```
Repository Secrets:
├── VERCEL_TOKEN
└── SUPABASE_ACCESS_TOKEN

Environment: staging
├── PROJECT_ID
└── DB_PASSWORD

Environment: production
├── PROJECT_ID
└── DB_PASSWORD
```

**Pros:**
- Secrets only available to specific environments
- Can use same variable names
- Required reviewers for production
- Better audit trail

**Cons:**
- More complex setup
- Must specify environment in workflow

## How to Use Environment Secrets (If You Prefer)

### Step 1: Create Environments
1. Go to Settings → Environments
2. Create `staging` environment
3. Create `production` environment (add required reviewers!)

### Step 2: Add Environment-Specific Secrets
Click on each environment and add:
- `SUPABASE_PROJECT_ID` (different value per environment)
- `SUPABASE_DB_PASSWORD` (different value per environment)

### Step 3: Update Workflow to Use Environment
```yaml
deploy-staging:
  environment: staging  # This line makes env secrets available
  env:
    PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}  # Same name!
    DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}  # Same name!

deploy-production:
  environment: production  # Different environment
  env:
    PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}  # Same name!
    DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}  # Same name!
```

## Current Setup (Repository Secrets)

For simplicity, our guide uses repository secrets with different names:

| Secret Name | Value | Used In |
|------------|-------|---------|
| STAGING_PROJECT_ID | abc123... | Staging deployment |
| STAGING_DB_PASSWORD | staging_pass_123 | Staging migrations |
| PRODUCTION_PROJECT_ID | xyz789... | Production deployment |
| PRODUCTION_DB_PASSWORD | prod_pass_456 | Production migrations |

## Security Comparison

| Aspect | Repository Secrets | Environment Secrets |
|--------|-------------------|-------------------|
| Setup Complexity | ⭐ Simple | ⭐⭐ Moderate |
| Security | ⭐⭐ Good | ⭐⭐⭐ Better |
| Access Control | All or nothing | Per environment |
| Required Reviewers | No | Yes (production) |
| Audit Trail | Basic | Detailed |
| Variable Names | Must differ | Can be same |

## Recommendation

**For Getting Started:** Use repository secrets with different names (what our guide shows)
**For Production Apps:** Migrate to environment secrets for better security

## Migration Path

Start with repository secrets, then migrate later:

1. Get everything working with repository secrets
2. Create environments in GitHub
3. Move secrets to environments
4. Update workflows to specify environment
5. Add required reviewers for production

## Example: Full Secret List for This Project

### Repository Secrets (Available to all workflows):
```
VERCEL_TOKEN=xxx
SUPABASE_ACCESS_TOKEN=xxx
```

### Option A: Additional Repository Secrets (Simple):
```
STAGING_PROJECT_ID=abc123
STAGING_DB_PASSWORD=staging_pass
PRODUCTION_PROJECT_ID=xyz789  
PRODUCTION_DB_PASSWORD=prod_pass
```

### Option B: Environment Secrets (More Secure):
```
staging environment:
  SUPABASE_PROJECT_ID=abc123
  SUPABASE_DB_PASSWORD=staging_pass
  
production environment:
  SUPABASE_PROJECT_ID=xyz789
  SUPABASE_DB_PASSWORD=prod_pass
```

Both approaches work! Choose based on your security needs.