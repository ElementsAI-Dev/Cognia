[根目录](../CLAUDE.md) > **types**

---

# types Module Documentation

## Module Responsibility

TypeScript type definitions organized by domain. This module provides type safety across the entire application.

## Directory Structure

- `core/` — Core chat types (message, session, chat-input, chat-history-context)
- `chat/` — Chat flow types (flow-chat)
- `provider/` — AI provider types (provider, auto-router, memory-provider, openrouter, local-provider, load-balancer)
- `agent/` — Agent types (agent, agent-mode, sub-agent, background-agent, tool, tool-history)
- `workflow/` — Workflow types (workflow, workflow-editor)
- `plugin/` — Plugin types (plugin, plugin-extended, plugin-hooks, plugin-hooks-extended)
- `mcp/` — MCP types (mcp, mcp-marketplace)
- `document/` — Document and RAG types (document, document-formatting, rag, vector)
- `artifact/` — Artifact types (artifact, a2ui)
- `designer/` — Designer types (designer, designer-dnd)
- `media/` — Media types (audio, video, speech, tts, subtitle, image-studio)
- `project/` — Project types (project, project-activity, project-template)
- `search/` — Search types (search, research)
- `content/` — Content types (prompt, prompt-template, preset, structured-output, template, prompt-marketplace)
- `learning/` — Learning types (learning, academic, knowledge-map, summary)
- `system/` — System types (environment, sandbox, skill, tokenizer, usage, cache, compression, logger, websocket, geolocation, proxy, git, context, jupyter, selection-toolbar, tauri-plugins)

## Entry Points

- `types/index.ts` — Re-exports all types from subdirectories

## Type Categories

### Core Types

- `Message` — Chat message structure
- `Session` — Chat session structure
- `ChatInput` — Chat input state
- `ChatHistoryContext` — Chat history context

### Provider Types

- `Provider` — AI provider configuration
- `AutoRouter` — Auto-router configuration
- `MemoryProvider` — Memory provider types
- `OpenRouter` — OpenRouter types
- `LocalProvider` — Local provider types (Ollama, LM Studio)
- `LoadBalancer` — Load balancer types

### Agent Types

- `Agent` — Agent configuration
- `AgentMode` — Agent mode types
- `SubAgent` — Sub-agent types
- `BackgroundAgent` — Background agent types
- `Tool` — Tool definition
- `ToolHistory` — Tool usage history

### Workflow Types

- `Workflow` — Workflow definition
- `WorkflowEditor` — Workflow editor state

### MCP Types

- `MCP` — MCP server types
- `MCPMarketplace` — MCP marketplace types

### Document Types

- `Document` — Document structure
- `DocumentFormatting` — Document formatting
- `RAG` — RAG configuration
- `Vector` — Vector database types

### Artifact Types

- `Artifact` — Artifact structure
- `A2UI` — A2UI types

### Designer Types

- `Designer` — Designer state
- `DesignerDND` — Drag-and-drop types

### Media Types

- `Audio` — Audio types
- `Video` — Video types
- `Speech` — Speech recognition
- `TTS` — Text-to-speech
- `Subtitle` — Subtitle types
- `ImageStudio` — Image editing types

### Project Types

- `Project` — Project structure
- `ProjectActivity` — Activity tracking
- `ProjectTemplate` — Project templates

### Content Types

- `Prompt` — Prompt structure
- `PromptTemplate` — Prompt templates
- `Preset` — Model presets
- `StructuredOutput` — Structured output types
- `Template` — General templates
- `PromptMarketplace` — Marketplace types

### Learning Types

- `Learning` — Learning mode types
- `Academic` — Academic mode types
- `KnowledgeMap` — Knowledge map types
- `Summary` — Summary types

### System Types

- `Environment` — Environment tools
- `Sandbox` — Code execution sandbox
- `Skill` — Skill types
- `Tokenizer` — Tokenizer types
- `Usage` — Usage tracking
- `Cache` — Caching types
- `Compression` — Compression types
- `Logger` — Logging types
- `WebSocket` — WebSocket types
- `Geolocation` — Location types
- `Proxy` — Proxy configuration
- `Git` — Git types
- `Context` — Context detection
- `Jupyter` — Jupyter types
- `SelectionToolbar` — Selection toolbar types
- `TauriPlugins` — Tauri plugin types

## Common Patterns

### Defining Types

```typescript
// types/category/my-types.ts
export interface MyType {
  id: string;
  name: string;
  metadata?: Record<string, unknown>;
}

export type MyTypeStatus = 'active' | 'inactive' | 'pending';

export interface MyTypeConfig {
  enabled: boolean;
  options: string[];
}
```

### Using Types

```typescript
import { MyType, MyTypeStatus } from '@/types';

function processType(item: MyType): MyTypeStatus {
  return item.metadata?.enabled ? 'active' : 'inactive';
}
```

## Related Files

- `lib/` — Business logic using these types
- `stores/` — State management with these types
- `hooks/` — Hooks using these types

## Changelog

### 2025-01-14
- Initial module documentation created
- Indexed 15+ type directories
- Documented type categories
