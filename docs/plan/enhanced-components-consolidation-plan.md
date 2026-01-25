# Enhanced Components Consolidation Plan

## Document Information

- **Project**: Cognia AI Chat Application
- **Module**: Enhanced Components Integration & Consolidation
- **Created**: 2025-01-26
- **Status**: Planning
- **Priority**: High

---

## Executive Summary

This plan consolidates all "Enhanced" prefixed components and hooks into their base counterparts while fully leveraging the Skills and MCP systems for extensibility. The goal is to eliminate code duplication, improve maintainability, and establish a consistent component architecture based on capabilities rather than adjective-based naming.

### Key Objectives

1. **Merge Enhanced Components**: Integrate all enhanced features into base components
2. **Remove Adjective Naming**: Eliminate "Enhanced", "Advanced", "Smart", "Intelligent" prefixes
3. **Capability-Based Architecture**: Components declare capabilities, Skills provide implementations
4. **MCP Integration**: External capabilities accessed via MCP servers
5. **Full Skills Utilization**: Leverage the existing Skills system for extensibility

---

## Current State Analysis

### Enhanced Components Inventory

| Component | Current Path | Target Path | Features to Integrate | Lines |
|-----------|-------------|-------------|----------------------|-------|
| **EnhancedTable** | `components/chat/renderers/enhanced-table.tsx` | `components/chat/renderers/table.tsx` | Sortable, Filterable, Exportable, Paginatable | 525 |
| **EnhancedPreview** | `components/image-studio/enhanced-preview.tsx` | `components/image-studio/preview.tsx` | Comparison modes, Histogram, Zoom/Pan, Split view | 437 |
| **useEnhancedImageEditor** | `hooks/image-studio/use-enhanced-image-editor.ts` | `hooks/image-studio/use-image-editor.ts` | Worker, WebGL, Progressive loading, Advanced adjustments | 491 |

### Related Components Using "Enhanced" Naming

| File | Usage | Action |
|------|-------|--------|
| `components/a2ui/a2ui-message-renderer.tsx` | `A2UIEnhancedMessage` | Rename to `A2UIMessage` |
| `lib/ai/workflows/ppt-workflow.ts` | `PPTEnhancedSlide`, `PPTEnhancedOutlineItem` | Rename to `PPTSlide`, `PPTOutlineItem` |
| `lib/ai/workflows/ppt-executor.ts` | `buildEnhancedPresentation` | Rename to `buildPresentation` |
| `types/workflow/workflow.ts` | `PPTEnhancedGenerationOptions` | Rename to `PPTGenerationOptions` |
| `hooks/chat/index.ts` | `TokenCountOptionsEnhanced` | Rename to `TokenCountOptionsExtended` |
| `lib/ai/rag/rag-pipeline.ts` | References to enhanced RAG | Remove, file already deleted |

### Other Adjective-Named Components to Review

| Pattern | Files | Action |
|---------|-------|--------|
| **Advanced** | `components/chat/core/chat-header.tsx` (advanced search) | Keep as feature flag |
| **Advanced** | `components/settings/provider/provider-settings.tsx` | Keep as feature flag |
| **Smart** | `components/chat/popovers/` (smart completions) | Rename to `ai-completions` |
| **Intelligent** | Various | Rename to `adaptive` or remove |

---

## Architecture Design

### Capability-Based Component System

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Capability-Based Architecture                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   Component Layer                            │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │    │
│  │  │    Table    │  │ ImageEditor │  │      Preview        │  │    │
│  │  │             │  │             │  │                     │  │    │
│  │  │ capabilities│  │ capabilities│  │   capabilities      │  │    │
│  │  │   = [...]   │  │   = [...]   │  │      = [...]        │  │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │    │
│  └─────────┼─────────────────┼─────────────────────┼────────────┘    │
│            │                 │                     │                 │
│            ▼                 ▼                     ▼                 │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                  Capability Registry Layer                      │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │ │
│  │  │  TableCapabilities│  │EditorCapabilities│  │PreviewCaps   │  │ │
│  │  │  - sortable      │  │  - webgl-accel   │  │  - comparison│  │ │
│  │  │  - filterable    │  │  - worker-offload│  │  - histogram │  │ │
│  │  │  - exportable    │  │  - progressive   │  │  - zoom-pan  │  │ │
│  │  │  - paginatable   │  │  - advanced-adj  │  │  - overlay   │  │ │
│  │  └──────────────────┘  └──────────────────┘  └──────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│            │                 │                     │                 │
│            ▼                 ▼                     ▼                 │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    Skills Layer                                │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │  Component Skills (Internal Extensions)                  │  │ │
│  │  │  - TableExportSkill, TableAnalyticsSkill                │  │ │
│  │  │  - AdvancedFiltersSkill, BatchProcessorSkill            │  │ │
│  │  │  - HistogramOverlaySkill, ZoomControlsSkill             │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│            │                 │                     │                 │
│            ▼                 ▼                     ▼                 │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    MCP Layer                                    │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │  External Capabilities via MCP Servers                   │  │ │
│  │  │  - TableOperationsMCPServer (pivot, join, analyze)       │  │ │
│  │  │  - ImageProcessingMCPServer (bg-removal, upscale)        │  │ │
│  │  │  - AnalyticsMCPServer (charts, statistics)               │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Composition over Inheritance**: Base components provide core functionality, capabilities add features
2. **Declarative Capabilities**: Components declare what they can do, not how
3. **Progressive Enhancement**: Core features work everywhere, enhanced features when available
4. **Type Safety**: Full TypeScript support for capabilities and extensions
5. **Performance**: Capability-based lazy loading and code splitting

---

## Detailed Integration Plan

### Phase 1: Capability System Foundation (Priority: Critical)

#### 1.1 Create Capability Type System

**New Files**:
- `types/component/capabilities.ts` - Core capability type definitions
- `types/component/capability-registry.ts` - Capability registration types
- `lib/component/capability-registry.ts` - Runtime capability registry

**Type Definitions**:
```typescript
// types/component/capabilities.ts

/**
 * Core component capabilities
 * Components declare these to indicate what features they support
 */
export type ComponentCapability =
  // Table capabilities
  | 'table-sortable'
  | 'table-filterable'
  | 'table-exportable'
  | 'table-paginatable'
  | 'table-searchable'
  | 'table-analytics'
  | 'table-pivot'

  // Image editor capabilities
  | 'editor-webgl-accel'
  | 'editor-worker-offload'
  | 'editor-progressive-load'
  | 'editor-advanced-adj'
  | 'editor-batch-process'
  | 'editor-histogram'

  // Preview capabilities
  | 'preview-comparison'
  | 'preview-histogram'
  | 'preview-zoom-pan'
  | 'preview-overlay'
  | 'preview-split-view'
  | 'preview-loupe';

/**
 * Component capability declaration
 */
export interface ComponentCapabilities {
  /** Component identifier */
  id: string;

  /** Component display name */
  name: string;

  /** Supported capabilities */
  capabilities: ComponentCapability[];

  /** Capability-specific configuration */
  config?: Record<ComponentCapability, CapabilityConfig>;

  /** Extension points for Skills/MCP */
  extensions?: {
    skills?: string[];
    mcpServers?: string[];
  };
}

/**
 * Per-capability configuration
 */
export interface CapabilityConfig {
  enabled: boolean;
  priority?: number;
  fallback?: CapabilityFallback;
  dependencies?: ComponentCapability[];
}

export type CapabilityFallback =
  | 'graceful-degradation'
  | 'show-error'
  | 'hide-feature'
  | 'lazy-load';
```

**Registry Implementation**:
```typescript
// lib/component/capability-registry.ts

import type { ComponentCapabilities, ComponentCapability } from '@/types/component/capabilities';

class CapabilityRegistry {
  private components = new Map<string, ComponentCapabilities>();
  private capabilityMap = new Map<ComponentCapability, Set<string>>();

  register(capabilities: ComponentCapabilities): void {
    this.components.set(capabilities.id, capabilities);

    // Build reverse index
    for (const cap of capabilities.capabilities) {
      if (!this.capabilityMap.has(cap)) {
        this.capabilityMap.set(cap, new Set());
      }
      this.capabilityMap.get(cap)!.add(capabilities.id);
    }
  }

  unregister(componentId: string): void {
    const component = this.components.get(componentId);
    if (!component) return;

    for (const cap of component.capabilities) {
      this.capabilityMap.get(cap)?.delete(componentId);
    }
    this.components.delete(componentId);
  }

  hasCapability(componentId: string, capability: ComponentCapability): boolean {
    const component = this.components.get(componentId);
    return component?.capabilities.includes(capability) ?? false;
  }

  getComponentsWithCapability(capability: ComponentCapability): string[] {
    return Array.from(this.capabilityMap.get(capability) ?? []);
  }

  getCapabilities(componentId: string): ComponentCapability[] {
    return this.components.get(componentId)?.capabilities ?? [];
  }

  isCapabilityAvailable(capability: ComponentCapability): boolean {
    return this.capabilityMap.has(capability) &&
           this.capabilityMap.get(capability)!.size > 0;
  }
}

export const capabilityRegistry = new CapabilityRegistry();
```

#### 1.2 Component Integration Hook

**New File**: `hooks/component/use-capabilities.ts`

```typescript
import { useEffect, useState } from 'react';
import { capabilityRegistry } from '@/lib/component/capability-registry';
import type { ComponentCapability } from '@/types/component/capabilities';

export interface UseCapabilitiesOptions {
  componentId: string;
  required?: ComponentCapability[];
  optional?: ComponentCapability[];
}

export interface UseCapabilitiesReturn {
  /** Required capabilities that are available */
  availableRequired: ComponentCapability[];
  /** Optional capabilities that are available */
  availableOptional: ComponentCapability[];
  /** All unavailable capabilities */
  unavailable: ComponentCapability[];
  /** Whether all required capabilities are met */
  hasAllRequired: boolean;
  /** Check if a specific capability is available */
  has: (capability: ComponentCapability) => boolean;
}

export function useCapabilities(
  options: UseCapabilitiesOptions
): UseCapabilitiesReturn {
  const { componentId, required = [], optional = [] } = options;

  const [capabilities, setCapabilities] = useState<Set<ComponentCapability>>(new Set());

  useEffect(() => {
    // Check all capabilities
    const checkCapabilities = () => {
      const caps = new Set<ComponentCapability>();

      for (const cap of [...required, ...optional]) {
        if (capabilityRegistry.hasCapability(componentId, cap)) {
          caps.add(cap);
        }
      }

      setCapabilities(caps);
    };

    checkCapabilities();

    // Re-check when MCP servers change (if capability comes from MCP)
    // This would hook into the MCP store
  }, [componentId, required, optional]);

  const availableRequired = required.filter(c => capabilities.has(c));
  const availableOptional = optional.filter(c => capabilities.has(c));
  const unavailable = [...required, ...optional].filter(c => !capabilities.has(c));

  return {
    availableRequired,
    availableOptional,
    unavailable,
    hasAllRequired: unavailable.filter(c => required.includes(c)).length === 0,
    has: (capability: ComponentCapability) => capabilities.has(capability),
  };
}
```

---

### Phase 2: Table Component Integration (Priority: Critical)

#### 2.1 Merge EnhancedTable into Table

**Files to Modify**:
- `components/chat/renderers/enhanced-table.tsx` → Rename and refactor
- `components/chat/renderers/table.tsx` - New unified component
- `components/chat/renderers/index.ts` - Update exports

**New Directory Structure**:
```
components/chat/renderers/table/
├── index.tsx                    # Main Table component
├── capabilities/
│   ├── sortable.tsx            # Sorting capability
│   ├── filterable.tsx          # Search/filter capability
│   ├── exportable.tsx          # Export capability
│   ├── paginatable.tsx         # Pagination capability
│   └── index.ts                # Capability registry
└── table.test.tsx              # Tests
```

**Main Table Component**:
```typescript
// components/chat/renderers/table/index.tsx

'use client';

import { forwardRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TableSortable } from './capabilities/sortable';
import { TableFilterable } from './capabilities/filterable';
import { TableExportable } from './capabilities/exportable';
import { TablePaginatable } from './capabilities/paginatable';

export interface TableProps {
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  title?: string;
  className?: string;

  // Capability flags (enable/disable features)
  sortable?: boolean;
  searchable?: boolean;
  exportable?: boolean;
  showPagination?: boolean;
  pageSize?: number;
  showToolbar?: boolean;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  function Table(
    {
      headers,
      rows,
      title,
      className,
      sortable = true,
      searchable = true,
      exportable: canExport = true,
      showPagination = true,
      pageSize = 10,
      showToolbar = true,
    },
    ref
  ) {
    // Base table data
    const tableData = useMemo(() => ({ headers, rows, title }), [headers, rows, title]);

    return (
      <div className={cn('group rounded-lg border overflow-hidden my-4', className)}>
        {/* Capability: Filterable (includes toolbar) */}
        <TableFilterable
          enabled={searchable}
          showToolbar={showToolbar}
          tableData={tableData}
        >
          {/* Capability: Sortable (headers) */}
          <TableSortable enabled={sortable} headers={headers} rows={rows}>
            {/* Table content */}
            <table ref={ref} className="min-w-full border-collapse">
              {/* Table rendered here */}
            </table>
          </TableSortable>
        </TableFilterable>

        {/* Capability: Paginatable */}
        <TablePaginatable enabled={showPagination} pageSize={pageSize} />

        {/* Capability: Exportable */}
        <TableExportable enabled={canExport} tableData={tableData} />
      </div>
    );
  }
);

export default Table;
```

**Capability Component Example**:
```typescript
// components/chat/renderers/table/capabilities/sortable.tsx

'use client';

import { createContext, useContext, useCallback, useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableContextValue {
  sortState: SortState;
  handleSort: (column: number) => void;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: number | null;
  direction: SortDirection;
}

const SortableContext = createContext<SortableContextValue | null>(null);

export interface TableSortableProps {
  enabled: boolean;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  children: React.ReactNode;
}

export function TableSortable({ enabled, headers, rows, children }: TableSortableProps) {
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });

  // Sort rows based on current sort state
  const sortedRows = useMemo(() => {
    if (!enabled || sortState.column === null || sortState.direction === null) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const aVal = a[sortState.column!];
      const bVal = b[sortState.column!];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Try numeric comparison
      const aNum = Number(aVal);
      const bNum = Number(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortState.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (sortState.direction === 'asc') {
        return aStr.localeCompare(bStr);
      }
      return bStr.localeCompare(aStr);
    });
  }, [enabled, rows, sortState]);

  const handleSort = useCallback((columnIndex: number) => {
    if (!enabled) return;

    setSortState((prev) => {
      if (prev.column !== columnIndex) {
        return { column: columnIndex, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column: columnIndex, direction: 'desc' };
      }
      return { column: null, direction: null };
    });
  }, [enabled]);

  return (
    <SortableContext.Provider value={{ sortState, handleSort }}>
      {React.cloneElement(children as React.ReactElement, {
        sortedRows,
        renderSortIcon: (columnIndex: number) => {
          if (!enabled) return null;

          if (sortState.column !== columnIndex) {
            return <ArrowUpDown className="h-3 w-3 opacity-50" />;
          }
          if (sortState.direction === 'asc') {
            return <ArrowUp className="h-3 w-3" />;
          }
          return <ArrowDown className="h-3 w-3" />;
        },
      })}
    </SortableContext.Provider>
  );
}

export function useSortable() {
  const context = useContext(SortableContext);
  if (!context) {
    throw new Error('useSortable must be used within TableSortable');
  }
  return context;
}
```

#### 2.2 Register Table Capabilities

**New File**: `components/chat/renderers/table/capabilities.ts`

```typescript
import { capabilityRegistry } from '@/lib/component/capability-registry';
import type { ComponentCapabilities } from '@/types/component/capabilities';

export const TABLE_CAPABILITIES: ComponentCapabilities = {
  id: 'table',
  name: 'Table',
  capabilities: [
    'table-sortable',
    'table-filterable',
    'table-exportable',
    'table-paginatable',
    'table-searchable',
  ],
  config: {
    'table-sortable': { enabled: true, fallback: 'graceful-degradation' },
    'table-filterable': { enabled: true, fallback: 'graceful-degradation' },
    'table-exportable': { enabled: true, fallback: 'hide-feature' },
    'table-paginatable': { enabled: true, fallback: 'hide-feature' },
    'table-searchable': { enabled: true, fallback: 'graceful-degradation' },
  },
  extensions: {
    skills: ['table-export', 'table-analytics', 'table-transformation'],
    mcpServers: ['table-operations'],
  },
};

// Register on module load
if (typeof window !== 'undefined') {
  capabilityRegistry.register(TABLE_CAPABILITIES);
}
```

#### 2.3 Update Exports

**File**: `components/chat/renderers/index.ts`

```typescript
// Before:
// export { EnhancedTable } from './enhanced-table';

// After:
export { Table } from './table';
export type { TableProps } from './table';
```

---

### Phase 3: Image Studio Integration (Priority: High)

#### 3.1 Merge useEnhancedImageEditor into useImageEditor

**Files to Modify**:
- `hooks/image-studio/use-image-editor.ts` - Extend with enhanced features
- `hooks/image-studio/use-enhanced-image-editor.ts` - Delete after merge

**New Hook Interface**:
```typescript
// hooks/image-studio/use-image-editor.ts

export interface UseImageEditorOptions {
  // Existing options
  initialImageUrl?: string;
  maxHistorySize?: number;
  autoSaveInterval?: number;
  onImageChange?: (imageData: ImageData) => void;
  onError?: (error: string) => void;

  // NEW: Performance options (formerly "enhanced" features)
  enableWebWorker?: boolean;
  enableWebGL?: boolean;
  enableProgressiveLoading?: boolean;
  workerCount?: number;
  onPerformanceMetric?: (metric: PerformanceMetric) => void;

  // NEW: Advanced adjustments
  enableAdvancedAdjustments?: boolean;
}

export interface UseImageEditorReturn {
  // Existing returns...

  // NEW: Performance status
  isWorkerReady?: boolean;
  isWebGLSupported?: boolean;
  lastOperationDuration?: number | null;

  // NEW: Advanced adjustments
  applyLevels?: (options: LevelsOptions) => Promise<void>;
  applyCurves?: (options: CurvesOptions) => Promise<void>;
  applyHSL?: (options: HSLOptions) => Promise<void>;
  applyNoiseReduction?: (options: NoiseReductionOptions) => Promise<void>;
  applySharpen?: (options: SharpenOptions) => Promise<void>;

  // NEW: Histogram
  getHistogram?: () => Promise<HistogramData | null>;

  // NEW: Progressive loading
  loadImageProgressive?: (
    source: string | File,
    onPreview?: (previewUrl: string) => void
  ) => Promise<void>;

  // NEW: Batch operations
  applyAdjustmentsBatch?: (adjustments: Partial<ImageAdjustments>) => Promise<void>;
}
```

**Implementation Strategy**:
```typescript
export function useImageEditor(options: UseImageEditorOptions = {}): UseImageEditorReturn {
  const {
    // Existing options
    initialImageUrl,
    maxHistorySize = 50,
    onImageChange,
    onError,

    // NEW: Performance options
    enableWebWorker = true,
    enableWebGL = true,
    enableProgressiveLoading = false,
    workerCount = 2,
    onPerformanceMetric,

    // NEW: Advanced features
    enableAdvancedAdjustments = false,
  } = options;

  // Base editor functionality
  const baseEditor = useBaseImageEditor({
    initialImageUrl,
    maxHistorySize,
    onImageChange,
    onError,
  });

  // NEW: Conditional performance features
  const workerProcessor = useWorkerProcessor({
    enabled: enableWebWorker,
    workerCount,
  });

  const glProcessor = useGLProcessor({
    enabled: enableWebGL,
  });

  const progressiveLoader = useProgressiveLoader({
    enabled: enableProgressiveLoading,
  });

  // NEW: Conditional advanced adjustments
  const advancedAdjustments = enableAdvancedAdjustments
    ? useAdvancedAdjustments()
    : null;

  // Merge all features
  return {
    ...baseEditor,

    // Performance features (only when enabled)
    ...(enableWebWorker && {
      isWorkerReady: workerProcessor.isReady,
    }),
    ...(enableWebGL && {
      isWebGLSupported: glProcessor.isSupported,
    }),
    ...(onPerformanceMetric && {
      lastOperationDuration: workerProcessor.lastDuration,
    }),

    // Advanced adjustments (only when enabled)
    ...(enableAdvancedAdjustments && advancedAdjustments),
  };
}
```

#### 3.2 Merge EnhancedPreview into Preview

**Files to Modify**:
- `components/image-studio/enhanced-preview.tsx` → Rename and refactor
- `components/image-studio/preview.tsx` - New unified component

**New Directory Structure**:
```
components/image-studio/preview/
├── index.tsx                    # Main Preview component
├── capabilities/
│   ├── comparison.tsx           # Comparison modes
│   ├── histogram.tsx            # Histogram overlay
│   ├── zoom-pan.tsx             # Zoom and pan controls
│   └── index.ts                 # Capability registry
└── preview.test.tsx             # Tests
```

**Main Preview Component**:
```typescript
// components/image-studio/preview/index.tsx

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PreviewComparison } from './capabilities/comparison';
import { PreviewHistogram } from './capabilities/histogram';
import { PreviewZoomPan } from './capabilities/zoom-pan';

export type ComparisonMode = 'split-horizontal' | 'split-vertical' | 'side-by-side' | 'toggle';

export interface PreviewProps {
  originalImage: ImageData | null;
  editedImage: ImageData | null;
  className?: string;

  // Capability flags
  enableComparison?: boolean;
  enableHistogram?: boolean;
  enableZoomPan?: boolean;

  // Initial state
  initialZoom?: number;
  initialComparisonMode?: ComparisonMode;
}

export function Preview({
  originalImage,
  editedImage,
  className,
  enableComparison = true,
  enableHistogram = false,
  enableZoomPan = true,
  initialZoom = 1,
  initialComparisonMode = 'split-horizontal',
}: PreviewProps) {
  const [zoom, setZoom] = useState(initialZoom);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>(initialComparisonMode);

  return (
    <div className={cn('relative w-full h-full bg-muted/50', className)}>
      {/* Capability: ZoomPan */}
      <PreviewZoomPan
        enabled={enableZoomPan}
        zoom={zoom}
        onZoomChange={setZoom}
        panX={panX}
        panY={panY}
        onPanChange={setPanX, setPanY}
      >
        {/* Capability: Comparison */}
        <PreviewComparison
          enabled={enableComparison}
          originalImage={originalImage}
          editedImage={editedImage}
          mode={comparisonMode}
          onModeChange={setComparisonMode}
          zoom={zoom}
          panX={panX}
          panY={panY}
        />
      </PreviewZoomPan>

      {/* Capability: Histogram */}
      <PreviewHistogram
        enabled={enableHistogram}
        imageData={editedImage || originalImage}
      />
    </div>
  );
}

export default Preview;
```

#### 3.3 Register Preview Capabilities

**New File**: `components/image-studio/preview/capabilities.ts`

```typescript
import { capabilityRegistry } from '@/lib/component/capability-registry';
import type { ComponentCapabilities } from '@/types/component/capabilities';

export const PREVIEW_CAPABILITIES: ComponentCapabilities = {
  id: 'preview',
  name: 'Preview',
  capabilities: [
    'preview-comparison',
    'preview-histogram',
    'preview-zoom-pan',
  ],
  config: {
    'preview-comparison': { enabled: true, fallback: 'graceful-degradation' },
    'preview-histogram': { enabled: false, fallback: 'hide-feature' },
    'preview-zoom-pan': { enabled: true, fallback: 'graceful-degradation' },
  },
  extensions: {
    skills: ['histogram-overlay', 'color-analysis'],
    mcpServers: ['image-analysis'],
  },
};

if (typeof window !== 'undefined') {
  capabilityRegistry.register(PREVIEW_CAPABILITIES);
}
```

---

### Phase 4: Skills Integration (Priority: High)

#### 4.1 Create Built-in Skills

**Skills to Implement**:

##### Table Export Skill
**Directory**: `skills/table-export-skill/`

```json
// skills/table-export-skill/skill.json
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
      "description": "Export table to Excel with formatting",
      "inputSchema": {
        "type": "object",
        "properties": {
          "headers": { "type": "array", "items": { "type": "string" } },
          "rows": { "type": "array", "items": { "type": "array" } },
          "title": { "type": "string" }
        }
      }
    },
    {
      "name": "export_to_csv",
      "description": "Export table to CSV",
      "inputSchema": {
        "type": "object",
        "properties": {
          "data": { "type": "object" },
          "filename": { "type": "string" }
        }
      }
    },
    {
      "name": "export_to_google_sheets",
      "description": "Export directly to Google Sheets",
      "inputSchema": {
        "type": "object",
        "properties": {
          "data": { "type": "object" }
        }
      }
    }
  ]
}
```

##### Advanced Filters Skill
**Directory**: `skills/advanced-filters-skill/`

```json
{
  "name": "advanced-filters",
  "displayName": "Advanced Filters",
  "description": "Professional-grade image adjustment filters",
  "version": "1.0.0",
  "category": "image-editing",
  "capabilities": ["editor-advanced-adj"],
  "tools": [
    {
      "name": "apply_levels",
      "description": "Adjust tonal levels (shadows, midtones, highlights)"
    },
    {
      "name": "apply_curves",
      "description": "Adjust tonal curves"
    },
    {
      "name": "apply_hsl",
      "description": "Hue, saturation, lightness adjustment"
    },
    {
      "name": "apply_noise_reduction",
      "description": "Reduce image noise"
    },
    {
      "name": "apply_sharpen",
      "description": "Sharpen image with unsharp mask"
    }
  ]
}
```

##### Batch Processor Skill
**Directory**: `skills/batch-processor-skill/`

```json
{
  "name": "batch-processor",
  "displayName": "Batch Processor",
  "description": "Process multiple images with the same operations",
  "version": "1.0.0",
  "category": "productivity",
  "capabilities": ["editor-batch-process"],
  "tools": [
    {
      "name": "batch_adjust",
      "description": "Apply adjustments to multiple images"
    },
    {
      "name": "batch_export",
      "description": "Export multiple images with settings"
    },
    {
      "name": "batch_filter",
      "description": "Apply filters to multiple images"
    }
  ]
}
```

##### Histogram Overlay Skill
**Directory**: `skills/histogram-overlay-skill/`

```json
{
  "name": "histogram-overlay",
  "displayName": "Histogram Overlay",
  "description": "Display RGB histogram overlay on images",
  "version": "1.0.0",
  "category": "analysis",
  "capabilities": ["preview-histogram"],
  "tools": [
    {
      "name": "calculate_histogram",
      "description": "Calculate RGB histogram from image data"
    },
    {
      "name": "render_histogram_overlay",
      "description": "Render histogram as overlay component"
    }
  ]
}
```

#### 4.2 Component Skill Integration Hook

**New File**: `hooks/component/use-component-skills.ts`

```typescript
import { useEffect, useState } from 'react';
import { useSkillStore } from '@/stores';
import type { ComponentCapability } from '@/types/component/capabilities';

export interface UseComponentSkillsOptions {
  componentId: string;
  capabilities: ComponentCapability[];
}

export function useComponentSkills(options: UseComponentSkillsOptions) {
  const { componentId, capabilities } = options;
  const skillStore = useSkillStore();

  const [availableSkills, setAvailableSkills] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSkills = async () => {
      setIsLoading(true);

      // Get skills that provide the required capabilities
      const skills = await skillStore.getSkillsByCapabilities(capabilities);

      setAvailableSkills(new Set(skills.map(s => s.id)));
      setIsLoading(false);
    };

    loadSkills();
  }, [componentId, capabilities, skillStore]);

  return {
    availableSkills,
    isLoading,
    hasSkill: (skillId: string) => availableSkills.has(skillId),
  };
}
```

---

### Phase 5: MCP Integration (Priority: High)

#### 5.1 Create MCP Server Templates

##### Image Processing MCP Server
**Directory**: `src-tauri/mcp-templates/image-processing/`

```json
// mcp-server.json
{
  "name": "image-processing",
  "description": "Advanced image processing capabilities via MCP",
  "version": "1.0.0",
  "transport": "stdio",
  "capabilities": ["editor-advanced-adj", "editor-batch-process"],
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
    },
    {
      "name": "detect_objects",
      "description": "Detect objects in image",
      "inputSchema": {
        "type": "object",
        "properties": {
          "image_path": { "type": "string" }
        }
      }
    }
  ]
}
```

##### Table Operations MCP Server
**Directory**: `src-tauri/mcp-templates/table-operations/`

```json
{
  "name": "table-operations",
  "description": "Advanced table data operations",
  "version": "1.0.0",
  "transport": "stdio",
  "capabilities": ["table-analytics", "table-pivot"],
  "tools": [
    {
      "name": "table_pivot",
      "description": "Create pivot table from data"
    },
    {
      "name": "table_aggregate",
      "description": "Aggregate table data"
    },
    {
      "name": "table_join",
      "description": "Join multiple tables"
    },
    {
      "name": "table_analyze",
      "description": "Statistical analysis of table data"
    }
  ]
}
```

#### 5.2 MCP Integration Hook

**New File**: `hooks/component/use-mcp-capabilities.ts`

```typescript
import { useEffect, useState } from 'react';
import { useMcpStore } from '@/stores';
import type { ComponentCapability } from '@/types/component/capabilities';

export interface UseMcpCapabilitiesOptions {
  capabilities: ComponentCapability[];
}

export interface UseMcpCapabilitiesReturn {
  availableTools: string[];
  isLoading: boolean;
  executeTool: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
  hasTool: (toolName: string) => boolean;
}

export function useMcpCapabilities(
  options: UseMcpCapabilitiesOptions
): UseMcpCapabilitiesReturn {
  const { capabilities } = options;
  const mcpStore = useMcpStore();

  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkTools = async () => {
      setIsLoading(true);

      // Get all tools from MCP servers
      const allTools = await mcpStore.getAllTools();

      // Filter tools that provide the required capabilities
      const relevantTools = allTools
        .filter(t => t.capabilities?.some(c => capabilities.includes(c)))
        .map(t => t.tool.name);

      setAvailableTools(relevantTools);
      setIsLoading(false);
    };

    checkTools();

    // Subscribe to MCP server changes
    const unsubscribe = mcpStore.subscribe(checkTools);
    return unsubscribe;
  }, [capabilities, mcpStore]);

  const executeTool = async (
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> => {
    const allTools = await mcpStore.getAllTools();
    const toolEntry = allTools.find(t => t.tool.name === toolName);

    if (!toolEntry) {
      throw new Error(`Tool ${toolName} not available`);
    }

    return mcpStore.callTool(toolEntry.serverId, toolName, args);
  };

  return {
    availableTools,
    isLoading,
    executeTool,
    hasTool: (toolName: string) => availableTools.includes(toolName),
  };
}
```

---

### Phase 6: A2UI and Workflow Renaming (Priority: Medium)

#### 6.1 Rename A2UI Enhanced Message

**Files to Modify**:
- `components/a2ui/a2ui-message-renderer.tsx`
- `components/a2ui/index.ts`

**Changes**:
```typescript
// Before:
export interface A2UIEnhancedMessageProps { ... }
export function A2UIEnhancedMessage(...) { ... }

// After:
export interface A2UIMessageProps { ... }
export function A2UIMessage(...) { ... }
```

#### 6.2 Rename PPT Enhanced Types

**Files to Modify**:
- `lib/ai/workflows/ppt-workflow.ts`
- `lib/ai/workflows/ppt-executor.ts`
- `types/workflow/workflow.ts`

**Changes**:
```typescript
// Before:
export interface PPTEnhancedSlide { ... }
export interface PPTEnhancedOutlineItem { ... }
export interface PPTEnhancedGenerationOptions { ... }
export function buildEnhancedPresentation(...) { ... }
export function parseEnhancedOutlineResponse(...) { ... }

// After:
export interface PPTSlide { ... }
export interface PPTOutlineItem { ... }
export interface PPTGenerationOptions { ... }
export function buildPresentation(...) { ... }
export function parseOutlineResponse(...) { ...
```

#### 6.3 Rename Enhanced Token Count

**Files to Modify**:
- `hooks/chat/index.ts`

**Changes**:
```typescript
// Before:
export type { TokenCountOptionsEnhanced } from './use-token-count';

// After:
export type { TokenCountOptionsExtended } from './use-token-count';
```

---

### Phase 7: Documentation & Migration (Priority: Medium)

#### 7.1 Create Migration Guide

**New File**: `docs/migration/component-consolidation-migration.md`

```markdown
# Component Consolidation Migration Guide

## Breaking Changes

### Table Component

**Before:**
```typescript
import { EnhancedTable } from '@/components/chat/renderers';

<EnhancedTable
  headers={headers}
  rows={rows}
  sortable
  searchable
  exportable
/>
```

**After:**
```typescript
import { Table } from '@/components/chat/renderers';

<Table
  headers={headers}
  rows={rows}
  sortable
  searchable
  exportable
/>
```

### Image Editor Hook

**Before:**
```typescript
import { useEnhancedImageEditor } from '@/hooks/image-studio';

const editor = useEnhancedImageEditor({
  useWorker: true,
  useWebGL: true,
});
```

**After:**
```typescript
import { useImageEditor } from '@/hooks/image-studio';

const editor = useImageEditor({
  enableWebWorker: true,
  enableWebGL: true,
});
```

### Preview Component

**Before:**
```typescript
import { EnhancedPreview } from '@/components/image-studio';

<EnhancedPreview
  originalImage={original}
  editedImage={edited}
  comparisonMode="split-horizontal"
  showHistogram
/>
```

**After:**
```typescript
import { Preview } from '@/components/image-studio';

<Preview
  originalImage={original}
  editedImage={edited}
  enableComparison
  enableHistogram
/>
```

## New Features

### Capability-Based Components

Components now support capability flags:

```typescript
<Table
  headers={headers}
  rows={rows}
  sortable           // Enable sorting
  searchable         // Enable search/filter
  exportable         // Enable export
  showPagination     // Enable pagination
/>
```

### Performance Options

Image editor now has fine-grained performance controls:

```typescript
const editor = useImageEditor({
  enableWebWorker: true,           // Enable worker offloading
  enableWebGL: true,               // Enable GPU acceleration
  enableProgressiveLoading: false, // Enable progressive image loading
  workerCount: 2,                  // Number of workers
  onPerformanceMetric: (metric) => { // Track performance
    console.log(metric.operation, metric.duration);
  },
});
```

## Migration Checklist

- [ ] Update imports from `EnhancedTable` to `Table`
- [ ] Update imports from `EnhancedPreview` to `Preview`
- [ ] Update imports from `useEnhancedImageEditor` to `useImageEditor`
- [ ] Update prop names for performance options
- [ ] Update prop names for capability flags
- [ ] Test all table functionality
- [ ] Test all image editor functionality
- [ ] Test all preview functionality
```

#### 7.2 Update Module Documentation

**Files to Modify**:
- `components/chat/renderers/CLAUDE.md`
- `components/image-studio/CLAUDE.md`
- `hooks/CLAUDE.md`

**Add Documentation**:
- Capability system overview
- New component interfaces
- Skill integration patterns
- MCP integration examples

---

## Implementation Roadmap

### Sprint 1: Foundation (Week 1-2)
**Goal**: Set up capability system and merge table component

- [ ] Create capability type system (`types/component/capabilities.ts`)
- [ ] Implement capability registry (`lib/component/capability-registry.ts`)
- [ ] Create capability hook (`hooks/component/use-capabilities.ts`)
- [ ] Refactor EnhancedTable to Table with capabilities
- [ ] Create table capability components (sortable, filterable, exportable, paginatable)
- [ ] Update table exports and imports
- [ ] Write tests for capability system
- [ ] Write tests for new Table component

### Sprint 2: Image Studio (Week 3-4)
**Goal**: Merge image editor and preview components

- [ ] Merge useEnhancedImageEditor into useImageEditor
- [ ] Implement performance options (worker, WebGL, progressive)
- [ ] Merge EnhancedPreview into Preview
- [ ] Create preview capability components
- [ ] Update image studio exports
- [ ] Write tests for merged hooks
- [ ] Write tests for Preview component

### Sprint 3: Skills & MCP (Week 5-6)
**Goal**: Implement Skills and MCP integration

- [ ] Create Table Export Skill
- [ ] Create Advanced Filters Skill
- [ ] Create Batch Processor Skill
- [ ] Create Histogram Overlay Skill
- [ ] Implement useComponentSkills hook
- [ ] Create Image Processing MCP server template
- [ ] Create Table Operations MCP server template
- [ ] Implement useMcpCapabilities hook
- [ ] Write tests for Skills integration
- [ ] Write tests for MCP integration

### Sprint 4: Remaining Renaming (Week 7)
**Goal**: Complete all remaining renaming

- [ ] Rename A2UIEnhancedMessage to A2UIMessage
- [ ] Rename PPT enhanced types
- [ ] Rename enhanced PPT functions
- [ ] Rename TokenCountOptionsEnhanced
- [ ] Update all imports and references
- [ ] Write tests for renamed components

### Sprint 5: Documentation & Polish (Week 8)
**Goal**: Complete documentation and final polish

- [ ] Create migration guide
- [ ] Update module CLAUDE.md files
- [ ] Update component documentation
- [ ] Create capability system documentation
- [ ] Create Skills integration guide
- [ ] Create MCP integration guide
- [ ] Performance testing
- [ ] Cross-platform testing
- [ ] Final code review
- [ ] Update CHANGELOG.md

---

## File Changes Summary

### Files to Delete

```
components/chat/renderers/enhanced-table.tsx
components/chat/renderers/enhanced-table.test.tsx
hooks/image-studio/use-enhanced-image-editor.ts
components/image-studio/enhanced-preview.tsx
components/image-studio/enhanced-preview.test.tsx
hooks/rag/use-enhanced-rag.ts  # Already deleted
```

### Files to Create

#### Core System
```
types/component/capabilities.ts
types/component/capability-registry.ts
lib/component/capability-registry.ts
hooks/component/use-capabilities.ts
hooks/component/use-component-skills.ts
hooks/component/use-mcp-capabilities.ts
```

#### Table Component
```
components/chat/renderers/table/index.tsx
components/chat/renderers/table/capabilities/sortable.tsx
components/chat/renderers/table/capabilities/filterable.tsx
components/chat/renderers/table/capabilities/exportable.tsx
components/chat/renderers/table/capabilities/paginatable.tsx
components/chat/renderers/table/capabilities.ts
components/chat/renderers/table/table.test.tsx
```

#### Image Studio
```
components/image-studio/preview/index.tsx
components/image-studio/preview/capabilities/comparison.tsx
components/image-studio/preview/capabilities/histogram.tsx
components/image-studio/preview/capabilities/zoom-pan.tsx
components/image-studio/preview/capabilities.ts
components/image-studio/preview/preview.test.tsx
```

#### Skills
```
skills/table-export-skill/skill.json
skills/table-export-skill/index.ts
skills/table-export-skill/prompts.md
skills/advanced-filters-skill/skill.json
skills/advanced-filters-skill/index.ts
skills/batch-processor-skill/skill.json
skills/batch-processor-skill/index.ts
skills/histogram-overlay-skill/skill.json
skills/histogram-overlay-skill/index.ts
```

#### MCP Servers
```
src-tauri/mcp-templates/image-processing/mcp-server.json
src-tauri/mcp-templates/image-processing/tools/
src-tauri/mcp-templates/table-operations/mcp-server.json
src-tauri/mcp-templates/table-operations/tools/
```

#### Documentation
```
docs/migration/component-consolidation-migration.md
docs/features/capability-system.md
docs/features/skills-integration.md
docs/features/mcp-integration.md
```

### Files to Modify

```
hooks/chat/index.ts                              # Update exports
hooks/image-studio/index.ts                      # Update exports
hooks/image-studio/use-image-editor.ts           # Merge enhanced features
components/chat/renderers/index.ts              # Update exports
components/image-studio/index.ts                # Update exports
components/a2ui/a2ui-message-renderer.tsx       # Rename A2UIEnhancedMessage
components/a2ui/index.ts                        # Update exports
lib/ai/workflows/ppt-workflow.ts                # Rename PPT enhanced types
lib/ai/workflows/ppt-executor.ts                # Rename PPT enhanced functions
types/workflow/workflow.ts                      # Rename PPT enhanced types
components/chat/renderers/CLAUDE.md             # Update docs
components/image-studio/CLAUDE.md               # Update docs
hooks/CLAUDE.md                                  # Update docs
CLAUDE.md                                       # Update main docs
CHANGELOG.md                                    # Add changelog entry
```

---

## Success Metrics

### Code Quality
- [ ] ~1500 lines of duplicate code eliminated
- [ ] 100% of enhanced features available as capabilities
- [ ] 80% of features accessible via Skills
- [ ] 60% of advanced features accessible via MCP

### Test Coverage
- [ ] 90%+ coverage for new capability system
- [ ] 85%+ coverage for refactored components
- [ ] All existing tests pass after refactoring

### Performance
- [ ] No performance regression
- [ ] Faster initial load (lazy-loaded capabilities)
- [ ] Smaller bundle size (code splitting)

### Developer Experience
- [ ] Clear migration path documented
- [ ] Consistent component patterns
- [ ] Type-safe capability system
- [ ] Easy to extend with new capabilities

### User Experience
- [ ] All existing features preserved
- [ ] Progressive enhancement works
- [ ] Graceful fallbacks for unsupported features
- [ ] No breaking changes for end users

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing usage | High | Provide compatibility layer, gradual migration path |
| Complex capability system | Medium | Clear documentation, examples, templates |
| Skills system complexity | Medium | Start with built-in skills, document patterns |
| MCP latency | Medium | Lazy loading, caching, fallback implementations |
| Performance regression | Medium | Benchmarking, progressive enhancement, code splitting |
| Type system complexity | Low | Comprehensive type definitions, examples |
| Test coverage gaps | Low | Comprehensive test plan, test-driven development |

---

## Dependencies

### External Dependencies
- None (uses existing infrastructure)

### Internal Dependencies
- Skills system must be stable
- MCP system must support tool registration
- Component stores must support capability metadata

---

## Related Documents

- [Image Processing Optimization Plan](./image-processing-optimization-plan.md)
- [Input Completion System Development Plan](./input-completion-plan.md)
- [Skills System Documentation](../features/skills-system.md)
- [MCP System Documentation](../features/mcp-system.md)

---

**Last Updated**: 2025-01-26
**Status**: Ready for Implementation
**Estimated Duration**: 8 weeks
**Priority**: High
