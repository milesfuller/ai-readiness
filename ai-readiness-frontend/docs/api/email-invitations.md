# Email Invitation System API Documentation

## Overview

The Email Invitation System provides a complete solution for inviting users to join organizations via email. It includes secure token generation, email templates, tracking, and fallback options when email services are unavailable.

## Features

- 🔐 **Secure Token Generation**: Cryptographically secure invitation tokens
- 📧 **Rich Email Templates**: Beautiful HTML and text email templates
- 📊 **Email Tracking**: Track delivery status and engagement
- 🔄 **Resend Functionality**: Resend invitations with click tracking
- ⏰ **Expiration Handling**: Automatic cleanup of expired invitations
- 🛡️ **Fallback Options**: Manual links when email service is unavailable
- 🎨 **Role-Based Invitations**: Support for different user roles
- 🔍 **Comprehensive Validation**: Token validation and security checks

## API Endpoints

### Send Invitation

Create and send a new invitation email.

**Endpoint:** `POST /api/invitations`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "email": "user@example.com",
  "role": "user", // "user" | "org_admin"
  "organizationId": "uuid",
  "firstName": "John", // optional
  "lastName": "Doe", // optional
  "message": "Welcome to our team!" // optional
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "trackingId": "uuid"
}
```

**Fallback Response (503):**
```json
{
  "success": false,
  "error": "Email service unavailable",
  "fallbackLink": "https://app.com/auth/accept-invitation/token123",
  "message": "Please share the invitation link manually"
}
```

**Error Responses:**
- `400`: Invalid request data or user already exists
- `401`: Unauthorized (not authenticated)
- `403`: Forbidden (insufficient permissions)
- `500`: Internal server error

### Get Invitation Statistics

Retrieve invitation statistics for the organization.

**Endpoint:** `GET /api/invitations?organizationId=uuid`

**Authentication:** Required (Admin only)

**Response:**
```json
{
  "total": 25,
  "pending": 8,
  "accepted": 15,
  "expired": 2,
  "recent": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "user",
      "status": "pending",
      "created_at": "2024-01-01T00:00:00Z",
      "expires_at": "2024-01-08T00:00:00Z",
      "first_name": "John",
      "last_name": "Doe"
    }
  ]
}
```

### Manage Individual Invitations

Resend or cancel specific invitations.

**Endpoint:** `POST /api/invitations/[id]`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "action": "resend" // "resend" | "cancel"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Invitation resent successfully"
}
```

### Validate Invitation Token

Check if an invitation token is valid before accepting.

**Endpoint:** `GET /api/invitations/validate/[token]`

**Authentication:** Not required (public endpoint)

**Response:**
```json
{
  "valid": true,
  "invitation": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "organization_id": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    "custom_message": "Welcome!",
    "expires_at": "2024-01-08T00:00:00Z",
    "organizations": {
      "name": "Acme Corp"
    },
    "profiles": {
      "first_name": "Admin",
      "last_name": "User",
      "email": "admin@example.com"
    }
  }
}
```

### Accept Invitation

Accept an invitation and create a new user account.

**Endpoint:** `POST /api/invitations/validate/[token]`

**Authentication:** Not required (public endpoint)

**Request Body:**
```json
{
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation accepted successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

## Email Templates

The system includes responsive HTML and plain text email templates with:

- 🎨 Beautiful gradient design matching app branding
- 📱 Mobile-responsive layout
- 🔒 Security notices and expiration information
- ✨ Personalized content with user names and custom messages
- 🔗 Clear call-to-action buttons and fallback links

### Template Variables

- `recipientName`: User's full name or email fallback
- `organizationName`: Organization name
- `inviterName`: Name of person sending invitation
- `acceptUrl`: Link to accept invitation
- `role`: User role (formatted for display)
- `customMessage`: Optional personal message
- `expirationDate`: When invitation expires

## Security Features

### Token Security
- **Cryptographically Secure**: 256-bit random tokens
- **Single Use**: Tokens are invalidated after acceptance
- **Time Limited**: 7-day expiration period
- **Unique**: Each invitation gets a unique token

### Access Control
- **Role-Based Permissions**: Only admins can send invitations
- **Organization Scoped**: Users can only invite to their organization
- **Duplicate Prevention**: Prevents multiple invitations to same email
- **Member Validation**: Checks if user already exists in organization

### Data Protection
- **Row Level Security**: Database policies restrict data access
- **Input Validation**: Comprehensive validation of all inputs
- **SQL Injection Protection**: Parameterized queries throughout
- **CORS Protection**: API endpoints properly secured

## Configuration

### Environment Variables

```bash
# Required - Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=https://your-app.com

# Optional - Email Service (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@your-domain.com
```

### Supported Email Providers

- **Gmail**: `smtp.gmail.com:587` (use app-specific password)
- **Outlook**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **SendGrid**: `smtp.sendgrid.net:587`
- **AWS SES**: `email-smtp.region.amazonaws.com:587`
- **Mailgun**: `smtp.mailgun.org:587`

### Fallback Mode

When email service is not configured or unavailable:
- System generates invitation links
- Links are provided to administrators
- Manual sharing instructions included
- All other functionality remains available

## Database Schema

### Invitations Table

```sql
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    invited_by UUID NOT NULL REFERENCES auth.users(id),
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
```

### Email Tracking Table

```sql
CREATE TABLE email_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

## Usage Examples

### Frontend Components

```tsx
import { InvitationManagement } from '@/components/admin/invitation-management'

function AdminPage() {
  return <InvitationManagement organizationId="uuid" />
}
```

### Service Usage

```typescript
import { emailService } from '@/lib/services/email-service'

// Send invitation
const result = await emailService.sendInvitation({
  email: 'user@example.com',
  organizationId: 'uuid',
  role: 'user',
  invitedBy: 'admin-id',
  firstName: 'John',
  lastName: 'Doe',
  message: 'Welcome!'
})

// Validate invitation
const validation = await emailService.validateInvitation('token')

// Accept invitation
const acceptance = await emailService.acceptInvitation('token', 'password')
```

## Error Handling

The system provides comprehensive error handling:

### Client-Side Errors
- Form validation errors
- Network connectivity issues
- Authentication failures
- Permission violations

### Server-Side Errors
- Database connection issues
- Email service failures
- Invalid tokens
- Expired invitations

### Graceful Degradation
- Fallback to manual links when email fails
- Clear error messages for users
- Retry mechanisms for transient failures
- Comprehensive logging for debugging

## Performance Considerations

- **Connection Pooling**: SMTP connections are pooled
- **Rate Limiting**: Built-in email rate limiting (14/second)
- **Database Indexes**: Optimized queries with proper indexing
- **Caching**: Organization and user data cached appropriately
- **Cleanup Jobs**: Automatic cleanup of expired invitations

## Testing

Comprehensive test suite includes:
- Unit tests for email service
- Integration tests for API routes
- Email template validation
- Token security verification
- Error handling scenarios
- Fallback mode testing

Run tests with:
```bash
npm test __tests__/services/email-service.test.ts
npm test __tests__/api/invitations.test.ts
```

## Monitoring and Analytics

Track invitation system performance:
- Invitation send rates
- Acceptance rates by organization
- Email delivery success rates
- Common failure patterns
- User engagement metrics

## Support

For issues or questions:
1. Check the troubleshooting section below
2. Review error logs for specific error messages
3. Verify environment variable configuration
4. Test email service connectivity

### Common Issues

**Email not sending:**
- Verify SMTP credentials
- Check firewall/port restrictions
- Confirm email provider settings
- Test with fallback mode

**Invitations not appearing:**
- Check spam/junk folders
- Verify email address spelling
- Confirm organization permissions
- Review email tracking status

**Token validation errors:**
- Verify token hasn't expired
- Check if already accepted
- Confirm token format integrity
- Validate database connectivity