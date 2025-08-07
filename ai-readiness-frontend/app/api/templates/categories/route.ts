import { NextRequest, NextResponse } from 'next/server'
import { TemplateCategory } from '@/lib/types'

const TEMPLATE_CATEGORIES = [
  {
    value: 'ai_readiness' as TemplateCategory,
    label: 'AI Readiness',
    description: 'Assess organizational readiness for AI adoption and transformation',
    icon: '🤖',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    value: 'customer_feedback' as TemplateCategory,
    label: 'Customer Feedback',
    description: 'Collect customer satisfaction, NPS, and product feedback',
    icon: '👥',
    color: 'from-green-500 to-emerald-500'
  },
  {
    value: 'employee_engagement' as TemplateCategory,
    label: 'Employee Engagement',
    description: 'Measure employee satisfaction, engagement, and culture',
    icon: '💼',
    color: 'from-purple-500 to-pink-500'
  },
  {
    value: 'market_research' as TemplateCategory,
    label: 'Market Research',
    description: 'Conduct market analysis, competitor research, and trend analysis',
    icon: '📊',
    color: 'from-orange-500 to-red-500'
  },
  {
    value: 'product_evaluation' as TemplateCategory,
    label: 'Product Evaluation',
    description: 'Test products, features, and user experience',
    icon: '📱',
    color: 'from-teal-500 to-blue-500'
  },
  {
    value: 'training_assessment' as TemplateCategory,
    label: 'Training Assessment',
    description: 'Evaluate training effectiveness and learning outcomes',
    icon: '🎓',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    value: 'health_wellness' as TemplateCategory,
    label: 'Health & Wellness',
    description: 'Assess health, wellness, and safety in the workplace',
    icon: '🏥',
    color: 'from-green-500 to-teal-500'
  },
  {
    value: 'event_feedback' as TemplateCategory,
    label: 'Event Feedback',
    description: 'Gather feedback from conferences, meetings, and events',
    icon: '🎪',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    value: 'recruitment' as TemplateCategory,
    label: 'Recruitment',
    description: 'Screen candidates and evaluate hiring processes',
    icon: '👨‍💼',
    color: 'from-gray-600 to-gray-800'
  },
  {
    value: 'ux_research' as TemplateCategory,
    label: 'UX Research',
    description: 'Conduct user experience research and usability testing',
    icon: '🎨',
    color: 'from-pink-500 to-rose-500'
  },
  {
    value: 'compliance' as TemplateCategory,
    label: 'Compliance',
    description: 'Ensure regulatory compliance and policy adherence',
    icon: '📋',
    color: 'from-gray-500 to-slate-600'
  },
  {
    value: 'satisfaction' as TemplateCategory,
    label: 'Satisfaction',
    description: 'General satisfaction surveys for various contexts',
    icon: '😊',
    color: 'from-cyan-500 to-blue-600'
  },
  {
    value: 'performance' as TemplateCategory,
    label: 'Performance',
    description: 'Performance reviews and evaluation assessments',
    icon: '📈',
    color: 'from-emerald-500 to-green-600'
  },
  {
    value: 'custom' as TemplateCategory,
    label: 'Custom',
    description: 'Custom survey templates for specific needs',
    icon: '⚙️',
    color: 'from-slate-500 to-gray-600'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('includeStats') === 'true'

    if (includeStats) {
      // In a real implementation, you would fetch actual usage stats from the database
      const categoriesWithStats = TEMPLATE_CATEGORIES.map(category => ({
        ...category,
        templateCount: Math.floor(Math.random() * 50), // Mock data
        usageCount: Math.floor(Math.random() * 1000)
      }))
      
      return NextResponse.json(categoriesWithStats)
    }

    return NextResponse.json(TEMPLATE_CATEGORIES)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}