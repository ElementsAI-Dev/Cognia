# Hooks Test Coverage Completion Plan

**Date**: January 25, 2026
**Status**: Active Planning
**Overall Coverage**: 85.9% (122/142 files tested)
**Target**: 95%+ coverage

---

## Executive Summary

This plan details the comprehensive test coverage analysis and completion roadmap for the `hooks/` directory. The analysis identified **20 files without tests** across 24 subdirectories, categorized by priority and implementation phases.

### Key Metrics

| Metric | Value |
|--------|-------|
| Total Source Files | 142 |
| Files with Tests | 122 (85.9%) |
| Files without Tests | 20 (14.1%) |
| High Priority Gaps | 2 files |
| Medium Priority Gaps | 4 files |
| Low Priority Gaps | 12 files |
| Empty Files | 1 file |

### Excellent Coverage Areas (100%)

The following domains have perfect test coverage:
- **Agent hooks**: 7/7 files ✅
- **AI hooks**: 7/7 files ✅
- **Chat hooks**: 12/12 files ✅
- **Native hooks**: 12/12 files ✅
- **MCP hooks**: 7/7 files ✅
- **Designer hooks**: 7/7 files ✅
- **Canvas hooks**: 3/3 files ✅
- **Context hooks**: 7/7 files ✅
- **Video Studio hooks**: 3/3 files ✅

---

## Critical Gaps (High Priority)

### 1. Settings Rules Editor Hook - 0% Coverage

**Location**: `hooks/settings/use-rules-editor.ts`
**Impact**: Critical - Core user customization feature
**Lines**: 342
**Complexity**: Very High

**Functionality**:
- Rules editor with AI optimization
- History management (undo/redo)
- File import/export
- Template application
- Keyboard shortcuts
- Complex state management

**Implementation Plan**:
```typescript
// Test structure needed
describe('useRulesEditor', () => {
  describe('State Management', () => {
    - test rules CRUD operations
    - test rule validation
    - test rule ordering
  })

  describe('History Management', () => {
    - test undo functionality
    - test redo functionality
    - test history limits
    - test history persistence
  })

  describe('AI Optimization', () => {
    - test rule optimization trigger
    - test AI integration
    - test suggestion application
  })

  describe('File Operations', () => {
    - test import from file
    - test export to file
    - test format validation
  })

  describe('Templates', () => {
    - test template application
    - test custom template creation
  })

  describe('Keyboard Shortcuts', () => {
    - test shortcut registration
    - test shortcut execution
    - test shortcut conflicts
  })
})
```

**Estimated Effort**: 12-16 hours

**Success Criteria**:
- All state transitions tested
- Undo/redo operations validated
- AI optimization integration verified
- File I/O operations tested
- 90%+ code coverage

---

### 2. Search Source Verification Hook - 0% Coverage

**Location**: `hooks/search/use-source-verification.ts`
**Impact**: High - Research mode accuracy
**Lines**: 258
**Complexity**: High

**Functionality**:
- Source credibility verification
- Domain filtering (trusted/blocked)
- Cross-validation
- Credibility scoring
- Settings integration

**Implementation Plan**:
```typescript
// Test structure needed
describe('useSourceVerification', () => {
  describe('Verification Logic', () => {
    - test source verification
    - test multiple source validation
    - test verification caching
  })

  describe('Domain Filtering', () => {
    - test trusted domain filtering
    - test blocked domain filtering
    - test wildcard patterns
    - test domain list management
  })

  describe('Cross-Validation', () => {
    - test cross-source validation
    - test fact-checking integration
    - test confidence scoring
  })

  describe('Credibility Scoring', () => {
    - test score calculation
    - test score thresholds
    - test custom scoring rules
  })

  describe('Settings Integration', () => {
    - test settings persistence
    - test settings updates
    - test default configurations
  })
})
```

**Estimated Effort**: 10-12 hours

**Success Criteria**:
- Verification logic fully tested
- Domain filtering validated
- Cross-verification working
- Credibility scoring accurate
- Settings integration verified

---

## Medium Priority Gaps

### 3. Plugin Components Hook

**Location**: `hooks/plugin/use-plugin-components.ts`
**Impact**: Medium - Plugin system extensibility
**Lines**: ~100
**Complexity**: Medium

**Functionality**:
- Plugin component registration
- Component rendering
- Plugin integration

**Implementation Plan**:
```typescript
describe('usePluginComponents', () => {
  - test component registration
  - test component unregistration
  - test component rendering
  - test plugin integration
  - test component lifecycle
})
```

**Estimated Effort**: 3-4 hours

---

### 4. Plugin IPC Hook

**Location**: `hooks/plugin/use-plugin-ipc.ts`
**Impact**: Medium - Plugin communication
**Lines**: ~180
**Complexity**: Medium
**Note**: Has test file - verify completeness

**Implementation Plan**:
```typescript
describe('usePluginIPC', () => {
  - test IPC message sending
  - test IPC message receiving
  - test error handling
  - test connection management
  - test message serialization
})
```

**Estimated Effort**: 2-3 hours (verification and updates)

---

### 5. Swipe Gesture Hook

**Location**: `hooks/utils/use-swipe-gesture.ts`
**Impact**: Medium - Mobile interaction
**Lines**: 138
**Complexity**: Medium

**Functionality**:
- Swipe gesture detection
- Touch event handling
- Threshold calculations
- Direction detection

**Implementation Plan**:
```typescript
describe('useSwipeGesture', () => {
  - test swipe detection (left/right/up/down)
  - test touch event handling
  - test threshold calculations
  - test gesture cancellation
  - test multiple gesture handling
})
```

**Estimated Effort**: 4-5 hours

---

### 6. Plugin Modes Hook

**Location**: `hooks/plugin/use-plugin-modes.ts`
**Impact**: Low-Medium - Plugin agent modes
**Lines**: 59
**Complexity**: Low

**Functionality**:
- Plugin-provided agent modes
- Store integration
- Mode registration

**Implementation Plan**:
```typescript
describe('usePluginModes', () => {
  - test mode registration
  - test mode retrieval
  - test store integration
  - test memoization
})
```

**Estimated Effort**: 2-3 hours

---

## Low Priority Gaps

### 7. Media Query Hook

**Location**: `hooks/ui/use-media-query.ts`
**Impact**: Low - Simple wrapper
**Lines**: 34
**Complexity**: Low

**Functionality**:
- Media query detection
- useSyncExternalStore wrapper

**Implementation Plan**:
```typescript
describe('useMediaQuery', () => {
  - test media query matching
  - test query changes
  - test SSR compatibility
})
```

**Estimated Effort**: 1-2 hours

**Note**: Very simple hook - consider if coverage requirements justify testing

---

### 8. Plugin Tools Hook

**Location**: `hooks/plugin/use-plugin-tools.ts`
**Impact**: Low - Plugin utilities
**Lines**: ~80
**Complexity**: Low

**Implementation Plan**:
```typescript
describe('usePluginTools', () => {
  - test tool registration
  - test tool retrieval
  - test tool execution
})
```

**Estimated Effort**: 2-3 hours

---

### 9. Device Detection Hook

**Location**: `hooks/utils/use-device.ts`
**Impact**: Low - Utility hook
**Lines**: 78
**Complexity**: Low

**Functionality**:
- Device detection utilities
- Platform detection
- Screen size detection

**Implementation Plan**:
```typescript
describe('useDevice', () => {
  - test device type detection
  - test platform detection
  - test screen size updates
})
```

**Estimated Effort**: 2-3 hours

---

### 10. Enhanced RAG Hook (EMPTY FILE)

**Location**: `hooks/rag/use-enhanced-rag.ts`
**Impact**: Unknown - File is empty
**Lines**: 0
**Complexity**: N/A

**Action Required**:
- Either implement the hook with comprehensive tests, OR
- Remove the empty file

**If Implemented**:
```typescript
describe('useEnhancedRAG', () => {
  - test enhanced retrieval
  - test context optimization
  - test query expansion
  - test result reranking
})
```

**Estimated Effort**: TBD (depends on implementation)

---

## Implementation Phases

### Phase 1: Critical Core (Week 1)

**Goal**: Address all P0 gaps

| Hook | Lines | Effort | Priority |
|------|-------|--------|----------|
| `use-rules-editor.ts` | 342 | 12-16h | P0 |
| `use-source-verification.ts` | 258 | 10-12h | P0 |

**Total**: 22-28 hours

**Deliverables**:
- Complete test suite for rules editor hook
- Complete test suite for source verification hook
- Integration tests for settings persistence
- Mock implementations for external dependencies

**Success Criteria**:
- 90%+ coverage for both hooks
- All state transitions tested
- Undo/redo operations validated
- AI optimization integration verified
- Verification logic fully tested
- Domain filtering validated

---

### Phase 2: Feature Hooks (Week 2)

**Goal**: Address P1 gaps

| Hook | Lines | Effort | Priority |
|------|-------|--------|----------|
| `use-plugin-components.ts` | ~100 | 3-4h | P1 |
| `use-plugin-ipc.ts` (verify) | ~180 | 2-3h | P1 |
| `use-swipe-gesture.ts` | 138 | 4-5h | P1 |
| `use-plugin-modes.ts` | 59 | 2-3h | P1 |

**Total**: 11-15 hours

**Deliverables**:
- Plugin system hook tests
- Gesture detection tests
- Verified IPC communication tests
- Plugin mode integration tests

**Success Criteria**:
- 85%+ coverage for plugin hooks
- Gesture detection working correctly
- IPC message handling validated
- Plugin registration tested

---

### Phase 3: Utility Hooks (Week 3)

**Goal**: Address P2 gaps

| Hook | Lines | Effort | Priority |
|------|-------|--------|----------|
| `use-media-query.ts` | 34 | 1-2h | P2 |
| `use-plugin-tools.ts` | ~80 | 2-3h | P2 |
| `use-device.ts` | 78 | 2-3h | P2 |
| `use-enhanced-rag.ts` | 0 | TBD | P2 |

**Total**: 5-8+ hours

**Deliverables**:
- Utility hook tests
- Decision on enhanced RAG hook

**Success Criteria**:
- All utility hooks have tests
- Enhanced RAG either implemented or removed

---

## Testing Best Practices for Hooks

### Test Structure

```typescript
// Recommended test structure for hooks
describe('useHookName', () => {
  // Setup
  const wrapper = ({ children }) => (
    <Providers>{children}</Providers>
  )

  describe('initial state', () => {
    it('should return default values', () => {
      const { result } = renderHook(() => useHookName(), { wrapper })
      expect(result.current.value).toBe(defaultValue)
    })
  })

  describe('actions', () => {
    it('should update state when action is called', () => {
      const { result } = renderHook(() => useHookName(), { wrapper })
      act(() => {
        result.current.action(newValue)
      })
      expect(result.current.value).toBe(newValue)
    })
  })

  describe('side effects', () => {
    it('should perform side effect', async () => {
      const { result } = renderHook(() => useHookName(), { wrapper })
      await waitFor(() => {
        expect(result.current.effect).toHaveBeenCalled()
      })
    })
  })

  describe('cleanup', () => {
    it('should clean up on unmount', () => {
      const { unmount } = renderHook(() => useHookName(), { wrapper })
      unmount()
      // Verify cleanup
    })
  })
})
```

### Common Testing Scenarios

#### 1. State Updates
```typescript
act(() => {
  result.current.setState(newState)
})
expect(result.current.state).toBe(newState)
```

#### 2. Async Operations
```typescript
await waitFor(() => {
  expect(result.current.data).toBeDefined()
})
```

#### 3. Event Handlers
```typescript
fireEvent.click(screen.getByRole('button'))
await waitFor(() => {
  expect(result.current.handled).toBe(true)
})
```

#### 4. Custom Hooks with Dependencies
```typescript
const wrapper = ({ children }) => (
  <StoreProvider store={mockStore}>{children}</StoreProvider>
)
```

### Mock Guidelines

- Mock external dependencies (APIs, stores)
- Mock React hooks only when necessary
- Use factories for test data
- Clean up mocks after each test

### Coverage Goals

| Type | Target |
|------|--------|
| Lines | 85%+ |
| Branches | 75%+ |
| Functions | 85%+ |
| Statements | 85%+ |

---

## File-by-File Status

### Complete Coverage (100%)

| Directory | Files | Status |
|-----------|-------|--------|
| `hooks/agent/` | 7/7 | ✅ |
| `hooks/ai/` | 7/7 | ✅ |
| `hooks/chat/` | 12/12 | ✅ |
| `hooks/context/` | 7/7 | ✅ |
| `hooks/canvas/` | 3/3 | ✅ |
| `hooks/native/` | 12/12 | ✅ |
| `hooks/mcp/` | 7/7 | ✅ |
| `hooks/designer/` | 7/7 | ✅ |
| `hooks/a2ui/` | 5/5 | ✅ |
| `hooks/academic/` | 2/2 | ✅ |
| `hooks/image-studio/` | 2/2 | ✅ |
| `hooks/input-completion/` | 1/1 | ✅ |
| `hooks/learning/` | 2/2 | ✅ |
| `hooks/media/` | 5/5 | ✅ |
| `hooks/network/` | 3/3 | ✅ |
| `hooks/ppt/` | 1/1 | ✅ |
| `hooks/sandbox/` | 6/6 | ✅ |
| `hooks/skills/` | 4/4 | ✅ |
| `hooks/skill-seekers/` | 1/1 | ✅ |
| `hooks/video-studio/` | 3/3 | ✅ |

### Needs Attention

| Directory | Coverage | Missing | Priority |
|-----------|----------|---------|----------|
| `hooks/settings/` | 0% | 1 file | P0 |
| `hooks/search/` | 0% | 1 file | P0 |
| `hooks/plugin/` | 50% | 3 files | P1-P2 |
| `hooks/ui/` | 93% | 1 file | P2 |
| `hooks/utils/` | 67% | 2 files | P2 |
| `hooks/rag/` | 83% | 1 empty | TBD |

---

## Priority Matrix

| File | Lines | Complexity | Impact | Effort | Priority |
|------|-------|------------|--------|--------|----------|
| `use-rules-editor.ts` | 342 | Very High | Critical | 12-16h | P0 |
| `use-source-verification.ts` | 258 | High | High | 10-12h | P0 |
| `use-plugin-components.ts` | ~100 | Medium | Medium | 3-4h | P1 |
| `use-plugin-ipc.ts` | ~180 | Medium | Medium | 2-3h | P1 |
| `use-swipe-gesture.ts` | 138 | Medium | Medium | 4-5h | P1 |
| `use-plugin-modes.ts` | 59 | Low | Low-Medium | 2-3h | P1 |
| `use-media-query.ts` | 34 | Low | Low | 1-2h | P2 |
| `use-plugin-tools.ts` | ~80 | Low | Low | 2-3h | P2 |
| `use-device.ts` | 78 | Low | Low | 2-3h | P2 |
| `use-enhanced-rag.ts` | 0 | N/A | Unknown | TBD | P2 |

---

## Progress Tracking

### Current Status

- [x] Analysis Complete
- [ ] Phase 1: Critical Core (0/2 hooks)
- [ ] Phase 2: Feature Hooks (0/4 hooks)
- [ ] Phase 3: Utility Hooks (0/3-4 hooks)

### Coverage Target

| Phase | Target | Current | Gap |
|-------|--------|---------|-----|
| Start | 85.9% | 85.9% | - |
| Phase 1 Complete | 90% | TBD | - |
| Phase 2 Complete | 93% | TBD | - |
| Phase 3 Complete | 95%+ | TBD | - |

---

## Resources

### Related Documentation

- [hooks/test-coverage-report.md](../hooks/test-coverage-report.md) - Detailed coverage report
- [hooks/CLAUDE.md](../hooks/CLAUDE.md) - Hooks module documentation
- [jest.config.ts](../jest.config.ts) - Jest configuration

### Testing Libraries Used

- `@testing-library/react` - React testing utilities
- `@testing-library/react-hooks` - Custom hook testing (for older React versions)
- `@testing-library/user-event` - User interaction simulation
- `jest` - Test framework
- `@testing-library/jest-dom` - Custom Jest matchers

### Commands

```bash
# Run all tests
pnpm test

# Run tests for specific directory
pnpm test hooks/settings

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test hooks/settings/use-rules-editor.test.ts

# Watch mode
pnpm test:watch

# Run only hook tests
pnpm test -- hooks/
```

---

## Hook-Specific Considerations

### Testing Hooks with External Dependencies

```typescript
// Mocking Zustand stores
jest.mock('@/stores/chat-store', () => ({
  useChatStore: jest.fn(),
}))

// Mocking Tauri APIs
jest.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: jest.fn(),
}))
```

### Testing Async Hooks

```typescript
// Using waitFor for async operations
await waitFor(() => {
  expect(result.current.loading).toBe(false)
  expect(result.current.data).toBeDefined()
})
```

### Testing Hooks with Side Effects

```typescript
// Testing cleanup
const { unmount } = renderHook(() => useHookWithEffect())
const cleanup = jest.fn()
// ... trigger cleanup
unmount()
expect(cleanup).toHaveBeenCalled()
```

---

## Appendix: Detailed Test Checklists

### use-rules-editor Test Checklist

- [ ] Initial state
- [ ] Add rule
- [ ] Update rule
- [ ] Delete rule
- [ ] Reorder rules
- [ ] Validate rules
- [ ] Undo last action
- [ ] Redo action
- [ ] Undo multiple times
- [ ] Redo multiple times
- [ ] Clear history
- [ ] Import rules from file
- [ ] Export rules to file
- [ ] Validate import format
- [ ] Apply template
- [ ] Create custom template
- [ ] AI optimization trigger
- [ ] Apply AI suggestion
- [ ] Keyboard shortcuts
- [ ] Persistence to settings
- [ ] Load from settings

### use-source-verification Test Checklist

- [ ] Initial state
- [ ] Verify single source
- [ ] Verify multiple sources
- [ ] Cache verification results
- [ ] Filter trusted domains
- [ ] Filter blocked domains
- [ ] Wildcard domain patterns
- [ ] Add trusted domain
- [ ] Remove trusted domain
- [ ] Add blocked domain
- [ ] Remove blocked domain
- [ ] Cross-source validation
- [ ] Fact-checking integration
- [ ] Calculate credibility score
- [ ] Custom scoring rules
- [ ] Score thresholds
- [ ] Load settings
- [ ] Update settings
- [ ] Default configuration
- [ ] Persistence

---

**Document Version**: 1.0
**Last Updated**: January 25, 2026
**Next Review**: After Phase 1 completion
**Overall Project Coverage Goal**: 90%+ across all directories
