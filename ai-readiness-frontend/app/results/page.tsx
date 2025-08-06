import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardHeader, CardTitle, CardContent, Button, Progress } from '@/components/ui'
import { BarChart3, TrendingUp, Award, Download, Calendar } from 'lucide-react'

export default async function ResultsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Mock results data
  const results = [
    {
      id: 1,
      date: '2024-03-15',
      score: 73,
      status: 'Completed',
      categories: {
        technology: 85,
        data: 68,
        culture: 72,
        strategy: 65,
        governance: 75
      }
    },
    {
      id: 2,
      date: '2024-01-10',
      score: 68,
      status: 'Completed',
      categories: {
        technology: 78,
        data: 62,
        culture: 68,
        strategy: 60,
        governance: 72
      }
    }
  ]

  return (
    <MainLayout user={user} currentPath="/results">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Assessment Results</h1>
          <p className="text-muted-foreground">View and analyze your AI readiness assessment results</p>
        </div>

        {/* Latest Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-teal-400" />
                <span>Latest Assessment</span>
              </span>
              <span className="text-sm text-muted-foreground">March 15, 2024</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-teal-400 mb-2">73%</div>
                <p className="text-sm text-muted-foreground">Overall AI Readiness Score</p>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">+5% from last assessment</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Technology Infrastructure</span>
                    <span>85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Data & Analytics</span>
                    <span>68%</span>
                  </div>
                  <Progress value={68} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Organizational Culture</span>
                    <span>72%</span>
                  </div>
                  <Progress value={72} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Strategic Alignment</span>
                    <span>65%</span>
                  </div>
                  <Progress value={65} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Risk & Governance</span>
                    <span>75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6 pt-6 border-t">
              <Button className="flex-1">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Detailed Analysis
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Assessment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Assessment History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Assessment #{result.id}</p>
                      <p className="text-sm text-muted-foreground">{result.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-teal-400">{result.score}%</p>
                      <p className="text-sm text-muted-foreground">{result.status}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <Button size="sm" variant="outline">View Details</Button>
                    <Button size="sm" variant="outline">Compare</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}