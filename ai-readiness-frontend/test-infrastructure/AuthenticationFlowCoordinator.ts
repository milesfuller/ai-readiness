/**
 * Authentication Flow Coordinator
 * Manages authentication states, user sessions, and role-based testing scenarios
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AuthSession {
  sessionId: string;
  userId: string;
  role: UserRole;
  email: string;
  permissions: string[];
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  metadata: Record<string, any>;
}

export interface UserSpec {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  organizationId?: string;
  permissions?: string[];
  metadata?: Record<string, any>;
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  authRequirements: AuthRequirement[];
}

export interface AuthRequirement {
  role: UserRole;
  permissions: string[];
  sessionType: 'persistent' | 'temporary';
}

export type UserRole = 'admin' | 'user' | 'org_admin' | 'anonymous';

export interface AuthConfiguration {
  supabaseUrl: string;
  supabaseAnonKey: string;
  serviceRoleKey: string;
  testUsers: Record<UserRole, UserSpec>;
  sessionTimeout: number;
  persistentStoragePath: string;
}

export class AuthenticationFlowCoordinator extends EventEmitter {
  private config: AuthConfiguration;
  private activeSessions: Map<string, AuthSession> = new Map();
  private persistentStoragePath: string;

  constructor(config?: Partial<AuthConfiguration>) {
    super();
    
    this.config = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      sessionTimeout: 3600000, // 1 hour
      persistentStoragePath: './playwright/.auth',
      testUsers: {
        admin: {
          id: 'test-admin-001',
          email: process.env.TEST_ADMIN_EMAIL || 'testadmin@example.com',
          password: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!',
          role: 'admin',
          firstName: 'Test',
          lastName: 'Admin',
          permissions: ['*'],
          metadata: { createdForTesting: true }
        },
        org_admin: {
          id: 'test-org-admin-001',
          email: process.env.TEST_ORG_ADMIN_EMAIL || 'testorgadmin@example.com',
          password: process.env.TEST_ORG_ADMIN_PASSWORD || 'OrgAdminPassword123!',
          role: 'org_admin',
          firstName: 'Test',
          lastName: 'Org Admin',
          organizationId: 'test-org-001',
          permissions: ['org:read', 'org:write', 'users:read', 'surveys:manage'],
          metadata: { createdForTesting: true }
        },
        user: {
          id: 'test-user-001',
          email: process.env.TEST_USER_EMAIL || 'testuser@example.com',
          password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
          role: 'user',
          firstName: 'Test',
          lastName: 'User',
          organizationId: 'test-org-001',
          permissions: ['surveys:respond', 'profile:read', 'profile:write'],
          metadata: { createdForTesting: true }
        },
        anonymous: {
          id: 'anonymous',
          email: '',
          password: '',
          role: 'anonymous',
          firstName: 'Anonymous',
          lastName: 'User',
          permissions: ['public:read'],
          metadata: { anonymous: true }
        }
      },
      ...config
    };

    this.persistentStoragePath = this.config.persistentStoragePath;
    this.ensureStorageDirectory();
  }

  /**
   * Authenticate as a specific role for testing
   */
  async authenticateAsRole(
    role: UserRole, 
    scenario?: TestScenario
  ): Promise<AuthSession> {
    console.log(`🔐 Authenticating as role: ${role}`);

    try {
      if (role === 'anonymous') {
        return this.createAnonymousSession();
      }

      const userSpec = this.config.testUsers[role];
      if (!userSpec) {
        throw new Error(`No test user configuration found for role: ${role}`);
      }

      // Check if we have a valid existing session
      const existingSession = await this.getExistingSession(role);
      if (existingSession && this.isSessionValid(existingSession)) {
        console.log(`✅ Using existing valid session for role: ${role}`);
        return existingSession;
      }

      // Create new authentication session
      const authSession = await this.performAuthentication(userSpec, scenario);
      
      // Store session for reuse
      this.activeSessions.set(authSession.sessionId, authSession);
      
      console.log(`✅ Successfully authenticated as ${role}`);
      this.emit('auth:success', { role, session: authSession });
      
      return authSession;

    } catch (error) {
      console.error(`❌ Authentication failed for role ${role}:`, error);
      this.emit('auth:failed', { role, error });
      throw error;
    }
  }

  /**
   * Validate current authentication state
   */
  async validateAuthenticationState(session?: AuthSession): Promise<boolean> {
    console.log('🔍 Validating authentication state...');

    try {
      if (session) {
        return this.validateSession(session);
      }

      // Validate all active sessions
      const validationResults = await Promise.all(
        Array.from(this.activeSessions.values()).map(s => this.validateSession(s))
      );

      const allValid = validationResults.every(result => result);
      
      if (allValid) {
        console.log('✅ All authentication states are valid');
      } else {
        console.warn('⚠️ Some authentication states are invalid');
      }

      return allValid;

    } catch (error) {
      console.error('❌ Authentication state validation failed:', error);
      return false;
    }
  }

  /**
   * Persist authentication state for reuse across test runs
   */
  async persistAuthenticationState(session: AuthSession): Promise<void> {
    console.log(`💾 Persisting authentication state for session: ${session.sessionId}`);

    try {
      const sessionData = {
        ...session,
        persistedAt: new Date().toISOString()
      };

      const filePath = path.join(
        this.persistentStoragePath,
        `${session.role}-session.json`
      );

      await fs.writeFile(filePath, JSON.stringify(sessionData, null, 2));
      
      console.log(`✅ Authentication state persisted to: ${filePath}`);
      this.emit('auth:persisted', { session, filePath });

    } catch (error) {
      console.error('❌ Failed to persist authentication state:', error);
      this.emit('auth:persist_failed', { session, error });
      throw error;
    }
  }

  /**
   * Restore authentication state from persistent storage
   */
  async restoreAuthenticationState(sessionId: string): Promise<AuthSession | null> {
    console.log(`🔄 Restoring authentication state for session: ${sessionId}`);

    try {
      // Try to find by session ID first
      let session = this.activeSessions.get(sessionId);
      if (session && this.isSessionValid(session)) {
        return session;
      }

      // Try to restore from persistent storage
      const sessionFiles = await fs.readdir(this.persistentStoragePath);
      const sessionFile = sessionFiles.find(file => file.includes(sessionId));

      if (sessionFile) {
        const filePath = path.join(this.persistentStoragePath, sessionFile);
        const sessionData = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        session = {
          ...sessionData,
          expiresAt: new Date(sessionData.expiresAt)
        };

        if (this.isSessionValid(session)) {
          this.activeSessions.set(session.sessionId, session);
          console.log(`✅ Authentication state restored from: ${filePath}`);
          return session;
        }
      }

      console.log(`⚠️ No valid authentication state found for session: ${sessionId}`);
      return null;

    } catch (error) {
      console.error('❌ Failed to restore authentication state:', error);
      return null;
    }
  }

  /**
   * Set up multi-user testing scenario
   */
  async setupMultiUserScenario(users: UserSpec[]): Promise<AuthSession[]> {
    console.log(`👥 Setting up multi-user scenario with ${users.length} users`);

    try {
      const sessions = await Promise.all(
        users.map(async userSpec => {
          const session = await this.performAuthentication(userSpec);
          this.activeSessions.set(session.sessionId, session);
          return session;
        })
      );

      console.log(`✅ Multi-user scenario set up successfully with ${sessions.length} sessions`);
      this.emit('multi_user:setup_complete', sessions);
      
      return sessions;

    } catch (error) {
      console.error('❌ Failed to set up multi-user scenario:', error);
      this.emit('multi_user:setup_failed', error);
      throw error;
    }
  }

  /**
   * Clean up authentication state
   */
  async cleanupAuthenticationState(): Promise<void> {
    console.log('🧹 Cleaning up authentication state...');

    try {
      // Clear active sessions
      this.activeSessions.clear();

      // Clean up persistent storage (optional - keep for debugging)
      const cleanupPersistent = process.env.CLEANUP_AUTH_STATE === 'true';
      if (cleanupPersistent) {
        try {
          const sessionFiles = await fs.readdir(this.persistentStoragePath);
          await Promise.all(
            sessionFiles
              .filter(file => file.endsWith('-session.json'))
              .map(file => fs.unlink(path.join(this.persistentStoragePath, file)))
          );
          console.log('🗑️ Persistent authentication state cleaned up');
        } catch (error) {
          console.warn('⚠️ Error cleaning up persistent state:', error);
        }
      }

      console.log('✅ Authentication state cleanup completed');
      this.emit('auth:cleanup_complete');

    } catch (error) {
      console.error('❌ Authentication cleanup failed:', error);
      this.emit('auth:cleanup_failed', error);
      throw error;
    }
  }

  /**
   * Get authentication headers for API requests
   */
  async getAuthHeaders(session: AuthSession): Promise<Record<string, string>> {
    if (!this.isSessionValid(session)) {
      throw new Error('Session is invalid or expired');
    }

    return {
      'Authorization': `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      'X-User-Role': session.role,
      'X-User-ID': session.userId
    };
  }

  /**
   * Refresh authentication token if needed
   */
  async refreshAuthenticationToken(session: AuthSession): Promise<AuthSession> {
    console.log(`🔄 Refreshing authentication token for session: ${session.sessionId}`);

    try {
      if (!session.refreshToken) {
        throw new Error('No refresh token available');
      }

      // Implementation would call Supabase refresh endpoint
      // For now, simulate token refresh
      const refreshedSession: AuthSession = {
        ...session,
        accessToken: `refreshed_${session.accessToken}`,
        expiresAt: new Date(Date.now() + this.config.sessionTimeout)
      };

      this.activeSessions.set(refreshedSession.sessionId, refreshedSession);
      
      console.log('✅ Authentication token refreshed successfully');
      this.emit('auth:token_refreshed', refreshedSession);
      
      return refreshedSession;

    } catch (error) {
      console.error('❌ Failed to refresh authentication token:', error);
      this.emit('auth:token_refresh_failed', { session, error });
      throw error;
    }
  }

  // Private helper methods

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.persistentStoragePath, { recursive: true });
    } catch (error) {
      console.warn('⚠️ Failed to create auth storage directory:', error);
    }
  }

  private createAnonymousSession(): AuthSession {
    const sessionId = `anonymous_${Date.now()}`;
    
    return {
      sessionId,
      userId: 'anonymous',
      role: 'anonymous',
      email: '',
      permissions: ['public:read'],
      accessToken: '',
      expiresAt: new Date(Date.now() + this.config.sessionTimeout),
      metadata: { anonymous: true }
    };
  }

  private async getExistingSession(role: UserRole): Promise<AuthSession | null> {
    // Check active sessions first
    const activeSession = Array.from(this.activeSessions.values())
      .find(session => session.role === role);
    
    if (activeSession) {
      return activeSession;
    }

    // Try to restore from persistent storage
    try {
      const filePath = path.join(this.persistentStoragePath, `${role}-session.json`);
      const sessionData = JSON.parse(await fs.readFile(filePath, 'utf8'));
      
      return {
        ...sessionData,
        expiresAt: new Date(sessionData.expiresAt)
      };
    } catch {
      return null;
    }
  }

  private isSessionValid(session: AuthSession): boolean {
    if (!session) return false;
    if (session.role === 'anonymous') return true;
    
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    
    return expiresAt > now && session.accessToken.length > 0;
  }

  private async performAuthentication(
    userSpec: UserSpec, 
    scenario?: TestScenario
  ): Promise<AuthSession> {
    console.log(`🔐 Performing authentication for user: ${userSpec.email}`);

    try {
      // In a real implementation, this would:
      // 1. Call Supabase auth API
      // 2. Handle email confirmation if needed
      // 3. Extract tokens from response
      // 4. Validate permissions
      
      // For now, simulate successful authentication
      const sessionId = `${userSpec.role}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const accessToken = `token_${sessionId}`;
      
      const session: AuthSession = {
        sessionId,
        userId: userSpec.id,
        role: userSpec.role,
        email: userSpec.email,
        permissions: userSpec.permissions || [],
        accessToken,
        refreshToken: `refresh_${sessionId}`,
        expiresAt: new Date(Date.now() + this.config.sessionTimeout),
        metadata: {
          ...userSpec.metadata,
          authenticatedAt: new Date().toISOString(),
          scenario: scenario?.id
        }
      };

      console.log(`✅ Authentication successful for ${userSpec.email}`);
      return session;

    } catch (error) {
      console.error(`❌ Authentication failed for ${userSpec.email}:`, error);
      throw error;
    }
  }

  private async validateSession(session: AuthSession): Promise<boolean> {
    try {
      if (!this.isSessionValid(session)) {
        return false;
      }

      // In a real implementation, this would validate with Supabase
      // For now, simulate validation
      
      return true;
    } catch (error) {
      console.error(`❌ Session validation failed for ${session.sessionId}:`, error);
      return false;
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): AuthSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get session by role
   */
  getSessionByRole(role: UserRole): AuthSession | null {
    return Array.from(this.activeSessions.values())
      .find(session => session.role === role) || null;
  }

  /**
   * Invalidate specific session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    console.log(`🚫 Invalidating session: ${sessionId}`);
    
    this.activeSessions.delete(sessionId);
    
    // Remove from persistent storage
    try {
      const sessionFiles = await fs.readdir(this.persistentStoragePath);
      const sessionFile = sessionFiles.find(file => file.includes(sessionId));
      
      if (sessionFile) {
        await fs.unlink(path.join(this.persistentStoragePath, sessionFile));
      }
    } catch (error) {
      console.warn('⚠️ Error removing persistent session:', error);
    }
    
    this.emit('auth:session_invalidated', sessionId);
  }
}