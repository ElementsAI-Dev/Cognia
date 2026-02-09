# Screenshot Editor

A comprehensive screenshot capture and annotation system with 9 drawing tools, resize handles, magnifier, and undo/redo support.

## Overview

| Feature | Description |
|---------|-------------|
| **Multi-mode Capture** | Fullscreen, window, and region capture |
| **9 Annotation Tools** | Rectangle, ellipse, arrow, freehand, text, blur, highlight, marker |
| **Resize Handles** | 8-point resize with magnifier loupe |
| **Undo/Redo** | 50-step history depth |
| **OCR** | Optical character recognition on captured images |
| **Color Picker** | 10 preset colors with keyboard shortcuts |
| **Searchable History** | Browse and search past screenshots |

## Annotation Tools

| Tool | Shortcut | Description |
|------|----------|-------------|
| Rectangle | R | Draw rectangles |
| Ellipse | E | Draw ellipses |
| Arrow | A | Draw arrows |
| Freehand | F | Freeform drawing |
| Text | T | Add text annotations |
| Blur | B | Blur sensitive areas |
| Highlight | H | Highlight regions |
| Marker | M | Marker pen |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| R/E/A/F/T/B/H/M | Select annotation tool |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Delete | Remove selected annotation |
| M | Toggle magnifier loupe |
| 1-0 | Select preset color |

## Architecture

```text
components/screenshot/              → Screenshot UI components
  ├── screenshot-editor.tsx         → Main annotation editor
  ├── annotation-toolbar.tsx        → Tool selection bar
  ├── color-picker.tsx              → Color selection
  └── screenshot-history.tsx        → History browser
stores/screenshot/                  → Editor state
  └── editor-store.ts              → Annotation and tool state
src-tauri/src/screenshot/           → Rust screenshot backend
  ├── capture.rs                   → Screen capture logic
  ├── ocr.rs                       → OCR processing
  └── history.rs                   → Screenshot persistence
```

## Desktop Only

Screenshot capture requires the Tauri desktop app for system-level screen access. The annotation editor can work with any image in browser mode.
