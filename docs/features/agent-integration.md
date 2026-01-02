# Agent, Vector Database, and Skills Integration

This document describes the integration between Agent, Vector Database (RAG), Skills, and MCP tools in Cognia.

## Overview

Cognia provides a unified system for AI agent execution that seamlessly integrates multiple tool sources:

- **Built-in Tools**: Calculator, web search, code execution, etc.
- **Skill-based Tools**: Tools derived from activated Skills
- **MCP Tools**: Tools from connected MCP (Model Context Protocol) servers
- **RAG Tools**: Retrieval Augmented Generation using vector databases
- **Custom Tools**: User-defined tools

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Unified Tool Registry                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │ Built-in    │ │ Skill       │ │ MCP         │ │ RAG    │ │
│  │ Tools       │ │ Tools       │ │ Tools       │ │ Tools  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Agent Executor                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ useAgent Hook / Background Agent Manager                ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. MCP Tools Adapter (`lib/ai/agent/mcp-tools.ts`)

Converts MCP server tools to the AgentTool format used by the agent executor.

```typescript
import { createMcpToolsFromStore } from '@/lib/ai/agent';

// Convert MCP tools for agent use
const mcpTools = createMcpToolsFromStore(servers, callTool, {
  requireApproval: false,
  timeout: 30000,
});
```

**Features:**

- JSON Schema to Zod conversion for parameter validation
- Automatic tool naming with server prefix
- Timeout handling
- Error formatting

### 2. RAG Integration (`lib/ai/agent/agent-tools.ts`)

Provides RAG search capabilities through the vector database.

```typescript
import { buildRAGConfigFromSettings, createRAGSearchTool } from '@/lib/ai/agent';

// Build RAG config from vector store settings
const ragConfig = buildRAGConfigFromSettings(vectorSettings, apiKey);
const ragTool = createRAGSearchTool(ragConfig);
```

**Features:**

- Auto-configuration from vector store settings
- Support for multiple embedding providers
- Semantic search with similarity threshold

### 3. Skills Integration (`lib/skills/executor.ts`)

Converts Skills to agent tools and enhances system prompts.

```typescript
import { createSkillTools, buildMultiSkillSystemPrompt } from '@/lib/skills/executor';

// Create tools from active skills
const skillTools = createSkillTools(activeSkills);

// Build enhanced system prompt
const skillsPrompt = buildMultiSkillSystemPrompt(activeSkills, {
  maxContentLength: 8000,
  includeResources: true,
});
```

**Features:**

- Progressive disclosure based on token budget
- Resource inclusion
- Multi-skill system prompt generation

### 4. Unified Tool Registry (`lib/ai/tools/unified-registry.ts`)

Central registry for managing all tool sources.

```typescript
import { getUnifiedToolRegistry, registerBuiltinTools } from '@/lib/ai/tools';

const registry = getUnifiedToolRegistry();

// Register tools
registerBuiltinTools(registry, builtinTools);
registerSkillTools(registry, skills, skillTools);
registerMcpTools(registry, servers, mcpTools);

// Get enabled tools
const tools = registry.getToolsRecord({ isEnabled: true });

// Filter tools
const searchTools = registry.filter({ categories: ['search'] });
```

**Features:**

- Tool categorization (search, compute, file, document, etc.)
- Source tracking (builtin, skill, mcp, custom)
- Enable/disable individual tools
- Search and filter capabilities
- Change subscription

### 5. Background Agent Manager (`lib/ai/agent/background-agent-manager.ts`)

Manages background agent execution with full integration support.

```typescript
const manager = getBackgroundAgentManager();

// Set up providers for integration
manager.setProviders({
  skills: () => ({ skills, activeSkillIds }),
  mcp: () => ({ servers, callTool }),
  vectorSettings: () => vectorSettings,
  apiKey: (provider) => getApiKey(provider),
});

// Create agent with integration enabled
const agent = manager.createAgent({
  name: 'Research Agent',
  task: 'Research the topic',
  config: {
    enableSkills: true,
    enableRAG: true,
    enableMcpTools: true,
  },
});
```

## Hooks

### useAgent

The main hook for agent execution with integrated tools.

```typescript
import { useAgent } from '@/hooks';

const {
  run,
  stop,
  isRunning,
  toolCalls,
} = useAgent({
  systemPrompt: 'You are a helpful assistant.',
  enableSkills: true,
  enableMcpTools: true,
  enableRAG: true,
});
```

### useUnifiedTools

Hook for unified tool management.

```typescript
import { useUnifiedTools } from '@/hooks';

const {
  tools,
  registeredTools,
  filter,
  enableTool,
  disableTool,
  stats,
} = useUnifiedTools({
  enableBuiltinTools: true,
  enableSkillTools: true,
  enableMcpTools: true,
  enableRAG: true,
});
```

## Configuration

### Background Agent Config

```typescript
interface BackgroundAgentConfig {
  // ... existing config ...
  
  // Skills integration
  enableSkills?: boolean;
  activeSkillIds?: string[];
  
  // RAG integration
  enableRAG?: boolean;
  ragCollectionId?: string;
  
  // MCP integration
  enableMcpTools?: boolean;
  mcpServerIds?: string[];
}
```

### Agent Tools Config

```typescript
interface AgentToolsConfig {
  // Built-in tools
  enableWebSearch?: boolean;
  enableCalculator?: boolean;
  enableRAGSearch?: boolean;
  
  // Skills
  enableSkills?: boolean;
  activeSkills?: Skill[];
  
  // MCP
  enableMcpTools?: boolean;
  mcpServers?: McpServerState[];
  mcpCallTool?: (serverId, toolName, args) => Promise<ToolCallResult>;
  mcpRequireApproval?: boolean;
  
  // RAG
  ragConfig?: RAGConfig;
}
```

## Best Practices

1. **Tool Approval**: Set `requireApproval: true` for sensitive MCP tools
2. **Token Budget**: Use progressive disclosure for skills to manage context length
3. **Error Handling**: MCP tools have built-in timeout and error handling
4. **Dynamic Updates**: Use `useUnifiedTools` for automatic synchronization

## Troubleshooting

### MCP Tools Not Appearing

1. Check that the MCP server is connected (`status.type === 'connected'`)
2. Verify `enableMcpTools` is set to `true`
3. Check console for any conversion errors

### RAG Search Not Working

1. Ensure vector database is configured in settings
2. Verify embedding API key is set
3. Check that documents have been indexed

### Skills Not Active

1. Verify skills are activated in the skill store
2. Check `enableSkills` option is `true`
3. Ensure skills have valid content

## API Reference

See the following files for detailed API documentation:

- `@/lib/ai/agent/mcp-tools.ts` - MCP tools adapter
- `@/lib/ai/agent/agent-tools.ts` - Agent tools configuration
- `@/lib/ai/tools/unified-registry.ts` - Unified tool registry
- `@/hooks/use-agent.ts` - Agent hook
- `@/hooks/use-unified-tools.ts` - Unified tools hook
