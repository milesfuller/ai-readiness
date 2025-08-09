/**
 * Analytics Caching Service
 * 
 * Implements comprehensive caching strategies for analytics data including:
 * - Multi-level caching (memory, Redis, database)
 * - Query optimization and result memoization
 * - Cache invalidation strategies
 * - Performance monitoring and metrics
 */

import { createClient } from '@/lib/supabase/client'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface CacheConfig {
  ttl: number // Time to live in milliseconds
  maxSize: number // Maximum cache size
  compressionEnabled: boolean
  persistentCache: boolean
  refreshThreshold: number // Refresh cache when TTL is this % remaining
}

export interface CacheEntry<T> {
  key: string
  data: T
  timestamp: Date
  ttl: number
  accessCount: number
  lastAccessed: Date
  size: number // Size in bytes
  compressed: boolean
  metadata?: Record<string, any>
}

export interface CacheStats {
  totalEntries: number
  totalSize: number // Total size in bytes
  hitRate: number // Cache hit rate percentage
  missRate: number // Cache miss rate percentage
  avgResponseTime: number // Average response time in ms
  compressionRatio: number // Compression ratio if enabled
  evictionCount: number // Number of entries evicted
  refreshCount: number // Number of cache refreshes
}

export interface QueryOptimization {
  query: string
  optimizedQuery: string
  indexHints: string[]
  estimatedCost: number
  actualCost?: number
  executionPlan: string
}

// ============================================================================
// ANALYTICS CACHE SERVICE
// ============================================================================

export class AnalyticsCacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map()
  private queryCache: Map<string, any> = new Map()
  private config: CacheConfig
  private stats: CacheStats
  private supabase = createClient()

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100 * 1024 * 1024, // 100MB default
      compressionEnabled: true,
      persistentCache: true,
      refreshThreshold: 0.2, // Refresh when 20% TTL remaining
      ...config
    }

    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      avgResponseTime: 0,
      compressionRatio: 0,
      evictionCount: 0,
      refreshCount: 0
    }

    this.startCleanupTask()
    this.startStatsCalculation()
  }

  // ============================================================================
  // CACHE OPERATIONS
  // ============================================================================

  /**
   * Get cached data with automatic refresh and optimization
   */
  async get<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    customTtl?: number
  ): Promise<T> {
    const startTime = Date.now()
    const cacheKey = this.normalizeKey(key)

    try {
      // Check memory cache first
      const cached = this.memoryCache.get(cacheKey)
      
      if (cached && this.isCacheValid(cached)) {
        // Update access statistics
        cached.accessCount++
        cached.lastAccessed = new Date()
        this.updateStats('hit', Date.now() - startTime)
        
        // Check if cache needs refresh (proactive refresh)
        if (this.needsRefresh(cached)) {
          this.refreshCacheAsync(cacheKey, fetchFunction, customTtl)
        }
        
        return this.decompressData(cached.data, cached.compressed)
      }

      // Cache miss - fetch fresh data
      const freshData = await fetchFunction()
      const ttl = customTtl || this.config.ttl
      
      // Store in cache
      await this.set(cacheKey, freshData, ttl)
      
      this.updateStats('miss', Date.now() - startTime)
      return freshData

    } catch (error) {
      console.error(`Cache error for key ${cacheKey}:`, error)
      this.updateStats('miss', Date.now() - startTime)
      
      // Fallback to direct fetch
      return await fetchFunction()
    }
  }

  /**
   * Set data in cache with compression and persistence
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const cacheKey = this.normalizeKey(key)
    const cacheTtl = ttl || this.config.ttl
    
    try {
      // Compress data if enabled
      const { compressedData, compressed, size } = await this.compressData(data)
      
      const entry: CacheEntry<T> = {
        key: cacheKey,
        data: compressedData as T,
        timestamp: new Date(),
        ttl: cacheTtl,
        accessCount: 0,
        lastAccessed: new Date(),
        size,
        compressed,
        metadata: {
          originalSize: this.calculateSize(data),
          compressionRatio: compressed ? size / this.calculateSize(data) : 1
        }
      }

      // Check if we need to make space
      await this.makeSpace(size)
      
      // Store in memory cache
      this.memoryCache.set(cacheKey, entry)
      
      // Store in persistent cache if enabled
      if (this.config.persistentCache) {
        await this.setPersistent(cacheKey, entry)
      }
      
      this.updateCacheStats()

    } catch (error) {
      console.error(`Failed to set cache for key ${cacheKey}:`, error)
    }
  }

  /**
   * Remove item from cache
   */
  async delete(key: string): Promise<void> {
    const cacheKey = this.normalizeKey(key)
    
    // Remove from memory cache
    this.memoryCache.delete(cacheKey)
    
    // Remove from persistent cache
    if (this.config.persistentCache) {
      await this.deletePersistent(cacheKey)
    }
    
    this.updateCacheStats()
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()
    
    if (this.config.persistentCache) {
      await this.clearPersistent()
    }
    
    this.updateCacheStats()
    console.log('Analytics cache cleared')
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  // ============================================================================
  // QUERY OPTIMIZATION
  // ============================================================================

  /**
   * Optimize database queries for analytics
   */
  async optimizeQuery(query: string, params: any[] = []): Promise<QueryOptimization> {
    const queryHash = this.hashQuery(query, params)
    
    // Check if optimization is cached
    const cachedOptimization = this.queryCache.get(queryHash)
    if (cachedOptimization) {
      return cachedOptimization
    }

    try {
      // Analyze query structure
      const optimization = await this.analyzeQuery(query, params)
      
      // Cache the optimization
      this.queryCache.set(queryHash, optimization)
      
      return optimization

    } catch (error) {
      console.error('Query optimization failed:', error)
      
      // Return original query if optimization fails
      return {
        query,
        optimizedQuery: query,
        indexHints: [],
        estimatedCost: 0,
        executionPlan: 'Optimization failed, using original query'
      }
    }
  }

  /**
   * Execute optimized query with caching
   */
  async executeOptimizedQuery<T>(
    query: string,
    params: any[] = [],
    cacheKey?: string,
    cacheTtl?: number
  ): Promise<T> {
    // Get query optimization
    const optimization = await this.optimizeQuery(query, params)
    
    // Create cache key if not provided
    const finalCacheKey = cacheKey || this.hashQuery(optimization.optimizedQuery, params)
    
    return await this.get(
      finalCacheKey,
      async () => {
        // Execute optimized query
        const { data, error } = await this.supabase.rpc('execute_optimized_query', {
          query: optimization.optimizedQuery,
          params
        })
        
        if (error) throw error
        return data as T
      },
      cacheTtl
    )
  }

  // ============================================================================
  // CACHE INVALIDATION STRATEGIES
  // ============================================================================

  /**
   * Invalidate cache based on patterns
   */
  async invalidatePattern(pattern: string): Promise<number> {
    let invalidatedCount = 0
    const regex = new RegExp(pattern)
    
    // Invalidate from memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key)
        invalidatedCount++
      }
    }
    
    // Invalidate from persistent cache
    if (this.config.persistentCache) {
      const persistentCount = await this.invalidatePersistentPattern(pattern)
      invalidatedCount += persistentCount
    }
    
    this.updateCacheStats()
    console.log(`Invalidated ${invalidatedCount} cache entries matching pattern: ${pattern}`)
    
    return invalidatedCount
  }

  /**
   * Invalidate cache based on tags or metadata
   */
  async invalidateByTag(tag: string): Promise<number> {
    let invalidatedCount = 0
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.metadata?.tags && entry.metadata.tags.includes(tag)) {
        this.memoryCache.delete(key)
        invalidatedCount++
      }
    }
    
    this.updateCacheStats()
    return invalidatedCount
  }

  /**
   * Smart cache warming for frequently accessed data
   */
  async warmCache(
    warmingStrategies: Array<{
      key: string
      fetchFunction: () => Promise<any>
      priority: 'high' | 'medium' | 'low'
      ttl?: number
    }>
  ): Promise<void> {
    console.log(`Warming cache with ${warmingStrategies.length} strategies`)
    
    // Sort by priority
    const sortedStrategies = warmingStrategies.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
    
    // Warm cache in batches to avoid overwhelming the system
    const batchSize = 5
    for (let i = 0; i < sortedStrategies.length; i += batchSize) {
      const batch = sortedStrategies.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (strategy) => {
          try {
            await this.get(strategy.key, strategy.fetchFunction, strategy.ttl)
          } catch (error) {
            console.error(`Failed to warm cache for key ${strategy.key}:`, error)
          }
        })
      )
      
      // Small delay between batches
      if (i + batchSize < sortedStrategies.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log('Cache warming completed')
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private normalizeKey(key: string): string {
    return `analytics:${key}`.replace(/\s+/g, '_').toLowerCase()
  }

  private isCacheValid(entry: CacheEntry<any>): boolean {
    const now = Date.now()
    const entryTime = entry.timestamp.getTime()
    return (now - entryTime) < entry.ttl
  }

  private needsRefresh(entry: CacheEntry<any>): boolean {
    const now = Date.now()
    const entryTime = entry.timestamp.getTime()
    const elapsed = now - entryTime
    const refreshTime = entry.ttl * this.config.refreshThreshold
    
    return elapsed > (entry.ttl - refreshTime)
  }

  private async refreshCacheAsync<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl?: number
  ): Promise<void> {
    try {
      const freshData = await fetchFunction()
      await this.set(key, freshData, ttl)
      this.stats.refreshCount++
    } catch (error) {
      console.error(`Failed to refresh cache for key ${key}:`, error)
    }
  }

  private async compressData<T>(data: T): Promise<{
    compressedData: T | string
    compressed: boolean
    size: number
  }> {
    if (!this.config.compressionEnabled) {
      return {
        compressedData: data,
        compressed: false,
        size: this.calculateSize(data)
      }
    }

    try {
      const jsonString = JSON.stringify(data)
      const originalSize = new Blob([jsonString]).size
      
      // Only compress if data is large enough to benefit
      if (originalSize < 1024) { // 1KB threshold
        return {
          compressedData: data,
          compressed: false,
          size: originalSize
        }
      }

      // Simple base64 encoding as placeholder for actual compression
      // In production, use libraries like pako or node:zlib
      const compressed = btoa(jsonString)
      const compressedSize = new Blob([compressed]).size
      
      if (compressedSize < originalSize * 0.8) { // Only use if 20%+ savings
        return {
          compressedData: compressed,
          compressed: true,
          size: compressedSize
        }
      } else {
        return {
          compressedData: data,
          compressed: false,
          size: originalSize
        }
      }

    } catch (error) {
      console.error('Compression failed, storing uncompressed:', error)
      return {
        compressedData: data,
        compressed: false,
        size: this.calculateSize(data)
      }
    }
  }

  private decompressData<T>(data: T | string, compressed: boolean): T {
    if (!compressed) {
      return data as T
    }

    try {
      // Decompress using base64 decode (placeholder for actual decompression)
      const decompressed = atob(data as string)
      return JSON.parse(decompressed) as T
    } catch (error) {
      console.error('Decompression failed:', error)
      return data as T
    }
  }

  private calculateSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data)
      return new Blob([jsonString]).size
    } catch (error) {
      console.error('Failed to calculate size:', error)
      return 0
    }
  }

  private async makeSpace(requiredSpace: number): Promise<void> {
    const currentSize = this.getCurrentCacheSize()
    
    if (currentSize + requiredSpace <= this.config.maxSize) {
      return // No need to make space
    }
    
    // Calculate how much space we need to free
    const spaceToFree = (currentSize + requiredSpace) - this.config.maxSize
    let freedSpace = 0
    
    // Sort cache entries by LRU (Least Recently Used)
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime())
    
    for (const [key, entry] of entries) {
      if (freedSpace >= spaceToFree) break
      
      this.memoryCache.delete(key)
      freedSpace += entry.size
      this.stats.evictionCount++
    }
    
    console.log(`Freed ${freedSpace} bytes of cache space (evicted ${this.stats.evictionCount} entries)`)
  }

  private getCurrentCacheSize(): number {
    let totalSize = 0
    for (const [, entry] of this.memoryCache.entries()) {
      totalSize += entry.size
    }
    return totalSize
  }

  private updateStats(type: 'hit' | 'miss', responseTime: number): void {
    if (type === 'hit') {
      const totalRequests = (this.stats.hitRate + this.stats.missRate) || 1
      this.stats.hitRate = ((this.stats.hitRate * totalRequests) + 1) / (totalRequests + 1)
    } else {
      const totalRequests = (this.stats.hitRate + this.stats.missRate) || 1
      this.stats.missRate = ((this.stats.missRate * totalRequests) + 1) / (totalRequests + 1)
    }
    
    // Update average response time
    const totalResponses = this.stats.hitRate + this.stats.missRate
    this.stats.avgResponseTime = ((this.stats.avgResponseTime * totalResponses) + responseTime) / (totalResponses + 1)
  }

  private updateCacheStats(): void {
    this.stats.totalEntries = this.memoryCache.size
    this.stats.totalSize = this.getCurrentCacheSize()
    
    // Calculate compression ratio
    let totalOriginalSize = 0
    let totalCompressedSize = 0
    
    for (const [, entry] of this.memoryCache.entries()) {
      if (entry.metadata?.originalSize) {
        totalOriginalSize += entry.metadata.originalSize
        totalCompressedSize += entry.size
      }
    }
    
    this.stats.compressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1
  }

  private hashQuery(query: string, params: any[]): string {
    const combined = query + JSON.stringify(params)
    // Simple hash function (use crypto.createHash in production)
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  private async analyzeQuery(query: string, params: any[]): Promise<QueryOptimization> {
    // Simplified query analysis - in production, use actual query planner
    const indexHints: string[] = []
    
    // Add common analytics optimizations
    if (query.includes('survey_responses')) {
      indexHints.push('CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted_at ON survey_responses(submitted_at)')
      indexHints.push('CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id_submitted_at ON survey_responses(survey_id, submitted_at)')
    }
    
    if (query.includes('organization_id')) {
      indexHints.push('CREATE INDEX IF NOT EXISTS idx_organization_analytics ON surveys(organization_id, created_at)')
    }
    
    // Simple query optimization (add LIMIT if missing for analytics queries)
    let optimizedQuery = query
    if (query.includes('SELECT') && !query.includes('LIMIT') && query.includes('ORDER BY')) {
      optimizedQuery += ' LIMIT 10000' // Reasonable default for analytics
    }
    
    return {
      query,
      optimizedQuery,
      indexHints,
      estimatedCost: Math.random() * 1000, // Placeholder cost estimation
      executionPlan: 'Query analysis completed with basic optimizations'
    }
  }

  private startCleanupTask(): void {
    // Clean expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries()
    }, 5 * 60 * 1000)
  }

  private startStatsCalculation(): void {
    // Update stats every minute
    setInterval(() => {
      this.updateCacheStats()
    }, 60 * 1000)
  }

  private cleanupExpiredEntries(): void {
    let cleanedCount = 0
    const now = Date.now()
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if ((now - entry.timestamp.getTime()) > entry.ttl) {
        this.memoryCache.delete(key)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired cache entries`)
      this.updateCacheStats()
    }
  }

  // Persistent cache methods (placeholders - would integrate with Redis/Database)
  private async setPersistent(key: string, entry: CacheEntry<any>): Promise<void> {
    // Placeholder for persistent cache storage (Redis, etc.)
  }

  private async deletePersistent(key: string): Promise<void> {
    // Placeholder for persistent cache deletion
  }

  private async clearPersistent(): Promise<void> {
    // Placeholder for clearing persistent cache
  }

  private async invalidatePersistentPattern(pattern: string): Promise<number> {
    // Placeholder for pattern-based invalidation in persistent cache
    return 0
  }
}

// ============================================================================
// SINGLETON INSTANCE AND INITIALIZATION
// ============================================================================

export const analyticsCacheService = new AnalyticsCacheService({
  ttl: 5 * 60 * 1000, // 5 minutes default TTL
  maxSize: 100 * 1024 * 1024, // 100MB max size
  compressionEnabled: true,
  persistentCache: process.env.NODE_ENV === 'production',
  refreshThreshold: 0.2 // Refresh when 20% TTL remaining
})

/**
 * Initialize cache warming for common analytics queries
 */
export async function warmAnalyticsCache() {
  console.log('Warming analytics cache...')
  
  // Get all organizations for cache warming
  const supabase = createClient()
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('id')
    .limit(10) // Warm top 10 organizations only
  
  if (error) {
    console.error('Failed to get organizations for cache warming:', error)
    return
  }
  
  const warmingStrategies: any[] = []
  
  // Warm common analytics queries
  for (const org of organizations || []) {
    warmingStrategies.push(
      {
        key: `org_metrics_${org.id}`,
        fetchFunction: async () => {
          // Placeholder for actual analytics fetch
          return { totalSurveys: 10, totalResponses: 50 }
        },
        priority: 'high' as const,
        ttl: 10 * 60 * 1000 // 10 minutes
      },
      {
        key: `jtbd_trends_${org.id}_weekly`,
        fetchFunction: async () => {
          // Placeholder for JTBD trends fetch
          return { period: 'weekly', data: [] }
        },
        priority: 'medium' as const,
        ttl: 15 * 60 * 1000 // 15 minutes
      }
    )
  }
  
  await analyticsCacheService.warmCache(warmingStrategies)
  console.log('Analytics cache warming completed')
}