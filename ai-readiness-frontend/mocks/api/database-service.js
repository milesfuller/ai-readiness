// ============================================================================
// Enhanced Database Mock Service for Supabase
// ============================================================================
// This service provides comprehensive database mocking for surveys, responses,
// profiles, and other app data with full CRUD operations and relationships.

const crypto = require('crypto');

class DatabaseService {
  constructor() {
    this.tables = new Map();
    this.relationships = new Map();
    this.triggers = new Map();
    
    // Initialize database schema
    this.initializeSchema();
    this.initializeTestData();
  }

  initializeSchema() {
    // Profiles table
    this.tables.set('profiles', {
      schema: {
        id: { type: 'uuid', primaryKey: true },
        user_id: { type: 'uuid', foreignKey: 'auth.users.id', unique: true },
        first_name: { type: 'text' },
        last_name: { type: 'text' },
        organization_name: { type: 'text' },
        role: { type: 'text', default: 'user' },
        avatar_url: { type: 'text', nullable: true },
        created_at: { type: 'timestamp', default: 'now()' },
        updated_at: { type: 'timestamp', default: 'now()' }
      },
      data: new Map(),
      indexes: ['user_id', 'role']
    });

    // Organizations table
    this.tables.set('organizations', {
      schema: {
        id: { type: 'uuid', primaryKey: true },
        name: { type: 'text', unique: true },
        description: { type: 'text', nullable: true },
        industry: { type: 'text', nullable: true },
        size: { type: 'text', nullable: true },
        created_by: { type: 'uuid', foreignKey: 'profiles.user_id' },
        created_at: { type: 'timestamp', default: 'now()' },
        updated_at: { type: 'timestamp', default: 'now()' }
      },
      data: new Map(),
      indexes: ['name', 'created_by']
    });

    // Surveys table
    this.tables.set('surveys', {
      schema: {
        id: { type: 'uuid', primaryKey: true },
        title: { type: 'text' },
        description: { type: 'text', nullable: true },
        status: { type: 'text', default: 'draft' }, // draft, active, completed, archived
        organization_id: { type: 'uuid', foreignKey: 'organizations.id' },
        created_by: { type: 'uuid', foreignKey: 'profiles.user_id' },
        questions: { type: 'jsonb', default: '[]' },
        settings: { type: 'jsonb', default: '{}' },
        created_at: { type: 'timestamp', default: 'now()' },
        updated_at: { type: 'timestamp', default: 'now()' },
        started_at: { type: 'timestamp', nullable: true },
        completed_at: { type: 'timestamp', nullable: true }
      },
      data: new Map(),
      indexes: ['status', 'organization_id', 'created_by']
    });

    // Survey Sessions table
    this.tables.set('survey_sessions', {
      schema: {
        id: { type: 'uuid', primaryKey: true },
        survey_id: { type: 'uuid', foreignKey: 'surveys.id' },
        user_id: { type: 'uuid', foreignKey: 'profiles.user_id', nullable: true },
        status: { type: 'text', default: 'in_progress' }, // in_progress, completed, abandoned
        current_question: { type: 'integer', default: 0 },
        responses: { type: 'jsonb', default: '{}' },
        metadata: { type: 'jsonb', default: '{}' },
        started_at: { type: 'timestamp', default: 'now()' },
        completed_at: { type: 'timestamp', nullable: true },
        updated_at: { type: 'timestamp', default: 'now()' }
      },
      data: new Map(),
      indexes: ['survey_id', 'user_id', 'status']
    });

    // Survey Responses table
    this.tables.set('survey_responses', {
      schema: {
        id: { type: 'uuid', primaryKey: true },
        session_id: { type: 'uuid', foreignKey: 'survey_sessions.id' },
        question_id: { type: 'text' },
        question_type: { type: 'text' },
        response_value: { type: 'jsonb' },
        response_text: { type: 'text', nullable: true },
        confidence_score: { type: 'numeric', nullable: true },
        metadata: { type: 'jsonb', default: '{}' },
        created_at: { type: 'timestamp', default: 'now()' },
        updated_at: { type: 'timestamp', default: 'now()' }
      },
      data: new Map(),
      indexes: ['session_id', 'question_id', 'question_type']
    });

    // AI Analysis Results table
    this.tables.set('ai_analysis_results', {
      schema: {
        id: { type: 'uuid', primaryKey: true },
        survey_id: { type: 'uuid', foreignKey: 'surveys.id' },
        analysis_type: { type: 'text' }, // readiness_score, recommendations, insights
        results: { type: 'jsonb' },
        confidence_score: { type: 'numeric' },
        model_used: { type: 'text' },
        processing_time: { type: 'interval', nullable: true },
        created_at: { type: 'timestamp', default: 'now()' },
        updated_at: { type: 'timestamp', default: 'now()' }
      },
      data: new Map(),
      indexes: ['survey_id', 'analysis_type']
    });

    // Audit Log table
    this.tables.set('audit_logs', {
      schema: {
        id: { type: 'uuid', primaryKey: true },
        table_name: { type: 'text' },
        record_id: { type: 'uuid' },
        action: { type: 'text' }, // INSERT, UPDATE, DELETE
        old_values: { type: 'jsonb', nullable: true },
        new_values: { type: 'jsonb', nullable: true },
        user_id: { type: 'uuid', foreignKey: 'profiles.user_id', nullable: true },
        ip_address: { type: 'inet', nullable: true },
        user_agent: { type: 'text', nullable: true },
        created_at: { type: 'timestamp', default: 'now()' }
      },
      data: new Map(),
      indexes: ['table_name', 'record_id', 'user_id', 'created_at']
    });

    console.log('📊 Database schema initialized with tables:', Array.from(this.tables.keys()));
  }

  initializeTestData() {
    // Test profiles
    const testProfiles = [
      {
        id: 'profile-123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'Test',
        last_name: 'User',
        organization_name: 'Test Organization',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'profile-123e4567-e89b-12d3-a456-426614174001',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        first_name: 'Test',
        last_name: 'Admin',
        organization_name: 'Admin Organization',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    testProfiles.forEach(profile => {
      this.tables.get('profiles').data.set(profile.id, profile);
    });

    // Test organizations
    const testOrganizations = [
      {
        id: 'org-123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Organization',
        description: 'A test organization for e2e testing',
        industry: 'Technology',
        size: 'Small (1-50 employees)',
        created_by: '123e4567-e89b-12d3-a456-426614174000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    testOrganizations.forEach(org => {
      this.tables.get('organizations').data.set(org.id, org);
    });

    // Test surveys
    const testSurveys = [
      {
        id: 'survey-123e4567-e89b-12d3-a456-426614174000',
        title: 'AI Readiness Assessment',
        description: 'Comprehensive assessment of organizational AI readiness',
        status: 'active',
        organization_id: 'org-123e4567-e89b-12d3-a456-426614174000',
        created_by: '123e4567-e89b-12d3-a456-426614174000',
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            text: 'What is your primary business objective for AI implementation?',
            options: [
              'Improve operational efficiency',
              'Enhance customer experience',
              'Drive innovation',
              'Reduce costs',
              'Other'
            ],
            required: true
          },
          {
            id: 'q2',
            type: 'scale',
            text: 'How would you rate your organization\'s current data quality?',
            scale: { min: 1, max: 10, labels: { 1: 'Poor', 10: 'Excellent' } },
            required: true
          },
          {
            id: 'q3',
            type: 'text',
            text: 'What are your main concerns about AI implementation?',
            required: false
          }
        ],
        settings: {
          allowAnonymous: true,
          requireAuth: false,
          enableVoiceRecording: true,
          autoSave: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        started_at: new Date().toISOString()
      }
    ];

    testSurveys.forEach(survey => {
      this.tables.get('surveys').data.set(survey.id, survey);
    });

    // Test survey sessions
    const testSessions = [
      {
        id: 'session-123e4567-e89b-12d3-a456-426614174000',
        survey_id: 'survey-123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'completed',
        current_question: 3,
        responses: {
          q1: { value: 'Improve operational efficiency', timestamp: new Date().toISOString() },
          q2: { value: 8, timestamp: new Date().toISOString() },
          q3: { value: 'Data privacy and security concerns', timestamp: new Date().toISOString() }
        },
        metadata: {
          browser: 'Chrome/91.0',
          platform: 'Windows',
          startTime: new Date().toISOString(),
          totalTime: 300 // seconds
        },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    testSessions.forEach(session => {
      this.tables.get('survey_sessions').data.set(session.id, session);
    });

    console.log('🎯 Test data initialized successfully');
  }

  // Generate UUID
  generateId() {
    return crypto.randomUUID();
  }

  // Generate timestamp
  generateTimestamp() {
    return new Date().toISOString();
  }

  // Validate foreign key constraints
  validateForeignKeys(tableName, data) {
    const table = this.tables.get(tableName);
    if (!table) throw new Error(`Table ${tableName} not found`);

    for (const [field, config] of Object.entries(table.schema)) {
      if (config.foreignKey && data[field]) {
        const [refTable, refField] = config.foreignKey.split('.');
        const refTableData = this.tables.get(refTable);
        
        if (refTable === 'auth.users') {
          // Special handling for auth.users (handled by AuthService)
          continue;
        }

        if (!refTableData) {
          throw new Error(`Referenced table ${refTable} not found`);
        }

        const refExists = Array.from(refTableData.data.values())
          .some(record => record[refField] === data[field]);
        
        if (!refExists) {
          throw new Error(`Foreign key constraint failed: ${field} references ${config.foreignKey}`);
        }
      }
    }
  }

  // Apply default values
  applyDefaults(tableName, data) {
    const table = this.tables.get(tableName);
    const result = { ...data };

    for (const [field, config] of Object.entries(table.schema)) {
      if (result[field] === undefined && config.default !== undefined) {
        if (config.default === 'now()') {
          result[field] = this.generateTimestamp();
        } else if (config.type === 'uuid' && config.primaryKey) {
          result[field] = this.generateId();
        } else {
          result[field] = config.default;
        }
      }
    }

    return result;
  }

  // SELECT operation
  select(tableName, options = {}) {
    const table = this.tables.get(tableName);
    if (!table) throw new Error(`Table ${tableName} not found`);

    let results = Array.from(table.data.values());

    // Apply filters (WHERE clause)
    if (options.filters) {
      results = results.filter(record => {
        return Object.entries(options.filters).every(([field, value]) => {
          if (typeof value === 'object' && value.operator) {
            switch (value.operator) {
              case 'eq': return record[field] === value.value;
              case 'neq': return record[field] !== value.value;
              case 'gt': return record[field] > value.value;
              case 'gte': return record[field] >= value.value;
              case 'lt': return record[field] < value.value;
              case 'lte': return record[field] <= value.value;
              case 'like': return String(record[field]).toLowerCase().includes(String(value.value).toLowerCase());
              case 'in': return value.value.includes(record[field]);
              default: return record[field] === value.value;
            }
          }
          return record[field] === value;
        });
      });
    }

    // Apply ordering
    if (options.orderBy) {
      results.sort((a, b) => {
        const field = options.orderBy.field;
        const direction = options.orderBy.direction || 'asc';
        
        let comparison = 0;
        if (a[field] < b[field]) comparison = -1;
        if (a[field] > b[field]) comparison = 1;
        
        return direction === 'desc' ? -comparison : comparison;
      });
    }

    // Apply pagination
    if (options.limit || options.offset) {
      const offset = options.offset || 0;
      const limit = options.limit || results.length;
      results = results.slice(offset, offset + limit);
    }

    // Apply column selection
    if (options.select) {
      results = results.map(record => {
        const selected = {};
        options.select.forEach(field => {
          if (record.hasOwnProperty(field)) {
            selected[field] = record[field];
          }
        });
        return selected;
      });
    }

    return results;
  }

  // INSERT operation
  insert(tableName, data, options = {}) {
    const table = this.tables.get(tableName);
    if (!table) throw new Error(`Table ${tableName} not found`);

    const records = Array.isArray(data) ? data : [data];
    const results = [];

    for (const record of records) {
      // Apply defaults
      const processedRecord = this.applyDefaults(tableName, record);
      
      // Validate foreign keys
      this.validateForeignKeys(tableName, processedRecord);
      
      // Check unique constraints
      for (const [field, config] of Object.entries(table.schema)) {
        if (config.unique || config.primaryKey) {
          const exists = Array.from(table.data.values())
            .some(existing => existing[field] === processedRecord[field]);
          
          if (exists) {
            throw new Error(`Unique constraint failed: ${field} already exists`);
          }
        }
      }

      // Generate ID if needed
      if (!processedRecord.id) {
        processedRecord.id = this.generateId();
      }

      // Store record
      table.data.set(processedRecord.id, processedRecord);
      results.push(processedRecord);

      // Log audit trail
      this.logAudit(tableName, processedRecord.id, 'INSERT', null, processedRecord, options.userId);
    }

    return results.length === 1 ? results[0] : results;
  }

  // UPDATE operation
  update(tableName, filters, updates, options = {}) {
    const table = this.tables.get(tableName);
    if (!table) throw new Error(`Table ${tableName} not found`);

    const records = this.select(tableName, { filters });
    const results = [];

    for (const record of records) {
      const oldRecord = { ...record };
      const updatedRecord = { 
        ...record, 
        ...updates, 
        updated_at: this.generateTimestamp() 
      };

      // Validate foreign keys for updated fields
      this.validateForeignKeys(tableName, updatedRecord);

      // Update in storage
      table.data.set(record.id, updatedRecord);
      results.push(updatedRecord);

      // Log audit trail
      this.logAudit(tableName, record.id, 'UPDATE', oldRecord, updatedRecord, options.userId);
    }

    return results;
  }

  // DELETE operation
  delete(tableName, filters, options = {}) {
    const table = this.tables.get(tableName);
    if (!table) throw new Error(`Table ${tableName} not found`);

    const records = this.select(tableName, { filters });
    const results = [];

    for (const record of records) {
      table.data.delete(record.id);
      results.push(record);

      // Log audit trail
      this.logAudit(tableName, record.id, 'DELETE', record, null, options.userId);
    }

    return results;
  }

  // UPSERT operation (INSERT or UPDATE)
  upsert(tableName, data, conflictFields = ['id'], options = {}) {
    const table = this.tables.get(tableName);
    if (!table) throw new Error(`Table ${tableName} not found`);

    const records = Array.isArray(data) ? data : [data];
    const results = [];

    for (const record of records) {
      // Check if record exists based on conflict fields
      const filters = {};
      conflictFields.forEach(field => {
        if (record[field] !== undefined) {
          filters[field] = record[field];
        }
      });

      const existing = this.select(tableName, { filters });

      if (existing.length > 0) {
        // Update existing record
        const updates = { ...record };
        delete updates.id; // Don't update ID
        const updated = this.update(tableName, filters, updates, options);
        results.push(updated[0]);
      } else {
        // Insert new record
        const inserted = this.insert(tableName, record, options);
        results.push(inserted);
      }
    }

    return results.length === 1 ? results[0] : results;
  }

  // Log audit trail
  logAudit(tableName, recordId, action, oldValues, newValues, userId = null) {
    const auditRecord = {
      id: this.generateId(),
      table_name: tableName,
      record_id: recordId,
      action,
      old_values: oldValues,
      new_values: newValues,
      user_id: userId,
      created_at: this.generateTimestamp()
    };

    this.tables.get('audit_logs').data.set(auditRecord.id, auditRecord);
  }

  // Get table statistics
  getTableStats(tableName) {
    const table = this.tables.get(tableName);
    if (!table) throw new Error(`Table ${tableName} not found`);

    return {
      name: tableName,
      rowCount: table.data.size,
      schema: table.schema,
      indexes: table.indexes
    };
  }

  // Get all table statistics
  getAllStats() {
    const stats = {};
    for (const tableName of this.tables.keys()) {
      stats[tableName] = this.getTableStats(tableName);
    }
    return stats;
  }

  // Reset all data (for testing)
  reset() {
    for (const table of this.tables.values()) {
      table.data.clear();
    }
    this.initializeTestData();
  }

  // Backup data
  backup() {
    const backup = {};
    for (const [tableName, table] of this.tables.entries()) {
      backup[tableName] = Array.from(table.data.values());
    }
    return backup;
  }

  // Restore data
  restore(backup) {
    for (const [tableName, records] of Object.entries(backup)) {
      const table = this.tables.get(tableName);
      if (table) {
        table.data.clear();
        records.forEach(record => {
          table.data.set(record.id, record);
        });
      }
    }
  }
}

module.exports = DatabaseService;