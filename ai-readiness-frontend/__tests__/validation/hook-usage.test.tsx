/**
 * Hook Usage Validation Tests
 * 
 * Tests to ensure React hooks are only used in client components
 * and follow proper usage patterns.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import { renderHook } from '@testing-library/react';

describe('Hook Usage Validation', () => {
  const projectDirs = [
    join(process.cwd(), 'components'),
    join(process.cwd(), 'app'),
    join(process.cwd(), 'lib', 'hooks'),
  ];

  // React hooks patterns
  const HOOK_PATTERNS = [
    { name: 'useState', pattern: /useState/g, requiresClient: true },
    { name: 'useEffect', pattern: /useEffect/g, requiresClient: true },
    { name: 'useRef', pattern: /useRef/g, requiresClient: true },
    { name: 'useContext', pattern: /useContext/g, requiresClient: true },
    { name: 'useReducer', pattern: /useReducer/g, requiresClient: true },
    { name: 'useMemo', pattern: /useMemo/g, requiresClient: true },
    { name: 'useCallback', pattern: /useCallback/g, requiresClient: true },
    { name: 'useLayoutEffect', pattern: /useLayoutEffect/g, requiresClient: true },
    { name: 'useImperativeHandle', pattern: /useImperativeHandle/g, requiresClient: true },
    { name: 'useDebugValue', pattern: /useDebugValue/g, requiresClient: true },
    { name: 'custom hooks', pattern: /use[A-Z][a-zA-Z]+/g, requiresClient: true },
  ];

  const EXCLUDED_PATTERNS = [
    /\.test\./,
    /\.spec\./,
    /\.stories\./,
    /\.mock\./,
    /node_modules/,
    /\.d\.ts$/,
  ];

  function getReactFiles(directory: string): string[] {
    if (!existsSync(directory)) return [];
    
    const pattern = join(directory, '**/*.{tsx,ts,jsx,js}');
    return glob.sync(pattern).filter(file => 
      !EXCLUDED_PATTERNS.some(pattern => pattern.test(file))
    );
  }

  function hasUseClientDirective(content: string): boolean {
    const lines = content.split('\n');
    const firstNonEmptyLines = lines.slice(0, 10).filter(line => line.trim());
    return firstNonEmptyLines.some(line => 
      line.includes("'use client'") || line.includes('"use client"')
    );
  }

  function findHookUsages(content: string): Array<{ hook: string; lines: number[] }> {
    const results: Array<{ hook: string; lines: number[] }> = [];
    const lines = content.split('\n');

    HOOK_PATTERNS.forEach(({ name, pattern }) => {
      const matchingLines: number[] = [];
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          matchingLines.push(index + 1);
        }
      });
      
      if (matchingLines.length > 0) {
        results.push({ hook: name, lines: matchingLines });
      }
    });

    return results;
  }

  function isHookFile(filePath: string): boolean {
    return filePath.includes('/hooks/') || /use[A-Z]/.test(filePath);
  }

  function extractComponentName(filePath: string): string {
    return filePath.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '') || '';
  }

  describe('Hook Usage in Components', () => {
    const allFiles = projectDirs.flatMap(dir => getReactFiles(dir));

    if (allFiles.length === 0) {
      it('should have files to test', () => {
        expect(allFiles.length).toBeGreaterThan(0);
      });
      return;
    }

    allFiles.forEach((filePath) => {
      const componentName = extractComponentName(filePath);
      
      describe(`${componentName}`, () => {
        let fileContent: string;
        let hookUsages: Array<{ hook: string; lines: number[] }>;

        beforeAll(() => {
          fileContent = readFileSync(filePath, 'utf-8');
          hookUsages = findHookUsages(fileContent);
        });

        it('should use hooks only in client components', () => {
          if (hookUsages.length === 0) return;

          const hasUseClient = hasUseClientDirective(fileContent);

          if (!hasUseClient) {
            const hookDetails = hookUsages
              .map(({ hook, lines }) => `${hook} (lines: ${lines.join(', ')})`)
              .join(', ');

            throw new Error(
              `Component ${componentName} uses React hooks but is missing 'use client' directive.\n` +
              `Hooks found: ${hookDetails}\n` +
              `File: ${filePath}\n` +
              'Add "use client"; at the top of the file.'
            );
          }
        });

        it('should not use hooks conditionally', () => {
          const conditionalHookPatterns = [
            /if\s*\([^)]*\)\s*{[^}]*use[A-Z]/g,
            /\?\s*use[A-Z]/g,
            /&&\s*use[A-Z]/g,
            /for\s*\([^)]*\)\s*{[^}]*use[A-Z]/g,
            /while\s*\([^)]*\)\s*{[^}]*use[A-Z]/g,
          ];

          conditionalHookPatterns.forEach((pattern) => {
            if (pattern.test(fileContent)) {
              throw new Error(
                `Component ${componentName} appears to use hooks conditionally.\n` +
                `File: ${filePath}\n` +
                'Hooks must be called at the top level of the function.'
              );
            }
          });
        });

        it('should not use hooks in loops', () => {
          const loopHookPatterns = [
            /for\s*\([^)]*\)\s*{[^}]*use[A-Z]/g,
            /while\s*\([^)]*\)\s*{[^}]*use[A-Z]/g,
            /forEach\([^)]*=>[^}]*use[A-Z]/g,
            /map\([^)]*=>[^}]*use[A-Z]/g,
          ];

          loopHookPatterns.forEach((pattern) => {
            if (pattern.test(fileContent)) {
              throw new Error(
                `Component ${componentName} appears to use hooks in loops.\n` +
                `File: ${filePath}\n` +
                'Hooks must be called at the top level of the function.'
              );
            }
          });
        });

        it('should follow hook naming conventions', () => {
          // Check for custom hooks that don't start with 'use'
          const functionDeclarations = fileContent.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g) || [];
          const arrowFunctions = fileContent.match(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>/g) || [];
          
          const allFunctions = [...functionDeclarations, ...arrowFunctions];
          
          allFunctions.forEach((func) => {
            const match = func.match(/(?:function\s+|(?:const|let|var)\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)/);
            if (match) {
              const funcName = match[1];
              // Check if function uses hooks but doesn't follow naming convention
              if (hookUsages.length > 0 && !funcName.startsWith('use') && !funcName[0].toUpperCase() === funcName[0]) {
                console.warn(
                  `Function ${funcName} in ${componentName} uses hooks but doesn't follow naming convention.\n` +
                  `File: ${filePath}\n` +
                  'Consider renaming to start with "use" if it\'s a custom hook.'
                );
              }
            }
          });
        });
      });
    });
  });

  describe('Custom Hook Files', () => {
    const hookFiles = projectDirs
      .flatMap(dir => getReactFiles(dir))
      .filter(file => isHookFile(file));

    hookFiles.forEach((filePath) => {
      const hookName = extractComponentName(filePath);
      
      describe(`${hookName}`, () => {
        let fileContent: string;

        beforeAll(() => {
          fileContent = readFileSync(filePath, 'utf-8');
        });

        it('should be a client component', () => {
          const hasUseClient = hasUseClientDirective(fileContent);
          
          if (!hasUseClient) {
            throw new Error(
              `Hook file ${hookName} is missing 'use client' directive.\n` +
              `File: ${filePath}\n` +
              'Custom hooks must be client components.'
            );
          }
        });

        it('should start with "use" prefix', () => {
          const exportedFunctions = fileContent.match(/export\s+(?:default\s+)?(?:function\s+|const\s+|let\s+|var\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)/g) || [];
          
          exportedFunctions.forEach((exp) => {
            const match = exp.match(/(?:function\s+|const\s+|let\s+|var\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)/);
            if (match) {
              const funcName = match[1];
              if (!funcName.startsWith('use')) {
                throw new Error(
                  `Exported function ${funcName} in hook file ${hookName} doesn't start with "use".\n` +
                  `File: ${filePath}\n` +
                  'Custom hooks must start with "use" prefix.'
                );
              }
            }
          });
        });

        it('should return values or functions', () => {
          const hasReturn = /return\s+/.test(fileContent);
          
          if (!hasReturn) {
            console.warn(
              `Hook ${hookName} doesn't appear to return anything.\n` +
              `File: ${filePath}\n` +
              'Custom hooks typically return values or functions.'
            );
          }
        });
      });
    });
  });

  describe('Hook Usage Patterns', () => {
    it('should catch useState without "use client"', () => {
      const serverComponentContent = `
        import React from 'react';
        
        export default function ServerComponent() {
          const [count, setCount] = React.useState(0);
          return <div>{count}</div>;
        }
      `;

      const hookUsages = findHookUsages(serverComponentContent);
      const hasUseClient = hasUseClientDirective(serverComponentContent);

      expect(hookUsages.length).toBeGreaterThan(0);
      expect(hookUsages[0].hook).toBe('useState');
      expect(hasUseClient).toBe(false);
    });

    it('should allow useState with "use client"', () => {
      const clientComponentContent = `
        'use client';
        import React from 'react';
        
        export default function ClientComponent() {
          const [count, setCount] = React.useState(0);
          return <div>{count}</div>;
        }
      `;

      const hookUsages = findHookUsages(clientComponentContent);
      const hasUseClient = hasUseClientDirective(clientComponentContent);

      expect(hookUsages.length).toBeGreaterThan(0);
      expect(hookUsages[0].hook).toBe('useState');
      expect(hasUseClient).toBe(true);
    });

    it('should detect custom hooks', () => {
      const customHookContent = `
        'use client';
        import { useState, useEffect } from 'react';
        
        export function useCounter(initialValue = 0) {
          const [count, setCount] = useState(initialValue);
          
          useEffect(() => {
            console.log('Count changed:', count);
          }, [count]);
          
          return { count, setCount };
        }
      `;

      const hookUsages = findHookUsages(customHookContent);
      const hasUseClient = hasUseClientDirective(customHookContent);

      expect(hookUsages.length).toBeGreaterThan(0);
      expect(hookUsages.some(usage => usage.hook === 'useState')).toBe(true);
      expect(hookUsages.some(usage => usage.hook === 'useEffect')).toBe(true);
      expect(hasUseClient).toBe(true);
    });

    it('should catch conditional hook usage', () => {
      const conditionalHookContent = `
        'use client';
        import { useState } from 'react';
        
        export default function BadComponent({ condition }: { condition: boolean }) {
          if (condition) {
            const [state, setState] = useState(false);
          }
          return <div>Bad pattern</div>;
        }
      `;

      const conditionalPattern = /if\s*\([^)]*\)\s*{[^}]*use[A-Z]/g;
      expect(conditionalPattern.test(conditionalHookContent)).toBe(true);
    });
  });

  describe('Hook Testing Utilities', () => {
    it('should be able to test custom hooks', () => {
      // Simple custom hook for testing
      const useToggle = (initialValue = false) => {
        const [value, setValue] = useState(initialValue);
        const toggle = useCallback(() => setValue(v => !v), []);
        return [value, toggle] as const;
      };

      const { result } = renderHook(() => useToggle(false));
      
      expect(result.current[0]).toBe(false);
      
      // Test hook functionality
      act(() => {
        result.current[1]();
      });
      
      expect(result.current[0]).toBe(true);
    });

    it('should validate hook dependencies', () => {
      // This would be implemented as a custom ESLint rule in practice
      const hookWithBadDeps = `
        'use client';
        import { useEffect, useState } from 'react';
        
        export function useBadHook(prop: string) {
          const [state, setState] = useState('');
          
          useEffect(() => {
            setState(prop);
          }, []); // Missing prop dependency
          
          return state;
        }
      `;

      // Check for useEffect with missing dependencies (simplified)
      const useEffectWithEmptyDeps = /useEffect\([^,]+,\s*\[\s*\]/g;
      const hasPropUsage = /prop/.test(hookWithBadDeps);
      
      if (useEffectWithEmptyDeps.test(hookWithBadDeps) && hasPropUsage) {
        console.warn('Potential missing dependency in useEffect');
      }
    });
  });
});

// Import necessary testing utilities
import { useState, useCallback } from 'react';
import { act } from '@testing-library/react';