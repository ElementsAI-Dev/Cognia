# Selection Toolbar Enhancements

This document describes the enhanced desktop text selection (划词) features implemented in Cognia.

## Overview

The selection toolbar provides a powerful floating interface that appears when text is selected, offering AI-powered actions, quick translations, and various text processing features.

## Features

### 1. Global Keyboard Shortcuts

New global shortcuts for quick access to selection features:

| Shortcut | Action |
|----------|--------|
| `Alt + Space` | Trigger selection toolbar manually |
| `Ctrl + Shift + T` | Quick translate selected text |
| `Ctrl + Shift + E` | Quick explain selected text |
| `Ctrl + Shift + Space` | Toggle chat widget |

**Implementation**: `src-tauri/src/lib.rs` - Global shortcuts registered via `tauri_plugin_global_shortcut`

### 2. Clipboard Monitoring

Real-time clipboard monitoring with intelligent content analysis:

- **Auto-detection**: Monitors clipboard changes every second
- **Content Analysis**: Automatically categorizes content (code, URL, email, text)
- **Language Detection**: Detects programming languages in code snippets
- **Suggested Actions**: Context-aware action suggestions based on content type

**Components**:

- `hooks/ui/use-clipboard-monitor.ts` - Clipboard monitoring hook
- `components/selection-toolbar/clipboard-panel.tsx` - Clipboard history panel

### 3. Enhanced Toolbar UI/UX

Improved visual design and interaction patterns:

- **Shortcut Hints Panel**: Shows all available keyboard shortcuts
- **Quick Actions Grid**: Fast access to common operations
- **Pinned Actions**: Customize frequently used actions
- **Usage Tracking**: Tracks action usage for smart suggestions

**Components**:

- `components/selection-toolbar/shortcut-hints.tsx` - Keyboard shortcuts reference
- `components/selection-toolbar/quick-actions.tsx` - Quick action grid with pinning

### 4. Selection History Panel

Complete history management with search and filtering:

- **Search**: Full-text search across history
- **Filtering**: Filter by action type
- **Batch Operations**: Select multiple items for bulk actions
- **Export**: Export history as JSON
- **Favorites**: Pin important selections

**Component**: `components/selection-toolbar/history-panel.tsx`

### 5. AI Actions with Streaming

Enhanced AI processing with real-time feedback:

- **Streaming Responses**: Live text generation display
- **Error Handling**: Clear error messages with retry options
- **Feedback Collection**: Thumbs up/down for response quality
- **Word Count**: Display word count for results

**Component**: `components/selection-toolbar/result-panel.tsx`

### 6. OCR Text Recognition

Extract text from images using Windows OCR:

- **Multiple Input Methods**: Upload, paste from clipboard, or screen capture
- **Language Support**: Auto-detect or specify language
- **Quick Actions**: Apply AI actions directly to extracted text
- **Confidence Display**: Shows OCR confidence level

**Component**: `components/selection-toolbar/ocr-panel.tsx`

### 7. Prompt Templates

Customizable prompt templates for common tasks:

- **Built-in Templates**: Translation, explanation, summarization, code review
- **Custom Templates**: Create and manage personal templates
- **Categories**: Organize by Translation, Explanation, Code, etc.
- **Favorites**: Quick access to frequently used templates
- **Variables**: Use `{{text}}` placeholder for selected text

**Component**: `components/selection-toolbar/templates-panel.tsx`

### 8. Multi-Selection Mode

Select and process multiple text snippets:

- **Multi-select Toggle**: Enable to collect multiple selections
- **Combined Processing**: Process all selections together
- **Reference System**: Add context from files, URLs, or notes
- **Smart Expansion**: Expand selection to word, sentence, or paragraph

**Implementation**: `stores/context/selection-store/`

### 9. Settings Panel

Comprehensive configuration options:

- **Trigger Mode**: Auto or shortcut-based activation
- **Theme Selection**: Dark, light, glass, or auto
- **Position Preferences**: Near cursor, center, top, or bottom
- **Presets**: Minimal, Writer, Researcher, Developer modes
- **Action Customization**: Pin/unpin actions, reorder

**Component**: `components/selection-toolbar/settings-panel.tsx`

## Backend Features (Rust)

### Selection Detection (`src-tauri/src/selection/`)

- **Mouse Hook**: Captures mouse events for selection detection
- **Text Extraction**: Gets selected text from system clipboard
- **Smart Selection**: Expands selection intelligently (word, sentence, paragraph)
- **History Tracking**: Records selection history with metadata

### Toolbar Window Management

- **Floating Window**: Always-on-top, transparent window
- **Multi-Monitor Support**: Proper positioning across monitors
- **Auto-hide**: Configurable auto-hide timeout
- **Hover Detection**: Prevents hiding when mouse is over toolbar

## Component Exports

All components are exported from `components/selection-toolbar/index.ts`:

```typescript
export { SelectionToolbar } from "./toolbar";
export { ToolbarButton } from "./toolbar-button";
export { ResultPanel } from "./result-panel";
export { SelectionToolbarSettings } from "./settings-panel";
export { SelectionHistoryPanel } from "./history-panel";
export { ClipboardPanel } from "./clipboard-panel";
export { ShortcutHints, ShortcutHintsBadge } from "./shortcut-hints";
export { QuickActions } from "./quick-actions";
export { OCRPanel } from "./ocr-panel";
export { TemplatesPanel } from "./templates-panel";
```

## Hook Exports

Hooks are exported from `hooks/ui/index.ts`:

```typescript
export { useClipboardMonitor } from './use-clipboard-monitor';
export { useSelectionToolbar } from './use-selection-toolbar';
```

## Usage

### Basic Usage

The selection toolbar automatically appears when text is selected (in auto mode):

1. Select any text on screen
2. Toolbar appears above the selection
3. Click an action or use keyboard shortcut
4. View result in the result panel

### Using Templates

1. Open templates panel from toolbar menu
2. Select or create a template
3. Template prompt is applied with selected text
4. AI processes and displays result

### OCR Workflow

1. Open OCR panel from toolbar menu
2. Upload image, paste from clipboard, or capture screen
3. Text is extracted automatically
4. Apply actions to extracted text

## Keyboard Shortcuts (In Toolbar)

| Key | Action |
|-----|--------|
| `E` | Explain |
| `T` | Translate |
| `S` | Summarize |
| `D` | Define |
| `R` | Rewrite |
| `G` | Grammar check |
| `C` | Copy |
| `F` | Web search |
| `X` | Explain code |
| `O` | Optimize code |
| `K` | Extract key points |
| `Enter` | Send to chat |
| `Esc` | Close toolbar |
| `?` | Show shortcuts |

## Configuration

Configuration is managed through `SelectionConfig`:

```typescript
interface SelectionConfig {
  enabled: boolean;
  trigger_mode: "auto" | "shortcut";
  min_text_length: number;
  max_text_length: number;
  delay_ms: number;
  target_language: string;
  excluded_apps: string[];
}
```

## Events

The selection system emits various Tauri events:

- `selection-detected` - When text is selected
- `selection-toolbar-show` - When toolbar becomes visible
- `selection-toolbar-hide` - When toolbar is hidden
- `selection-quick-translate` - Quick translate triggered
- `selection-quick-action` - Quick action triggered
- `clipboard-content-changed` - Clipboard content changed
