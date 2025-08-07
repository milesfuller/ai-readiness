/**
 * Client-side Invitation Service
 * Wrapper for invitation API calls - used in client components
 */

export interface InvitationData {
  email: string
  role?: string
  organizationId?: string
  firstName?: string
  lastName?: string
  message?: string
}

export interface InvitationResponse {
  success: boolean
  invitationId?: string
  message?: string
  error?: string
}

class InvitationClient {
  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Request failed: ${response.status}`)
    }

    return response.json()
  }

  async sendInvitation(data: InvitationData): Promise<InvitationResponse> {
    return this.request('/api/invitations', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async validateInvitation(token: string) {
    return this.request(`/api/invitations/validate/${token}`)
  }

  async getInvitations() {
    return this.request('/api/invitations')
  }

  async deleteInvitation(invitationId: string) {
    return this.request(`/api/invitations/${invitationId}`, {
      method: 'DELETE',
    })
  }

  async resendInvitation(invitationId: string) {
    return this.request(`/api/invitations/${invitationId}/resend`, {
      method: 'POST',
    })
  }
}

export const invitationClient = new InvitationClient()