---
description: Migrate code between versions, frameworks, or architectural patterns
---

# Migrate Workflow

Systematic migration of code between versions, frameworks, or patterns with safety checks.

## Prerequisites

- Migration target defined (version/framework/pattern)
- Migration guide or changelog reviewed
- Clean git state
- Full test suite passing

## Phase 1: Planning

1. **Review migration guide**

   - Breaking changes
   - Deprecations
   - New APIs
   - Removed features

2. **Assess impact scope**

   - Files affected
   - Dependencies to update
   - Configuration changes
   - Test updates needed

3. **Create migration branch**

   ```bash
   git checkout -b migrate/<target>-<date>
   ```

4. **Document baseline**

   - Current version
   - Current test count/coverage
   - Current build time

## Phase 2: Dependency Updates

1. **Update core dependencies**

   ```bash
   pnpm update <package>@<version>
   ```

2. **Update peer dependencies**

3. **Resolve version conflicts**

4. **Run initial build**

   ```bash
   pnpm install
   pnpm build
   ```

5. **Document breaking errors**

## Phase 3: Code Migration

### 3.1 Automated Codemods

If available, run official codemods:

```bash
# Example: React codemods
npx @react-codemod/cli <codemod-name> <path>

# Example: Next.js codemods
npx @next/codemod <codemod-name> <path>
```

### 3.2 Pattern Replacements

Common migration patterns:

| Old Pattern | New Pattern | Files |
|-------------|-------------|-------|
| `oldApi()` | `newApi()` | *.ts |
| `<OldComp>` | `<NewComp>` | *.tsx |
| `import { x }` | `import { y }` | all |

### 3.3 Manual Updates

For each breaking change:

1. Search for usage: `grep -r "pattern"`
2. Update to new API
3. Test the change
4. Commit incrementally

## Phase 4: Configuration Updates

Check and update:

- [ ] `package.json` scripts
- [ ] `tsconfig.json` compiler options
- [ ] `next.config.ts` / framework config
- [ ] `eslint.config.mjs` rules
- [ ] `jest.config.ts` settings
- [ ] Environment variables

## Phase 5: Test Updates

1. **Run existing tests**

   ```bash
   pnpm test
   ```

2. **Fix failing tests**

   - Update deprecated test APIs
   - Fix mock updates
   - Update snapshots if valid

3. **Add new tests**

   - For new features
   - For changed behavior

4. **Update E2E tests**

   ```bash
   pnpm test:e2e
   ```

## Phase 6: Verification

### Build Verification

```bash
pnpm build
pnpm start  # Test production build
```

### Type Checking

```bash
pnpm tsc --noEmit
```

### Lint Checking

```bash
pnpm lint
```

### Full Test Suite

```bash
pnpm test
pnpm test:e2e
```

### Manual Smoke Test

- [ ] App starts correctly
- [ ] Key features work
- [ ] No console errors
- [ ] No visual regressions

## Phase 7: Documentation

Update:

- [ ] README with new requirements
- [ ] CHANGELOG with migration notes
- [ ] API documentation
- [ ] Development setup guide

## Migration Checklist Template

```markdown
## Migration: [Source] → [Target]

### Pre-Migration
- [ ] Review breaking changes
- [ ] Backup current state
- [ ] Create migration branch
- [ ] Document current metrics

### Dependencies
- [ ] Update core package
- [ ] Update peer dependencies
- [ ] Resolve conflicts
- [ ] Lock file updated

### Code Changes
- [ ] Run codemods
- [ ] Update deprecated APIs
- [ ] Fix type errors
- [ ] Update imports

### Configuration
- [ ] Framework config
- [ ] TypeScript config
- [ ] Build config
- [ ] Lint config

### Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing complete
- [ ] No regressions

### Documentation
- [ ] CHANGELOG updated
- [ ] README updated
- [ ] Migration notes added

### Post-Migration
- [ ] PR created
- [ ] Code reviewed
- [ ] Merged to main
- [ ] Deployed successfully
```

## Rollback Plan

If migration fails:

1. **Immediate**: `git checkout main`
2. **Partial rollback**: Revert specific commits
3. **Lock versions**: Pin to pre-migration versions

## Common Framework Migrations

### React Version Upgrade

- Check React release notes
- Update `react` and `react-dom`
- Run React codemods
- Update deprecated lifecycle methods

### Next.js Version Upgrade

- Run `npx @next/codemod`
- Update `next.config.ts`
- Check API route changes
- Update Image component usage

### TypeScript Version Upgrade

- Check breaking changes
- Update `tsconfig.json`
- Fix new strict mode errors
- Update type definitions

## Important Notes

- **One major upgrade at a time** - don't combine migrations
- **Test incrementally** - catch issues early
- **Keep commits atomic** - easy to bisect issues
- **Document workarounds** - for future reference
- **Have rollback ready** - before deploying
