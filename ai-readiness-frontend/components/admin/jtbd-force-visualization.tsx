'use client'

// JTBD Force Visualization Component for Analysis Results

'use client'

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ExtendedJTBDAnalysisResult, JTBDForceType, OrganizationalAnalysis } from '@/lib/types/llm';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Anchor,
  Zap,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface JTBDForceVisualizationProps {
  analyses: ExtendedJTBDAnalysisResult[];
  organizationalAnalysis?: OrganizationalAnalysis;
  showIndividualResults?: boolean;
}

interface ForceData {
  force: JTBDForceType;
  count: number;
  avgStrength: number;
  avgConfidence: number;
  topThemes: string[];
  color: string;
  icon: React.ReactNode;
  description: string;
}

interface ForceReadinessData {
  force: string;
  readiness: number;
  strength: number;
  urgency: number;
}

const FORCE_COLORS = {
  pain_of_old: '#ef4444',    // Red
  pull_of_new: '#22c55e',    // Green  
  anchors_to_old: '#f59e0b', // Amber
  anxiety_of_new: '#8b5cf6', // Purple
  demographic: '#6b7280'     // Gray
};

const FORCE_ICONS = {
  pain_of_old: <TrendingDown className="h-4 w-4" />,
  pull_of_new: <TrendingUp className="h-4 w-4" />,
  anchors_to_old: <Anchor className="h-4 w-4" />,
  anxiety_of_new: <AlertTriangle className="h-4 w-4" />,
  demographic: <Users className="h-4 w-4" />
};

const FORCE_DESCRIPTIONS = {
  pain_of_old: "Current frustrations and inefficiencies driving change",
  pull_of_new: "Attraction to AI benefits and opportunities",
  anchors_to_old: "Organizational barriers and resistance to change",
  anxiety_of_new: "Concerns and fears about AI adoption",
  demographic: "Current AI usage and experience patterns"
};

export function JTBDForceVisualization({ 
  analyses, 
  organizationalAnalysis, 
  showIndividualResults = false 
}: JTBDForceVisualizationProps) {
  // Calculate force distribution and metrics
  const forceData = useMemo(() => {
    const forceMap = new Map<JTBDForceType, {
      count: number;
      totalStrength: number;
      totalConfidence: number;
      themes: string[];
    }>();

    analyses.forEach(analysis => {
      const force = analysis.primaryJtbdForce;
      const existing = forceMap.get(force) || {
        count: 0,
        totalStrength: 0,
        totalConfidence: 0,
        themes: []
      };

      existing.count += 1;
      existing.totalStrength += analysis.forceStrengthScore;
      existing.totalConfidence += analysis.confidenceScore;
      existing.themes.push(...analysis.keyThemes);

      forceMap.set(force, existing);
    });

    return Array.from(forceMap.entries()).map(([force, data]): ForceData => ({
      force,
      count: data.count,
      avgStrength: data.count > 0 ? data.totalStrength / data.count : 0,
      avgConfidence: data.count > 0 ? data.totalConfidence / data.count : 0,
      topThemes: [...new Set(data.themes)]
        .map(theme => ({ theme, count: data.themes.filter(t => t === theme).length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(item => item.theme),
      color: FORCE_COLORS[force],
      icon: FORCE_ICONS[force],
      description: FORCE_DESCRIPTIONS[force]
    }));
  }, [analyses]);

  // Prepare chart data
  const chartData = forceData.map(force => ({
    name: force.force.replace('_', ' ').toUpperCase(),
    count: force.count,
    avgStrength: force.avgStrength,
    avgConfidence: force.avgConfidence,
    fill: force.color
  }));

  // Prepare radar chart data for organizational analysis
  const radarData = useMemo(() => {
    if (!organizationalAnalysis) return [];

    return [
      {
        force: 'Pain of Old',
        readiness: organizationalAnalysis.jtbdForceAnalysis.painOfOld.averageScore,
        strength: organizationalAnalysis.jtbdForceAnalysis.painOfOld.averageScore,
        urgency: organizationalAnalysis.jtbdForceAnalysis.painOfOld.urgencyLevel === 'critical' ? 5 :
                organizationalAnalysis.jtbdForceAnalysis.painOfOld.urgencyLevel === 'high' ? 4 :
                organizationalAnalysis.jtbdForceAnalysis.painOfOld.urgencyLevel === 'medium' ? 3 : 2
      },
      {
        force: 'Pull of New',
        readiness: organizationalAnalysis.jtbdForceAnalysis.pullOfNew.averageScore,
        strength: organizationalAnalysis.jtbdForceAnalysis.pullOfNew.averageScore,
        urgency: organizationalAnalysis.jtbdForceAnalysis.pullOfNew.innovationReadiness === 'very_high' ? 5 :
                organizationalAnalysis.jtbdForceAnalysis.pullOfNew.innovationReadiness === 'high' ? 4 :
                organizationalAnalysis.jtbdForceAnalysis.pullOfNew.innovationReadiness === 'medium' ? 3 : 2
      },
      {
        force: 'Anchors to Old',
        readiness: 5 - organizationalAnalysis.jtbdForceAnalysis.anchorsToOld.averageScore, // Invert since lower is better
        strength: organizationalAnalysis.jtbdForceAnalysis.anchorsToOld.averageScore,
        urgency: organizationalAnalysis.jtbdForceAnalysis.anchorsToOld.changeComplexity === 'very_high' ? 5 :
                organizationalAnalysis.jtbdForceAnalysis.anchorsToOld.changeComplexity === 'high' ? 4 :
                organizationalAnalysis.jtbdForceAnalysis.anchorsToOld.changeComplexity === 'medium' ? 3 : 2
      },
      {
        force: 'Anxiety of New',
        readiness: 5 - organizationalAnalysis.jtbdForceAnalysis.anxietyOfNew.averageScore, // Invert since lower is better
        strength: organizationalAnalysis.jtbdForceAnalysis.anxietyOfNew.averageScore,
        urgency: organizationalAnalysis.jtbdForceAnalysis.anxietyOfNew.mitigationPriority === 'critical' ? 5 :
                organizationalAnalysis.jtbdForceAnalysis.anxietyOfNew.mitigationPriority === 'high' ? 4 :
                organizationalAnalysis.jtbdForceAnalysis.anxietyOfNew.mitigationPriority === 'medium' ? 3 : 2
      }
    ];
  }, [organizationalAnalysis]);

  if (analyses.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No analysis data available for visualization</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Force Distribution Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Force Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>JTBD Force Distribution</CardTitle>
            <CardDescription>
              Number of responses by primary force
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Force Proportion */}
        <Card>
          <CardHeader>
            <CardTitle>Force Proportion</CardTitle>
            <CardDescription>
              Relative distribution of forces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Force Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {forceData.map((force) => (
          <Card key={force.force} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {force.icon}
                  <CardTitle className="text-sm">
                    {force.force.replace('_', ' ').toUpperCase()}
                  </CardTitle>
                </div>
                <Badge 
                  variant="secondary" 
                  style={{ backgroundColor: `${force.color}20`, color: force.color }}
                >
                  {force.count}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {force.description}
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Avg Strength</span>
                  <span className="font-medium">{force.avgStrength.toFixed(1)}/5</span>
                </div>
                <Progress value={(force.avgStrength / 5) * 100} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Avg Confidence</span>
                  <span className="font-medium">{force.avgConfidence.toFixed(1)}/5</span>
                </div>
                <Progress value={(force.avgConfidence / 5) * 100} className="h-2" />
              </div>

              {force.topThemes.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-1">Top Themes:</div>
                  <div className="flex flex-wrap gap-1">
                    {force.topThemes.slice(0, 3).map((theme, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            
            {/* Color accent bar */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1"
              style={{ backgroundColor: force.color }}
            />
          </Card>
        ))}
      </div>

      {/* Organizational Radar Chart */}
      {organizationalAnalysis && radarData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Organizational AI Readiness Profile</CardTitle>
            <CardDescription>
              Multi-dimensional view of organizational readiness across JTBD forces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="force" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 5]} 
                    tick={{ fontSize: 10 }} 
                  />
                  <Radar
                    name="Readiness"
                    dataKey="readiness"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Strength"
                    dataKey="strength"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>

              <div className="space-y-4">
                <h4 className="font-medium">Readiness Insights</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium">Strongest Force</span>
                    </div>
                    <Badge variant="secondary">
                      {organizationalAnalysis.jtbdForceAnalysis.pullOfNew.strength}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <span className="text-sm font-medium">Biggest Barrier</span>
                    </div>
                    <Badge variant="secondary">
                      {organizationalAnalysis.jtbdForceAnalysis.anchorsToOld.strength}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium">Overall Readiness</span>
                    </div>
                    <Badge variant="secondary">
                      {organizationalAnalysis.executiveSummary.readinessLevel.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 p-3 border rounded-lg">
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="text-sm">
                      <span className="font-medium">Key Finding: </span>
                      <span className="text-muted-foreground">
                        {organizationalAnalysis.executiveSummary.keyFinding}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Force Strength vs Confidence Scatter */}
      <Card>
        <CardHeader>
          <CardTitle>Force Strength vs Confidence</CardTitle>
          <CardDescription>
            Relationship between force strength and analysis confidence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="avgStrength" 
                domain={[0, 5]}
                name="Average Strength"
                label={{ value: 'Average Strength', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                type="number" 
                dataKey="avgConfidence" 
                domain={[0, 5]}
                name="Average Confidence"
                label={{ value: 'Average Confidence', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border rounded-lg shadow-lg">
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Strength: {data.avgStrength.toFixed(1)}/5
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Confidence: {data.avgConfidence.toFixed(1)}/5
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Responses: {data.count}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter data={chartData} fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Theme Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Key Themes by Force</CardTitle>
          <CardDescription>
            Most common themes identified in each JTBD force
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {forceData.filter(f => f.topThemes.length > 0).map((force) => (
              <div key={force.force} className="space-y-3">
                <div className="flex items-center space-x-2">
                  {force.icon}
                  <h4 className="font-medium text-sm">
                    {force.force.replace('_', ' ').toUpperCase()}
                  </h4>
                </div>
                <div className="space-y-2">
                  {force.topThemes.slice(0, 5).map((theme, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{theme}</span>
                      <Badge variant="outline" className="text-xs">
                        {analyses.filter(a => 
                          a.primaryJtbdForce === force.force && 
                          a.keyThemes.includes(theme)
                        ).length}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}