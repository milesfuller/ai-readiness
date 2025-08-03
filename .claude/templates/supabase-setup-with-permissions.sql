-- COMPLETE Supabase Setup Script with Permissions
-- This prevents ALL the permission issues we encountered

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- CRITICAL: Grant permissions IMMEDIATELY after table creation
GRANT ALL ON public.profiles TO postgres;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create trigger function with proper error handling
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastName', '')
  )
  ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate key errors
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE LOG 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION create_profile_on_signup();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access" 
  ON public.profiles 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Verify setup
DO $$
BEGIN
  -- Check if postgres has INSERT permission
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public' 
      AND table_name = 'profiles'
      AND grantee = 'postgres'
      AND privilege_type = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'SETUP ERROR: postgres user lacks INSERT permission on profiles table';
  END IF;
  
  RAISE NOTICE 'Setup completed successfully with all permissions!';
END$$;