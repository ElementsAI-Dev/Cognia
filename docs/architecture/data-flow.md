# Cognia Data Flow

## Introduction

This document describes how data flows through the Cognia application, from user interactions to AI responses, state synchronization, persistence, and background processes. Understanding data flow is critical for debugging, adding features, and optimizing performance.

## Table of Contents

1. [Request/Response Flow](#requestresponse-flow)
2. [State Synchronization Flow](#state-synchronization-flow)
3. [Data Persistence Flow](#data-persistence-flow)
4. [MCP Communication Flow](#mcp-communication-flow)
5. [AI Streaming Flow](#ai-streaming-flow)
6. [Event-Driven Updates](#event-driven-updates)

## Request/Response Flow

### User Message Flow

```
User Input Component
       |
       v
Chat Input (chat-input.tsx)
       |
       v
useAIChat Hook (lib/ai/use-ai-chat.ts)
       |
       +-- Memory Detection
       +-- Custom Instructions Injection
       +-- Provider/Model Selection
       |
       v
AI SDK (Vercel AI SDK)
       |
       v
AI Provider API (OpenAI/Anthropic/Google/etc.)
       |
       v
Streaming Response
       |
       v
Update Message State
       |
       v
Persist to IndexedDB (Dexie)
       |
       v
Update Usage Statistics
```

### Detailed Flow Diagram

```
+-------------------+     User types message
|   Chat Input      |
|   Component       |------------------+
+-------------------+                  |
       |                               |
       | onSubmit(message)              | Attachments
       v                               |
+-------------------+                  |
|  useAIChat Hook  |<-----------------+
|  - Build context |
|  - Inject memory |
|  - Prepare tools |
+-------------------+
       |
       | streamText({ model, messages, system })
       v
+-------------------+
|  Vercel AI SDK    |
|  - Convert format |
|  - Handle stream  |
+-------------------+
       |
       | fetch(providerAPI, { body: JSON.stringify({ model, messages }) })
       v
+-------------------+
|  AI Provider      |
|  (OpenAI, Anthropic,|
|   Google, etc.)   |
+-------------------+
       |
       | Server-Sent Events (stream)
       v
+-------------------+
|  AI SDK Parser    |
|  - Parse chunks   |
|  - Accumulate text|
+-------------------+
       |
       | for await (chunk of textStream)
       v
+-------------------+
|  Component State  |
|  - Append chunk   |
|  - Update UI      |
+-------------------+
       |
       | messageRepository.create(message)
       v
+-------------------+
|  IndexedDB        |
|  (Dexie)          |
+-------------------+
       |
       | addUsageRecord({ tokens, cost })
       v
+-------------------+
|  Usage Store      |
|  (Zustand)        |
+-------------------+
```

### Code Example

```typescript
// 1. User submits message
const handleSubmit = async (content: string) => {
  // 2. Create user message
  const userMessage: Message = {
    id: nanoid(),
    role: 'user',
    content,
    createdAt: new Date(),
  };

  // 3. Update state (immediate UI feedback)
  setMessages(prev => [...prev, userMessage]);

  // 4. Send to AI
  const { sendMessage } = useAIChat({ provider, model });
  const response = await sendMessage({
    messages: [...messages, userMessage],
    systemPrompt,
    onChunk: (chunk) => {
      // 5. Stream updates
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last.role === 'assistant') {
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
        }
        return prev;
      });
    },
  });

  // 6. Persist to IndexedDB
  await messageRepository.create(userMessage);
  await messageRepository.create(assistantMessage);

  // 7. Update usage statistics
  addUsageRecord({
    sessionId,
    messageId: assistantMessage.id,
    provider,
    model,
    tokens: response.usage,
  });
};
```

## State Synchronization Flow

### Store-to-Component Sync

```
+-------------------+
|  Zustand Store    | (Source of Truth)
|  - sessions       |
|  - messages       |
|  - settings       |
+-------------------+
       |
       | useSessionStore(state => state.sessions)
       v
+-------------------+
|  React Component  | (Read-only view)
|  - SessionList    |
+-------------------+
       |
       | User clicks session
       v
+-------------------+
|  Store Action     |
|  setActiveSession |
+-------------------+
       |
       | Zustand re-renders subscribers
       v
+-------------------+
|  All Components   |
|  Re-render with   |
|  new state        |
+-------------------+
```

### Multi-Store Coordination

```
+------------------+      +------------------+      +------------------+
| Session Store    |      | Artifact Store   |      | Usage Store      |
| - Active session |----->| - Artifacts      |<-----| - Token counts   |
+------------------+      +------------------+      +------------------+
        |                         |                         |
        |                         |                         |
        v                         v                         v
+------------------------------------------------------------------+
|                         Chat Container                            |
|  - Coordinates state across stores                               |
|  - Reads from Session, Artifact, Usage stores                     |
|  - Updates all stores on message completion                      |
+------------------------------------------------------------------+
```

### Example: Creating an Artifact

```typescript
// 1. AI generates artifact
const artifact = useArtifactStore.getState().createArtifact({
  sessionId,
  messageId,
  type: 'code',
  title: 'DataProcessor.ts',
  content: generatedCode,
  language: 'typescript',
});

// 2. Store updates (triggers re-render of subscribers)
// artifact-store.ts:
set((state) => ({
  artifacts: { ...state.artifacts, [artifact.id]: artifact },
  activeArtifactId: artifact.id,
  panelOpen: true,
  panelView: 'artifact',
}));

// 3. Components automatically re-render
function ArtifactPanel() {
  const activeArtifact = useArtifactStore(state =>
    state.artifacts[state.activeArtifactId]
  );
  // Re-renders when activeArtifactId changes
  return <CodeEditor code={activeArtifact?.content} />;
}
```

## Data Persistence Flow

### Two-Tier Persistence Strategy

Cognia uses a two-tier persistence strategy:

1. **localStorage** - Fast access for frequently accessed state (Zustand stores)
2. **IndexedDB** - Structured data storage for large datasets (Dexie)

```
+-------------------+     Read/Write     +-------------------+
|  Application      | <------------->  |  localStorage     |
|  State            |                  |  (Zustand stores) |
|  (Zustand)        |                  +-------------------+
+-------------------+                          |
       |                                    |
       | persist() middleware               | ~5-10MB limit
       v                                    v
+-------------------+     Read/Write     +-------------------+
|  Dexie (IndexedDB) | <------------->  |  Browser Storage  |
|  - Messages        |                  |  ~1GB capacity    |
|  - Sessions        |                  +-------------------+
|  - Documents       |
+-------------------+
```

### localStorage Persistence Flow

```
+-------------------+
|  Zustand Store    |
|  (In-Memory)      |
+-------------------+
       |
       | Write operation
       v
+-------------------+
|  Persist Middleware|
|  - Partialize     |
|  - Serialize dates|
+-------------------+
       |
       | localStorage.setItem('cognia-sessions', JSON.stringify(data))
       v
+-------------------+
|  Browser          |
|  localStorage     |
+-------------------+
       |
       | On app load
       v
+-------------------+
|  onRehydrateStorage|
|  - Deserialize    |
|  - Convert strings|
|    to Dates       |
+-------------------+
       |
       v
+-------------------+
|  Zustand Store    |
|  (Restored)       |
+-------------------+
```

### IndexedDB Persistence Flow

```
+-------------------+
|  Component        |
|  (Chat messages)  |
+-------------------+
       |
       | messageRepository.create(message)
       v
+-------------------+
|  Dexie Repository |
|  (lib/db/)        |
+-------------------+
       |
       | db.messages.add(message)
       v
+-------------------+
|  Dexie Core       |
|  - Schema validation|
|  - Indexing       |
+-------------------+
       |
       | IndexedDB API
       v
+-------------------+
|  Browser IndexedDB|
|  - CogniaDB       |
|  - messages store |
+-------------------+
```

### Repository Pattern Example

```typescript
// lib/db/repositories/message-repository.ts

export const messageRepository = {
  // Create
  create: async (message: DBMessage) => {
    const id = await db.messages.add(message);
    return { ...message, id };
  },

  // Read
  getBySession: async (sessionId: string) => {
    return await db.messages
      .where('sessionId')
      .equals(sessionId)
      .sortBy('createdAt');
  },

  // Update
  update: async (id: number, updates: Partial<DBMessage>) => {
    return await db.messages.update(id, updates);
  },

  // Delete
  delete: async (id: number) => {
    return await db.messages.delete(id);
  },

  // Query with compound index
  getRecentBySession: async (sessionId: string, limit: number) => {
    return await db.messages
      .where('[sessionId+createdAt]')
      .between([sessionId, 0], [sessionId, Date.now()])
      .reverse()
      .limit(limit)
      .toArray();
  },
};
```

### Reactive Queries with Dexie

```typescript
// Components get live updates via useLiveQuery hook
import { useLiveQuery } from 'dexie-react-hooks';

function MessageList({ sessionId }: { sessionId: string }) {
  // Automatically re-renders when messages change
  const messages = useLiveQuery(
    () => db.messages
      .where('sessionId')
      .equals(sessionId)
      .sortBy('createdAt'),
    [sessionId]
  );

  if (!messages) return <div>Loading...</div>;

  return (
    <div>
      {messages.map(m => <Message key={m.id} {...m} />)}
    </div>
  );
}
```

## MCP Communication Flow

### MCP Request Flow (Frontend to Backend)

```
+-------------------+     Tauri Invoke    +-------------------+
|  React Component  | -----------------> |  Rust Backend     |
|  (useMcpStore)    |                     |  (mcp/manager.rs) |
+-------------------+                     +-------------------+
       |                                         |
       | invoke('mcp_call_tool', {              |
       |   serverId,                            |
       |   toolName,                            |
       |   arguments                            |
       | })                                     |
       |                                         v
       |                                 +-------------------+
       |                                 |  McpManager       |
       |                                 |  - Get client     |
       +-------------------------------->|  - Call tool      |
                                         +-------------------+
                                                |
                                                | client.call_tool()
                                                v
                                         +-------------------+
                                         |  McpClient        |
                                         |  (mcp/client.rs)  |
                                         +-------------------+
                                                |
                                                | Send JSON-RPC request
                                                v
                                         +-------------------+
                                         |  Transport Layer |
                                         |  (stdio/sse)      |
                                         +-------------------+
                                                |
                                                | Write to stdout/HTTP
                                                v
                                         +-------------------+
                                         |  MCP Server       |
                                         |  (External Process)|
                                         +-------------------+
```

### MCP Event Flow (Backend to Frontend)

```
+-------------------+     Emit Event     +-------------------+
|  Rust Backend     | -----------------> |  Tauri Event      |
|  (McpManager)     |                     |  System           |
+-------------------+                     +-------------------+
       |                                         |
       | app_handle.emit("mcp:server-update",    |
       |   &server_state)                        |
       |                                         v
       |                                 +-------------------+
       +-------------------------------->|  React Component  |
                                         |  (useMcpStore)    |
                                         +-------------------+
                                                |
                                                | listen('mcp:server-update')
                                                v
                                         +-------------------+
                                         |  Event Listener   |
                                         +-------------------+
                                                |
                                                | _updateServer(state)
                                                v
                                         +-------------------+
                                         |  Zustand Store    |
                                         |  (mcp-store.ts)   |
                                         +-------------------+
```

### MCP Tool Call Flow (Detailed)

```
1. User triggers tool (e.g., "Search web")
   |
   v
2. Frontend: useMcpStore().callTool(serverId, 'search', { query })
   |
   v
3. Tauri Bridge: invoke('mcp_call_tool', { serverId, toolName, arguments })
   |
   v
4. Rust Backend:
   - Get server instance
   - Get MCP client
   - client.call_tool(toolName, arguments)
   - Build JSON-RPC request
   |
   v
5. MCP Client:
   - Generate request ID
   - Serialize to JSON
   - Send via transport (stdio/SSE)
   |
   v
6. Transport Layer:
   - Write to server's stdin (stdio) or POST to endpoint (SSE)
   - Wait for response
   - Read from stdout (stdio) or GET from endpoint (SSE)
   |
   v
7. MCP Server:
   - Execute tool logic
   - Return result
   |
   v
8. Response path (reverse):
   - MCP Server -> Transport -> Client -> Manager -> Tauri -> Frontend
   |
   v
9. Frontend Store Update:
   - Store result
   - Trigger UI update
   - Display tool output
```

### MCP Event-Driven Architecture

```typescript
// Frontend event listener setup
useEffect(() => {
  const unlistenServerUpdate = await listen<McpServerState>(
    'mcp:server-update',
    (event) => {
      // Update store when server state changes
      useMcpStore.getState()._updateServer(event.payload);
    }
  );

  const unlistenNotification = await listen<McpNotificationEvent>(
    'mcp:notification',
    (event) => {
      // Handle server notifications
      console.log('MCP notification:', event.payload);
    }
  );

  const unlistenToolProgress = await listen<ToolCallProgress>(
    'mcp:tool-call-progress',
    (event) => {
      // Update tool call progress UI
      updateToolProgress(event.payload);
    }
  );

  return () => {
    unlistenServerUpdate();
    unlistenNotification();
    unlistenToolProgress();
  };
}, []);
```

```rust
// Rust backend event emission
async fn spawn_notification_handler(&self, server_id: String) {
    tokio::spawn(async move {
        loop {
            match notification_rx.recv().await {
                Some(notification) => {
                    // Emit to frontend
                    let _ = app_handle.emit("mcp:notification", &notification);

                    // Handle specific notifications
                    match notification.method.as_str() {
                        "notifications/tools/list_changed" => {
                            // Refresh tools list
                            let tools = client.list_tools().await?;
                            server_state.tools = tools;
                            let _ = app_handle.emit("mcp:server-update", &server_state);
                        }
                        _ => {}
                    }
                }
                None => break,
            }
        }
    });
}
```

## AI Streaming Flow

### Streaming Response Architecture

```
+-------------------+
|  User Message     |
+-------------------+
        |
        | User sends message
        v
+-------------------+
|  useAIChat Hook   |
|  - Prepare context|
|  - Build messages |
+-------------------+
        |
        | streamText({ model, messages })
        v
+-------------------+
|  Vercel AI SDK    |
|  - Fetch API      |
|  - Parse stream   |
+-------------------+
        |
        | POST /v1/chat/completions
        v
+-------------------+
|  AI Provider API  |
|  (OpenAI)         |
+-------------------+
        |
        | Server-Sent Events (SSE)
        | data: {"choices":[{"delta":{"content":"Hello"}}]}
        | data: {"choices":[{"delta":{"content":" world"}}]}
        | data: [DONE]
        v
+-------------------+
|  AI SDK Stream    |
|  - Accumulate text|
|  - Parse chunks   |
+-------------------+
        |
        | Async iteration
        v
+-------------------+
|  onChunk Callback |
|  - Update UI      |
+-------------------+
        |
        | setMessages(prev => [...prev, { content: accumulatedText }])
        v
+-------------------+
|  React Render     |
|  - Show streaming |
|    text in real-  |
|    time           |
+-------------------+
```

### Streaming Code Example

```typescript
// lib/ai/use-ai-chat.ts

const sendMessage = async (options, onChunk) => {
  const { messages, systemPrompt, temperature } = options;

  // Start streaming
  const result = await streamText({
    model: providerModel,
    messages: convertedMessages,
    system: systemPrompt,
    temperature,
    abortSignal: abortController.signal,
  });

  let fullText = '';

  // Stream chunks
  for await (const chunk of result.textStream) {
    fullText += chunk;

    // Call component's onChunk callback
    onChunk?.(chunk);
  }

  // Get final usage statistics
  const usage = await result.usage;

  return {
    text: fullText,
    usage,
    finishReason: await result.finishReason,
  };
};
```

### Reasoning Extraction Flow (for o1, DeepSeek Reasoner)

```
+-------------------+
|  AI Response      |
|  (with <think>)   |
+-------------------+
        |
        | Extract reasoning from text
        v
+-------------------+
|  Regex Pattern    |
|  /
