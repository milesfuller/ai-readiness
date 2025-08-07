'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Download,
  UserX,
  FileText,
  Database
} from 'lucide-react'
import { ExportOptions, UserRole } from '@/lib/types'
import { useAuth } from '@/lib/auth/context'

interface PrivacyControlsProps {
  exportOptions: ExportOptions
  onChange: (options: ExportOptions) => void
  userRole: UserRole
  className?: string
}

export const PrivacyControls: React.FC<PrivacyControlsProps> = ({
  exportOptions,
  onChange,
  userRole,
  className = ''
}) => {
  const [showDataPreview, setShowDataPreview] = useState(false)
  const [gdprConfirmed, setGdprConfirmed] = useState(false)

  const canAccessPersonalData = ['system_admin', 'org_admin'].includes(userRole)
  
  const privacyLevels = [
    {
      id: 'anonymous',
      title: 'Anonymous',
      description: 'All personal identifiers removed',
      icon: UserX,
      level: 'high',
      includes: ['Response data', 'Aggregated analytics', 'Department categories'],
      excludes: ['Names', 'Email addresses', 'IP addresses', 'User IDs']
    },
    {
      id: 'pseudonymous',
      title: 'Pseudonymous',
      description: 'Personal data replaced with pseudonyms',
      icon: Eye,
      level: 'medium',
      includes: ['Response data', 'Consistent user tracking', 'Department info'],
      excludes: ['Real names', 'Email addresses', 'IP addresses']
    },
    {
      id: 'identifiable',
      title: 'Identifiable',
      description: 'Full personal data included',
      icon: EyeOff,
      level: 'low',
      includes: ['All response data', 'Names', 'Email addresses', 'User profiles'],
      excludes: ['Sensitive metadata only if specified'],
      requiresPermission: true
    }
  ]

  const getPrivacyLevel = (): 'anonymous' | 'pseudonymous' | 'identifiable' => {
    if (!exportOptions.includePersonalData) return 'anonymous'
    if (exportOptions.filters?.department || exportOptions.filters?.role) return 'pseudonymous'
    return 'identifiable'
  }

  const handlePrivacyLevelChange = (level: string) => {
    const includePersonalData = level === 'identifiable'
    onChange({
      ...exportOptions,
      includePersonalData
    })
  }

  const getComplianceInfo = () => {
    const currentLevel = getPrivacyLevel()
    switch (currentLevel) {
      case 'anonymous':
        return {
          status: 'compliant',
          message: 'GDPR compliant - no personal data included',
          color: 'text-green-400',
          icon: CheckCircle
        }
      case 'pseudonymous':
        return {
          status: 'caution',
          message: 'Partially GDPR compliant - pseudonymized data',
          color: 'text-yellow-400',
          icon: AlertTriangle
        }
      case 'identifiable':
        return {
          status: 'warning',
          message: 'GDPR compliance required - personal data included',
          color: 'text-red-400',
          icon: AlertTriangle
        }
      default:
        return {
          status: 'unknown',
          message: 'Privacy level unknown',
          color: 'text-gray-400',
          icon: Info
        }
    }
  }

  const complianceInfo = getComplianceInfo()
  const ComplianceIcon = complianceInfo.icon

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Privacy Level Selection */}
      <Card className="glass-card border-gray-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Privacy Controls</span>
          </h3>
          <Badge 
            variant="outline" 
            className={`${complianceInfo.color} border-current`}
          >
            <ComplianceIcon className="h-3 w-3 mr-1" />
            {complianceInfo.status.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {privacyLevels.map((level) => {
            const isSelected = getPrivacyLevel() === level.id
            const isDisabled = level.requiresPermission && !canAccessPersonalData
            
            return (
              <div
                key={level.id}
                className={`
                  p-4 rounded-lg border cursor-pointer transition-all
                  ${isSelected 
                    ? 'border-teal-500 bg-teal-500/10' 
                    : isDisabled
                      ? 'border-gray-700 bg-gray-700/20 opacity-50 cursor-not-allowed'
                      : 'border-gray-600 hover:border-gray-500'
                  }
                `}
                onClick={() => !isDisabled && handlePrivacyLevelChange(level.id)}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <level.icon className={`h-4 w-4 ${
                    level.level === 'high' ? 'text-green-400' :
                    level.level === 'medium' ? 'text-yellow-400' :
                    'text-red-400'
                  }`} />
                  <span className="text-white font-medium">{level.title}</span>
                  {isDisabled && <Lock className="h-3 w-3 text-gray-500" />}
                </div>
                <p className="text-xs text-gray-400 mb-3">{level.description}</p>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-green-400 font-medium">Includes:</p>
                    <ul className="text-xs text-gray-300 space-y-1">
                      {level.includes.map((item, idx) => (
                        <li key={idx} className="flex items-center space-x-1">
                          <CheckCircle className="h-2 w-2 text-green-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs text-red-400 font-medium">Excludes:</p>
                    <ul className="text-xs text-gray-300 space-y-1">
                      {level.excludes.map((item, idx) => (
                        <li key={idx} className="flex items-center space-x-1">
                          <UserX className="h-2 w-2 text-red-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Compliance Notice */}
        <div className={`flex items-start space-x-3 p-3 rounded-lg border ${
          complianceInfo.status === 'compliant' ? 'border-green-500/30 bg-green-500/10' :
          complianceInfo.status === 'caution' ? 'border-yellow-500/30 bg-yellow-500/10' :
          'border-red-500/30 bg-red-500/10'
        }`}>
          <ComplianceIcon className={`h-4 w-4 ${complianceInfo.color} mt-0.5 flex-shrink-0`} />
          <div className="text-xs">
            <p className={`font-medium mb-1 ${complianceInfo.color}`}>
              Compliance Status
            </p>
            <p className="text-gray-300">{complianceInfo.message}</p>
          </div>
        </div>
      </Card>

      {/* GDPR Compliance Section */}
      {exportOptions.includePersonalData && (
        <Card className="glass-card border-red-500/30 bg-red-500/5 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="text-lg font-semibold text-white">GDPR Compliance Required</h3>
          </div>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-300">
              <p className="mb-2">
                This export includes personal data and requires compliance with GDPR regulations:
              </p>
              <ul className="space-y-1 ml-4">
                <li>• Ensure you have lawful basis for processing this data</li>
                <li>• Data subjects have been informed of their rights</li>
                <li>• Implement appropriate security measures</li>
                <li>• Maintain records of processing activities</li>
                <li>• Respect data retention policies</li>
              </ul>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="gdpr-compliance"
                checked={gdprConfirmed}
                onCheckedChange={(checked: boolean) => setGdprConfirmed(checked)}
                className="mt-1"
              />
              <Label htmlFor="gdpr-compliance" className="text-sm text-gray-300">
                I confirm that this data export complies with GDPR requirements and my organization&apos;s data protection policies
              </Label>
            </div>

            {!gdprConfirmed && (
              <div className="text-xs text-red-400">
                GDPR compliance confirmation is required to export personal data
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Data Retention & Audit */}
      <Card className="glass-card border-gray-600 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Database className="h-5 w-5 text-teal-400" />
          <h3 className="text-lg font-semibold text-white">Data Retention & Audit</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-gray-400">Retention Period</Label>
            <Select defaultValue="30days">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">7 days</SelectItem>
                <SelectItem value="30days">30 days</SelectItem>
                <SelectItem value="90days">90 days</SelectItem>
                <SelectItem value="1year">1 year</SelectItem>
                <SelectItem value="indefinite">Indefinite (with approval)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm text-gray-400">Access Purpose</Label>
            <Select defaultValue="analysis">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="analysis">Data Analysis</SelectItem>
                <SelectItem value="reporting">Management Reporting</SelectItem>
                <SelectItem value="compliance">Compliance Audit</SelectItem>
                <SelectItem value="research">Research Purposes</SelectItem>
                <SelectItem value="backup">Data Backup</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 p-3 bg-white/5 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Clock className="h-4 w-4" />
            <span>This export will be logged for audit purposes</span>
          </div>
        </div>
      </Card>

      {/* Data Preview */}
      <Card className="glass-card border-gray-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Data Preview</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDataPreview(!showDataPreview)}
          >
            {showDataPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showDataPreview ? 'Hide' : 'Show'} Preview
          </Button>
        </div>

        {showDataPreview && (
          <div className="space-y-3">
            <div className="text-sm text-gray-400">
              Sample of data that will be included in the export:
            </div>
            
            <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs overflow-x-auto">
              <pre className="text-gray-300">
{exportOptions.includePersonalData ? `{
  "response_id": "resp_123456",
  "user_email": "user@example.com",
  "user_name": "John Doe",
  "department": "Engineering",
  "survey_response": {
    "q1": "Strongly Agree",
    "q2": 4.5,
    "completion_time": 180
  },
  "metadata": {
    "ip_address": "192.168.1.1",
    "user_agent": "Chrome/91.0",
    "timestamp": "2024-01-01T10:00:00Z"
  }
}` : `{
  "response_id": "resp_123456",
  "user_id": "anonymous_user_7f3a",
  "department": "Engineering",
  "survey_response": {
    "q1": "Strongly Agree", 
    "q2": 4.5,
    "completion_time": 180
  },
  "metadata": {
    "timestamp": "2024-01-01T10:00:00Z"
  }
}`}
              </pre>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default PrivacyControls