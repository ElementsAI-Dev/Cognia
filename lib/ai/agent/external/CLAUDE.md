# External Agent Integration

This module provides support for integrating external AI agents into the Cognia agent system. It enables communication with agents via various protocols including ACP (Agent Client Protocol), A2A, HTTP, and WebSocket.

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Cognia Application                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ useExternalAgent │  │ AgentOrchestrator│  │ SubAgentExec  │ │
│  │      (hook)      │  │   (delegation)   │  │  (external)   │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘ │
│           │                     │                     │         │
│           └─────────────────────┼─────────────────────┘         │
│                                 ▼                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ExternalAgentManager (Singleton)             │  │
│  │  - Agent lifecycle management                             │  │
│  │  - Session management                                     │  │
│  │  - Delegation rules                                       │  │
│  │  - Tool integration                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                 │                               │
│           ┌─────────────────────┼─────────────────────┐         │
│           ▼                     ▼                     ▼         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  AcpClientAdapter│ │  (Future: A2A) │  │  (Future: HTTP) │ │
│  │                  │ │                 │  │                 │ │
│  └────────┬─────────┘  └─────────────────┘  └─────────────────┘ │
│           │                                                     │
├───────────┼─────────────────────────────────────────────────────┤
│           ▼          Tauri Backend (Rust)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         ExternalAgentProcessManager                       │  │
│  │  - Process spawning (stdio transport)                     │  │
│  │  - stdin/stdout communication                             │  │
│  │  - Process lifecycle                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Agent Process                        │
│              (e.g., Claude Code via ACP)                        │
└─────────────────────────────────────────────────────────────────┘
```

## Module Structure

```text
lib/ai/agent/external/
├── index.ts              # Module exports
├── protocol-adapter.ts   # Base protocol adapter interface
├── acp-client.ts         # ACP protocol implementation
├── translators.ts        # Message/tool format translators
├── manager.ts            # External agent manager (singleton)
└── CLAUDE.md             # This documentation
```

## Key Components

### 1. Protocol Adapter (`protocol-adapter.ts`)

Defines the interface for protocol implementations:

```typescript
interface ProtocolAdapter {
  connect(config: ExternalAgentConfig): Promise<void>;
  disconnect(): Promise<void>;
  createSession(options?: SessionCreateOptions): Promise<ExternalAgentSession>;
  closeSession(sessionId: string): Promise<void>;
  prompt(sessionId: string, message: ExternalAgentMessage, options?: ExternalAgentExecutionOptions): AsyncIterable<ExternalAgentEvent>;
  execute(sessionId: string, message: ExternalAgentMessage, options?: ExternalAgentExecutionOptions): Promise<ExternalAgentResult>;
  cancel(sessionId: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}
```

### 2. ACP Client (`acp-client.ts`)

Implements the Agent Client Protocol for communication with ACP-compatible agents like Claude Code:

- JSON-RPC 2.0 based communication (protocol version 1)
- Supports stdio and HTTP transports
- Handles `session/update` notifications per ACP spec
- Permission request/response flow via `session/request_permission`
- Session management with `session/new`, `session/load`, `session/set_mode`
- Client capabilities: `fs.readTextFile`, `fs.writeTextFile`, `terminal`
- Streaming via `session/prompt` with `stopReason` responses

#### ACP Protocol Methods Implemented

**Client → Agent:**

- `initialize` - Negotiate protocol version and capabilities
- `session/new` - Create new session with `cwd` and `mcpServers`
- `session/load` - Resume existing session (if supported)
- `session/prompt` - Send prompt and receive streaming updates
- `session/cancel` - Cancel ongoing execution (notification)
- `session/set_mode` - Change permission mode

**Agent → Client:**

- `fs/read_text_file` - Read file contents
- `fs/write_text_file` - Write file contents
- `session/request_permission` - Request tool execution permission
- `terminal/*` - Terminal operations (stub implementation)

### 3. External Agent Manager (`manager.ts`)

Singleton manager for all external agent connections:

```typescript
const manager = getExternalAgentManager();

// Add an agent
const agent = await manager.addAgent({
  id: 'claude-code',
  name: 'Claude Code',
  protocol: 'acp',
  transport: 'stdio',
  process: { command: 'npx', args: ['@anthropics/claude-code', '--stdio'] },
});

// Connect
await manager.connect('claude-code');

// Execute
const result = await manager.execute('claude-code', 'Fix the bug in App.tsx');
```

### 4. Translators (`translators.ts`)

Converts between Cognia's internal formats and external agent formats:

- `acpToolToAgentTool()` - Convert ACP tools to Cognia AgentTool
- `externalResultToSubAgentResult()` - Convert results
- `textToExternalMessage()` - Create messages
- `eventsToSteps()` - Convert events to execution steps

## Usage Examples

### Basic Usage with Hook

```tsx
import { useExternalAgent } from '@/hooks/agent';

function MyComponent() {
  const { addAgent, connect, execute, agents, isExecuting } = useExternalAgent();

  const handleSetup = async () => {
    await addAgent({
      id: 'claude-code',
      name: 'Claude Code',
      protocol: 'acp',
      transport: 'stdio',
      process: { command: 'npx', args: ['@anthropics/claude-code', '--stdio'] },
    });
    await connect('claude-code');
  };

  const handleExecute = async () => {
    const result = await execute('Implement a new feature');
    console.log(result.finalResponse);
  };

  return (
    <div>
      <button onClick={handleSetup}>Setup Agent</button>
      <button onClick={handleExecute} disabled={isExecuting}>
        Execute
      </button>
    </div>
  );
}
```

### Delegation in AgentOrchestrator

```typescript
const orchestrator = new AgentOrchestrator({
  provider: 'openai',
  model: 'gpt-4',
  apiKey: '...',
  enableExternalAgents: true,
  delegationRules: [
    {
      id: 'coding-tasks',
      name: 'Delegate coding to Claude Code',
      enabled: true,
      targetAgentId: 'claude-code',
      condition: 'task-type',
      matcher: 'coding',
      priority: 100,
    },
  ],
});

// Task will be automatically delegated to Claude Code if it matches
const result = await orchestrator.execute('Implement authentication');
```

### Sub-Agent with External Execution

```typescript
const subAgent = createSubAgent({
  name: 'External Coder',
  task: 'Implement the feature',
  config: {
    useExternalAgent: true,
    externalAgentId: 'claude-code',
    externalAgentPermissionMode: 'acceptEdits',
  },
});
```

## Tauri Commands (Desktop Only)

The following Tauri commands are available for process management:

- `spawn_external_agent` - Spawn a new external agent process
- `send_to_external_agent` - Send a message to an agent
- `kill_external_agent` - Kill an agent process
- `get_external_agent_status` - Get agent status
- `list_external_agents` - List all running agents
- `kill_all_external_agents` - Kill all agents

Events emitted:

- `external-agent://spawn` - When agent is spawned
- `external-agent://stdout` - When stdout data is received
- `external-agent://stderr` - When stderr data is received
- `external-agent://exit` - When agent process exits

## Types

All types are defined in `types/agent/external-agent.ts`:

- `ExternalAgentConfig` - Agent configuration
- `ExternalAgentSession` - Session state
- `ExternalAgentMessage` - Message format
- `ExternalAgentEvent` - Streaming events
- `ExternalAgentResult` - Execution result
- `ExternalAgentDelegationRule` - Delegation rules

## Plugin Hooks

External agent events can be observed via plugin hooks:

```typescript
const hooks: PluginHooksAll = {
  onExternalAgentConnect: (agentId, agentName) => {
    console.log(`Connected to ${agentName}`);
  },
  onExternalAgentExecutionStart: (agentId, sessionId, prompt) => {
    console.log(`Starting execution on ${agentId}`);
  },
  onExternalAgentToolCall: (agentId, sessionId, toolName, args) => {
    console.log(`Tool call: ${toolName}`);
  },
};
```

## Future Enhancements

- [ ] A2A (Agent-to-Agent) protocol support
- [ ] WebSocket transport for remote agents
- [ ] Connection pooling for high-throughput scenarios
- [ ] Agent capability discovery and matching
- [ ] Multi-agent collaboration patterns
- [ ] Persistent agent sessions across app restarts
