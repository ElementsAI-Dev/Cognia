# PPT Editor

A full-featured presentation editor and generator with AI-powered slide creation, editing, and export capabilities.

## Overview

| Feature | Description |
|---------|-------------|
| **AI Generation** | Generate presentations from natural language prompts |
| **Slide Editor** | Visual slide editing with drag-and-drop |
| **Templates** | Pre-built presentation templates |
| **Slide Preview** | Real-time slide preview with animations |
| **Export** | Export to PPTX, PDF, or images |
| **Gallery** | Manage and search saved presentations |
| **Slide Sorter** | Reorder, duplicate, and delete slides |

## Getting Started

1. Navigate to **PPT** from the sidebar
2. Click **New Presentation** or generate one with AI
3. Enter a topic and the AI creates a complete slide deck
4. Edit individual slides in the visual editor
5. Export to your preferred format

## AI Generation

Describe your presentation topic and the AI generates:

- Title slide with appropriate styling
- Content slides with bullet points
- Section dividers
- Summary/conclusion slides
- Speaker notes

## Architecture

```text
app/(main)/ppt/                    → PPT pages
  ├── page.tsx                     → Presentation gallery
  └── editor/                      → Slide editor page
components/ppt/                    → 61 PPT components
  ├── slide-editor.tsx             → Visual slide editor
  ├── slide-preview.tsx            → Slide preview renderer
  ├── slide-sorter.tsx             → Slide reordering
  ├── ppt-generator.tsx            → AI generation dialog
  └── ppt-export-dialog.tsx        → Export format selector
hooks/ppt/                         → PPT hooks
stores/tools/ppt-editor-store.ts   → Presentation state
```

## Export Formats

- **PPTX**: Native PowerPoint format
- **PDF**: Portable document format
- **Images**: Export slides as PNG/JPEG
