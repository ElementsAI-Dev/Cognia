---
description: Find and remove unused code, dependencies, and files from the codebase
---

# Dead Code Workflow

Systematically identify and remove unused code to reduce maintenance burden and bundle size.

## Prerequisites

- Target folder path
- Clean git state
- All tests passing

## Phase 1: Analysis Tools

### TypeScript/JavaScript

1. **Find unused exports**

   ```bash
   npx ts-prune
   ```

2. **Find unused dependencies**

   ```bash
   npx depcheck
   ```

3. **Find unused files**

   ```bash
   npx unimported
   ```

### Rust

1. **Compiler warnings**

   ```bash
   cargo build 2>&1 | grep "unused"
   ```

2. **Dead code detection**

   ```bash
   cargo +nightly udeps
   ```

## Phase 2: Manual Inspection

### 2.1 Unused Exports

Search for:

- [ ] Functions never imported
- [ ] Classes never instantiated
- [ ] Constants never referenced
- [ ] Types never used

### 2.2 Unused Parameters

Look for:

- [ ] Function parameters prefixed with `_`
- [ ] Destructured but unused variables
- [ ] Callback parameters never used

### 2.3 Unreachable Code

Check for:

- [ ] Code after return/throw
- [ ] Dead branches (always true/false conditions)
- [ ] Commented-out code blocks
- [ ] Feature flags for removed features

### 2.4 Unused Dependencies

Verify each dependency is:

- [ ] Actually imported somewhere
- [ ] Used at runtime (not just types)
- [ ] Not duplicated (check for similar packages)

### 2.5 Unused Files

Find files that are:

- [ ] Never imported
- [ ] Old backup copies
- [ ] Deprecated implementations
- [ ] Test fixtures no longer used

## Phase 3: Verification Process

Before removing any code:

1. **Search for references**

   ```bash
   # For a function/variable
   grep -r "functionName" --include="*.ts" --include="*.tsx"

   # For a file
   grep -r "filename" --include="*.ts" --include="*.tsx"
   ```

2. **Check dynamic usage**

   - String-based imports
   - Reflection usage
   - Plugin systems
   - Configuration files

3. **Check test coverage**

   - Is it only used in tests?
   - Is it testing something still needed?

4. **Check external usage**

   - Public API exports
   - Plugin interfaces
   - Shared libraries

## Phase 4: Safe Removal Process

For each unused item:

### Step 1: Mark as Deprecated

```typescript
/** @deprecated Remove in next release - unused */
export function oldFunction() {}
```

### Step 2: Run Tests

```bash
pnpm test
pnpm build
```

### Step 3: Remove Code

- Delete the unused code
- Remove imports of deleted code
- Update index/barrel files

### Step 4: Verify Removal

```bash
pnpm tsc --noEmit
pnpm test
pnpm build
```

### Step 5: Commit

```bash
git add -A
git commit -m "chore: remove unused <item>"
```

## Phase 5: Report

### Output Format

```markdown
## Dead Code Report

### Unused Exports (X found)

| Export | File | Last Used | Action |
|--------|------|-----------|--------|
| `functionName` | `path/file.ts` | Never | Remove |

### Unused Dependencies (Y found)

| Package | Type | Size | Action |
|---------|------|------|--------|
| `package-name` | devDep | 100KB | Remove |

### Unused Files (Z found)

| File | Last Modified | Reason | Action |
|------|---------------|--------|--------|
| `path/file.ts` | 2024-01-01 | No imports | Remove |

### Summary

- Exports removed: X
- Dependencies removed: Y
- Files removed: Z
- Bundle size reduction: ~N KB
```

## Common False Positives

Watch out for:

- **Dynamic imports**: `import(path)` won't show in static analysis
- **Plugin systems**: Items loaded by configuration
- **Server-side only**: Used in API routes but not client
- **Build-time only**: Used by build scripts
- **Type-only exports**: Types used without runtime import
- **Test utilities**: Shared test helpers

## Important Notes

- **Remove incrementally** - one commit per removal
- **Test after each removal** - catch issues early
- **Check dynamic usage** - grep may miss string references
- **Keep public APIs** - external consumers may use them
- **Document removals** - update CHANGELOG
- **Don't remove TODO comments** - track separately
