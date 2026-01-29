---
description: Implement optimizations from code-audit findings with safety checks and verification
---

# Optimize Workflow

Systematically implement optimizations identified by `/code-audit`, with proper testing and rollback safety.

## Prerequisites

- Code audit completed (have optimization plan)
- Clean git state (no uncommitted changes)
- Tests passing before starting

## Phase 1: Preparation

1. **Verify clean state**

   ```bash
   git status
   pnpm test
   ```

2. **Create optimization branch**

   ```bash
   git checkout -b optimize/<scope>-<date>
   ```

3. **Review optimization plan**

   - Confirm priorities are still valid
   - Identify dependencies between optimizations
   - Group related changes

## Phase 2: Implementation Order

Execute optimizations in this order:

### 2.1 Quick Wins First

- Small effort, high impact changes
- No breaking changes
- Isolated scope

### 2.2 Then Medium Priority

- Moderate refactoring
- May require test updates
- Single module scope

### 2.3 Finally Complex Changes

- Large refactoring
- Cross-module changes
- Potential breaking changes

## Phase 3: Per-Optimization Checklist

For each optimization:

### Before Change

- [ ] Read and understand current code
- [ ] Identify all usages (grep for references)
- [ ] Note existing tests
- [ ] Create backup point: `git stash` or commit WIP

### During Change

- [ ] Make minimal necessary changes
- [ ] Preserve existing behavior
- [ ] Update types if needed
- [ ] Fix imports

### After Change

- [ ] Run affected tests
- [ ] Verify no type errors: `pnpm tsc --noEmit`
- [ ] Check lint: `pnpm lint`
- [ ] Manual verification if UI change
- [ ] Commit with descriptive message

## Phase 4: Verification

After all optimizations:

1. **Full test suite**

   ```bash
   pnpm test
   pnpm test:e2e
   ```

2. **Type check**

   ```bash
   pnpm tsc --noEmit
   ```

3. **Lint check**

   ```bash
   pnpm lint
   ```

4. **Build verification**

   ```bash
   pnpm build
   ```

## Phase 5: Documentation

Update if needed:

- [ ] README changes
- [ ] API documentation
- [ ] Migration notes for breaking changes
- [ ] CHANGELOG entry

## Rollback Strategy

If issues discovered:

1. **Single optimization**: `git revert <commit>`
2. **Multiple optimizations**: `git reset --hard <safe-commit>`
3. **Partial rollback**: Cherry-pick good commits to new branch

## Commit Convention

```text
perf(<scope>): <description>

- Optimization: <what was optimized>
- Benefit: <expected improvement>
- Refs: #<issue> (if applicable)
```

## Important Notes

- **One optimization per commit** for easy rollback
- **Test after each change** before moving to next
- **Don't combine** unrelated optimizations
- **Preserve behavior** unless explicitly changing it
- **Document breaking changes** immediately
