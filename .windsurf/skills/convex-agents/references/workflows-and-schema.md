# Workflow Orchestration, Schema, and React Components

Multi-step AI workflows, complete chat schema, and React chat UI component.

## Table of Contents

- [Workflow Orchestration](#workflow-orchestration)
- [Complete Chat Schema](#complete-chat-schema)
- [React Chat Component](#react-chat-component)

## Workflow Orchestration

Multi-step research workflow with status tracking:

```typescript
// convex/workflows.ts
import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { agent } from "./agent";
import { internal } from "./_generated/api";

export const researchTopic = action({
  args: { topic: v.string(), userId: v.id("users") },
  returns: v.id("research"),
  handler: async (ctx, args) => {
    const researchId = await ctx.runMutation(internal.workflows.createResearch, {
      topic: args.topic, userId: args.userId, status: "searching",
    });

    // Step 1: Search for relevant documents
    const searchResults = await agent.search(ctx, {
      query: args.topic, table: "documents", limit: 10,
    });

    await ctx.runMutation(internal.workflows.updateStatus, {
      researchId, status: "analyzing",
    });

    // Step 2: Analyze and synthesize
    const analysis = await agent.chat(ctx, {
      messages: [{
        role: "user",
        content: `Analyze these sources about "${args.topic}":\n\n${
          searchResults.map((r) => r.content).join("\n\n---\n\n")
        }`,
      }],
      systemPrompt: "You are a research assistant. Provide thorough, well-cited analysis.",
    });

    // Step 3: Generate key insights
    await ctx.runMutation(internal.workflows.updateStatus, {
      researchId, status: "summarizing",
    });

    const insights = await agent.chat(ctx, {
      messages: [{
        role: "user",
        content: `Based on this analysis, list 5 key insights:\n\n${analysis.content}`,
      }],
    });

    // Save final results
    await ctx.runMutation(internal.workflows.completeResearch, {
      researchId,
      analysis: analysis.content,
      insights: insights.content,
      sources: searchResults.map((r) => r._id),
    });

    return researchId;
  },
});
```

## Complete Chat Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  threads: defineTable({
    userId: v.id("users"),
    title: v.string(),
    lastMessageAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    threadId: v.id("threads"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    toolCalls: v.optional(v.array(v.object({
      name: v.string(),
      arguments: v.any(),
      result: v.optional(v.any()),
    }))),
    createdAt: v.number(),
  }).index("by_thread", ["threadId"]),

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
});
```

## React Chat Component

```typescript
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useRef, useEffect } from "react";

function ChatInterface({ threadId }: { threadId: Id<"threads"> }) {
  const messages = useQuery(api.threads.getMessages, { threadId });
  const sendMessage = useAction(api.chat.sendMessage);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const message = input.trim();
    setInput("");
    setSending(true);
    try {
      await sendMessage({ threadId, message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages?.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <strong>{msg.role === "user" ? "You" : "Assistant"}:</strong>
            <p>{msg.content}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="input-form">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={sending}
        />
        <button type="submit" disabled={sending || !input.trim()}>
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
```
