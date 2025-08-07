# 🎯 GitHub Actions - First Run Setup

## Why Status Checks Don't Appear Initially

GitHub branch protection status checks only become available **after** the workflows have run at least once. This is normal GitHub behavior.

## Quick Setup Process

### Step 1: Initial Branch Protection
1. Go to Settings → Branches
2. Add protection rule for `main`
3. Enable "Require status checks to pass"
4. **Skip selecting specific checks** (they won't be there yet)
5. Save the rule

### Step 2: Trigger the Workflows
Create a test PR to make the workflows run:

```bash
# Create test branch
git checkout -b test/trigger-workflows

# Make a small change
echo "<!-- Test PR to trigger workflows -->" >> README.md
git add README.md
git commit -m "test: Trigger GitHub Actions workflows"
git push -u origin test/trigger-workflows
```

### Step 3: Create Pull Request
1. Go to GitHub
2. Create PR from `test/trigger-workflows` to `develop`
3. Watch the "Checks" tab in the PR
4. You'll see these workflows running:
   - `Security Check`
   - `Test Suite`
   - `Test Database Migrations`

### Step 4: Add Status Checks
After workflows complete:
1. Go back to Settings → Branches
2. Edit the `main` branch protection rule
3. Now you'll see the checks available:
   - `test-suite`
   - `test-migrations`
4. Select both checks
5. Save changes

### Step 5: Update develop Branch Protection
Repeat for the `develop` branch protection rule.

## Common Issues

### "No status checks found"
**Solution**: The workflows haven't run yet. Create a PR to trigger them.

### Workflows not running on PR
**Check**:
- Workflows are in `.github/workflows/` directory
- Files are named correctly (`.yml` extension)
- GitHub Actions is enabled in repository settings

### Workflows failing
**Check**:
- Required secrets are set (VERCEL_TOKEN, etc.)
- Package.json has required scripts (test, lint, build)
- Database migrations are valid SQL

## Verification

After setup, test that protection works:

```bash
# This should FAIL (direct push to main blocked)
git checkout main
echo "test" > test.txt
git add test.txt
git commit -m "Test direct push"
git push  # ❌ Rejected

# This should WORK (PR workflow)
git checkout -b feature/test
echo "test" > test.txt
git add test.txt
git commit -m "Test feature"
git push -u origin feature/test
# Create PR on GitHub - workflows will run automatically
```

## Status Check Names

Once workflows have run, these checks will be available:

| Workflow File | Status Check Name |
|--------------|------------------|
| deployment-protection.yml | `test-suite` |
| deployment-protection.yml | `test-migrations` |
| database-protection.yml | `test-migrations` |

## Tips

1. **First PR is Special**: Use it to verify workflows are working
2. **Check Logs**: Click on failing checks to see detailed logs
3. **Secrets**: Most failures are due to missing secrets
4. **Be Patient**: First workflow run may take a few minutes

## Next Steps

After status checks are configured:
1. Delete the test branch: `git branch -d test/trigger-workflows`
2. Configure Vercel staging environment
3. Add all required secrets
4. Start using the protected workflow!

---

Remember: This is a one-time setup. Once the workflows have run once, the status checks will always be available in branch protection settings.