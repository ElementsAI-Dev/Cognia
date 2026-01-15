[根目录](../CLAUDE.md) > **lib**

---

# lib Module Documentation

## Module Responsibility

Domain utilities and business logic for the Cognia application. This module contains pure functions, utilities, and business logic organized by domain.

## Directory Structure

- `ai/` — AI integration with multi-provider support, agent system, RAG, memory, and workflows
- `db/` — Database utilities and Dexie setup
- `document/` — Document parsing, formatting, and RAG integration
- `export/` — Multi-format export (Markdown, HTML, PDF, Word, Excel, diagrams)
- `file/` — File system utilities
- `i18n/` — Internationalization with `next-intl`
- `search/` — External search API integrations (Tavily)
- `themes/` — Theme management
- `vector/` — Vector database clients (Pinecone, Qdrant, ChromaDB)
- `native/` — Native feature bridges (Tauri runtime)
- `skills/` — Skill execution framework
- `learning/` — Learning mode prompts and utilities
- `designer/` — Visual designer AI, export, and templates

## Entry Points

- `lib/ai/index.ts` — AI module exports
- `lib/utils.ts` — Common utilities

## Key Dependencies

- **Vercel AI SDK**: `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, etc.
- **Vector DBs**: `@pinecone-database/pinecone`, `@qdrant/js-client-rest`, `chromadb`, `@zilliz/milvus2-sdk-node`
- **Document Processing**: `cheerio`, `mammoth`, `pdfjs-dist`, `pptxgenjs`, `docx`, `xlsx`
- **Other**: `dexie`, `monaco-editor`, `recharts`, `katex`, `mermaid`

## AI Integration (`lib/ai/`)

### Subdirectories

- `core/` — Client creation, provider registry, middleware
- `providers/` — Ollama, OpenRouter, OAuth
- `generation/` — Chat, structured output, summarization
- `embedding/` — Embeddings, chunking, compression
- `media/` — Image generation, video, speech
- `infrastructure/` — Rate limiting, caching, telemetry
- `tools/` — Built-in tool definitions
- `rag/` — Retrieval-augmented generation
- `memory/` — Memory providers
- `agent/` — Agent executor, loop, orchestrator, tools
- `workflows/` — Workflow definitions and execution

### Key Files

- `lib/ai/core/client.ts` — Provider client creation
- `lib/ai/core/index.ts` — Provider registry
- `lib/ai/generation/structured-output.ts` — Structured output generation
- `lib/ai/agent/agent-executor.ts` — Agent execution with tool calling
- `lib/ai/agent/agent-loop.ts` — Multi-step execution loop
- `lib/ai/agent/agent-orchestrator.ts` — Sub-agent coordination
- `lib/ai/tools/` — Built-in tool definitions

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

## Related Files

- `types/ai/` — AI type definitions
- `stores/agent/` — Agent state management
- `hooks/ai/` — AI hooks

## Changelog

### 2025-01-14
- Initial module documentation created
- Indexed 50+ subdirectories
- Documented AI integration patterns
