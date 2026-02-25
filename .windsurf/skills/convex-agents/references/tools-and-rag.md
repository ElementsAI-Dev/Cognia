# Agent Tools and RAG Patterns

Tool integration for agent capabilities and RAG (Retrieval Augmented Generation) with vector search.

## Table of Contents

- [Defining Tools](#defining-tools)
- [Agent with Tools](#agent-with-tools)
- [RAG: Adding Documents](#rag-adding-documents)
- [RAG: Searching Knowledge Base](#rag-searching-knowledge-base)

## Defining Tools

```typescript
// convex/tools.ts
import { tool } from "@convex-dev/agent";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const searchKnowledge = tool({
  name: "search_knowledge",
  description: "Search the knowledge base for relevant information",
  parameters: v.object({
    query: v.string(),
    limit: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    return await ctx.runQuery(api.knowledge.search, {
      query: args.query,
      limit: args.limit ?? 5,
    });
  },
});

export const createTask = tool({
  name: "create_task",
  description: "Create a new task for the user",
  parameters: v.object({
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const taskId = await ctx.runMutation(api.tasks.create, {
      title: args.title,
      description: args.description,
      dueDate: args.dueDate ? new Date(args.dueDate).getTime() : undefined,
    });
    return { success: true, taskId };
  },
});

export const getWeather = tool({
  name: "get_weather",
  description: "Get current weather for a location",
  parameters: v.object({ location: v.string() }),
  handler: async (ctx, args) => {
    const response = await fetch(
      `https://api.weather.com/current?location=${encodeURIComponent(args.location)}`
    );
    return await response.json();
  },
});
```

## Agent with Tools

```typescript
// convex/assistant.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { agent } from "./agent";
import { searchKnowledge, createTask, getWeather } from "./tools";

export const chat = action({
  args: { threadId: v.id("threads"), message: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const response = await agent.chat(ctx, {
      threadId: args.threadId,
      messages: [{ role: "user", content: args.message }],
      tools: [searchKnowledge, createTask, getWeather],
      systemPrompt: `You are a helpful assistant with access to tools for:
        - Searching the knowledge base
        - Creating tasks
        - Getting weather information`,
    });
    return response.content;
  },
});
```

## RAG: Adding Documents

```typescript
// convex/knowledge.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { agent } from "./agent";

export const addDocument = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    metadata: v.optional(v.object({
      source: v.optional(v.string()),
      category: v.optional(v.string()),
    })),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const embedding = await agent.embed(ctx, args.content);

    return await ctx.db.insert("documents", {
      title: args.title,
      content: args.content,
      embedding,
      metadata: args.metadata ?? {},
      createdAt: Date.now(),
    });
  },
});
```

## RAG: Searching Knowledge Base

```typescript
// convex/knowledge.ts
import { query } from "./_generated/server";
import { v } from "convex/values";
import { agent } from "./agent";

export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("documents"),
    title: v.string(),
    content: v.string(),
    score: v.number(),
  })),
  handler: async (ctx, args) => {
    const results = await agent.search(ctx, {
      query: args.query,
      table: "documents",
      limit: args.limit ?? 5,
    });

    return results.map((r) => ({
      _id: r._id,
      title: r.title,
      content: r.content,
      score: r._score,
    }));
  },
});
```

Schema requirement for vector search:

```typescript
documents: defineTable({
  title: v.string(),
  content: v.string(),
  embedding: v.array(v.float64()),
  metadata: v.object({
    source: v.optional(v.string()),
    category: v.optional(v.string()),
  }),
  createdAt: v.number(),
}).vectorIndex("by_embedding", {
  vectorField: "embedding",
  dimensions: 1536,
}),
```
