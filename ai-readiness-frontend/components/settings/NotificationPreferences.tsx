'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  Mail, 
  Smartphone,
  MessageSquare,
  Clock,
  Calendar,
  Shield,
  AlertCircle,
  CheckCircle,
  Save,
  TestTube,
  Volume2,
  VolumeX
} from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'
import { NotificationType, NotificationCategory, NotificationPriority } from '@/lib/services/notification.service'

interface NotificationPreferences {
  email_enabled: boolean
  in_app_enabled: boolean
  push_enabled: boolean
  sms_enabled: boolean
  categories: NotificationCategory[]
  min_priority: NotificationPriority
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  frequency: 'instant' | 'digest_daily' | 'digest_weekly'
  email_digest_time: string
  weekly_digest_day: number
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_enabled: true,
    in_app_enabled: true,
    push_enabled: false,
    sms_enabled: false,
    categories: Object.values(NotificationCategory),
    min_priority: NotificationPriority.LOW,
    quiet_hours_start: null,
    quiet_hours_end: null,
    frequency: 'instant',
    email_digest_time: '09:00',
    weekly_digest_day: 1 // Monday
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences)
        setQuietHoursEnabled(!!data.preferences.quiet_hours_start)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/v1/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...preferences,
          quiet_hours_start: quietHoursEnabled ? preferences.quiet_hours_start : null,
          quiet_hours_end: quietHoursEnabled ? preferences.quiet_hours_end : null
        })
      })
      
      if (!response.ok) throw new Error('Failed to save preferences')
      
      toast({
        title: 'Success',
        description: 'Notification preferences updated successfully'
      })
      
      setHasChanges(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const testNotification = async (type: NotificationType) => {
    try {
      const response = await fetch('/api/v1/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ type })
      })
      
      if (!response.ok) throw new Error('Failed to send test notification')
      
      toast({
        title: 'Test Sent',
        description: `Test ${type.toLowerCase()} notification sent successfully`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test notification',
        variant: 'destructive'
      })
    }
  }

  const toggleCategory = (category: NotificationCategory) => {
    const newCategories = preferences.categories.includes(category)
      ? preferences.categories.filter(c => c !== category)
      : [...preferences.categories, category]
    
    setPreferences(prev => ({ ...prev, categories: newCategories }))
    setHasChanges(true)
  }

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const categoryInfo = {
    [NotificationCategory.SYSTEM]: { icon: Shield, label: 'System', description: 'Important system updates and maintenance' },
    [NotificationCategory.SECURITY]: { icon: Shield, label: 'Security', description: 'Security alerts and authentication' },
    [NotificationCategory.SURVEY]: { icon: MessageSquare, label: 'Surveys', description: 'Survey invitations and reminders' },
    [NotificationCategory.REPORT]: { icon: Calendar, label: 'Reports', description: 'Report generation and delivery' },
    [NotificationCategory.USER]: { icon: Bell, label: 'User', description: 'User account related notifications' },
    [NotificationCategory.ORGANIZATION]: { icon: Shield, label: 'Organization', description: 'Organization updates and changes' },
    [NotificationCategory.BILLING]: { icon: AlertCircle, label: 'Billing', description: 'Billing and subscription updates' }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Manage how and when you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="channels" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="channels">Channels</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="test">Test</TabsTrigger>
            </TabsList>

            <TabsContent value="channels" className="space-y-6">
              <div className="space-y-4">
                {/* Email Notifications */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <div>
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.email_enabled}
                    onCheckedChange={(checked) => updatePreference('email_enabled', checked)}
                  />
                </div>

                {/* In-App Notifications */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-gray-500" />
                    <div>
                      <Label className="text-base">In-App Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Show notifications within the application
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.in_app_enabled}
                    onCheckedChange={(checked) => updatePreference('in_app_enabled', checked)}
                  />
                </div>

                {/* Push Notifications */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-gray-500" />
                    <div>
                      <Label className="text-base">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Browser push notifications (coming soon)
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.push_enabled}
                    onCheckedChange={(checked) => updatePreference('push_enabled', checked)}
                    disabled
                  />
                </div>

                {/* SMS Notifications */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-gray-500" />
                    <div>
                      <Label className="text-base">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Text message notifications (coming soon)
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.sms_enabled}
                    onCheckedChange={(checked) => updatePreference('sms_enabled', checked)}
                    disabled
                  />
                </div>
              </div>

              <Separator />

              {/* Notification Frequency */}
              <div className="space-y-4">
                <Label>Email Frequency</Label>
                <Select
                  value={preferences.frequency}
                  onValueChange={(value) => updatePreference('frequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant</SelectItem>
                    <SelectItem value="digest_daily">Daily Digest</SelectItem>
                    <SelectItem value="digest_weekly">Weekly Digest</SelectItem>
                  </SelectContent>
                </Select>

                {preferences.frequency === 'digest_daily' && (
                  <div className="space-y-2">
                    <Label>Daily Digest Time</Label>
                    <Input
                      type="time"
                      value={preferences.email_digest_time}
                      onChange={(e) => updatePreference('email_digest_time', e.target.value)}
                    />
                  </div>
                )}

                {preferences.frequency === 'digest_weekly' && (
                  <div className="space-y-2">
                    <Label>Weekly Digest Day</Label>
                    <Select
                      value={preferences.weekly_digest_day.toString()}
                      onValueChange={(value) => updatePreference('weekly_digest_day', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Choose which types of notifications you want to receive
              </p>
              <div className="space-y-3">
                {Object.values(NotificationCategory).map(category => {
                  const info = categoryInfo[category]
                  const Icon = info.icon
                  const isEnabled = preferences.categories.includes(category)
                  
                  return (
                    <div
                      key={category}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        isEnabled ? 'bg-teal-50 border-teal-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-5 w-5 ${isEnabled ? 'text-teal-600' : 'text-gray-500'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{info.label}</span>
                              {isEnabled && (
                                <CheckCircle className="h-4 w-4 text-teal-600" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {info.description}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleCategory(category)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <Separator />

              {/* Minimum Priority */}
              <div className="space-y-4">
                <Label>Minimum Priority Level</Label>
                <Select
                  value={preferences.min_priority}
                  onValueChange={(value) => updatePreference('min_priority', value as NotificationPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NotificationPriority.LOW}>All Notifications</SelectItem>
                    <SelectItem value={NotificationPriority.MEDIUM}>Medium Priority & Above</SelectItem>
                    <SelectItem value={NotificationPriority.HIGH}>High Priority & Above</SelectItem>
                    <SelectItem value={NotificationPriority.URGENT}>Urgent Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Only receive notifications that meet or exceed this priority level
                </p>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              {/* Quiet Hours */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Quiet Hours</Label>
                    <p className="text-sm text-muted-foreground">
                      Pause non-urgent notifications during specific hours
                    </p>
                  </div>
                  <Switch
                    checked={quietHoursEnabled}
                    onCheckedChange={setQuietHoursEnabled}
                  />
                </div>

                {quietHoursEnabled && (
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <VolumeX className="h-4 w-4" />
                        Start Time
                      </Label>
                      <Input
                        type="time"
                        value={preferences.quiet_hours_start || '22:00'}
                        onChange={(e) => updatePreference('quiet_hours_start', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4" />
                        End Time
                      </Label>
                      <Input
                        type="time"
                        value={preferences.quiet_hours_end || '08:00'}
                        onChange={(e) => updatePreference('quiet_hours_end', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Urgent and security notifications will always be delivered regardless of quiet hours.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Send test notifications to verify your settings
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => testNotification(NotificationType.EMAIL)}
                  disabled={!preferences.email_enabled}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Test Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testNotification(NotificationType.IN_APP)}
                  disabled={!preferences.in_app_enabled}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Test In-App
                </Button>
                <Button
                  variant="outline"
                  disabled
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Test Push
                </Button>
                <Button
                  variant="outline"
                  disabled
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Test SMS
                </Button>
              </div>
              <Alert>
                <TestTube className="h-4 w-4" />
                <AlertDescription>
                  Test notifications will be sent to your registered email and phone number.
                  Make sure your preferences are saved before testing.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          {hasChanges && (
            <div className="mt-6 flex justify-end">
              <Button onClick={savePreferences} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default NotificationPreferences