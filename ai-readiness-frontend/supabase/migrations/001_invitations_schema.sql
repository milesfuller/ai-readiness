-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    custom_message TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by_user_id UUID REFERENCES auth.users(id),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    resent_count INTEGER DEFAULT 0,
    last_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email tracking table
CREATE TABLE IF NOT EXISTS email_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'invitation',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_organization_id ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_tracking_email ON email_tracking(email);
CREATE INDEX IF NOT EXISTS idx_email_tracking_type ON email_tracking(type);
CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON email_tracking(status);

-- Update updated_at trigger for invitations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invitations_updated_at 
    BEFORE UPDATE ON invitations 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_email_tracking_updated_at 
    BEFORE UPDATE ON email_tracking 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- RLS policies for invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invitations for their organization
CREATE POLICY "Users can view organization invitations" ON invitations
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND role IN ('org_admin', 'system_admin')
        )
    );

-- Policy: Org admins can insert invitations for their organization
CREATE POLICY "Org admins can create invitations" ON invitations
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND role IN ('org_admin', 'system_admin')
        )
        AND invited_by = auth.uid()
    );

-- Policy: Org admins can update invitations for their organization
CREATE POLICY "Org admins can update invitations" ON invitations
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND role IN ('org_admin', 'system_admin')
        )
    );

-- Policy: Org admins can delete invitations for their organization
CREATE POLICY "Org admins can delete invitations" ON invitations
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND role IN ('org_admin', 'system_admin')
        )
    );

-- RLS policies for email tracking
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view email tracking for their organization's invitations
CREATE POLICY "Users can view email tracking" ON email_tracking
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM invitations i
            JOIN organization_members om ON i.organization_id = om.organization_id
            WHERE i.email = email_tracking.email
            AND om.user_id = auth.uid()
            AND om.role IN ('org_admin', 'system_admin')
        )
    );

-- Policy: System can insert email tracking records
CREATE POLICY "System can create email tracking" ON email_tracking
    FOR INSERT
    WITH CHECK (true);

-- Policy: System can update email tracking records
CREATE POLICY "System can update email tracking" ON email_tracking
    FOR UPDATE
    USING (true);

-- Function to cleanup expired invitations (for cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE invitations 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE invitations IS 'Stores email invitations sent to users to join organizations';
COMMENT ON TABLE email_tracking IS 'Tracks email delivery status and engagement metrics';
COMMENT ON FUNCTION cleanup_expired_invitations() IS 'Marks expired invitations as expired (to be called by cron job)';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON email_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_invitations() TO service_role;