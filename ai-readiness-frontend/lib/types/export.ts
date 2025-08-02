// Additional export-related types

import { ExportOptions, UserRole } from '@/lib/types'

export interface ExportRequest {
  options: ExportOptions
  surveyId?: string
  organizationId?: string
  type?: 'data' | 'survey_report' | 'organization_report'
}

export interface ExportResponse {
  success: boolean
  filename?: string
  error?: string
  downloadUrl?: string
}

export interface ExportMetadata {
  exportedAt: string
  exportedBy: string
  totalRecords: number
  filters: ExportOptions['filters']
  privacyLevel: 'full' | 'anonymized'
  retentionPeriod?: string
  purpose?: string
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  resourceType: string
  resourceId: string
  metadata: Record<string, any>
  createdAt: string
  ipAddress?: string
  userAgent?: string
}

export interface ExportStatistics {
  totalExports: number
  exportsByFormat: Record<string, number>
  exportsByUser: Record<string, number>
  exportsByDate: Record<string, number>
  averageFileSize: number
  personalDataExports: number
  anonymizedExports: number
}

export interface DataRetentionPolicy {
  id: string
  name: string
  description: string
  retentionPeriod: number // in days
  applicableRoles: UserRole[]
  dataTypes: string[]
  autoDelete: boolean
  notificationDays: number[]
}

export interface PrivacySettings {
  allowPersonalDataExport: boolean
  requireGdprConsent: boolean
  defaultRetentionPeriod: number
  auditLogRetention: number
  autoAnonymizeAfter: number
  encryptionRequired: boolean
}

// Re-export from main types file
export type { Analytics, JTBDForces } from '@/lib/types'