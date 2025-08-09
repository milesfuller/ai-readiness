'use client'

import { config, getEnvironmentName, getEnvironmentColor } from '@/lib/config/environment'

/**
 * Environment Banner Component
 * Displays a banner indicating the current environment (staging, development, etc.)
 * Hidden in production to avoid confusing users
 */
export function EnvironmentBanner() {
  // Don't show banner in production
  if (config.isProduction) return null
  
  const envName = getEnvironmentName()
  const envColor = getEnvironmentColor()
  
  // Determine background color based on environment
  const bgColorClass = {
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500',
    red: 'bg-red-500', // Should never show in production
  }[envColor] || 'bg-gray-500'
  
  // Determine icon based on environment
  const icon = {
    'Staging': '🔧',
    'Development': '💻',
    'Test': '🧪',
    'Unknown': '❓',
  }[envName] || '📦'
  
  return (
    <div className={`${bgColorClass} text-white text-xs py-1 px-2 text-center font-mono`}>
      <span className="inline-flex items-center gap-1">
        <span>{icon}</span>
        <strong>{envName.toUpperCase()} ENVIRONMENT</strong>
        {config.isPreview && (
          <>
            <span className="mx-1">|</span>
            <span>Vercel Preview</span>
          </>
        )}
        {config.vercelEnv && config.vercelEnv !== 'production' && (
          <>
            <span className="mx-1">|</span>
            <span>Vercel: {config.vercelEnv}</span>
          </>
        )}
        {config.features.debugMode && (
          <>
            <span className="mx-1">|</span>
            <span>🐛 Debug Mode</span>
          </>
        )}
      </span>
    </div>
  )
}

/**
 * Environment Indicator Component
 * Small indicator for the current environment (can be placed in header/footer)
 */
export function EnvironmentIndicator() {
  if (config.isProduction) return null
  
  const envName = getEnvironmentName()
  const envColor = getEnvironmentColor()
  
  const bgColorClass = {
    yellow: 'bg-yellow-500 hover:bg-yellow-600',
    blue: 'bg-blue-500 hover:bg-blue-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
    gray: 'bg-gray-500 hover:bg-gray-600',
    red: 'bg-red-500 hover:bg-red-600',
  }[envColor] || 'bg-gray-500 hover:bg-gray-600'
  
  return (
    <div 
      className={`fixed bottom-4 right-4 ${bgColorClass} text-white text-xs px-3 py-2 rounded-full shadow-lg cursor-help transition-colors z-50`}
      title={`Environment: ${envName}${config.isPreview ? ' (Vercel Preview)' : ''}`}
    >
      <span className="font-semibold">{envName.substring(0, 3).toUpperCase()}</span>
    </div>
  )
}