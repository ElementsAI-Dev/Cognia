# LaTeX Editor

A full-featured LaTeX editing environment with live preview, template library, AI assistance, and document history management.

## Overview

| Feature | Description |
|---------|-------------|
| **Live Preview** | Real-time KaTeX rendering with equation numbering |
| **Templates** | Categorized template library (articles, letters, CVs, etc.) |
| **AI Assistance** | Generate equations, proofread, translate, and improve text |
| **Document History** | Save, load, rename, duplicate, and delete documents |
| **Export** | Export to PDF, HTML, or raw LaTeX |
| **Equation Dialog** | AI-powered equation generation from natural language |
| **Formula Cache** | LRU cache for 50-80% render time reduction |

## Getting Started

1. Navigate to **LaTeX** from the sidebar
2. Start typing LaTeX in the editor pane
3. Preview updates in real-time on the right
4. Use **Templates** to bootstrap common document types
5. Click **Save** to persist your document

## AI Features

### Equation Generation

Describe an equation in natural language and the AI generates valid LaTeX:

- "Euler's identity" → `e^{i\pi} + 1 = 0`
- "Bayes' theorem" → `P(A|B) = \frac{P(B|A)P(A)}{P(B)}`

### Text Actions

Select text and apply AI-powered actions:

- **Proofread**: Fix grammar and style
- **Improve**: Enhance clarity and flow
- **Translate**: Convert to another language
- **Simplify**: Reduce complexity
- **Expand**: Add more detail

## Architecture

```
app/(main)/latex/page.tsx                → LaTeX editor page
components/academic/latex-editor/        → Editor components
  ├── latex-editor.tsx                   → Main editor with Monaco
  ├── latex-preview.tsx                  → KaTeX preview pane
  ├── latex-equation-dialog.tsx          → AI equation generator
  ├── template-selector.tsx              → Template browser
  └── template-dialog-content.tsx        → Template detail dialog
components/latex/                        → Export components
  └── latex-export-dialog.tsx            → Export format selector
lib/latex/                               → Core LaTeX utilities
  ├── config.ts                          → Unified KaTeX configuration
  ├── cache.ts                           → Formula render cache (LRU)
  └── index.ts                           → Module exports
hooks/latex/                             → useLatex, useLatexAI hooks
stores/latex/                            → Document history persistence
```

## Configuration

KaTeX macros support 30+ common math macros including:

- Number sets: `\R`, `\N`, `\Z`, `\Q`, `\C`
- Operators: `\argmax`, `\argmin`, `\softmax`
- ML notation: `\KL`, `\E`, `\Var`

## Error Handling

The Math Error Boundary provides graceful degradation:

- Displays raw LaTeX when rendering fails
- Offers retry and copy-to-clipboard functionality
- Supports i18n error messages (English and Chinese)
