---
description: Perform code review with quality checks, security analysis, and improvement suggestions.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Identify Scope**: Determine what to review:
   - Specific file(s) from user input
   - Staged changes: `git diff --cached`
   - Recent commits: `git diff HEAD~1`
   - Pull request diff

2. **Run Automated Checks**:

   ```bash
   # Lint check
   pnpm lint
   
   # Type check
   pnpm tsc --noEmit
   
   # Test affected files
   pnpm test --findRelatedTests <files>
   ```

3. **Code Quality Analysis**:

   **Check for**:
   - [ ] Unused imports and variables
   - [ ] Missing error handling (empty catch blocks)
   - [ ] Hardcoded values that should be constants
   - [ ] Inconsistent naming conventions
   - [ ] Missing TypeScript types (`any`, `unknown`)
   - [ ] Commented-out code
   - [ ] Console.log statements
   - [ ] TODO/FIXME comments without issue references

4. **Security Review**:

   **Check for**:
   - [ ] Hardcoded credentials or API keys
   - [ ] Unsafe `dangerouslySetInnerHTML` usage
   - [ ] Unvalidated user input
   - [ ] SQL injection vulnerabilities
   - [ ] XSS vulnerabilities
   - [ ] Sensitive data in localStorage
   - [ ] Missing authentication checks

5. **Performance Review**:

   **Check for**:
   - [ ] Unnecessary re-renders (missing `useMemo`, `useCallback`)
   - [ ] Large bundle imports (should use dynamic import)
   - [ ] Missing loading states
   - [ ] Unoptimized images
   - [ ] Memory leaks (missing cleanup in useEffect)
   - [ ] N+1 query patterns

6. **Architecture Review**:

   **Check for**:
   - [ ] Proper separation of concerns
   - [ ] Correct file placement per project structure
   - [ ] Appropriate use of hooks vs components
   - [ ] State management consistency (Zustand patterns)
   - [ ] API boundary adherence

7. **Generate Review Report**:

   ```markdown
   ## Code Review Summary
   
   ### Files Reviewed
   - `path/to/file1.tsx`
   - `path/to/file2.ts`
   
   ### Issues Found
   
   #### 🔴 Critical
   - [File:Line] Description
   
   #### 🟡 Warning
   - [File:Line] Description
   
   #### 🔵 Suggestion
   - [File:Line] Description
   
   ### Positive Findings
   - Good use of TypeScript generics
   - Well-structured error handling
   
   ### Recommendations
   1. Consider extracting X to a separate hook
   2. Add unit tests for Y functionality
   ```

## Review Checklist

### TypeScript

- [ ] No `any` types without justification
- [ ] Proper interface/type definitions
- [ ] Generic types used appropriately
- [ ] Strict null checks handled

### React

- [ ] Components are properly memoized
- [ ] Keys used correctly in lists
- [ ] Effects have proper dependencies
- [ ] Cleanup functions in effects
- [ ] Error boundaries for critical sections

### Styling

- [ ] Tailwind classes used consistently
- [ ] Dark mode support (`dark:` prefix)
- [ ] Responsive design (`sm:`, `md:`, etc.)
- [ ] `cn()` utility for conditional classes

### Testing

- [ ] Tests cover happy path
- [ ] Error cases tested
- [ ] Edge cases considered
- [ ] Mocks properly configured

## Severity Levels

| Level | Icon | Description |
|-------|------|-------------|
| Critical | 🔴 | Security issues, data loss risks, blocking bugs |
| Warning | 🟡 | Performance issues, code smells, missing tests |
| Suggestion | 🔵 | Style improvements, refactoring opportunities |
| Info | ⚪ | Documentation, minor improvements |

## Notes

- Focus on actionable feedback
- Suggest specific fixes, not just problems
- Acknowledge good patterns
- Consider context and constraints
- Be constructive, not critical
