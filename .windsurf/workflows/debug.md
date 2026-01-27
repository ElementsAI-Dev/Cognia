---
description: Systematic debugging workflow for identifying and fixing issues in the codebase.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Understand the Problem**:
   - What is the expected behavior?
   - What is the actual behavior?
   - When did it start happening?
   - Can it be consistently reproduced?

2. **Gather Information**:

   ```bash
   # Check for TypeScript errors
   pnpm tsc --noEmit
   
   # Check for lint errors
   pnpm lint
   
   # Check git history for recent changes
   git log --oneline -10
   
   # Check for related test failures
   pnpm test --findRelatedTests <file>
   ```

3. **Isolate the Issue**:

   **For Runtime Errors**:
   - Check browser console for errors
   - Check terminal for server errors
   - Add logging to trace execution path
   - Use browser DevTools debugger

   **For Build Errors**:
   - Read the full error message
   - Check the file and line number
   - Verify imports and exports
   - Check for circular dependencies

   **For Type Errors**:
   - Hover over red squiggles in IDE
   - Check type definitions in `@/types`
   - Verify generic type parameters
   - Check for `null`/`undefined` handling

4. **Common Issue Patterns**:

   | Symptom | Likely Cause | Solution |
   |---------|--------------|----------|
   | `undefined is not a function` | Missing import or typo | Check import statement |
   | `Cannot read property of undefined` | Null/undefined access | Add optional chaining `?.` |
   | `Hydration mismatch` | Server/client content differs | Check `'use client'` directive |
   | `Module not found` | Wrong import path | Use `@/` alias correctly |
   | `Type X is not assignable to Y` | Type mismatch | Check type definitions |
   | `Infinite loop detected` | useEffect dependency issue | Check dependency array |
   | `Memory leak` | Missing cleanup | Add cleanup in useEffect |

5. **Add Diagnostic Logging**:

   ```typescript
   // For React components
   console.log('[ComponentName] render:', { props, state })
   
   // For hooks
   useEffect(() => {
     console.log('[useHookName] effect triggered:', dependencies)
   }, [dependencies])
   
   // For async operations
   console.log('[functionName] start:', input)
   try {
     const result = await operation()
     console.log('[functionName] success:', result)
   } catch (error) {
     console.error('[functionName] error:', error)
   }
   ```

6. **Tauri-Specific Debugging**:

   **Rust Backend**:

   ```bash
   # Run with debug logging
   RUST_LOG=debug pnpm tauri dev
   
   # Check Rust compilation
   cd src-tauri && cargo check
   ```

   **IPC Issues**:
   - Check command registration in `lib.rs`
   - Verify TypeScript types match Rust types
   - Check for proper `invoke` usage

7. **Fix and Verify**:
   - Make minimal, targeted fix
   - Run related tests
   - Verify fix doesn't break other functionality
   - Remove diagnostic logging

8. **Document Finding**:
   - If it's a common issue, consider adding a comment
   - Update tests to prevent regression
   - Consider if architecture change needed

## Debug Commands

```bash
# Next.js development with verbose output
DEBUG=* pnpm dev

# Tauri with Rust debug logging
RUST_LOG=debug pnpm tauri dev

# Run specific test in debug mode
node --inspect-brk node_modules/.bin/jest <test-file>

# Check for circular dependencies
npx madge --circular --extensions ts,tsx .
```

## Browser DevTools Tips

- **Network tab**: Check API requests/responses
- **Console tab**: Filter by log level
- **Sources tab**: Set breakpoints
- **React DevTools**: Inspect component state
- **Performance tab**: Profile render times

## Common Fixes

### Hydration Errors

```tsx
// Add 'use client' for interactive components
'use client'

// Or use dynamic import with ssr: false
const Component = dynamic(() => import('./Component'), { ssr: false })
```

### Type Errors

```typescript
// Add proper null checks
const value = data?.property ?? defaultValue

// Use type guards
if (isValidType(data)) {
  // TypeScript knows the type here
}
```

### Memory Leaks

```typescript
useEffect(() => {
  const controller = new AbortController()
  fetchData({ signal: controller.signal })
  
  return () => controller.abort() // Cleanup!
}, [])
```

## Notes

- Always fix root cause, not symptoms
- Don't leave console.log in production code
- Add regression tests for bugs found
- Document non-obvious fixes with comments
