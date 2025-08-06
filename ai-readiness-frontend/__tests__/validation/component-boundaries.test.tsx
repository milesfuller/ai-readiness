/**
 * Component Boundaries Validation Tests
 * 
 * Tests to ensure proper separation between server and client components
 * by validating 'use client' directives are present when needed.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

describe('Component Boundaries Validation', () => {
  const componentsDir = join(process.cwd(), 'components');
  const appDir = join(process.cwd(), 'app');
  const libDir = join(process.cwd(), 'lib');

  // Patterns that indicate client-side functionality
  const CLIENT_PATTERNS = [
    /useState/g,
    /useEffect/g,
    /useRef/g,
    /useContext/g,
    /useReducer/g,
    /useMemo/g,
    /useCallback/g,
    /useLayoutEffect/g,
    /useImperativeHandle/g,
    /useDebugValue/g,
    /onClick/g,
    /onChange/g,
    /onSubmit/g,
    /addEventListener/g,
    /window\./g,
    /document\./g,
    /localStorage/g,
    /sessionStorage/g,
    /navigator\./g,
    /location\./g,
    /history\./g,
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
    // Check for 'use client' at the top of the file
    const lines = content.split('\n');
    const firstNonEmptyLines = lines.slice(0, 10).filter(line => line.trim());
    return firstNonEmptyLines.some(line => 
      line.includes("'use client'") || line.includes('"use client"')
    );
  }

  function hasClientSideCode(content: string): boolean {
    return CLIENT_PATTERNS.some(pattern => pattern.test(content));
  }

  function extractComponentName(filePath: string): string {
    return filePath.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '') || '';
  }

  describe('Components Directory', () => {
    const componentFiles = getReactFiles(componentsDir);

    if (componentFiles.length === 0) {
      it('should have component files to test', () => {
        expect(componentFiles.length).toBeGreaterThan(0);
      });
      return;
    }

    componentFiles.forEach((filePath) => {
      const componentName = extractComponentName(filePath);
      
      describe(`${componentName}`, () => {
        let fileContent: string;

        beforeAll(() => {
          fileContent = readFileSync(filePath, 'utf-8');
        });

        it('should have "use client" directive if it uses client-side features', () => {
          const hasClientCode = hasClientSideCode(fileContent);
          const hasUseClient = hasUseClientDirective(fileContent);

          if (hasClientCode && !hasUseClient) {
            // Find which client patterns are present
            const foundPatterns = CLIENT_PATTERNS.filter(pattern => pattern.test(fileContent));
            const patternNames = foundPatterns.map(p => p.source);
            
            throw new Error(
              `Component ${componentName} uses client-side features (${patternNames.join(', ')}) but is missing 'use client' directive.\n` +
              `File: ${filePath}\n` +
              'Add "use client"; at the top of the file.'
            );
          }
        });

        it('should not have unused "use client" directive', () => {
          const hasClientCode = hasClientSideCode(fileContent);
          const hasUseClient = hasUseClientDirective(fileContent);

          if (hasUseClient && !hasClientCode) {
            console.warn(
              `Component ${componentName} has "use client" directive but doesn't appear to use client-side features.\n` +
              `File: ${filePath}\n` +
              'Consider removing the directive if not needed.'
            );
          }
        });

        it('should not mix server and client patterns improperly', () => {
          const hasServerPatterns = /import.*server|getServerSideProps|getStaticProps/.test(fileContent);
          const hasClientPatterns = hasClientSideCode(fileContent);
          const hasUseClient = hasUseClientDirective(fileContent);

          if (hasServerPatterns && hasClientPatterns && hasUseClient) {
            throw new Error(
              `Component ${componentName} appears to mix server and client patterns.\n` +
              `File: ${filePath}\n` +
              'Consider separating server logic into separate components or utilities.'
            );
          }
        });
      });
    });
  });

  describe('App Directory (Pages)', () => {
    const appFiles = getReactFiles(appDir);

    appFiles.forEach((filePath) => {
      const componentName = extractComponentName(filePath);
      
      // Skip layout and loading files as they have special rules
      if (componentName.includes('layout') || componentName.includes('loading')) {
        return;
      }

      describe(`${componentName}`, () => {
        let fileContent: string;

        beforeAll(() => {
          fileContent = readFileSync(filePath, 'utf-8');
        });

        it('should be server component by default unless using client features', () => {
          const hasClientCode = hasClientSideCode(fileContent);
          const hasUseClient = hasUseClientDirective(fileContent);

          if (hasClientCode && !hasUseClient) {
            const foundPatterns = CLIENT_PATTERNS.filter(pattern => pattern.test(fileContent));
            const patternNames = foundPatterns.map(p => p.source);
            
            throw new Error(
              `Page component ${componentName} uses client-side features (${patternNames.join(', ')}) but is missing 'use client' directive.\n` +
              `File: ${filePath}\n` +
              'Add "use client"; at the top of the file or move client logic to separate components.'
            );
          }
        });
      });
    });
  });

  describe('Lib Directory (Hooks and Utilities)', () => {
    const libFiles = getReactFiles(libDir);

    libFiles.forEach((filePath) => {
      const fileName = extractComponentName(filePath);
      
      describe(`${fileName}`, () => {
        let fileContent: string;

        beforeAll(() => {
          fileContent = readFileSync(filePath, 'utf-8');
        });

        it('should have "use client" directive if it contains React hooks', () => {
          const hasHooks = /^use[A-Z]/.test(fileContent) || /from ['"]react['"]/.test(fileContent);
          const hasUseClient = hasUseClientDirective(fileContent);
          const hasClientCode = hasClientSideCode(fileContent);

          if ((hasHooks || hasClientCode) && !hasUseClient) {
            throw new Error(
              `Utility ${fileName} contains client-side code but is missing 'use client' directive.\n` +
              `File: ${filePath}\n` +
              'Add "use client"; at the top of the file.'
            );
          }
        });
      });
    });
  });

  describe('Global Validation', () => {
    it('should not have any files with useState without "use client"', () => {
      const allFiles = [
        ...getReactFiles(componentsDir),
        ...getReactFiles(appDir),
        ...getReactFiles(libDir),
      ];

      const violatingFiles: Array<{ file: string; patterns: string[] }> = [];

      allFiles.forEach((filePath) => {
        const content = readFileSync(filePath, 'utf-8');
        const hasUseClient = hasUseClientDirective(content);
        
        if (!hasUseClient && hasClientSideCode(content)) {
          const foundPatterns = CLIENT_PATTERNS
            .filter(pattern => pattern.test(content))
            .map(p => p.source);
          
          violatingFiles.push({
            file: filePath,
            patterns: foundPatterns,
          });
        }
      });

      if (violatingFiles.length > 0) {
        const errorMessage = violatingFiles
          .map(({ file, patterns }) => `${file}: ${patterns.join(', ')}`)
          .join('\n');
        
        throw new Error(
          `Found ${violatingFiles.length} files using client-side features without 'use client' directive:\n${errorMessage}`
        );
      }
    });

    it('should have proper file structure for Next.js App Router', () => {
      const requiredFiles = [
        join(appDir, 'layout.tsx'),
        join(appDir, 'page.tsx'),
      ];

      requiredFiles.forEach((requiredFile) => {
        if (existsSync(requiredFile)) {
          const content = readFileSync(requiredFile, 'utf-8');
          const hasClientCode = hasClientSideCode(content);
          const hasUseClient = hasUseClientDirective(content);

          // Root layout and pages should typically be server components
          if (requiredFile.includes('layout.tsx') && hasClientCode && !hasUseClient) {
            throw new Error(`Root layout should not use client-side features without 'use client' directive: ${requiredFile}`);
          }
        }
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should catch useState in server components', () => {
      const testContent = `
        import React from 'react';
        
        export default function ServerComponent() {
          const [state, setState] = React.useState(false);
          return <div>{state}</div>;
        }
      `;

      expect(hasClientSideCode(testContent)).toBe(true);
      expect(hasUseClientDirective(testContent)).toBe(false);
    });

    it('should allow useState with "use client"', () => {
      const testContent = `
        'use client';
        import React from 'react';
        
        export default function ClientComponent() {
          const [state, setState] = React.useState(false);
          return <div>{state}</div>;
        }
      `;

      expect(hasClientSideCode(testContent)).toBe(true);
      expect(hasUseClientDirective(testContent)).toBe(true);
    });

    it('should catch event handlers in server components', () => {
      const testContent = `
        export default function ServerComponent() {
          const handleClick = () => console.log('clicked');
          return <button onClick={handleClick}>Click me</button>;
        }
      `;

      expect(hasClientSideCode(testContent)).toBe(true);
      expect(hasUseClientDirective(testContent)).toBe(false);
    });
  });
});