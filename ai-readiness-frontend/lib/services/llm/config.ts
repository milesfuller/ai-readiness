// LLM Configuration and Environment Variable Management
export interface LLMConfig {
  provider: 'openai' | 'anthropic'
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  timeout: number
  retries: number
}

export interface LLMEnvironmentConfig {
  anthropicApiKey?: string
  openAiApiKey?: string
  defaultProvider: 'openai' | 'anthropic'
  enableFallbacks: boolean
  buildMode: boolean
}

// Environment detection
const isServer = typeof window === 'undefined'
const isBuild = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.NEXT_PHASE
const isTest = process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST === 'true'

// Safe environment variable access with fallbacks
export const getLLMEnvironmentConfig = (): LLMEnvironmentConfig => {
  // During build time, use dummy keys to prevent build failures
  if (isBuild || isTest) {
    return {
      anthropicApiKey: 'dummy-key-for-build',
      openAiApiKey: 'dummy-key-for-build',
      defaultProvider: 'anthropic',
      enableFallbacks: true,
      buildMode: true
    }
  }

  // Runtime configuration
  const anthropicApiKey = isServer 
    ? process.env.ANTHROPIC_API_KEY 
    : undefined // Client-side should not access API keys

  const openAiApiKey = isServer 
    ? process.env.OPENAI_API_KEY 
    : undefined // Client-side should not access API keys

  return {
    anthropicApiKey,
    openAiApiKey,
    defaultProvider: 'anthropic',
    enableFallbacks: true,
    buildMode: false
  }
}

// Default LLM configurations
export const DEFAULT_LLM_CONFIGS: Record<'openai' | 'anthropic', Omit<LLMConfig, 'apiKey'>> = {
  openai: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 1200,
    timeout: 45000,
    retries: 3
  },
  anthropic: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.2,
    maxTokens: 1200,
    timeout: 45000,
    retries: 3
  }
}

// Create LLM configuration with proper error handling
export const createLLMConfig = (provider: 'openai' | 'anthropic', customConfig?: Partial<LLMConfig>): LLMConfig => {
  const envConfig = getLLMEnvironmentConfig()
  
  // Get the appropriate API key
  let apiKey: string
  if (envConfig.buildMode) {
    apiKey = 'dummy-key-for-build'
  } else {
    apiKey = provider === 'anthropic' 
      ? envConfig.anthropicApiKey || 'missing-api-key'
      : envConfig.openAiApiKey || 'missing-api-key'
  }

  // Validate API key (only in runtime, not during build)
  if (!envConfig.buildMode && apiKey === 'missing-api-key') {
    console.warn(`Missing ${provider.toUpperCase()}_API_KEY environment variable. LLM services will not function properly.`)
  }

  const defaultConfig = DEFAULT_LLM_CONFIGS[provider]
  
  return {
    ...defaultConfig,
    apiKey,
    ...customConfig
  }
}

// Validation helpers
export const validateLLMConfig = (config: LLMConfig): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!config.apiKey || config.apiKey === 'missing-api-key') {
    errors.push('API key is missing or invalid')
  }

  if (config.apiKey === 'dummy-key-for-build' && !isBuild && !isTest) {
    errors.push('Using dummy API key in non-build environment')
  }

  if (config.temperature < 0 || config.temperature > 2) {
    errors.push('Temperature must be between 0 and 2')
  }

  if (config.maxTokens < 1 || config.maxTokens > 8000) {
    errors.push('MaxTokens must be between 1 and 8000')
  }

  if (config.timeout < 1000) {
    errors.push('Timeout must be at least 1000ms')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Health check configuration
export const LLM_HEALTH_CHECK_CONFIG = {
  timeout: 10000,
  retries: 2,
  testPrompt: 'Respond with valid JSON: {"status": "healthy", "timestamp": "' + new Date().toISOString() + '"}'
}

// Token cost estimates (per 1K tokens in USD cents)
export const TOKEN_COSTS = {
  'gpt-4o': 0.3,
  'gpt-4o-mini': 0.015,
  'claude-3-5-sonnet-20241022': 0.3,
  'claude-3-haiku-20240307': 0.025
} as const

// Error boundary configuration
export const LLM_ERROR_CONFIG = {
  maxRetries: 3,
  baseRetryDelay: 1000,
  maxRetryDelay: 30000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  nonRetryableStatusCodes: [400, 401, 403, 404]
}

// Export environment detection utilities
export const ENVIRONMENT = {
  isServer,
  isBuild,
  isTest,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
} as const