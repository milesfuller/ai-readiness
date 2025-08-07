'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label } from '@/components/ui'
import { Building, Users, Shield, ArrowRight } from 'lucide-react'

export default function OrganizationSetupPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [orgData, setOrgData] = useState({
    name: '',
    industry: '',
    size: '',
    website: '',
    description: ''
  })

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Check if user already has an organization
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('created_by', user.id)
      .single()

    if (existingOrg) {
      router.push('/dashboard')
      return
    }

    setUser(user)
  }

  const handleCreateOrganization = async () => {
    if (!orgData.name || !orgData.industry || !orgData.size) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgData.name,
        industry: orgData.industry,
        size: orgData.size,
        website: orgData.website,
        description: orgData.description,
        created_by: user.id,
        settings: {
          aiReadinessEnabled: true,
          surveyFrequency: 'quarterly'
        }
      })
      .select()
      .single()

    if (orgError) {
      alert('Failed to create organization')
      setLoading(false)
      return
    }

    // Update user to be org admin
    const { error: userError } = await supabase
      .from('users')
      .update({
        organizationId: org.id,
        role: 'org_admin',
        updatedAt: new Date().toISOString()
      })
      .eq('id', user.id)

    if (userError) {
      alert('Failed to update user role')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <MainLayout user={user} currentPath="/organization/setup">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Set Up Your Organization</h1>
          <p className="text-muted-foreground">
            Create your organization to start assessing AI readiness
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-8 mb-8">
          <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-primary bg-primary text-white' : 'border-muted-foreground'}`}>
              1
            </div>
            <span>Basic Info</span>
          </div>
          <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-primary bg-primary text-white' : 'border-muted-foreground'}`}>
              2
            </div>
            <span>Details</span>
          </div>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Organization Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  value={orgData.name}
                  onChange={(e) => setOrgData({...orgData, name: e.target.value})}
                  placeholder="Acme Corporation"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <select
                  id="industry"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={orgData.industry}
                  onChange={(e) => setOrgData({...orgData, industry: e.target.value})}
                  required
                >
                  <option value="">Select Industry</option>
                  <option value="technology">Technology</option>
                  <option value="finance">Finance</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="retail">Retail</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="education">Education</option>
                  <option value="government">Government</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Organization Size *</Label>
                <select
                  id="size"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={orgData.size}
                  onChange={(e) => setOrgData({...orgData, size: e.target.value})}
                  required
                >
                  <option value="">Select Size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501-1000">501-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)} className="flex items-center gap-2">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Additional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website">Website (Optional)</Label>
                <Input
                  id="website"
                  type="url"
                  value={orgData.website}
                  onChange={(e) => setOrgData({...orgData, website: e.target.value})}
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <textarea
                  id="description"
                  className="w-full px-3 py-2 border rounded-lg bg-background min-h-[100px]"
                  value={orgData.description}
                  onChange={(e) => setOrgData({...orgData, description: e.target.value})}
                  placeholder="Brief description of your organization..."
                />
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">What happens next?</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• You'll become the organization admin</li>
                  <li>• You can invite team members</li>
                  <li>• Start AI readiness assessments</li>
                  <li>• Access analytics and reports</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateOrganization}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? 'Creating...' : 'Create Organization'}
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}