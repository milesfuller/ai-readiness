# Playwright Setup in DevContainer

This document describes the Playwright setup in the AI Readiness devcontainer.

## What's Included

### System Dependencies
The Dockerfile includes all necessary system libraries for running Playwright browsers:
- Chromium dependencies (libnss3, libgtk-3-0, etc.)
- Firefox dependencies (libxtst6, libgdk-pixbuf2.0-0, etc.)
- WebKit dependencies (libwoff1, libopus0, etc.)
- Media codecs and additional libraries

### Pre-installed Browsers
Browsers are pre-installed during container build to:
- Reduce first-run setup time
- Ensure consistent versions across environments
- Avoid network issues during development

### Environment Configuration
- `PLAYWRIGHT_BROWSERS_PATH`: Set to `/home/node/pw-browsers` for persistent storage
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`: Set to `0` to ensure browsers are available
- `CI`: Set to `false` for better development experience

## Usage

### Running Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode
npm run test:e2e:ui

# Debug tests
npm run test:e2e:debug

# Run specific test file
npx playwright test auth-login-redirect.spec.ts
```

### Generating Tests
```bash
# Open Playwright codegen
npx playwright codegen http://localhost:3000

# Record actions and generate code
npx playwright codegen --save-storage=auth.json http://localhost:3000
```

### Viewing Reports
```bash
# After test run, view HTML report
npx playwright show-report
```

## Maintenance

### Updating Browsers
```bash
# Check current versions
npx playwright --version

# Update browsers
npx playwright install --with-deps
```

### Troubleshooting
If tests fail to run:
1. Check browser installation: `npx playwright install --list`
2. Reinstall if needed: `npx playwright install --with-deps`
3. Verify permissions: `ls -la /home/node/pw-browsers`
4. Check system dependencies: `npx playwright install-deps`