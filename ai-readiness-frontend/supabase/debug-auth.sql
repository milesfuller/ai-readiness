-- Check if auth schema exists and is accessible
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'auth';

-- Check if auth.users table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'auth' AND table_name = 'users';

-- Check for any constraints on auth.users that might block inserts
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'auth' 
    AND tc.table_name = 'users'
    AND tc.constraint_type IN ('FOREIGN KEY', 'CHECK');

-- Check if there are any database-level triggers that might interfere
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'auth' 
    AND event_object_table = 'users';

-- Check the current database settings
SELECT current_database(), current_user, session_user;

-- Check if RLS is enabled on auth.users (it should NOT be)
SELECT 
    schemaname,
    tablename,
    tablespace,
    hasrules,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'auth' AND tablename = 'users';

-- Check if there are any active RLS policies on auth.users
SELECT * FROM pg_policies 
WHERE schemaname = 'auth' AND tablename = 'users';

-- Check auth configuration
SELECT * FROM auth.config LIMIT 1;