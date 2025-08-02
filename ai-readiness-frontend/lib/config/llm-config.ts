// LLM Configuration Management
import { LLMConfig, LLMProvider, CostTrackingOptions } from '../types/llm';

// Environment variable helpers
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  return value ? value.toLowerCase() === 'true' : defaultValue;
};

// LLM Provider Configurations
export const LLM_CONFIGS: Record<LLMProvider, LLMConfig> = {
  openai: {
    provider: 'openai',
    model: getEnvVar('OPENAI_MODEL', 'gpt-4o'),
    temperature: getEnvNumber('OPENAI_TEMPERATURE', 0.2),
    maxTokens: getEnvNumber('OPENAI_MAX_TOKENS', 1200),
    timeout: getEnvNumber('LLM_TIMEOUT_MS', 45000),
    retries: getEnvNumber('LLM_RETRY_ATTEMPTS', 3)
  },
  anthropic: {
    provider: 'anthropic',
    model: getEnvVar('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022'),
    temperature: getEnvNumber('ANTHROPIC_TEMPERATURE', 0.2),
    maxTokens: getEnvNumber('ANTHROPIC_MAX_TOKENS', 1200),
    timeout: getEnvNumber('LLM_TIMEOUT_MS', 45000),
    retries: getEnvNumber('LLM_RETRY_ATTEMPTS', 3)
  }
};

// Default provider
export const DEFAULT_LLM_PROVIDER: LLMProvider = (getEnvVar('DEFAULT_LLM_PROVIDER', 'openai') as LLMProvider) || 'openai';

// Cost tracking configuration
export const COST_TRACKING_CONFIG: CostTrackingOptions = {
  trackByOrganization: getEnvBoolean('ENABLE_COST_TRACKING', true),
  trackBySurvey: getEnvBoolean('ENABLE_COST_TRACKING', true),
  trackByUser: false, // Privacy consideration
  alertThresholds: {
    dailyCostCents: getEnvNumber('DEFAULT_DAILY_LIMIT_CENTS', 10000),
    monthlyCostCents: getEnvNumber('DEFAULT_MONTHLY_BUDGET_CENTS', 200000),
    tokenUsage: 1000000 // 1M tokens
  }
};

// Analysis configuration
export const ANALYSIS_CONFIG = {
  enableBatchAnalysis: getEnvBoolean('ENABLE_BATCH_ANALYSIS', true),
  enableOrganizationalAnalysis: getEnvBoolean('ENABLE_ORGANIZATIONAL_ANALYSIS', true),
  autoAnalyzeResponses: getEnvBoolean('AUTO_ANALYZE_RESPONSES', false),
  qualityThreshold: parseFloat(getEnvVar('ANALYSIS_QUALITY_THRESHOLD', '0.7')),
  batchSize: getEnvNumber('LLM_BATCH_SIZE', 10),
  maxResponseLength: getEnvNumber('MAX_RESPONSE_LENGTH', 5000),
  maxQuestionLength: getEnvNumber('MAX_QUESTION_LENGTH', 1000)
};

// Security configuration
export const SECURITY_CONFIG = {
  enableInputSanitization: getEnvBoolean('ENABLE_INPUT_SANITIZATION', true),
  rateLimitRequestsPerMinute: getEnvNumber('RATE_LIMIT_REQUESTS_PER_MINUTE', 60),
  maxResponseLength: getEnvNumber('MAX_RESPONSE_LENGTH', 5000),
  maxQuestionLength: getEnvNumber('MAX_QUESTION_LENGTH', 1000)
};

// Performance monitoring configuration
export const MONITORING_CONFIG = {
  enablePerformanceMonitoring: getEnvBoolean('ENABLE_PERFORMANCE_MONITORING', true),
  healthCheckIntervalMs: getEnvNumber('HEALTH_CHECK_INTERVAL_MS', 60000),
  metricsRetentionDays: getEnvNumber('METRICS_RETENTION_DAYS', 90)
};

// Cache configuration
export const CACHE_CONFIG = {
  enableResponseCaching: getEnvBoolean('ENABLE_RESPONSE_CACHING', false),
  cacheTTLMinutes: getEnvNumber('CACHE_TTL_MINUTES', 60),
  cacheMaxSize: getEnvNumber('CACHE_MAX_SIZE', 1000)
};

// Token cost estimates (per 1K tokens in cents)
export const TOKEN_COSTS = {
  'gpt-4o': 0.3,
  'gpt-4o-mini': 0.015,
  'gpt-4-turbo': 0.3,
  'gpt-3.5-turbo': 0.05,
  'claude-3-5-sonnet-20241022': 0.3,
  'claude-3-haiku-20240307': 0.025,
  'claude-3-opus-20240229': 1.5
} as const;

// API endpoints
export const API_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages'
} as const;

// Validation helpers
export function validateLLMConfig(config: Partial<LLMConfig>): LLMConfig {
  const provider = config.provider || DEFAULT_LLM_PROVIDER;
  const baseConfig = LLM_CONFIGS[provider];
  
  return {
    ...baseConfig,
    ...config,
    provider,
    temperature: Math.max(0, Math.min(2, config.temperature || baseConfig.temperature)),
    maxTokens: Math.max(100, Math.min(4000, config.maxTokens || baseConfig.maxTokens)),
    timeout: Math.max(5000, Math.min(300000, config.timeout || baseConfig.timeout)),
    retries: Math.max(0, Math.min(5, config.retries || baseConfig.retries))
  };
}

// Get API key for provider
export function getAPIKey(provider: LLMProvider): string {
  const keyMap = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY'
  };
  
  const key = process.env[keyMap[provider]];
  if (!key) {
    throw new Error(`Missing API key for ${provider}. Set ${keyMap[provider]} environment variable.`);
  }
  
  return key;
}

// Get token cost for model
export function getTokenCost(model: string): number {
  return TOKEN_COSTS[model as keyof typeof TOKEN_COSTS] || 0.3;
}

// Configuration validation on startup
export function validateEnvironmentConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    // Check required API keys
    const defaultProvider = DEFAULT_LLM_PROVIDER;
    getAPIKey(defaultProvider);
    
    // Validate numeric configurations
    if (ANALYSIS_CONFIG.qualityThreshold < 0 || ANALYSIS_CONFIG.qualityThreshold > 1) {
      errors.push('ANALYSIS_QUALITY_THRESHOLD must be between 0 and 1');
    }
    
    if (COST_TRACKING_CONFIG.alertThresholds.dailyCostCents < 0) {
      errors.push('DEFAULT_DAILY_LIMIT_CENTS must be positive');
    }
    
    if (COST_TRACKING_CONFIG.alertThresholds.monthlyCostCents < 0) {
      errors.push('DEFAULT_MONTHLY_BUDGET_CENTS must be positive');
    }
    
    // Validate model names
    const openaiModel = LLM_CONFIGS.openai.model;
    const anthropicModel = LLM_CONFIGS.anthropic.model;
    
    if (!TOKEN_COSTS[openaiModel as keyof typeof TOKEN_COSTS]) {
      errors.push(`Unknown OpenAI model: ${openaiModel}`);
    }
    
    if (!TOKEN_COSTS[anthropicModel as keyof typeof TOKEN_COSTS]) {
      errors.push(`Unknown Anthropic model: ${anthropicModel}`);
    }
    
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown configuration error');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Runtime configuration helper
export class LLMConfigManager {
  private static instance: LLMConfigManager;
  private configurations: Map<string, LLMConfig> = new Map();
  
  static getInstance(): LLMConfigManager {
    if (!LLMConfigManager.instance) {
      LLMConfigManager.instance = new LLMConfigManager();
    }
    return LLMConfigManager.instance;
  }
  
  getConfig(provider?: LLMProvider, customConfig?: Partial<LLMConfig>): LLMConfig {
    const targetProvider = provider || DEFAULT_LLM_PROVIDER;
    const cacheKey = `${targetProvider}-${JSON.stringify(customConfig || {})}`;
    
    if (this.configurations.has(cacheKey)) {
      return this.configurations.get(cacheKey)!;
    }
    
    const config = validateLLMConfig({
      ...LLM_CONFIGS[targetProvider],
      ...customConfig
    });
    
    this.configurations.set(cacheKey, config);
    return config;
  }
  
  clearCache(): void {
    this.configurations.clear();
  }
  
  getAllConfigs(): Record<LLMProvider, LLMConfig> {
    return { ...LLM_CONFIGS };
  }
}

// Export singleton instance
export const llmConfigManager = LLMConfigManager.getInstance();