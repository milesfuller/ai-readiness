# Agent Coordination Protocol

## 🚨 CRITICAL: MANDATORY PRE-FLIGHT CHECKS

Before ANY agent writes code, they MUST complete these validation steps:

### 1. CONTRACT VALIDATION
```bash
# MANDATORY: Validate all contracts before coding
npm run validate:contracts
npx tsc --noEmit contracts/api.ts contracts/database.ts
```

### 2. DEPENDENCY ANALYSIS
```bash
# Check for conflicts with existing code
npm run analyze:dependencies
git status --porcelain | grep -E "\.(ts|tsx|js|jsx)$" || echo "Clean workspace"
```

### 3. SCHEMA COMPATIBILITY
```bash
# Ensure database schema compatibility
npm run validate:schema
npx prisma validate || echo "Schema validation required"
```

## 🔒 REQUIRED VALIDATION STEPS DURING DEVELOPMENT

### Phase 1: Before Writing Any Code
1. **Read ALL contract files:**
   - `/contracts/api.ts` - API interfaces
   - `/contracts/database.ts` - Database schemas
   - `/protocols/agent-coordination.md` - This file

2. **Validate existing implementations:**
   ```bash
   npm run test:contracts
   npm run lint:contracts
   ```

3. **Check for breaking changes:**
   ```bash
   git diff --name-only contracts/
   npm run validate:breaking-changes
   ```

### Phase 2: During Implementation
1. **After every file modification:**
   ```bash
   # Validate TypeScript compilation
   npx tsc --noEmit [modified-file]
   
   # Run contract tests
   npm test -- --testPathPattern=contracts
   
   # Validate API compatibility
   npm run validate:api-compat
   ```

2. **Before committing any code:**
   ```bash
   # Full validation suite
   npm run validate:all
   npm run test:integration
   npm run build
   ```

### Phase 3: Post-Implementation
1. **Contract adherence verification:**
   ```bash
   npm run verify:contracts
   npm run test:contracts -- --coverage
   ```

2. **Integration testing:**
   ```bash
   npm run test:e2e
   npm run validate:database-migrations
   ```

## 🛡️ POST-WRITE VERIFICATION REQUIREMENTS

### Immediate Post-Write Checks
1. **TypeScript Compilation:**
   ```bash
   npx tsc --noEmit --strict
   ```

2. **Contract Compliance:**
   ```bash
   npm run validate:contract-compliance
   ```

3. **Integration Points:**
   ```bash
   npm run test:integration-points
   ```

### Extended Verification (Before PR)
1. **Full Test Suite:**
   ```bash
   npm run test:all
   npm run test:e2e
   ```

2. **Performance Impact:**
   ```bash
   npm run benchmark:api
   npm run analyze:bundle-size
   ```

3. **Security Validation:**
   ```bash
   npm audit
   npm run security:scan
   ```

## 🚫 FORBIDDEN ACTIONS

Agents MUST NOT:
1. Modify `/contracts/` files without explicit approval
2. Create new API endpoints without updating contracts first
3. Change database schemas without migration validation
4. Skip any mandatory validation step
5. Commit code that fails contract tests
6. Create breaking changes without coordination protocol
7. Ignore TypeScript errors or warnings
8. Bypass the validation pipeline

## ⚡ EMERGENCY PROTOCOL

If validation fails:
1. **STOP all development immediately**
2. **Create issue in project tracker**
3. **Notify all agents via coordination channel**
4. **Wait for contract resolution before continuing**
5. **Re-run full validation suite after fixes**

## 📋 MANDATORY CHECKLIST

Before ANY code contribution:
- [ ] Read all contract files
- [ ] Run pre-flight validation
- [ ] Validate TypeScript compilation
- [ ] Run contract test suite
- [ ] Check API compatibility
- [ ] Validate database schemas
- [ ] Run integration tests
- [ ] Verify no breaking changes
- [ ] Update documentation if needed
- [ ] Pass all post-write verification

## 🔄 COORDINATION HOOKS

Agents MUST execute these hooks:

### Pre-Development Hook
```bash
#!/bin/bash
echo "🔍 Starting pre-development validation..."
npm run validate:contracts || exit 1
npm run validate:dependencies || exit 1
echo "✅ Pre-development validation passed"
```

### Post-Edit Hook
```bash
#!/bin/bash
echo "🔄 Running post-edit validation..."
npx tsc --noEmit $1 || exit 1
npm test -- --testPathPattern=contracts || exit 1
echo "✅ Post-edit validation passed for $1"
```

### Pre-Commit Hook
```bash
#!/bin/bash
echo "🚀 Running pre-commit validation..."
npm run validate:all || exit 1
npm run test:contracts || exit 1
npm run build || exit 1
echo "✅ Pre-commit validation passed"
```

## 🎯 SUCCESS METRICS

Track these metrics for coordination effectiveness:
- Contract test coverage: >95%
- Validation failure rate: <5%
- Breaking change incidents: 0
- Integration test pass rate: >98%
- TypeScript strict mode compliance: 100%

## 🚨 ESCALATION PROCEDURES

When issues arise:
1. **Level 1**: Automated validation failure → Auto-fix if possible
2. **Level 2**: Contract violation → Block all development, notify team
3. **Level 3**: Breaking change detected → Emergency coordination meeting
4. **Level 4**: Data corruption risk → Immediate rollback procedures

Remember: **Prevention is better than debugging!** This protocol ensures parallel agents create compatible, maintainable code.