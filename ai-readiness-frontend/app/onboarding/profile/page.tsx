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
import { 
  User, 
  Mail, 
  Briefcase, 
  Building, 
  Camera,
  Upload,
  CheckCircle2
} from 'lucide-react'

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  avatar: z.string().optional()
})

type ProfileFormData = z.infer<typeof profileSchema>

const COMMON_DEPARTMENTS = [
  'Engineering', 'Product', 'Marketing', 'Sales', 'Operations', 
  'HR', 'Finance', 'Legal', 'Customer Success', 'Other'
]

const COMMON_JOB_TITLES = [
  'Software Engineer', 'Product Manager', 'Data Scientist', 'Designer',
  'Marketing Manager', 'Sales Manager', 'Operations Manager', 'Director',
  'VP', 'CTO', 'CEO', 'Other'
]

export default function ProfilePage() {
  const { user } = useAuth()
  const { state, steps, completeStep, nextStep, prevStep, canGoNext, loading } = useOnboarding()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: state.profile?.firstName || user?.profile?.firstName || '',
      lastName: state.profile?.lastName || user?.profile?.lastName || '',
      department: state.profile?.department || user?.profile?.department || '',
      jobTitle: state.profile?.jobTitle || user?.profile?.jobTitle || '',
      avatar: state.profile?.avatar || user?.profile?.avatar || ''
    }
  })

  const watchedAvatar = watch('avatar')

  useEffect(() => {
    if (watchedAvatar) {
      setAvatarPreview(watchedAvatar)
    }
  }, [watchedAvatar])

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Avatar file must be smaller than 5MB')
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setValue('avatar', dataUrl)
        setAvatarPreview(dataUrl)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return

    setIsSaving(true)
    setError(null)

    try {
      // Save profile to backend
      await onboardingService.saveProfile(user.id, {
        firstName: data.firstName,
        lastName: data.lastName,
        department: data.department,
        jobTitle: data.jobTitle,
        avatar: data.avatar,
        preferences: {
          theme: 'dark',
          notifications: true,
          voiceInput: false,
          language: 'en'
        }
      })

      // Update onboarding state
      await completeStep('profile', {
        profile: data
      })

      nextStep()
    } catch (err) {
      console.error('Failed to save profile:', err)
      setError('Failed to save profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleContinue = () => {
    handleSubmit(onSubmit)()
  }

  return (
    <OnboardingLayout
      title="Complete Your Profile"
      subtitle="Tell us a bit about yourself to personalize your experience"
      currentStep={state.currentStep}
      totalSteps={state.totalSteps}
      steps={steps}
      canGoNext={isValid && !isSaving}
      canGoPrev={true}
      onNext={handleContinue}
      onPrev={prevStep}
      isLoading={isSaving}
    >
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar Upload */}
        <Card variant="glass" className="animate-fade-in">
          <CardContent className="p-6 text-center space-y-4">
            <h4 className="font-semibold flex items-center justify-center space-x-2">
              <Camera className="h-5 w-5 text-teal-400" />
              <span>Profile Picture (Optional)</span>
            </h4>
            
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-2 border-border/40 bg-muted/50 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Avatar preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-teal-500 hover:bg-teal-600 rounded-full flex items-center justify-center cursor-pointer transition-colors">
                  <Upload className="h-4 w-4 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                Click the upload button to add a profile picture
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card variant="glass" className="animate-fade-in animation-delay-100">
          <CardContent className="p-6 space-y-6">
            <h4 className="font-semibold flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-teal-400" />
              <span>Basic Information</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="First Name"
                placeholder="Enter your first name"
                leftIcon={User}
                variant="glass"
                error={errors.firstName?.message}
                {...register('firstName')}
                required
              />

              <Input
                label="Last Name"
                placeholder="Enter your last name"
                leftIcon={User}
                variant="glass"
                error={errors.lastName?.message}
                {...register('lastName')}
                required
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={user?.email || ''}
              disabled
              leftIcon={Mail}
              variant="glass"
              description="Your email cannot be changed"
            />
          </CardContent>
        </Card>

        {/* Work Information */}
        <Card variant="glass" className="animate-fade-in animation-delay-200">
          <CardContent className="p-6 space-y-6">
            <h4 className="font-semibold flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-teal-400" />
              <span>Work Information (Optional)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <select
                  {...register('department')}
                  className="w-full h-11 px-3 py-2 rounded-lg border border-input bg-input text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 transition-all duration-300 glass-card"
                >
                  <option value="">Select a department</option>
                  {COMMON_DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Job Title</label>
                <select
                  {...register('jobTitle')}
                  className="w-full h-11 px-3 py-2 rounded-lg border border-input bg-input text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 transition-all duration-300 glass-card"
                >
                  <option value="">Select a job title</option>
                  {COMMON_JOB_TITLES.map(title => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
              <Building className="h-4 w-4 inline mr-2" />
              This information helps us provide more relevant insights and recommendations 
              tailored to your role and department.
            </div>
          </CardContent>
        </Card>
      </form>
    </OnboardingLayout>
  )
}