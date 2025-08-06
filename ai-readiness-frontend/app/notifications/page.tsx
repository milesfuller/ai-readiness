import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Bell, CheckCircle, Info, AlertCircle } from 'lucide-react'

export default async function NotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Mock notifications for now
  const notifications = [
    {
      id: 1,
      type: 'success',
      title: 'Survey Completed',
      message: 'Your AI Readiness Assessment has been successfully submitted.',
      time: '2 hours ago',
      icon: CheckCircle,
      iconColor: 'text-green-500'
    },
    {
      id: 2,
      type: 'info',
      title: 'New Survey Available',
      message: 'A new quarterly assessment is ready for your team.',
      time: '1 day ago',
      icon: Info,
      iconColor: 'text-blue-500'
    },
    {
      id: 3,
      type: 'warning',
      title: 'Pending Review',
      message: 'Your organization\'s AI readiness report is ready for review.',
      time: '3 days ago',
      icon: AlertCircle,
      iconColor: 'text-yellow-500'
    }
  ]

  return (
    <MainLayout user={user} currentPath="/notifications">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Stay updated with your AI readiness journey</p>
        </div>

        <div className="space-y-4">
          {notifications.map((notification) => {
            const Icon = notification.icon
            return (
              <Card key={notification.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg bg-background ${notification.iconColor}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{notification.title}</p>
                        <span className="text-xs text-muted-foreground">{notification.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {notifications.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No notifications</p>
              <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}