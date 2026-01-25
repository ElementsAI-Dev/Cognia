# Stores Test Coverage Completion Plan

**Generated**: January 25, 2026
**Status**: Active
**Priority**: High

## Executive Summary

This document provides a comprehensive analysis of test coverage for the Zustand stores in the Cognia application and outlines a detailed plan to achieve 100% test coverage across all store modules.

**Current Status**:
- **Total Store Files**: 67 store files across 28 directories
- **Files with Tests**: 61 test files
- **Files Missing Tests**: 6 store files
- **Coverage Estimate**: ~91% of store files have tests

---

## Test Coverage Analysis by Directory

### ✅ Fully Covered Directories (100%)

The following directories have complete test coverage for all store files:

| Directory | Store Files | Test Files | Status |
|-----------|-------------|------------|--------|
| `a2ui/` | 1 | 1 | ✅ Complete |
| `academic/` | 2 | 2 | ✅ Complete |
| `agent/` | 4 | 4 | ✅ Complete |
| `artifact/` | 1 | 1 | ✅ Complete |
| `chat/` | 5 | 5 | ✅ Complete |
| `context/` | 3 | 3 | ✅ Complete |
| `data/` | 2 | 2 | ✅ Complete |
| `designer/` | 2 | 2 | ✅ Complete |
| `document/` | 1 | 1 | ✅ Complete |
| `git/` | 1 | 1 | ✅ Complete |
| `input-completion/` | 1 | 1 | ✅ Complete |
| `learning/` | 2 | 2 | ✅ Complete |
| `mcp/` | 2 | 2 | ✅ Complete |
| `media/` | 4 | 4 | ✅ Complete |
| `plugin/` | 1 | 1 | ✅ Complete |
| `project/` | 2 | 2 | ✅ Complete |
| `sandbox/` | 1 | 1 | ✅ Complete |
| `screenshot/` | 1 | 1 | ✅ Complete |
| `settings/` | 4 | 4 | ✅ Complete |
| `skills/` | 1 | 1 | ✅ Complete |
| `skill-seekers/` | 1 | 1 | ✅ Complete |
| `system/` | 8 | 8 | ✅ Complete |
| `tool-history/` | 1 | 1 | ✅ Complete |
| `tools/` | 3 | 3 | ✅ Complete |

**Total Fully Covered**: 23 directories, 55 store files with 55 test files

---

## ❌ Missing Tests - Detailed Analysis

### 1. `prompt/prompt-marketplace-store.ts` ❌

**File**: `stores/prompt/prompt-marketplace-store.ts`
**Status**: **NO TEST FILE**
**Priority**: **MEDIUM**

**Store Purpose**: Manages prompt templates marketplace functionality
- Browse and search community prompts
- Import/export prompt templates
- Rating and review system
- Prompt sharing and publishing

**Required Test Coverage**:
```typescript
// Test cases needed:
describe('PromptMarketplaceStore', () => {
  // State management
  - initial state structure
  - prompts array management
  - filters (category, rating, tags)
  - search query handling

  // Actions
  - fetchPrompts() - API integration
  - importPrompt() - template import
  - exportPrompt() - template export
  - ratePrompt() - rating system
  - publishPrompt() - publishing workflow
  - unpublishPrompt() - unpublishing workflow

  // Selectors
  - getFilteredPrompts()
  - getPromptById()
  - getPromptsByCategory()

  // Persistence
  - localStorage integration
  - favorites persistence
  - recently viewed persistence
})
```

**Estimated Test Cases**: 25-30
**Estimated Lines**: 400-500
**Dependencies**: API mocking for marketplace endpoints

---

### 2. `workflow/workflow-editor-store.ts` ⚠️

**File**: `stores/workflow/workflow-editor-store.ts`
**Status**: **HAS TEST (verify completeness)**
**Priority**: **HIGH - VERIFY**

**Current Test**: `stores/workflow/workflow-editor-store.test.ts` exists

**Verification Needed**:
```typescript
// Ensure tests cover:
- Workflow node management (add, remove, update)
- Edge/connection management
- Node positioning and layout
- Undo/redo history
- Workflow validation
- Node configuration panel state
- Mini-map state
- Zoom and pan state
- Selection state
- Clipboard operations (copy, paste, cut)
```

**Action Items**:
1. Review existing test file
2. Verify coverage of all editor features
3. Add missing test cases if needed
4. Test React Flow integration

---

### 3. `workflow/workflow-store.ts` ⚠️

**File**: `stores/workflow/workflow-store.ts`
**Status**: **HAS TEST (verify completeness)**
**Priority**: **HIGH - VERIFY**

**Current Test**: `stores/workflow/workflow-store.test.ts` exists

**Verification Needed**:
```typescript
// Ensure tests cover:
- Workflow CRUD operations
- Workflow execution state
- Workflow template management
- Workflow sharing/collaboration
- Workflow versioning
- Workflow scheduling
- Workflow triggers
- Workflow logs/history
- Error handling and recovery
```

**Action Items**:
1. Review existing test file
2. Verify coverage of workflow lifecycle
3. Test execution engine integration
4. Add missing edge case tests

---

### 4. `workflow/template-market-store.ts` ❌

**File**: `stores/workflow/template-market-store.ts`
**Status**: **NO TEST FILE**
**Priority**: **MEDIUM**

**Store Purpose**: Manages workflow template marketplace
- Browse workflow templates
- Template categories and tags
- Template rating and reviews
- Template import/export
- Template publishing

**Required Test Coverage**:
```typescript
describe('TemplateMarketStore', () => {
  // State management
  - templates array
  - categories and tags
  - search and filters
  - loading states

  // Actions
  - fetchTemplates() - API integration
  - importTemplate() - import workflow
  - publishTemplate() - publish to market
  - rateTemplate() - rating system
  - reportTemplate() - content moderation

  // Selectors
  - getTemplatesByCategory()
  - getTemplateById()
  - getPopularTemplates()

  // Persistence
  - favorite templates
  - recently viewed
  - my templates
})
```

**Estimated Test Cases**: 20-25
**Estimated Lines**: 300-400
**Dependencies**: Workflow types, API mocking

---

### 5. `system/window-store.ts` ⚠️

**File**: `stores/system/window-store.ts`
**Status**: **HAS TEST (verify completeness)**
**Priority**: **HIGH - VERIFY**

**Current Test**: `stores/system/window-store.test.ts` exists

**Verification Needed**:
```typescript
// Ensure tests cover:
- Window state management (position, size)
- Multi-window coordination
- Window z-order
- Window minimization/maximization
- Window closing state
- Desktop-specific features (Tauri integration)
- Window persistence
- Window focus management
```

**Action Items**:
1. Review existing test file
2. Verify Tauri window manager integration
3. Test multi-window scenarios
4. Test desktop-only features

---

### 6. `system/virtual-env-store.ts` ⚠️

**File**: `stores/system/virtual-env-store.ts`
**Status**: **HAS TEST (verify completeness)**
**Priority**: **MEDIUM - VERIFY**

**Current Test**: `stores/system/virtual-env-store.test.ts` exists

**Verification Needed**:
```typescript
// Ensure tests cover:
- Virtual environment configuration
- Environment variable management
- Path management
- Environment activation/deactivation
- Environment isolation
- Package manager integration
- Environment templates
```

**Action Items**:
1. Review existing test file
2. Verify environment isolation tests
3. Test platform-specific behavior
4. Verify persistence

---

## Implementation Plan

### Phase 1: Missing Test Files (Week 1)

**Priority**: HIGH

#### Day 1-2: `prompt-marketplace-store.test.ts`

**Tasks**:
1. Create test file structure
2. Mock API endpoints
3. Implement state tests
4. Implement action tests
5. Implement selector tests
6. Test persistence
7. Test error scenarios

**Acceptance Criteria**:
- [ ] All CRUD operations tested
- [ ] API integration mocked and tested
- [ ] Search and filter logic tested
- [ ] Persistence layer tested
- [ ] Error handling tested
- [ ] Edge cases covered

**Dependencies**:
- Prompt marketplace API types
- Prompt template types
- Mock service layer

---

#### Day 3-4: `template-market-store.test.ts`

**Tasks**:
1. Create test file structure
2. Mock workflow template API
3. Implement state tests
4. Implement action tests
5. Implement selector tests
6. Test template import/export
7. Test rating system

**Acceptance Criteria**:
- [ ] Template browsing tested
- [ ] Category filtering tested
- [ ] Import/export functionality tested
- [ ] Rating system tested
- [ ] Publishing workflow tested
- [ ] Persistence tested

**Dependencies**:
- Workflow template types
- Workflow store integration
- Mock template service

---

### Phase 2: Verify Existing Tests (Week 2)

**Priority**: HIGH

#### Day 1-2: Workflow Store Verification

**Tasks**:
1. Review `workflow-store.test.ts`
2. Identify missing test cases
3. Add workflow execution tests
4. Add workflow versioning tests
5. Add collaboration feature tests
6. Test error recovery scenarios
7. Update documentation

**Acceptance Criteria**:
- [ ] 100% action coverage
- [ ] Edge cases tested
- [ ] Error scenarios covered
- [ ] Integration with workflow editor tested
- [ ] Documentation updated

---

#### Day 3-4: Workflow Editor Store Verification

**Tasks**:
1. Review `workflow-editor-store.test.ts`
2. Test React Flow integration
3. Test node management operations
4. Test edge management operations
5. Test undo/redo functionality
6. Test validation logic
7. Test clipboard operations

**Acceptance Criteria**:
- [ ] All node operations tested
- [ ] Edge operations tested
- [ ] History management tested
- [ ] Validation logic tested
- [ ] Performance tests added for large workflows

---

#### Day 5: System Store Verification

**Tasks**:
1. Review `window-store.test.ts`
2. Review `virtual-env-store.test.ts`
3. Add multi-window tests
4. Add Tauri integration tests
5. Test platform-specific behavior
6. Test environment isolation

**Acceptance Criteria**:
- [ ] Multi-window scenarios tested
- [ ] Desktop features tested
- [ ] Platform differences tested
- [ ] Environment isolation verified

---

### Phase 3: Coverage Analysis & Improvements (Week 3)

**Priority**: MEDIUM

#### Tasks:

1. **Run Coverage Analysis**
   ```bash
   pnpm test:coverage -- stores
   ```

2. **Identify Gaps**
   - Review coverage reports
   - Identify untested code paths
   - Analyze branch coverage

3. **Add Missing Tests**
   - Fill coverage gaps
   - Add edge case tests
   - Add integration tests

4. **Performance Testing**
   - Test store performance with large datasets
   - Test selector performance
   - Test persistence performance

5. **Documentation**
   - Document testing patterns
   - Create testing guidelines
   - Update store documentation

---

## Testing Guidelines

### Standard Store Test Structure

```typescript
// stores/{category}/{store-name}.test.ts

import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from './{store-name}';

describe('{StoreName}', () => {
  beforeEach(() => {
    // Reset store state before each test
    useStore.setState(useStore.getInitialState());
  });

  describe('State', () => {
    it('should have correct initial state', () => {
      const state = useStore.getState();
      expect(state).toMatchObject({
        // expected initial state
      });
    });
  });

  describe('Actions', () => {
    it('should perform action correctly', () => {
      const { actionName } = useStore.getState();

      act(() => {
        useStore.getState().actionName(/* params */);
      });

      const state = useStore.getState();
      expect(state).toMatchObject({
        // expected state after action
      });
    });
  });

  describe('Selectors', () => {
    it('should return correct selector value', () => {
      const result = useStore.getState().selectorName();
      expect(result).toBe(/* expected value */);
    });
  });

  describe('Persistence', () => {
    it('should persist state to localStorage', () => {
      // Test persistence
    });

    it('should hydrate from localStorage', () => {
      // Test hydration
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined values', () => {
      // Test edge cases
    });

    it('should handle empty collections', () => {
      // Test empty state
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', () => {
      // Test error scenarios
    });
  });
});
```

### Test Naming Conventions

- **File**: `{store-name}.test.ts`
- **Describe Block**: `{StoreName}` (PascalCase)
- **Test Description**: `should {expected behavior}` (lowercase)
- **Actions**: Test actions as user-facing behaviors
- **Selectors**: Test selectors as computed values

### Mock Patterns

```typescript
// Mocking API calls
vi.mock('@/lib/api/{service}', () => ({
  {serviceName}: {
    methodName: vi.fn(),
  },
}));

// Mocking localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;
```

---

## Success Criteria

### Coverage Targets

- **Statement Coverage**: ≥ 90%
- **Branch Coverage**: ≥ 85%
- **Function Coverage**: ≥ 95%
- **Line Coverage**: ≥ 90%

### Quality Gates

- [ ] All new tests pass
- [ ] No test warnings or errors
- [ ] Coverage targets met
- [ ] No flaky tests
- [ ] Tests run in < 5 seconds total
- [ ] Documentation updated

### Documentation Requirements

- [ ] Each test file has header documentation
- [ ] Complex logic has inline comments
- [ ] Edge cases documented
- [ ] Mock behavior documented
- [ ] Integration points documented

---

## Risk Assessment

### High Risk Areas

1. **Workflow Execution**
   - Complex async operations
   - External dependencies
   - State synchronization

2. **Multi-Window Management**
   - Tauri integration
   - Cross-window communication
   - State consistency

3. **Environment Management**
   - Platform-specific behavior
   - File system operations
   - Process management

### Mitigation Strategies

1. **Comprehensive Mocking**
   - Mock all external dependencies
   - Use deterministic test data
   - Isolate test scenarios

2. **Integration Tests**
   - Test store interactions
   - Test with realistic data
   - Test error paths

3. **Regression Testing**
   - Run full test suite before changes
   - Add tests for bug fixes
   - Monitor test stability

---

## Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Missing Tests | Week 1 | 2 new test files |
| Phase 2: Verify Existing | Week 2 | 5 store tests verified and enhanced |
| Phase 3: Coverage & Docs | Week 3 | Coverage report, documentation, guidelines |

**Total Duration**: 3 weeks
**Total New Test Files**: 2
**Total Verified Test Files**: 5
**Expected Coverage Improvement**: +5-10%

---

## Maintenance

### Regular Tasks

- **Weekly**: Review test failures and flaky tests
- **Bi-weekly**: Update tests for new features
- **Monthly**: Coverage analysis and improvement
- **Quarterly**: Test suite refactoring and optimization

### Continuous Improvement

- Add tests for every new store
- Update tests when store logic changes
- Refactor tests for clarity and maintainability
- Share testing patterns across team

---

## Appendix: Store Inventory

### Complete Store File List (67 files)

**a2ui/** (1 file)
- ✅ a2ui-store.ts

**academic/** (2 files)
- ✅ academic-store.ts
- ✅ knowledge-map-store.ts

**agent/** (4 files)
- ✅ agent-store.ts
- ✅ background-agent-store.ts
- ✅ custom-mode-store.ts
- ✅ sub-agent-store.ts

**artifact/** (1 file)
- ✅ artifact-store.ts

**chat/** (5 files)
- ✅ chat-store.ts
- ✅ chat-widget-store.ts
- ✅ quote-store.ts
- ✅ session-store.ts
- ✅ summary-store.ts

**context/** (3 files)
- ✅ clipboard-context-store.ts
- ✅ context-store.ts
- ✅ selection-store.ts

**data/** (2 files)
- ✅ memory-store.ts
- ✅ vector-store.ts

**designer/** (2 files)
- ✅ designer-store.ts
- ✅ designer-history-store.ts

**document/** (1 file)
- ✅ document-store.ts

**git/** (1 file)
- ✅ git-store.ts

**input-completion/** (1 file)
- ✅ input-completion-store.ts

**learning/** (2 files)
- ✅ learning-store.ts
- ✅ speedpass-store.ts

**mcp/** (2 files)
- ✅ mcp-store.ts
- ✅ mcp-marketplace-store.ts

**media/** (4 files)
- ✅ image-studio-store.ts
- ✅ media-store.ts
- ✅ screen-recording-store.ts
- ✅ screenshot-store.ts

**plugin/** (1 file)
- ✅ plugin-store.ts

**project/** (2 files)
- ✅ project-store.ts
- ✅ project-activity-store.ts
- ⚠️ project-activity-subscriber.ts (non-store, utility file)

**prompt/** (2 files)
- ❌ **prompt-marketplace-store.ts** - MISSING TEST
- ✅ prompt-template-store.ts

**sandbox/** (1 file)
- ✅ sandbox-store.ts

**screenshot/** (1 file)
- ✅ editor-store.ts

**settings/** (4 files)
- ✅ custom-theme-store.ts
- ✅ preset-store.ts
- ✅ settings-profiles-store.ts
- ✅ settings-store.ts

**skills/** (1 file)
- ✅ skill-store.ts

**skill-seekers/** (1 file)
- ✅ skill-seekers-store.ts

**system/** (8 files)
- ✅ environment-store.ts
- ✅ native-store.ts
- ✅ proxy-store.ts
- ✅ recent-files-store.ts
- ✅ ui-store.ts
- ✅ usage-store.ts
- ✅ virtual-env-store.ts
- ✅ window-store.ts

**tool-history/** (1 file)
- ✅ tool-history-store.ts

**tools/** (3 files)
- ✅ jupyter-store.ts
- ✅ ppt-editor-store.ts
- ✅ template-store.ts

**workflow/** (3 files)
- ❌ **template-market-store.ts** - MISSING TEST
- ⚠️ workflow-editor-store.ts - HAS TEST (VERIFY)
- ⚠️ workflow-store.ts - HAS TEST (VERIFY)

---

## Next Steps

1. **Immediate (This Week)**
   - Create `prompt-marketplace-store.test.ts`
   - Create `template-market-store.test.ts`
   - Set up test infrastructure for marketplace features

2. **Short-term (Next 2 Weeks)**
   - Verify all existing test files
   - Fill identified gaps
   - Run full coverage analysis

3. **Long-term (Ongoing)**
   - Maintain test suite
   - Update documentation
   - Share testing best practices

---

**Document Version**: 1.0
**Last Updated**: January 25, 2026
**Maintained By**: Cognia Development Team
