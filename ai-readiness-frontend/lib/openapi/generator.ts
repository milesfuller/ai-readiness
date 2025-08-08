/**
 * OpenAPI Specification Generator
 * 
 * Automatically generates and updates OpenAPI specifications from Next.js API routes.
 * Supports introspection of route handlers, TypeScript interfaces, and Zod schemas.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import { z } from 'zod'

// Types for OpenAPI generation
interface RouteInfo {
  path: string
  method: string
  handler: string
  summary?: string
  description?: string
  tags?: string[]
  parameters?: any[]
  requestBody?: any
  responses?: any
  security?: any[]
}

interface OpenAPIConfig {
  title: string
  description: string
  version: string
  servers: { url: string; description: string }[]
  contact?: {
    name: string
    email: string
    url: string
  }
  license?: {
    name: string
    url: string
  }
}

export class OpenAPIGenerator {
  private config: OpenAPIConfig
  private routes: RouteInfo[] = []
  private schemas: Record<string, any> = {}
  
  constructor(config: OpenAPIConfig) {
    this.config = config
  }
  
  /**
   * Scan API routes directory and extract route information
   */
  public scanRoutes(apiDir: string = 'app/api'): void {
    this.routes = []
    this._scanDirectory(apiDir)
  }
  
  /**
   * Generate complete OpenAPI specification
   */
  public generateSpec(): any {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: this.config.title,
        description: this.config.description,
        version: this.config.version,
        contact: this.config.contact,
        license: this.config.license
      },
      servers: this.config.servers,
      security: [
        { bearerAuth: [] },
        { cookieAuth: [] }
      ],
      paths: this._generatePaths(),
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token from Supabase authentication'
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'sb-access-token',
            description: 'Session cookie authentication'
          }
        },
        schemas: this.schemas
      },
      tags: this._generateTags()
    }
    
    return spec
  }
  
  /**
   * Save generated specification to file
   */
  public saveSpec(outputPath: string): void {
    const spec = this.generateSpec()
    writeFileSync(outputPath, JSON.stringify(spec, null, 2))
    console.log(`✅ OpenAPI specification saved to ${outputPath}`)
  }
  
  /**
   * Extract route information from TypeScript files
   */
  private _scanDirectory(dir: string): void {
    const fullPath = join(process.cwd(), dir)
    
    if (!statSync(fullPath).isDirectory()) return
    
    const items = readdirSync(fullPath)
    
    for (const item of items) {
      const itemPath = join(fullPath, item)
      const relativePath = join(dir, item)
      
      if (statSync(itemPath).isDirectory()) {
        // Skip certain directories
        if (item.startsWith('.') || item === 'node_modules') continue
        this._scanDirectory(relativePath)
      } else if (item === 'route.ts' || item === 'route.js') {
        this._extractRouteInfo(relativePath, itemPath)
      }
    }
  }
  
  /**
   * Extract route information from a route file
   */
  private _extractRouteInfo(relativePath: string, fullPath: string): void {
    try {
      const content = readFileSync(fullPath, 'utf8')
      
      // Convert file path to API path
      const apiPath = relativePath
        .replace(/^app\/api/, '')
        .replace(/\/route\.(ts|js)$/, '')
        .replace(/\[([^\]]+)\]/g, '{$1}') // Convert [param] to {param}
        .replace(/\/$/, '') // Remove trailing slash
        || '/'
      
      // Extract HTTP methods
      const methods = this._extractMethods(content)
      
      // Extract documentation comments
      const docs = this._extractDocumentation(content)
      
      // Create route info for each method
      methods.forEach(method => {
        const methodDocs = docs[method.toLowerCase()] || {}
        
        this.routes.push({
          path: apiPath,
          method: method.toLowerCase(),
          handler: fullPath,
          summary: methodDocs.summary,
          description: methodDocs.description,
          tags: methodDocs.tags || this._inferTags(apiPath),
          parameters: this._extractParameters(content, method, apiPath),
          requestBody: this._extractRequestBody(content, method),
          responses: this._extractResponses(content, method),
          security: this._extractSecurity(content, method)
        })
      })
      
    } catch (error) {
      console.warn(`⚠️  Warning: Could not parse route file ${relativePath}:`, error)
    }
  }
  
  /**
   * Extract HTTP methods from route file content
   */
  private _extractMethods(content: string): string[] {
    const methods: string[] = []
    const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']
    
    httpMethods.forEach(method => {
      const regex = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`, 'i')
      if (regex.test(content)) {
        methods.push(method)
      }
    })
    
    return methods
  }
  
  /**
   * Extract JSDoc comments for documentation
   */
  private _extractDocumentation(content: string): Record<string, any> {
    const docs: Record<string, any> = {}
    
    // Look for JSDoc comments above function definitions
    const functionRegex = /\*\/\s*export\s+async\s+function\s+(\w+)/g
    const commentRegex = /\/\*\*([\s\S]*?)\*\//g
    
    let match
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1].toLowerCase()
      const functionStart = match.index
      
      // Look backwards for JSDoc comment
      const beforeFunction = content.substring(0, functionStart)
      const commentMatches = [...beforeFunction.matchAll(commentRegex)]
      
      if (commentMatches.length > 0) {
        const lastComment = commentMatches[commentMatches.length - 1][1]
        docs[functionName] = this._parseJSDocComment(lastComment)
      }
    }
    
    return docs
  }
  
  /**
   * Parse JSDoc comment into structured data
   */
  private _parseJSDocComment(comment: string): any {
    const lines = comment.split('\n').map(line => line.replace(/^\s*\*\s?/, '').trim())
    const result: any = {}
    
    let currentSection = 'description'
    let description = ''
    
    for (const line of lines) {
      if (line.startsWith('@summary')) {
        result.summary = line.replace('@summary', '').trim()
      } else if (line.startsWith('@description')) {
        result.description = line.replace('@description', '').trim()
        currentSection = 'description'
      } else if (line.startsWith('@tags')) {
        result.tags = line.replace('@tags', '').trim().split(',').map(t => t.trim())
      } else if (line.startsWith('@')) {
        // Other JSDoc tags
        continue
      } else if (line && currentSection === 'description') {
        description += (description ? ' ' : '') + line
      }
    }
    
    if (!result.description && description) {
      result.description = description
    }
    
    return result
  }
  
  /**
   * Extract parameters from route content
   */
  private _extractParameters(content: string, method: string, path: string): any[] {
    const parameters: any[] = []
    
    // Path parameters
    const pathParams = path.match(/\{([^}]+)\}/g)
    if (pathParams) {
      pathParams.forEach(param => {
        const paramName = param.slice(1, -1)
        parameters.push({
          name: paramName,
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: `${paramName} parameter`
        })
      })
    }
    
    // Query parameters (basic extraction)
    if (method.toLowerCase() === 'get') {
      const searchParamsRegex = /searchParams\.get\(['"`]([^'"`]+)['"`]\)/g
      let match
      while ((match = searchParamsRegex.exec(content)) !== null) {
        const paramName = match[1]
        if (!parameters.find(p => p.name === paramName)) {
          parameters.push({
            name: paramName,
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: `${paramName} query parameter`
          })
        }
      }
    }
    
    return parameters
  }
  
  /**
   * Extract request body schema
   */
  private _extractRequestBody(content: string, method: string): any {
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      // Look for request.json() usage
      if (content.includes('request.json()')) {
        return {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Request payload'
              }
            }
          }
        }
      }
    }
    
    return undefined
  }
  
  /**
   * Extract response schemas
   */
  private _extractResponses(content: string, method: string): any {
    const responses: any = {}
    
    // Look for NextResponse.json calls
    const responseRegex = /NextResponse\.json\([^,)]+,\s*\{\s*status:\s*(\d+)/g
    let match
    
    while ((match = responseRegex.exec(content)) !== null) {
      const status = match[1]
      responses[status] = {
        description: this._getResponseDescription(status),
        content: {
          'application/json': {
            schema: {
              type: 'object'
            }
          }
        }
      }
    }
    
    // Default success response
    if (!responses['200'] && !responses['201']) {
      responses['200'] = {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: {
              type: 'object'
            }
          }
        }
      }
    }
    
    // Common error responses
    if (content.includes('Unauthorized') || content.includes('401')) {
      responses['401'] = {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      }
    }
    
    if (content.includes('status: 500') || content.includes('Internal server error')) {
      responses['500'] = {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      }
    }
    
    return responses
  }
  
  /**
   * Extract security requirements
   */
  private _extractSecurity(content: string, method: string): any[] {
    // If the route checks authentication, require security
    if (content.includes('supabase.auth.getUser()') || 
        content.includes('getUser()') ||
        content.includes('authError')) {
      return [{ bearerAuth: [] }, { cookieAuth: [] }]
    }
    
    // No security required
    return []
  }
  
  /**
   * Infer tags from API path
   */
  private _inferTags(path: string): string[] {
    const segments = path.split('/').filter(s => s && !s.startsWith('{'))
    
    if (segments.length === 0) return ['General']
    
    const tagMap: Record<string, string> = {
      'auth': 'Authentication',
      'survey': 'Survey',
      'analytics': 'Analytics', 
      'llm': 'LLM Analysis',
      'templates': 'Templates',
      'voice': 'Voice',
      'organization': 'Organizations',
      'reports': 'Reports',
      'invitations': 'Invitations'
    }
    
    const firstSegment = segments[0]
    return [tagMap[firstSegment] || this._capitalize(firstSegment)]
  }
  
  /**
   * Generate paths object for OpenAPI spec
   */
  private _generatePaths(): any {
    const paths: any = {}
    
    this.routes.forEach(route => {
      if (!paths[route.path]) {
        paths[route.path] = {}
      }
      
      paths[route.path][route.method] = {
        summary: route.summary,
        description: route.description,
        operationId: `${route.method}${route.path.replace(/[^a-zA-Z0-9]/g, '')}`,
        tags: route.tags,
        parameters: route.parameters?.length ? route.parameters : undefined,
        requestBody: route.requestBody,
        responses: route.responses,
        security: route.security?.length ? route.security : undefined
      }
      
      // Clean up undefined values
      Object.keys(paths[route.path][route.method]).forEach(key => {
        if (paths[route.path][route.method][key] === undefined) {
          delete paths[route.path][route.method][key]
        }
      })
    })
    
    return paths
  }
  
  /**
   * Generate tags for OpenAPI spec
   */
  private _generateTags(): any[] {
    const tagSet = new Set<string>()
    
    this.routes.forEach(route => {
      route.tags?.forEach(tag => tagSet.add(tag))
    })
    
    return Array.from(tagSet).map(tag => ({
      name: tag,
      description: `${tag} related endpoints`
    }))
  }
  
  /**
   * Get standard response description for status code
   */
  private _getResponseDescription(status: string): string {
    const descriptions: Record<string, string> = {
      '200': 'OK',
      '201': 'Created',
      '204': 'No Content',
      '400': 'Bad Request',
      '401': 'Unauthorized',
      '403': 'Forbidden',
      '404': 'Not Found',
      '409': 'Conflict',
      '429': 'Too Many Requests',
      '500': 'Internal Server Error',
      '503': 'Service Unavailable'
    }
    
    return descriptions[status] || `HTTP ${status}`
  }
  
  /**
   * Capitalize first letter of string
   */
  private _capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
  
  /**
   * Add custom schema to the generator
   */
  public addSchema(name: string, schema: any): void {
    this.schemas[name] = schema
  }
  
  /**
   * Load schemas from TypeScript interfaces (basic implementation)
   */
  public loadSchemasFromTypes(typesFile: string): void {
    try {
      const content = readFileSync(typesFile, 'utf8')
      
      // Extract interface definitions (very basic parsing)
      const interfaceRegex = /export\s+interface\s+(\w+)\s*\{([^}]+)\}/g
      let match
      
      while ((match = interfaceRegex.exec(content)) !== null) {
        const interfaceName = match[1]
        const interfaceBody = match[2]
        
        const schema = this._parseInterfaceToSchema(interfaceBody)
        this.addSchema(interfaceName, schema)
      }
      
    } catch (error) {
      console.warn(`⚠️  Warning: Could not load schemas from ${typesFile}:`, error)
    }
  }
  
  /**
   * Convert TypeScript interface to OpenAPI schema (basic implementation)
   */
  private _parseInterfaceToSchema(interfaceBody: string): any {
    const schema: any = {
      type: 'object',
      properties: {}
    }
    
    const lines = interfaceBody.split('\n').map(line => line.trim()).filter(line => line)
    
    for (const line of lines) {
      const propMatch = line.match(/(\w+)(\?)?:\s*(.+)/)
      if (propMatch) {
        const [, propName, optional, propType] = propMatch
        
        schema.properties[propName] = this._typeScriptTypeToOpenAPIType(propType.replace(/[,;]$/, ''))
        
        if (!optional) {
          if (!schema.required) schema.required = []
          schema.required.push(propName)
        }
      }
    }
    
    return schema
  }
  
  /**
   * Convert TypeScript types to OpenAPI types (basic implementation)
   */
  private _typeScriptTypeToOpenAPIType(tsType: string): any {
    tsType = tsType.trim()
    
    if (tsType === 'string') return { type: 'string' }
    if (tsType === 'number') return { type: 'number' }
    if (tsType === 'boolean') return { type: 'boolean' }
    if (tsType.startsWith('string[]')) return { type: 'array', items: { type: 'string' } }
    if (tsType.startsWith('number[]')) return { type: 'array', items: { type: 'number' } }
    if (tsType.includes('|')) {
      const types = tsType.split('|').map(t => t.trim().replace(/['"]/g, ''))
      return { type: 'string', enum: types }
    }
    
    // Default to string for complex types
    return { type: 'string', description: `TypeScript type: ${tsType}` }
  }
}

/**
 * CLI function to generate OpenAPI specification
 */
export async function generateOpenAPISpec(): Promise<void> {
  console.log('🚀 Generating OpenAPI specification...')
  
  const config: OpenAPIConfig = {
    title: 'AI Readiness Assessment API',
    description: 'Comprehensive API for AI readiness assessment platform including survey management, analytics, LLM analysis, and user management',
    version: '1.0.0',
    servers: [
      {
        url: 'https://ai-readiness-frontend.vercel.app/api',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      }
    ],
    contact: {
      name: 'AI Readiness Support',
      email: 'support@ai-readiness.com',
      url: 'https://ai-readiness.com/support'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  }
  
  const generator = new OpenAPIGenerator(config)
  
  // Load common schemas
  generator.addSchema('ErrorResponse', {
    type: 'object',
    properties: {
      error: { type: 'string', description: 'Error message' },
      code: { type: 'string', description: 'Error code' },
      message: { type: 'string', description: 'Detailed error message' },
      timestamp: { type: 'string', format: 'date-time' }
    },
    required: ['error']
  })
  
  // Scan routes and generate specification
  generator.scanRoutes()
  
  // Try to load schemas from types file
  try {
    generator.loadSchemasFromTypes('lib/types.ts')
  } catch (error) {
    console.warn('⚠️  Could not load TypeScript schemas:', error)
  }
  
  // Save the specification
  const outputPath = join(process.cwd(), 'lib', 'openapi', 'swagger.json')
  generator.saveSpec(outputPath)
  
  console.log('✅ OpenAPI specification generated successfully!')
  console.log(`📄 Specification saved to: ${outputPath}`)
  console.log('🌐 View documentation at: http://localhost:3000/api/docs')
}

// Export for CLI usage
if (require.main === module) {
  generateOpenAPISpec().catch(console.error)
}