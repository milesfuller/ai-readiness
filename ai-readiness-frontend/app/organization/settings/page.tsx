'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { RoleGuard } from '@/components/admin/role-guard'
import { PERMISSIONS } from '@/lib/auth/rbac'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Building2, 
  CreditCard, 
  Key, 
  Shield, 
  Database,
  AlertTriangle,
  Save,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Settings,
  Globe
} from 'lucide-react'
import { toast } from 'sonner'

interface OrganizationData {
  id: string
  name: string
  industry: string
  size: string
  website?: string
  description?: string
  settings: {
    allowSelfRegistration: boolean
    defaultRole: 'user' | 'org_admin'
    requireEmailVerification: boolean
    dataRetentionDays: number
    enableAuditLogs: boolean
    enable2FA: boolean
    enableSSO: boolean
    ssoProvider?: string
    ssoConfig?: any
  }
}

interface APIKey {
  id: string
  name: string
  key: string
  masked: boolean
  created_at: string
  last_used?: string
  permissions: string[]
}

interface BillingInfo {
  plan: 'free' | 'professional' | 'enterprise'
  status: 'active' | 'cancelled' | 'past_due'
  nextBillingDate?: string
  usage: {
    surveys: number
    responses: number
    users: number
  }
  limits: {
    surveys: number
    responses: number
    users: number
  }
}

export default function OrganizationSettingsPage() {
  const { user } = useAuth()
  const [organization, setOrganization] = useState<OrganizationData | null>(null)
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Load organization data
  useEffect(() => {
    if (user?.organizationId) {
      loadOrganizationData()
      loadAPIKeys()
      loadBillingInfo()
    }
  }, [user])

  const loadOrganizationData = async () => {
    try {
      const response = await fetch(`/api/organization/${user?.organizationId}`)
      if (response.ok) {
        const data = await response.json()
        setOrganization(data)
      }
    } catch (error) {
      toast.error('Failed to load organization data')
    }
  }

  const loadAPIKeys = async () => {
    try {
      const response = await fetch(`/api/organization/${user?.organizationId}/api-keys`)
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data)
      }
    } catch (error) {
      toast.error('Failed to load API keys')
    }
  }

  const loadBillingInfo = async () => {
    try {
      const response = await fetch(`/api/organization/${user?.organizationId}/billing`)
      if (response.ok) {
        const data = await response.json()
        setBilling(data)
      }
    } catch (error) {
      toast.error('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }

  const saveOrganizationProfile = async (data: Partial<OrganizationData>) => {
    if (!organization) return

    setSaving(true)
    try {
      const response = await fetch(`/api/organization/${organization.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const updated = await response.json()
        setOrganization(updated)
        toast.success('Organization profile updated successfully')
      } else {
        throw new Error('Failed to update organization')
      }
    } catch (error) {
      toast.error('Failed to update organization profile')
    } finally {
      setSaving(false)
    }
  }

  const generateAPIKey = async (name: string, permissions: string[]) => {
    try {
      const response = await fetch(`/api/organization/${user?.organizationId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, permissions })
      })

      if (response.ok) {
        const newKey = await response.json()
        setApiKeys([...apiKeys, newKey])
        toast.success('API key generated successfully')
        return newKey
      }
    } catch (error) {
      toast.error('Failed to generate API key')
    }
  }

  const revokeAPIKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/organization/${user?.organizationId}/api-keys/${keyId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setApiKeys(apiKeys.filter(key => key.id !== keyId))
        toast.success('API key revoked successfully')
      }
    } catch (error) {
      toast.error('Failed to revoke API key')
    }
  }

  const deleteOrganization = async () => {
    if (!organization) return

    try {
      const response = await fetch(`/api/organization/${organization.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Organization deleted successfully')
        // Redirect to a safe page
        window.location.href = '/auth/login'
      }
    } catch (error) {
      toast.error('Failed to delete organization')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Organization Not Found</h3>
            <p className="text-gray-400">Unable to load organization settings.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <RoleGuard
      allowedRoles={['org_admin']}
      requiredPermission={PERMISSIONS.ORG_EDIT_OWN}
      redirectTo="/dashboard"
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-teal-900 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Organization Settings</h1>
              <p className="text-gray-400">Manage your organization's profile, billing, and security settings</p>
            </div>
            <Badge variant="outline" className="text-teal-400 border-teal-400">
              <Building2 className="h-4 w-4 mr-2" />
              {organization.name}
            </Badge>
          </div>

          {/* Settings Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 glass-card p-1">
              <TabsTrigger value="profile" className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Billing</span>
              </TabsTrigger>
              <TabsTrigger value="api-keys" className="flex items-center space-x-2">
                <Key className="h-4 w-4" />
                <span className="hidden sm:inline">API Keys</span>
              </TabsTrigger>
              <TabsTrigger value="data-retention" className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Data</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="danger" className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Danger</span>
              </TabsTrigger>
            </TabsList>

            {/* Organization Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-teal-400" />
                    <span>Organization Profile</span>
                  </CardTitle>
                  <CardDescription>
                    Update your organization's basic information and settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="org-name" className="text-gray-300">Organization Name</Label>
                      <Input
                        id="org-name"
                        value={organization.name}
                        onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry" className="text-gray-300">Industry</Label>
                      <Select
                        value={organization.industry}
                        onValueChange={(value) => setOrganization({ ...organization, industry: value })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="size" className="text-gray-300">Organization Size</Label>
                      <Select
                        value={organization.size}
                        onValueChange={(value) => setOrganization({ ...organization, size: value })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-1000">201-1000 employees</SelectItem>
                          <SelectItem value="1000+">1000+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-gray-300">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={organization.website || ''}
                        onChange={(e) => setOrganization({ ...organization, website: e.target.value })}
                        className="bg-white/5 border-white/20 text-white"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-gray-300">Description</Label>
                    <Textarea
                      id="description"
                      value={organization.description || ''}
                      onChange={(e) => setOrganization({ ...organization, description: e.target.value })}
                      className="bg-white/5 border-white/20 text-white"
                      placeholder="Brief description of your organization..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => saveOrganizationProfile(organization)}
                      loading={saving}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-teal-400" />
                    <span>Billing & Subscription</span>
                  </CardTitle>
                  <CardDescription>
                    Manage your subscription plan and billing information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {billing && (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white capitalize">{billing.plan} Plan</h3>
                          <p className="text-gray-400 capitalize">Status: {billing.status}</p>
                          {billing.nextBillingDate && (
                            <p className="text-sm text-gray-500">
                              Next billing: {new Date(billing.nextBillingDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Badge 
                          variant={billing.status === 'active' ? 'default' : 'destructive'}
                          className={billing.status === 'active' ? 'bg-green-600' : ''}
                        >
                          {billing.status === 'active' ? <CheckCircle className="h-4 w-4 mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                          {billing.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-white/5 border-white/20">
                          <CardContent className="p-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-white">{billing.usage.surveys}</p>
                              <p className="text-sm text-gray-400">Surveys Used</p>
                              <p className="text-xs text-gray-500">of {billing.limits.surveys} limit</p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-white/5 border-white/20">
                          <CardContent className="p-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-white">{billing.usage.responses}</p>
                              <p className="text-sm text-gray-400">Responses</p>
                              <p className="text-xs text-gray-500">of {billing.limits.responses} limit</p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-white/5 border-white/20">
                          <CardContent className="p-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-white">{billing.usage.users}</p>
                              <p className="text-sm text-gray-400">Users</p>
                              <p className="text-xs text-gray-500">of {billing.limits.users} limit</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="flex space-x-4">
                        <Button variant="outline">
                          View Billing History
                        </Button>
                        <Button variant="outline">
                          Update Payment Method
                        </Button>
                        <Button className="bg-teal-600 hover:bg-teal-700">
                          Upgrade Plan
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="api-keys" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Key className="h-5 w-5 text-teal-400" />
                        <span>API Keys & Integrations</span>
                      </CardTitle>
                      <CardDescription>
                        Manage API keys for external integrations
                      </CardDescription>
                    </div>
                    <CreateAPIKeyDialog onCreated={(key) => setApiKeys([...apiKeys, key])} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {apiKeys.length === 0 ? (
                    <div className="text-center py-8">
                      <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">No API keys created yet</p>
                      <p className="text-sm text-gray-500">Create your first API key to get started</p>
                    </div>
                  ) : (
                    apiKeys.map((key) => (
                      <Card key={key.id} className="bg-white/5 border-white/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium text-white">{key.name}</h4>
                              <div className="flex items-center space-x-2">
                                <code className="text-sm text-gray-300 bg-white/10 px-2 py-1 rounded">
                                  {key.masked ? '••••••••••••••••' : key.key}
                                </code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    navigator.clipboard.writeText(key.key)
                                    toast.success('API key copied to clipboard')
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              <p className="text-xs text-gray-500">
                                Created {new Date(key.created_at).toLocaleDateString()}
                                {key.last_used && ` • Last used ${new Date(key.last_used).toLocaleDateString()}`}
                              </p>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => revokeAPIKey(key.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Retention Tab */}
            <TabsContent value="data-retention" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Database className="h-5 w-5 text-teal-400" />
                    <span>Data Retention Policies</span>
                  </CardTitle>
                  <CardDescription>
                    Configure how long your organization's data is retained
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Survey Response Retention</h4>
                        <p className="text-sm text-gray-400">
                          How long to keep survey responses and analytics data
                        </p>
                      </div>
                      <Select
                        value={organization.settings.dataRetentionDays.toString()}
                        onValueChange={(value) => 
                          setOrganization({
                            ...organization,
                            settings: {
                              ...organization.settings,
                              dataRetentionDays: parseInt(value)
                            }
                          })
                        }
                      >
                        <SelectTrigger className="w-48 bg-white/5 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="180">6 months</SelectItem>
                          <SelectItem value="365">1 year</SelectItem>
                          <SelectItem value="1095">3 years</SelectItem>
                          <SelectItem value="-1">Forever</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Enable Audit Logs</h4>
                        <p className="text-sm text-gray-400">
                          Track and log user actions for compliance
                        </p>
                      </div>
                      <Switch
                        checked={organization.settings.enableAuditLogs}
                        onCheckedChange={(checked) =>
                          setOrganization({
                            ...organization,
                            settings: {
                              ...organization.settings,
                              enableAuditLogs: checked
                            }
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => saveOrganizationProfile({ settings: organization.settings })}
                      loading={saving}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Data Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-teal-400" />
                    <span>Security Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Configure two-factor authentication and single sign-on
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-400">
                          Require 2FA for all organization members
                        </p>
                      </div>
                      <Switch
                        checked={organization.settings.enable2FA}
                        onCheckedChange={(checked) =>
                          setOrganization({
                            ...organization,
                            settings: {
                              ...organization.settings,
                              enable2FA: checked
                            }
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Single Sign-On (SSO)</h4>
                        <p className="text-sm text-gray-400">
                          Enable SSO authentication for your organization
                        </p>
                      </div>
                      <Switch
                        checked={organization.settings.enableSSO}
                        onCheckedChange={(checked) =>
                          setOrganization({
                            ...organization,
                            settings: {
                              ...organization.settings,
                              enableSSO: checked
                            }
                          })
                        }
                      />
                    </div>

                    {organization.settings.enableSSO && (
                      <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/20">
                        <div className="space-y-2">
                          <Label className="text-gray-300">SSO Provider</Label>
                          <Select
                            value={organization.settings.ssoProvider || ''}
                            onValueChange={(value) =>
                              setOrganization({
                                ...organization,
                                settings: {
                                  ...organization.settings,
                                  ssoProvider: value
                                }
                              })
                            }
                          >
                            <SelectTrigger className="bg-white/5 border-white/20 text-white">
                              <SelectValue placeholder="Select SSO provider" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="google">Google Workspace</SelectItem>
                              <SelectItem value="microsoft">Microsoft Azure AD</SelectItem>
                              <SelectItem value="okta">Okta</SelectItem>
                              <SelectItem value="auth0">Auth0</SelectItem>
                              <SelectItem value="saml">SAML 2.0</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button variant="outline" className="w-full">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure SSO Settings
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Self-Registration</h4>
                        <p className="text-sm text-gray-400">
                          Allow users to register with your organization domain
                        </p>
                      </div>
                      <Switch
                        checked={organization.settings.allowSelfRegistration}
                        onCheckedChange={(checked) =>
                          setOrganization({
                            ...organization,
                            settings: {
                              ...organization.settings,
                              allowSelfRegistration: checked
                            }
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Email Verification</h4>
                        <p className="text-sm text-gray-400">
                          Require email verification for new users
                        </p>
                      </div>
                      <Switch
                        checked={organization.settings.requireEmailVerification}
                        onCheckedChange={(checked) =>
                          setOrganization({
                            ...organization,
                            settings: {
                              ...organization.settings,
                              requireEmailVerification: checked
                            }
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => saveOrganizationProfile({ settings: organization.settings })}
                      loading={saving}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Security Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Danger Zone Tab */}
            <TabsContent value="danger" className="space-y-6">
              <Card className="glass-card border-red-500/20">
                <CardHeader>
                  <CardTitle className="text-red-400 flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Danger Zone</span>
                  </CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions for your organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-red-400 font-medium">Delete Organization</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          Permanently delete your organization and all associated data.
                          This action cannot be undone.
                        </p>
                        <ul className="text-sm text-gray-500 mt-2 list-disc list-inside">
                          <li>All surveys and responses will be deleted</li>
                          <li>All user accounts will be removed</li>
                          <li>All API keys will be revoked</li>
                          <li>Billing and subscription will be cancelled</li>
                        </ul>
                      </div>
                      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <DialogTrigger asChild>
                          <Button variant="destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Organization
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="glass-card">
                          <DialogHeader>
                            <DialogTitle className="text-red-400">Delete Organization</DialogTitle>
                            <DialogDescription>
                              Are you absolutely sure you want to delete your organization?
                              This action is permanent and cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <p className="text-sm text-gray-300">
                                To confirm deletion, please type your organization name:
                              </p>
                              <p className="text-sm font-mono text-red-400 mt-1">
                                {organization.name}
                              </p>
                            </div>
                            <Input
                              placeholder="Enter organization name to confirm"
                              className="bg-white/5 border-white/20 text-white"
                            />
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setShowDeleteDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={deleteOrganization}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Organization
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RoleGuard>
  )
}

// Create API Key Dialog Component
interface CreateAPIKeyDialogProps {
  onCreated: (key: APIKey) => void
}

function CreateAPIKeyDialog({ onCreated }: CreateAPIKeyDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const handleCreate = async () => {
    if (!name.trim() || permissions.length === 0) {
      toast.error('Please provide a name and select at least one permission')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/organization/${user?.organizationId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), permissions })
      })

      if (response.ok) {
        const newKey = await response.json()
        onCreated(newKey)
        toast.success('API key created successfully')
        setOpen(false)
        setName('')
        setPermissions([])
      } else {
        throw new Error('Failed to create API key')
      }
    } catch (error) {
      toast.error('Failed to create API key')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle className="text-white">Create New API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key for external integrations
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key-name" className="text-gray-300">Key Name</Label>
            <Input
              id="api-key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., External Dashboard Integration"
              className="bg-white/5 border-white/20 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Permissions</Label>
            <div className="space-y-2">
              {[
                { id: 'read_surveys', label: 'Read Surveys' },
                { id: 'read_responses', label: 'Read Survey Responses' },
                { id: 'read_analytics', label: 'Read Analytics' },
                { id: 'write_surveys', label: 'Create/Edit Surveys' },
                { id: 'admin_access', label: 'Admin Access' }
              ].map((perm) => (
                <div key={perm.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={perm.id}
                    checked={permissions.includes(perm.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPermissions([...permissions, perm.id])
                      } else {
                        setPermissions(permissions.filter(p => p !== perm.id))
                      }
                    }}
                    className="rounded border-white/20 bg-white/5"
                  />
                  <Label htmlFor={perm.id} className="text-gray-300 text-sm">
                    {perm.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            loading={loading}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Key className="h-4 w-4 mr-2" />
            Create Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}