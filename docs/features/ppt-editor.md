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

### Canva-Like Generation Contract

When `ppt.canvaExperience.v1` is enabled, generation requests carry a typed `generationBlueprint`:

- `templateDirection`: storytelling, pitch-deck, reporting, educational, product-showcase, portfolio
- `audienceTone`: executive, professional, friendly, academic, creative
- `contentDensity`: light, balanced, dense
- `styleKitId`: canva-clean, canva-bold, canva-elegant, canva-playful
- `styleTokens`: normalized palette, typography pair, spacing rhythm, visual weight, corner radius

The blueprint is normalized before generation and persisted in presentation metadata to keep regenerate behavior deterministic.

### Feature Flag

- Flag: `ppt.canvaExperience.v1`
- Default: `false`
- Env override: `NEXT_PUBLIC_PPT_CANVA_EXPERIENCE_V1=true|false|1|0`
- Local override key: `cognia-ppt-feature-flags-v1`

Creation and editor surfaces automatically fall back to the legacy flow when the flag is disabled.

### Quick Actions and Snapshot Recovery

In Canva-like mode, the editor exposes bounded quick actions:

- Layout swap
- Auto-fit content
- Rebalance hierarchy
- Section regenerate
- Layout-safe media replace

Each action records a semantic generation snapshot (action type, source snapshot id, affected slide ids, timestamp, captured presentation state). Snapshot restore keeps slide identifiers stable so selection, preview/slideshow, and export flows remain continuous.

### Guardrails

- Generation and regenerate paths enforce active style-kit normalization before persistence.
- Quick actions operate on existing slide IDs instead of replacing slides wholesale.
- Snapshot restore adds a recovery checkpoint so users can move backward/forward safely.
- Export/present flows are expected to remain functional across quick-action and restore transitions.

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
