import type { 
  SurveyTemplate, 
  TemplateQuestion, 
  TemplateFilters, 
  QuestionLibraryItem,
  TemplateVersion,
  TemplateShare,
  TemplateReview,
  QuestionType 
} from '@/lib/types'

export interface PaginatedTemplateResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export class TemplateService {
  private baseUrl = '/api/templates'

  async getTemplates(
    filters: TemplateFilters = {},
    page = 1,
    pageSize = 12
  ): Promise<PaginatedTemplateResult<SurveyTemplate>> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    })

    if (filters.search) params.set('search', filters.search)
    if (filters.category) params.set('category', filters.category)
    if (filters.status) params.set('status', filters.status)
    if (filters.visibility) params.set('visibility', filters.visibility)
    if (filters.tags?.length) params.set('tags', filters.tags.join(','))
    if (filters.rating) params.set('rating', filters.rating.toString())
    if (filters.difficultyLevel) params.set('difficultyLevel', filters.difficultyLevel.toString())

    const response = await fetch(`${this.baseUrl}?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`)
    }

    return response.json()
  }

  async getTemplate(templateId: string): Promise<SurveyTemplate> {
    const response = await fetch(`${this.baseUrl}/${templateId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`)
    }

    return response.json()
  }

  async createTemplate(template: Partial<SurveyTemplate>): Promise<SurveyTemplate> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(template),
    })

    if (!response.ok) {
      throw new Error(`Failed to create template: ${response.statusText}`)
    }

    return response.json()
  }

  async updateTemplate(
    templateId: string, 
    updates: Partial<SurveyTemplate>,
    versionNotes?: string
  ): Promise<SurveyTemplate> {
    const payload = { ...updates }
    if (versionNotes) {
      (payload as any).versionNotes = versionNotes
    }

    const response = await fetch(`${this.baseUrl}/${templateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Failed to update template: ${response.statusText}`)
    }

    return response.json()
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${templateId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`Failed to delete template: ${response.statusText}`)
    }
  }

  async duplicateTemplate(
    templateId: string, 
    newTitle: string, 
    organizationId?: string
  ): Promise<SurveyTemplate> {
    const response = await fetch(`${this.baseUrl}/${templateId}/duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: newTitle, organizationId }),
    })

    if (!response.ok) {
      throw new Error(`Failed to duplicate template: ${response.statusText}`)
    }

    return response.json()
  }

  async getTemplateQuestions(templateId: string): Promise<TemplateQuestion[]> {
    const response = await fetch(`${this.baseUrl}/${templateId}/questions`)
    if (!response.ok) {
      throw new Error(`Failed to fetch template questions: ${response.statusText}`)
    }

    return response.json()
  }

  async addQuestion(templateId: string, question: Partial<TemplateQuestion>): Promise<TemplateQuestion> {
    const response = await fetch(`${this.baseUrl}/${templateId}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(question),
    })

    if (!response.ok) {
      throw new Error(`Failed to add question: ${response.statusText}`)
    }

    return response.json()
  }

  async updateQuestions(templateId: string, questions: Partial<TemplateQuestion>[]): Promise<TemplateQuestion[]> {
    const response = await fetch(`${this.baseUrl}/${templateId}/questions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ questions }),
    })

    if (!response.ok) {
      throw new Error(`Failed to update questions: ${response.statusText}`)
    }

    return response.json()
  }

  async getTemplateCategories(includeStats = false): Promise<any[]> {
    const params = new URLSearchParams()
    if (includeStats) params.set('includeStats', 'true')

    const response = await fetch(`${this.baseUrl}/categories?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`)
    }

    return response.json()
  }

  async publishToMarketplace(templateId: string, marketplaceData: any): Promise<SurveyTemplate> {
    const response = await fetch(`${this.baseUrl}/${templateId}/marketplace`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(marketplaceData),
    })

    if (!response.ok) {
      throw new Error(`Failed to publish to marketplace: ${response.statusText}`)
    }

    return response.json()
  }

  async shareTemplate(
    templateId: string, 
    shareData: Partial<TemplateShare>
  ): Promise<TemplateShare> {
    const response = await fetch(`${this.baseUrl}/${templateId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shareData),
    })

    if (!response.ok) {
      throw new Error(`Failed to share template: ${response.statusText}`)
    }

    return response.json()
  }

  async getTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
    const response = await fetch(`${this.baseUrl}/${templateId}/versions`)
    if (!response.ok) {
      throw new Error(`Failed to fetch template versions: ${response.statusText}`)
    }

    return response.json()
  }

  async revertToVersion(templateId: string, versionNumber: number): Promise<SurveyTemplate> {
    const response = await fetch(`${this.baseUrl}/${templateId}/versions/${versionNumber}/revert`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`Failed to revert to version: ${response.statusText}`)
    }

    return response.json()
  }

  async previewTemplate(templateId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${templateId}/preview`)
    if (!response.ok) {
      throw new Error(`Failed to generate preview: ${response.statusText}`)
    }

    return response.json()
  }

  async validateTemplate(templateId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${templateId}/validate`)
    if (!response.ok) {
      throw new Error(`Failed to validate template: ${response.statusText}`)
    }

    return response.json()
  }
}

// Question Library Service
export class QuestionLibraryService {
  private baseUrl = '/api/questions/library'

  async getQuestionLibrary(
    filters: { 
      search?: string
      type?: QuestionType
      category?: string
      tags?: string[]
    } = {}
  ): Promise<QuestionLibraryItem[]> {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.type) params.set('type', filters.type)
    if (filters.category) params.set('category', filters.category)
    if (filters.tags?.length) params.set('tags', filters.tags.join(','))

    const response = await fetch(`${this.baseUrl}?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch question library: ${response.statusText}`)
    }

    return response.json()
  }

  async addToLibrary(question: Partial<QuestionLibraryItem>): Promise<QuestionLibraryItem> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(question),
    })

    if (!response.ok) {
      throw new Error(`Failed to add question to library: ${response.statusText}`)
    }

    return response.json()
  }

  async getQuestionTypes(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/types`)
    if (!response.ok) {
      throw new Error(`Failed to fetch question types: ${response.statusText}`)
    }

    return response.json()
  }
}

// Singleton instances
export const templateService = new TemplateService()
export const questionLibraryService = new QuestionLibraryService()