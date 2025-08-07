/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { PrivacyControls } from '@/components/admin/privacy-controls'
import type { ExportOptions, UserRole } from '@/lib/types'

// Mock the auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-1',
      role: 'system_admin'
    }
  })
}))

describe('PrivacyControls', () => {
  const defaultExportOptions: ExportOptions = {
    includePersonalData: false,
    format: 'csv',
    filters: {}
  }

  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Privacy Level Selection', () => {
    it('renders privacy level options correctly', () => {
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      // Check for privacy control heading
      expect(screen.getByText('Privacy Controls')).toBeInTheDocument()

      // Check for privacy level options
      expect(screen.getByText('Anonymous')).toBeInTheDocument()
      expect(screen.getByText('Pseudonymous')).toBeInTheDocument()
      expect(screen.getByText('Identifiable')).toBeInTheDocument()

      // Check for descriptions
      expect(screen.getByText('All personal identifiers removed')).toBeInTheDocument()
      expect(screen.getByText('Personal data replaced with pseudonyms')).toBeInTheDocument()
      expect(screen.getByText('Full personal data included')).toBeInTheDocument()
    })

    it('shows compliance status badge', () => {
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      // Should show compliant status for anonymous data
      expect(screen.getByText('COMPLIANT')).toBeInTheDocument()
    })

    it('changes privacy level when clicked', async () => {
      const user = userEvent.setup()
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      // Click on identifiable option
      const identifiableOption = screen.getByText('Identifiable').closest('div')
      await user.click(identifiableOption!)

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultExportOptions,
        includePersonalData: true
      })
    })

    it('disables identifiable option for non-admin users', () => {
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="user"
        />
      )

      // Identifiable option should be disabled/locked for non-admin
      const identifiableOption = screen.getByText('Identifiable').closest('div')
      expect(identifiableOption).toHaveClass('opacity-50', 'cursor-not-allowed')

      // Should show lock icon
      expect(screen.getByTestId('lock-icon') || identifiableOption?.querySelector('svg')).toBeDefined()
    })
  })

  describe('GDPR Compliance Section', () => {
    it('shows GDPR compliance section when personal data is included', () => {
      const exportOptionsWithPersonalData: ExportOptions = {
        ...defaultExportOptions,
        includePersonalData: true
      }

      render(
        <PrivacyControls
          exportOptions={exportOptionsWithPersonalData}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      expect(screen.getByText('GDPR Compliance Required')).toBeInTheDocument()
      expect(screen.getByText(/This export includes personal data/)).toBeInTheDocument()
      
      // Check for compliance requirements
      expect(screen.getByText(/lawful basis for processing/)).toBeInTheDocument()
      expect(screen.getByText(/Data subjects have been informed/)).toBeInTheDocument()
      expect(screen.getByText(/appropriate security measures/)).toBeInTheDocument()
    })

    it('does not show GDPR section when personal data is not included', () => {
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      expect(screen.queryByText('GDPR Compliance Required')).not.toBeInTheDocument()
    })

    it('handles GDPR confirmation checkbox', async () => {
      const user = userEvent.setup()
      const exportOptionsWithPersonalData: ExportOptions = {
        ...defaultExportOptions,
        includePersonalData: true
      }

      render(
        <PrivacyControls
          exportOptions={exportOptionsWithPersonalData}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      const gdprCheckbox = screen.getByRole('checkbox', { name: /GDPR compliance confirmation/i })
      expect(gdprCheckbox).not.toBeChecked()

      await user.click(gdprCheckbox)
      expect(gdprCheckbox).toBeChecked()

      // Should not show warning message when confirmed
      await waitFor(() => {
        expect(screen.queryByText(/GDPR compliance confirmation is required/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Data Retention & Audit Section', () => {
    it('renders data retention and audit controls', () => {
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      expect(screen.getByText('Data Retention & Audit')).toBeInTheDocument()
      expect(screen.getByText('Retention Period')).toBeInTheDocument()
      expect(screen.getByText('Access Purpose')).toBeInTheDocument()
      expect(screen.getByText('This export will be logged for audit purposes')).toBeInTheDocument()
    })

    it('has proper retention period options', async () => {
      const user = userEvent.setup()
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      // Find and click retention period dropdown
      const retentionSelect = screen.getByDisplayValue('30 days') || screen.getByText('30 days')
      await user.click(retentionSelect)

      // Check for retention options
      expect(screen.getByText('7 days')).toBeInTheDocument()
      expect(screen.getByText('90 days')).toBeInTheDocument()
      expect(screen.getByText('1 year')).toBeInTheDocument()
      expect(screen.getByText('Indefinite (with approval)')).toBeInTheDocument()
    })

    it('has proper access purpose options', async () => {
      const user = userEvent.setup()
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      // Find access purpose dropdown
      const purposeSelect = screen.getByDisplayValue('Data Analysis') || screen.getByText('Data Analysis')
      await user.click(purposeSelect)

      // Check for purpose options
      expect(screen.getByText('Management Reporting')).toBeInTheDocument()
      expect(screen.getByText('Compliance Audit')).toBeInTheDocument()
      expect(screen.getByText('Research Purposes')).toBeInTheDocument()
      expect(screen.getByText('Data Backup')).toBeInTheDocument()
    })
  })

  describe('Data Preview Section', () => {
    it('renders data preview section with toggle', () => {
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      expect(screen.getByText('Data Preview')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /show preview/i })).toBeInTheDocument()
    })

    it('toggles data preview visibility', async () => {
      const user = userEvent.setup()
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      const toggleButton = screen.getByRole('button', { name: /show preview/i })
      await user.click(toggleButton)

      // Should show preview
      expect(screen.getByText('Sample of data that will be included in the export:')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /hide preview/i })).toBeInTheDocument()

      // Should show anonymized data preview
      expect(screen.getByText(/"user_id": "anonymous_user_7f3a"/)).toBeInTheDocument()
    })

    it('shows different preview for personal vs anonymous data', async () => {
      const user = userEvent.setup()
      
      // First test anonymous data preview
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      const toggleButton = screen.getByRole('button', { name: /show preview/i })
      await user.click(toggleButton)

      expect(screen.getByText(/"user_id": "anonymous_user_7f3a"/)).toBeInTheDocument()
      expect(screen.queryByText(/"user_email": "user@example.com"/)).not.toBeInTheDocument()

      // Test personal data preview
      const exportOptionsWithPersonalData: ExportOptions = {
        ...defaultExportOptions,
        includePersonalData: true
      }

      render(
        <PrivacyControls
          exportOptions={exportOptionsWithPersonalData}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      const personalDataToggle = screen.getAllByRole('button', { name: /show preview/i })[0]
      await user.click(personalDataToggle)

      expect(screen.getByText(/"user_email": "user@example.com"/)).toBeInTheDocument()
      expect(screen.getByText(/"user_name": "John Doe"/)).toBeInTheDocument()
      expect(screen.getByText(/"ip_address": "192.168.1.1"/)).toBeInTheDocument()
    })
  })

  describe('Compliance Status Updates', () => {
    it('updates compliance status based on privacy level', () => {
      // Test anonymous level
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      expect(screen.getByText('COMPLIANT')).toBeInTheDocument()
      expect(screen.getByText('GDPR compliant - no personal data included')).toBeInTheDocument()

      // Test identifiable level
      const exportOptionsWithPersonalData: ExportOptions = {
        ...defaultExportOptions,
        includePersonalData: true
      }

      render(
        <PrivacyControls
          exportOptions={exportOptionsWithPersonalData}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      expect(screen.getByText('WARNING')).toBeInTheDocument()
      expect(screen.getByText('GDPR compliance required - personal data included')).toBeInTheDocument()
    })

    it('shows caution status for pseudonymous data', () => {
      const exportOptionsWithFilters: ExportOptions = {
        ...defaultExportOptions,
        includePersonalData: false,
        filters: {
          department: 'Engineering'
        }
      }

      render(
        <PrivacyControls
          exportOptions={exportOptionsWithFilters}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      expect(screen.getByText('CAUTION')).toBeInTheDocument()
      expect(screen.getByText('Partially GDPR compliant - pseudonymized data')).toBeInTheDocument()
    })
  })

  describe('Include/Exclude Lists', () => {
    it('shows proper includes and excludes for each privacy level', () => {
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      // Check anonymous level includes/excludes
      expect(screen.getByText('Response data')).toBeInTheDocument()
      expect(screen.getByText('Aggregated analytics')).toBeInTheDocument()
      expect(screen.getByText('Department categories')).toBeInTheDocument()

      expect(screen.getByText('Names')).toBeInTheDocument()
      expect(screen.getByText('Email addresses')).toBeInTheDocument()
      expect(screen.getByText('IP addresses')).toBeInTheDocument()
      expect(screen.getByText('User IDs')).toBeInTheDocument()
    })
  })

  describe('Role-based Permissions', () => {
    it('allows system admin to access all privacy levels', () => {
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="system_admin"
        />
      )

      const identifiableOption = screen.getByText('Identifiable').closest('div')
      expect(identifiableOption).not.toHaveClass('opacity-50', 'cursor-not-allowed')
    })

    it('allows org admin to access all privacy levels', () => {
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="org_admin"
        />
      )

      const identifiableOption = screen.getByText('Identifiable').closest('div')
      expect(identifiableOption).not.toHaveClass('opacity-50', 'cursor-not-allowed')
    })

    it('restricts regular user from accessing identifiable data', () => {
      render(
        <PrivacyControls
          exportOptions={defaultExportOptions}
          onChange={mockOnChange}
          userRole="user"
        />
      )

      const identifiableOption = screen.getByText('Identifiable').closest('div')
      expect(identifiableOption).toHaveClass('opacity-50', 'cursor-not-allowed')
    })
  })
})