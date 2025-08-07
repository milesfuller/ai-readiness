# 🚀 Setup Deployment Protection - Action Required

This guide walks you through activating the deployment protection system that has been created in code.

## 📋 Quick Setup Checklist

### 1️⃣ GitHub Repository Settings (5 minutes)

> **Note**: GitHub now offers two protection methods:
> - **Branch Protection Rules** (Settings → Branches) - Classic, simpler
> - **Rulesets** (Settings → Rules → Rulesets) - Newer, more flexible
> 
> This guide uses **Branch Protection Rules** for simplicity. Both work fine!
> See `GITHUB_RULESETS_VS_BRANCH_PROTECTION.md` for comparison.

#### A. Enable Branch Protection for `main`
1. Go to your repository on GitHub
2. Navigate to **Settings** → **Branches**
3. Click **Add rule** next to "Branch protection rules"
4. Enter `main` as the branch name pattern
5. Under **Protect matching branches**, check these options:
   
   **Pull Request Settings:**
   - ✅ **Require a pull request before merging**
     - ✅ Require approvals: Set to `1`
     - ✅ Dismiss stale pull request approvals when new commits are pushed
     - ⬜ Require review from Code Owners (skip unless you have CODEOWNERS file)
     - ⬜ Require approval of the most recent reviewable push (optional)
   
   **Status Checks:**
   - ✅ **Require status checks to pass before merging**
     - Click "Search for status checks" (won't find any yet - that's OK!)
     - After first PR runs, come back and add: `test-suite` and `test-migrations`
   
   **Other Protection:**
   - ✅ **Require conversation resolution before merging**
   - ⬜ Require signed commits (optional)
   - ⬜ Require linear history (optional)
   - ⬜ Require deployments to succeed (skip for now)
   - ⬜ Lock branch (NO - keep unchecked)
   
   **Admin Settings:**
   - ✅ **Do not allow bypassing the above settings** (Important!)
   
   **Rules applied to everyone including administrators:**
   - ⬜ Allow force pushes (NO - keep unchecked)
   - ⬜ Allow deletions (NO - keep unchecked)

6. Click **Create** to save the rule

#### B. Enable Branch Protection for `develop`
1. Click **Add rule** again
2. Enter `develop` as the branch name pattern
3. Under **Protect matching branches**, check:
   - ✅ **Require a pull request before merging**
     - ⬜ Require approvals (optional for develop)
   - ✅ **Require status checks to pass before merging**
     - Search won't find any yet - add after first PR runs
   - ⬜ **Do not allow bypassing** (optional for develop)
4. Click **Create**

### 2️⃣ GitHub Repository Secrets (3 minutes)

Go to **Settings** → **Secrets and variables** → **Actions**

Add these repository secrets:

#### Vercel (same for all environments):
```bash
VERCEL_TOKEN               # Get from: https://vercel.com/account/tokens
```

#### Supabase (IMPORTANT: Use separate projects for safety!):

**Account-Level Secret (same for all projects):**
```bash
SUPABASE_ACCESS_TOKEN      # Your Supabase account access token
```

**Production Supabase Project:**
```bash
PRODUCTION_PROJECT_ID      # Your production Supabase project ID
PRODUCTION_DB_PASSWORD     # Your production database password (DIFFERENT!)
```

**Staging Supabase Project:**
```bash
STAGING_PROJECT_ID         # Your staging Supabase project ID  
STAGING_DB_PASSWORD        # Your staging database password (DIFFERENT!)
```

> **💡 Best Practice**: Create TWO separate Supabase projects:
> 1. `ai-readiness-staging` - For testing
> 2. `ai-readiness-production` - For real users
> 
> This prevents staging tests from affecting production data!

### 3️⃣ Create GitHub Environments (2 minutes)

Go to **Settings** → **Environments**

#### Create "staging" environment:
1. Click **New environment**
2. Name: `staging`
3. No required reviewers
4. Click **Save protection rules**

#### Create "production" environment:
1. Click **New environment**
2. Name: `production`
3. Configure:
   - ✅ **Required reviewers**: Add yourself
   - ✅ **Deployment branches**: Only from `main`
4. Click **Save protection rules**

### 4️⃣ Create Git Branches (2 minutes)

**Do this BEFORE Vercel setup since Vercel needs the branches!**

```bash
# Create develop branch if it doesn't exist
git checkout -b develop
git push -u origin develop

# Switch back to main
git checkout main
```

### 5️⃣ Vercel Setup (10 minutes)

#### A. Create Staging Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Project Name**: `ai-readiness-staging`
   - **Framework Preset**: Next.js
   - **Root Directory**: `ai-readiness-frontend`
5. Add Environment Variables (copy from `.env.staging`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-staging-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
   SUPABASE_SERVICE_KEY=your-staging-service-key
   NEXT_PUBLIC_ENVIRONMENT=staging
   ```
6. Deploy

#### B. Configure Production Project
1. Go to your production Vercel project
2. Navigate to **Settings** → **Git**
3. Configure:
   - **Production Branch**: `main`
   - **Ignored Build Step**: Enable for other branches
4. Go to **Settings** → **Environment Variables**
5. Ensure production variables are set (different from staging!)

### 6️⃣ Trigger GitHub Actions (2 minutes)

Since the status checks won't appear until workflows have run, let's trigger them:

#### Option A: Create a Test PR (Recommended)
```bash
# Create a test branch
git checkout -b test/deployment-protection
echo "# Test" >> README.md
git add README.md
git commit -m "Test: Trigger GitHub Actions workflows"
git push -u origin test/deployment-protection

# Go to GitHub and create a PR to develop branch
# Watch the workflows run in the PR's "Checks" tab
# After they complete, the status checks will be available in branch protection
```

#### Option B: Push to develop (if allowed)
```bash
git checkout develop
git push origin develop
# This will trigger the workflows
```

After the workflows run once, go back to Settings → Branches → Edit main branch rule and add the status checks that now appear.

### 7️⃣ Test the Protection System (5 minutes)

#### Test 1: Verify Branch Protection
```bash
# This should FAIL
git checkout main
echo "test" > test.txt
git add test.txt
git commit -m "Test direct push"
git push  # ❌ Should be rejected
```

#### Test 2: Verify Local Protection
```bash
# This should FAIL without tests
./scripts/enforce-testing.sh production
# ❌ Should show errors about missing test results
```

#### Test 3: Run Tests First
```bash
# Run tests and save results
npm test
./scripts/enforce-testing.sh test

# Now check again
./scripts/enforce-testing.sh staging
# ✅ Should pass for staging
```

#### Test 4: Test PR Workflow
```bash
# Create feature branch
git checkout -b feature/test-protection
echo "// Test" >> src/app/page.tsx
git add .
git commit -m "Test protection"
git push -u origin feature/test-protection

# Go to GitHub and create PR to develop
# Watch the automated checks run
```

## 🔄 Deployment Workflow After Setup

### Deploy to Staging:
```bash
git checkout develop
git merge feature/your-feature
git push
# Automatically deploys to staging
```

### Deploy to Production:
```bash
# After staging is tested
git checkout main
git merge develop
git push
# Requires approval in GitHub
```

## 🔧 Troubleshooting

### Issue: "Branch protection not working"
**Solution**: Make sure "Include administrators" is checked

### Issue: "Vercel not deploying"
**Solution**: Check Vercel token in GitHub secrets

### Issue: "Tests failing in CI"
**Solution**: Ensure all dependencies are in package.json

### Issue: "Can't push to main"
**Solution**: This is intentional! Use PRs instead

## 📝 Environment Variables Reference

### Required in GitHub Secrets:
- `VERCEL_TOKEN` - For deployment
- `SUPABASE_ACCESS_TOKEN` - For Supabase CLI
- `SUPABASE_DB_PASSWORD` - For migrations
- `STAGING_PROJECT_ID` - Staging Supabase project
- `PRODUCTION_PROJECT_ID` - Production Supabase project

### Required in Vercel (Staging):
- `NEXT_PUBLIC_SUPABASE_URL` - Staging URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Staging anon key
- `SUPABASE_SERVICE_KEY` - Staging service key
- `NEXT_PUBLIC_ENVIRONMENT=staging`

### Required in Vercel (Production):
- `NEXT_PUBLIC_SUPABASE_URL` - Production URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Production anon key
- `SUPABASE_SERVICE_KEY` - Production service key
- `NEXT_PUBLIC_ENVIRONMENT=production`

## ✅ Verification Checklist

After setup, verify:
- [ ] Cannot push directly to main branch
- [ ] PRs require passing tests
- [ ] Staging deploys automatically from develop
- [ ] Production requires manual approval
- [ ] Local enforce-testing.sh script works
- [ ] GitHub Actions run on PRs
- [ ] Vercel has separate staging/production projects

## 🎉 Success!

Once everything is configured:
1. All code must pass tests before merging
2. Staging gets automatic deployments
3. Production requires approval
4. Database migrations are tested
5. No accidental production breaks!

## 🔗 Useful Links

- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [GitHub Actions Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Supabase CLI](https://supabase.com/docs/guides/cli)