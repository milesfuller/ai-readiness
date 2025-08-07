# GitHub Rulesets vs Branch Protection

GitHub now offers two ways to protect your branches:

## 🆕 Rulesets (New - Recommended for Organizations)
- **Location**: Settings → Rules → Rulesets
- **Benefits**: More flexible, can apply to multiple branches/repos
- **Best for**: Organizations with multiple repositories

## 🔒 Branch Protection Rules (Classic - Still Works!)
- **Location**: Settings → Branches
- **Benefits**: Simpler, well-documented, proven
- **Best for**: Single repositories, simpler needs

## Which Should You Use?

### Use Branch Protection Rules (Classic) if:
- ✅ You have a single repository
- ✅ You want a simpler setup
- ✅ You're following existing documentation
- ✅ You need something that works immediately

### Use Rulesets if:
- ✅ You manage multiple repositories
- ✅ You need complex rule patterns
- ✅ You want to standardize across an organization
- ✅ You need tag protection

## Quick Setup with Branch Protection (Recommended for This Project)

Since we have a single repository, **Branch Protection Rules** are simpler:

1. Go to **Settings** → **Branches**
2. Add rule for `main` branch
3. Configure protection settings
4. Save

This is what our documentation covers and it works perfectly for single-repo projects.

## If You Want to Use Rulesets Instead

Here's the equivalent setup using Rulesets:

### Create a Ruleset for `main`:
1. Go to **Settings** → **Rules** → **Rulesets**
2. Click **New ruleset** → **New branch ruleset**
3. Configure:
   - **Name**: "Main Branch Protection"
   - **Enforcement status**: Active
   - **Target branches**: Add → Include by pattern → `main`
   
4. Under **Rules**, enable:
   - ✅ Restrict deletions
   - ✅ Restrict force pushes
   - ✅ Require a pull request before merging
     - Required approvals: 1
     - Dismiss stale pull request approvals
   - ✅ Require status checks to pass
     - Add checks after first workflow run
   - ✅ Block force pushes
   
5. Under **Bypass list**:
   - Consider if you need any bypass for emergencies
   - Generally leave empty for maximum protection

6. Click **Create**

### Create a Ruleset for `develop`:
Similar process but with relaxed rules for the develop branch.

## Comparison Table

| Feature | Branch Protection | Rulesets |
|---------|------------------|----------|
| Setup Complexity | Simple | More Complex |
| UI Location | Settings → Branches | Settings → Rules → Rulesets |
| Multiple Branches | One rule per branch | One rule for many branches |
| Multiple Repos | No | Yes (Organization level) |
| Bypass Options | Admins can bypass | Granular bypass list |
| Status Checks | Yes | Yes |
| PR Requirements | Yes | Yes |
| Enforcement | Immediate | Can be set to evaluate/active |
| Documentation | Extensive | Newer, less documented |

## Recommendation

**For this AI Readiness project**: Use **Branch Protection Rules** (classic)
- Simpler to set up
- Well-tested
- Our documentation already covers it
- Does everything we need

You can always migrate to Rulesets later if needed. Both systems work and can even work together!

## The Settings You Need (Either System)

Regardless of which system you use, enable these protections for `main`:
1. Require pull requests
2. Require 1 approval
3. Dismiss stale reviews
4. Require status checks (after first run)
5. Prevent force pushes
6. Prevent deletions
7. Include administrators in restrictions

These settings ensure no untested code reaches production!