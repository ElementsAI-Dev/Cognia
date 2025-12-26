# Utility Functions Reference

This document provides a comprehensive reference for utility functions and libraries in the Cognia application.

## Table of Contents

- [AI Integration Utilities](#ai-integration-utilities)
  - [Client Creation](#client-creation)
  - [Chat Hook](#chat-hook)
  - [Auto Router](#auto-router)
  - [Image Generation](#image-generation)
  - [Speech API](#speech-api)
- [Export Utilities](#export-utilities)
- [Common Utilities](#common-utilities)
- [Related Documentation](#related-documentation)

---

## AI Integration Utilities

### Client Creation

**Location**: `lib/ai/client.ts`

Provides factory functions for creating AI provider client instances using Vercel AI SDK.

#### Functions

##### `createOpenAIClient(apiKey: string)`

Creates an OpenAI provider instance.

```typescript
import { createOpenAIClient } from '@/lib/ai/client';

const openai = createOpenAIClient('sk-...');
const model = openai('gpt-4o');
```

##### `createAnthropicClient(apiKey: string)`

Creates an Anthropic provider instance.

```typescript
import { createAnthropicClient } from '@/lib/ai/client';

const anthropic = createAnthropicClient('sk-ant-...');
const model = anthropic('claude-sonnet-4-20250514');
```

##### `createGoogleClient(apiKey: string)`

Creates a Google AI provider instance.

```typescript
import { createGoogleClient } from '@/lib/ai/client';

const google = createGoogleClient('your-api-key');
const model = google('gemini-2.0-flash-exp');
```

##### `createMistralClient(apiKey: string)`

Creates a Mistral provider instance.

```typescript
import { createMistralClient } from '@/lib/ai/client';

const mistral = createMistralClient('your-api-key');
const model = mistral('mistral-large-latest');
```

##### `createDeepSeekClient(apiKey: string)`

Creates a DeepSeek provider instance (OpenAI-compatible).

```typescript
import { createDeepSeekClient } from '@/lib/ai/client';

const deepseek = createDeepSeekClient('sk-...');
const model = deepseek('deepseek-chat');
```

##### `createGroqClient(apiKey: string)`

Creates a Groq provider instance (OpenAI-compatible).

```typescript
import { createGroqClient } from '@/lib/ai/client';

const groq = createGroqClient('gsk-...');
const model = groq('llama-3.3-70b-versatile');
```

##### `createXaiClient(apiKey: string)`

Creates an xAI (Grok) provider instance (OpenAI-compatible).

```typescript
import { createXaiClient } from '@/lib/ai/client';

const xai = createXaiClient('your-api-key');
const model = xai('grok-beta');
```

##### `getProviderModel(provider: ProviderName, model: string, apiKey: string)`

Generic function to get a model instance from any provider.

```typescript
import { getProviderModel } from '@/lib/ai/client';

const model = getProviderModel('openai', 'gpt-4o', 'sk-...');
```

#### Types

```typescript
export interface ProviderConfig {
  provider: ProviderName;
  model?: string;
  apiKey: string;
  baseURL?: string;
}

export type ProviderName =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mistral'
  | 'deepseek'
  | 'groq'
  | 'xai'
  | 'ollama';
```

---

### Chat Hook

**Location**: `lib/ai/use-ai-chat.ts`

React hook for AI chat functionality with streaming, multimodal support, and usage tracking.

#### `useAIChat(options)`

Main hook for chat functionality.

##### Signature

```typescript
function useAIChat(options: UseAIChatOptions): {
  sendMessage: (messages: MultimodalMessage[], options?: SendMessageOptions) => Promise<ChatFinishResult>;
  streamMessage: (messages: MultimodalMessage[], options?: SendMessageOptions) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}
```

##### Options

```typescript
interface UseAIChatOptions {
  provider: ProviderName;
  model: string;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onError?: (error: Error) => void;
  onFinish?: (result: ChatFinishResult) => void;
  onStepFinish?: (step: ChatStepResult) => void;
  extractReasoning?: boolean;
  reasoningTagName?: string;
}

interface SendMessageOptions {
  messages: MultimodalMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  sessionId?: string;
  messageId?: string;
  tools?: Record<string, unknown>;
  headers?: Record<string, string>;
}
```

##### Return Types

```typescript
interface ChatFinishResult {
  text: string;
  usage?: ChatUsageInfo;
  finishReason?: string;
  reasoning?: string;
}

interface ChatUsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface MultimodalMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | MultimodalContent[];
}

interface MultimodalContent {
  type: 'image' | 'text';
  image?: string; // base64 data
  mimeType?: string;
  text?: string;
}
```

##### Usage Example

```typescript
import { useAIChat } from '@/lib/ai';

function ChatComponent() {
  const { sendMessage, isLoading, error } = useAIChat({
    provider: 'openai',
    model: 'gpt-4o',
    onFinish: (result) => {
      console.log('Tokens used:', result.usage?.totalTokens);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  const handleSend = async (message: string) => {
    await sendMessage([
      { role: 'user', content: message }
    ]);
  };

  return <div>{/* UI */}</div>;
}
```

##### Multimodal Example

```typescript
const { sendMessage } = useAIChat({ provider: 'anthropic', model: 'claude-sonnet-4' });

await sendMessage([
  {
    role: 'user',
    content: [
      { type: 'text', text: 'What do you see in this image?' },
      { type: 'image', image: base64ImageData, mimeType: 'image/png' }
    ]
  }
]);
```

---

### Auto Router

**Location**: `lib/ai/auto-router.ts`

Intelligent model selection based on task complexity. Routes queries to appropriate model tiers: fast, balanced, powerful.

#### `useAutoRouter()`

React hook for automatic model routing.

##### Signature

```typescript
function useAutoRouter(): {
  selectModel: (input: string) => ModelSelection;
  classifyTask: (input: string) => TaskClassification;
}
```

##### Return Types

```typescript
interface ModelSelection {
  provider: ProviderName;
  model: string;
  reason: string;
}

interface TaskClassification {
  complexity: 'simple' | 'moderate' | 'complex';
  requiresReasoning: boolean;
  requiresTools: boolean;
  requiresVision: boolean;
  estimatedTokens: number;
}
```

##### Usage Example

```typescript
import { useAutoRouter } from '@/lib/ai';

function AutoChat() {
  const { selectModel } = useAutoRouter();

  const handleSend = async (message: string) => {
    const selection = selectModel(message);
    console.log(`Selected: ${selection.provider}/${selection.model}`);
    console.log(`Reason: ${selection.reason}`);

    // Use selected model
    await sendMessage(message, selection.provider, selection.model);
  };

  return <div>{/* UI */}</div>;
}
```

##### Model Tiers

```typescript
// Fast tier: Simple queries (low latency, low cost)
- Groq Llama 3.3 (70B)
- Gemini 2.0 Flash
- GPT-4o Mini
- Claude 3.5 Haiku

// Balanced tier: General tasks (good quality, reasonable cost)
- Gemini 1.5 Pro
- GPT-4o
- Claude Sonnet 4

// Powerful tier: Complex reasoning (highest quality, higher cost)
- Claude Opus 4
- OpenAI o1
- DeepSeek Reasoner
```

##### Classification Patterns

```typescript
// Complex patterns
/write.*code|implement|create.*function|build.*app/i
/analyze.*data|research|investigate/i
/explain.*in.*detail|comprehensive|thorough/i
/multi-step|step.*by.*step/i

// Reasoning patterns
/why|how.*does|explain.*reasoning/i
/prove|derive|calculate/i
/logic|mathematical|theorem/i

// Simple patterns
/what.*is|define|meaning.*of/i
/translate|convert/i
/summarize|tldr|brief/i
```

---

### Image Generation

**Location**: `lib/ai/image-generation.ts`

DALL-E image generation integration.

#### `generateImage(prompt, options)`

Generate images using DALL-E.

##### Signature

```typescript
async function generateImage(
  prompt: string,
  options?: ImageGenerationOptions
): Promise<ImageGenerationResult>
```

##### Options

```typescript
interface ImageGenerationOptions {
  model?: 'dall-e-2' | 'dall-e-3';
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number; // Number of images (1-10 for DALL-E 2, 1 for DALL-E 3)
}

interface ImageGenerationResult {
  url: string;
  revisedPrompt?: string;
}
```

##### Usage Example

```typescript
import { generateImage } from '@/lib/ai/image-generation';

const result = await generateImage(
  'A futuristic city with flying cars at sunset',
  {
    model: 'dall-e-3',
    size: '1024x1024',
    quality: 'hd',
    style: 'vivid'
  }
);

console.log('Image URL:', result.url);
```

---

### Speech API

**Location**: `lib/ai/speech-api.ts`

Speech-to-text transcription using OpenAI Whisper API.

#### `transcribeViaApi(audioFile, options)`

Transcribe audio file to text.

##### Signature

```typescript
async function transcribeViaApi(
  audioFile: File,
  options?: TranscriptionOptions
): Promise<TranscriptionResult>
```

##### Options

```typescript
interface TranscriptionOptions {
  language?: string; // ISO-639-1 format (e.g., 'en', 'zh', 'es')
  model?: 'whisper-1';
  prompt?: string; // Optional text to guide transcription
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number; // 0-1
}

interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
}
```

##### Usage Example

```typescript
import { transcribeViaApi } from '@/lib/ai/speech-api';

const audioFile = /* File object from input */;

const result = await transcribeViaApi(audioFile, {
  language: 'en',
  model: 'whisper-1'
});

console.log('Transcription:', result.text);
```

#### `formatDuration(seconds)`

Format duration in seconds to readable string.

```typescript
import { formatDuration } from '@/lib/ai/speech-api';

const formatted = formatDuration(125.5); // "2:05"
```

---

## Export Utilities

**Location**: `lib/export/`

Comprehensive export functionality for chat conversations and documents.

### Core Export Functions

#### `exportToMarkdown(data)`

Export conversation to Markdown format.

```typescript
import { exportToMarkdown } from '@/lib/export';

const markdown = exportToMarkdown({
  session: session,
  messages: messages,
  exportedAt: new Date()
});
```

#### `exportToJSON(data)`

Export conversation to JSON format.

```typescript
import { exportToJSON } from '@/lib/export';

const json = exportToJSON({
  session: session,
  messages: messages,
  exportedAt: new Date()
});
```

#### `exportToHTML(data)`

Export conversation to standalone HTML file.

```typescript
import { exportToHTML } from '@/lib/export';

const html = exportToHTML({
  session: session,
  messages: messages,
  exportedAt: new Date()
});
```

#### `exportToPDF(data)`

Export conversation to PDF (uses browser print).

```typescript
import { exportToPDF } from '@/lib/export';

await exportToPDF({
  session: session,
  messages: messages,
  exportedAt: new Date()
});
```

#### `exportToPlainText(data)`

Export conversation to plain text.

```typescript
import { exportToPlainText } from '@/lib/export';

const text = exportToPlainText({
  session: session,
  messages: messages,
  exportedAt: new Date()
});
```

### Advanced Export Formats

#### `exportToRichMarkdown(data)`

Enhanced Markdown with syntax highlighting, math, and diagrams.

```typescript
import { exportToRichMarkdown } from '@/lib/export/rich-markdown';
```

#### `exportToAnimatedHTML(data)`

HTML with animated code blocks and interactive elements.

```typescript
import { exportToAnimatedHTML } from '@/lib/export/animated-html';
```

#### `exportToWord(data)`

Export to Microsoft Word format (.docx).

```typescript
import { exportToWord } from '@/lib/export/word-export';
```

#### `exportToExcel(data)`

Export to Excel format (.xlsx).

```typescript
import { exportToExcel } from '@/lib/export/excel-export';
```

#### `exportToGoogleSheets(data)`

Export data for Google Sheets import.

```typescript
import { exportToGoogleSheets } from '@/lib/export/google-sheets-export';
```

### Utility Functions

#### `downloadFile(content, filename, mimeType)`

Trigger file download in browser.

```typescript
import { downloadFile } from '@/lib/export';

downloadFile(
  markdownContent,
  'conversation.md',
  'text/markdown'
);
```

#### `generateFilename(title, extension)`

Generate safe filename from session title.

```typescript
import { generateFilename } from '@/lib/export';

const filename = generateFilename('My Chat Session', 'md');
// Returns: "my-chat-session-2025-12-25.md"
```

#### `copyToClipboard(data)`

Copy conversation to clipboard.

```typescript
import { copyToClipboard } from '@/lib/export';

await copyToClipboard({
  session: session,
  messages: messages,
  exportedAt: new Date()
});
```

### Type Definitions

```typescript
interface ExportData {
  session: Session;
  messages: UIMessage[];
  exportedAt: Date;
}

interface Session {
  id: string;
  title: string;
  provider: string;
  model: string;
  mode: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}
```

---

## Common Utilities

### `cn()`

**Location**: `lib/utils.ts`

Utility function for merging Tailwind CSS classes using clsx and tailwind-merge.

#### Signature

```typescript
function cn(...inputs: ClassValue[]): string
```

#### Usage Example

```typescript
import { cn } from '@/lib/utils';

// Conditional classes
const className = cn(
  'base-class',
  isActive && 'active-class',
  'another-class'
);

// Merging conflicting classes
const merged = cn('px-4 py-2', 'px-6'); // Result: "py-2 px-6"
```

#### Purpose

- Combines clsx (conditional class names) with tailwind-merge
- Resolves Tailwind class conflicts (later classes override earlier ones)
- Filters out falsy values (false, null, undefined)

---

### File Utilities

**Location**: `lib/file/`

File handling utilities for uploads, processing, and conversion.

#### `validateFile(file, constraints)`

Validate file against constraints.

```typescript
interface FileConstraints {
  maxSize: number;
  allowedTypes?: string[];
}

function validateFile(
  file: File,
  constraints: FileConstraints
): { valid: boolean; error?: string }
```

#### `generateThumbnail(file)`

Generate thumbnail for image files.

```typescript
async function generateThumbnail(
  file: File
): Promise<string | null> // Returns data URL
```

#### `readFileAsText(file)`

Read file as text.

```typescript
async function readFileAsText(file: File): Promise<string>
```

#### `getFileExtension(filename)`

Get file extension from filename.

```typescript
function getFileExtension(filename: string): string
```

---

### Search Utilities

**Location**: `lib/search/`

Search functionality for conversations and knowledge bases.

#### `searchMessages(query, messages)`

Full-text search across messages.

```typescript
async function searchMessages(
  query: string,
  messages: UIMessage[]
): Promise<SearchResult[]>
```

#### `highlightMatches(text, query)`

Highlight search matches in text.

```typescript
function highlightMatches(
  text: string,
  query: string
): React.ReactNode
```

---

### Theme Utilities

**Location**: `lib/themes/`

Theme configuration and management.

#### `getTheme()`

Get current theme.

```typescript
function getTheme(): 'light' | 'dark' | 'system'
```

#### `setTheme(theme)`

Set application theme.

```typescript
function setTheme(theme: 'light' | 'dark' | 'system'): void
```

#### `applyTheme(theme)`

Apply theme to document.

```typescript
function applyTheme(theme: 'light' | 'dark'): void
```

---

### i18n Utilities

**Location**: `lib/i18n/`

Internationalization support.

#### `getTranslations()`

Get translations for current locale.

```typescript
function getTranslations(locale?: string): Record<string, string>
```

#### `formatDate(date, locale)`

Format date according to locale.

```typescript
function formatDate(date: Date, locale?: string): string
```

#### `formatNumber(number, locale)`

Format number according to locale.

```typescript
function formatNumber(number: number, locale?: string): string
```

---

## Related Documentation

- [Component API Reference](components.md)
- [Configuration Guide](../features/configuration.md)
- [AI SDK Integration](../../llmdoc/feature/ai-sdk-integration.md)
- [Project Documentation Index](../../llmdoc/index.md)

---

**Last Updated**: December 25, 2025
