# Enhanced Components Integration Plan

## Document Information

- **Project**: Cognia AI Chat Application
- **Module**: Enhanced Components & Skills/MCP Integration
- **Created**: 2025-01-26
- **Status**: Planning
- **Priority**: High

---

## Executive Summary

Cognia contains several "Enhanced" components and hooks that exist separately from the core system. This plan outlines how to integrate these enhanced features into the main component architecture while fully leveraging the Skills and MCP (Model Context Protocol) systems for extensibility.

### Current State

The codebase has these "Enhanced" implementations:

1. **EnhancedTable** (`components/chat/renderers/enhanced-table.tsx`) - Interactive table with sorting, filtering, export
2. **useEnhancedImageEditor** (`hooks/image-studio/use-enhanced-image-editor.ts`) - WebGL/Worker-accelerated image editor
3. **EnhancedPreview** (`components/image-studio/enhanced-preview.tsx`) - Advanced image comparison component
4. **useEnhancedRAG** (`hooks/rag/use-enhanced-rag.ts`) - Empty stub (deleted)

### Key Issues

1. **Duplication**: Enhanced components duplicate functionality instead of extending base components
2. **Poor Integration**: Enhanced features are not integrated into the core component system
3. **Limited Extensibility**: Not using Skills or MCP for extending functionality
4. **Inconsistent Patterns**: Different naming and architectural patterns

---

## Architecture Overview

### Proposed Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Core Component System                        │
├─────────────────────────────────────────────────────────────────┤
│  Components Layer          │  Skills Layer     │  MCP Layer     │
│  ┌────────────────────┐    │  ┌──────────────┐ │ ┌─────────────┐ │
│  │ BaseTable          │    │  │ Table Skills │ │ │ Table MCP   │ │
│  │ ├─ Sortable        │◄───┼──┤ ├─ CSV Export│─┼─┤ ├─ Sheets   │ │
│  │ ├─ Filterable      │    │  │ ├─ Analytics │ │ │ └─ API      │ │
│  │ └─ Exportable      │    │  │ └─ Custom    │ │ │             │ │
│  └────────────────────┘    │  └──────────────┘ │ └─────────────┘ │
│                                                              │
│  ┌────────────────────┐    │  ┌──────────────┐ │ ┌─────────────┐ │
│  │ BaseImageEditor    │    │  │ Editor Skills│ │ │ Editor MCP  │ │
│  │ ├─ Adjustments     │◄───┼──┤ ├─ Filters   │─┼─┤ ├─ Cloud AI │ │
│  │ ├─ Filters         │    │  │ ├─ Presets   │ │ │ └─ Tools    │ │
│  │ └─ Transform       │    │  │ └─ Batch     │ │ │             │ │
│  └────────────────────┘    │  └──────────────┘ │ └─────────────┘ │
│                                                              │
│  ┌────────────────────┐    │  ┌──────────────┐ │ ┌─────────────┐ │
│  │ BasePreview        │    │  │ Preview Skills│ │ │ Preview MCP │ │
│  │ ├─ Comparison      │◄───┼──┤ ├─ Histogram │─┼─┤ └─ Analysis │ │
│  │ ├─ Histogram       │    │  │ └─ Overlays  │ │ │             │ │
│  │ └─ Zoom            │    │  │              │ │ │             │ │
│  └────────────────────┘    │  └──────────────┘ │ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Composition over Inheritance**: Base components provide core functionality, Skills add features
2. **Capability-Based**: Components declare capabilities, Skills provide implementations
3. **MCP-First**: External capabilities accessed via MCP servers
4. **Progressive Enhancement**: Base features work everywhere, enhanced features when available
5. **Type Safety**: Full TypeScript support for capabilities and Skill interfaces

---

## Detailed Integration Plan

### Phase 1: Base Component Refactoring (Priority: Critical)

#### 1.1 Create Capability System

**Files to Create**:
- `types/component/capabilities.ts` - Capability type definitions
- `lib/component/capability-registry.ts` - Capability registration and discovery

**Design**:
```typescript
// types/component/capabilities.ts
export type ComponentCapability =
  | 'sortable'
  | 'filterable'
  | 'exportable'
  | 'paginatable'
  | 'searchable'
  | 'comparable'
  | 'histogram'
  | 'batch-processable';

export interface ComponentCapabilities {
  id: string;
  name: string;
  capabilities: ComponentCapability[];
  extensions?: Record<string, unknown>;
}

export interface CapabilityProvider {
  capability: ComponentCapability;
  component: React.ComponentType;
  priority: number;
  dependencies?: ComponentCapability[];
}
```

#### 1.2 Refactor EnhancedTable to Capability-Based Table

**Files to Modify**:
- `components/chat/renderers/enhanced-table.tsx` → `components/chat/renderers/table.tsx`
- `components/chat/renderers/table-capabilities/` - New directory for capability modules

**New Structure**:
```
components/chat/renderers/table-capabilities/
├── sortable.tsx          # Sorting capability
├── filterable.tsx        # Search/filter capability
├── exportable.tsx        # Export capability (Excel, CSV, Sheets)
├── paginatable.tsx       # Pagination capability
└── index.ts              # Capability registry
```

**Migration Pattern**:
```typescript
// Before: EnhancedTable component with all features built-in
<EnhancedTable
  headers={headers}
  rows={rows}
  sortable
  searchable
  exportable
/>

// After: Base Table with capability components
<Table
  headers={headers}
  rows={rows}
  capabilities={
    <>
      <TableSortable />
      <TableFilterable />
      <TableExportable />
    </>
  }
/>
```

#### 1.3 Create Table Export Skill

**Files to Create**:
- `skills/table-export-skill/` - New Skill directory
  - `skill.json` - Skill metadata
  - `index.ts` - Skill implementation
  - `prompts.md` - AI prompts for export format suggestions

**Skill Definition**:
```json
{
  "name": "table-export",
  "displayName": "Table Export",
  "description": "Export tables to various formats with formatting",
  "version": "1.0.0",
  "category": "productivity",
  "capabilities": ["table-export"],
  "tools": [
    {
      "name": "export_to_excel",
      "description": "Export table to Excel with formatting"
    },
    {
      "name": "export_to_csv",
      "description": "Export table to CSV"
    },
    {
      "name": "export_to_google_sheets",
      "description": "Export directly to Google Sheets"
    }
  ]
}
```

---

### Phase 2: Image Studio Integration (Priority: High)

#### 2.1 Unify Image Editor Hooks

**Files to Modify**:
- `hooks/image-studio/use-image-editor.ts` - Base hook
- `hooks/image-studio/use-enhanced-image-editor.ts` → Merge into base

**Integration Strategy**:
```typescript
// hooks/image-studio/use-image-editor.ts
export interface UseImageEditorOptions {
  // Enable acceleration features
  enableWebWorker?: boolean;
  enableWebGL?: boolean;
  enableProgressiveLoading?: boolean;

  // Advanced adjustments (via Skills)
  enableAdvancedAdjustments?: boolean;

  // Performance monitoring
  onPerformanceMetric?: (metric: PerformanceMetric) => void;
}

export function useImageEditor(options: UseImageEditorOptions = {}) {
  const {
    enableWebWorker = true,
    enableWebGL = true,
    enableAdvancedAdjustments = false,
    ...baseOptions
  } = options;

  // Base editor functionality
  const baseEditor = useBaseImageEditor(baseOptions);

  // Conditional enhanced features
  const workerProcessor = useWorkerProcessor({ enabled: enableWebWorker });
  const glProcessor = useGLProcessor({ enabled: enableWebGL });

  // Advanced adjustments via Skills
  const advancedAdjustments = useAdvancedAdjustments({
    enabled: enableAdvancedAdjustments,
    skills: getActiveSkills('image-editor'),
  });

  return {
    ...baseEditor,
    ...(enableWebWorker && { workerFeatures: workerProcessor }),
    ...(enableWebGL && { webglFeatures: glProcessor }),
    ...(enableAdvancedAdjustments && { advanced: advancedAdjustments }),
  };
}
```

#### 2.2 Create Image Editor Skills

**Skills to Create**:

1. **Advanced Filters Skill** (`skills/advanced-filters-skill/`)
   - Levels adjustment
   - Curves adjustment
   - HSL adjustment
   - Noise reduction
   - Sharpening tools

2. **Batch Processing Skill** (`skills/batch-processor-skill/`)
   - Multi-image operations
   - Preset application
   - Batch export

3. **AI Enhancement Skill** (`skills/ai-enhancement-skill/`)
   - Auto-enhance
   - Object selection
   - Background removal (AI-powered)
   - Upscaling

**Skill Integration**:
```typescript
// skills/advanced-filters-skill/index.ts
export const advancedFiltersSkill: Skill = {
  id: 'advanced-filters',
  name: 'Advanced Filters',
  category: 'image-editing',
  capabilities: ['levels', 'curves', 'hsl', 'noise-reduction', 'sharpen'],

  tools: [
    {
      name: 'apply_levels',
      description: 'Adjust tonal levels (shadows, midtones, highlights)',
      input_schema: levelsInputSchema,
      execute: applyLevels,
    },
    // ... other tools
  ],

  // UI components for the image editor
  components: {
    panel: 'AdvancedFiltersPanel',
    controls: ['LevelsSlider', 'CurvesEditor', 'HSLWheel'],
  },
};
```

#### 2.3 Refactor EnhancedPreview

**Files to Modify**:
- `components/image-studio/enhanced-preview.tsx` → `components/image-studio/preview.tsx`
- `components/image-studio/preview-capabilities/` - New directory

**New Structure**:
```
components/image-studio/preview-capabilities/
├── comparison.tsx        # Before/after comparison
├── histogram.tsx         # Histogram overlay
├── zoom-pan.tsx          # Zoom and pan controls
├── split-view.tsx        # Split screen comparison
└── index.ts
```

---

### Phase 3: MCP Integration for Enhanced Features (Priority: High)

#### 3.1 Create Image Processing MCP Server Template

**Files to Create**:
- `src-tauri/mcp-templates/image-processing/` - MCP server template
  - `mcp-server.json` - Server configuration
  - `tools/` - Tool implementations

**MCP Server Definition**:
```json
{
  "name": "image-processing",
  "description": "Advanced image processing capabilities",
  "version": "1.0.0",
  "transport": "stdio",
  "tools": [
    {
      "name": "remove_background_ai",
      "description": "AI-powered background removal",
      "inputSchema": {
        "type": "object",
        "properties": {
          "image_path": { "type": "string" },
          "model": { "type": "string", "enum": ["rembg", "sam"] }
        }
      }
    },
    {
      "name": "enhance_image",
      "description": "AI image enhancement",
      "inputSchema": {
        "type": "object",
        "properties": {
          "image_path": { "type": "string" },
          "enhancement": { "type": "string", "enum": ["upscale", "denoise", "sharpen"] }
        }
      }
    }
  ]
}
```

#### 3.2 Create Table Operations MCP Server

**Files to Create**:
- `src-tauri/mcp-templates/table-operations/` - MCP server for table operations

**MCP Tools**:
- `table_pivot` - Pivot tables
- `table_aggregate` - Aggregate functions
- `table_join` - Join multiple tables
- `table_chart` - Generate charts from data
- `table_analyze` - Statistical analysis

#### 3.3 Integrate MCP Tools with Components

**Files to Create**:
- `lib/component/mcp-integration.ts` - MCP bridge for components

**Design**:
```typescript
// lib/component/mcp-integration.ts
export interface ComponentMCPIntegration {
  componentId: string;
  requiredTools: string[];
  optionalTools: string[];

  onToolAvailable?: (tool: string) => void;
  onToolUnavailable?: (tool: string) => void;
}

export function useMCPTools(componentId: string, tools: string[]) {
  const mcpStore = useMcpStore();
  const [availableTools, setAvailableTools] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Check which MCP tools are available
    const checkTools = async () => {
      const allTools = await mcpStore.getAllTools();
      const toolAvailability: Record<string, boolean> = {};

      for (const tool of tools) {
        toolAvailability[tool] = allTools.some(t => t.tool.name === tool);
      }

      setAvailableTools(toolAvailability);
    };

    checkTools();

    // Subscribe to MCP server changes
    const unsubscribe = mcpStore.subscribe(checkTools);
    return unsubscribe;
  }, [componentId, tools]);

  return {
    availableTools,
    hasAllTools: tools.every(t => availableTools[t]),
    executeTool: async (toolName: string, args: Record<string, unknown>) => {
      // Find the server that has this tool
      const allTools = await mcpStore.getAllTools();
      const toolEntry = allTools.find(t => t.tool.name === toolName);

      if (!toolEntry) {
        throw new Error(`Tool ${toolName} not available`);
      }

      return mcpStore.callTool(toolEntry.serverId, toolName, args);
    },
  };
}
```

---

### Phase 4: Skills System Integration (Priority: High)

#### 4.1 Create Component Skill Registry

**Files to Create**:
- `lib/component/skill-registry.ts` - Skill registry for components
- `types/component/skill-integration.ts` - Skill integration types

**Design**:
```typescript
// lib/component/skill-registry.ts
export interface ComponentSkill {
  skillId: string;
  targetComponent: string;
  capability: string;

  // UI injection points
  injectToolbar?: boolean;
  injectPanel?: boolean;
  injectContextMenu?: boolean;

  // Component to render
  component: React.ComponentType;

  // Tools provided by this skill
  tools?: ToolDefinition[];
}

export class ComponentSkillRegistry {
  private skills: Map<string, ComponentSkill[]> = new Map();

  register(skill: ComponentSkill) {
    const componentSkills = this.skills.get(skill.targetComponent) || [];
    componentSkills.push(skill);
    this.skills.set(skill.targetComponent, componentSkills);
  }

  getSkillsForComponent(componentId: string): ComponentSkill[] {
    return this.skills.get(componentId) || [];
  }

  getSkillsByCapability(componentId: string, capability: string): ComponentSkill[] {
    return this.getSkillsForComponent(componentId)
      .filter(s => s.capability === capability);
  }
}

export const componentSkillRegistry = new ComponentSkillRegistry();
```

#### 4.2 Create Built-in Skills

**Skills to Implement**:

1. **Table Analytics Skill** (`skills/table-analytics-skill/`)
   - Statistical summary
   - Chart generation
   - Trend analysis

2. **Table Transformation Skill** (`skills/table-transformation-skill/`)
   - Pivot tables
   - Data merging
   - Format conversion

3. **Image Filter Pack Skill** (`skills/image-filter-pack-skill/`)
   - Vintage filters
   - Modern filters
   - Artistic effects

4. **Image Adjustment Presets Skill** (`skills/image-presets-skill/`)
   - Portrait presets
   - Landscape presets
   - Food photography presets

---

### Phase 5: Documentation & Migration (Priority: Medium)

#### 5.1 Create Migration Guide

**Files to Create**:
- `docs/migration/enhanced-components-migration.md` - Migration guide

**Content**:
- Before/after examples
- Migration checklist
- Breaking changes
- New feature guide

#### 5.2 Update Component Documentation

**Files to Modify**:
- `components/chat/renderers/CLAUDE.md` - Update table documentation
- `components/image-studio/CLAUDE.md` - Update image editor documentation
- `docs/features/component-system.md` - New component system documentation

---

### Phase 6: Testing & Validation (Priority: Medium)

#### 6.1 Create Integration Tests

**Files to Create**:
- `components/chat/renderers/table-capabilities/*.test.tsx`
- `components/image-studio/preview-capabilities/*.test.tsx`
- `lib/component/skill-registry.test.ts`
- `lib/component/mcp-integration.test.ts`

#### 6.2 Create E2E Tests

**Files to Create**:
- `e2e/features/enhanced-components-integration.spec.ts`

---

## Implementation Roadmap

### Sprint 1: Foundation (Week 1-2)
- [ ] Create capability system types and registry
- [ ] Refactor EnhancedTable to capability-based Table
- [ ] Create table export Skill
- [ ] Set up MCP integration framework

### Sprint 2: Image Studio (Week 3-4)
- [ ] Merge useEnhancedImageEditor into useImageEditor
- [ ] Create advanced filters Skill
- [ ] Create batch processor Skill
- [ ] Refactor EnhancedPreview to capability-based Preview

### Sprint 3: Skills & MCP (Week 5-6)
- [ ] Create component skill registry
- [ ] Implement built-in Skills (4 Skills)
- [ ] Create image processing MCP server
- [ ] Create table operations MCP server

### Sprint 4: Integration & Testing (Week 7-8)
- [ ] Complete component migrations
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Update documentation

### Sprint 5: Polish & Launch (Week 9-10)
- [ ] Performance optimization
- [ ] UX refinements
- [ ] Final testing
- [ ] Launch preparation

---

## File Changes Summary

### Files to Delete
- `components/chat/renderers/enhanced-table.tsx` (refactored)
- `components/chat/renderers/enhanced-table.test.tsx` (refactored)
- `hooks/image-studio/use-enhanced-image-editor.ts` (merged)
- `hooks/rag/use-enhanced-rag.ts` (already deleted)
- `components/image-studio/enhanced-preview.tsx` (refactored)

### Files to Create

#### Core System
- `types/component/capabilities.ts`
- `lib/component/capability-registry.ts`
- `lib/component/skill-registry.ts`
- `lib/component/mcp-integration.ts`

#### Table Component
- `components/chat/renderers/table.tsx`
- `components/chat/renderers/table-capabilities/sortable.tsx`
- `components/chat/renderers/table-capabilities/filterable.tsx`
- `components/chat/renderers/table-capabilities/exportable.tsx`
- `components/chat/renderers/table-capabilities/paginatable.tsx`

#### Image Studio
- `components/image-studio/preview.tsx`
- `components/image-studio/preview-capabilities/comparison.tsx`
- `components/image-studio/preview-capabilities/histogram.tsx`
- `components/image-studio/preview-capabilities/zoom-pan.tsx`

#### Skills
- `skills/table-export-skill/`
- `skills/table-analytics-skill/`
- `skills/table-transformation-skill/`
- `skills/advanced-filters-skill/`
- `skills/batch-processor-skill/`
- `skills/ai-enhancement-skill/`
- `skills/image-filter-pack-skill/`
- `skills/image-presets-skill/`

#### MCP Servers
- `src-tauri/mcp-templates/image-processing/`
- `src-tauri/mcp-templates/table-operations/`

### Files to Modify

#### Core
- `hooks/image-studio/index.ts`
- `hooks/image-studio/use-image-editor.ts`
- `hooks/chat/index.ts`
- `components/chat/renderers/index.ts`
- `components/image-studio/index.ts`

#### Documentation
- `docs/migration/enhanced-components-migration.md`
- `components/chat/renderers/CLAUDE.md`
- `components/image-studio/CLAUDE.md`
- `docs/features/component-system.md`

---

## Success Metrics

1. **Code Reduction**: ~500 lines of duplicate code eliminated
2. **Modularity**: 100% of enhanced features available as Skills
3. **Extensibility**: 80% of features accessible via MCP
4. **Test Coverage**: 90%+ for new capability system
5. **Performance**: No performance regression
6. **Developer Experience**: Clear migration path, documented patterns

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing usage | High | Provide compatibility layer, gradual migration |
| Skill system complexity | Medium | Clear documentation, examples, templates |
| MCP latency | Medium | Lazy loading, caching, fallback implementations |
| Performance regression | Medium | Benchmarking, progressive enhancement |

---

## Dependencies

### External Dependencies
- None (uses existing infrastructure)

### Internal Dependencies
- Skills system must be stable
- MCP system must support tool registration
- Component store must support capability metadata

---

## Related Documents

- [Input Completion System Development Plan](./input-completion-plan.md)
- [Image Processing Optimization Plan](./image-processing-optimization-plan.md)
- [Skills System Documentation](../features/skills-system.md)
- [MCP System Documentation](../features/mcp-system.md)

---

**Last Updated**: 2025-01-26
**Status**: Ready for Review
