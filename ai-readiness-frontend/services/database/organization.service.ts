/**
 * Organization Database Service
 * 
 * This service provides all database operations for organizations using
 * the contracts as the single source of truth for data validation.
 */

import { createClient } from '@supabase/supabase-js';
import { 
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  validateOrganization,
  validateOrganizationMember,
  validateOrganizationInvitation,
  OrganizationsTableSchema,
  OrganizationMembersTableSchema,
  OrganizationInvitationsTableSchema,
  MemberRole,
  InvitationStatus
} from '@/contracts/schema';
import { z } from 'zod';

export class OrganizationService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // ORGANIZATION CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new organization
   */
  async createOrganization(data: Partial<Organization>, creatorUserId: string): Promise<Organization> {
    try {
      // Validate input data
      const validatedData = OrganizationsTableSchema.omit({ 
        id: true, 
        created_at: true, 
        updated_at: true 
      }).parse(data);

      // Start a transaction
      const { data: org, error: orgError } = await this.supabase
        .from('organizations')
        .insert(validatedData)
        .select()
        .single();

      if (orgError) throw orgError;

      // Add creator as owner
      const { error: memberError } = await this.supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: creatorUserId,
          role: 'owner',
          status: 'active',
          joined_at: new Date()
        });

      if (memberError) {
        // Rollback by deleting the organization
        await this.supabase.from('organizations').delete().eq('id', org.id as string);
        throw memberError;
      }

      return org as any;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw new Error(`Failed to create organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganization(id: string): Promise<Organization | null> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data as any;
    } catch (error) {
      console.error('Error fetching organization:', error);
      throw new Error(`Failed to fetch organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update organization
   */
  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    try {
      const validatedUpdates = OrganizationsTableSchema.partial().omit({
        id: true,
        created_at: true
      }).parse(updates);

      const { data, error } = await this.supabase
        .from('organizations')
        .update({
          ...validatedUpdates,
          updated_at: new Date()
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;

      return data as any;
    } catch (error) {
      console.error('Error updating organization:', error);
      throw new Error(`Failed to update organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Soft delete organization
   */
  async deleteOrganization(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('organizations')
        .update({ 
          deleted_at: new Date(),
          updated_at: new Date()
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting organization:', error);
      throw new Error(`Failed to delete organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // MEMBER MANAGEMENT
  // ============================================================================

  /**
   * Add member to organization
   */
  async addMember(
    organizationId: string,
    userId: string,
    role: MemberRole = 'member',
    invitedBy?: string
  ): Promise<OrganizationMember> {
    try {
      const memberData = {
        organization_id: organizationId,
        user_id: userId,
        role,
        status: 'active' as const,
        joined_at: new Date(),
        invited_by: invitedBy || null
      };

      const validatedData = OrganizationMembersTableSchema.omit({
        id: true,
        created_at: true,
        updated_at: true
      }).parse(memberData);

      const { data, error } = await this.supabase
        .from('organization_members')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      return data as any;
    } catch (error) {
      console.error('Error adding member:', error);
      throw new Error(`Failed to add member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get organization members
   */
  async getMembers(organizationId: string): Promise<OrganizationMember[]> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select(`
          *,
          user:auth.users!user_id (
            id,
            email,
            user_metadata
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('joined_at', { ascending: false });

      if (error) throw error;

      return data.map(member => member as any);
    } catch (error) {
      console.error('Error fetching members:', error);
      throw new Error(`Failed to fetch members: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    newRole: MemberRole
  ): Promise<OrganizationMember> {
    try {
      // Check if trying to change owner role
      const { data: currentMember } = await this.supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .single();

      if (currentMember?.role === 'owner') {
        throw new Error('Cannot change owner role. Transfer ownership instead.');
      }

      const { data, error } = await this.supabase
        .from('organization_members')
        .update({ 
          role: newRole,
          updated_at: new Date()
        })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return data as any;
    } catch (error) {
      console.error('Error updating member role:', error);
      throw new Error(`Failed to update member role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove member from organization
   */
  async removeMember(
    organizationId: string,
    userId: string,
    removedBy: string
  ): Promise<void> {
    try {
      // Check if trying to remove owner
      const { data: member } = await this.supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .single();

      if (member?.role === 'owner') {
        throw new Error('Cannot remove organization owner');
      }

      const { error } = await this.supabase
        .from('organization_members')
        .update({ 
          status: 'removed',
          removed_at: new Date(),
          removed_by: removedBy,
          updated_at: new Date()
        })
        .eq('organization_id', organizationId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing member:', error);
      throw new Error(`Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // INVITATION MANAGEMENT
  // ============================================================================

  /**
   * Create invitation
   */
  async createInvitation(
    organizationId: string,
    email: string,
    role: MemberRole,
    invitedBy: string,
    message?: string
  ): Promise<OrganizationInvitation> {
    try {
      // Generate secure token
      const token = this.generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const invitationData = {
        organization_id: organizationId,
        email,
        role,
        status: 'pending' as const,
        token,
        expires_at: expiresAt,
        invited_by: invitedBy,
        metadata: {
          message: message || null,
          permissions: []
        }
      };

      const validatedData = OrganizationInvitationsTableSchema.omit({
        id: true,
        created_at: true,
        updated_at: true
      }).parse(invitationData);

      const { data, error } = await this.supabase
        .from('organization_invitations')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      return data as any;
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw new Error(`Failed to create invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<OrganizationMember> {
    try {
      // Get invitation
      const { data: invitation, error: invError } = await this.supabase
        .from('organization_invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (invError) throw new Error('Invalid or expired invitation');

      // Check expiry
      if (new Date(invitation.expires_at as string | number | Date) < new Date()) {
        await this.supabase
          .from('organization_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id as string);
        throw new Error('Invitation has expired');
      }

      // Update invitation status
      await this.supabase
        .from('organization_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date()
        })
        .eq('id', invitation.id as string);

      // Add member
      return await this.addMember(
        invitation.organization_id as string,
        userId,
        invitation.role as MemberRole,
        invitation.invited_by as string
      );
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw new Error(`Failed to accept invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get pending invitations for organization
   */
  async getPendingInvitations(organizationId: string): Promise<OrganizationInvitation[]> {
    try {
      const { data, error } = await this.supabase
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(inv => inv as any);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      throw new Error(`Failed to fetch invitations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if user is member of organization
   */
  async isMember(organizationId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Get user's role in organization
   */
  async getUserRole(organizationId: string, userId: string): Promise<MemberRole | null> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) return null;

      return data.role as MemberRole;
    } catch {
      return null;
    }
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select(`
          organization:organizations!organization_id (*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .is('organizations.deleted_at', null);

      if (error) throw error;

      return data
        .map(item => item.organization)
        .filter(Boolean)
        .map(org => org as any);
    } catch (error) {
      console.error('Error fetching user organizations:', error);
      throw new Error(`Failed to fetch user organizations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate secure token for invitations
   */
  private generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}

// Export singleton instance for use in API routes
export const createOrganizationService = (
  supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: string = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
) => {
  return new OrganizationService(supabaseUrl, supabaseKey);
};