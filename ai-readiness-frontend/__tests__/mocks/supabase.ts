/**
 * Comprehensive Supabase mocks for testing
 * Provides realistic database and auth behavior for tests
 */

export interface MockUser {
  id: string
  email: string
  password: string
  created_at: string
  updated_at: string
  email_confirm: boolean
  user_metadata: Record<string, any>
}

export interface MockProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  department?: string
  job_title?: string
  preferences?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface MockOrganization {
  id: string
  name: string
  industry: string
  size: string
  created_at: string
  updated_at: string
}

export interface MockSurvey {
  id: string
  organization_id: string
  title: string
  description?: string
  questions: any[]
  settings: Record<string, any>
  status: string
  created_by: string
  created_at: string
  updated_at: string
}

class MockSupabaseStorage {
  private users: Map<string, MockUser> = new Map()
  private profiles: Map<string, MockProfile> = new Map()
  private organizations: Map<string, MockOrganization> = new Map()
  private organizationMembers: Map<string, any> = new Map()
  private surveys: Map<string, MockSurvey> = new Map()
  private surveyResponses: Map<string, any> = new Map()
  private llmAnalyses: Map<string, any> = new Map()
  private activityLogs: Map<string, any> = new Map()
  private currentSession: any = null

  generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // User management
  createUser(userData: any): MockUser {
    const user: MockUser = {
      id: this.generateId(),
      email: userData.email,
      password: userData.password,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email_confirm: userData.email_confirm || false,
      user_metadata: userData.user_metadata || {}
    }
    
    this.users.set(user.id, user)
    
    // Auto-create profile
    const profile: MockProfile = {
      id: this.generateId(),
      user_id: user.id,
      first_name: userData.user_metadata?.firstName || 'Test',
      last_name: userData.user_metadata?.lastName || 'User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    this.profiles.set(profile.id, profile)
    
    return user
  }

  getUserByEmail(email: string): MockUser | null {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user
      }
    }
    return null
  }

  getProfileByUserId(userId: string): MockProfile | null {
    for (const profile of this.profiles.values()) {
      if (profile.user_id === userId) {
        return profile
      }
    }
    return null
  }

  // Organization management
  createOrganization(orgData: any): MockOrganization {
    const org: MockOrganization = {
      id: this.generateId(),
      name: orgData.name,
      industry: orgData.industry || 'Technology',
      size: orgData.size || 'Medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    this.organizations.set(org.id, org)
    return org
  }

  addOrganizationMember(userId: string, organizationId: string, role: string = 'member') {
    const membership = {
      id: this.generateId(),
      user_id: userId,
      organization_id: organizationId,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    this.organizationMembers.set(membership.id, membership)
    return membership
  }

  // Survey management
  createSurvey(surveyData: any): MockSurvey {
    const survey: MockSurvey = {
      id: this.generateId(),
      organization_id: surveyData.organization_id,
      title: surveyData.title,
      description: surveyData.description,
      questions: surveyData.questions || [],
      settings: surveyData.settings || {},
      status: surveyData.status || 'active',
      created_by: surveyData.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    this.surveys.set(survey.id, survey)
    return survey
  }

  // Authentication
  signIn(email: string, password: string) {
    const user = this.getUserByEmail(email)
    if (!user || user.password !== password) {
      throw new Error('Invalid credentials')
    }
    
    this.currentSession = {
      access_token: 'mock-access-token-' + Date.now(),
      refresh_token: 'mock-refresh-token-' + Date.now(),
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    }
    
    return {
      user: this.currentSession.user,
      session: this.currentSession
    }
  }

  signOut() {
    this.currentSession = null
    return { error: null }
  }

  getSession() {
    return {
      data: { session: this.currentSession },
      error: null
    }
  }

  refreshSession() {
    if (!this.currentSession) {
      throw new Error('No active session')
    }
    
    // Create new tokens with additional randomness
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 10000)
    this.currentSession.access_token = `mock-access-token-${timestamp}-${random}`
    this.currentSession.refresh_token = `mock-refresh-token-${timestamp}-${random}`
    
    return {
      data: { session: this.currentSession },
      error: null
    }
  }

  // Database operations
  from(table: string) {
    return new MockQueryBuilder(table, this)
  }

  // Clean up
  reset() {
    this.users.clear()
    this.profiles.clear()
    this.organizations.clear()
    this.organizationMembers.clear()
    this.surveys.clear()
    this.surveyResponses.clear()
    this.llmAnalyses.clear()
    this.activityLogs.clear()
    this.currentSession = null
  }

  // Table access methods
  getTable(tableName: string): Map<string, any> {
    switch (tableName) {
      case 'profiles': return this.profiles
      case 'organizations': return this.organizations
      case 'organization_members': return this.organizationMembers
      case 'surveys': return this.surveys
      case 'survey_responses': return this.surveyResponses
      case 'llm_analyses': return this.llmAnalyses
      case 'activity_logs': return this.activityLogs
      default: return new Map()
    }
  }
}

class MockQueryBuilder {
  private table: string
  private storage: MockSupabaseStorage
  private filters: any[] = []
  private selectFields: string = '*'
  private limitValue?: number
  private singleRecord = false
  private orderBy?: { column: string, ascending: boolean }
  private updateData?: any
  private insertData?: any
  private operation?: string

  constructor(table: string, storage: MockSupabaseStorage) {
    this.table = table
    this.storage = storage
  }

  select(fields: string = '*') {
    this.selectFields = fields
    return this
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value })
    return this
  }

  neq(column: string, value: any) {
    this.filters.push({ type: 'neq', column, value })
    return this
  }

  limit(count: number) {
    this.limitValue = count
    return this
  }

  single() {
    this.singleRecord = true
    return this
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this.orderBy = { column, ascending: options.ascending !== false }
    return this
  }

  insert(data: any) {
    this.insertData = data
    this.operation = 'insert'
    return this
  }

  async executeInsert() {
    const records = Array.isArray(this.insertData) ? this.insertData : [this.insertData]
    const insertedRecords: any[] = []
    const tableMap = this.storage.getTable(this.table)

    for (const record of records) {
      const newRecord = {
        ...record,
        id: record.id || this.storage.generateId(),
        created_at: record.created_at || new Date().toISOString(),
        updated_at: record.updated_at || new Date().toISOString()
      }

      // Validate foreign keys
      if (this.table === 'surveys' && record.created_by) {
        const user = Array.from(this.storage.getTable('profiles').values())
          .find((p: any) => p.user_id === record.created_by)
        if (!user) {
          return { data: null, error: { message: 'violates foreign key constraint' } }
        }
      }

      tableMap.set(newRecord.id, newRecord)
      insertedRecords.push(newRecord)
    }

    return { 
      data: this.singleRecord ? insertedRecords[0] : insertedRecords, 
      error: null 
    }
  }

  update(data: any) {
    this.updateData = data
    this.operation = 'update'
    return this
  }

  async executeUpdate() {
    const tableMap = this.storage.getTable(this.table)
    const updatedRecords: any[] = []

    for (const [id, record] of tableMap.entries()) {
      if (this.matchesFilters(record as any)) {
        const updatedRecord = {
          ...record,
          ...this.updateData,
          updated_at: new Date().toISOString()
        }
        tableMap.set(id, updatedRecord)
        updatedRecords.push(updatedRecord)
      }
    }

    return { 
      data: this.singleRecord ? updatedRecords[0] : updatedRecords, 
      error: null 
    }
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  async executeDelete() {
    const tableMap = this.storage.getTable(this.table)
    const deletedRecords: any[] = []

    for (const [id, record] of tableMap.entries()) {
      if (this.matchesFilters(record as any)) {
        deletedRecords.push(record)
        tableMap.delete(id)

        // Handle cascading deletes for surveys
        if (this.table === 'surveys') {
          // Delete related survey responses
          const responsesMap = this.storage.getTable('survey_responses')
          for (const [respId, response] of responsesMap.entries()) {
            if ((response as any).survey_id === id) {
              responsesMap.delete(respId)
            }
          }

          // Delete related LLM analyses
          const analysesMap = this.storage.getTable('llm_analyses')
          for (const [analysisId, analysis] of analysesMap.entries()) {
            if ((analysis as any).survey_id === id) {
              analysesMap.delete(analysisId)
            }
          }
        }
      }
    }

    return { data: deletedRecords, error: null }
  }

  private matchesFilters(record: any): boolean {
    return this.filters.every(filter => {
      switch (filter.type) {
        case 'eq':
          return record[filter.column] === filter.value
        case 'neq':
          return record[filter.column] !== filter.value
        default:
          return true
      }
    })
  }

  private async execute() {
    // Handle update operations
    if (this.operation === 'update') {
      return this.executeUpdate()
    }
    
    // Handle insert operations
    if (this.operation === 'insert') {
      return this.executeInsert()
    }
    
    // Handle delete operations
    if (this.operation === 'delete') {
      return this.executeDelete()
    }
    
    // Handle select operations
    const tableMap = this.storage.getTable(this.table)
    let results: any[] = []

    for (const record of tableMap.values()) {
      if (this.matchesFilters(record as any)) {
        results.push(record)
      }
    }

    // Apply ordering
    if (this.orderBy) {
      results.sort((a, b) => {
        const aVal = a[this.orderBy!.column]
        const bVal = b[this.orderBy!.column]
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return this.orderBy!.ascending ? comparison : -comparison
      })
    }

    // Apply limit
    if (this.limitValue) {
      results = results.slice(0, this.limitValue)
    }

    // Handle single record
    if (this.singleRecord) {
      return results.length > 0 
        ? { data: results[0], error: null }
        : { data: null, error: { message: 'No rows returned' } }
    }

    return { data: results, error: null }
  }

  // Make the query builder thenable so it can be awaited
  then(resolve: any, reject: any) {
    return this.execute().then(resolve, reject)
  }

  catch(reject: any) {
    return this.execute().catch(reject)
  }
}

// Global mock storage instance
const mockStorage = new MockSupabaseStorage()

// Make storage available globally for cleanup
if (typeof global !== 'undefined') {
  global.mockStorage = mockStorage
}

// Mock Supabase client
export const createMockSupabaseClient = () => {
  // Each client instance has its own session state
  let clientSession: any = null
  
  return {
    auth: {
      // User auth methods
      signInWithPassword: async ({ email, password }: { email: string, password: string }) => {
        try {
          const user = mockStorage.getUserByEmail(email)
          if (!user || user.password !== password) {
            return { data: null, error: { message: 'Invalid credentials' } }
          }
          
          clientSession = {
            access_token: `mock-access-token-${Date.now()}-${Math.random()}`,
            refresh_token: `mock-refresh-token-${Date.now()}-${Math.random()}`,
            expires_in: 3600,
            token_type: 'bearer',
            user: {
              id: user.id,
              email: user.email,
              created_at: user.created_at,
              updated_at: user.updated_at
            }
          }
          
          return {
            user: clientSession.user,
            session: clientSession
          }
        } catch (error: any) {
          return { data: null, error: { message: error.message } }
        }
      },

      signOut: async () => {
        clientSession = null
        return { error: null }
      },

      getSession: async () => {
        return {
          data: { session: clientSession },
          error: null
        }
      },

      refreshSession: async () => {
        if (!clientSession) {
          return { data: { session: null }, error: { message: 'No active session' } }
        }
        
        // Create new tokens with randomness
        const timestamp = Date.now()
        const random = Math.floor(Math.random() * 10000)
        const newSession = {
          ...clientSession,
          access_token: `mock-access-token-${timestamp}-${random}`,
          refresh_token: `mock-refresh-token-${timestamp}-${random}`
        }
        clientSession = newSession
        
        return {
          data: { session: clientSession },
          error: null
        }
      },

      // Admin methods
      admin: {
        createUser: async (userData: any) => {
          try {
            // Check for duplicate email
            const existing = mockStorage.getUserByEmail(userData.email)
            if (existing) {
              return { 
                data: null, 
                error: { message: 'User with this email already registered' } 
              }
            }

            // Validate password
            if (userData.password && userData.password.length < 6) {
              return { 
                data: null, 
                error: { message: 'Password should be at least 6 characters' } 
              }
            }

            // Validate email
            if (!userData.email || !userData.email.includes('@')) {
              return { 
                data: null, 
                error: { message: 'Invalid email format' } 
              }
            }

            const user = mockStorage.createUser(userData)
            return { data: { user }, error: null }
          } catch (error: any) {
            return { data: null, error: { message: error.message } }
          }
        },

        deleteUser: async (userId: string) => {
          // This would normally delete from auth, but for mocking we'll just return success
          return { data: null, error: null }
        },

        listUsers: async () => {
          const users = Array.from(mockStorage['users'].values())
          return { data: { users }, error: null }
        }
      }
    },

    // Database methods
    from: (table: string) => mockStorage.from(table),

    // RPC methods
    rpc: async (functionName: string, params?: any) => {
      if (functionName === 'reset_test_data') {
        mockStorage.reset()
        return { data: null, error: null }
      }
      return { data: null, error: { message: 'Function not found' } }
    }
  }
}

// Mock the actual Supabase modules
export const mockSupabaseClient = createMockSupabaseClient()

// Export the storage for test utilities
export { mockStorage }