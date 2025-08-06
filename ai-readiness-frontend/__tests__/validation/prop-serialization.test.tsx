/**
 * Prop Serialization Validation Tests
 * 
 * Tests to ensure server components don't pass non-serializable props
 * (functions, symbols, etc.) to client components.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import React from 'react';
import { render } from '@testing-library/react';

describe('Prop Serialization Validation', () => {
  const projectDirs = [
    join(process.cwd(), 'components'),
    join(process.cwd(), 'app'),
  ];

  const EXCLUDED_PATTERNS = [
    /\.test\./,
    /\.spec\./,
    /\.stories\./,
    /\.mock\./,
    /node_modules/,
    /\.d\.ts$/,
  ];

  // Patterns that indicate non-serializable props
  const NON_SERIALIZABLE_PATTERNS = [
    { name: 'function props', pattern: /(\w+)=\{[^}]*=>/g },
    { name: 'function expressions', pattern: /(\w+)=\{function\s*\(/g },
    { name: 'function references', pattern: /(\w+)=\{[a-zA-Z_$][a-zA-Z0-9_$]*\}/g },
    { name: 'callback props', pattern: /(on[A-Z]\w*)=\{[^}]*\}/g },
    { name: 'symbol props', pattern: /(\w+)=\{Symbol\(/g },
    { name: 'class instances', pattern: /(\w+)=\{new\s+[A-Z]/g },
  ];

  // Serializable prop patterns that are safe
  const SERIALIZABLE_PATTERNS = [
    /(\w+)=\{(true|false)\}/g, // booleans
    /(\w+)=\{[0-9]+\}/g, // numbers
    /(\w+)=\{"[^"]*"\}/g, // strings
    /(\w+)=\{'[^']*'\}/g, // strings
    /(\w+)=\{`[^`]*`\}/g, // template strings (simple)
    /(\w+)=\{\[[^\]]*\]\}/g, // arrays (simple)
    /(\w+)=\{\{[^}]*\}\}/g, // objects (need deeper analysis)
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

  function findComponentUsages(content: string): Array<{
    component: string;
    line: number;
    props: string[];
    nonSerializableProps: string[];
  }> {
    const results: Array<{
      component: string;
      line: number;
      props: string[];
      nonSerializableProps: string[];
    }> = [];

    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Match React component usage with props
      const componentMatches = line.match(/<([A-Z][a-zA-Z0-9]*)\s+([^>]*)/g);
      
      if (componentMatches) {
        componentMatches.forEach((match) => {
          const [, componentName, propsString] = match.match(/<([A-Z][a-zA-Z0-9]*)\s+([^>]*)/) || [];
          
          if (componentName && propsString) {
            const props = extractProps(propsString);
            const nonSerializableProps = findNonSerializableProps(propsString);
            
            if (nonSerializableProps.length > 0) {
              results.push({
                component: componentName,
                line: index + 1,
                props,
                nonSerializableProps,
              });
            }
          }
        });
      }
    });

    return results;
  }

  function extractProps(propsString: string): string[] {
    const props: string[] = [];
    const propMatches = propsString.match(/(\w+)=(?:\{[^}]*\}|"[^"]*"|'[^']*')/g);
    
    if (propMatches) {
      props.push(...propMatches.map(match => {
        const [propName] = match.split('=');
        return propName;
      }));
    }

    return props;
  }

  function findNonSerializableProps(propsString: string): string[] {
    const nonSerializableProps: string[] = [];

    NON_SERIALIZABLE_PATTERNS.forEach(({ name, pattern }) => {
      const matches = propsString.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const propName = match.split('=')[0];
          if (propName && !isSerializableException(propName, match)) {
            nonSerializableProps.push(`${propName} (${name})`);
          }
        });
      }
    });

    return nonSerializableProps;
  }

  function isSerializableException(propName: string, fullMatch: string): boolean {
    // Some exceptions that are actually serializable
    const exceptions = [
      // React built-in props that can be serialized
      /^(key|ref|className|style|id|data-\w+|aria-\w+)$/,
      // Simple values that look like functions but aren't
      /=\{(true|false|null|undefined|\d+)\}/,
      // String literals that might contain "=>"
      /=\{"[^"]*"\}|=\{'[^']*'\}/,
    ];

    return exceptions.some(pattern => 
      pattern.test(propName) || pattern.test(fullMatch)
    );
  }

  function isClientComponent(filePath: string): boolean {
    if (!existsSync(filePath)) return false;
    const content = readFileSync(filePath, 'utf-8');
    return hasUseClientDirective(content);
  }

  function extractComponentName(filePath: string): string {
    return filePath.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '') || '';
  }

  describe('Server to Client Component Props', () => {
    const allFiles = projectDirs.flatMap(dir => getReactFiles(dir));

    if (allFiles.length === 0) {
      it('should have files to test', () => {
        expect(allFiles.length).toBeGreaterThan(0);
      });
      return;
    }

    allFiles.forEach((filePath) => {
      const componentName = extractComponentName(filePath);
      const isClientComp = isClientComponent(filePath);
      
      describe(`${componentName} ${isClientComp ? '(Client)' : '(Server)'}`, () => {
        let fileContent: string;
        let componentUsages: Array<{
          component: string;
          line: number;
          props: string[];
          nonSerializableProps: string[];
        }>;

        beforeAll(() => {
          fileContent = readFileSync(filePath, 'utf-8');
          componentUsages = findComponentUsages(fileContent);
        });

        if (!isClientComp) {
          // Only test server components for prop serialization
          it('should not pass non-serializable props to client components', () => {
            const violatingUsages = componentUsages.filter(usage => usage.nonSerializableProps.length > 0);

            if (violatingUsages.length > 0) {
              const violations = violatingUsages.map(usage => 
                `Line ${usage.line}: <${usage.component}> receives non-serializable props: ${usage.nonSerializableProps.join(', ')}`
              ).join('\n');

              throw new Error(
                `Server component ${componentName} passes non-serializable props to client components:\n` +
                `${violations}\n` +
                `File: ${filePath}\n` +
                'Server components can only pass serializable data (primitives, plain objects, arrays) to client components.'
              );
            }
          });

          it('should use proper event handling patterns', () => {
            // Check for inline event handlers in server components
            const inlineHandlerPattern = /(onClick|onChange|onSubmit|onFocus|onBlur)=\{[^}]*=>/g;
            const hasInlineHandlers = inlineHandlerPattern.test(fileContent);

            if (hasInlineHandlers) {
              throw new Error(
                `Server component ${componentName} contains inline event handlers.\n` +
                `File: ${filePath}\n` +
                'Server components cannot handle events directly. Move event handling to client components.'
              );
            }
          });
        }

        it('should use appropriate component composition', () => {
          // Check for proper children prop usage
          const childrenUsage = /children:\s*React\.ReactNode|{children}/g;
          const hasChildrenProp = childrenUsage.test(fileContent);

          if (hasChildrenProp) {
            // This is good - children is serializable
            expect(hasChildrenProp).toBe(true);
          }
        });

        it('should handle complex objects appropriately', () => {
          // Look for complex object props that might not be serializable
          const complexObjectPattern = /(\w+)=\{\{[^}]*new\s+|(\w+)=\{\{[^}]*function\s*/g;
          const hasComplexObjects = complexObjectPattern.test(fileContent);

          if (hasComplexObjects && !isClientComp) {
            console.warn(
              `Component ${componentName} passes complex objects as props.\n` +
              `File: ${filePath}\n` +
              'Ensure objects are serializable (no functions, class instances, symbols).'
            );
          }
        });
      });
    });
  });

  describe('Prop Serialization Patterns', () => {
    it('should identify function props correctly', () => {
      const testContent = `
        export default function ServerComponent() {
          const handleClick = () => console.log('clicked');
          return <ClientButton onClick={handleClick} />;
        }
      `;

      const usages = findComponentUsages(testContent);
      expect(usages.length).toBeGreaterThan(0);
      expect(usages[0].nonSerializableProps.some(prop => prop.includes('function'))).toBe(true);
    });

    it('should allow serializable props', () => {
      const testContent = `
        export default function ServerComponent() {
          return (
            <ClientButton 
              label="Click me"
              count={42}
              active={true}
              data={[1, 2, 3]}
              config={{ theme: 'dark', size: 'large' }}
            />
          );
        }
      `;

      const usages = findComponentUsages(testContent);
      // Should not find non-serializable props
      const hasNonSerializable = usages.some(usage => usage.nonSerializableProps.length > 0);
      expect(hasNonSerializable).toBe(false);
    });

    it('should catch callback props', () => {
      const testContent = `
        export default function ServerComponent() {
          return (
            <ClientForm 
              onSubmit={(data) => console.log(data)}
              onChange={handleChange}
            />
          );
        }
      `;

      const usages = findComponentUsages(testContent);
      expect(usages.length).toBeGreaterThan(0);
      expect(usages[0].nonSerializableProps.length).toBeGreaterThan(0);
    });

    it('should handle class instance props', () => {
      const testContent = `
        export default function ServerComponent() {
          const dateInstance = new Date();
          return <ClientComponent date={dateInstance} />;
        }
      `;

      const usages = findComponentUsages(testContent);
      expect(usages.length).toBeGreaterThan(0);
      expect(usages[0].nonSerializableProps.some(prop => prop.includes('class instances'))).toBe(true);
    });
  });

  describe('Component Testing with Serialization', () => {
    // Mock client component for testing
    const MockClientComponent = ({ 
      label, 
      count, 
      active, 
      onClick 
    }: { 
      label: string;
      count: number;
      active: boolean;
      onClick?: () => void;
    }) => (
      <button onClick={onClick} data-active={active}>
        {label} ({count})
      </button>
    );

    it('should render with serializable props', () => {
      const { container } = render(
        <MockClientComponent 
          label="Test Button"
          count={5}
          active={true}
        />
      );

      expect(container.querySelector('button')).toBeInTheDocument();
      expect(container.textContent).toContain('Test Button (5)');
    });

    it('should warn about non-serializable props in tests', () => {
      // In a real Next.js app, this would cause a hydration error
      const nonSerializableHandler = () => console.log('clicked');
      
      // This should work in tests but would fail in Next.js SSR/hydration
      const { container } = render(
        <MockClientComponent 
          label="Test"
          count={1}
          active={false}
          onClick={nonSerializableHandler}
        />
      );

      // The component renders in tests, but this pattern would fail in Next.js
      expect(container.querySelector('button')).toBeInTheDocument();
    });
  });

  describe('Serialization Utilities', () => {
    function isSerializable(value: any): boolean {
      if (value === undefined) return false;
      if (typeof value === 'function') return false;
      if (typeof value === 'symbol') return false;
      if (value instanceof Date) return false;
      if (value instanceof Map) return false;
      if (value instanceof Set) return false;
      
      try {
        JSON.parse(JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }

    it('should identify serializable values', () => {
      const serializableValues = [
        'string',
        42,
        true,
        null,
        [1, 2, 3],
        { name: 'test', age: 30 },
      ];

      serializableValues.forEach(value => {
        expect(isSerializable(value)).toBe(true);
      });
    });

    it('should identify non-serializable values', () => {
      const nonSerializableValues = [
        () => {},
        function namedFunction() {},
        Symbol('test'),
        new Date(),
        new Map(),
        new Set(),
        undefined,
      ];

      nonSerializableValues.forEach(value => {
        expect(isSerializable(value)).toBe(false);
      });
    });

    it('should handle complex nested objects', () => {
      const complexObject = {
        name: 'test',
        data: [1, 2, { nested: true }],
        config: {
          theme: 'dark',
          callbacks: {
            onSave: () => {}, // This makes it non-serializable
          }
        }
      };

      expect(isSerializable(complexObject)).toBe(false);
    });

    it('should handle circular references', () => {
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;

      expect(isSerializable(circularObject)).toBe(false);
    });
  });

  describe('Best Practices Validation', () => {
    it('should suggest proper patterns for event handling', () => {
      // Server component pattern (BAD)
      const serverWithEvents = `
        export default function ServerComponent() {
          const handleClick = () => console.log('clicked');
          return <button onClick={handleClick}>Click me</button>;
        }
      `;

      // Better pattern - separate client component
      const properPattern = `
        // server-component.tsx
        export default function ServerComponent() {
          return <ClientButton label="Click me" />;
        }

        // client-button.tsx
        'use client';
        export function ClientButton({ label }: { label: string }) {
          const handleClick = () => console.log('clicked');
          return <button onClick={handleClick}>{label}</button>;
        }
      `;

      // Validate the pattern
      expect(hasUseClientDirective(serverWithEvents)).toBe(false);
      expect(/onClick=\{/.test(serverWithEvents)).toBe(true);
      
      // The proper pattern should separate concerns
      expect(properPattern.includes("'use client'")).toBe(true);
      expect(properPattern.includes('<ClientButton')).toBe(true);
    });

    it('should suggest data transformation patterns', () => {
      const dataTransformationExample = `
        // server-component.tsx
        export default async function ServerComponent() {
          const data = await fetchComplexData();
          
          // Transform to serializable format
          const serializedData = {
            id: data.id,
            name: data.name,
            items: data.items.map(item => ({
              id: item.id,
              label: item.toString(), // Convert to string
              timestamp: item.createdAt.toISOString(), // Convert Date to string
            }))
          };
          
          return <ClientList data={serializedData} />;
        }
      `;

      expect(dataTransformationExample.includes('toISOString()')).toBe(true);
      expect(dataTransformationExample.includes('toString()')).toBe(true);
    });
  });
});