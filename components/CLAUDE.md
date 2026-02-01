[根目录](../CLAUDE.md) > **components**

---

# components Module Documentation

## Module Responsibility

Feature-based React components for the Cognia application. Components are organized by domain and follow the atomic design pattern.

## Directory Structure

### Core Component Groups

- `ui/` — shadcn/Radix UI components (50+ base components)
- `ai-elements/` — AI-specific components (30+ components)
- `agent/` — Agent mode components (workflow selector, plan editor, execution steps)
- `chat/` — Chat interface components
- `designer/` — Visual web page designer
- `workflow-editor/` — Visual workflow editor with React Flow
- `native/` — Native feature UI (clipboard, screenshot, focus tracking)
- `learning/` — Learning mode components

### Supporting Components

- `artifacts/` — Artifact rendering and creation
- `canvas/` — Canvas components
- `projects/` — Project management UI
- `scheduler/` — Task scheduler UI (task-list, task-form, task-details, workflow-schedule-dialog, backup-schedule-dialog)
- `settings/` — Settings pages
- `sidebar/` — Sidebar components
- `presets/` — Preset management
- `skills/` — Skill management UI
- `export/` — Export dialogs and utilities
- `layout/` — Layout components (app shell, command palette, global search)
- `providers/` — React context providers
- `selection-toolbar/` — Selection toolbar UI

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
- And 20+ more...

### Agent Components (`components/agent/`)

- `agent-steps.tsx` — Agent execution steps
- `tool-approval-dialog.tsx` — Tool approval UI

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

## Styling

- **Tailwind CSS v4**: CSS variables in `app/globals.css`
- **cn() utility**: Merge classes with `@/lib/utils`
- **Dark mode**: Apply `.dark` class to parent
- **CVA**: `class-variance-authority` for variant-based styling

## Testing

- **Framework**: Jest with React Testing Library
- **Coverage**: Good
- **Test Files**: Extensive test coverage (`.test.tsx` files)

## Related Files

- `lib/utils.ts` — Common utilities including `cn()`
- `app/globals.css` — Global styles and CSS variables
- `types/` — Type definitions

## Changelog

### 2025-01-14
- Initial module documentation created
- Indexed 50+ component directories
- Documented component patterns
