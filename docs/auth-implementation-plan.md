# Authentication Implementation Plan

## Phase 1: Core Authentication Infrastructure

### 1.1 Supabase Configuration
**Priority: HIGH | Estimated Time: 4 hours**

```typescript
// supabase/config.ts
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // More secure than implicit flow
  },
};

export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
    auth: supabaseConfig.auth,
  }
);
```

**Tasks:**
- [ ] Set up Supabase project and obtain credentials
- [ ] Configure authentication settings in Supabase dashboard
- [ ] Set up email templates for verification and password reset
- [ ] Configure SMTP settings for email delivery
- [ ] Test basic authentication flows

### 1.2 Database Schema Implementation
**Priority: HIGH | Estimated Time: 6 hours**

**Dependencies:** Coordinate with Backend Developer agent for Supabase setup

```sql
-- Core authentication tables and policies
-- (Already defined in database schema)

-- Additional security functions
CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json ->> 'role',
    'anon'
  )::text;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.email() RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json ->> 'email',
    ''
  )::text;
$$ LANGUAGE sql STABLE;
```

**Tasks:**
- [ ] Execute database migration scripts
- [ ] Set up Row Level Security policies
- [ ] Create helper functions for role checking
- [ ] Test RLS policies with different user roles
- [ ] Implement audit logging triggers

### 1.3 Authentication Context Provider
**Priority: HIGH | Estimated Time: 8 hours**

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  hasRole: (role: Role) => boolean;
  hasPermission: (permission: Permission) => boolean;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    initializeAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const initializeAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await loadUserProfile(session.user);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (authUser: User) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (profile) {
        setUser({
          id: authUser.id,
          email: authUser.email!,
          role: profile.role,
          organizationId: profile.organization_id,
          profile,
          session: await supabase.auth.getSession(),
        });
      }
    } catch (error) {
      console.error('Profile loading error:', error);
    }
  };

  // Implementation of auth methods...
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

**Tasks:**
- [ ] Implement AuthProvider component
- [ ] Create useAuth hook
- [ ] Add session management with auto-refresh
- [ ] Implement role and permission checking
- [ ] Add error handling for all auth operations

## Phase 2: Route Protection & Navigation

### 2.1 Protected Route Components
**Priority: HIGH | Estimated Time: 6 hours**

```typescript
// components/auth/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
  fallback = <UnauthorizedPage />,
  redirectTo,
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }
    router.push('/login');
    return null;
  }

  if (requiredRole && !hasRole(user.role, requiredRole)) {
    return fallback;
  }

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return fallback;
  }

  return <>{children}</>;
};

// Higher-order component version
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options?: ProtectedRouteProps
) => {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
};
```

**Tasks:**
- [ ] Create ProtectedRoute component
- [ ] Implement withAuth HOC
- [ ] Create role-specific route guards
- [ ] Add unauthorized and forbidden pages
- [ ] Test route protection with different user roles

### 2.2 Role-Based Navigation
**Priority: MEDIUM | Estimated Time: 4 hours**

```typescript
// components/navigation/NavigationMenu.tsx
const navigationConfig: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: Home,
    roles: ['user', 'org_admin', 'admin'],
  },
  {
    label: 'Take Survey',
    path: '/survey',
    icon: FileText,
    roles: ['user', 'org_admin', 'admin'],
  },
  {
    label: 'My Results',
    path: '/results',
    icon: BarChart,
    roles: ['user', 'org_admin', 'admin'],
  },
  {
    label: 'Team Analytics',
    path: '/team',
    icon: Users,
    roles: ['org_admin', 'admin'],
  },
  {
    label: 'Admin Console',
    path: '/admin',
    icon: Settings,
    roles: ['admin'],
  },
];

export const NavigationMenu: React.FC = () => {
  const { user } = useAuth();
  
  const filteredNavigation = navigationConfig.filter(item =>
    item.roles.includes(user?.role || 'user')
  );

  return (
    <nav className="space-y-2">
      {filteredNavigation.map(item => (
        <NavigationItem key={item.path} item={item} />
      ))}
    </nav>
  );
};
```

**Tasks:**
- [ ] Design navigation configuration
- [ ] Implement role-based menu filtering
- [ ] Create responsive navigation components
- [ ] Add active route highlighting
- [ ] Test navigation with different user roles

## Phase 3: Authentication Forms & UI

### 3.1 Login Form Component
**Priority: HIGH | Estimated Time: 6 hours**

```typescript
// components/auth/LoginForm.tsx
export const LoginForm: React.FC = () => {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await signIn(data.email, data.password);
      if (!result.success) {
        setError(result.error?.message || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Sign In
        </CardTitle>
        <CardDescription className="text-center">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="Enter your email"
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Enter your password"
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm">Remember me</FormLabel>
                  </FormItem>
                )}
              />
              
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      
      <CardFooter className="text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};
```

**Tasks:**
- [ ] Create login form with validation
- [ ] Implement registration form
- [ ] Add password reset form
- [ ] Create email verification page
- [ ] Style forms with ShadCN components and dark theme

### 3.2 User Profile Management
**Priority: MEDIUM | Estimated Time: 4 hours**

```typescript
// components/auth/ProfileSettings.tsx
export const ProfileSettings: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.profile.first_name || '',
      lastName: user?.profile.last_name || '',
      displayName: user?.profile.display_name || '',
      jobTitle: user?.profile.job_title || '',
      department: user?.profile.department || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      await updateProfile(data);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Update your personal information and preferences
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Form fields for profile data */}
            
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
```

**Tasks:**
- [ ] Create profile settings form
- [ ] Add password change functionality
- [ ] Implement notification preferences
- [ ] Add account deletion option
- [ ] Create user preferences management

## Phase 4: Advanced Security Features

### 4.1 Session Management & Security
**Priority: MEDIUM | Estimated Time: 6 hours**

```typescript
// lib/session-manager.ts
export class SessionManager {
  private static instance: SessionManager;
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public startAutoRefresh(): void {
    this.stopAutoRefresh();
    
    this.refreshTimer = setInterval(async () => {
      await this.checkAndRefreshToken();
    }, 60000); // Check every minute
  }

  public stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private async checkAndRefreshToken(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && this.shouldRefreshToken(session)) {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('Token refresh failed:', error);
          // Redirect to login if refresh fails
          window.location.href = '/login';
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  }

  private shouldRefreshToken(session: Session): boolean {
    const expiresAt = new Date(session.expires_at! * 1000);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    return timeUntilExpiry < this.REFRESH_THRESHOLD;
  }
}
```

**Tasks:**
- [ ] Implement automatic token refresh
- [ ] Add session timeout handling
- [ ] Create secure storage utilities
- [ ] Implement concurrent session management
- [ ] Add activity tracking

### 4.2 Audit Logging & Monitoring
**Priority: LOW | Estimated Time: 4 hours**

```typescript
// lib/audit-logger.ts
export class AuditLogger {
  public static async logAuthEvent(
    event: AuthEventType,
    details: AuthEventDetails
  ): Promise<void> {
    try {
      await supabase.from('audit_log').insert({
        event_type: event,
        event_category: 'authentication',
        description: this.formatEventDescription(event, details),
        user_id: details.userId,
        ip_address: details.ipAddress,
        user_agent: details.userAgent,
        event_data: details.metadata,
        status: details.success ? 'success' : 'failure',
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  private static formatEventDescription(
    event: AuthEventType,
    details: AuthEventDetails
  ): string {
    switch (event) {
      case 'login_success':
        return `User ${details.email} logged in successfully`;
      case 'login_failure':
        return `Failed login attempt for ${details.email}`;
      case 'password_reset':
        return `Password reset requested for ${details.email}`;
      default:
        return `Authentication event: ${event}`;
    }
  }
}
```

**Tasks:**
- [ ] Implement audit logging system
- [ ] Add security monitoring hooks
- [ ] Create failed attempt tracking
- [ ] Implement suspicious activity detection
- [ ] Add security alerts and notifications

## Phase 5: Testing & Validation

### 5.1 Unit Testing
**Priority: HIGH | Estimated Time: 8 hours**

```typescript
// __tests__/auth/AuthContext.test.tsx
describe('AuthContext', () => {
  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });
    
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('should sign in user successfully', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });

    expect(result.current.user).toBeDefined();
    expect(result.current.user?.email).toBe('test@example.com');
  });

  it('should handle role-based access correctly', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <MockUserProvider role="admin">
            {children}
          </MockUserProvider>
        </AuthProvider>
      ),
    });

    expect(result.current.hasRole('admin')).toBe(true);
    expect(result.current.hasRole('user')).toBe(true);
    expect(result.current.hasPermission('manage_users')).toBe(true);
  });
});
```

**Tasks:**
- [ ] Write unit tests for auth context
- [ ] Test protected route components
- [ ] Test role and permission checking
- [ ] Test session management
- [ ] Test error handling scenarios

### 5.2 Integration Testing
**Priority: MEDIUM | Estimated Time: 6 hours**

```typescript
// __tests__/integration/auth-flow.test.tsx
describe('Authentication Flow Integration', () => {
  it('should complete full registration flow', async () => {
    render(<App />);
    
    // Navigate to registration
    fireEvent.click(screen.getByText('Sign Up'));
    
    // Fill registration form
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'SecurePassword123!' },
    });
    
    // Submit form
    fireEvent.click(screen.getByText('Create Account'));
    
    // Check for verification message
    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });

  it('should handle login and redirect based on role', async () => {
    // Mock different user roles and test redirects
    const testCases = [
      { role: 'user', expectedPath: '/dashboard' },
      { role: 'org_admin', expectedPath: '/org-dashboard' },
      { role: 'admin', expectedPath: '/admin' },
    ];

    for (const testCase of testCases) {
      // Test each role scenario
    }
  });
});
```

**Tasks:**
- [ ] Test complete authentication flows
- [ ] Test role-based redirects
- [ ] Test error scenarios and recovery
- [ ] Test session persistence
- [ ] Performance testing for auth operations

## Implementation Dependencies

### Backend Developer Coordination
- Supabase project setup and configuration
- Database schema implementation
- RLS policy creation and testing
- Email service configuration

### Frontend Developer Coordination
- ShadCN component integration
- Dark theme implementation
- Form validation and error handling
- Responsive design implementation

## Success Criteria

1. **Security Requirements**
   - [ ] All authentication endpoints are secure
   - [ ] Role-based access control works correctly
   - [ ] Session management is robust
   - [ ] Audit logging captures all events

2. **User Experience Requirements**
   - [ ] Login/registration flows are intuitive
   - [ ] Error messages are helpful and clear
   - [ ] Password reset works reliably
   - [ ] Mobile experience is optimized

3. **Performance Requirements**
   - [ ] Authentication operations complete within 2 seconds
   - [ ] Session refresh is transparent to users
   - [ ] No unnecessary re-renders or API calls
   - [ ] Offline capability for basic operations

4. **Compliance Requirements**
   - [ ] GDPR compliance for data handling
   - [ ] Audit trail for all authentication events
   - [ ] Secure password storage and handling
   - [ ] Proper session timeout and cleanup

This implementation plan provides a structured approach to building the authentication system with clear phases, dependencies, and success criteria.