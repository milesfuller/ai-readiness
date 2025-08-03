---
name: supabase-validate
description: Supabase configuration and API validation
command: npx claude-flow deployment supabase-validate
category: deployment
agents: 5
parallel: true
mcp_tools: ["supabase", "claude-flow"]
---

# Supabase Validation

Comprehensive Supabase project validation and troubleshooting.

## Overview

Validates all Supabase components:
- Database schema and migrations
- Row Level Security (RLS)
- Authentication configuration
- Storage buckets
- Edge Functions
- Realtime subscriptions

## Command

```bash
npx claude-flow deployment supabase-validate [options]

Options:
  --project-ref <ref>   Supabase project reference
  --local              Test local Supabase
  --fix                Auto-fix issues
```

## Validation Areas

### 1. Database Schema
- Table structure validation
- Foreign key constraints
- Index optimization
- Migration status

### 2. Row Level Security
- RLS enabled on all tables
- Policy coverage
- Policy effectiveness
- No security bypasses

### 3. Authentication
- Auth providers configured
- Email templates
- Redirect URLs
- JWT settings

### 4. Storage
- Bucket configuration
- Access policies
- File upload limits
- CDN configuration

### 5. Edge Functions
- Function deployment
- Environment variables
- CORS settings
- Performance metrics

## Agents

1. **Schema Validator** - Database structure
2. **Security Auditor** - RLS and policies
3. **Auth Tester** - Authentication flows
4. **Storage Validator** - Bucket configuration
5. **API Tester** - Endpoint validation

## Common Issues Fixed

- Missing RLS policies
- Incorrect anon key usage
- CORS misconfiguration
- Exposed admin routes
- Unoptimized queries

## Output

- `supabase-audit.md`
- `security-report.md`
- `rls-policies.sql`
- `optimization-queries.sql`