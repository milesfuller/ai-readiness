-- Fix the permission issue for the trigger
-- The trigger runs in the context of the postgres user, which needs permissions

-- First, drop the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Grant necessary permissions to the postgres user for the profiles table
GRANT ALL ON public.profiles TO postgres;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Recreate the trigger function with SECURITY DEFINER
-- This ensures it runs with the permissions of the function owner (postgres)
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert the profile
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastName', '')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN duplicate_key THEN
    -- If profile already exists, just return
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE LOG 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION create_profile_on_signup();

-- Also ensure the authenticated role has proper permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify permissions
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY grantee, privilege_type;