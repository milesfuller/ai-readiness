/**
 * Validation Test Utilities
 * 
 * Helper functions for component boundary validation tests
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

export interface ComponentAnalysis {
  filePath: string;
  componentName: string;
  hasUseClient: boolean;
  hasClientCode: boolean;
  hookUsages: HookUsage[];
  nonSerializableProps: PropViolation[];
  isValid: boolean;
  violations: string[];
}

export interface HookUsage {
  hookName: string;
  lines: number[];
  isConditional: boolean;
  isInLoop: boolean;
}

export interface PropViolation {
  component: string;
  propName: string;
  violationType: string;
  line: number;
}

// Patterns that indicate client-side functionality
export const CLIENT_PATTERNS = [
  { name: 'useState', pattern: /useState/g, type: 'hook' },
  { name: 'useEffect', pattern: /useEffect/g, type: 'hook' },
  { name: 'useRef', pattern: /useRef/g, type: 'hook' },
  { name: 'useContext', pattern: /useContext/g, type: 'hook' },
  { name: 'useReducer', pattern: /useReducer/g, type: 'hook' },
  { name: 'useMemo', pattern: /useMemo/g, type: 'hook' },
  { name: 'useCallback', pattern: /useCallback/g, type: 'hook' },
  { name: 'onClick', pattern: /onClick/g, type: 'event' },
  { name: 'onChange', pattern: /onChange/g, type: 'event' },
  { name: 'onSubmit', pattern: /onSubmit/g, type: 'event' },
  { name: 'window', pattern: /window\./g, type: 'browser-api' },
  { name: 'document', pattern: /document\./g, type: 'browser-api' },
  { name: 'localStorage', pattern: /localStorage/g, type: 'browser-api' },
  { name: 'sessionStorage', pattern: /sessionStorage/g, type: 'browser-api' },
];

// Patterns for non-serializable props
export const NON_SERIALIZABLE_PROP_PATTERNS = [
  { name: 'function-arrow', pattern: /(\w+)=\{[^}]*=>/g },
  { name: 'function-expression', pattern: /(\w+)=\{function\s*\(/g },
  { name: 'function-reference', pattern: /(\w+)=\{[a-zA-Z_$][a-zA-Z0-9_$]*\}/g },
  { name: 'callback-prop', pattern: /(on[A-Z]\w*)=\{[^}]*\}/g },
  { name: 'symbol', pattern: /(\w+)=\{Symbol\(/g },
  { name: 'class-instance', pattern: /(\w+)=\{new\s+/g },
];

export const EXCLUDED_PATTERNS = [
  /\.test\./,
  /\.spec\./,
  /\.stories\./,
  /\.mock\./,
  /node_modules/,
  /\.d\.ts$/,
];

/**
 * Get all React files from a directory
 */
export function getReactFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  
  const pattern = join(directory, '**/*.{tsx,ts,jsx,js}');
  return glob.sync(pattern).filter(file => 
    !EXCLUDED_PATTERNS.some(pattern => pattern.test(file))
  );
}

/**
 * Check if a file has 'use client' directive
 */
export function hasUseClientDirective(content: string): boolean {
  const lines = content.split('\n');
  const firstNonEmptyLines = lines.slice(0, 10).filter(line => line.trim());
  return firstNonEmptyLines.some(line => 
    line.includes("'use client'") || line.includes('"use client"')
  );
}

/**
 * Check if content contains client-side code patterns
 */
export function hasClientSideCode(content: string): boolean {
  return CLIENT_PATTERNS.some(({ pattern }) => pattern.test(content));
}

/**
 * Find all hook usages in the content
 */
export function findHookUsages(content: string): HookUsage[] {
  const results: HookUsage[] = [];
  const lines = content.split('\n');

  CLIENT_PATTERNS
    .filter(({ type }) => type === 'hook')
    .forEach(({ name, pattern }) => {
      const matchingLines: number[] = [];
      let isConditional = false;
      let isInLoop = false;

      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          matchingLines.push(index + 1);
          
          // Check if hook is used conditionally
          if (/if\s*\(|&&|\?/.test(line)) {
            isConditional = true;
          }
          
          // Check if hook is used in a loop
          if (/for\s*\(|while\s*\(|forEach|map/.test(line)) {
            isInLoop = true;
          }
        }
      });
      
      if (matchingLines.length > 0) {
        results.push({
          hookName: name,
          lines: matchingLines,
          isConditional,
          isInLoop,
        });
      }
    });

  return results;
}

/**
 * Find non-serializable prop violations
 */
export function findPropViolations(content: string): PropViolation[] {
  const violations: PropViolation[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Match React component usage
    const componentMatches = line.match(/<([A-Z][a-zA-Z0-9]*)\s+([^>]*)/g);
    
    if (componentMatches) {
      componentMatches.forEach((match) => {
        const [, componentName, propsString] = match.match(/<([A-Z][a-zA-Z0-9]*)\s+([^>]*)/) || [];
        
        if (componentName && propsString) {
          NON_SERIALIZABLE_PROP_PATTERNS.forEach(({ name, pattern }) => {
            const matches = propsString.match(pattern);
            if (matches) {
              matches.forEach(propMatch => {
                const propName = propMatch.split('=')[0];
                if (propName && !isSerializableException(propName, propMatch)) {
                  violations.push({
                    component: componentName,
                    propName,
                    violationType: name,
                    line: index + 1,
                  });
                }
              });
            }
          });
        }
      });
    }
  });

  return violations;
}

/**
 * Check if a prop is a serializable exception
 */
export function isSerializableException(propName: string, fullMatch: string): boolean {
  const exceptions = [
    /^(key|ref|className|style|id|data-\w+|aria-\w+)$/,
    /=\{(true|false|null|undefined|\d+)\}/,
    /=\{"[^"]*"\}|=\{'[^']*'\}/,
  ];

  return exceptions.some(pattern => 
    pattern.test(propName) || pattern.test(fullMatch)
  );
}

/**
 * Extract component name from file path
 */
export function extractComponentName(filePath: string): string {
  return filePath.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '') || '';
}

/**
 * Analyze a single component file
 */
export function analyzeComponent(filePath: string): ComponentAnalysis {
  const componentName = extractComponentName(filePath);
  const content = readFileSync(filePath, 'utf-8');
  
  const hasUseClient = hasUseClientDirective(content);
  const hasClientCode = hasClientSideCode(content);
  const hookUsages = findHookUsages(content);
  const nonSerializableProps = findPropViolations(content);
  
  const violations: string[] = [];
  let isValid = true;

  // Check for client code without 'use client' directive
  if (hasClientCode && !hasUseClient) {
    violations.push(`Uses client-side features but missing 'use client' directive`);
    isValid = false;
  }

  // Check for conditional or loop hook usage
  hookUsages.forEach(hook => {
    if (hook.isConditional) {
      violations.push(`Hook '${hook.hookName}' used conditionally on lines: ${hook.lines.join(', ')}`);
      isValid = false;
    }
    if (hook.isInLoop) {
      violations.push(`Hook '${hook.hookName}' used in loop on lines: ${hook.lines.join(', ')}`);
      isValid = false;
    }
  });

  // Check for non-serializable props (only relevant for server components)
  if (!hasUseClient && nonSerializableProps.length > 0) {
    nonSerializableProps.forEach(violation => {
      violations.push(`Non-serializable prop '${violation.propName}' passed to '${violation.component}' on line ${violation.line}`);
      isValid = false;
    });
  }

  return {
    filePath,
    componentName,
    hasUseClient,
    hasClientCode,
    hookUsages,
    nonSerializableProps,
    isValid,
    violations,
  };
}

/**
 * Analyze multiple component files
 */
export function analyzeComponents(filePaths: string[]): ComponentAnalysis[] {
  return filePaths.map(analyzeComponent);
}

/**
 * Generate validation report
 */
export function generateValidationReport(analyses: ComponentAnalysis[]): {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  violations: { [key: string]: string[] };
  summary: string;
} {
  const totalFiles = analyses.length;
  const validFiles = analyses.filter(a => a.isValid).length;
  const invalidFiles = totalFiles - validFiles;
  
  const violations: { [key: string]: string[] } = {};
  
  analyses.forEach(analysis => {
    if (!analysis.isValid) {
      violations[analysis.componentName] = analysis.violations;
    }
  });

  const summary = `
Validation Summary:
- Total files analyzed: ${totalFiles}
- Valid files: ${validFiles}
- Files with violations: ${invalidFiles}
- Success rate: ${Math.round((validFiles / totalFiles) * 100)}%
  `.trim();

  return {
    totalFiles,
    validFiles,
    invalidFiles,
    violations,
    summary,
  };
}

/**
 * Test if value is serializable
 */
export function isSerializable(value: any): boolean {
  try {
    JSON.parse(JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Find circular references in objects
 */
export function hasCircularReference(obj: any, seen = new WeakSet()): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }
  
  if (seen.has(obj)) {
    return true;
  }
  
  seen.add(obj);
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && hasCircularReference(obj[key], seen)) {
      return true;
    }
  }
  
  seen.delete(obj);
  return false;
}