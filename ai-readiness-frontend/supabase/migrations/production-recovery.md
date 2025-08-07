# Production Recovery Procedures

## 🚨 Emergency Recovery Steps

### Scenario 1: Migration Failed Mid-Application

1. **DON'T PANIC** - Supabase uses transactions, partial changes should be rolled back

2. **Check Current State**
```sql
-- Check what migrations are recorded
SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 10;

-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check for locks
SELECT pid, usename, application_name, client_addr, query_start, state, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;
```

3. **Apply Rollback**
```sql
-- Use the corresponding rollback script from rollback/ directory
-- Example: rollback/20240807_143022_add_feature_rollback.sql
```

4. **Verify Application Health**
- Check application logs
- Test critical user flows
- Monitor error rates

### Scenario 2: Data Corruption After Migration

1. **Stop Write Operations** (if possible)
```sql
-- Revoke write permissions temporarily
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM authenticated;
```

2. **Restore from Backup**
```sql
-- If backup tables exist
INSERT INTO organizations SELECT * FROM backup_20240807_organizations
ON CONFLICT (id) DO NOTHING;
```

3. **Re-enable Write Operations**
```sql
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
```

### Scenario 3: Complete Database Recovery

1. **Use Supabase Point-in-Time Recovery**
- Dashboard > Settings > Backups > Point-in-time Recovery
- Select time before migration
- Restore to new database
- Switch application to new database

2. **Manual Recovery from Backup**
```sql
-- If you created manual backups
-- Restore tables from backup_* tables
```

## Preventive Measures

### Before Every Migration

1. **Create Manual Backup**
```sql
-- Full schema backup
CREATE TABLE backup_$(date +%Y%m%d)_organizations AS SELECT * FROM organizations;
CREATE TABLE backup_$(date +%Y%m%d)_survey_sessions AS SELECT * FROM survey_sessions;
-- Continue for all critical tables
```

2. **Test in Staging**
- Apply to staging environment first
- Run full test suite
- Monitor for 24 hours

3. **Schedule During Low Traffic**
- Check analytics for lowest traffic period
- Notify users of maintenance window
- Have on-call engineer ready

### Migration Safety Checklist

- [ ] Backup created and verified
- [ ] Migration tested in development
- [ ] Migration tested in staging
- [ ] Rollback script prepared and tested
- [ ] Health checks prepared
- [ ] Team notified
- [ ] Monitoring alerts configured
- [ ] Application feature flags ready (if needed)

## Recovery Contacts

- **Supabase Support**: support.supabase.com
- **Database Admin**: [Your DBA contact]
- **Engineering Lead**: [Your lead contact]
- **On-Call**: [Your on-call rotation]

## Post-Incident Procedures

1. **Document What Happened**
   - Timeline of events
   - Root cause
   - Impact assessment
   - Recovery steps taken

2. **Update Procedures**
   - Add new scenarios to this document
   - Update migration scripts
   - Improve health checks

3. **Team Retrospective**
   - What went well
   - What could be improved
   - Action items

## Useful Queries for Diagnostics

### Check Table Sizes
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Index Health
```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Find Slow Queries
```sql
SELECT 
    query,
    calls,
    total_time,
    mean,
    max_time,
    min_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### Check Connection Count
```sql
SELECT 
    state,
    COUNT(*)
FROM pg_stat_activity
GROUP BY state;
```