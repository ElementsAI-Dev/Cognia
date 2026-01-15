# Task Completion Checklist for Cognia

## After Completing Any Code Task

### 1. Type Checking

```bash
pnpm exec tsc --noEmit
```

- Ensure no TypeScript errors
- Check for type mismatches
- Verify imports are correct

### 2. Linting

```bash
pnpm lint
# or with auto-fix
pnpm lint --fix
```

- Fix ESLint warnings/errors
- Check for unused variables (unless prefixed with `_`)
- Verify code style consistency

### 3. Testing

```bash
# Run affected tests
pnpm test

# If coverage is relevant
pnpm test:coverage
```

- Run tests for modified files
- Ensure all tests pass
- Check coverage if new code added

### 4. Build Verification

```bash
pnpm build
```

- Verify production build succeeds
- Check for static export issues (Tauri compatibility)
- Ensure no runtime errors

### 5. Manual Verification

- [ ] Feature works as expected in dev mode
- [ ] No console errors or warnings
- [ ] UI renders correctly
- [ ] State updates properly
- [ ] Edge cases handled

### 6. Commit Preparation

```bash
# Stage changes
git add .

# Commit (conventional commits enforced)
git commit -m "feat: description"

# Or use the commit skill
/commit
```

## Common Issues to Check

### Static Export Compatibility

- No server-side API routes in production
- Tauri plugins properly stubbed for browser
- No dynamic imports that break static build

### Type Safety

- All props are typed
- No `any` types without justification
- Proper return types for functions

### Performance

- No unnecessary re-renders
- Memoization where appropriate
- Efficient state updates

### Security

- No hardcoded secrets
- Input validation on user data
- Proper error handling (don't expose internals)
