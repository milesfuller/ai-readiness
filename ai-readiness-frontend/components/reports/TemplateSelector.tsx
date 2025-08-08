'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  FileText, 
  Clock, 
  Download, 
  Search, 
  Filter,
  Eye,
  CheckCircle2,
  BarChart3,
  PieChart,
  TrendingUp,
  Shield,
  Users,
  Database,
  Zap,
  FileSpreadsheet,
  Star,
  ArrowRight
} from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string
  category: 'assessment' | 'compliance' | 'analytics' | 'governance' | 'strategy'
  estimatedTime: string
  sections: string[]
  formats: string[]
  icon: React.ComponentType<{ className?: string }>
  featured: boolean
  rating: number
  usageCount: number
  preview?: {
    sampleSections: string[]
    sampleCharts: string[]
  }
}

const templates: Template[] = [
  {
    id: 'comprehensive-assessment',
    name: 'Comprehensive AI Readiness Assessment',
    description: 'Complete evaluation of your organization\'s AI readiness across all dimensions',
    category: 'assessment',
    estimatedTime: '45-60 minutes',
    sections: [
      'Executive Summary',
      'Current State Analysis',
      'Capability Assessment',
      'Gap Analysis',
      'Recommendations',
      'Implementation Roadmap'
    ],
    formats: ['PDF', 'PowerPoint', 'Excel', 'Word'],
    icon: BarChart3,
    featured: true,
    rating: 4.9,
    usageCount: 1245,
    preview: {
      sampleSections: ['Leadership Commitment', 'Data Infrastructure', 'Talent & Skills'],
      sampleCharts: ['Maturity Matrix', 'Score Distribution', 'Priority Heat Map']
    }
  },
  {
    id: 'quick-assessment',
    name: 'Quick AI Readiness Check',
    description: 'Rapid overview of key AI readiness indicators for initial evaluation',
    category: 'assessment',
    estimatedTime: '15-20 minutes',
    sections: [
      'Executive Summary',
      'Key Metrics Overview',
      'Priority Areas',
      'Next Steps'
    ],
    formats: ['PDF', 'PowerPoint'],
    icon: Zap,
    featured: false,
    rating: 4.6,
    usageCount: 892,
    preview: {
      sampleSections: ['Strategic Alignment', 'Technical Infrastructure', 'Risk Management'],
      sampleCharts: ['Readiness Score', 'Category Breakdown']
    }
  },
  {
    id: 'compliance-report',
    name: 'AI Governance & Compliance Report',
    description: 'Detailed analysis of AI governance frameworks and regulatory compliance',
    category: 'compliance',
    estimatedTime: '30-40 minutes',
    sections: [
      'Regulatory Landscape',
      'Governance Framework',
      'Compliance Status',
      'Risk Assessment',
      'Action Plan'
    ],
    formats: ['PDF', 'Word', 'Excel'],
    icon: Shield,
    featured: true,
    rating: 4.8,
    usageCount: 678,
    preview: {
      sampleSections: ['GDPR Compliance', 'Ethical AI Principles', 'Audit Trail'],
      sampleCharts: ['Compliance Matrix', 'Risk Heat Map']
    }
  },
  {
    id: 'strategic-roadmap',
    name: 'AI Strategy & Roadmap',
    description: 'Strategic planning document with implementation timeline and milestones',
    category: 'strategy',
    estimatedTime: '40-50 minutes',
    sections: [
      'Strategic Vision',
      'Current State',
      'Target State',
      'Implementation Plan',
      'Resource Requirements',
      'Timeline & Milestones'
    ],
    formats: ['PDF', 'PowerPoint', 'Excel'],
    icon: TrendingUp,
    featured: false,
    rating: 4.7,
    usageCount: 534,
    preview: {
      sampleSections: ['Vision Statement', '3-Year Roadmap', 'Investment Plan'],
      sampleCharts: ['Timeline View', 'Resource Allocation', 'ROI Projection']
    }
  },
  {
    id: 'analytics-dashboard',
    name: 'AI Analytics Dashboard Report',
    description: 'Data-driven insights with visualizations and trend analysis',
    category: 'analytics',
    estimatedTime: '25-35 minutes',
    sections: [
      'Key Performance Indicators',
      'Trend Analysis',
      'Comparative Metrics',
      'Insights & Recommendations'
    ],
    formats: ['PDF', 'Excel', 'PowerPoint'],
    icon: PieChart,
    featured: false,
    rating: 4.5,
    usageCount: 423,
    preview: {
      sampleSections: ['KPI Dashboard', 'Performance Trends', 'Benchmarking'],
      sampleCharts: ['Time Series', 'Comparison Charts', 'Distribution Analysis']
    }
  },
  {
    id: 'team-readiness',
    name: 'Team & Skills Readiness Report',
    description: 'Assessment of human capital and training needs for AI adoption',
    category: 'governance',
    estimatedTime: '35-45 minutes',
    sections: [
      'Team Assessment',
      'Skills Gap Analysis',
      'Training Recommendations',
      'Organizational Change Plan'
    ],
    formats: ['PDF', 'Excel', 'PowerPoint'],
    icon: Users,
    featured: false,
    rating: 4.4,
    usageCount: 356,
    preview: {
      sampleSections: ['Current Skills', 'Required Competencies', 'Training Matrix'],
      sampleCharts: ['Skills Gap', 'Training Timeline', 'Resource Plan']
    }
  }
]

const categories = [
  { id: 'all', name: 'All Templates', count: templates.length },
  { id: 'assessment', name: 'Assessment', count: templates.filter(t => t.category === 'assessment').length },
  { id: 'compliance', name: 'Compliance', count: templates.filter(t => t.category === 'compliance').length },
  { id: 'analytics', name: 'Analytics', count: templates.filter(t => t.category === 'analytics').length },
  { id: 'governance', name: 'Governance', count: templates.filter(t => t.category === 'governance').length },
  { id: 'strategy', name: 'Strategy', count: templates.filter(t => t.category === 'strategy').length }
]

interface TemplateSelectorProps {
  onTemplateSelect: (template: Template) => void
  selectedTemplate?: Template | null
  className?: string
}

export function TemplateSelector({ onTemplateSelect, selectedTemplate, className }: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null)

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           template.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
      return matchesSearch && matchesCategory
    }).sort((a, b) => {
      // Featured templates first, then by rating
      if (a.featured && !b.featured) return -1
      if (!a.featured && b.featured) return 1
      return b.rating - a.rating
    })
  }, [searchQuery, selectedCategory])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'assessment': return BarChart3
      case 'compliance': return Shield
      case 'analytics': return PieChart
      case 'governance': return Users
      case 'strategy': return TrendingUp
      default: return FileText
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Choose Report Template</h2>
          <p className="text-muted-foreground">
            Select from our library of professionally designed AI readiness report templates
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={Search}
              className="w-full"
              clearable
              onClear={() => setSearchQuery('')}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => {
              const Icon = getCategoryIcon(category.id)
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="shrink-0"
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {category.name}
                  <Badge variant="secondary" className="ml-2">
                    {category.count}
                  </Badge>
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTemplates.map((template) => {
          const Icon = template.icon
          const isSelected = selectedTemplate?.id === template.id
          const isHovered = hoveredTemplate === template.id

          return (
            <Card
              key={template.id}
              variant={isSelected ? "gradient" : "glass"}
              className={cn(
                "cursor-pointer transition-all duration-300 group relative",
                isSelected && "ring-2 ring-teal-500/50 shadow-xl shadow-teal-500/20",
                isHovered && "scale-[1.02] shadow-2xl"
              )}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
              onClick={() => onTemplateSelect(template)}
            >
              {/* Featured Badge */}
              {template.featured && (
                <div className="absolute -top-2 -right-2 z-10">
                  <Badge variant="default" className="bg-gradient-to-r from-teal-500 to-purple-500">
                    <Star className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                </div>
              )}

              {/* Selected Check */}
              {isSelected && (
                <div className="absolute top-4 right-4 z-10">
                  <CheckCircle2 className="h-6 w-6 text-teal-400" />
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-lg border transition-all duration-300",
                    isSelected 
                      ? "bg-teal-500/20 border-teal-500/40" 
                      : "bg-muted border-border group-hover:border-teal-500/40"
                  )}>
                    <Icon className={cn(
                      "h-6 w-6 transition-colors duration-300",
                      isSelected ? "text-teal-400" : "text-muted-foreground group-hover:text-teal-400"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg leading-tight mb-1">
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {template.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Quick Stats */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {template.estimatedTime}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      {template.rating}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {template.usageCount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Sections Preview */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Includes ({template.sections.length} sections):</h4>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {template.sections.slice(0, 4).map((section, index) => (
                      <div key={index} className="flex items-center gap-1 text-muted-foreground">
                        <div className="w-1 h-1 bg-teal-500 rounded-full shrink-0" />
                        {section}
                      </div>
                    ))}
                    {template.sections.length > 4 && (
                      <div className="col-span-2 text-muted-foreground italic">
                        +{template.sections.length - 4} more sections
                      </div>
                    )}
                  </div>
                </div>

                {/* Formats */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Available Formats:</h4>
                  <div className="flex gap-2 flex-wrap">
                    {template.formats.map((format) => (
                      <Badge key={format} variant="outline" className="text-xs">
                        <FileSpreadsheet className="h-3 w-3 mr-1" />
                        {format}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Preview on Hover */}
                {isHovered && template.preview && (
                  <div className="absolute inset-0 bg-background/95 backdrop-blur-sm rounded-xl p-6 animate-fade-in z-20">
                    <div className="space-y-4">
                      <h4 className="font-semibold gradient-text">Template Preview</h4>
                      
                      <div>
                        <h5 className="text-sm font-medium mb-2">Sample Sections:</h5>
                        <div className="space-y-1">
                          {template.preview.sampleSections.map((section, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <ArrowRight className="h-3 w-3 text-teal-500" />
                              {section}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium mb-2">Included Charts:</h5>
                        <div className="space-y-1">
                          {template.preview.sampleCharts.map((chart, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <PieChart className="h-3 w-3 text-purple-500" />
                              {chart}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <Button size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview Full Template
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>

              {/* Action Button */}
              <div className="p-6 pt-0">
                <Button 
                  variant={isSelected ? "secondary" : "outline"}
                  className="w-full transition-all duration-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTemplateSelect(template)
                  }}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Selected
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Select Template
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {/* No Results */}
      {filteredTemplates.length === 0 && (
        <Card variant="glass" className="p-12 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">No templates found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or selecting a different category
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
              }}
            >
              Clear Filters
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}