# Zustand Stores Reference

This page documents all Zustand stores used for state management in the Cognia application. Stores are organized by category in the `stores/` directory and use the `persist` middleware for localStorage persistence.

## Table of Contents

- [Overview](#overview)

### Agent Stores (`stores/agent/`)

- [Agent Store](#agent-store) - Agent execution tracking
- [Background Agent Store](#background-agent-store) - Background agent management
- [Sub-Agent Store](#sub-agent-store) - Sub-agent orchestration
- [Skill Store](#skill-store) - Skills state management

### Chat Stores (`stores/chat/`)

- [Chat Store](#chat-store) - Chat state management
- [Session Store](#session-store) - Session and branch management
- [Quote Store](#quote-store) - Text quotation management
- [Summary Store](#summary-store) - Summary generation
- [Chat Widget Store](#chat-widget-store) - Widget state

### Context Stores (`stores/context/`)

- [Clipboard Context Store](#clipboard-context-store) - Clipboard monitoring
- [Selection Store](#selection-store) - Text selection state

### Data Stores (`stores/data/`)

- [Memory Store](#memory-store) - Cross-session memory
- [Vector Store](#vector-store) - Vector database state

### Media Stores (`stores/media/`)

- [Media Store](#media-store) - Image/video management
- [Image Studio Store](#image-studio-store) - Image editor state
- [Screen Recording Store](#screen-recording-store) - Screen recording

### Settings Stores (`stores/settings/`)

- [Settings Store](#settings-store) - User settings
- [Preset Store](#preset-store) - Preset management
- [Custom Theme Store](#custom-theme-store) - Custom themes

### System Stores (`stores/system/`)

- [UI Store](#ui-store) - UI state management
- [Usage Store](#usage-store) - Token and cost tracking
- [Environment Store](#environment-store) - Environment state
- [Proxy Store](#proxy-store) - Proxy configuration
- [Window Store](#window-store) - Window state

### Tools Stores (`stores/tools/`)

- [Jupyter Store](#jupyter-store) - Jupyter session management
- [PPT Editor Store](#ppt-editor-store) - PPT editor state
- [Template Store](#template-store) - Template management

### Workflow Stores (`stores/workflow/`)

- [Workflow Store](#workflow-store) - Workflow execution
- [Workflow Editor Store](#workflow-editor-store) - Editor state

### Other Stores

- [MCP Store](#mcp-store) - MCP server management
- [Project Store](#project-store) - Project management
- [Artifact Store](#artifact-store) - Artifact management

---

## Overview

All Zustand stores in Cognia follow this pattern:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface State {
  // State properties
  value: string;
  // Actions
  setValue: (value: string) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      value: 'default',
      setValue: (value) => set({ value }),
    }),
    {
      name: 'cognia-storage-key', // localStorage key
    }
  )
);
```

### Store Persistence Keys

| Store | localStorage Key |
|-------|------------------|
| settings | cognia-settings |
| sessions | cognia-sessions |
| artifacts | cognia-artifacts |
| agent | cognia-agent |
| memory | cognia-memory |
| projects | cognia-projects |
| usage | cognia-usage |
| presets | cognia-presets |
| mcp | cognia-mcp |

---

## Settings Store

**Location**: `stores/settings-store.ts`

Manages user preferences, provider configurations, and application settings.

### TypeScript Interface

```typescript
interface SettingsState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  colorTheme: ColorThemePreset;
  customThemes: CustomTheme[];
  setTheme: (theme: Theme) => void;
  setColorTheme: (theme: ColorThemePreset) => void;

  // Language
  language: 'en' | 'zh-CN';
  setLanguage: (language: Language) => void;

  // Custom Instructions
  customInstructions: string;
  customInstructionsEnabled: boolean;
  aboutUser: string;
  responsePreferences: string;
  setCustomInstructions: (instructions: string) => void;
  setAboutUser: (about: string) => void;

  // Provider Settings
  providerSettings: Record<string, UserProviderSettings>;
  setProviderSettings: (providerId: string, settings: Partial<UserProviderSettings>) => void;
  getProviderSettings: (providerId: string) => UserProviderSettings | undefined;

  // Multi-API Key Management
  addApiKey: (providerId: string, apiKey: string) => void;
  removeApiKey: (providerId: string, apiKeyIndex: number) => void;
  setApiKeyRotation: (providerId: string, enabled: boolean, strategy?: ApiKeyRotationStrategy) => void;
  getActiveApiKey: (providerId: string) => string | undefined;
  rotateToNextApiKey: (providerId: string) => string | undefined;

  // Default Provider
  defaultProvider: string;
  setDefaultProvider: (providerId: string) => void;

  // Chat Preferences
  streamingEnabled: boolean;
  streamResponses: boolean;
  sendOnEnter: boolean;
  defaultTemperature: number;
  defaultMaxTokens: number;
  contextLength: number;
  setStreamingEnabled: (enabled: boolean) => void;
  setDefaultTemperature: (temp: number) => void;

  // Response Display
  codeTheme: CodeTheme;
  codeFontSize: number;
  showLineNumbers: boolean;
  enableMathRendering: boolean;
  enableMermaidDiagrams: boolean;
  setCodeTheme: (theme: CodeTheme) => void;
  setCodeFontSize: (size: number) => void;

  // Search Settings
  searchProviders: Record<SearchProviderType, SearchProviderSettings>;
  defaultSearchProvider: SearchProviderType;
  setSearchProviderSettings: (providerId: SearchProviderType, settings: Partial<SearchProviderSettings>) => void;

  // Speech Settings
  speechSettings: SpeechSettings;
  setSpeechSettings: (settings: Partial<SpeechSettings>) => void;

  // Reset
  resetSettings: () => void;
}
```

### Usage Examples

```typescript
import { useSettingsStore } from '@/stores/settings-store';

// Get theme
const theme = useSettingsStore((state) => state.theme);

// Get provider settings with selector
const openaiSettings = useSettingsStore((state) =>
  state.providerSettings['openai']
);

// Update settings
const setTheme = useSettingsStore((state) => state.setTheme);
setTheme('dark');

// Add API key
const addApiKey = useSettingsStore((state) => state.addApiKey);
addApiKey('openai', 'sk-...');

// Get active API key (with rotation support)
const getActiveApiKey = useSettingsStore((state) => state.getActiveApiKey);
const apiKey = getActiveApiKey('openai');

// In a component
function SettingsPanel() {
  const { theme, setTheme, streamingEnabled, setStreamingEnabled } = useSettingsStore();

  return (
    <div>
      <select value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
      <label>
        <input
          type="checkbox"
          checked={streamingEnabled}
          onChange={(e) => setStreamingEnabled(e.target.checked)}
        />
        Enable streaming
      </label>
    </div>
  );
}
```

### Provider Configuration

```typescript
// Configure OpenAI provider
const setProviderSettings = useSettingsStore((state) => state.setProviderSettings);

setProviderSettings('openai', {
  apiKey: 'sk-...',
  defaultModel: 'gpt-4o',
  enabled: true,
  baseURL: 'https://api.openai.com/v1',
});

// Configure custom provider
const addCustomProvider = useSettingsStore((state) => state.addCustomProvider);

const providerId = addCustomProvider({
  customName: 'My Custom Provider',
  customModels: ['model-1', 'model-2'],
  apiKey: 'custom-key',
  baseURL: 'https://custom-api.com',
});
```

---

## Session Store

**Location**: `stores/session-store.ts`

Manages chat sessions with conversation branching support.

### TypeScript Interface

```typescript
interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;

  // Session CRUD
  createSession: (params: CreateSessionParams) => string;
  updateSession: (id: string, updates: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  getSession: (id: string) => Session | undefined;
  getActiveSession: () => Session | undefined;

  // Active Session
  setActiveSession: (id: string) => void;
  clearActiveSession: () => void;

  // Branching
  createBranch: (sessionId: string, branchPointMessageId: string, name?: string) => string;
  switchBranch: (sessionId: string, branchId: string) => void;
  deleteBranch: (sessionId: string, branchId: string) => void;
  renameBranch: (sessionId: string, branchId: string, name: string) => void;
  getBranches: (sessionId: string) => Branch[];

  // Utilities
  duplicateSession: (id: string) => string;
  togglePinSession: (id: string) => void;
  getAllSessions: () => Session[];
  getSessionsByMode: (mode: ChatMode) => Session[];
}
```

### Usage Examples

```typescript
import { useSessionStore } from '@/stores/session-store';

// Create a new session
const createSession = useSessionStore((state) => state.createSession);

const sessionId = createSession({
  title: 'New Conversation',
  mode: 'chat',
  provider: 'openai',
  model: 'gpt-4o',
});

// Update session
const updateSession = useSessionStore((state) => state.updateSession);

updateSession(sessionId, {
  title: 'Updated Title',
  model: 'gpt-4o-mini',
});

// Create a branch
const createBranch = useSessionStore((state) => state.createBranch);

const branchId = createBranch(
  sessionId,
  'message-id-123',
  'Alternative response path'
);

// Switch to a branch
const switchBranch = useSessionStore((state) => state.switchBranch);
switchBranch(sessionId, branchId);

// In a component
function SessionList() {
  const { sessions, activeSessionId, setActiveSession, deleteSession } = useSessionStore();

  return (
    <ul>
      {sessions.map((session) => (
        <li key={session.id}>
          <button
            className={session.id === activeSessionId ? 'active' : ''}
            onClick={() => setActiveSession(session.id)}
          >
            {session.title}
          </button>
          <button onClick={() => deleteSession(session.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

---

## Artifact Store

**Location**: `stores/artifact-store.ts`

Manages AI-generated artifacts, canvas documents, and version history.

### TypeScript Interface

```typescript
interface ArtifactState {
  // Artifacts
  artifacts: Record<string, Artifact>;
  activeArtifactId: string | null;

  // Canvas
  canvasDocuments: Record<string, CanvasDocument>;
  activeCanvasId: string | null;
  canvasOpen: boolean;

  // Analysis
  analysisResults: Record<string, AnalysisResult>;

  // Panel State
  panelOpen: boolean;
  panelView: 'artifact' | 'canvas' | 'analysis';

  // Artifact Actions
  createArtifact: (params: CreateArtifactParams) => string;
  updateArtifact: (id: string, updates: Partial<Artifact>) => void;
  deleteArtifact: (id: string) => void;
  getArtifact: (id: string) => Artifact | undefined;
  setActiveArtifact: (id: string) => void;

  // Canvas Actions
  createCanvasDocument: (params: CreateCanvasParams) => string;
  updateCanvasDocument: (id: string, updates: Partial<CanvasDocument>) => void;
  deleteCanvasDocument: (id: string) => void;
  setActiveCanvas: (id: string) => void;

  // Suggestions
  addSuggestion: (documentId: string, suggestion: Suggestion) => void;
  applySuggestion: (documentId: string, suggestionId: string) => void;
  dismissSuggestion: (documentId: string, suggestionId: string) => void;

  // Version History
  saveCanvasVersion: (documentId: string, description?: string, auto?: boolean) => string;
  restoreCanvasVersion: (documentId: string, versionId: string) => void;
  getCanvasVersions: (documentId: string) => CanvasVersion[];

  // Panel Management
  openPanel: (view: 'artifact' | 'canvas' | 'analysis') => void;
  closePanel: () => void;
  setPanelView: (view: 'artifact' | 'canvas' | 'analysis') => void;
}
```

### Usage Examples

```typescript
import { useArtifactStore } from '@/stores/artifact-store';

// Create an artifact
const createArtifact = useArtifactStore((state) => state.createArtifact);

const artifactId = createArtifact({
  sessionId: 'session-123',
  messageId: 'msg-456',
  type: 'code',
  title: 'Quick Sort Implementation',
  content: 'function quickSort(arr) { ... }',
  language: 'typescript',
});

// Create a canvas document
const createCanvasDocument = useArtifactStore((state) => state.createCanvasDocument);

const canvasId = createCanvasDocument({
  title: 'Algorithm Implementation',
  language: 'typescript',
  initialContent: '// Start coding here...',
});

// Add AI suggestion
const addSuggestion = useArtifactStore((state) => state.addSuggestion);

addSuggestion(canvasId, {
  id: 'sugg-1',
  type: 'improve',
  range: { startLine: 1, endLine: 5 },
  originalText: 'const x = 1;',
  suggestedText: 'const x: number = 1;',
  explanation: 'Add type annotation for better type safety',
  status: 'pending',
});

// Save version
const saveCanvasVersion = useArtifactStore((state) => state.saveCanvasVersion);
const versionId = saveCanvasVersion(canvasId, 'Implemented quick sort algorithm', false);

// Restore version
const restoreCanvasVersion = useArtifactStore((state) => state.restoreCanvasVersion);
restoreCanvasVersion(canvasId, versionId);

// In a component
function ArtifactPanel() {
  const { activeArtifact, panelOpen, closePanel } = useArtifactStore();

  if (!panelOpen || !activeArtifact) return null;

  return (
    <div className="artifact-panel">
      <div className="header">
        <h2>{activeArtifact.title}</h2>
        <button onClick={closePanel}>Close</button>
      </div>
      <pre className="content">{activeArtifact.content}</pre>
    </div>
  );
}
```

---

## Agent Store

**Location**: `stores/agent-store.ts`

Tracks AI agent execution progress and tool invocations.

### TypeScript Interface

```typescript
interface AgentState {
  executions: Record<string, AgentExecution>;
  activeExecutionId: string | null;

  // Execution Management
  startExecution: (params: StartExecutionParams) => string;
  updateExecution: (id: string, updates: Partial<AgentExecution>) => void;
  endExecution: (id: string, result: ExecutionResult) => void;
  getExecution: (id: string) => AgentExecution | undefined;
  getActiveExecution: () => AgentExecution | undefined;

  // Tool Calls
  addToolCall: (executionId: string, toolCall: ToolCall) => void;
  updateToolCall: (executionId: string, toolCallId: string, updates: Partial<ToolCall>) => void;
  getToolCalls: (executionId: string) => ToolCall[];

  // Progress
  setCurrentStep: (executionId: string, step: number) => void;
  incrementStep: (executionId: string) => void;
}
```

### Usage Examples

```typescript
import { useAgentStore } from '@/stores/agent-store';

// Start tracking agent execution
const startExecution = useAgentStore((state) => state.startExecution);

const executionId = startExecution({
  agentType: 'autonomous',
  prompt: 'Research and summarize recent AI developments',
  maxSteps: 10,
});

// Add tool call
const addToolCall = useAgentStore((state) => state.addToolCall);

addToolCall(executionId, {
  id: 'tool-1',
  name: 'web_search',
  arguments: { query: 'AI developments 2024' },
  status: 'running',
  startTime: Date.now(),
});

// Update tool call result
const updateToolCall = useAgentStore((state) => state.updateToolCall);

updateToolCall(executionId, 'tool-1', {
  status: 'completed',
  result: { searchResults: [...] },
  endTime: Date.now(),
});

// End execution
const endExecution = useAgentStore((state) => state.endExecution);

endExecution(executionId, {
  success: true,
  finalResponse: 'Summary of AI developments...',
  totalSteps: 5,
  duration: 15000,
});

// In a component - display agent progress
function AgentProgress() {
  const { activeExecution, getToolCalls } = useAgentStore();

  if (!activeExecution) return null;

  const toolCalls = getToolCalls(activeExecution.id);

  return (
    <div className="agent-progress">
      <h3>Agent Execution</h3>
      <p>Step: {activeExecution.currentStep} / {activeExecution.maxSteps}</p>
      <div className="tool-calls">
        {toolCalls.map((call) => (
          <div key={call.id} className={`tool-call ${call.status}`}>
            <span>{call.name}</span>
            <span>{call.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Memory Store

**Location**: `stores/memory-store.ts`

Cross-session AI memory for persistent context.

### TypeScript Interface

```typescript
interface MemoryState {
  memories: Record<string, Memory>;

  // CRUD
  createMemory: (params: CreateMemoryParams) => string;
  updateMemory: (id: string, updates: Partial<Memory>) => void;
  deleteMemory: (id: string) => void;
  getMemory: (id: string) => Memory | undefined;
  getAllMemories: () => Memory[];

  // Detection
  detectMemoryFromText: (text: string) => MemoryCandidate[];
  extractAndSaveMemory: (text: string) => string[];

  // Retrieval
  getRelevantMemories: (query: string, limit?: number) => Memory[];
  getMemoriesForPrompt: (sessionId: string) => string;

  // Categories
  getMemoriesByCategory: (category: string) => Memory[];
}
```

### Usage Examples

```typescript
import { useMemoryStore } from '@/stores/memory-store';

// Create a memory
const createMemory = useMemoryStore((state) => state.createMemory);

const memoryId = createMemory({
  content: 'User prefers TypeScript over JavaScript',
  category: 'preference',
  importance: 'high',
});

// Get relevant memories for context
const getMemoriesForPrompt = useMemoryStore((state) => state.getMemoriesForPrompt);

const memoryContext = getMemoriesForPrompt('session-123');
// Returns formatted string of relevant memories

// Detect new memories from text
const detectMemoryFromText = useMemoryStore((state) => state.detectMemoryFromText);

const candidates = detectMemoryFromText(
  "I work as a software engineer and I'm interested in AI safety research"
);

// Extract and save automatically
const extractAndSaveMemory = useMemoryStore((state) => state.extractAndSaveMemory);
const newMemoryIds = extractAndSaveMemory(userMessage);
```

---

## Project Store

**Location**: `stores/project-store.ts`

Project organization with knowledge bases.

### TypeScript Interface

```typescript
interface ProjectState {
  projects: Record<string, Project>;
  activeProjectId: string | null;

  // CRUD
  createProject: (params: CreateProjectParams) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  getActiveProject: () => Project | undefined;

  // Active Project
  setActiveProject: (id: string) => void;
  clearActiveProject: () => void;

  // Knowledge Base
  addKnowledgeFile: (projectId: string, file: KnowledgeFile) => void;
  removeKnowledgeFile: (projectId: string, fileId: string) => void;
  updateKnowledgeFile: (projectId: string, fileId: string, updates: Partial<KnowledgeFile>) => void;

  // Sessions
  addSessionToProject: (projectId: string, sessionId: string) => void;
  removeSessionFromProject: (projectId: string, sessionId: string) => void;
  getProjectSessions: (projectId: string) => string[];

  // Templates
  createFromTemplate: (templateId: string, name: string) => string;
}
```

### Usage Examples

```typescript
import { useProjectStore } from '@/stores/project-store';

// Create a project
const createProject = useProjectStore((state) => state.createProject);

const projectId = createProject({
  name: 'AI Research Project',
  description: 'Researching latest AI developments',
  icon: 'brain',
  color: '#3b82f6',
});

// Add knowledge file
const addKnowledgeFile = useProjectStore((state) => state.addKnowledgeFile);

addKnowledgeFile(projectId, {
  id: 'kf-1',
  name: 'research-paper.pdf',
  type: 'file',
  content: '...', // file content or reference
  size: 1024000,
});

// Add session to project
const addSessionToProject = useProjectStore((state) => state.addSessionToProject);
addSessionToProject(projectId, 'session-123');
```

---

## Preset Store

**Location**: `stores/preset-store.ts`

Chat configuration presets.

### TypeScript Interface

```typescript
interface PresetState {
  presets: Record<string, Preset>;
  defaultPresetId: string | null;

  // CRUD
  createPreset: (params: CreatePresetParams) => string;
  updatePreset: (id: string, updates: Partial<Preset>) => void;
  deletePreset: (id: string) => void;
  getPreset: (id: string) => Preset | undefined;
  getAllPresets: () => Preset[];

  // Default
  setDefaultPreset: (id: string) => void;
  getDefaultPreset: () => Preset | undefined;

  // Built-in presets
  getBuiltInPresets: () => Preset[];
}
```

### Usage Examples

```typescript
import { usePresetStore } from '@/stores/preset-store';

// Create a preset
const createPreset = usePresetStore((state) => state.createPreset);

const presetId = createPreset({
  name: 'Code Review',
  description: 'Optimized for code review tasks',
  systemPrompt: 'You are a code reviewer. Analyze code for bugs, style issues, and improvements.',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.3,
  maxTokens: 4096,
});

// Apply preset to session
const preset = usePresetStore((state) => state.getPreset(presetId));

if (preset) {
  // Apply preset settings
  useSessionStore.getState().updateSession(sessionId, {
    provider: preset.provider,
    model: preset.model,
    systemPrompt: preset.systemPrompt,
    temperature: preset.temperature,
  });
}
```

---

## Usage Store

**Location**: `stores/usage-store.ts`

Token usage and cost tracking.

### TypeScript Interface

```typescript
interface UsageState {
  records: Record<string, UsageRecord>;

  // Recording
  addUsageRecord: (record: UsageRecordInput) => void;
  updateUsageRecord: (id: string, updates: Partial<UsageRecord>) => void;

  // Retrieval
  getUsageByProvider: (provider: string) => UsageRecord[];
  getUsageBySession: (sessionId: string) => UsageRecord[];
  getDailyUsage: (date?: Date) => UsageRecord[];
  getTotalUsage: () => UsageTotals;

  // Analytics
  getCostByProvider: (provider: string, startDate?: Date, endDate?: Date) => number;
  getTokensByProvider: (provider: string, startDate?: Date, endDate?: Date) => { prompt: number; completion: number };
  getUsageStats: () => UsageStats;

  // Reset
  clearUsageRecords: () => void;
  clearOldRecords: (beforeDate: Date) => void;
}
```

### Usage Examples

```typescript
import { useUsageStore } from '@/stores/usage-store';

// Record usage after API call
const addUsageRecord = useUsageStore((state) => state.addUsageRecord);

addUsageRecord({
  sessionId: 'session-123',
  provider: 'openai',
  model: 'gpt-4o',
  promptTokens: 100,
  completionTokens: 200,
  totalTokens: 300,
  cost: 0.006,
});

// Get total usage
const getTotalUsage = useUsageStore((state) => state.getTotalUsage);
const totals = getTotalUsage();
// { totalCost: 1.23, totalTokens: 50000, byProvider: {...} }

// Get daily usage
const getDailyUsage = useUsageStore((state) => state.getDailyUsage);
const todayUsage = getDailyUsage();

// Display usage in component
function UsageDisplay() {
  const { getTotalUsage } = useUsageStore();
  const totals = getTotalUsage();

  return (
    <div>
      <p>Total Cost: ${totals.totalCost.toFixed(2)}</p>
      <p>Total Tokens: {totals.totalTokens.toLocaleString()}</p>
    </div>
  );
}
```

---

## MCP Store

**Location**: `stores/mcp-store.ts`

MCP (Model Context Protocol) server management.

### TypeScript Interface

```typescript
interface McpState {
  servers: Record<string, McpServerState>;
  initialized: boolean;

  // Initialization
  initialize: () => Promise<void>;
  loadServers: () => Promise<void>;

  // Server Management
  addServer: (id: string, config: McpServerConfig) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
  updateServer: (id: string, config: Partial<McpServerConfig>) => Promise<void>;
  getServer: (id: string) => McpServerState | undefined;
  getAllServers: () => McpServerState[];

  // Connection
  connectServer: (id: string) => Promise<void>;
  disconnectServer: (id: string) => Promise<void>;
  reconnectServer: (id: string) => Promise<void>;

  // Tools/Resources/Prompts
  listTools: (serverId: string) => McpTool[];
  listResources: (serverId: string) => McpResource[];
  listPrompts: (serverId: string) => McpPrompt[];

  // Execution
  callTool: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<ToolCallResult>;
  readResource: (serverId: string, uri: string) => Promise<ResourceContent>;
  getPrompt: (serverId: string, promptName: string, args?: Record<string, unknown>) => Promise<PromptContent>;
}
```

### Usage Examples

```typescript
import { useMcpStore } from '@/stores/mcp-store';

// Initialize MCP system
const initialize = useMcpStore((state) => state.initialize);
await initialize();

// Add a server
const addServer = useMcpStore((state) => state.addServer);

await addServer('filesystem', {
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/dir'],
  env: {},
  connectionType: 'stdio',
});

// Connect to server
const connectServer = useMcpStore((state) => state.connectServer);
await connectServer('filesystem');

// List available tools
const listTools = useMcpStore((state) => state.listTools);
const tools = listTools('filesystem');

// Call a tool
const callTool = useMcpStore((state) => state.callTool);

const result = await callTool('filesystem', 'read_file', {
  path: '/path/to/file.txt',
});

// In a component
function McpServerList() {
  const { servers, connectServer, disconnectServer } = useMcpStore();

  return (
    <div>
      {Object.values(servers).map((server) => (
        <div key={server.id}>
          <span>{server.config.name || server.id}</span>
          <span>{server.status}</span>
          <button
            onClick={() =>
              server.connected
                ? disconnectServer(server.id)
                : connectServer(server.id)
            }
          >
            {server.connected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## Store Summary Table

| Store | Purpose | Key Actions |
|-------|---------|-------------|
| settings | User preferences | setTheme, setProviderSettings, addApiKey |
| session | Chat sessions | createSession, createBranch, setActiveSession |
| artifact | AI-generated content | createArtifact, createCanvasDocument, saveCanvasVersion |
| agent | Agent execution tracking | startExecution, addToolCall, endExecution |
| memory | Cross-session memory | createMemory, getRelevantMemories |
| project | Project organization | createProject, addKnowledgeFile |
| preset | Chat configurations | createPreset, setDefaultPreset |
| usage | Token/cost tracking | addUsageRecord, getTotalUsage |
| mcp | MCP server management | addServer, connectServer, callTool |

## Related Documentation

- [API Overview](overview.md) - API introduction and patterns
- [Hooks Reference](hooks.md) - Custom React hooks
- [Components Reference](components.md) - React component API
- [Utilities Reference](utilities.md) - Utility function reference

---

**Next**: [Components Reference](components.md)
