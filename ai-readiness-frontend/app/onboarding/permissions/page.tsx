'use client'

import { useState, useEffect } from 'react'
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOnboarding } from '@/lib/hooks/use-onboarding'
import { useAuth } from '@/lib/hooks/use-auth'
import { onboardingService } from '@/lib/services/onboarding-service'
import { UserRole } from '@/lib/types'
import { 
  Shield, 
  Crown, 
  Users, 
  User,
  CheckCircle2,
  Settings,
  BarChart3,
  FileText,
  UserCheck
} from 'lucide-react'

const ROLE_DEFINITIONS = {
  user: {
    icon: User,
    title: 'Team Member',
    description: 'Standard access for individual contributors',
    permissions: [
      'Complete AI readiness assessments',
      'View personal assessment results',
      'Access basic analytics and insights',
      'Participate in team surveys'
    ],
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20'
  },
  org_admin: {
    icon: Users,
    title: 'Organization Admin',
    description: 'Full access to manage organization and members',
    permissions: [
      'All Team Member permissions',
      'Manage organization members and roles',
      'Access advanced analytics and reports',
      'Create and manage surveys',
      'Export organizational data',
      'Configure organization settings'
    ],
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20'
  },
  system_admin: {
    icon: Crown,
    title: 'System Administrator',
    description: 'Full system access (automatically assigned)',
    permissions: [
      'All Organization Admin permissions',
      'Manage system-wide settings',
      'Access all organizations',
      'System monitoring and maintenance'
    ],
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
    disabled: true
  }
}

export default function PermissionsPage() {
  const { user } = useAuth()
  const { state, steps, completeStep, nextStep, prevStep } = useOnboarding()
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    state.selectedRole || 'user'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine available roles based on organization context
  const availableRoles: UserRole[] = (() => {
    const roles: UserRole[] = ['user']
    
    // If user created the organization, they should be org_admin
    if (state.createdOrganization) {
      roles.push('org_admin')
      // Auto-select org_admin for organization creators
      if (selectedRole === 'user') {
        setSelectedRole('org_admin')
      }
    }
    // If joining existing organization, only user role available unless invited as admin
    else if (state.selectedOrganization) {
      // Could add logic here to check if user was invited with admin privileges
    }
    
    return roles
  })()

  const handleContinue = async () => {
    if (!user || !selectedRole) return

    setIsSubmitting(true)
    setError(null)

    try {
      // If user created organization, they're automatically assigned as admin
      if (state.createdOrganization && selectedRole === 'org_admin') {
        // Already handled in organization creation
      } else if (state.selectedOrganization) {
        // Update role if joining existing organization
        await onboardingService.assignUserToOrganization(
          user.id, 
          state.selectedOrganization.id, 
          selectedRole
        )
      }

      // Complete permissions step
      await completeStep('permissions', {
        selectedRole,
        permissions: ROLE_DEFINITIONS[selectedRole].permissions
      })

      nextStep()
    } catch (err) {
      console.error('Failed to assign role:', err)
      setError('Failed to assign role. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedRoleData = ROLE_DEFINITIONS[selectedRole]

  return (
    <OnboardingLayout
      title="Choose Your Role"
      subtitle="Select the role that best matches your responsibilities"
      currentStep={state.currentStep}
      totalSteps={state.totalSteps}
      steps={steps}
      canGoNext={!!selectedRole}
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

      <div className="space-y-6">
        {/* Organization Context */}
        {(state.selectedOrganization || state.createdOrganization) && (
          <Card variant="glass" className="animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-teal-400" />
                <div>
                  <p className="font-medium">
                    {state.createdOrganization ? 'Organization Created' : 'Joining Organization'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(state.selectedOrganization || state.createdOrganization)?.name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role Selection */}
        <div className="space-y-4 animate-fade-in animation-delay-100">
          {availableRoles.map((role) => {
            const roleData = ROLE_DEFINITIONS[role]
            const Icon = roleData.icon
            const isSelected = selectedRole === role
            const isDisabled = (roleData as any).disabled || false

            return (
              <Card 
                key={role}
                variant={isSelected ? "bordered" : "glass"}
                className={`cursor-pointer transition-all hover:scale-[1.02] ${
                  isSelected ? 'border-teal-500/40' : ''
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isDisabled && setSelectedRole(role)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${roleData.bgColor} rounded-lg flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${roleData.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{roleData.title}</h3>
                        <p className="text-sm text-muted-foreground font-normal">
                          {roleData.description}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-teal-400" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center space-x-2">
                      <UserCheck className="h-4 w-4" />
                      <span>Permissions Included:</span>
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {roleData.permissions.map((permission, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-teal-400 mt-1">•</span>
                          <span>{permission}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Selected Role Summary */}
        {selectedRole && (
          <Card variant="glass" className="animate-fade-in animation-delay-200">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className={`w-16 h-16 ${selectedRoleData.bgColor} rounded-full flex items-center justify-center mx-auto`}>
                  <selectedRoleData.icon className={`h-8 w-8 ${selectedRoleData.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    You've selected: {selectedRoleData.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedRoleData.description}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div className="flex items-center justify-center space-x-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-teal-400" />
                    <span>Analytics Access</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm">
                    <FileText className="h-4 w-4 text-teal-400" />
                    <span>Survey Management</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm">
                    <Settings className="h-4 w-4 text-teal-400" />
                    <span>
                      {selectedRole === 'org_admin' ? 'Full' : 'Basic'} Settings
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role Change Notice */}
        <div className="text-center text-sm text-muted-foreground animate-fade-in animation-delay-300">
          <p>
            Your role can be changed later by an organization administrator.
            <br />
            You'll have access to all features appropriate for your selected role.
          </p>
        </div>
      </div>
    </OnboardingLayout>
  )
}