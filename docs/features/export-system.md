# Export System

The Export System provides comprehensive data export capabilities for conversations, artifacts, and documents in multiple formats.

## Overview

| Feature | Description |
|---------|-------------|
| **Chat Export** | Export conversations as Markdown, JSON, PDF, or HTML |
| **Artifact Export** | Export generated artifacts with metadata |
| **Batch Export** | Export multiple sessions at once |
| **Import** | Import conversations from ChatGPT, Claude, and Gemini |
| **Format Options** | Configurable export formatting and templates |

## Supported Export Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| Markdown | `.md` | Clean markdown with code blocks |
| JSON | `.json` | Structured data with full metadata |
| PDF | `.pdf` | Formatted document |
| HTML | `.html` | Styled web page |
| Plain Text | `.txt` | Simple text output |

## Architecture

```text
components/export/                   → 16 export UI components
  ├── export-dialog.tsx              → Export format selector
  ├── export-preview.tsx             → Preview before download
  └── batch-export.tsx               → Multi-session export
lib/export/                          → 52 export utilities
  ├── markdown-exporter.ts           → Markdown generation
  ├── pdf-exporter.ts                → PDF generation
  ├── html-exporter.ts               → HTML generation
  └── json-exporter.ts               → JSON serialization
```

## Import Support

Cognia supports importing chat history from:

- **ChatGPT**: JSON export files
- **Claude**: Conversation archives
- **Gemini**: Google Takeout data

See the import dialog in Settings for format details.
