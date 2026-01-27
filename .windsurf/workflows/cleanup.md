---
description: Clean up unused code, dependencies, and files from the codebase.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Identify Cleanup Scope**:
   - Unused imports
   - Dead code (unreachable functions)
   - Unused dependencies
   - Orphan files
   - Deprecated APIs

2. **Run Analysis Tools**:

   ```bash
   # Find unused exports
   npx ts-prune

   # Check for circular dependencies
   npx madge --circular --extensions ts,tsx .

   # Find unused dependencies
   npx depcheck

   # Lint with unused rules
   pnpm lint
   ```

3. **Unused Code Detection**:

   **TypeScript/JavaScript**:
   - Functions never called
   - Variables never read
   - Exports never imported
   - Dead branches (always true/false conditions)
   - Commented-out code

   **Rust** (`src-tauri/`):

   ```bash
   # Check for dead code
   cargo clippy -- -W dead_code

   # Find unused dependencies
   cargo +nightly udeps
   ```

4. **Remove Unused Imports**:

   ```bash
   # ESLint auto-fix
   pnpm lint --fix

   # Or use IDE organize imports
   # VS Code: Shift+Alt+O
   ```

5. **Clean Unused Dependencies**:

   ```bash
   # List unused deps
   npx depcheck

   # Remove specific package
   pnpm remove <package-name>

   # For Rust
   cd src-tauri && cargo remove <crate-name>
   ```

6. **Find Orphan Files**:

   Check for files not imported anywhere:
   - Test files without corresponding source
   - Components not used in routes
   - Utilities never imported
   - Types not referenced

7. **Remove Deprecated Code**:

   Search for:
   - `@deprecated` annotations
   - TODO comments for removal
   - Feature flags for disabled features
   - Old API versions

8. **Verify Cleanup**:

   ```bash
   # Type check
   pnpm tsc --noEmit

   # Run tests
   pnpm test

   # Build
   pnpm build
   ```

## Cleanup Checklist

### Code

- [ ] Remove unused imports
- [ ] Remove dead functions
- [ ] Remove unused variables
- [ ] Remove commented-out code
- [ ] Remove console.log statements
- [ ] Remove TODO/FIXME if resolved

### Dependencies

- [ ] Remove unused npm packages
- [ ] Remove unused Rust crates
- [ ] Update outdated dependencies
- [ ] Remove duplicate dependencies

### Files

- [ ] Remove orphan test files
- [ ] Remove unused assets
- [ ] Remove empty directories
- [ ] Remove backup files (.bak, .old)

### Configuration

- [ ] Remove unused env variables
- [ ] Clean up unused config options
- [ ] Remove deprecated feature flags

## Safe Cleanup Practices

1. **Always run tests after cleanup**
2. **Commit in small batches** (one type of cleanup per commit)
3. **Check exports before removing** (may be used externally)
4. **Keep git history** for potential restoration
5. **Document breaking changes** if removing public APIs

## Common Patterns to Remove

**Unused Error Handling**:

```typescript
// Before: catch with no action
try { ... } catch (e) { }

// After: proper handling or remove try-catch
try { ... } catch (e) { console.error(e) }
```

**Dead Feature Flags**:

```typescript
// Remove if feature is permanent
if (FEATURE_FLAG) { ... }
```

**Legacy Compatibility**:

```typescript
// Remove after migration complete
if (isLegacyMode) { ... }
```

## Notes

- Review changes carefully before committing
- Some "unused" code may be intentionally kept for future use
- Check git blame before removing old code
- Consider marking as `@deprecated` before removing public APIs
