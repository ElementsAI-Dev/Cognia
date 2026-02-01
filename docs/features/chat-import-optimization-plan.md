# Chat Import Optimization Plan

Multi-platform AI chat history import support for Cognia.

## 1. Executive Summary

Extend the existing ChatGPT import functionality to support **Claude (Anthropic)** and **Google Gemini** chat history imports. This enables users to consolidate their AI conversation history from multiple platforms into Cognia.

### Goals

- Add Claude conversation import support
- Add Gemini conversation import support (via Google Takeout)
- Unify import architecture for extensibility
- Maintain backward compatibility with existing ChatGPT import

---

## 2. Current Implementation Analysis

### 2.1 Existing Architecture

| Component | Location | Purpose |
|-----------|----------|---------|
| Type Definitions | `types/import/chatgpt.ts` | ChatGPT-specific type interfaces |
| Import Index | `types/import/index.ts` | Shared types and format enum |
| Parser/Converter | `lib/storage/chatgpt-import.ts` | Format detection, parsing, conversion |
| UI Dialog | `components/chat/dialogs/chat-import-dialog.tsx` | User-facing import wizard |
| Tests | `lib/storage/chatgpt-import.test.ts` | Unit tests for import logic |

### 2.2 ChatGPT Export Format Structure

```typescript
interface ChatGPTConversation {
  id: string;
  title: string;
  create_time: number;        // Unix timestamp
  update_time: number;        // Unix timestamp
  mapping: Record<string, ChatGPTNode>;  // Tree structure
  current_node: string;       // Active branch endpoint
}

interface ChatGPTNode {
  id: string;
  message: ChatGPTMessage | null;
  parent: string | null;
  children: string[];
}

interface ChatGPTMessage {
  id: string;
  author: { role: 'user' | 'assistant' | 'system' | 'tool' };
  create_time: number;
  content: { content_type: string; parts: Array<string | object> };
  metadata?: { model_slug?: string };
}
```

### 2.3 Key Features of Current Implementation

- **Tree-based message extraction**: Follows conversation branches from root to `current_node`
- **Format auto-detection**: `detectImportFormat()` identifies ChatGPT vs Cognia formats
- **Preview before import**: Users can review conversations before committing
- **Configurable options**: Preserve timestamps, generate new IDs, merge strategies
- **Batch import**: Handles multiple conversations in a single file

---

## 3. Platform Research

### 3.1 Claude (Anthropic) Export Format

#### Export Method
Users can export data via **Settings > Privacy > Export data** on claude.ai. An email with a download link is sent containing a ZIP archive.

#### Data Structure (Based on Research)

```typescript
interface ClaudeExport {
  meta: {
    exported_at: string;      // ISO 8601 timestamp
    title: string;            // Conversation title
  };
  chats: ClaudeChat[];
}

interface ClaudeChat {
  index: number;
  type: 'prompt' | 'response';
  message: ClaudeMessagePart[];
}

interface ClaudeMessagePart {
  type: 'p' | 'pre' | 'code' | 'list' | 'table';
  data: string;
  language?: string;          // For code blocks
}
```

#### Key Characteristics

- **Flat message array**: Unlike ChatGPT's tree structure, Claude uses sequential messages
- **Rich content types**: Supports paragraphs, code blocks with language hints, lists, tables
- **Export via email**: Not direct download - requires email verification
- **No branching**: Linear conversation history only
- **Artifacts**: May include separate artifact files (code, documents)

#### Detection Signature
```typescript
function isClaudeFormat(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    'meta' in data &&
    'chats' in data &&
    Array.isArray(data.chats)
  );
}
```

### 3.2 Google Gemini Export Format

#### Export Method
Two primary methods:
1. **Google Takeout**: takeout.google.com - Select "Gemini" to download conversation history
2. **Third-party extensions**: Browser extensions that scrape the UI

#### Google Takeout Data Structure

```typescript
interface GeminiTakeoutExport {
  conversations: GeminiConversation[];
}

interface GeminiConversation {
  id: string;
  title: string;
  create_time: string;        // ISO 8601 timestamp
  update_time: string;        // ISO 8601 timestamp
  messages: GeminiMessage[];
}

interface GeminiMessage {
  role: 'user' | 'model';     // Note: 'model' not 'assistant'
  content: string;
  timestamp: string;
  metadata?: {
    model_version?: string;
    attachments?: GeminiAttachment[];
  };
}

interface GeminiAttachment {
  type: 'image' | 'file' | 'code';
  name: string;
  mime_type?: string;
  content?: string;           // Base64 or text
}
```

#### Key Characteristics

- **Linear messages**: Sequential message array, no branching
- **Role naming**: Uses 'model' instead of 'assistant'
- **Google Workspace integration**: May include references to Docs/Sheets exports
- **Timestamp format**: ISO 8601 strings, not Unix timestamps
- **Multi-modal support**: Images and file attachments possible

#### Detection Signature
```typescript
function isGeminiFormat(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  
  // Check for Takeout format
  if ('conversations' in data && Array.isArray(data.conversations)) {
    const first = data.conversations[0];
    return first && 'messages' in first && Array.isArray(first.messages);
  }
  
  // Check for extension-exported format
  if ('messages' in data && Array.isArray(data.messages)) {
    const first = data.messages[0];
    return first && 'role' in first && (first.role === 'user' || first.role === 'model');
  }
  
  return false;
}
```

---

## 4. Platform Comparison

| Feature | ChatGPT | Claude | Gemini |
|---------|---------|--------|--------|
| Export Method | Data export menu | Settings > Privacy | Google Takeout |
| File Format | JSON | JSON (ZIP) | JSON |
| Message Structure | Tree (branching) | Flat array | Flat array |
| Role Names | user/assistant/system/tool | prompt/response | user/model |
| Timestamps | Unix (seconds) | ISO 8601 | ISO 8601 |
| Code Blocks | In content.parts | Separate type with language | In content string |
| Attachments | asset_pointer references | Separate artifacts | Inline or references |
| Conversation Branching | Yes (mapping tree) | No | No |
| Multi-turn | Yes | Yes | Yes |
| Model Info | metadata.model_slug | Not in standard export | metadata.model_version |

---

## 5. Implementation Plan

### Phase 1: Architecture Refactoring (Week 1)

#### 5.1.1 Create Unified Import Interface

```typescript
// types/import/base.ts
interface ChatImporter<T> {
  detect(data: unknown): data is T;
  parse(data: T, options: ChatImportOptions): ParsedConversation[];
  getProviderInfo(): { name: string; defaultModel: string };
}

interface ParsedConversation {
  session: Session;
  messages: UIMessage[];
  metadata?: Record<string, unknown>;
}
```

#### 5.1.2 Refactor Existing ChatGPT Importer

- Extract `ChatGPTImporter` class implementing `ChatImporter<ChatGPTConversation[]>`
- Move detection logic into class method
- Maintain backward compatibility with existing exports

#### Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| Create | `types/import/base.ts` | Base importer interface |
| Create | `types/import/claude.ts` | Claude type definitions |
| Create | `types/import/gemini.ts` | Gemini type definitions |
| Modify | `types/import/index.ts` | Export new types, extend format enum |
| Refactor | `lib/storage/chatgpt-import.ts` | Extract to class pattern |

### Phase 2: Claude Import Support (Week 2)

#### 5.2.1 Type Definitions

```typescript
// types/import/claude.ts
export interface ClaudeExport {
  meta: ClaudeMeta;
  chats: ClaudeChat[];
}

export interface ClaudeMeta {
  exported_at: string;
  title: string;
  conversation_id?: string;
}

export interface ClaudeChat {
  index: number;
  type: 'prompt' | 'response';
  message: ClaudeMessagePart[];
}

export interface ClaudeMessagePart {
  type: 'p' | 'pre' | 'code' | 'list' | 'ul' | 'ol' | 'table' | 'blockquote';
  data: string;
  language?: string;
}
```

#### 5.2.2 Parser Implementation

```typescript
// lib/storage/claude-import.ts
export class ClaudeImporter implements ChatImporter<ClaudeExport> {
  detect(data: unknown): data is ClaudeExport { /* ... */ }
  
  parse(data: ClaudeExport, options: ChatImportOptions): ParsedConversation[] {
    // Convert ClaudeChat[] to UIMessage[]
    // Map 'prompt' -> 'user', 'response' -> 'assistant'
    // Reconstruct content from message parts
  }
  
  getProviderInfo() {
    return { name: 'anthropic', defaultModel: 'claude-3-opus' };
  }
}
```

#### Files to Create

| File | Description |
|------|-------------|
| `lib/storage/claude-import.ts` | Claude parser and converter |
| `lib/storage/claude-import.test.ts` | Unit tests |

### Phase 3: Gemini Import Support (Week 3)

#### 5.3.1 Type Definitions

```typescript
// types/import/gemini.ts
export interface GeminiTakeoutExport {
  conversations: GeminiConversation[];
}

export interface GeminiConversation {
  id: string;
  title: string;
  create_time: string;
  update_time: string;
  messages: GeminiMessage[];
}

export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  metadata?: GeminiMessageMetadata;
}

export interface GeminiMessageMetadata {
  model_version?: string;
  attachments?: GeminiAttachment[];
}

export interface GeminiAttachment {
  type: 'image' | 'file' | 'code';
  name: string;
  mime_type?: string;
}

// Also support simple extension format
export interface GeminiSimpleExport {
  messages: Array<{
    role: 'user' | 'model';
    content: Array<{ type: 'text'; text: string }>;
  }>;
}
```

#### 5.3.2 Parser Implementation

```typescript
// lib/storage/gemini-import.ts
export class GeminiImporter implements ChatImporter<GeminiTakeoutExport | GeminiSimpleExport> {
  detect(data: unknown): boolean {
    return this.isTakeoutFormat(data) || this.isSimpleFormat(data);
  }
  
  parse(data: GeminiTakeoutExport | GeminiSimpleExport, options: ChatImportOptions): ParsedConversation[] {
    // Handle both formats
    // Map 'model' -> 'assistant'
    // Parse ISO timestamps
  }
  
  getProviderInfo() {
    return { name: 'google', defaultModel: 'gemini-pro' };
  }
}
```

#### Files to Create

| File | Description |
|------|-------------|
| `lib/storage/gemini-import.ts` | Gemini parser and converter |
| `lib/storage/gemini-import.test.ts` | Unit tests |

### Phase 4: Unified Import System (Week 4)

#### 5.4.1 Import Registry

```typescript
// lib/storage/import-registry.ts
import { ChatGPTImporter } from './chatgpt-import';
import { ClaudeImporter } from './claude-import';
import { GeminiImporter } from './gemini-import';

const importers = [
  new ChatGPTImporter(),
  new ClaudeImporter(),
  new GeminiImporter(),
];

export function detectFormat(data: unknown): ChatImportFormat {
  for (const importer of importers) {
    if (importer.detect(data)) {
      return importer.getFormat();
    }
  }
  return 'unknown';
}

export function getImporter(format: ChatImportFormat): ChatImporter<unknown> | null {
  return importers.find(i => i.getFormat() === format) || null;
}
```

#### 5.4.2 Update UI Dialog

Modify `chat-import-dialog.tsx` to:
- Display detected format with platform icon
- Show platform-specific import options
- Support format-specific preview rendering

#### Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| Create | `lib/storage/import-registry.ts` | Central importer registry |
| Create | `lib/storage/index.ts` | Barrel exports |
| Modify | `components/chat/dialogs/chat-import-dialog.tsx` | Multi-format UI |

### Phase 5: UI Enhancements (Week 5)

#### 5.5.1 Platform Icons and Branding

- Add OpenAI, Anthropic, Google icons to import preview
- Show detected platform name prominently
- Platform-specific color accents

#### 5.5.2 Enhanced Preview

- Show model information when available
- Display attachment counts
- Conversation statistics (word count, duration)

#### 5.5.3 Batch Import Improvements

- Support importing multiple files at once
- Progress indicator for large imports
- Selective conversation import (checkboxes)

---

## 6. Risk Assessment

### 6.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Format changes by platforms | High | Version detection, graceful degradation |
| Large file handling | Medium | Streaming parser, chunked processing |
| Encoding issues | Low | UTF-8 normalization, BOM handling |
| Memory usage | Medium | Process conversations incrementally |

### 6.2 Data Compatibility Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing message content | High | Validation warnings, skip invalid |
| Timestamp parsing failures | Medium | Fallback to import time |
| Unsupported content types | Low | Placeholder text, logging |
| Duplicate detection | Medium | Content hashing, user confirmation |

### 6.3 User Experience Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Confusing format errors | High | Clear error messages with guidance |
| Long import times | Medium | Progress feedback, background processing |
| Data loss perception | High | Preview step, undo support |

---

## 7. Testing Strategy

### 7.1 Unit Tests

Each importer needs comprehensive tests:

```typescript
// Example test structure
describe('ClaudeImporter', () => {
  describe('detect()', () => {
    it('should detect valid Claude export format');
    it('should reject ChatGPT format');
    it('should reject malformed data');
  });

  describe('parse()', () => {
    it('should convert prompt to user role');
    it('should convert response to assistant role');
    it('should preserve timestamps');
    it('should handle code blocks with language');
    it('should handle empty conversations');
  });
});
```

### 7.2 Integration Tests

```typescript
describe('Import Integration', () => {
  it('should import ChatGPT conversations to IndexedDB');
  it('should import Claude conversations to IndexedDB');
  it('should import Gemini conversations to IndexedDB');
  it('should handle mixed format detection');
});
```

### 7.3 E2E Tests

```typescript
// e2e/features/chat-import.spec.ts
test('should complete ChatGPT import flow', async ({ page }) => {
  // Upload file, verify preview, confirm import, check sidebar
});

test('should complete Claude import flow', async ({ page }) => {
  // Similar flow for Claude format
});

test('should complete Gemini import flow', async ({ page }) => {
  // Similar flow for Gemini format
});
```

### 7.4 Test Data

Create sample export files for each platform:

| File | Description |
|------|-------------|
| `fixtures/chatgpt-sample.json` | Valid ChatGPT export with multiple conversations |
| `fixtures/claude-sample.json` | Valid Claude export with code blocks |
| `fixtures/gemini-takeout.json` | Valid Gemini Takeout export |
| `fixtures/gemini-simple.json` | Extension-style Gemini export |
| `fixtures/invalid-*.json` | Various malformed inputs |

---

## 8. Localization

Add translation keys for new platforms:

```json
{
  "import": {
    "formats": {
      "chatgpt": "ChatGPT",
      "claude": "Claude (Anthropic)",
      "gemini": "Gemini (Google)",
      "cognia": "Cognia Export"
    },
    "detected": "Detected format: {{format}}",
    "platformHint": {
      "chatgpt": "Export from ChatGPT: Settings > Data controls > Export data",
      "claude": "Export from Claude: Settings > Privacy > Export data",
      "gemini": "Export from Gemini: Use Google Takeout (takeout.google.com)"
    }
  }
}
```

---

## 9. File Structure Summary

### New Files

```
types/import/
├── base.ts              # Base importer interface
├── claude.ts            # Claude type definitions
├── gemini.ts            # Gemini type definitions
└── index.ts             # Updated exports

lib/storage/
├── claude-import.ts     # Claude parser
├── claude-import.test.ts
├── gemini-import.ts     # Gemini parser
├── gemini-import.test.ts
├── import-registry.ts   # Unified registry
└── index.ts             # Updated exports

fixtures/
├── chatgpt-sample.json
├── claude-sample.json
├── gemini-takeout.json
└── gemini-simple.json
```

### Modified Files

```
types/import/index.ts           # Extend ChatImportFormat enum
lib/storage/chatgpt-import.ts   # Refactor to class pattern
components/chat/dialogs/chat-import-dialog.tsx  # Multi-format support
```

---

## 10. Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Architecture | Base interface, ChatGPT refactor |
| 2 | Claude Support | Types, parser, tests |
| 3 | Gemini Support | Types, parser, tests |
| 4 | Integration | Registry, unified detection |
| 5 | UI Polish | Icons, preview, i18n |
| 6 | Testing/QA | E2E tests, bug fixes |

---

## 11. Future Considerations

### Potential Additional Platforms

- **Microsoft Copilot**: Similar export structure expected
- **Perplexity AI**: May have export functionality
- **Poe**: Multi-model chat aggregator
- **Character.AI**: Different conversation paradigm

### Advanced Features

- **Incremental import**: Only import new conversations since last import
- **Cloud sync**: Direct API integration (where available)
- **Export to other platforms**: Reverse conversion
- **Conversation merging**: Combine related conversations across platforms

---

## 12. References

### Platform Documentation

- ChatGPT Export: https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data
- Claude Export: https://support.claude.com/en/articles/9450526-how-can-i-export-my-claude-data
- Google Takeout: https://takeout.google.com

### Third-Party Tools (Research Reference)

- claude-export: https://github.com/ryanschiang/claude-export
- gemini-conversation-downloader: https://github.com/GeoAnima/Gemini-Conversation-Downloader
- chat-exporter (multi-platform): https://github.com/bvarjavand/chat-exporter

---

## Appendix A: Sample Data Formats

### A.1 ChatGPT Export Sample

```json
[
  {
    "id": "conv-123",
    "title": "React hooks discussion",
    "create_time": 1704067200,
    "update_time": 1704070800,
    "mapping": {
      "node-1": {
        "id": "node-1",
        "message": null,
        "parent": null,
        "children": ["node-2"]
      },
      "node-2": {
        "id": "node-2",
        "message": {
          "id": "msg-1",
          "author": { "role": "user" },
          "create_time": 1704067200,
          "content": {
            "content_type": "text",
            "parts": ["How do React hooks work?"]
          }
        },
        "parent": "node-1",
        "children": ["node-3"]
      }
    },
    "current_node": "node-3"
  }
]
```

### A.2 Claude Export Sample

```json
{
  "meta": {
    "exported_at": "2024-01-01T12:00:00Z",
    "title": "Code review session"
  },
  "chats": [
    {
      "index": 0,
      "type": "prompt",
      "message": [
        { "type": "p", "data": "Can you review this Python function?" },
        { "type": "pre", "language": "python", "data": "def add(a, b):\n    return a + b" }
      ]
    },
    {
      "index": 1,
      "type": "response",
      "message": [
        { "type": "p", "data": "The function looks good! Here are some suggestions:" },
        { "type": "list", "data": "Add type hints\nAdd docstring\nConsider edge cases" }
      ]
    }
  ]
}
```

### A.3 Gemini Takeout Export Sample

```json
{
  "conversations": [
    {
      "id": "gemini-conv-456",
      "title": "Travel planning",
      "create_time": "2024-01-01T10:00:00Z",
      "update_time": "2024-01-01T10:30:00Z",
      "messages": [
        {
          "role": "user",
          "content": "Plan a 5-day trip to Tokyo",
          "timestamp": "2024-01-01T10:00:00Z"
        },
        {
          "role": "model",
          "content": "Here's a suggested 5-day Tokyo itinerary...",
          "timestamp": "2024-01-01T10:00:15Z",
          "metadata": {
            "model_version": "gemini-pro"
          }
        }
      ]
    }
  ]
}
```
