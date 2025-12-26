# React Hooks Reference

This page documents all custom React hooks used in the Cognia application. Each hook provides reusable stateful logic for specific functionality.

## Table of Contents

- [useAgent](#useagent) - Multi-step AI agent execution
- [useMessages](#usemessages) - Message state management
- [useVectorDB](#usevectordb) - Vector database operations
- [useRAG](#userag) - Retrieval Augmented Generation
- [useSessionSearch](#usesessionsearch) - Session search functionality
- [useKeyboardShortcuts](#usekeyboardshortcuts) - Global keyboard shortcuts
- [useSpeech](#usespeech) - Voice input and text-to-speech
- [useLearningMode](#uselearningmode) - Learning mode management
- [useWorkflow](#useworkflow) - Workflow automation
- [useSkills](#useskills) - Skills system
- [useStructuredOutput](#usestructuredoutput) - Zod-structured output
- [useTranslate](#usetranslate) - Translation services

---

## useAgent

**Location**: `hooks/use-agent.ts`

Multi-step AI agent execution with tool calling support.

### TypeScript Interface

```typescript
interface UseAgentOptions {
  systemPrompt?: string;
  maxSteps?: number;
  temperature?: number;
  tools?: Record<string, AgentTool>;
  enablePlanning?: boolean;
  enableSkills?: boolean;
  onStepStart?: (step: number) => void;
  onStepComplete?: (step: number, response: string, toolCalls: ToolCall[]) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (toolCall: ToolCall) => void;
}

interface UseAgentReturn {
  // State
  isRunning: boolean;
  currentStep: number;
  error: string | null;
  result: AgentResult | AgentLoopResult | null;
  toolCalls: ToolCall[];

  // Execution
  run: (prompt: string) => Promise<AgentResult>;
  runWithPlanning: (task: string) => Promise<AgentLoopResult>;
  stop: () => void;

  // Tool management
  registerTool: (name: string, tool: AgentTool) => void;
  unregisterTool: (name: string) => void;
  getRegisteredTools: () => string[];

  // Utilities
  reset: () => void;
  getLastResponse: () => string;
}
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| systemPrompt | string | "You are a helpful AI assistant." | System prompt for the agent |
| maxSteps | number | 10 | Maximum number of execution steps |
| temperature | number | 0.7 | Sampling temperature (0-1) |
| tools | Record<string, AgentTool> | {} | Custom tools for the agent to use |
| enablePlanning | boolean | false | Enable planning mode for complex tasks |
| enableSkills | boolean | true | Enable active skills from skill store |
| onStepStart | (step: number) => void | - | Callback when a step starts |
| onStepComplete | (step: number, response: string, toolCalls: ToolCall[]) => void | - | Callback when a step completes |
| onToolCall | (toolCall: ToolCall) => void | - | Callback when a tool is called |
| onToolResult | (toolCall: ToolCall) => void | - | Callback when a tool result is received |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| isRunning | boolean | Whether the agent is currently running |
| currentStep | number | Current execution step number |
| error | string \| null | Error message if execution failed |
| result | AgentResult \| AgentLoopResult \| null | Final execution result |
| toolCalls | ToolCall[] | All tool calls made during execution |
| run | (prompt: string) => Promise<AgentResult> | Execute agent with a prompt |
| runWithPlanning | (task: string) => Promise<AgentLoopResult> | Execute with planning mode |
| stop | () => void | Stop the current execution |
| registerTool | (name: string, tool: AgentTool) => void | Register a custom tool |
| unregisterTool | (name: string) => void | Unregister a tool |
| getRegisteredTools | () => string[] | Get list of registered tool names |
| reset | () => void | Reset agent state |
| getLastResponse | () => string | Get the last response text |

### Usage Example

```typescript
import { useAgent } from '@/hooks/use-agent';
import { Button } from '@/components/ui/button';

function AgentChat() {
  const agent = useAgent({
    maxSteps: 10,
    enableSkills: true,
    onStepStart: (step) => {
      console.log(`Starting step ${step}`);
    },
    onStepComplete: (step, response, toolCalls) => {
      console.log(`Step ${step} completed with ${toolCalls.length} tool calls`);
    },
  });

  const handleRunAgent = async () => {
    try {
      const result = await agent.run(
        'Search for recent AI news and summarize the key findings'
      );

      if (result.success) {
        console.log('Final response:', result.finalResponse);
        console.log('Total steps:', result.totalSteps);
        console.log('Duration:', result.duration);
      } else {
        console.error('Agent failed:', result.error);
      }
    } catch (error) {
      console.error('Execution error:', error);
    }
  };

  return (
    <div>
      <p>Status: {agent.isRunning ? `Running (Step ${agent.currentStep})` : 'Idle'}</p>
      {agent.error && <p className="text-red-500">Error: {agent.error}</p>}
      <Button onClick={handleRunAgent} disabled={agent.isRunning}>
        {agent.isRunning ? 'Running...' : 'Run Agent'}
      </Button>
      <Button onClick={agent.stop} disabled={!agent.isRunning}>
        Stop
      </Button>
    </div>
  );
}
```

### Using with Planning Mode

```typescript
const agent = useAgent({
  enablePlanning: true,
  maxSteps: 30,
});

const handleComplexTask = async () => {
  const result = await agent.runWithPlanning(
    'Research the latest developments in large language models and create a comprehensive report'
  );

  if (result.success) {
    console.log('Tasks completed:', result.tasks.length);
    console.log('Total steps:', result.totalSteps);
    console.log('Summary:', result.finalSummary);
  }
};
```

### Registering Custom Tools

```typescript
const agent = useAgent();

// Register a custom tool
agent.registerTool('calculate', {
  description: 'Perform mathematical calculations',
  parameters: {
    expression: {
      type: 'string',
      description: 'Mathematical expression to evaluate',
    },
  },
  execute: async (params) => {
    try {
      // Safe evaluation of math expression
      const result = Function('"use strict"; return (' + params.expression + ')')();
      return { result: String(result) };
    } catch (error) {
      return { error: 'Invalid expression' };
    }
  },
});
```

### Best Practices

1. **Always check `result.success`** before using the result
2. **Handle errors** from both the execution and the tool calls
3. **Use planning mode** for complex multi-step tasks
4. **Provide clear system prompts** for better agent behavior
5. **Monitor step count** to avoid infinite loops
6. **Clean up tools** when unmounting components

### Common Pitfalls

- Forgetting to check `result.success` before accessing result properties
- Not handling tool execution errors
- Setting `maxSteps` too high for simple tasks
- Not providing enough context in the system prompt

---

## useMessages

**Location**: `hooks/use-messages.ts`

Message state management with IndexedDB persistence and conversation branching support.

### TypeScript Interface

```typescript
interface UseMessagesOptions {
  sessionId: string | null;
  branchId?: string | null;
  onError?: (error: Error) => void;
}

interface UseMessagesReturn {
  messages: UIMessage[];
  isLoading: boolean;
  isInitialized: boolean;

  // Message operations
  addMessage: (message: Omit<UIMessage, 'id' | 'createdAt'>) => Promise<UIMessage>;
  updateMessage: (id: string, updates: Partial<UIMessage>) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  deleteMessagesAfter: (messageId: string) => Promise<void>;
  clearMessages: () => Promise<void>;

  // Streaming support
  appendToMessage: (id: string, chunk: string) => void;
  createStreamingMessage: (role: MessageRole) => UIMessage;

  // Bulk operations
  reloadMessages: () => Promise<void>;

  // Branch operations
  copyMessagesForBranch: (branchPointMessageId: string, newBranchId: string) => Promise<UIMessage[]>;
}
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| sessionId | string \| null | - | ID of the current session (required for most operations) |
| branchId | string \| null | null | ID of the current branch (null for main branch) |
| onError | (error: Error) => void | - | Error callback |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| messages | UIMessage[] | Array of messages in current branch |
| isLoading | boolean | Whether messages are being loaded |
| isInitialized | boolean | Whether initial load is complete |
| addMessage | (message) => Promise<UIMessage> | Add a new message |
| updateMessage | (id, updates) => Promise<void> | Update an existing message |
| deleteMessage | (id) => Promise<void> | Delete a message |
| deleteMessagesAfter | (id) => Promise<void> | Delete all messages after a point |
| clearMessages | () => Promise<void> | Clear all messages in session |
| appendToMessage | (id, chunk) => void | Append content (for streaming) |
| createStreamingMessage | (role) => UIMessage | Create message for streaming |
| reloadMessages | () => Promise<void> | Reload messages from database |
| copyMessagesForBranch | (messageId, branchId) => Promise<UIMessage[]> | Copy messages for new branch |

### Usage Example

```typescript
import { useMessages } from '@/hooks/use-messages';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

function ChatInterface({ sessionId, branchId }: { sessionId: string; branchId?: string }) {
  const { messages, isLoading, isInitialized, addMessage, updateMessage } = useMessages({
    sessionId,
    branchId,
    onError: (error) => {
      console.error('Message error:', error);
    },
  });

  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    try {
      // Add user message
      await addMessage({
        role: 'user',
        content: inputValue,
      });

      setInputValue('');

      // Create assistant message for streaming
      const assistantMessage = createStreamingMessage('assistant');

      // Simulate streaming response
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: inputValue }),
      });

      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          appendToMessage(assistantMessage.id, chunk);
        }
      }

      // Mark as complete
      await updateMessage(assistantMessage.id, {
        status: 'completed',
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (isLoading || !isInitialized) {
    return <div>Loading messages...</div>;
  }

  return (
    <div>
      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            {message.content}
          </div>
        ))}
      </div>
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        }}
      />
      <Button onClick={handleSendMessage}>Send</Button>
    </div>
  );
}
```

### Handling Streaming Responses

```typescript
const { createStreamingMessage, appendToMessage, updateMessage } = useMessages({
  sessionId,
});

const handleStreamResponse = async () => {
  // Create empty message for streaming
  const streamingMessage = createStreamingMessage('assistant');

  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userMessage }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.content) {
            appendToMessage(streamingMessage.id, data.content);
          }
        }
      }
    }

    // Update final state
    await updateMessage(streamingMessage.id, {
      status: 'completed',
      finishReason: 'stop',
    });
  } catch (error) {
    // Handle streaming error
    await updateMessage(streamingMessage.id, {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
```

### Working with Branches

```typescript
const { copyMessagesForBranch } = useMessages({
  sessionId,
  branchId: 'main',
});

const handleCreateBranch = async (branchPointMessageId: string) => {
  const newBranchId = `branch-${Date.now()}`;

  try {
    // Copy messages up to branch point
    const copiedMessages = await copyMessagesForBranch(
      branchPointMessageId,
      newBranchId
    );

    console.log(`Created branch ${newBranchId} with ${copiedMessages.length} messages`);

    // Switch to new branch
    switchBranch(newBranchId);
  } catch (error) {
    console.error('Failed to create branch:', error);
  }
};
```

### Best Practices

1. **Always handle errors** using the onError callback
2. **Wait for isInitialized** before rendering messages
3. **Use optimistic updates** for better UX
4. **Clean up resources** when unmounting
5. **Handle loading states** appropriately

---

## useVectorDB

**Location**: `hooks/use-vector-db.ts`

Vector database operations for RAG (Retrieval Augmented Generation) functionality with ChromaDB integration.

### TypeScript Interface

```typescript
interface UseVectorDBOptions {
  collectionName?: string;
  autoInitialize?: boolean;
}

interface UseVectorDBReturn {
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Collection management
  createCollection: (name: string, options?: CollectionOptions) => Promise<void>;
  deleteCollection: (name: string) => Promise<void>;
  renameCollection: (oldName: string, newName: string) => Promise<void>;
  truncateCollection: (name: string) => Promise<void>;
  exportCollection: (name: string) => Promise<CollectionExport>;
  importCollection: (data: CollectionImport, overwrite?: boolean) => Promise<void>;
  listAllCollections: () => Promise<VectorCollectionInfo[]>;
  getCollectionInfo: (name: string) => Promise<VectorCollectionInfo>;

  // Document operations
  addDocument: (content: string, metadata?: Record<string, string | number | boolean>) => Promise<string>;
  addDocumentBatch: (documents: DocumentInput[]) => Promise<string[]>;
  removeDocuments: (ids: string[]) => Promise<void>;

  // Search operations
  search: (query: string, topK?: number) => Promise<VectorSearchResult[]>;
  searchWithThreshold: (query: string, threshold: number, topK?: number) => Promise<VectorSearchResult[]>;
  searchWithOptions: (query: string, options?: SearchOptions) => Promise<VectorSearchResult[]>;
  searchWithFilters: (query: string, filters: PayloadFilter[], options?: SearchOptions) => Promise<VectorSearchResult[]>;
  peek: (topK?: number) => Promise<VectorSearchResult[]>;

  // Embedding operations
  embed: (text: string) => Promise<number[]>;
  embedBatch: (texts: string[]) => Promise<number[][]>;

  // Utilities
  getDocumentCount: () => Promise<number>;
  clearCollection: () => Promise<void>;
}
```

### Usage Example

```typescript
import { useVectorDB } from '@/hooks/use-vector-db';

function KnowledgeBase() {
  const vectorDB = useVectorDB({
    collectionName: 'documents',
    autoInitialize: true,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VectorSearchResult[]>([]);

  const handleAddDocument = async (content: string, title: string) => {
    try {
      const docId = await vectorDB.addDocument(content, {
        title,
        addedAt: Date.now(),
        category: 'general',
      });
      console.log('Document added with ID:', docId);
    } catch (error) {
      console.error('Failed to add document:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const results = await vectorDB.search(searchQuery, 5);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleBatchImport = async (documents: Array<{ content: string; title: string }>) => {
    try {
      const docs = documents.map(doc => ({
        content: doc.content,
        metadata: { title: doc.title },
      }));

      const ids = await vectorDB.addDocumentBatch(docs);
      console.log(`Added ${ids.length} documents`);
    } catch (error) {
      console.error('Batch import failed:', error);
    }
  };

  return (
    <div>
      <div className="search-box">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search knowledge base..."
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      <div className="results">
        {searchResults.map((result, i) => (
          <div key={i} className="result">
            <h4>{result.metadata?.title}</h4>
            <p>{result.content}</p>
            <small>Similarity: {result.similarity.toFixed(4)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Advanced Search with Filters

```typescript
const handleFilteredSearch = async () => {
  const results = await vectorDB.searchWithFilters(
    searchQuery,
    [
      { field: 'category', operator: '=', value: 'technical' },
      { field: 'addedAt', operator: '>', value: Date.now() - 30 * 24 * 60 * 60 * 1000 },
    ],
    { limit: 10, includeMetadata: true }
  );

  setSearchResults(results);
};
```

### Collection Management

```typescript
const handleExportCollection = async () => {
  try {
    const exported = await vectorDB.exportCollection('documents');
    const blob = new Blob([JSON.stringify(exported, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collection-export-${Date.now()}.json`;
    a.click();
  } catch (error) {
    console.error('Export failed:', error);
  }
};

const handleImportCollection = async (file: File) => {
  try {
    const content = await file.text();
    const data = JSON.parse(content) as CollectionImport;
    await vectorDB.importCollection(data, false);
    console.log('Collection imported successfully');
  } catch (error) {
    console.error('Import failed:', error);
  }
};
```

---

## useRAG

**Location**: `hooks/use-rag.ts`

Retrieval Augmented Generation for enhanced AI responses with context from your knowledge base.

### TypeScript Interface

```typescript
interface UseRAGOptions {
  collectionName?: string;
  topK?: number;
  similarityThreshold?: number;
  maxContextLength?: number;
  chunkingStrategy?: 'fixed' | 'sentence' | 'paragraph';
  chunkSize?: number;
  chunkOverlap?: number;
}

interface UseRAGReturn {
  isLoading: boolean;
  error: string | null;
  lastContext: RAGContext | null;

  // Indexing operations
  indexSingleDocument: (doc: RAGDocument) => Promise<IndexingResult>;
  indexMultipleDocuments: (docs: RAGDocument[]) => Promise<IndexingResult[]>;
  indexText: (id: string, text: string, title?: string) => Promise<IndexingResult>;

  // Retrieval operations
  retrieve: (query: string) => Promise<RAGContext>;
  retrieveWithOptions: (query: string, options: Partial<UseRAGOptions>) => Promise<RAGContext>;

  // Prompt generation
  generatePrompt: (query: string, systemPrompt?: string) => Promise<string>;
  generatePromptWithContext: (query: string, context: RAGContext, systemPrompt?: string) => string;

  // Chunking utilities
  chunkText: (text: string, options?: Partial<ChunkingOptions>) => ChunkingResult;
  estimateChunks: (textLength: number) => number;

  // Simple RAG helper
  createSimpleRAG: () => SimpleRAG;
}
```

### Usage Example

```typescript
import { useRAG } from '@/hooks/use-rag';

function RAGChat() {
  const rag = useRAG({
    collectionName: 'knowledge-base',
    topK: 5,
    similarityThreshold: 0.7,
    maxContextLength: 4000,
    chunkingStrategy: 'paragraph',
    chunkSize: 500,
    chunkOverlap: 50,
  });

  const [query, setQuery] = useState('');
  const [augmentedPrompt, setAugmentedPrompt] = useState('');

  const handleIndexDocument = async (title: string, content: string) => {
    try {
      const result = await rag.indexText(
        `doc-${Date.now()}`,
        content,
        title
      );

      console.log(`Indexed ${result.chunksCount} chunks from document`);
    } catch (error) {
      console.error('Indexing failed:', error);
    }
  };

  const handleRetrieve = async () => {
    if (!query.trim()) return;

    try {
      const context = await rag.retrieve(query);
      console.log(`Retrieved ${context.chunks.length} relevant chunks`);

      // Generate augmented prompt
      const prompt = rag.generatePromptWithContext(
        query,
        context,
        'You are a helpful assistant. Answer the question using the provided context.'
      );

      setAugmentedPrompt(prompt);

      // Use with AI provider
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error('RAG retrieval failed:', error);
    }
  };

  return (
    <div>
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask a question..."
      />
      <button onClick={handleRetrieve}>Search with RAG</button>

      {rag.lastContext && (
        <div className="context">
          <h4>Retrieved Context:</h4>
          {rag.lastContext.chunks.map((chunk, i) => (
            <div key={i} className="chunk">
              <small>Score: {chunk.score.toFixed(4)}</small>
              <p>{chunk.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Using Simple RAG Helper

```typescript
const simpleRAG = rag.createSimpleRAG();

// Add documents
await simpleRAG.addDocument('doc1', 'Content of document 1...', { title: 'Document 1' });
await simpleRAG.addDocument('doc2', 'Content of document 2...', { title: 'Document 2' });

// Query with RAG
const answer = await simpleRAG.query('What is the main topic?');
console.log(answer);
```

---

## useSpeech

**Location**: `hooks/use-speech.ts`

Voice input (speech-to-text) and text-to-speech functionality using Web Speech APIs or OpenAI Whisper.

### TypeScript Interface

```typescript
interface UseSpeechReturn {
  // Speech-to-text
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;

  // Text-to-speech
  isSpeaking: boolean;
  speak: (text: string, options?: SpeechOptions) => void;
  stopSpeaking: () => void;
  pauseSpeaking: () => void;
  resumeSpeaking: () => void;

  // Capabilities
  supportsSpeechRecognition: boolean;
  supportsSpeechSynthesis: boolean;

  // Settings
  language: string;
  setLanguage: (lang: string) => void;
  voice: SpeechSynthesisVoice | null;
  setVoice: (voice: SpeechSynthesisVoice) => void;
  rate: number;
  setRate: (rate: number) => void;
  pitch: number;
  setPitch: (pitch: number) => void;
}
```

### Usage Example

```typescript
import { useSpeech } from '@/hooks/use-speech';

function VoiceChat() {
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSpeaking,
    speak,
    stopSpeaking,
    supportsSpeechRecognition,
  } = useSpeech();

  const handleSendMessage = async () => {
    if (!transcript.trim()) return;

    // Send transcript to AI
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: transcript }),
    });

    const data = await response.json();

    // Speak the response
    speak(data.message, {
      rate: 1.0,
      pitch: 1.0,
      voice: undefined, // Use default
    });

    resetTranscript();
  };

  return (
    <div>
      {!supportsSpeechRecognition && (
        <p>Speech recognition is not supported in this browser.</p>
      )}

      <button
        onClick={isListening ? stopListening : startListening}
        disabled={!supportsSpeechRecognition}
      >
        {isListening ? 'Stop Listening' : 'Start Listening'}
      </button>

      <div className="transcript">
        <p>{transcript}</p>
        <p className="interim">{interimTranscript}</p>
      </div>

      <button onClick={handleSendMessage} disabled={!transcript}>
        Send Message
      </button>

      {isSpeaking && (
        <button onClick={stopSpeaking}>Stop Speaking</button>
      )}
    </div>
  );
}
```

---

## useKeyboardShortcuts

**Location**: `hooks/use-keyboard-shortcuts.ts`

Global keyboard shortcut management for the application.

### TypeScript Interface

```typescript
interface ShortcutMap {
  [key: string]: () => void;
}

interface UseKeyboardShortcutsReturn {
  registerShortcut: (key: string, handler: () => void, description?: string) => void;
  unregisterShortcut: (key: string) => void;
  getShortcuts: () => Array<{ key: string; description: string }>;
  isShortcutPressed: (key: string) => boolean;
}
```

### Usage Example

```typescript
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useEffect } from 'react';

function ChatWithShortcuts() {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    // Register shortcuts
    registerShortcut('Ctrl+Enter', () => {
      console.log('Send message');
    }, 'Send message');

    registerShortcut('Ctrl+K', () => {
      console.log('Focus search');
    }, 'Focus search');

    registerShortcut('Escape', () => {
      console.log('Clear input');
    }, 'Clear input');

    // Cleanup
    return () => {
      unregisterShortcut('Ctrl+Enter');
      unregisterShortcut('Ctrl+K');
      unregisterShortcut('Escape');
    };
  }, [registerShortcut, unregisterShortcut]);

  return (
    <div>
      <p>Press Ctrl+Enter to send, Ctrl+K to search, Escape to clear</p>
    </div>
  );
}
```

---

## Hook Reference Summary

| Hook | Purpose | Key Features |
|------|---------|--------------|
| useAgent | Multi-step AI execution | Tool calling, planning mode, skills integration |
| useMessages | Message management | IndexedDB persistence, branching, streaming |
| useVectorDB | Vector database | ChromaDB integration, search, filtering |
| useRAG | Retrieval Augmented Generation | Context retrieval, prompt augmentation |
| useSessionSearch | Session search | Full-text search across conversations |
| useKeyboardShortcuts | Global shortcuts | Register/unregister, key combinations |
| useSpeech | Voice I/O | Speech-to-text, text-to-speech |
| useLearningMode | Learning mode | Socratic method, skill progression |
| useWorkflow | Workflow automation | Multi-step task execution |
| useSkills | Skills system | Register, execute, manage skills |
| useStructuredOutput | Structured output | Zod schema validation |
| useTranslate | Translation | Multi-language support |

## Related Documentation

- [API Overview](overview.md) - API introduction and patterns
- [Stores Reference](stores.md) - Zustand state management stores
- [Components Reference](components.md) - React component API
- [Utilities Reference](utilities.md) - Utility function reference

---

**Next**: [Stores Reference](stores.md)
