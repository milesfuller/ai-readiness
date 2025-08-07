-- Create onboarding_progress table for tracking user onboarding status
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step integer DEFAULT 0,
  completed_steps text[] DEFAULT '{}',
  data jsonb DEFAULT '{}',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Create user_profiles table if it doesn't exist (may already exist)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  avatar text,
  department text,
  job_title text,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Create organizations table if it doesn't exist (may already exist)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text NOT NULL UNIQUE,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create organization_members table for managing organization memberships
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  role text DEFAULT 'user',
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, organization_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_onboarding_progress_updated_at ON onboarding_progress;
CREATE TRIGGER update_onboarding_progress_updated_at 
  BEFORE UPDATE ON onboarding_progress 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at 
  BEFORE UPDATE ON organization_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding_progress
DROP POLICY IF EXISTS "Users can view their own onboarding progress" ON onboarding_progress;
CREATE POLICY "Users can view their own onboarding progress" 
  ON onboarding_progress FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own onboarding progress" ON onboarding_progress;
CREATE POLICY "Users can update their own onboarding progress" 
  ON onboarding_progress FOR ALL 
  USING (auth.uid() = user_id);

-- RLS Policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" 
  ON user_profiles FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" 
  ON user_profiles FOR ALL 
  USING (auth.uid() = user_id);

-- RLS Policies for organizations
DROP POLICY IF EXISTS "Users can view organizations they can join" ON organizations;
CREATE POLICY "Users can view organizations they can join" 
  ON organizations FOR SELECT 
  USING ((settings->>'allowSelfRegistration')::boolean = true);

DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create organizations" 
  ON organizations FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for organization_members
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
CREATE POLICY "Users can view their own memberships" 
  ON organization_members FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own memberships" ON organization_members;
CREATE POLICY "Users can manage their own memberships" 
  ON organization_members FOR ALL 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Org admins can view organization members" ON organization_members;
CREATE POLICY "Org admins can view organization members" 
  ON organization_members FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.user_id = auth.uid() 
      AND om.organization_id = organization_members.organization_id 
      AND om.role IN ('org_admin', 'system_admin')
    )
  );