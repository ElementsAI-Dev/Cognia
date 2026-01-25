# Components Test Coverage Analysis

**Date:** January 25, 2026
**Analysis Scope:** All components in `D:\Project\Cognia\components` (excluding `ai-elements` and `ui` directories)
**Total Component Files Analyzed:** 631 components across 120 directories

---

## Executive Summary

### Overall Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Component Files** | 631 | 100% |
| **Components with Tests** | 538 | 85.3% |
| **Components Missing Tests** | 93 | 14.7% |
| **Total Directories** | 120 | - |
| **Directories with 100% Coverage** | 85 | 70.8% |
| **Directories with Partial Coverage** | 28 | 23.3% |
| **Directories with No Coverage** | 7 | 5.8% |

### Coverage by Priority

| Priority Level | Directories Affected | Missing Tests | Coverage |
|----------------|---------------------|---------------|----------|
| **High** | 1 | 3 | 77-100% |
| **Medium** | 37 | 81 | 0-100% |
| **Low** | 2 | 9 | 53-100% |

### Key Findings

1. **Excellent Coverage:** Core chat, agent, canvas, and artifacts systems have near-complete test coverage (100%)
2. **Critical Gaps:**
   - Settings environment management: 8 components untested (0%)
   - Workflow editor panels: 6 components untested (14% coverage)
   - Plugin marketplace: 12 components untested (0%)
   - Rules editor: 9 components untested (0%)
3. **Medium Priority Areas:** Plugin system, video studio, and workflow editor utilities need attention
4. **Low Priority Gaps:** Layout components, while important, have decent coverage (53%)

---

## Detailed Breakdown by Directory

### High Priority Components (Core Functionality)

#### agent (77% coverage - 3 missing)

| Component | File | Status |
|-----------|------|--------|
| a2ui-template-preview | `agent\a2ui-template-preview.tsx` | Missing Test |
| sub-agent-node | `agent\sub-agent-node.tsx` | Missing Test |
| sub-agent-template-selector | `agent\sub-agent-template-selector.tsx` | Missing Test |

**Impact:** High - These components handle sub-agent orchestration and template management

#### chat\chat-input (83% coverage - 1 missing)

| Component | File | Status |
|-----------|------|--------|
| utils | `chat\chat-input\utils.tsx` | Missing Test |

**Impact:** High - Utility functions for chat input processing

#### designer\core (75% coverage - 1 missing)

| Component | File | Status |
|-----------|------|--------|
| v0-designer | `designer\core\v0-designer.tsx` | Missing Test |

**Impact:** High - Core V0-style designer component

---

### Medium Priority Components (Feature Components)

#### plugin\core (50% coverage - 3 missing)

| Component | File | Status |
|-----------|------|--------|
| plugin-empty-state | `plugin\core\plugin-empty-state.tsx` | Missing Test |
| plugin-grouped-list | `plugin\core\plugin-grouped-list.tsx` | Missing Test |
| plugin-quick-actions | `plugin\core\plugin-quick-actions.tsx` | Missing Test |

#### plugin\marketplace (0% coverage - 2 missing)

| Component | File | Status |
|-----------|------|--------|
| plugin-detail-modal | `plugin\marketplace\plugin-detail-modal.tsx` | Missing Test |
| plugin-marketplace | `plugin\marketplace\plugin-marketplace.tsx` | Missing Test |

#### plugin\marketplace\components (0% coverage - 10 missing)

| Component | File | Status |
|-----------|------|--------|
| collection-card | `plugin\marketplace\components\collection-card.tsx` | Missing Test |
| featured-plugin-card | `plugin\marketplace\components\featured-plugin-card.tsx` | Missing Test |
| marketplace-constants | `plugin\marketplace\components\marketplace-constants.ts` | Missing Test |
| marketplace-empty-state | `plugin\marketplace\components\marketplace-empty-state.tsx` | Missing Test |
| marketplace-loading-skeleton | `plugin\marketplace\components\marketplace-loading-skeleton.tsx` | Missing Test |
| marketplace-stats-bar | `plugin\marketplace\components\marketplace-stats-bar.tsx` | Missing Test |
| marketplace-types | `plugin\marketplace\components\marketplace-types.ts` | Missing Test |
| plugin-grid-card | `plugin\marketplace\components\plugin-grid-card.tsx` | Missing Test |
| plugin-list-item | `plugin\marketplace\components\plugin-list-item.tsx` | Missing Test |
| trending-plugin-item | `plugin\marketplace\components\trending-plugin-item.tsx` | Missing Test |

**Impact:** Medium-High - Plugin marketplace functionality completely untested

#### settings\environment (0% coverage - 8 missing)

| Component | File | Status |
|-----------|------|--------|
| clone-dialog | `settings\environment\clone-dialog.tsx` | Missing Test |
| create-env-dialog | `settings\environment\create-env-dialog.tsx` | Missing Test |
| env-card | `settings\environment\env-card.tsx` | Missing Test |
| env-var-row | `settings\environment\env-var-row.tsx` | Missing Test |
| packages-dialog | `settings\environment\packages-dialog.tsx` | Missing Test |
| project-config-card | `settings\environment\project-config-card.tsx` | Missing Test |
| requirements-dialog | `settings\environment\requirements-dialog.tsx` | Missing Test |
| tool-card | `settings\environment\tool-card.tsx` | Missing Test |

**Impact:** High - Virtual environment management completely untested

#### settings\mcp\components (0% coverage - 7 missing)

| Component | File | Status |
|-----------|------|--------|
| env-variables-form | `settings\mcp\components\env-variables-form.tsx` | Missing Test |
| installation-preview | `settings\mcp\components\installation-preview.tsx` | Missing Test |
| marketplace-card | `settings\mcp\components\marketplace-card.tsx` | Missing Test |
| marketplace-card-skeleton | `settings\mcp\components\marketplace-card-skeleton.tsx` | Missing Test |
| server-card | `settings\mcp\components\server-card.tsx` | Missing Test |
| server-card-skeleton | `settings\mcp\components\server-card-skeleton.tsx` | Missing Test |
| server-status-icon | `settings\mcp\components\server-status-icon.tsx` | Missing Test |

**Impact:** High - MCP server configuration components untested

#### settings\rules (0% coverage - 2 missing)

| Component | File | Status |
|-----------|------|--------|
| constants | `settings\rules\constants.tsx` | Missing Test |
| rules-editor | `settings\rules\rules-editor.tsx` | Missing Test |

#### settings\rules\components (0% coverage - 7 missing)

| Component | File | Status |
|-----------|------|--------|
| rules-editor-content | `settings\rules\components\rules-editor-content.tsx` | Missing Test |
| rules-editor-footer | `settings\rules\components\rules-editor-footer.tsx` | Missing Test |
| rules-editor-header | `settings\rules\components\rules-editor-header.tsx` | Missing Test |
| rules-editor-mobile-toolbar | `settings\rules\components\rules-editor-mobile-toolbar.tsx` | Missing Test |
| rules-editor-preview | `settings\rules\components\rules-editor-preview.tsx` | Missing Test |
| rules-editor-tabs | `settings\rules\components\rules-editor-tabs.tsx` | Missing Test |
| rules-editor-toolbar | `settings\rules\components\rules-editor-toolbar.tsx` | Missing Test |

**Impact:** Medium - Custom rules editor completely untested

#### settings\shared (0% coverage - 2 missing)

| Component | File | Status |
|-----------|------|--------|
| math-preview | `settings\shared\math-preview.tsx` | Missing Test |
| setting-tooltip | `settings\shared\setting-tooltip.tsx` | Missing Test |

#### workflow\editor\panels (14% coverage - 6 missing)

| Component | File | Status |
|-----------|------|--------|
| keyboard-shortcuts-panel | `workflow\editor\panels\keyboard-shortcuts-panel.tsx` | Missing Test |
| node-config-panel | `workflow\editor\panels\node-config-panel.tsx` | Missing Test |
| variable-manager-panel | `workflow\editor\panels\variable-manager-panel.tsx` | Missing Test |
| version-history-panel | `workflow\editor\panels\version-history-panel.tsx` | Missing Test |
| workflow-settings-panel | `workflow\editor\panels\workflow-settings-panel.tsx` | Missing Test |
| workflow-trigger-panel | `workflow\editor\panels\workflow-trigger-panel.tsx` | Missing Test |

**Impact:** High - Workflow editor configuration panels untested

#### workflow\editor\core (50% coverage - 2 missing)

| Component | File | Status |
|-----------|------|--------|
| node-template-manager | `workflow\editor\core\node-template-manager.tsx` | Missing Test |
| workflow-editor-panel | `workflow\editor\core\workflow-editor-panel.tsx` | Missing Test |

#### workflow\editor\utils (0% coverage - 3 missing)

| Component | File | Status |
|-----------|------|--------|
| node-preview-tooltip | `workflow\editor\utils\node-preview-tooltip.tsx` | Missing Test |
| node-quick-config | `workflow\editor\utils\node-quick-config.tsx` | Missing Test |
| node-template-manager | `workflow\editor\utils\node-template-manager.tsx` | Missing Test |

#### workflow\editor (0% coverage - 2 missing)

| Component | File | Status |
|-----------|------|--------|
| node-preview-tooltip | `workflow\editor\node-preview-tooltip.tsx` | Missing Test |
| node-quick-config | `workflow\editor\node-quick-config.tsx` | Missing Test |

#### video-studio Various Subdirectories (Partial Coverage)

| Directory | Coverage | Missing Tests |
|-----------|----------|---------------|
| video-studio\audio | 67% | video-waveform |
| video-studio\common | 80% | project-settings-panel |
| video-studio\generation | 50% | ai-generation-sidebar |
| video-studio\timeline | 80% | video-subtitle-track |

---

### Low Priority Components (UI/Decorative)

#### layout (53% coverage - 8 missing)

| Component | File | Status |
|-----------|------|--------|
| background-renderer | `layout\background-renderer.tsx` | Missing Test |
| debug-button | `layout\debug-button.tsx` | Missing Test |
| empty-state | `layout\empty-state.tsx` | Missing Test |
| mobile-bottom-nav | `layout\mobile-bottom-nav.tsx` | Missing Test |
| network-status-indicator | `layout\network-status-indicator.tsx` | Missing Test |
| resizable-panel | `layout\resizable-panel.tsx` | Missing Test |
| split-view | `layout\split-view.tsx` | Missing Test |
| title-bar-registry | `layout\title-bar-registry.ts` | Missing Test |

**Impact:** Low - Mostly layout and utility components

#### a2ui\display (83% coverage - 2 missing)

| Component | File | Status |
|-----------|------|--------|
| a2ui-animation | `a2ui\display\a2ui-animation.tsx` | Missing Test |
| a2ui-interactive-guide | `a2ui\display\a2ui-interactive-guide.tsx` | Missing Test |

**Impact:** Low - Display components for A2UI

---

## Prioritized Implementation Plan

### Phase 1: Critical Gaps (High Priority)

**Estimated Effort:** 2-3 weeks
**Components:** 23 tests

1. **Agent Sub-Components** (3 tests)
   - `agent\a2ui-template-preview.test.tsx`
   - `agent\sub-agent-node.test.tsx`
   - `agent\sub-agent-template-selector.test.tsx`

2. **Chat Input Utils** (1 test)
   - `chat\chat-input\utils.test.tsx`

3. **Designer Core** (1 test)
   - `designer\core\v0-designer.test.tsx`

4. **Settings Environment** (8 tests)
   - All `settings\environment\*.test.tsx` files

5. **Workflow Editor Panels** (6 tests)
   - All `workflow\editor\panels\*.test.tsx` files

6. **Workflow Core** (2 tests)
   - `workflow\editor\core\node-template-manager.test.tsx`
   - `workflow\editor\core\workflow-editor-panel.test.tsx`

7. **MCP Components** (7 tests)
   - All `settings\mcp\components\*.test.tsx` files

### Phase 2: Feature Components (Medium Priority)

**Estimated Effort:** 3-4 weeks
**Components:** 47 tests

1. **Plugin System** (15 tests)
   - Plugin core components (3 tests)
   - Plugin marketplace (12 tests)

2. **Rules Editor** (9 tests)
   - Rules editor main (2 tests)
   - Rules editor components (7 tests)

3. **Workflow Editor Utils** (3 tests)
   - `workflow\editor\utils\*.test.tsx`

4. **Settings Components** (11 tests)
   - Chat settings (2 tests)
   - Settings shared (2 tests)
   - Other settings gaps (7 tests)

5. **Video Studio** (4 tests)
   - Audio waveform, timeline, generation, common panels

6. **Prompt System** (2 tests)
   - Marketplace sidebar, optimization hub

### Phase 3: UI Components (Low Priority)

**Estimated Effort:** 1-2 weeks
**Components:** 23 tests

1. **Layout Components** (8 tests)
   - Missing layout utility components

2. **A2UI Display** (2 tests)
   - Animation and interactive guide

3. **Other Minor Gaps** (13 tests)
   - Scattered across various directories

---

## Testing Guidelines

### Test File Structure

```typescript
// Example: components/agent/sub-agent-node.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SubAgentNode } from './sub-agent-node';

describe('SubAgentNode', () => {
  it('should render', () => {
    // Test implementation
  });

  it('should handle sub-agent interactions', () => {
    // Test implementation
  });
});
```

### Coverage Requirements

- **Line Coverage:** 70% minimum
- **Branch Coverage:** 60% minimum
- **Function Coverage:** 60% minimum

### Testing Best Practices

1. Test user interactions and state changes
2. Mock external dependencies (stores, APIs)
3. Test error states and edge cases
4. Use descriptive test names
5. Follow Arrange-Act-Assert pattern

---

## Directory Coverage Summary

### 100% Coverage (85 directories)

All components in these directories have complete test coverage:
- academic, artifacts, canvas, chat-widget
- chat/core, chat/dialogs, chat/flow, chat/goal
- chat/message, chat/message-parts, chat/popovers
- chat/renderers, chat/selectors, chat/utils
- chat/welcome, chat/workflow
- designer/* (all subdirectories except core/v0-designer)
- document, export, git, image-studio
- input-completion, jupyter, learning, mcp
- native, observability, onboarding
- plugin/dev, plugin/extension, plugin/monitoring, plugin/schema
- presets, projects, prompt/templates
- providers/core, providers/media, providers/native, providers/network
- sandbox, screen-recording, screenshot
- settings/agent, settings/common, settings/data
- settings/mcp (main), settings/provider
- settings/shortcuts, settings/system, settings/tools, settings/vector
- sidebar/widgets, skills, speedpass
- video-studio/* (most subdirectories)
- workflow/editor/edges, workflow/editor/nodes
- workflow/marketplace

### Partial Coverage (28 directories)

See detailed breakdown above for specific missing components.

### No Coverage (7 directories)

- plugin\marketplace (2 components)
- plugin\marketplace\components (10 components)
- settings\environment (8 components)
- settings\mcp\components (7 components)
- settings\rules (2 components)
- settings\rules\components (7 components)
- settings\shared (2 components)
- workflow\editor (2 components)
- workflow\editor\utils (3 components)

---

## Recommendations

1. **Prioritize High-Impact Areas:** Focus on settings environment, MCP components, and workflow panels first
2. **Leverage Existing Patterns:** Use existing test files as templates for consistency
3. **Automated Testing:** Set up CI/CD to run tests on every PR
4. **Coverage Monitoring:** Track coverage trends over time
5. **Documentation:** Update component documentation alongside tests

---

## Appendix: Raw Data

The complete raw investigation data is saved in:
`D:\Project\Cognia\docs\plan\components-test-investigation.json`

This JSON file contains:
- All 120 component directories
- Component counts per directory
- Test coverage percentages
- Detailed lists of missing tests per directory

---

**Report Generated:** January 25, 2026
**Next Review:** After Phase 1 completion
**Maintainer:** Cognia Development Team
