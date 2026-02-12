[根目录](../CLAUDE.md) > **components**

---

# components Module Documentation

## Module Responsibility

Feature-based React components for the Cognia application. Components are organized by domain and follow the atomic design pattern.

## Changelog

### 2026-02-13

- Added A2UI Analysis Adapter for Academic mode integration (`a2ui/academic/`)
- Enhanced Quick App Builder with template cards and flash app generation
- Added comprehensive A2UI component documentation

### 2025-01-14

- Initial module documentation created
- Indexed 50+ component directories
- Documented component patterns

---

## Directory Structure

### Core Component Groups

- `ui/` — shadcn/Radix UI components (50+ base components)
- `ai-elements/` — AI-specific components (30+ components)
- `agent/` — Agent mode components (workflow selector, plan editor, execution steps)
- `chat/` — Chat interface components
- `chat-widget/` — Chat widget for standalone window
- `designer/` — Visual web page designer
- `workflow-editor/` — Visual workflow editor with React Flow
- `native/` — Native feature UI (clipboard, screenshot, focus tracking)
- `learning/` — Learning mode components
- `a2ui/` — A2UI mini-app system (Quick App Builder, surfaces, data components)

### Supporting Components

- `artifacts/` — Artifact rendering and creation
- `canvas/` — Canvas components with collaboration support
- `projects/` — Project management UI
- `scheduler/` — Task scheduler UI (task-list, task-form, task-details, workflow-schedule-dialog, backup-schedule-dialog)
- `settings/` — Settings pages (MCP, data, general)
- `sidebar/` — Sidebar components
- `presets/` — Preset management
- `skills/` — Skill management UI
- `export/` — Export dialogs and utilities
- `layout/` — Layout components (app shell, command palette, global search)
- `providers/` — React context providers
- `selection-toolbar/` — Selection toolbar UI
- `screenshot/` — Screenshot editor and history
- `screen-recording/` — Screen recording controls and history
- `video-studio/` — Video editing timeline and effects
- `image-studio/` — Image editing tools
- `jupyter/` — Jupyter notebook components
- `mcp/` — MCP tool call visualization
- `observability/` — System monitoring UI
- `academic/` — Academic paper analysis UI

## Entry Points

Most components export via `index.ts` files in their respective directories.

## Key Dependencies

- **UI Libraries**: `@radix-ui/*` (30+ packages), `lucide-react`
- **State**: `zustand`
- **Styling**: `tailwind-merge`, `clsx`, `class-variance-authority`
- **Motion**: `framer-motion`, `motion`
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **Workflow**: `@xyflow/react` (React Flow)
- **Editor**: `@monaco-editor/react`, `@codemirror/*`
- **Code Execution**: `@codesandbox/sandpack-react`
- **Internationalization**: `next-intl`

## Component Categories

### UI Components (`components/ui/`)

shadcn/ui components based on Radix UI primitives:

- Button, Input, Select, Checkbox, Radio, Switch, Slider
- Dialog, Alert Dialog, Popover, Tooltip, Hover Card
- Accordion, Collapsible, Tabs, Scroll Area
- Avatar, Badge, Card, Separator, Progress
- Dropdown Menu, Context Menu, Command
- Form, Label, Toast, Sonner
- And 30+ more...

### A2UI Components (`components/a2ui/`)

AI-driven mini-app system for creating interactive applications:

- `quick-app-builder.tsx` — Main interface for building mini-apps
  - Template cards for pre-built apps
  - Flash app tab for AI-powered generation
  - My Apps tab for managing created apps
  - Grid/list view modes
  - Import/export functionality
- `a2ui-surface.tsx` — Surface component for rendering A2UI apps
- `a2ui-renderer.tsx` — Renderer for A2UI component trees
- `academic/a2ui-analysis-adapter.tsx` — Bridges A2UI with Academic analysis panels
- `data/` — Data display components (a2ui-list)
- `form/` — Form components (a2ui-form-group)
- `layout/` — Layout components (a2ui-accordion, a2ui-dialog)

### AI Elements (`components/ai-elements/`)

Specialized components for AI interactions:

- `artifact.tsx` — Artifact display
- `canvas.tsx` — Canvas component
- `chain-of-thought.tsx` — Chain of thought visualization
- `reasoning.tsx` — Reasoning display
- `plan.tsx` — Plan visualization
- `node.tsx`, `edge.tsx` — Graph components
- `tool.tsx` — Tool execution display
- `image.tsx` — Image display
- `web-preview.tsx` — Web content preview
- `code-block.tsx` — Code block with syntax highlighting
- And 20+ more...

### Agent Components (`components/agent/`)

- `agent-steps.tsx` — Agent execution steps
- `tool-approval-dialog.tsx` — Tool approval UI
- `agent-team-panel.tsx` — Multi-agent team management
- `background-agent-panel.tsx` — Background agent queue
- `custom-mode-editor/` — Custom agent mode configuration
- `external-agent-selector.tsx` — External agent selection
- `tool-timeline.tsx` — Tool execution timeline

### Designer Components (`components/designer/`)

V0-style visual designer:

- `core/` — Core designer components
- `ai/` — AI-powered editing
- `panels/` — Component library, style panel, element tree
- `preview/` — Live preview with overlay
- `toolbar/` — Designer toolbar
- `dnd/` — Drag-and-drop components
- `editor/` — Code editor integration

### Workflow Editor (`components/workflow-editor/`)

React Flow-based workflow editor:

- Workflow editor panel
- Node palette
- Custom edges and nodes
- Debug panel
- Execution panel
- Variable management

### Native Components (`components/native/`)

Desktop-only native features:

- `focus-tracker-panel.tsx` — Focus tracking UI
- `window-selector-dialog.tsx` — Window selection

### Chat Components (`components/chat/`)

- `core/` — Core chat container
- `message-parts/` — Message rendering (tool-part, etc.)
- `utils/` — Chat utilities (tool-result-display)

### Canvas Components (`components/canvas/`)

- `canvas-panel.tsx` — Main canvas panel
- `collaboration-panel.tsx` — Real-time collaboration
- `version-history-panel.tsx` — Version control
- `version-diff-view.tsx` — Diff visualization

### Academic Components (`components/academic/`)

- `academic-chat-panel.tsx` — Academic chat interface
- `paper-library.tsx` — Paper management

### Settings Components (`components/settings/`)

- `mcp/` — MCP server configuration
  - `mcp-settings.tsx` — Main settings panel
  - `mcp-server-dialog.tsx` — Server configuration dialog
  - `mcp-marketplace-detail-dialog.tsx` — Marketplace details
- `data/` — Data settings
  - `arena-settings.tsx` — Arena configuration

### Screen Recording Components (`components/screen-recording/`)

- `recording-controls.tsx` — Recording buttons
- `recording-history-panel.tsx` — Recording history
- `recording-settings-panel.tsx` — Recording configuration
- `ffmpeg-status.tsx` — FFmpeg status display

## Common Patterns

### Creating Components

```typescript
// components/my-component/my-component.tsx
import { cn } from '@/lib/utils';

interface MyComponentProps {
  className?: string;
  // ... other props
}

export function MyComponent({ className, ...props }: MyComponentProps) {
  return (
    <div className={cn('base-styles', className)} {...props}>
      {/* Component content */}
    </div>
  );
}
```

### Using shadcn Components

```bash
# Add new shadcn component
pnpm dlx shadcn@latest add <component>
```

### A2UI Component Pattern

```typescript
// A2UI components receive standardized props
import type { A2UIComponentProps } from '@/types/artifact/a2ui';

export function MyA2UIComponent({
  component,
  dataModel,
  onAction,
  onDataChange,
}: A2UIComponentProps) {
  // Use dataModel for reactive state
  const value = dataModel?.myField as string;

  // Notify parent of changes
  const handleChange = (newValue: string) => {
    onDataChange?.('myField', newValue);
  };

  // Trigger actions
  const handleSubmit = () => {
    onAction?.('submit', { value });
  };

  return <div>...</div>;
}
```

## Styling

- **Tailwind CSS v4**: CSS variables in `app/globals.css`
- **cn() utility**: Merge classes with `@/lib/utils`
- **Dark mode**: Apply `.dark` class to parent
- **CVA**: `class-variance-authority` for variant-based styling

## Testing

- **Framework**: Jest with React Testing Library
- **Coverage**: Good
- **Test Files**: Extensive test coverage (`.test.tsx` files alongside components)

## Related Files

- `lib/utils.ts` — Common utilities including `cn()`
- `lib/a2ui/` — A2UI app generation and templates
- `app/globals.css` — Global styles and CSS variables
- `types/` — Type definitions
- `hooks/a2ui/` — A2UI hooks
- `stores/a2ui/` — A2UI state management
