# Custom ESLint Rule: no-invalid-server-client-boundary

## Overview

A comprehensive ESLint rule that detects React Server/Client component boundary issues in Next.js applications.

## Features Detected

### 1. React Hooks without 'use client' directive
- Detects all standard React hooks (`useState`, `useEffect`, `useContext`, etc.)
- Detects custom hooks (any function starting with `use`)
- Detects modern React hooks (`useDeferredValue`, `useTransition`, etc.)

### 2. Event Handlers without 'use client' directive
- Detects standard event handler props (`onClick`, `onChange`, `onSubmit`, etc.)
- Detects any prop starting with `on`
- Covers mouse, keyboard, touch, and form events

### 3. Function Props passed to Custom Components
- Detects when server components pass function/handler props to client components
- Distinguishes between HTML elements (allowed) and custom components (flagged)
- Identifies arrow functions, function expressions, and function references

## Auto-Fix Capability

The rule provides automatic fixes by adding the `'use client';` directive at the top of files that:
- Use React hooks
- Use event handlers

Function props passed to custom components are **not** auto-fixed as they require architectural decisions.

## Installation

The rule is already installed and configured in this project:

```json
{
  "extends": "next/core-web-vitals",
  "plugins": ["local-nextjs"],
  "rules": {
    "local-nextjs/no-invalid-server-client-boundary": "error"
  }
}
```

## Usage

### Run ESLint
```bash
npm run lint
```

### Auto-fix violations
```bash
npm run lint -- --fix
```

### Test specific files
```bash
npx eslint path/to/component.tsx
```

## Error Messages

### React Hook Violation
```
Component uses 'React hook 'useState'' but is missing 'use client' directive
```

### Event Handler Violation
```
Component has event handler 'onClick' but is missing 'use client' directive
```

### Function Prop Violation
```
Server component 'CustomButton' cannot pass function prop 'onClick' to client component
```

## Implementation Details

### File Structure
```
eslint-rules/
├── package.json                           # Plugin package definition
├── index.js                              # Plugin entry point  
└── no-invalid-server-client-boundary.js  # Rule implementation

__tests__/
└── eslint-rules/
    └── no-invalid-server-client-boundary.test.js  # Comprehensive tests
```

### Rule Logic
1. **File Type Check**: Only processes `.tsx`, `.jsx`, `.ts`, `.js` files
2. **Use Client Detection**: Scans for `'use client'` directive at file top
3. **Hook Detection**: Identifies React hook calls via CallExpression AST nodes
4. **Event Handler Detection**: Identifies JSXAttribute nodes with event handler names
5. **Function Prop Detection**: Analyzes JSXAttribute nodes for functions passed to custom components

### AST Node Analysis
- **CallExpression**: For React hook usage detection
- **JSXAttribute**: For event handlers and function props
- **JSXOpeningElement**: For component name identification
- **Program**: For `'use client'` directive detection

## Test Coverage

Comprehensive test suite with 16 test cases covering:

### Valid Cases
- ✅ Client components with React hooks
- ✅ Client components with event handlers  
- ✅ Server components without hooks/handlers
- ✅ Server components with non-function props
- ✅ HTML elements with event handlers in client components
- ✅ Custom hooks in client components

### Invalid Cases (Detected)
- ❌ React hooks without 'use client'
- ❌ Multiple React hooks without 'use client'
- ❌ Event handlers without 'use client'
- ❌ Multiple event handlers without 'use client'
- ❌ Custom hooks without 'use client'
- ❌ Function props passed to custom components
- ❌ Arrow function props to custom components
- ❌ Modern React hooks without 'use client'
- ❌ Complex event handlers without 'use client'
- ❌ Mixed violations (hooks + event handlers)

## Performance Impact

- **Low overhead**: Rule only processes React/JSX files
- **AST-based**: Leverages ESLint's efficient AST parsing
- **Single pass**: All violations detected in one file traversal
- **No external dependencies**: Pure JavaScript implementation

## Found Issues in Codebase

The rule immediately detected several legitimate boundary violations:

1. **Server components passing function props**:
   - `app/survey/page.tsx`: Button component with onClick
   - `components/layout/header.tsx`: Button component with onClick
   - `components/layout/sidebar.tsx`: Multiple Button components with onClick

2. **Custom hooks without 'use client'**:
   - `lib/hooks/use-llm-analysis.ts`: Multiple React hooks usage

These findings validate the rule's effectiveness in identifying real architectural issues.

## Best Practices

### When to Add 'use client'
- Components that use React state or effects
- Components with user interaction (event handlers)
- Components that access browser APIs
- Custom hooks that use other React hooks

### When NOT to Add 'use client'
- Pure data display components
- Server-side data fetching components  
- Components that don't need interactivity
- Static layout components

### Function Prop Alternatives
Instead of passing functions from server to client components:
1. **Move the handler to client component**
2. **Use server actions** for form submissions
3. **Pass primitive data** and let client component handle events
4. **Split into separate client component** with the handler

## Future Enhancements

Potential improvements:
1. **Server Action Detection**: Detect improper server action usage
2. **Context Boundary Validation**: Check React Context usage across boundaries  
3. **Import Analysis**: Validate imports in server vs client components
4. **Performance Hints**: Suggest optimizations for component boundaries
5. **Custom Configuration**: Allow project-specific hook/event handler patterns

## Maintenance

The rule is self-contained with no external dependencies. Updates may be needed for:
- New React hooks in future versions
- New DOM events or patterns
- Enhanced Next.js server/client boundary features
- Additional AST node types for better detection

## Conclusion

This ESLint rule provides comprehensive, automated detection of React Server/Client component boundary violations, helping maintain proper architecture in Next.js applications with minimal performance overhead and maximum accuracy.