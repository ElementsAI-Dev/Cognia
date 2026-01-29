---
description: Performance profiling and optimization for React, TypeScript, and Rust code
---

# Performance Workflow

Profile, analyze, and optimize performance for the target codebase.

## Prerequisites

- Target folder or component path
- Development server running (for React profiling)
- Baseline metrics if available

## Phase 1: Profiling Setup

### React/Frontend

1. **Enable React DevTools Profiler**

2. **Add performance marks**

   ```typescript
   performance.mark('operation-start')
   // ... operation
   performance.mark('operation-end')
   performance.measure('operation', 'operation-start', 'operation-end')
   ```

3. **Bundle analysis**

   ```bash
   pnpm build
   npx source-map-explorer out/**/*.js
   ```

### Rust/Backend

1. **Enable release profiling**

   ```toml
   [profile.release]
   debug = true
   ```

2. **Use flamegraph or perf**

## Phase 2: Metrics Collection

### 2.1 React Performance

- [ ] Component render times
- [ ] Re-render frequency
- [ ] Bundle size per route
- [ ] Time to Interactive (TTI)
- [ ] First Contentful Paint (FCP)

### 2.2 JavaScript/TypeScript

- [ ] Function execution time
- [ ] Memory allocation
- [ ] Event handler latency
- [ ] API response handling time

### 2.3 Rust Performance

- [ ] Command execution time
- [ ] Memory usage
- [ ] CPU utilization
- [ ] I/O operations

## Phase 3: Common Issues & Solutions

### React Optimization

| Issue | Detection | Solution |
|-------|-----------|----------|
| Excessive re-renders | Profiler shows many renders | `React.memo`, `useMemo`, `useCallback` |
| Large bundles | Bundle analyzer | Code splitting, lazy loading |
| Slow initial load | Lighthouse | SSR, preloading, caching |
| Memory leaks | DevTools Memory tab | Cleanup in useEffect |

### TypeScript Optimization

| Issue | Detection | Solution |
|-------|-----------|----------|
| O(n²) algorithms | Code review | Better data structures |
| Redundant computations | Profiling | Memoization |
| Blocking operations | Long tasks | Web Workers, async |
| Large object cloning | Memory spikes | Immutable updates |

### Rust Optimization

| Issue | Detection | Solution |
|-------|-----------|----------|
| Excessive cloning | Profiler | References, Cow |
| Lock contention | Thread analysis | Fine-grained locks |
| Allocation overhead | Memory profiler | Preallocate, reuse |
| I/O blocking | Latency | Async, buffering |

## Phase 4: Optimization Patterns

### 4.1 React Patterns

```typescript
// Memoize expensive components
const MemoizedComponent = React.memo(ExpensiveComponent)

// Memoize calculations
const computed = useMemo(() => expensiveCalc(data), [data])

// Memoize callbacks
const handler = useCallback((e) => handle(e, dep), [dep])

// Lazy load routes
const LazyComponent = lazy(() => import('./Heavy'))
```

### 4.2 Data Structure Optimization

```typescript
// Use Map for frequent lookups
const lookup = new Map(items.map(i => [i.id, i]))

// Use Set for membership checks
const idSet = new Set(ids)

// Avoid array.find in loops
// BAD: items.find(i => i.id === id)
// GOOD: lookup.get(id)
```

### 4.3 Async Optimization

```typescript
// Parallel execution
const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()])

// Debounce frequent operations
const debouncedSearch = useMemo(
  () => debounce(search, 300),
  []
)
```

## Phase 5: Verification

After optimization:

1. **Re-run profiling** - compare before/after

2. **Measure improvement**

   - Render time reduction %
   - Bundle size reduction KB
   - Memory usage reduction MB
   - Response time improvement ms

3. **Regression testing**

   ```bash
   pnpm test
   pnpm test:e2e
   ```

4. **Document results**

## Output Format

```markdown
## Performance Report

### Before
- Metric 1: X ms
- Metric 2: Y KB

### After
- Metric 1: X' ms (Z% improvement)
- Metric 2: Y' KB (W% reduction)

### Changes Made
1. [Optimization 1]: [Impact]
2. [Optimization 2]: [Impact]

### Recommendations
- [Future optimization opportunities]
```

## Important Notes

- **Measure first** - don't optimize blindly
- **One change at a time** - isolate impact
- **Test after each change** - ensure no regressions
- **Document baselines** - for future comparison
- **Focus on bottlenecks** - 80/20 rule applies
