# MCP (Model Context Protocol) Architecture

## Introduction

Cognia implements comprehensive Model Context Protocol (MCP) support, enabling AI models to interact with external tools, resources, and prompts. This document details the MCP system architecture, covering the Rust backend for process management, transport layer implementation, JSON-RPC 2.0 protocol, and React frontend integration.

## Table of Contents

1. [MCP System Overview](#mcp-system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Rust Backend Structure](#rust-backend-structure)
4. [Transport Layer](#transport-layer)
5. [Protocol Implementation](#protocol-implementation)
6. [Server Lifecycle Management](#server-lifecycle-management)
7. [Frontend Integration](#frontend-integration)
8. [Communication Flows](#communication-flows)

## MCP System Overview

### What is MCP?

The Model Context Protocol (MCP) is an open standard that enables AI models to:

- **Call tools**: Execute functions on external servers
- **Access resources**: Read data from files, APIs, databases
- **Use prompts**: Reusable prompt templates with parameters
- **Send notifications**: Real-time updates from servers

### Architecture Diagram

```
+-----------------------------------------------------------------------+
|                           Cognia Application                          |
|                                                                       |
|  +---------------------+         +----------------------------------+  |
|  |   React Frontend    |         |        Tauri Rust Backend        |  |
|  |                     |         |                                  |  |
|  |  +---------------+  |         |  +----------------------------+  |  |
|  |  | mcp-store.ts  |  |<------>|  |   MCP Manager              |  |  |
|  |  | (Zustand)     |  | Event  |  |   (manager.rs)             |  |  |
|  |  +---------------+  | Emit   |  |                            |  |  |
|  |         |           |         |  |  +------------------------+|  |  |
|  |         v           |         |  |  | Server Instance 1      ||  |  |
|  |  +---------------+  | Invoke  |  |  | - McpClient             ||  |  |
|  |  | MCP Settings  |  |-------->|  |  | - Notification Handler ||  |  |
|  |  | Component     |  | Command |  |  | - Health Check          ||  |  |
|  |  +---------------+  |         |  |  +------------------------+|  |  |
|  |                     |         |  |                            |  |  |
|  |  +---------------+  |         |  |  +------------------------+|  |  |
|  |  | Agent Steps   |  |         |  |  | Server Instance 2      ||  |  |
|  |  | Visualization |  |         |  |  | - McpClient             ||  |  |
|  |  +---------------+  |         |  |  +------------------------+|  |  |
|  +---------------------+         |  +----------------------------+  |  |
|                                   |                                  |  |
+-----------------------------------+-----------------------------------+
            |                                      |
            |                                      |
            v                                      v
+---------------------+               +-----------------------------+
|   MCP Server 1      |               |   MCP Server 2              |
|   (stdio)           |               |   (SSE)                      |
|                     |               |                             |
|  - tools/call       |<------------->|  - tools/call               |
|  - resources/read   |  JSON-RPC 2.0 |  - resources/list           |
|  - prompts/get      |               |  - prompts/get              |
+---------------------+               +-----------------------------+
```

## Architecture Layers

### Layer Responsibilities

```
+---------------------------------------------------------------+
|                    Presentation Layer                          |
|  React Components (mcp-settings.tsx, mcp-server-dialog.tsx)    |
|  - MCP server configuration UI                                |
|  - Server status display                                      |
|  - Tool/resource browsing                                    |
+---------------------------+-----------------------------------+
                            |
                            v
+---------------------------------------------------------------+
|                     State Management Layer                     |
|  mcp-store.ts (Zustand)                                       |
|  - Server configurations                                      |
|  - Connection states                                          |
|  - Tools/resources/prompts lists                             |
|  - Tauri command wrappers                                     |
+---------------------------+-----------------------------------+
                            |
                            v
+---------------------------------------------------------------+
|                    Integration Layer                           |
|  Tauri Commands (src-tauri/src/commands/mcp.rs)               |
|  - Expose Rust functions to TypeScript                        |
|  - Type-safe invocation                                       |
+---------------------------+-----------------------------------+
                            |
                            v
+---------------------------------------------------------------+
|                     Business Logic Layer                       |
|  MCP Manager (src-tauri/src/mcp/manager.rs)                   |
|  - Server lifecycle management                                |
|  - Connection pooling                                         |
|  - Event emission to frontend                                 |
|  - Health checking                                            |
+---------------------------+-----------------------------------+
                            |
                            v
+---------------------------------------------------------------+
|                      Protocol Layer                            |
|  MCP Client (src-tauri/src/mcp/client.rs)                     |
|  - JSON-RPC 2.0 implementation                               |
|  - Request/response handling                                  |
|  - Notification processing                                    |
+---------------------------+-----------------------------------+
                            |
                            v
+---------------------------------------------------------------+
|                      Transport Layer                           |
|  stdio.rs (Standard I/O)    sse.rs (Server-Sent Events)       |
|  - Process spawning          - HTTP connection                |
|  - stdin/stdout RW           - GET/POST endpoints             |
+---------------------------+-----------------------------------+
                            |
                            v
+---------------------------------------------------------------+
|                     External Servers                           |
|  MCP Servers (npm, python, standalone)                        |
+---------------------------------------------------------------+
```

## Rust Backend Structure

### Module Organization

```
src-tauri/src/mcp/
├── mod.rs                    # Module exports
├── manager.rs                # Server lifecycle manager
├── client.rs                 # MCP client implementation
├── config.rs                 # Configuration management
├── error.rs                  # Error types
├── types.rs                  # Shared types
├── transport/                # Transport layer
│   ├── mod.rs
│   ├── stdio.rs             # stdio transport
│   └── sse.rs               # SSE transport
└── protocol/                 # JSON-RPC protocol
    ├── mod.rs
    ├── jsonrpc.rs           # JSON-RPC types
    ├── tools.rs             # Tools protocol
    ├── resources.rs         # Resources protocol
    ├── prompts.rs           # Prompts protocol
    └── sampling.rs          # Sampling protocol
```

### Core Types

```rust
// Server configuration
pub struct McpServerConfig {
    pub name: String,
    pub connection_type: McpConnectionType,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    pub url: Option<String>,
    pub enabled: bool,
    pub auto_start: bool,
}

// Server runtime state
pub struct McpServerState {
    pub id: String,
    pub name: String,
    pub status: McpServerStatus,
    pub config: McpServerConfig,
    pub capabilities: Option<ServerCapabilities>,
    pub tools: Vec<McpTool>,
    pub resources: Vec<McpResource>,
    pub prompts: Vec<McpPrompt>,
    pub connected_at: Option<i64>,
}

// Connection types
pub enum McpConnectionType {
    Stdio,  // Spawn process, communicate via stdin/stdout
    Sse,    // HTTP Server-Sent Events
}
```

### MCP Manager

The MCP manager (`manager.rs`) is responsible for:

1. **Server Lifecycle**
   - Add/remove/update server configurations
   - Start/stop server connections
   - Auto-start on application launch

2. **Connection Management**
   - Create MCP clients for each server
   - Maintain connection pool
   - Handle reconnection with exponential backoff

3. **Event Emission**
   - Server state changes
   - Tool call progress
   - Notification delivery
   - Health check results

```rust
pub struct McpManager {
    config_manager: Arc<McpConfigManager>,
    servers: Arc<RwLock<HashMap<String, ServerInstance>>>,
    app_handle: AppHandle,
    reconnect_config: ReconnectConfig,
}

impl McpManager {
    // Add a new server
    pub async fn add_server(&self, id: String, config: McpServerConfig) -> McpResult<()>;

    // Connect to a server
    pub async fn connect_server(&self, id: &str) -> McpResult<()>;

    // Disconnect from a server
    pub async fn disconnect_server(&self, id: &str) -> McpResult<()>;

    // Call a tool
    pub async fn call_tool(&self, server_id: &str, tool_name: &str, arguments: Value) -> McpResult<ToolCallResult>;

    // Read a resource
    pub async fn read_resource(&self, server_id: &str, uri: &str) -> McpResult<ResourceContent>;
}
```

### Server Instance

Each connected server has an associated instance:

```rust
struct ServerInstance {
    state: McpServerState,           // Current state (sent to frontend)
    client: Option<McpClient>,       // Active client connection
    notification_task: Option<JoinHandle<()>>,  // Notification handler
    health_task: Option<JoinHandle<()>>,       // Health check task
    reconnect_task: Option<JoinHandle<()>>,    // Reconnection task
    stop_tx: Option<mpsc::Sender<()>>,         // Stop signal channel
}
```

## Transport Layer

### stdio Transport

**Purpose**: Communicate with MCP servers via standard input/output.

**Use Case**: Locally installed MCP servers (npm, python, standalone executables).

**Architecture**:

```
+------------------+     Spawn      +------------------+
|  MCP Manager     | ------------> |  Child Process   |
|                  |               |                  |
+------------------+               +------------------+
        |                                  |
        | Write to stdin                  | Read from stdout
        v                                  v
+------------------+               +------------------+
|  stdin           |               |  stdout          |
|  (JSON request)  | <------------->|  (JSON response) |
+------------------+               +------------------+
```

**Implementation**:

```rust
pub struct StdioTransport {
    child: Arc<Mutex<Child>>,
    stdin: Arc<Mutex<ChildStdin>>,
    stdout: Arc<Mutex<BufReader<ChildStdout>>>,
    connected: Arc<AtomicBool>,
}

impl StdioTransport {
    pub async fn spawn(
        command: &str,
        args: &[String],
        env: &HashMap<String, String>,
    ) -> McpResult<Self> {
        let mut child = Command::new(command)
            .args(args)
            .envs(env)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()?;

        let stdin = child.stdin.take().ok_or(McpError::StdioError)?;
        let stdout = child.stdout.take().ok_or(McpError::StdioError)?;

        Ok(Self {
            child: Arc::new(Mutex::new(child)),
            stdin: Arc::new(Mutex::new(stdin)),
            stdout: Arc::new(Mutex::new(BufReader::new(stdout))),
            connected: Arc::new(AtomicBool::new(true)),
        })
    }

    pub async fn send(&self, message: &str) -> McpResult<()> {
        let mut stdin = self.stdin.lock().await;
        stdin.write_all(message.as_bytes()).await?;
        stdin.write_all(b"\n").await?;
        stdin.flush().await?;
        Ok(())
    }

    pub async fn receive(&self) -> McpResult<String> {
        let mut stdout = self.stdout.lock().await;
        let mut line = String::new();
        stdout.read_line(&mut line).await?;
        Ok(line.trim().to_string())
    }
}
```

### SSE Transport

**Purpose**: Communicate with MCP servers via HTTP Server-Sent Events.

**Use Case**: Remote MCP servers or Docker containers.

**Architecture**:

```
+------------------+     GET /sse    +------------------+
|  MCP Manager     | <--------------|  MCP Server      |
|                  |                |                  |
+------------------+                +------------------+
        |                                  |
        | POST /messages                   | Send events
        v                                  v
+------------------+               +------------------+
|  HTTP Request    | <------------->|  SSE Event       |
|  (JSON payload)  |               |  (JSON data)     |
+------------------+               +------------------+
```

**Implementation**:

```rust
pub struct SseTransport {
    client: reqwest::Client,
    url: String,
    event_source: Receiver<String>,
    connected: Arc<AtomicBool>,
}

impl SseTransport {
    pub async fn connect(url: &str) -> McpResult<Self> {
        let client = reqwest::Client::new();
        let url = url.to_string();

        // Start SSE listener
        let (tx, rx) = mpsc::channel(100);
        let client_clone = client.clone();
        let url_clone = url.clone();

        tokio::spawn(async move {
            let response = client_clone
                .get(&url_clone)
                .header("Accept", "text/event-stream")
                .send()
                .await?;

            let mut stream = response.bytes_stream();
            // Parse SSE events and send to channel
            // ...

            Ok::<(), McpError>(())
        });

        Ok(Self {
            client,
            url,
            event_source: rx,
            connected: Arc::new(AtomicBool::new(true)),
        })
    }

    pub async fn send(&self, message: &str) -> McpResult<()> {
        self.client
            .post(&self.url)
            .header("Content-Type", "application/json")
            .body(message.to_string())
            .send()
            .await?;
        Ok(())
    }
}
```

### Transport Trait

```rust
#[async_trait]
pub trait Transport: Send + Sync {
    async fn send(&self, message: &str) -> McpResult<()>;
    async fn receive(&self) -> McpResult<String>;
    fn is_connected(&self) -> bool;
    async fn close(&self) -> McpResult<()>;
}
```

## Protocol Implementation

### JSON-RPC 2.0

MCP uses JSON-RPC 2.0 for communication:

```rust
// Request
pub struct JsonRpcRequest {
    pub jsonrpc: String,  // "2.0"
    pub id: RequestId,    // Number or String
    pub method: String,   // e.g., "tools/call"
    pub params: Option<Value>,
}

// Response
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: RequestId,
    pub result: Option<Value>,
    pub error: Option<JsonRpcError>,
}

// Notification
pub struct JsonRpcNotification {
    pub jsonrpc: String,
    pub method: String,
    pub params: Option<Value>,
}
```

### Method Constants

```rust
pub mod methods {
    // Core methods
    pub const INITIALIZE: &str = "initialize";
    pub const INITIALIZED: &str = "notifications/initialized";
    pub const PING: &str = "ping";

    // Tools
    pub const TOOLS_LIST: &str = "tools/list";
    pub const TOOLS_CALL: &str = "tools/call";

    // Resources
    pub const RESOURCES_LIST: &str = "resources/list";
    pub const RESOURCES_READ: &str = "resources/read";
    pub const RESOURCES_SUBSCRIBE: &str = "resources/subscribe";
    pub const RESOURCES_UNSUBSCRIBE: &str = "resources/unsubscribe";

    // Prompts
    pub const PROMPTS_LIST: &str = "prompts/list";
    pub const PROMPTS_GET: &str = "prompts/get";

    // Logging
    pub const LOGGING_SET_LEVEL: &str = "logging/setLevel";
}
```

### MCP Client

The MCP client handles protocol implementation:

```rust
pub struct McpClient {
    transport: Arc<dyn Transport>,
    pending_requests: Arc<TokioMutex<HashMap<i64, PendingRequest>>>,
    request_counter: AtomicI64,
    notification_tx: mpsc::Sender<JsonRpcNotification>,
    capabilities: TokioMutex<Option<ServerCapabilities>>,
}

impl McpClient {
    // Initialize connection
    pub async fn initialize(&self, client_info: ClientInfo) -> McpResult<InitializeResult> {
        let params = json!({
            "protocolVersion": MCP_PROTOCOL_VERSION,
            "capabilities": {
                "sampling": {}
            },
            "clientInfo": client_info
        });

        let result = self.send_request(methods::INITIALIZE, Some(params)).await?;
        let init_result: InitializeResult = serde_json::from_value(result)?;

        self.send_notification(methods::INITIALIZED, None).await?;

        Ok(init_result)
    }

    // List available tools
    pub async fn list_tools(&self) -> McpResult<Vec<McpTool>> {
        let result = self.send_request(methods::TOOLS_LIST, None).await?;
        let response: ToolsListResponse = serde_json::from_value(result)?;
        Ok(response.tools)
    }

    // Call a tool
    pub async fn call_tool(&self, name: &str, arguments: Value) -> McpResult<ToolCallResult> {
        let params = ToolsCallParams {
            name: name.to_string(),
            arguments,
        };

        let result = self.send_request(
            methods::TOOLS_CALL,
            Some(serde_json::to_value(params)?)
        ).await?;

        let response: ToolCallResult = serde_json::from_value(result)?;
        Ok(response)
    }
}
```

### Protocol Handlers

#### Tools Protocol

```rust
pub struct McpTool {
    pub name: String,
    pub description: String,
    pub input_schema: Value,  // JSON Schema
}

pub struct ToolCallResult {
    pub content: Vec<ToolContent>,
    pub is_error: Option<bool>,
}

pub enum ToolContent {
    Text { text: String },
    Image { data: String, mime_type: String },
    Resource { uri: String, text: String },
}
```

#### Resources Protocol

```rust
pub struct McpResource {
    pub uri: String,
    pub name: String,
    pub description: Option<String>,
    pub mime_type: Option<String>,
}

pub struct ResourceContent {
    pub uri: String,
    pub mime_type: Option<String>,
    pub text: Option<String>,
    pub blob: Option<String>,  // base64
}
```

#### Prompts Protocol

```rust
pub struct McpPrompt {
    pub name: String,
    pub description: Option<String>,
    pub arguments: Vec<PromptArgument>,
}

pub struct PromptContent {
    pub messages: Vec<PromptMessage>,
}
```

## Server Lifecycle Management

### Connection Flow

```
+------------------+     add_server(id, config)    +------------------+
|  Frontend        | --------------------------> |  MCP Manager     |
|  (mcp-store.ts)  |                             |                  |
+------------------+                             +------------------+
        |                                                   |
        | invoke('mcp_add_server', { id, config })         v
        |                                           +------------------+
        v                                           |  Config Manager  |
+------------------+                                |  - Save to disk  |
|  Tauri Bridge    |                                +------------------+
+------------------+                                          |
        |                                                   v
        |                                             +------------------+
        v                                             |  Server Instance |
+------------------+                                    |  - Initialize   |
|  MCP Command     |                                    |  - Set state    |
|  Handler         |                                    +------------------+
+------------------+                                          |
        |                                                   v
        |                                             +------------------+
        v                                             |  Auto-start?     |
+------------------+          Yes                       +------------------+
|  Server Added     | ------------------------------> |  connect_server()|
|  Event Emitted   |                                    +------------------+
+------------------+                                          |
        |                                                   v
        v                                             +------------------+
+------------------+          No                        |  Spawn Process  |
|  Server State    | ------------------------------> |  (stdio)         |
|  (Disconnected)  |                                    |  Connect HTTP    |
+------------------+                                    |  (SSE)           |
                                                           +------------------+
```

### Initialization Sequence

```rust
pub async fn initialize(&self) -> McpResult<()> {
    // 1. Load configuration from disk
    self.config_manager.load().await?;

    // 2. Initialize server states from config
    let configs = self.config_manager.get_all_servers();
    for (id, config) in configs {
        let state = McpServerState::new(id.clone(), config);
        servers.insert(id, ServerInstance::new(state));
    }

    // 3. Auto-connect servers marked for auto-start
    let auto_start = self.config_manager.get_auto_start_servers();
    for (id, _) in auto_start {
        self.connect_server(&id).await?;
    }

    Ok(())
}
```

### Reconnection Strategy

Exponential backoff with configurable limits:

```rust
pub struct ReconnectConfig {
    pub enabled: bool,
    pub max_attempts: u32,           // Default: 10
    pub initial_delay_ms: u64,       // Default: 1000ms
    pub max_delay_ms: u64,           // Default: 30000ms
    pub backoff_multiplier: f64,     // Default: 2.0
}

// Calculate delay
let delay_ms = std::cmp::min(
    (config.initial_delay_ms as f64 * config.backoff_multiplier.powi(attempts as i32)) as u64,
    config.max_delay_ms,
);

// Schedule reconnection
tokio::time::sleep(Duration::from_millis(delay_ms)).await;
self.connect_server(&server_id).await;
```

### Health Checking

Periodic health checks for connected servers:

```rust
async fn spawn_health_checker(&self, server_id: String) {
    let client = self.servers.read().await[&server_id].client.clone();

    let task = tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(30)).await;

            match client.ping().await {
                Ok(latency) => {
                    // Emit health status
                    app_handle.emit("mcp:server-health", &HealthStatus {
                        server_id: server_id.clone(),
                        status: "healthy",
                        latency,
                    })?;
                }
                Err(_) => {
                    // Trigger reconnection
                    app_handle.emit("mcp:server-disconnected", &server_id)?;
                    break;
                }
            }
        }
    });
}
```

## Frontend Integration

### MCP Store (Zustand)

```typescript
// stores/mcp-store.ts

interface McpState {
  servers: McpServerState[];
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  loadServers: () => Promise<void>;
  addServer: (id: string, config: McpServerConfig) => Promise<void>;
  connectServer: (id: string) => Promise<void>;
  disconnectServer: (id: string) => Promise<void>;
  callTool: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<ToolCallResult>;
}

export const useMcpStore = create<McpState>((set, get) => ({
  servers: [],
  isLoading: false,
  error: null,

  initialize: async () => {
    // Setup event listeners
    await listen<McpServerState>('mcp:server-update', (event) => {
      get()._updateServer(event.payload);
    });

    await listen<McpServerState[]>('mcp:servers-changed', (event) => {
      set({ servers: event.payload });
    });

    // Load initial servers
    await get().loadServers();
  },

  callTool: async (serverId, toolName, args) => {
    return invoke<ToolCallResult>('mcp_call_tool', {
      serverId,
      toolName,
      arguments: args,
    });
  },
}));
```

### Event Listeners

```typescript
// Setup on app mount
useEffect(() => {
  const setupListeners = async () => {
    // Server state updates
    const unlistenUpdate = await listen<McpServerState>(
      'mcp:server-update',
      (event) => {
        useMcpStore.getState()._updateServer(event.payload);
      }
    );

    // Server list changes
    const unlistenChanged = await listen<McpServerState[]>(
      'mcp:servers-changed',
      (event) => {
        useMcpStore.getState()._setServers(event.payload);
      }
    );

    // Notifications from servers
    const unlistenNotif = await listen<McpNotificationEvent>(
      'mcp:notification',
      (event) => {
        console.log('MCP notification:', event.payload);
        // Handle notification
      }
    );

    // Tool call progress
    const unlistenProgress = await listen<ToolCallProgress>(
      'mcp:tool-call-progress',
      (event) => {
        console.log('Tool progress:', event.payload);
        // Update progress UI
      }
    );

    return () => {
      unlistenUpdate();
      unlistenChanged();
      unlistenNotif();
      unlistenProgress();
    };
  };

  const cleanup = setupListeners();
  return () => { cleanup.then(fn => fn()); };
}, []);
```

### UI Components

```
components/settings/
├── mcp-settings.tsx              # Main MCP settings page
├── mcp-server-dialog.tsx         # Add/edit server dialog
├── mcp-install-wizard.tsx        # Quick install wizard
└── mcp-server-card.tsx           # Server status card
```

## Communication Flows

### Tool Call Flow

```
1. User triggers tool (via AI or manual)
   |
   v
2. Frontend: mcp-store.callTool(serverId, 'search', { query: '...' })
   |
   v
3. Tauri: invoke('mcp_call_tool', { serverId, toolName, arguments })
   |
   v
4. Rust: manager.call_tool(server_id, tool_name, arguments)
   |
   v
5. Manager: Get server instance, get client
   |
   v
6. Client: client.call_tool(tool_name, arguments)
   |
   v
7. Client: Build JSON-RPC request
   {
     "jsonrpc": "2.0",
     "id": 1,
     "method": "tools/call",
     "params": { "name": "search", "arguments": { "query": "..." } }
   }
   |
   v
8. Transport: Send via stdio or SSE
   |
   v
9. MCP Server: Execute tool, return result
   |
   v
10. Client: Parse JSON-RPC response
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": {
        "content": [{ "type": "text", "text": "..." }]
      }
    }
    |
    v
11. Manager: Emit progress events during execution
    |
    v
12. Frontend: Update UI with progress
    |
    v
13. Frontend: Display final result
```

### Notification Flow

```
1. MCP Server: State change (resource updated, tool list changed)
   |
   v
2. Transport: Receive JSON-RPC notification
   {
     "jsonrpc": "2.0",
     "method": "notifications/resources/list_changed",
     "params": {}
   }
   |
   v
3. Client: Parse notification, send to channel
   |
   v
4. Notification Handler: Receive from channel
   |
   v
5. Handler: Emit Tauri event
   app_handle.emit("mcp:notification", ¬ification)
   |
   v
6. Frontend: Event listener receives event
   |
   v
7. Frontend: Update store/trigger action
   |
   v
8. UI: Re-render with new data
```

## Security Considerations

### Process Isolation

- MCP servers run as separate processes (not in Tauri process)
- stdio transport provides isolation
- Servers can be terminated if misbehaving

### API Key Storage

- MCP server environment variables stored in plaintext config
- API keys accessible to server process
- Only install trusted MCP servers

### Sandboxing

- Tauri provides security boundaries
- File system access via Tauri plugins (user must approve)
- No network access without user configuration

## Configuration Management

### Config File Location

```
Platform        | Config Path
----------------|---------------------------
Windows         | %APPDATA%\com.elementsai.cognia\mcp\servers.json
macOS           | ~/Library/Application Support/com.elementsai.cognia/mcp/servers.json
Linux           | ~/.config/com.elementsai.cognia/mcp/servers.json
```

### Config Schema

```json
{
  "servers": {
    "filesystem": {
      "name": "Local Filesystem",
      "connectionType": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed"],
      "env": {},
      "enabled": true,
      "autoStart": true
    },
    "github": {
      "name": "GitHub",
      "connectionType": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_xxx"
      },
      "enabled": true,
      "autoStart": false
    }
  }
}
```

## Related Documentation

- [System Overview](./overview.md) - High-level architecture
- [Data Flow](./data-flow.md) - Request/response flows
- [Tech Stack](./tech-stack.md) - Technology details

**File Path**: `d:\Project\Cognia\docs\architecture\mcp-architecture.md`
