# AI Readiness Mock Server

A comprehensive mock server that provides full Supabase-compatible API mocking for e2e testing of the AI Readiness Assessment application.

## Features

- 🔐 **Complete Authentication System**: Sign up, sign in, password reset, email verification
- 💾 **Database Operations**: Full CRUD operations with relationships and constraints
- 🤖 **AI Service Mocking**: Mock LLM analysis with realistic responses
- 🛡️ **Security Middleware**: JWT validation, rate limiting, role-based access control
- 📊 **Comprehensive Test Data**: Realistic surveys, responses, and user profiles
- 🎯 **E2E Testing Ready**: Drop-in replacement for Supabase in test environments

## Quick Start

### 1. Install Dependencies

```bash
cd mocks
npm install
```

### 2. Start the Server

```bash
# Start with default settings
npm start

# Start with custom port
node scripts/start-mock-server.js --port 8080

# Start in development mode with auto-seeding
node scripts/start-mock-server.js --env development

# Start without database seeding
node scripts/start-mock-server.js --no-seed
```

### 3. Verify Server is Running

```bash
curl http://localhost:54321/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "auth": "operational",
    "database": "operational",
    "ai": "operational"
  }
}
```

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/v1/signup` | Create new user account |
| POST | `/auth/v1/token` | Sign in with email/password |
| GET | `/auth/v1/user` | Get current user information |
| PUT | `/auth/v1/user` | Update user profile |
| POST | `/auth/v1/logout` | Sign out user |
| POST | `/auth/v1/recover` | Request password reset |
| POST | `/auth/v1/verify` | Verify email address |

### Database REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rest/v1/:table` | Query table data |
| POST | `/rest/v1/:table` | Insert new records |
| PATCH | `/rest/v1/:table` | Update existing records |
| DELETE | `/rest/v1/:table` | Delete records |

### AI/LLM Services

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/llm/analyze` | Analyze survey responses |
| POST | `/api/llm/batch` | Batch analysis processing |

### Debug/Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/debug-auth` | Authentication debug info |
| GET | `/api/check-env` | Environment configuration |
| GET | `/api/supabase-diagnostics` | Supabase compatibility check |
| POST | `/api/debug/reset` | Reset all test data |

## Test Credentials

The server comes pre-configured with test user accounts:

### Regular User
- **Email**: `testuser@example.com`
- **Password**: `TestPassword123!`
- **Role**: `user`

### Admin User
- **Email**: `testadmin@example.com`
- **Password**: `AdminPassword123!`
- **Role**: `admin`

### Unverified User
- **Email**: `pending@example.com`
- **Password**: `PendingPassword123!`
- **Status**: `email_not_confirmed`

## Configuration

### Environment Variables

```bash
# Server Configuration
SUPABASE_PORT=54321
MOCK_SERVER_HOST=localhost
NODE_ENV=test

# Authentication
JWT_SECRET=your-jwt-secret-here

# Logging
LOG_LEVEL=info
```

### Configuration File

The server uses `/mocks/config/mock-server-config.js` for detailed configuration:

```javascript
const config = {
  server: {
    host: 'localhost',
    port: 54321,
    cors: { /* CORS settings */ }
  },
  auth: {
    jwtSecret: 'your-secret',
    tokenExpiry: 3600,
    passwordPolicy: { /* Password requirements */ }
  },
  database: {
    tables: { /* Table definitions */ },
    cleanup: { /* Auto-cleanup settings */ }
  }
};
```

## Database Schema

The mock server provides the following tables:

### Users & Profiles
- `profiles` - User profile information
- `organizations` - Organization data

### Surveys & Responses
- `surveys` - Survey definitions and questions
- `survey_sessions` - User survey sessions
- `survey_responses` - Individual question responses

### AI Analysis
- `ai_analysis_results` - AI-generated insights and scores

### Audit & Logging
- `audit_logs` - Change tracking and audit trail

## Usage Examples

### Authentication Flow

```javascript
// Sign up new user
const signupResponse = await fetch('http://localhost:54321/auth/v1/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'newuser@example.com',
    password: 'SecurePassword123!',
    data: {
      firstName: 'John',
      lastName: 'Doe',
      organizationName: 'Test Corp'
    }
  })
});

// Sign in
const loginResponse = await fetch('http://localhost:54321/auth/v1/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'testuser@example.com',
    password: 'TestPassword123!',
    grant_type: 'password'
  })
});

const { access_token } = await loginResponse.json();
```

### Database Operations

```javascript
// Query surveys
const surveys = await fetch('http://localhost:54321/rest/v1/surveys', {
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'apikey': 'test-anon-key'
  }
});

// Create survey session
const session = await fetch('http://localhost:54321/rest/v1/survey_sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    survey_id: 'survey-123',
    status: 'in_progress'
  })
});
```

### AI Analysis

```javascript
// Analyze survey responses
const analysis = await fetch('http://localhost:54321/api/llm/analyze', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId: 'session-123',
    analysisType: 'readiness_score'
  })
});
```

## Integration with Tests

### Playwright Configuration

```javascript
// playwright.config.js
module.exports = {
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'node mocks/scripts/start-mock-server.js',
    port: 54321,
    reuseExistingServer: !process.env.CI,
  },
};
```

### Jest Configuration

```javascript
// jest.setup.js
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
```

### Test Helper Functions

```javascript
// test-helpers.js
export async function createTestUser() {
  const response = await fetch('http://localhost:54321/auth/v1/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!'
    })
  });
  return response.json();
}

export async function resetTestData() {
  await fetch('http://localhost:54321/api/debug/reset', {
    method: 'POST'
  });
}
```

## Development

### Running in Development Mode

```bash
# Install dependencies
npm install

# Start with auto-reload
npm run dev

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Adding New Endpoints

1. Add route handlers in `/api/enhanced-mock-server.js`
2. Update middleware in `/middleware/auth-middleware.js` if needed
3. Add test data in `/data/test-seeds.js`
4. Update configuration in `/config/mock-server-config.js`

### Customizing Test Data

Edit `/data/test-seeds.js` to modify:
- User profiles and organizations
- Survey questions and responses
- AI analysis results
- Audit log entries

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Check what's using the port
lsof -i :54321

# Kill the process
kill -9 <PID>
```

**Authentication Errors**
```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Check server logs
tail -f mock-server.log
```

**Database Issues**
```bash
# Reset all data
curl -X POST http://localhost:54321/api/debug/reset

# Check table status
curl http://localhost:54321/api/supabase-diagnostics
```

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug node scripts/start-mock-server.js
```

### Health Checks

Monitor server health:
```bash
# Basic health check
curl http://localhost:54321/health

# Detailed diagnostics
curl http://localhost:54321/api/supabase-diagnostics

# Authentication status
curl -H "Authorization: Bearer <token>" http://localhost:54321/api/debug-auth
```

## Architecture

```
mocks/
├── api/
│   ├── auth-service.js          # Authentication logic
│   ├── database-service.js      # Database operations
│   └── enhanced-mock-server.js  # Main server
├── config/
│   └── mock-server-config.js    # Configuration
├── data/
│   └── test-seeds.js           # Test data seeds
├── middleware/
│   └── auth-middleware.js      # Auth middleware
├── scripts/
│   └── start-mock-server.js    # Startup script
└── package.json
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure backward compatibility

## License

MIT License - see LICENSE file for details.