# A2UI System

A2UI (AI-to-UI) is a system for generating interactive web applications from AI conversations. It transforms natural language descriptions into fully functional React components.

## Overview

| Feature | Description |
|---------|-------------|
| **App Generation** | Generate React apps from natural language prompts |
| **Academic Templates** | Specialized templates for research tools |
| **Data Model** | Structured data binding for generated UIs |
| **Error Boundary** | Graceful error handling for generated components |
| **Live Preview** | Real-time preview of generated applications |

## How It Works

1. User describes a desired application in chat
2. AI generates a structured A2UI specification
3. The A2UI renderer creates React components from the spec
4. Components are displayed in an interactive preview panel
5. Users can iterate on the design through conversation

## Architecture

```text
components/a2ui/                   → 100+ A2UI components
  ├── a2ui-context.tsx             → React context provider
  ├── a2ui-error-boundary.tsx      → Error boundary wrapper
  ├── academic/                    → Academic-specific templates
  ├── data/                        → Data visualization components
  └── display/                     → Display components
hooks/a2ui/                        → Data model and state hooks
  ├── use-a2ui-data-model.ts       → Data binding hook
  └── index.ts                     → Hook exports
lib/a2ui/                          → Generation and template logic
  ├── app-generator.ts             → App generation engine
  ├── academic-templates.ts        → Academic template definitions
  └── index.ts                     → Module exports
stores/a2ui/                       → A2UI state persistence
types/artifact/a2ui.ts             → TypeScript type definitions
```

## Component Categories

- **Display**: Cards, tables, charts, grids, lists
- **Data**: Forms, inputs, filters, data tables
- **Academic**: Citation viewers, paper analyzers, knowledge maps
- **Layout**: Tabs, accordions, split panes, modals

## State Management

The `useA2UIStore` manages:

- Generated app definitions
- Active app state
- Template selections
- Data model bindings
