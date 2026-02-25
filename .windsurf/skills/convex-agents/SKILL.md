---
name: convex-agents
description: Build persistent, stateful AI agents with the Convex Agent component. Use when implementing AI chat with persistent threads, adding tool-calling capabilities to agents, building RAG (retrieval augmented generation) with vector search, orchestrating multi-step AI workflows, streaming LLM responses to clients in real-time, or integrating OpenAI/Anthropic models with Convex's durable backend. Requires @convex-dev/agent package.
---

# Convex Agents

Build persistent AI agents with thread management, tool integration, streaming, RAG, and workflow orchestration.

## Documentation Sources

Fetch the latest before implementing:

- Primary: https://docs.convex.dev/ai
- Agent Component: https://www.npmjs.com/package/@convex-dev/agent
- Full context: https://docs.convex.dev/llms.txt

## Why Convex for AI Agents

- **Persistent State** — Conversation history survives restarts
- **Real-time Updates** — Stream responses to clients automatically
- **Tool Execution** — Run Convex functions as agent tools
- **Durable Workflows** — Long-running agent tasks with reliability
- **Built-in RAG** — Vector search for knowledge retrieval

## Setup

```bash
npm install @convex-dev/agent ai openai
```

```typescript
// convex/agent.ts
import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { OpenAI } from "openai";

const openai = new OpenAI();

export const agent = new Agent(components.agent, {
  chat: openai.chat,
  textEmbedding: openai.embeddings,
});
```

## Thread Management

```typescript
// convex/threads.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { agent } from "./agent";

export const createThread = mutation({
  args: { userId: v.id("users"), title: v.optional(v.string()) },
  returns: v.id("threads"),
  handler: async (ctx, args) => {
    return await agent.createThread(ctx, {
      userId: args.userId,
      metadata: { title: args.title ?? "New Conversation", createdAt: Date.now() },
    });
  },
});

export const listThreads = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await agent.listThreads(ctx, { userId: args.userId });
  },
});

export const getMessages = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    return await agent.getMessages(ctx, { threadId: args.threadId });
  },
});
```

## Sending Messages with Streaming

```typescript
// convex/chat.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { agent } from "./agent";
import { internal } from "./_generated/api";

export const sendMessage = action({
  args: { threadId: v.id("threads"), message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.chat.addUserMessage, {
      threadId: args.threadId, content: args.message,
    });

    const response = await agent.chat(ctx, {
      threadId: args.threadId,
      messages: [{ role: "user", content: args.message }],
      stream: true,
      onToken: async (token) => {
        await ctx.runMutation(internal.chat.appendToken, {
          threadId: args.threadId, token,
        });
      },
    });

    await ctx.runMutation(internal.chat.saveResponse, {
      threadId: args.threadId, content: response.content,
    });
    return null;
  },
});
```

## Advanced Patterns

- **Tool integration** (defining and using agent tools): See [references/tools-and-rag.md](references/tools-and-rag.md)
- **RAG with vector search**: See [references/tools-and-rag.md](references/tools-and-rag.md)
- **Workflow orchestration**, **chat schema**, **React component**: See [references/workflows-and-schema.md](references/workflows-and-schema.md)

## Best Practices

- Never run `npx convex deploy` unless explicitly instructed
- Never run any git commands unless explicitly instructed
- Store conversation history in Convex for persistence
- Use streaming for better UX with long responses
- Implement proper error handling for tool failures
- Use vector indexes for efficient RAG retrieval
- Rate limit agent interactions to control costs

## Common Pitfalls

1. **Not persisting threads** — Conversations lost on refresh
2. **Blocking on long responses** — Use streaming instead
3. **Tool errors crashing agents** — Add proper error handling
4. **Large context windows** — Summarize old messages
5. **Missing embeddings for RAG** — Generate embeddings on insert
