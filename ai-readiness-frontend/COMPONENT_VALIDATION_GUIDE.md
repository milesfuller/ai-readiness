# React Component Validation Guide

This guide explains the automated component validation system integrated into the development workflow using Git hooks.

## Overview

The component validation system automatically checks React Server/Client component boundaries to prevent common errors and ensure proper Next.js 13+ App Router patterns.

## What It Validates

### ❌ Critical Errors (Blocks Commits)

1. **Hooks in Server Components**
   - Detects React hooks (`useState`, `useEffect`, etc.) in components without `'use client'`
   - **Fix**: Add `'use client'` directive at the top of the file

2. **Function Props in Server Components**
   - Identifies server components passing function/component props to UI components
   - **Fix**: Convert to client component or restructure props

### ⚠️ Warnings (Non-blocking)

1. **Client Page Components**
   - Warns when `page.tsx` files use `'use client'`
   - **Suggestion**: Keep pages as server components when possible

2. **Interactive Server Components**
   - Detects event handlers in server components without `'use client'`
   - **Suggestion**: Add `'use client'` for interactive components

## Git Hooks Integration

### Pre-commit Hook

The pre-commit hook runs automatically on every commit and includes:

1. ⚙️ **Component validation** (staged files only)
2. 🔒 **Security checks**
3. ✨ **ESLint validation**
4. 📝 **TypeScript type checking**

If any check fails, the commit is blocked.

### Pre-push Hook

The pre-push hook runs before pushing to remote and includes:

1. ⚙️ **Component validation** (all files)
2. 🧪 **Full test suite**

## Available Commands

### Basic Validation

```bash
# Validate staged files (default)
npm run validate:components

# Validate all files in project
npm run validate:components:all

# Validate with environment variable
VALIDATE_ALL_FILES=true npm run validate:components
```

### Build Integration

Component validation runs automatically during builds:

```bash
# Build with validation
npm run build
```

### Manual Validation

```bash
# Run validation directly
node .claude/hooks/validate-components.js

# Validate all files
node .claude/hooks/validate-components.js --all

# Validate all files (alternative)
VALIDATE_ALL_FILES=true node .claude/hooks/validate-components.js
```

### Emergency Bypass

In emergency situations, you can bypass validation:

```bash
# Skip pre-commit hooks
git commit --no-verify -m "Emergency fix"

# Skip pre-push hooks  
git push --no-verify
```

## Configuration

### Husky Configuration

The Git hooks are configured in `package.json`:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run precommit",
      "pre-push": "npm run validate:components:all && npm run test:ci"
    }
  }
}
```

### NPM Scripts

Key validation scripts in `package.json`:

```json
{
  "scripts": {
    "validate:components": "node .claude/hooks/validate-components.js",
    "validate:components:all": "VALIDATE_ALL_FILES=true node .claude/hooks/validate-components.js",
    "build": "npm run validate:components && next build",
    "precommit": "npm run validate:components && npm run test:security && npm run lint && npm run type-check"
  }
}
```

## Validation Rules

### File Detection

The validator checks these file types:
- `.tsx` and `.ts` files
- `.jsx` and `.js` files
- Excludes: `node_modules`, `.next`, test files

### Component Classification

**Server Components** (default):
- Files without `'use client'` directive
- Rendered on the server
- Cannot use React hooks or browser APIs

**Client Components**:
- Files starting with `'use client'`
- Rendered in the browser
- Can use React hooks and browser APIs

### Hook Detection

Detected React hooks:
- `useState`, `useEffect`, `useLayoutEffect`
- `useReducer`, `useCallback`, `useMemo`
- `useRef`, `useContext`, `useImperativeHandle`
- `useDebugValue`, `useTransition`, `useDeferredValue`
- `useId`, `useOptimistic`
- `React.useState`, `React.useEffect`, etc.

## Common Validation Scenarios

### Scenario 1: Hooks in Server Component

**Error**:
```typescript
// ❌ This will fail validation
export default function ServerPage() {
  const [count, setCount] = useState(0); // Hook in server component
  return <div>{count}</div>;
}
```

**Fix**:
```typescript
// ✅ Add 'use client' directive
'use client';

export default function ClientPage() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
```

### Scenario 2: Function Props in Server Component

**Warning**:
```typescript
// ⚠️ This triggers a warning
import { Button } from '@/components/ui/button';

export default function ServerPage() {
  return (
    <Button onClick={handleClick}> {/* Function prop in server component */}
      Click me
    </Button>
  );
}
```

**Fix**:
```typescript
// ✅ Make it a client component
'use client';

export default function ClientPage() {
  const handleClick = () => console.log('clicked');
  
  return (
    <Button onClick={handleClick}>
      Click me
    </Button>
  );
}
```

### Scenario 3: Page Component Best Practice

**Warning**:
```typescript
// ⚠️ Client page component (performance warning)
'use client';

export default function HomePage() {
  return <div>Home Page</div>;
}
```

**Better**:
```typescript
// ✅ Keep page as server component, move client logic to children
import { ClientInteractiveComponent } from './client-component';

export default function HomePage() {
  return (
    <div>
      <h1>Home Page</h1>
      <ClientInteractiveComponent />
    </div>
  );
}
```

## Troubleshooting

### Validation Fails But Files Look Correct

1. **Check file encoding**: Ensure files are UTF-8 encoded
2. **Check whitespace**: The `'use client'` directive must be at the very top
3. **Check import order**: `'use client'` must come before imports

### Git Hooks Not Running

1. **Reinstall Husky**:
   ```bash
   npm run prepare
   npx husky install
   ```

2. **Check hook permissions**:
   ```bash
   chmod +x .husky/pre-commit
   chmod +x .husky/pre-push
   ```

3. **Verify Git repository**:
   ```bash
   git status  # Should show you're in a Git repo
   ```

### Performance Issues

If validation is slow on large codebases:

1. **Use staged files only** (default for commits)
2. **Exclude large directories** by modifying the validator
3. **Run validation in CI** instead of locally for large projects

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Component Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run validate:components:all
      - run: npm run test:ci
```

### Pre-commit Configuration

For team consistency, consider using [pre-commit](https://pre-commit.com/):

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: component-validation
        name: React Component Validation
        entry: npm run validate:components
        language: system
        files: \.(tsx?|jsx?)$
```

## Best Practices

### Development Workflow

1. **Write components following Next.js 13+ patterns**
2. **Run validation frequently**: `npm run validate:components`
3. **Fix errors immediately** rather than accumulating them
4. **Use warnings as guidance** for performance optimization

### Team Guidelines

1. **Server-first approach**: Start with server components, add `'use client'` only when needed
2. **Minimize client boundaries**: Group interactive features into specific client components
3. **Keep pages lightweight**: Avoid `'use client'` in page components when possible
4. **Regular validation**: Run `npm run validate:components:all` periodically

### Performance Tips

1. **Batch client components**: Group related interactive features
2. **Lazy load heavy components**: Use dynamic imports for large client components
3. **Monitor bundle size**: Client components increase JavaScript bundle size
4. **Use server actions**: For form submissions, prefer server actions over client handlers

## Support and Maintenance

### Updating Validation Rules

The validation rules are defined in `.claude/hooks/validate-components.js`. To add new rules:

1. Add detection logic to the appropriate method
2. Update the validation in `validateFile()` method  
3. Test with various component patterns
4. Update this documentation

### Disabling Specific Rules

Currently, all rules are enabled. For future extensibility, consider adding configuration options:

```javascript
// Future enhancement: .componentvalidationrc.json
{
  "rules": {
    "hooks-in-server-component": "error",
    "function-props-in-server": "warn", 
    "client-page-component": "warn",
    "interactive-server-component": "warn"
  }
}
```

### Contributing

When modifying the validation system:

1. **Test thoroughly** with various component patterns
2. **Update documentation** to reflect changes
3. **Consider backward compatibility** for existing projects
4. **Add appropriate error messages** with clear fix suggestions

---

For additional support or questions about component validation, please refer to the [Next.js App Router documentation](https://nextjs.org/docs/app) or create an issue in the project repository.