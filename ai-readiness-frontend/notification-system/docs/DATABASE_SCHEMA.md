# Database Schema Design

## Schema Overview

The notification system uses PostgreSQL as the primary database with the following main entities:

## Core Tables

### 1. Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en-US',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
```

### 2. Notification Categories Table
```sql
CREATE TABLE notification_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- Hex color code
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO notification_categories (name, description, icon, color, is_system) VALUES
('system', 'System notifications', 'system', '#FF6B6B', TRUE),
('security', 'Security alerts', 'shield', '#FF4757', TRUE),
('account', 'Account updates', 'user', '#3742FA', TRUE),
('marketing', 'Marketing messages', 'megaphone', '#2ED573', FALSE),
('updates', 'Product updates', 'bell', '#FFA502', FALSE);
```

### 3. Notifications Table
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES notification_categories(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    
    -- Delivery channels
    send_email BOOLEAN DEFAULT FALSE,
    send_in_app BOOLEAN DEFAULT TRUE,
    send_push BOOLEAN DEFAULT FALSE,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    template_data JSONB DEFAULT '{}',
    
    -- Tracking
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled_at ON notifications(scheduled_at);
CREATE INDEX idx_notifications_category_id ON notifications(category_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
```

### 4. User Preferences Table
```sql
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES notification_categories(id),
    
    -- Channel preferences
    email_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT FALSE,
    
    -- Timing preferences
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_hours_timezone VARCHAR(50),
    
    -- Frequency controls
    email_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (
        email_frequency IN ('immediate', 'daily', 'weekly', 'never')
    ),
    digest_enabled BOOLEAN DEFAULT FALSE,
    digest_time TIME DEFAULT '09:00:00',
    
    -- Priority filtering
    min_priority INTEGER DEFAULT 1 CHECK (min_priority BETWEEN 1 AND 5),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, category_id)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE UNIQUE INDEX idx_user_preferences_user_category ON user_preferences(user_id, category_id);
```

### 5. Email Templates Table
```sql
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category_id UUID REFERENCES notification_categories(id),
    subject_template TEXT NOT NULL,
    html_template TEXT NOT NULL,
    text_template TEXT,
    
    -- Template metadata
    variables JSONB DEFAULT '[]', -- Array of variable names
    description TEXT,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_templates_name ON email_templates(name);
CREATE INDEX idx_email_templates_category ON email_templates(category_id);
```

### 6. Notification Delivery Log Table
```sql
CREATE TABLE notification_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'in_app', 'push', 'webhook')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    
    -- Delivery details
    recipient VARCHAR(255),
    provider VARCHAR(50), -- email provider, push service, etc.
    provider_message_id VARCHAR(255),
    
    -- Error tracking
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Performance metrics
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    processing_time_ms INTEGER,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_delivery_log_notification_id ON notification_delivery_log(notification_id);
CREATE INDEX idx_delivery_log_channel_status ON notification_delivery_log(channel, status);
CREATE INDEX idx_delivery_log_created_at ON notification_delivery_log(created_at DESC);
```

### 7. Notification Events Table
```sql
CREATE TABLE notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'created', 'scheduled', 'sent', 'delivered', 'read', 'clicked', 'unsubscribed', 'failed'
    )),
    
    -- Event metadata
    client_info JSONB DEFAULT '{}', -- user agent, IP, etc.
    additional_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notification_events_notification_id ON notification_events(notification_id);
CREATE INDEX idx_notification_events_type ON notification_events(event_type);
CREATE INDEX idx_notification_events_created_at ON notification_events(created_at DESC);
```

## Views and Functions

### Unread Notifications Count View
```sql
CREATE OR REPLACE VIEW user_unread_counts AS
SELECT 
    u.id as user_id,
    nc.id as category_id,
    nc.name as category_name,
    COUNT(n.id) as unread_count
FROM users u
CROSS JOIN notification_categories nc
LEFT JOIN notifications n ON n.user_id = u.id 
    AND n.category_id = nc.id 
    AND n.read_at IS NULL 
    AND n.status IN ('sent', 'delivered')
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
WHERE u.is_active = TRUE
GROUP BY u.id, nc.id, nc.name;
```

### Auto-update timestamps function
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
```

## Indexes for Performance

```sql
-- Composite indexes for common queries
CREATE INDEX idx_notifications_user_category_unread ON notifications(user_id, category_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_scheduled_pending ON notifications(scheduled_at, status) WHERE status = 'pending';
CREATE INDEX idx_notifications_user_recent ON notifications(user_id, created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';

-- Partial indexes for better performance
CREATE INDEX idx_notifications_failed ON notifications(id) WHERE status = 'failed';
CREATE INDEX idx_notifications_retry ON notifications(id, retry_count) WHERE status = 'failed' AND retry_count < 3;
```

## Data Retention Policy

```sql
-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete read notifications older than 90 days
    DELETE FROM notifications 
    WHERE read_at IS NOT NULL 
    AND read_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete expired notifications
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT cleanup_old_notifications();');
```