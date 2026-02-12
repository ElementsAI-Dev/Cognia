[根目录](../CLAUDE.md) > **lib**

---

# lib Module Documentation

## Module Responsibility

Domain utilities and business logic for the Cognia application. This module contains pure functions, utilities, and business logic organized by domain.

## Changelog

### 2026-02-13

- Added App Builder Tools for AI-driven mini-app creation (`ai/tools/app-builder-tool.ts`)
- Removed document-storage and word-export modules (functionality moved elsewhere)
- Tool Registry now includes 40+ tools across 12 categories
- Added a2ui/ directory for A2UI app generation and templates

### 2025-01-14

- Initial module documentation created
- Indexed 50+ subdirectories
- Documented AI integration patterns

---

## Directory Structure

- `ai/` — AI integration with multi-provider support, agent system, RAG, memory, and workflows
- `a2ui/` — A2UI app generation, templates, and utilities
- `academic/` — Academic paper search, Zotero integration, and analysis
- `db/` — Database utilities and Dexie setup
- `document/` — Document parsing, formatting, and RAG integration
- `export/` — Multi-format export (Markdown, HTML, PDF, diagrams)
- `file/` — File system utilities
- `i18n/` — Internationalization with `next-intl`
- `search/` — External search API integrations (Tavily)
- `themes/` — Theme management
- `vector/` — Vector database clients (Pinecone, Qdrant, ChromaDB)
- `native/` — Native feature bridges (Tauri runtime)
- `skills/` — Skill execution framework
- `learning/` — Learning mode prompts and utilities
- `designer/` — Visual designer AI, export, and templates
- `canvas/` — Canvas utilities
- `media/` — Media processing (video, audio, images)
- `plugin/` — Plugin system (loader, API, devtools)
- `observability/` — System monitoring and metrics
- `chat/` — Chat utilities (slash commands, etc.)
- `context/` — Context detection utilities
- `rag/` — RAG (Retrieval-Augmented Generation) utilities
- `router/` — Routing utilities
- `sandbox/` — Code execution sandbox utilities
- `storage/` — Storage utilities
- `utils.ts` — Common utilities (cn, formatDate, etc.)

## Entry Points

- `lib/ai/index.ts` — AI module exports
- `lib/utils.ts` — Common utilities
- `lib/a2ui/index.ts` — A2UI module exports
- `lib/academic/index.ts` — Academic module exports

## Key Dependencies

- **Vercel AI SDK**: `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, etc.
- **Vector DBs**: `@pinecone-database/pinecone`, `@qdrant/js-client-rest`, `chromadb`, `@zilliz/milvus2-sdk-node`
- **Document Processing**: `cheerio`, `mammoth`, `pdfjs-dist`, `pptxgenjs`, `docx`, `xlsx`
- **Other**: `dexie`, `monaco-editor`, `recharts`, `katex`, `mermaid`, `zod`

## AI Integration (`lib/ai/`)

### Subdirectories

- `core/` — Client creation, provider registry, middleware
- `providers/` — Ollama, OpenRouter, OAuth
- `generation/` — Chat, structured output, summarization
- `embedding/` — Embeddings, chunking, compression
- `media/` — Image generation, video, speech
- `infrastructure/` — Rate limiting, caching, telemetry
- `tools/` — Built-in tool definitions (40+ tools)
- `rag/` — Retrieval-augmented generation
- `memory/` — Memory providers
- `agent/` — Agent executor, loop, orchestrator, tools
- `workflows/` — Workflow definitions and execution
- `presets/` — AI preset management
- `prompts/` — Prompt templates and optimization

### Tool Registry (`lib/ai/tools/`)

The tool registry includes 40+ tools across 12 categories:

| Category | Tools | Description |
|----------|-------|-------------|
| **Search** | `rag_search`, `web_search`, `web_scraper`, `bulk_web_scraper`, `search_and_scrape` | Web and knowledge base search |
| **File** | `file_read`, `file_write`, `file_list`, `file_delete`, `file_search`, `content_search`, `file_info`, `file_copy`, `file_move`, `file_rename`, `file_append`, `file_binary_write`, `file_hash`, `file_diff`, `directory_create`, `directory_delete` | File system operations |
| **Document** | `document_summarize`, `document_chunk`, `document_analyze`, `document_extract_tables`, `document_read_file` | Document processing |
| **Video** | `video_generate`, `video_status`, `video_subtitles`, `video_analyze`, `subtitle_parse` | Video generation and analysis |
| **Image** | `image_generate`, `image_edit`, `image_variation` | Image generation and editing |
| **PPT** | `ppt_outline`, `ppt_slide_content`, `ppt_finalize`, `ppt_export`, `ppt_generate_image`, `ppt_batch_generate_images` | Presentation creation |
| **Academic** | `academic_search`, `academic_analysis`, `paper_comparison` | Academic paper search and analysis |
| **Learning** | `display_flashcard`, `display_flashcard_deck`, `display_quiz`, `display_quiz_question`, `display_review_session`, `display_progress_summary`, `display_concept_explanation` | Interactive learning components |
| **App** | `app_generate`, `app_create_from_template`, `app_list_templates`, `app_delete` | A2UI mini-app creation |
| **System** | `calculator`, `shell_execute` | System utilities |
| **Memory** | Memory tools | Persistent context storage |
| **Artifact** | Artifact tools | Artifact creation and management |

### App Builder Tools (`lib/ai/tools/app-builder-tool.ts`)

Tools for creating A2UI mini-apps:

- `app_generate` — Generate app from natural language description
  - Supports Chinese and English
  - Multiple styles: minimal, colorful, professional
  - Auto-detects app type (calculator, timer, todo, form, etc.)
- `app_create_from_template` — Create app from predefined template
- `app_list_templates` — List available templates
- `app_delete` — Delete a created app

### Key Files

- `lib/ai/core/client.ts` — Provider client creation
- `lib/ai/core/index.ts` — Provider registry
- `lib/ai/generation/structured-output.ts` — Structured output generation
- `lib/ai/agent/agent-executor.ts` — Agent execution with tool calling
- `lib/ai/agent/agent-loop.ts` — Multi-step execution loop
- `lib/ai/agent/agent-orchestrator.ts` — Sub-agent coordination
- `lib/ai/tools/registry.ts` — Tool registry and registration
- `lib/ai/tools/app-builder-tool.ts` — A2UI app builder tools

## A2UI Module (`lib/a2ui/`)

AI-driven mini-app generation system:

- `app-generator.ts` — Generate apps from descriptions
- `templates.ts` — Pre-built app templates
- `resolve-icon.ts` — Icon resolution utility

## Academic Module (`lib/academic/`)

Research paper management:

- `zotero-integration.ts` — Zotero client and sync service
- Paper search across arXiv, Semantic Scholar, OpenAlex

## Data Models

### AI Types (`types/ai/`)

- Provider configurations
- Message types
- Tool definitions
- Agent states
- Memory providers
- Workflow definitions

## Testing

- **Framework**: Jest
- **Coverage**: Good (excluded from coverage: `lib/search/`, `lib/vector/`, `lib/native/`)
- **Test Files**: Extensive test coverage across all subdirectories

## Common Patterns

### Creating AI Utilities

```typescript
// lib/ai/utilities/my-utility.ts
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function myUtility(prompt: string) {
  const client = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const { text } = await generateText({
    model: client('gpt-4o'),
    prompt,
  });

  return text;
}
```

### Creating Tools

```typescript
// lib/ai/tools/my-tool.ts
import { z } from 'zod';
import type { ToolDefinition } from './registry';

export const myToolInputSchema = z.object({
  input: z.string().describe('Input description'),
});

export type MyToolInput = z.infer<typeof myToolInputSchema>;

export async function executeMyTool(input: MyToolInput) {
  // Tool implementation
  return { success: true, result: '...' };
}

export const myTool: ToolDefinition = {
  name: 'my_tool',
  description: 'Tool description',
  parameters: myToolInputSchema,
  requiresApproval: false,
  category: 'custom',
  create: () => executeMyTool,
};
```

### Using the Tool Registry

```typescript
import { getGlobalToolRegistry, toAICompatibleTools } from '@/lib/ai/tools/registry';

// Get all tools
const registry = getGlobalToolRegistry();
const tools = registry.getAll();

// Get tools by category
const searchTools = registry.getByCategory('search');

// Convert to AI SDK format
const aiTools = registry.getAllAsAICompatibleTools({ apiKey: '...' });
```

## Related Files

- `types/ai/` — AI type definitions
- `stores/agent/` — Agent state management
- `hooks/ai/` — AI hooks
- `components/a2ui/` — A2UI components
- `stores/a2ui/` — A2UI state management
