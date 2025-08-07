'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useOnboarding } from '@/lib/hooks/use-onboarding'
import { useAuth } from '@/lib/hooks/use-auth'
import { onboardingService } from '@/lib/services/onboarding-service'
import { Organization } from '@/lib/types'
import { 
  Building2, 
  Search, 
  Plus, 
  Users, 
  Globe,
  CheckCircle2,
  Building,
  ArrowRight
} from 'lucide-react'

const createOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  domain: z.string().min(2, 'Domain must be at least 2 characters').max(50)
    .regex(/^[a-zA-Z0-9-]+$/, 'Domain can only contain letters, numbers, and hyphens')
})

type CreateOrgFormData = z.infer<typeof createOrgSchema>

export default function OrganizationPage() {
  const { user } = useAuth()
  const { state, steps, completeStep, nextStep, prevStep } = useOnboarding()
  const [mode, setMode] = useState<'select' | 'create'>('select')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(
    state.selectedOrganization || null
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue
  } = useForm<CreateOrgFormData>({
    resolver: zodResolver(createOrgSchema),
    mode: 'onChange',
    defaultValues: {
      name: state.createdOrganization?.name || '',
      domain: state.createdOrganization?.domain || ''
    }
  })

  // Load available organizations
  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const orgs = await onboardingService.getOrganizations()
        setOrganizations(orgs)
        
        // Auto-detect organization from email domain
        if (user?.email && orgs.length > 0) {
          const emailDomain = user.email.split('@')[1]?.toLowerCase()
          const matchingOrg = orgs.find(org => 
            org.domain?.toLowerCase() === emailDomain
          )
          if (matchingOrg && !selectedOrg) {
            setSelectedOrg(matchingOrg)
          }
        }
      } catch (err) {
        console.error('Failed to load organizations:', err)
        setError('Failed to load organizations')
      } finally {
        setLoading(false)
      }
    }

    loadOrganizations()
  }, [user?.email, selectedOrg])

  // Auto-fill domain from organization name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const domain = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 20)
    setValue('domain', domain)
  }

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.domain?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectOrganization = async (org: Organization) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Assign user to selected organization
      await onboardingService.assignUserToOrganization(user!.id, org.id, 'user')

      // Complete the organization step
      await completeStep('organization', {
        selectedOrganization: org
      })

      nextStep()
    } catch (err) {
      console.error('Failed to join organization:', err)
      setError('Failed to join organization. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateOrganization = async (data: CreateOrgFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Create new organization
      const newOrg = await onboardingService.createOrganization({
        name: data.name,
        domain: data.domain,
        settings: {
          allowSelfRegistration: true,
          defaultRole: 'user',
          requireEmailVerification: false,
          dataRetentionDays: 365,
          enableAuditLogs: true,
          enable2FA: false,
          enableSSO: false
        }
      }, user!.id)

      // Complete the organization step
      await completeStep('organization', {
        createdOrganization: newOrg,
        selectedOrganization: newOrg
      })

      nextStep()
    } catch (err) {
      console.error('Failed to create organization:', err)
      setError('Failed to create organization. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContinue = () => {
    if (mode === 'create') {
      handleSubmit(handleCreateOrganization)()
    } else if (selectedOrg) {
      handleSelectOrganization(selectedOrg)
    }
  }

  return (
    <OnboardingLayout
      title="Join Your Organization"
      subtitle="Connect with your team or create a new organization"
      currentStep={state.currentStep}
      totalSteps={state.totalSteps}
      steps={steps}
      canGoNext={(mode === 'select' && !!selectedOrg) || (mode === 'create' && isValid)}
      canGoPrev={true}
      onNext={handleContinue}
      onPrev={prevStep}
      isLoading={isSubmitting}
    >
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-center">
          {error}
        </div>
      )}

      {/* Mode Selector */}
      <div className="flex bg-muted/30 rounded-lg p-1 mb-6 animate-fade-in">
        <button
          type="button"
          onClick={() => setMode('select')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            mode === 'select' 
              ? 'bg-card text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Join Existing
        </button>
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            mode === 'create' 
              ? 'bg-card text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Create New
        </button>
      </div>

      {mode === 'select' ? (
        <div className="space-y-6">
          {/* Email Domain Suggestion */}
          {user?.email && (
            <Card variant="glass" className="animate-fade-in">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-teal-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      We detected your email domain: <span className="text-teal-400">
                        {user.email.split('@')[1]}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      We'll look for organizations matching your domain
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <div className="animate-fade-in animation-delay-100">
            <Input
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={Search}
              variant="glass"
            />
          </div>

          {/* Organizations List */}
          <div className="space-y-3 animate-fade-in animation-delay-200">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} variant="glass">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="skeleton w-10 h-10 rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="skeleton h-4 w-32 rounded" />
                          <div className="skeleton h-3 w-24 rounded" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredOrganizations.length === 0 ? (
              <Card variant="glass">
                <CardContent className="p-8 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Organizations Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm 
                      ? `No organizations match "${searchTerm}"`
                      : 'No organizations available to join'
                    }
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setMode('create')}
                    leftIcon={Plus}
                  >
                    Create Your Organization
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredOrganizations.map((org) => (
                  <Card 
                    key={org.id}
                    variant={selectedOrg?.id === org.id ? "bordered" : "glass"}
                    className={`cursor-pointer transition-all hover:scale-[1.02] ${
                      selectedOrg?.id === org.id ? 'border-teal-500/40' : ''
                    }`}
                    onClick={() => setSelectedOrg(org)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/20 rounded flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-teal-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{org.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            @{org.domain}
                          </p>
                        </div>
                        {selectedOrg?.id === org.id && (
                          <CheckCircle2 className="h-5 w-5 text-teal-400" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card variant="glass" className="animate-fade-in">
            <CardContent className="p-6 space-y-6">
              <div className="text-center space-y-2">
                <Building className="h-12 w-12 text-teal-400 mx-auto" />
                <h3 className="text-lg font-semibold">Create Your Organization</h3>
                <p className="text-muted-foreground">
                  Set up a new organization and invite your team members
                </p>
              </div>

              <form onSubmit={handleSubmit(handleCreateOrganization)} className="space-y-4">
                <Input
                  label="Organization Name"
                  placeholder="Acme Inc."
                  leftIcon={Building2}
                  variant="glass"
                  error={errors.name?.message}
                  {...register('name')}
                  onChange={(e) => {
                    register('name').onChange(e)
                    handleNameChange(e)
                  }}
                  required
                />

                <Input
                  label="Domain"
                  placeholder="acme-inc"
                  leftIcon={Globe}
                  variant="glass"
                  error={errors.domain?.message}
                  description="This will be used for your organization's unique identifier"
                  {...register('domain')}
                  required
                />
              </form>

              <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4 space-y-2">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-teal-400" />
                  <span className="text-sm font-medium text-teal-400">
                    Organization Admin
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  You'll be assigned as the organization administrator and can invite team members after setup.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </OnboardingLayout>
  )
}