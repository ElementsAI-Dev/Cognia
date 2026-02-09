# Designer

The Designer is a V0-style visual web page designer with AI-powered editing, enabling users to create web pages through natural language descriptions and visual editing.

## Overview

| Feature | Description |
|---------|-------------|
| **AI Generation** | Create web pages from natural language descriptions |
| **Visual Editor** | Drag-and-drop page layout editing |
| **Component Library** | Pre-built UI component palette |
| **Code View** | View and edit generated HTML/CSS/JS |
| **Preview** | Live preview of designed pages |
| **History** | Version history with undo/redo |
| **Export** | Export as HTML, React component, or image |

## Architecture

```text
app/(main)/designer/page.tsx        → Designer page
components/designer/                → 96 designer components
  ├── designer-canvas.tsx           → Visual editing canvas
  ├── designer-toolbar.tsx          → Tool palette
  ├── designer-properties.tsx       → Properties panel
  ├── designer-layers.tsx           → Layer management
  └── designer-preview.tsx          → Live preview
hooks/designer/                     → 27 designer hooks
stores/designer/                    → Designer state
  ├── designer-store.ts             → Design state
  └── designer-history-store.ts     → Undo/redo history
lib/designer/                       → 34 designer utilities
```

## How It Works

1. Describe the web page you want to create
2. AI generates the initial layout and components
3. Fine-tune with the visual editor or additional prompts
4. Export the finished design as code or deploy
