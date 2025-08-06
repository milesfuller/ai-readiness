/**
 * Integration Tests for Export API (/api/export)
 * 
 * Tests include:
 * - Authentication and authorization
 * - Request validation
 * - Multiple export formats (CSV, JSON, PDF)
 * - Personal data protection
 * - Rate limiting
 * - Security (XSS, SQL injection, CSRF)
 * - Audit logging
 * - Error handling
 * - File download functionality
 */

// Mock NextRequest and NextResponse before importing
jest.mock('next/server', () => {
  class MockNextRequest {
    constructor(url: string, options: any = {}) {
      this.url = url;
      this.method = options.method || 'GET';
      this.headers = new Map(Object.entries(options.headers || {}));
      this._body = options.body;
    }

    url: string;
    method: string;
    headers: Map<string, string>;
    _body?: string;

    async json() {
      return JSON.parse(this._body || '{}');
    }

    async text() {
      return this._body || '';
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: (data: any, options: any = {}) => ({
        status: options.status || 200,
        json: () => Promise.resolve(data),
        headers: new Map(Object.entries(options.headers || {})),
      }),
    },
  };
});

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/export/route';
import { exportService } from '@/lib/services/export-service';
import { createServerClient } from '@supabase/ssr';

// Mock dependencies
jest.mock('@supabase/ssr');
jest.mock('@/lib/services/export-service', () => ({
  exportService: {
    exportData: jest.fn(),
    generateSurveyPDF: jest.fn(),
    generateOrganizationReport: jest.fn(),
    getAvailableFormats: jest.fn(() => [
      { value: 'csv', label: 'CSV', description: 'Comma-separated values' },
      { value: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
      { value: 'pdf', label: 'PDF', description: 'Portable Document Format' }
    ]),
  },
}));
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => ({ value: 'test-cookie' })),
    set: jest.fn(),
  })),
}));

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    slice: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

const mockExportService = exportService as jest.Mocked<typeof exportService>;

// Helper function to set up different mock scenarios
const setupMockScenario = (scenario: 'authenticated_user' | 'authenticated_admin' | 'authenticated_org_admin' | 'unauthenticated' | 'no_profile') => {
  jest.clearAllMocks();
  
  switch (scenario) {
    case 'unauthenticated':
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });
      break;
    case 'no_profile':
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        slice: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('Profile not found') }),
      });
      break;
    case 'authenticated_user':
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        slice: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'user', organization_id: 'org-1' }, error: null }),
      });
      break;
    case 'authenticated_admin':
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        slice: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'admin', organization_id: 'org-1' }, error: null }),
      });
      break;
    case 'authenticated_org_admin':
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'org-admin-1' } },
        error: null,
      });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        slice: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'org_admin', organization_id: 'org-1' }, error: null }),
      });
      break;
  }
  
  (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
};

beforeEach(() => {
  setupMockScenario('unauthenticated'); // default
});

describe('/api/export', () => {
  describe('POST /api/export - Authentication & Authorization', () => {
    it('should return 401 for unauthenticated requests', async () => {
      setupMockScenario('unauthenticated');

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'csv' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 for user profile not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: new Error('Profile not found'),
      });

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'csv' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('User profile not found');
    });

    it('should return 403 for non-admin users trying to export personal data', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'user', organization_id: 'org-1' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { 
            format: 'csv',
            includePersonalData: true // Regular user trying to export personal data
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions to export personal data');
    });

    it('should allow admin users to export personal data', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-1' },
        error: null,
      });

      // Mock audit log insertion
      mockSupabase.from().insert().select.mockResolvedValue({
        data: { id: 'audit-1' },
        error: null,
      });

      // Mock export service
      mockExportService.exportData.mockResolvedValue('csv,data,here\nrow1,value1,value2');

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { 
            format: 'csv',
            includePersonalData: true,
          },
          type: 'data',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
    });

    it('should restrict org_admin users to their organization only', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'org-admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { role: 'org_admin', organization_id: 'org-1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { organization_id: 'org-2' }, // Different organization
          error: null,
        });

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'csv' },
          organizationId: 'org-2', // Different organization
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied: Cannot access other organization data');
    });

    it('should validate survey access for org_admin users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'org-admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { role: 'org_admin', organization_id: 'org-1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { organization_id: 'org-2' }, // Survey from different organization
          error: null,
        });

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'csv' },
          surveyId: 'survey-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied: Survey not in your organization');
    });
  });

  describe('POST /api/export - Request Validation', () => {
    beforeEach(() => {
      // Setup valid authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-1' },
        error: null,
      });

      mockSupabase.from().insert().select.mockResolvedValue({
        data: { id: 'audit-1' },
        error: null,
      });
    });

    it('should return 400 for missing export options', async () => {
      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          // Missing options
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid export options');
    });

    it('should return 400 for missing format in options', async () => {
      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: {
            // Missing format
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid export options');
    });

    it('should return 400 for survey report without survey ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'pdf' },
          type: 'survey_report',
          // Missing surveyId
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Survey ID required for survey report');
    });

    it('should return 400 for organization report without organization ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'pdf' },
          type: 'organization_report',
          // Missing organizationId
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Organization ID required for organization report');
    });

    it('should return 400 for unsupported format for data export', async () => {
      mockExportService.exportData.mockResolvedValue('data');

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'xml' }, // Unsupported format
          type: 'data',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Unsupported format for data export');
    });

    it('should handle valid CSV data export', async () => {
      mockExportService.exportData.mockResolvedValue('header1,header2\nvalue1,value2');

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'csv' },
          type: 'data',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('.csv');
    });

    it('should handle valid JSON data export', async () => {
      mockExportService.exportData.mockResolvedValue('{"data": "value"}');

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'json' },
          type: 'data',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Content-Disposition')).toContain('.json');
    });

    it('should handle PDF survey report export', async () => {
      const mockBlob = new Blob(['pdf data'], { type: 'application/pdf' });
      mockExportService.generateSurveyPDF.mockResolvedValue(mockBlob);

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'pdf' },
          type: 'survey_report',
          surveyId: 'survey-1',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('.pdf');
    });

    it('should handle PDF organization report export', async () => {
      const mockBlob = new Blob(['pdf data'], { type: 'application/pdf' });
      mockExportService.generateOrganizationReport.mockResolvedValue(mockBlob);

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'pdf' },
          type: 'organization_report',
          organizationId: 'org-1',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('.pdf');
    });
  });

  describe('POST /api/export - Security Tests', () => {
    beforeEach(() => {
      // Setup valid authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-1' },
        error: null,
      });

      mockSupabase.from().insert().select.mockResolvedValue({
        data: { id: 'audit-1' },
        error: null,
      });

      mockExportService.exportData.mockResolvedValue('safe,data,export');
    });

    it('should handle XSS attempts in export options', async () => {
      for (const xssPayload of (global as any).testHelpers.xssPayloads) {
        const request = new NextRequest('http://localhost:3000/api/export', {
          method: 'POST',
          body: JSON.stringify({
            options: { 
              format: 'csv',
              filters: {
                searchTerm: xssPayload,
                department: xssPayload,
              },
            },
          }),
        });

        const response = await POST(request);
        
        // Should process without executing XSS
        expect(response.status).toBe(200);
        
        // Verify XSS payload was passed to export service but not executed
        expect(mockExportService.exportData).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              searchTerm: xssPayload,
              department: xssPayload,
            }),
          })
        );
      }
    });

    it('should handle SQL injection attempts in survey/organization IDs', async () => {
      for (const sqlPayload of (global as any).testHelpers.sqlInjectionPayloads) {
        const request = new NextRequest('http://localhost:3000/api/export', {
          method: 'POST',
          body: JSON.stringify({
            options: { format: 'csv' },
            surveyId: sqlPayload,
            organizationId: sqlPayload,
          }),
        });

        const response = await POST(request);
        
        // Should handle gracefully without SQL errors
        expect(response.status).not.toBe(500);
        // Likely 404 or validation error
        expect([200, 400, 404]).toContain(response.status);
      }
    });

    it('should handle malicious file names and paths', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        'C:\\Windows\\System32',
        '/etc/shadow',
        '..\\..\\..\\windows\\system32\\config\\sam',
        'NUL', 'CON', 'PRN', 'AUX', // Windows reserved names
      ];

      for (const maliciousPath of maliciousPaths) {
        const request = new NextRequest('http://localhost:3000/api/export', {
          method: 'POST',
          body: JSON.stringify({
            options: { 
              format: 'csv',
              fileName: maliciousPath,
            },
          }),
        });

        const response = await POST(request);
        
        // Should not use malicious path in Content-Disposition
        if (response.status === 200) {
          const contentDisposition = response.headers.get('Content-Disposition');
          expect(contentDisposition).not.toContain('../');
          expect(contentDisposition).not.toContain('..\\');
          expect(contentDisposition).not.toContain('/etc/');
          expect(contentDisposition).not.toContain('C:\\');
        }
      }
    });

    it('should handle extremely large export requests', async () => {
      const largeFilters = {
        userIds: Array.from({ length: 10000 }, (_, i) => `user-${i}`),
        tags: Array.from({ length: 1000 }, (_, i) => `tag-${i}`),
      };

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { 
            format: 'csv',
            filters: largeFilters,
          },
        }),
      });

      const response = await POST(request);
      
      // Should handle large requests gracefully
      expect(response.status).toBe(200);
    });

    it('should validate content-type and handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'malformed json{',
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('POST /api/export - Audit Logging', () => {
    beforeEach(() => {
      // Setup valid authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-1' },
        error: null,
      });

      mockExportService.exportData.mockResolvedValue('test,data');
    });

    it('should log successful export requests', async () => {
      mockSupabase.from().insert().select.mockResolvedValue({
        data: { id: 'audit-1' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        headers: {
          'user-agent': 'Test Browser',
          'x-forwarded-for': '192.168.1.100',
        },
        body: JSON.stringify({
          options: { 
            format: 'csv',
            includePersonalData: true,
          },
          type: 'data',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      
      // Verify audit log was created
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'admin-1',
          action: 'export_data',
          resource_type: 'data',
          metadata: expect.objectContaining({
            format: 'csv',
            includePersonalData: true,
            userAgent: 'Test Browser',
            ipAddress: '192.168.1.100',
          }),
        })
      );
    });

    it('should log failed export attempts', async () => {
      mockSupabase.from().insert().select
        .mockResolvedValueOnce({
          data: { id: 'audit-1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'audit-2' },
          error: null,
        });

      mockExportService.exportData.mockRejectedValue(
        new Error('Export service unavailable')
      );

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'csv' },
          type: 'data',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Export generation failed');
      
      // Verify failure audit log was created
      expect(mockSupabase.from().insert).toHaveBeenCalledTimes(2);
      expect(mockSupabase.from().insert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          user_id: 'admin-1',
          action: 'export_failed',
          metadata: expect.objectContaining({
            error: 'Export service unavailable',
          }),
        })
      );
    });

    it('should handle audit logging failures gracefully', async () => {
      // Mock audit log failure
      mockSupabase.from().insert().select.mockRejectedValue(
        new Error('Audit log database error')
      );

      mockExportService.exportData.mockResolvedValue('test,data');

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'csv' },
          type: 'data',
        }),
      });

      const response = await POST(request);

      // Should still succeed despite audit logging failure
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/export - Error Handling', () => {
    beforeEach(() => {
      // Setup valid authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-1' },
        error: null,
      });

      mockSupabase.from().insert().select.mockResolvedValue({
        data: { id: 'audit-1' },
        error: null,
      });
    });

    it('should handle export service errors gracefully', async () => {
      mockExportService.exportData.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'csv' },
          type: 'data',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Export generation failed');
      expect(data.details).toBe('Database connection failed');
    });

    it('should handle survey not found errors', async () => {
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { role: 'org_admin', organization_id: 'org-1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: new Error('Survey not found'),
        });

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'pdf' },
          type: 'survey_report',
          surveyId: 'non-existent',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Survey not found');
    });

    it('should handle blob conversion errors', async () => {
      // Mock a corrupted blob
      const corruptedBlob = {
        arrayBuffer: jest.fn().mockRejectedValue(new Error('Blob read error')),
      };
      
      mockExportService.generateSurveyPDF.mockResolvedValue(corruptedBlob as any);

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'pdf' },
          type: 'survey_report',
          surveyId: 'survey-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Export generation failed');
    });

    it('should handle memory overflow for large exports', async () => {
      // Mock a very large export that could cause memory issues
      const largeData = 'x'.repeat(1024 * 1024 * 100); // 100MB string
      mockExportService.exportData.mockResolvedValue(largeData);

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'csv' },
          type: 'data',
        }),
      });

      const response = await POST(request);

      // Should handle large data gracefully
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Length')).toBe(largeData.length.toString());
    });
  });

  describe('GET /api/export - Export Information', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return export capabilities for authenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'user' },
        error: null,
      });

      mockSupabase.from().select().eq().gte().order.mockResolvedValue({
        data: [
          {
            action: 'export_data',
            created_at: '2024-01-01T12:00:00Z',
            metadata: { format: 'csv' },
          },
          {
            action: 'export_data',
            created_at: '2024-01-02T12:00:00Z',
            metadata: { format: 'json' },
          },
        ],
        error: null,
      });

      mockExportService.getAvailableFormats.mockReturnValue([
        { value: 'csv', label: 'CSV', description: 'Comma-separated values' },
        { value: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
        { value: 'pdf', label: 'PDF', description: 'Portable Document Format' }
      ]);

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.formats).toEqual(['csv', 'json', 'pdf']);
      expect(data.canExportPersonalData).toBe(false); // Regular user
      expect(data.recentExports).toHaveLength(2);
      expect(data.exportCount).toBe(2);
    });

    it('should indicate personal data export capability for admin users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      mockSupabase.from().select().eq().gte().order.mockResolvedValue({
        data: [],
        error: null,
      });

      mockExportService.getAvailableFormats.mockReturnValue([
        { value: 'csv', label: 'CSV', description: 'Comma-separated values' },
        { value: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
        { value: 'pdf', label: 'PDF', description: 'Portable Document Format' }
      ]);

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canExportPersonalData).toBe(true); // Admin user
    });

    it('should handle export statistics fetch errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'user' },
        error: null,
      });

      mockSupabase.from().select().eq().gte().order.mockResolvedValue({
        data: null,
        error: new Error('Stats fetch failed'),
      });

      mockExportService.getAvailableFormats.mockReturnValue([
        { value: 'csv', label: 'CSV', description: 'Comma-separated values' },
        { value: 'json', label: 'JSON', description: 'JavaScript Object Notation' }
      ]);

      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.formats).toEqual(['csv', 'json']);
      expect(data.recentExports).toEqual([]); // Empty due to fetch failure
      expect(data.exportCount).toBe(0);
    });
  });

  describe('Export Security Headers', () => {
    beforeEach(() => {
      // Setup valid authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-1' },
        error: null,
      });

      mockSupabase.from().insert().select.mockResolvedValue({
        data: { id: 'audit-1' },
        error: null,
      });

      mockExportService.exportData.mockResolvedValue('test,data');
    });

    it('should set appropriate security headers for file downloads', async () => {
      const request = new NextRequest('http://localhost:3000/api/export', {
        method: 'POST',
        body: JSON.stringify({
          options: { format: 'csv' },
          type: 'data',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      
      // Check security headers
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
      
      // Check content headers
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Length')).toBe('9'); // 'test,data' length
    });

    it('should generate unique timestamps in filenames', async () => {
      const requests = [
        new NextRequest('http://localhost:3000/api/export', {
          method: 'POST',
          body: JSON.stringify({
            options: { format: 'csv' },
            type: 'data',
          }),
        }),
        new NextRequest('http://localhost:3000/api/export', {
          method: 'POST',
          body: JSON.stringify({
            options: { format: 'json' },
            type: 'data',
          }),
        }),
      ];

      mockExportService.exportData.mockResolvedValue('test,data');

      const responses = await Promise.all(requests.map(req => POST(req)));

      const filename1 = responses[0].headers.get('Content-Disposition');
      const filename2 = responses[1].headers.get('Content-Disposition');

      expect(filename1).toContain('.csv');
      expect(filename2).toContain('.json');
      
      // Should contain today's date
      const today = new Date().toISOString().split('T')[0];
      expect(filename1).toContain(today);
      expect(filename2).toContain(today);
    });
  });

  describe('Rate Limiting Simulation', () => {
    it('should handle high export request volume', async () => {
      // Setup valid authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-1' },
        error: null,
      });

      mockSupabase.from().insert().select.mockResolvedValue({
        data: { id: 'audit-1' },
        error: null,
      });

      // Simulate rate limiting after 3 export requests
      const rateLimiter = (global as any).testHelpers.simulateRateLimit(3);
      
      mockExportService.exportData.mockImplementation(async () => {
        rateLimiter(); // This will throw after 3 calls
        return 'test,data,export';
      });

      const requests = Array.from({ length: 5 }, (_, i) => 
        new NextRequest('http://localhost:3000/api/export', {
          method: 'POST',
          body: JSON.stringify({
            options: { format: 'csv' },
            type: 'data',
          }),
        })
      );

      let successCount = 0;
      let errorCount = 0;

      for (const request of requests) {
        try {
          const response = await POST(request);
          if (response.status === 200) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      // Should have 3 successes and 2 rate limit errors
      expect(successCount).toBe(3);
      expect(errorCount).toBe(2);
    });
  });
});