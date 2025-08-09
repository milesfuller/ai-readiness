/**
 * Database Contract Module
 * Re-exports all database-related types and schemas from schema.ts
 */

// Import all exports from schema
import * as schema from './schema.js'

// Re-export everything for backward compatibility
export * from './schema.js'

// Explicit exports that validation scripts look for (with const declarations)
export const UsersTableSchema = schema.UsersTableSchema
export const SurveysTableSchema = schema.SurveysTableSchema
export const QuestionsTableSchema = schema.QuestionsTableSchema
export const ResponsesTableSchema = schema.ResponsesTableSchema
export const ForeignKeyConstraints = schema.ForeignKeyConstraints
export const DatabaseIndexes = schema.DatabaseIndexes
export const validateTableSchema = schema.validateTableSchema
export const validateDatabaseRow = schema.validateDatabaseRow
export const isValidUUID = schema.isValidUUID
export const isValidEmail = schema.isValidEmail
export const isValidJSON = schema.isValidJSON
export const AllTableSchemas = schema.AllTableSchemas