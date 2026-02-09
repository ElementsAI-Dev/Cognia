---
description: Quick bug fix workflow — paste an error message or describe a bug, automatically locate root cause and apply minimal fix.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Classify the Error**: Determine error type from user input:

   | Error Type | Indicators |
   |------------|------------|
   | Type Error | `TS2xxx`, `Type X is not assignable` |
   | Build Error | `Module not found`, `Failed to compile` |
   | Runtime Error | `TypeError`, `ReferenceError`, stack trace |
   | Lint Error | `eslint`, rule names like `no-unused-vars` |
   | Rust Error | `error[E0xxx]`, `cargo build` output |
   | Test Failure | `FAIL`, `expect(...).toBe(...)` |
   | Hydration Error | `Hydration failed`, `Text content mismatch` |

2. **Locate the Problem**:

   **From error message**:
   - Extract file path and line number from stack trace
   - Read the affected file
   - Understand surrounding context (5-10 lines around error)

   **From description**:
   - Use `mcp1_search_context` to find relevant code
   - Use `grep_search` to locate specific patterns
   - Read related files to understand data flow

3. **Analyze Root Cause**:

   ```bash
   # Type errors
   pnpm tsc --noEmit 2>&1 | head -50

   # Lint errors
   pnpm lint 2>&1 | head -50

   # Find related tests
   pnpm test --findRelatedTests <file> --no-coverage

   # Rust errors
   cd src-tauri && cargo check 2>&1
   ```

   **Common Root Causes**:

   | Symptom | Root Cause | Fix Pattern |
   |---------|-----------|-------------|
   | `undefined is not a function` | Missing/wrong import | Fix import path |
   | `Cannot read property of null` | Missing null check | Add `?.` or guard |
   | `Type X not assignable to Y` | Type mismatch | Fix type or cast |
   | `Module not found` | Wrong path or missing dep | Fix `@/` path |
   | `Hydration mismatch` | Server/client diff | Add `'use client'` |
   | `Hook called conditionally` | Conditional hook call | Move hook before conditionals |
   | `Infinite re-render` | Missing deps in useEffect | Fix dependency array |
   | `error[E0382] borrow` | Rust ownership issue | Clone or restructure |
   | `error[E0308] mismatched` | Rust type mismatch | Fix type annotation |

4. **Apply Minimal Fix**:

   **Principles**:
   - Fix the root cause, NOT symptoms
   - Make the smallest change that resolves the issue
   - Prefer upstream fixes over downstream workarounds
   - Don't refactor unrelated code while fixing

   **Fix Checklist**:
   - [ ] Change is minimal and focused
   - [ ] No unrelated modifications
   - [ ] Existing tests still pass
   - [ ] Fix addresses root cause

5. **Verify Fix**:

   ```bash
   # Type check
   pnpm tsc --noEmit

   # Lint
   pnpm lint

   # Run related tests
   pnpm test --findRelatedTests <file>

   # Full test suite (if change is broad)
   pnpm test

   # Rust check
   cd src-tauri && cargo check
   ```

6. **Add Regression Test** (if applicable):

   ```typescript
   it('should handle the previously broken case', () => {
     // Test the exact scenario that was failing
     const result = functionThatWasBroken(edgeCaseInput)
     expect(result).toBe(expectedOutput)
   })
   ```

7. **Report Summary**:

   ```markdown
   ## Fix Summary

   **Problem**: [Brief description]
   **Root Cause**: [What was actually wrong]
   **Fix**: [What was changed]
   **File(s)**: `@/path/to/file.ts:line`
   **Verification**: [Tests passed / manually verified]
   ```

## Quick Fix Patterns

### Missing Import

```typescript
// Add the missing import
import { MissingComponent } from '@/components/ui/missing-component'
```

### Null Safety

```typescript
// Before: crashes on null
const value = data.property

// After: safe access
const value = data?.property ?? defaultValue
```

### Type Fix

```typescript
// Before: type error
const handler = (e) => { ... }

// After: typed
const handler = (e: React.ChangeEvent<HTMLInputElement>) => { ... }
```

### Async/Await

```typescript
// Before: unhandled promise
fetchData().then(setData)

// After: proper async handling
try {
  const data = await fetchData()
  setData(data)
} catch (error) {
  console.error('Failed to fetch:', error)
}
```

### Hydration Fix

```tsx
// Before: server/client mismatch
export default function Component() {
  return <div>{Date.now()}</div>
}

// After: client-only rendering
'use client'
import { useState, useEffect } from 'react'

export default function Component() {
  const [time, setTime] = useState<number>()
  useEffect(() => setTime(Date.now()), [])
  return <div>{time}</div>
}
```

### Tauri Guard

```typescript
// Before: crashes in browser
const result = await invoke('command_name')

// After: guarded
if (isTauri()) {
  const result = await invoke('command_name')
}
```

## Notes

- Always reproduce the issue before fixing
- Check git blame to understand why the code was written that way
- If the fix is complex, consider filing an issue instead
- Remove any diagnostic logging after the fix
- Commit with `fix(<scope>): <description>` format
