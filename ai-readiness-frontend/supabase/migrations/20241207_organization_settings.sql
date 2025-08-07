-- Organization Settings Migration
-- Extends organizations table with additional fields and creates related tables

-- Add new columns to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry VARCHAR(50);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS size VARCHAR(20);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Create organization API keys table
CREATE TABLE IF NOT EXISTS organization_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of the API key
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  revoked_by UUID REFERENCES auth.users(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  CONSTRAINT unique_active_key_name UNIQUE (organization_id, name, active)
);

-- Create audit logs table for compliance and tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_api_keys_org_active 
  ON organization_api_keys(organization_id, active) 
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_organization_api_keys_hash 
  ON organization_api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created 
  ON audit_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created 
  ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
  ON audit_logs(action);

-- Enable RLS on new tables
ALTER TABLE organization_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_api_keys
CREATE POLICY "Users can view their org's API keys" ON organization_api_keys
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage API keys" ON organization_api_keys
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('org_admin', 'system_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('org_admin', 'system_admin')
    )
  );

-- RLS policies for audit_logs
CREATE POLICY "Users can view their org's audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT ON organization_api_keys TO authenticated;
GRANT INSERT, UPDATE, DELETE ON organization_api_keys TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;

-- Function to automatically hash API keys (for future use)
CREATE OR REPLACE FUNCTION hash_api_key()
RETURNS TRIGGER AS $$
BEGIN
  -- This is a placeholder - in production, hashing would be done in the application
  -- to prevent the raw key from ever touching the database
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update default organization settings structure
UPDATE organizations 
SET settings = COALESCE(settings, '{}') || '{
  "allowSelfRegistration": false,
  "defaultRole": "user",
  "requireEmailVerification": true,
  "dataRetentionDays": 365,
  "enableAuditLogs": false,
  "enable2FA": false,
  "enableSSO": false,
  "ssoProvider": null,
  "ssoConfig": null
}'::jsonb
WHERE settings IS NULL OR settings = '{}'::jsonb;

-- Create function to log organization changes
CREATE OR REPLACE FUNCTION log_organization_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if audit logging is enabled for this organization
  IF (NEW.settings->>'enableAuditLogs')::boolean = true THEN
    INSERT INTO audit_logs (
      organization_id,
      user_id,
      action,
      resource_type,
      resource_id,
      details,
      created_at
    ) VALUES (
      NEW.id,
      auth.uid(),
      'organization_updated',
      'organization',
      NEW.id,
      jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW),
        'changed_at', NOW()
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for organization changes
DROP TRIGGER IF EXISTS organization_audit_trigger ON organizations;
CREATE TRIGGER organization_audit_trigger
  AFTER UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION log_organization_changes();

-- Add some sample data for testing (only in development)
-- This would be removed in production
DO $$
BEGIN
  -- Only insert if we're in a development environment
  IF current_setting('app.environment', true) = 'development' OR 
     current_setting('app.environment', true) IS NULL THEN
    
    -- Update existing organizations with sample data
    UPDATE organizations 
    SET 
      industry = 'technology',
      size = '11-50',
      website = 'https://example.com',
      description = 'Sample organization for testing',
      settings = '{
        "allowSelfRegistration": false,
        "defaultRole": "user",
        "requireEmailVerification": true,
        "dataRetentionDays": 365,
        "enableAuditLogs": true,
        "enable2FA": false,
        "enableSSO": false,
        "ssoProvider": null,
        "ssoConfig": null
      }'::jsonb
    WHERE industry IS NULL;
    
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE organization_api_keys IS 'API keys for organization integrations';
COMMENT ON TABLE audit_logs IS 'Audit trail for compliance and security monitoring';
COMMENT ON COLUMN organizations.settings IS 'JSONB object containing organization configuration settings';
COMMENT ON COLUMN organization_api_keys.key_hash IS 'SHA-256 hash of the API key for secure storage';
COMMENT ON COLUMN organization_api_keys.permissions IS 'Array of permission strings granted to this API key';