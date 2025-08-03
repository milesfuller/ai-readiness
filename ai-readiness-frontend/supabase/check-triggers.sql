-- Check if the profile creation trigger exists
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass;

-- Check if the trigger function exists
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc
WHERE proname = 'create_profile_on_signup';

-- Check for any failed user entries
SELECT 
    id, 
    email, 
    created_at,
    raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Check if there are any profiles
SELECT COUNT(*) as profile_count FROM public.profiles;

-- Check RLS policies on profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles';