# Authentication Flow Diagrams

## Component Architecture Diagram

```mermaid
graph TB
    subgraph "Client Side"
        UI[React Components]
        AuthCtx[Auth Context]
        Router[React Router]
        Guards[Route Guards]
    end
    
    subgraph "Authentication Layer"
        Supabase[Supabase Auth]
        Session[Session Manager]
        Storage[Secure Storage]
    end
    
    subgraph "Database Layer"
        AuthDB[(auth.users)]
        ProfilesDB[(profiles)]
        RLS[Row Level Security]
    end
    
    subgraph "External Services"
        Email[Email Service]
        SMTP[SMTP Provider]
    end
    
    UI --> AuthCtx
    AuthCtx --> Session
    Session --> Supabase
    Router --> Guards
    Guards --> AuthCtx
    Supabase --> AuthDB
    Supabase --> Email
    Email --> SMTP
    AuthDB --> ProfilesDB
    ProfilesDB --> RLS
    
    style AuthCtx fill:#14b8a6
    style Supabase fill:#8b5cf6
    style RLS fill:#ec4899
```

## Role-Based Access Control Flow

```mermaid
flowchart TD
    Start([User Attempts Access]) --> Auth{Authenticated?}
    Auth -->|No| Login[Redirect to Login]
    Auth -->|Yes| Role{Check User Role}
    
    Role --> User[User Role]
    Role --> OrgAdmin[Org Admin Role]
    Role --> Admin[Admin Role]
    
    User --> UserAccess[Limited Access]
    UserAccess --> UserFeatures[- Take Surveys<br/>- View Own Results<br/>- Account Settings]
    
    OrgAdmin --> OrgAccess[Organization Access]
    OrgAccess --> OrgFeatures[- View Org Surveys<br/>- Export Org Reports<br/>- Manage Org Users]
    
    Admin --> AdminAccess[Full Platform Access]
    AdminAccess --> AdminFeatures[- View All Data<br/>- System Settings<br/>- User Management<br/>- Global Analytics]
    
    Login --> LoginForm[Login Form]
    LoginForm --> Validate[Validate Credentials]
    Validate -->|Success| Role
    Validate -->|Failure| LoginError[Show Error]
    
    style User fill:#4ade80
    style OrgAdmin fill:#14b8a6
    style Admin fill:#8b5cf6
```

## Complete Registration Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant SA as Supabase Auth
    participant DB as Database
    participant E as Email Service
    participant T as Trigger Function

    U->>F: Fill registration form
    F->>F: Validate form data
    F->>SA: signUp(email, password)
    
    SA->>DB: INSERT into auth.users
    DB->>T: Trigger: handle_new_user()
    T->>T: Determine role based on email
    T->>DB: INSERT into profiles table
    
    SA->>E: Send verification email
    SA->>F: Return { user, session: null }
    F->>U: Show "Check your email"
    
    U->>E: Click verification link
    E->>SA: Confirm email verification
    SA->>DB: UPDATE auth.users SET email_confirmed = true
    SA->>F: Redirect with session
    F->>DB: Fetch user profile with role
    DB->>F: Return profile data
    F->>F: Set auth context
    F->>U: Redirect to role-based dashboard
    
    Note over U,F: Email verified, user logged in
    Note over T: Auto-assigns role:<br/>admin, org_admin, or user
```

## Login Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant SA as Supabase Auth
    participant DB as Database
    participant SM as Session Manager

    U->>F: Enter credentials
    F->>F: Validate form
    F->>SA: signInWithPassword(email, password)
    
    SA->>SA: Verify credentials
    SA->>F: Return { user, session }
    
    F->>DB: SELECT * FROM profiles WHERE user_id = ?
    DB->>F: Return user profile with role
    
    F->>SM: Initialize session
    SM->>SM: Start auto-refresh timer
    SM->>F: Session configured
    
    F->>F: Set auth context with role
    F->>F: Determine redirect based on role
    
    alt User Role
        F->>U: Redirect to /dashboard
    else Org Admin Role
        F->>U: Redirect to /org-dashboard
    else Admin Role
        F->>U: Redirect to /admin
    end
    
    Note over SM: JWT auto-refresh<br/>every 55 minutes
```

## Password Reset Flow

```mermaid
flowchart TD
    Start([User Forgot Password]) --> Request[Enter Email Address]
    Request --> Validate{Valid Email?}
    Validate -->|No| ErrorMsg[Show Error Message]
    Validate -->|Yes| SendEmail[Send Reset Email]
    
    SendEmail --> RateLimit{Rate Limited?}
    RateLimit -->|Yes| TooMany[Too Many Requests]
    RateLimit -->|No| EmailSent[Email Sent Successfully]
    
    EmailSent --> UserCheck[User Checks Email]
    UserCheck --> ClickLink[Click Reset Link]
    ClickLink --> ValidToken{Token Valid?}
    
    ValidToken -->|No| TokenError[Invalid/Expired Token]
    ValidToken -->|Yes| ResetForm[Show Reset Password Form]
    
    ResetForm --> NewPassword[Enter New Password]
    NewPassword --> ValidatePass{Valid Password?}
    ValidatePass -->|No| PassError[Password Requirements Error]
    ValidatePass -->|Yes| UpdatePass[Update Password]
    
    UpdatePass --> Success[Password Updated]
    Success --> AutoLogin[Auto Login User]
    AutoLogin --> Dashboard[Redirect to Dashboard]
    
    TooMany --> Request
    TokenError --> Request
    PassError --> ResetForm
    ErrorMsg --> Request
    
    style Success fill:#4ade80
    style EmailSent fill:#14b8a6
    style TokenError fill:#ef4444
    style PassError fill:#ef4444
```

## Session Management Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant SM as Session Manager
    participant SA as Supabase Auth
    participant ST as Secure Storage

    U->>F: User logs in
    F->>SA: Authenticate user
    SA->>F: Return JWT tokens
    F->>SM: Initialize session
    
    SM->>ST: Store encrypted session data
    SM->>SM: Start refresh timer (55 min)
    
    loop Every Minute
        SM->>SM: Check token expiry
        alt Token expires in <5 min
            SM->>SA: Refresh session
            SA->>SM: Return new tokens
            SM->>ST: Update stored tokens
        end
    end
    
    U->>F: User makes API request
    F->>SM: Get auth headers
    SM->>ST: Retrieve current tokens
    ST->>SM: Return decrypted tokens
    SM->>F: Return auth headers
    
    alt Token Expired
        F->>SA: Attempt refresh
        SA-->>F: Refresh failed
        F->>U: Redirect to login
    else Token Valid
        F->>F: Proceed with request
    end
    
    U->>F: User logs out
    F->>SM: Clear session
    SM->>ST: Remove stored data
    SM->>SA: Sign out
    SA->>F: Confirm sign out
```

## Route Protection Flow

```mermaid
flowchart TD
    RouteAccess([User Accesses Route]) --> AuthCheck{User Authenticated?}
    
    AuthCheck -->|No| LoginRedirect[Redirect to /login]
    AuthCheck -->|Yes| RoleCheck{Check Required Role}
    
    RoleCheck --> GetUserRole[Get User Role from Context]
    GetUserRole --> CompareRoles{Role Sufficient?}
    
    CompareRoles -->|No| Unauthorized[Show Unauthorized Page]
    CompareRoles -->|Yes| PermissionCheck{Check Specific Permissions?}
    
    PermissionCheck -->|No Permissions Required| Allow[Allow Access]
    PermissionCheck -->|Permissions Required| CheckPerms[Check User Permissions]
    
    CheckPerms --> HasPermission{Has Required Permission?}
    HasPermission -->|No| Forbidden[Show Forbidden Page]
    HasPermission -->|Yes| Allow
    
    Allow --> LoadComponent[Load Protected Component]
    
    Unauthorized --> ShowMessage[Display: Need Higher Role]
    Forbidden --> ShowMessage2[Display: Missing Permission]
    
    style Allow fill:#4ade80
    style LoadComponent fill:#14b8a6
    style Unauthorized fill:#f59e0b
    style Forbidden fill:#ef4444
```

## Data Access Security Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant API as API Layer
    participant RLS as Row Level Security
    participant DB as PostgreSQL Database
    participant A as Audit Log

    F->>API: Request data with JWT
    API->>API: Validate JWT token
    API->>RLS: Execute query with user context
    
    RLS->>RLS: Check user role and permissions
    RLS->>DB: Filter data based on RLS policies
    
    alt User Role
        DB->>RLS: Return only user's own data
    else Org Admin Role
        DB->>RLS: Return organization data only
    else Admin Role
        DB->>RLS: Return all requested data
    end
    
    RLS->>API: Return filtered results
    API->>A: Log data access event
    API->>F: Return authorized data
    
    Note over RLS: RLS policies enforce<br/>role-based data filtering<br/>at database level
    Note over A: All data access is<br/>audited for compliance
```

These diagrams provide a comprehensive visual representation of the authentication system architecture, showing how components interact and how data flows through the system while maintaining security and role-based access control.