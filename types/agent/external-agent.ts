/**
 * External Agent Type Definitions
 * Defines types for integrating external agents via ACP (Agent Client Protocol) and other protocols
 *
 * @see https://github.com/anthropics/agent-client-protocol
 * @see https://github.com/zed-industries/claude-code-acp
 */

import type { AgentTool, ToolCall } from '@/lib/ai/agent';
import type { ProviderName } from '../provider/provider';

// ============================================================================
// Protocol Types
// ============================================================================

/**
 * Supported external agent protocols
 */
export type ExternalAgentProtocol =
  | 'acp' // Agent Client Protocol (Claude Code, etc.)
  | 'a2a' // Agent-to-Agent Protocol (Google)
  | 'http' // HTTP/REST API
  | 'websocket' // WebSocket
  | 'custom'; // Custom protocol via plugin

/**
 * External agent transport mechanism
 */
export type ExternalAgentTransport =
  | 'stdio' // Standard input/output (local process)
  | 'http' // HTTP REST
  | 'websocket' // WebSocket connection
  | 'sse'; // Server-Sent Events

/**
 * Connection status for external agents
 */
export type ExternalAgentConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * External agent execution status
 */
export type ExternalAgentStatus =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'executing'
  | 'waiting_permission'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

// ============================================================================
// ACP-Specific Types (Agent Client Protocol)
// ============================================================================

/**
 * ACP Permission modes for tool execution
 * @see claude-code-acp PermissionMode
 */
export type AcpPermissionMode =
  | 'default' // Normal permission flow
  | 'acceptEdits' // Auto-accept file edits
  | 'bypassPermissions' // Skip all permission checks
  | 'plan' // Planning mode (no execution)
  | 'dontAsk'; // Don't prompt for permissions, deny if not pre-approved

/**
 * ACP Stop reasons for prompt turn completion
 * @see https://agentclientprotocol.com/protocol/prompt-turn#stop-reasons
 */
export type AcpStopReason =
  | 'end_turn' // Language model finishes responding without requesting more tools
  | 'max_tokens' // Maximum token limit reached
  | 'max_turn_requests' // Maximum number of model requests in a single turn exceeded
  | 'refusal' // Agent refuses to continue
  | 'cancelled'; // Client cancels the turn

/**
 * ACP Plan entry for agent planning
 * @see https://agentclientprotocol.com/protocol/agent-plan
 */
export interface AcpPlanEntry {
  /** Plan step content/description */
  content: string;
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** Current status */
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

/**
 * ACP Available command (slash command)
 * @see https://agentclientprotocol.com/protocol/slash-commands
 */
export interface AcpAvailableCommand {
  /** Command name (e.g., "compact", "clear") */
  name: string;
  /** Command description */
  description: string;
  /** Input hint if command accepts arguments */
  input?: { hint: string } | null;
}

/**
 * ACP Session model state
 * @see claude-code-acp SessionModelState
 */
export interface AcpSessionModelState {
  /** Available models */
  availableModels: Array<{
    modelId: string;
    name: string;
    description?: string;
  }>;
  /** Currently selected model ID */
  currentModelId: string;
}

/**
 * ACP Session modes state
 */
export interface AcpSessionModesState {
  /** Current mode ID */
  currentModeId: AcpPermissionMode;
  /** Available modes */
  availableModes: Array<{
    id: AcpPermissionMode;
    name: string;
    description?: string;
  }>;
}

/**
 * ACP MCP Server configuration - stdio transport
 */
export interface AcpMcpServerStdio {
  /** Server name */
  name: string;
  /** Command to execute */
  command: string;
  /** Command arguments */
  args: string[];
  /** Environment variables */
  env?: Array<{ name: string; value: string }>;
}

/**
 * ACP MCP Server configuration - HTTP transport
 */
export interface AcpMcpServerHttp {
  /** Transport type */
  type: 'http';
  /** Server name */
  name: string;
  /** Server URL */
  url: string;
  /** HTTP headers */
  headers?: Array<{ name: string; value: string }>;
}

/**
 * ACP MCP Server configuration - SSE transport (deprecated)
 */
export interface AcpMcpServerSse {
  /** Transport type */
  type: 'sse';
  /** Server name */
  name: string;
  /** SSE endpoint URL */
  url: string;
  /** HTTP headers */
  headers?: Array<{ name: string; value: string }>;
}

/**
 * Union of all MCP server configurations
 */
export type AcpMcpServerConfig = AcpMcpServerStdio | AcpMcpServerHttp | AcpMcpServerSse;

/**
 * ACP Client capabilities for initialization
 * @see https://agentclientprotocol.com/protocol/initialization#client-capabilities
 */
export interface AcpClientCapabilities {
  /** File system capabilities */
  fs?: {
    /** Client can read text files */
    readTextFile?: boolean;
    /** Client can write text files */
    writeTextFile?: boolean;
  };
  /** Terminal capability - all terminal/* methods available */
  terminal?: boolean;
  /** Custom capabilities via _meta */
  _meta?: Record<string, unknown>;
}

/**
 * ACP Agent capabilities from initialization response
 * @see https://agentclientprotocol.com/protocol/initialization#agent-capabilities
 */
export interface AcpAgentCapabilities {
  /** Agent supports loading existing sessions */
  loadSession?: boolean;
  /** Prompt content type capabilities */
  promptCapabilities?: {
    /** Agent accepts images in prompts */
    image?: boolean;
    /** Agent accepts audio in prompts */
    audio?: boolean;
    /** Agent accepts embedded context/resources */
    embeddedContext?: boolean;
  };
  /** MCP transport capabilities */
  mcpCapabilities?: {
    /** Agent supports HTTP MCP transport */
    http?: boolean;
    /** Agent supports SSE MCP transport (deprecated) */
    sse?: boolean;
  };
  /** Session capabilities */
  sessionCapabilities?: {
    /** Fork session support */
    fork?: Record<string, unknown>;
    /** Resume session support */
    resume?: Record<string, unknown>;
  };
}

/**
 * ACP Client/Agent info for initialization
 */
export interface AcpImplementationInfo {
  /** Implementation name (programmatic) */
  name: string;
  /** Display title (human-readable) */
  title?: string;
  /** Version string */
  version: string;
}

/**
 * ACP Authentication method
 */
export interface AcpAuthMethod {
  /** Auth method ID */
  id: string;
  /** Auth method name */
  name: string;
  /** Description */
  description?: string;
  /** Custom metadata for auth */
  _meta?: Record<string, unknown>;
}

/**
 * ACP Capability flags (legacy, for backward compatibility)
 * @deprecated Use AcpAgentCapabilities for new code
 */
export interface AcpCapabilities {
  /** Agent supports streaming responses */
  streaming?: boolean;
  /** Agent can execute tools */
  toolExecution?: boolean;
  /** Agent supports file operations */
  fileOperations?: boolean;
  /** Agent supports code execution */
  codeExecution?: boolean;
  /** Agent supports MCP tools */
  mcpTools?: boolean;
  /** Agent supports multi-turn conversations */
  multiTurn?: boolean;
  /** Agent supports context sharing */
  contextSharing?: boolean;
  /** Supported permission modes */
  permissionModes?: AcpPermissionMode[];
  /** Maximum context tokens */
  maxContextTokens?: number;
  /** Supported file types */
  supportedFileTypes?: string[];
  /** Custom capabilities */
  custom?: Record<string, unknown>;
}

// ============================================================================
// ACP Session Update Types (Notifications from Agent)
// ============================================================================

/**
 * ACP session update type discriminator
 * @see https://agentclientprotocol.com/protocol/prompt-turn
 */
export type AcpSessionUpdateType =
  | 'agent_message_chunk'
  | 'user_message_chunk'
  | 'thought_message_chunk'
  | 'tool_call'
  | 'tool_call_update'
  | 'plan'
  | 'available_commands_update'
  | 'mode_change';

/**
 * ACP Tool call status
 */
export type AcpToolCallStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'error';

/**
 * ACP Tool call kind
 */
export type AcpToolCallKind =
  | 'file_read'
  | 'file_write'
  | 'terminal'
  | 'browser'
  | 'mcp'
  | 'other';

/**
 * ACP Content block for session updates
 */
export interface AcpContentBlock {
  type: 'text' | 'image' | 'resource' | 'resource_link' | 'content';
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
  resource?: {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  };
  content?: AcpContentBlock;
}

/**
 * ACP Agent message chunk update
 */
export interface AcpAgentMessageChunkUpdate {
  sessionUpdate: 'agent_message_chunk';
  content: AcpContentBlock;
}

/**
 * ACP User message chunk update
 */
export interface AcpUserMessageChunkUpdate {
  sessionUpdate: 'user_message_chunk';
  content: AcpContentBlock;
}

/**
 * ACP Thought message chunk update
 */
export interface AcpThoughtMessageChunkUpdate {
  sessionUpdate: 'thought_message_chunk';
  content: AcpContentBlock;
}

/**
 * ACP Tool call update (initial)
 */
export interface AcpToolCallUpdate {
  sessionUpdate: 'tool_call';
  toolCallId: string;
  title: string;
  kind: AcpToolCallKind;
  status: AcpToolCallStatus;
}

/**
 * ACP Tool call status update
 */
export interface AcpToolCallStatusUpdate {
  sessionUpdate: 'tool_call_update';
  toolCallId: string;
  status: AcpToolCallStatus;
  content?: Array<{
    type: 'content';
    content: AcpContentBlock;
  }>;
}

/**
 * ACP Plan update
 */
export interface AcpPlanUpdate {
  sessionUpdate: 'plan';
  entries: AcpPlanEntry[];
}

/**
 * ACP Available commands update
 */
export interface AcpAvailableCommandsUpdate {
  sessionUpdate: 'available_commands_update';
  availableCommands: AcpAvailableCommand[];
}

/**
 * ACP Mode change update
 */
export interface AcpModeChangeUpdate {
  sessionUpdate: 'mode_change';
  modeId: AcpPermissionMode;
}

/**
 * Union of all ACP session update types
 */
export type AcpSessionUpdate =
  | AcpAgentMessageChunkUpdate
  | AcpUserMessageChunkUpdate
  | AcpThoughtMessageChunkUpdate
  | AcpToolCallUpdate
  | AcpToolCallStatusUpdate
  | AcpPlanUpdate
  | AcpAvailableCommandsUpdate
  | AcpModeChangeUpdate;

/**
 * ACP session/update notification params
 */
export interface AcpSessionUpdateNotification {
  sessionId: string;
  update: AcpSessionUpdate;
}

/**
 * ACP Tool information from agent
 */
export interface AcpToolInfo {
  id: string;
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  requiresPermission?: boolean;
  category?: string;
  mcpServer?: {
    id: string;
    name: string;
  };
}

/**
 * ACP Permission request from agent
 */
export interface AcpPermissionRequest {
  id: string;
  sessionId: string;
  toolInfo: AcpToolInfo;
  reason?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  autoApproveTimeout?: number;
  metadata?: Record<string, unknown>;
}

/**
 * ACP Permission response
 */
export interface AcpPermissionResponse {
  requestId: string;
  granted: boolean;
  reason?: string;
  rememberChoice?: boolean;
  scope?: 'once' | 'session' | 'always';
  /** Option ID selected from ACP permission options */
  optionId?: string;
}

// ============================================================================
// External Agent Configuration
// ============================================================================

/**
 * Process spawn configuration for local agents
 */
export interface ExternalAgentProcessConfig {
  /** Command to execute */
  command: string;
  /** Command arguments */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Working directory */
  cwd?: string;
  /** Shell to use (Windows) */
  shell?: boolean | string;
  /** Timeout for process startup (ms) */
  startupTimeout?: number;
  /** Keep process alive on disconnect */
  keepAlive?: boolean;
  /** Restart on crash */
  restartOnCrash?: boolean;
  /** Maximum restart attempts */
  maxRestarts?: number;
}

/**
 * Network configuration for remote agents
 */
export interface ExternalAgentNetworkConfig {
  /** Endpoint URL */
  endpoint: string;
  /** Optional JSON-RPC endpoint (defaults to `${endpoint}/message`) */
  rpcEndpoint?: string;
  /** Optional events endpoint for SSE (defaults to `${endpoint}/events`) */
  eventsEndpoint?: string;
  /** Authentication method */
  authMethod?: 'none' | 'bearer' | 'api-key' | 'oauth2' | 'custom';
  /** API key or token */
  apiKey?: string;
  /** Bearer token */
  bearerToken?: string;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Request timeout (ms) */
  timeout?: number;
  /** Enable SSL/TLS verification */
  verifySsl?: boolean;
  /** Proxy configuration */
  proxy?: {
    host: string;
    port: number;
    auth?: { username: string; password: string };
  };
}

/**
 * Retry configuration
 */
export interface ExternalAgentRetryConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Initial retry delay (ms) */
  retryDelay: number;
  /** Use exponential backoff */
  exponentialBackoff: boolean;
  /** Maximum retry delay (ms) */
  maxRetryDelay?: number;
  /** Retry on specific error codes */
  retryOnErrors?: string[];
}

/**
 * Complete external agent configuration
 */
export interface ExternalAgentConfig {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description?: string;
  /** Protocol type */
  protocol: ExternalAgentProtocol;
  /** Transport mechanism */
  transport: ExternalAgentTransport;
  /** Whether agent is enabled */
  enabled: boolean;

  /** Process configuration (for stdio transport) */
  process?: ExternalAgentProcessConfig;
  /** Network configuration (for http/websocket/sse transport) */
  network?: ExternalAgentNetworkConfig;

  /** Agent capabilities (discovered or configured) */
  capabilities?: AcpCapabilities;

  /** Default permission mode */
  defaultPermissionMode?: AcpPermissionMode;
  /** Auto-approve tools matching patterns */
  autoApprovePatterns?: string[];
  /** Tools requiring manual approval */
  requireApprovalFor?: string[];

  /** Execution timeout (ms) */
  timeout?: number;
  /** Retry configuration */
  retryConfig?: ExternalAgentRetryConfig;

  /** Maximum concurrent sessions */
  maxConcurrentSessions?: number;
  /** Session idle timeout (ms) */
  sessionIdleTimeout?: number;

  /** Tags for categorization */
  tags?: string[];
  /** Custom metadata */
  metadata?: Record<string, unknown>;

  /** Creation timestamp */
  createdAt?: Date;
  /** Last updated timestamp */
  updatedAt?: Date;
}

/**
 * Input for creating external agent configuration
 */
export interface CreateExternalAgentInput {
  name: string;
  description?: string;
  protocol: ExternalAgentProtocol;
  transport: ExternalAgentTransport;
  process?: ExternalAgentProcessConfig;
  network?: ExternalAgentNetworkConfig;
  defaultPermissionMode?: AcpPermissionMode;
  autoApprovePatterns?: string[];
  requireApprovalFor?: string[];
  timeout?: number;
  retryConfig?: Partial<ExternalAgentRetryConfig>;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating external agent configuration
 */
export interface UpdateExternalAgentInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  process?: Partial<ExternalAgentProcessConfig>;
  network?: Partial<ExternalAgentNetworkConfig>;
  defaultPermissionMode?: AcpPermissionMode;
  autoApprovePatterns?: string[];
  requireApprovalFor?: string[];
  timeout?: number;
  retryConfig?: Partial<ExternalAgentRetryConfig>;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// External Agent Session
// ============================================================================

/**
 * Session status
 */
export type ExternalAgentSessionStatus =
  | 'creating'
  | 'active'
  | 'idle'
  | 'executing'
  | 'waiting'
  | 'error'
  | 'closing'
  | 'closed';

/**
 * External agent session
 */
export interface ExternalAgentSession {
  /** Session ID */
  id: string;
  /** Parent agent ID */
  agentId: string;
  /** Session status */
  status: ExternalAgentSessionStatus;
  /** Permission mode for this session */
  permissionMode: AcpPermissionMode;
  /** Discovered capabilities */
  capabilities?: AcpCapabilities;
  /** Available tools in this session */
  tools?: AcpToolInfo[];

  /** Context passed to agent */
  context?: ExternalAgentContext;
  /** Conversation history */
  messages: ExternalAgentMessage[];

  /** Token usage in this session */
  tokenUsage?: ExternalAgentTokenUsage;

  /** Creation timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Expiry timestamp */
  expiresAt?: Date;

  /** Error message if status is 'error' */
  error?: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Context for external agent session
 */
export interface ExternalAgentContext {
  /** Parent task description */
  parentTask?: string;
  /** Parent agent ID (if sub-agent) */
  parentAgentId?: string;
  /** Shared context from parent */
  sharedContext?: Record<string, unknown>;
  /** Working directory */
  workingDirectory?: string;
  /** Available files */
  files?: string[];
  /** Environment info */
  environment?: {
    os?: string;
    shell?: string;
    editor?: string;
    language?: string;
  };
  /** Custom context data */
  custom?: Record<string, unknown>;
}

/**
 * Token usage tracking
 */
export interface ExternalAgentTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

// ============================================================================
// External Agent Messages
// ============================================================================

/**
 * Message role
 */
export type ExternalAgentMessageRole = 'user' | 'assistant' | 'system' | 'tool';

/**
 * Content block types
 */
export type ExternalAgentContentType =
  | 'text'
  | 'image'
  | 'file'
  | 'tool_use'
  | 'tool_result'
  | 'thinking'
  | 'error';

/**
 * Text content block
 */
export interface ExternalAgentTextContent {
  type: 'text';
  text: string;
}

/**
 * Image content block
 */
export interface ExternalAgentImageContent {
  type: 'image';
  source: {
    type: 'base64' | 'url';
    data?: string;
    url?: string;
    mediaType: string;
  };
  alt?: string;
}

/**
 * File content block
 */
export interface ExternalAgentFileContent {
  type: 'file';
  path: string;
  content?: string;
  encoding?: 'utf-8' | 'base64';
  mimeType?: string;
}

/**
 * Tool use content block
 */
export interface ExternalAgentToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
  status?: 'pending' | 'running' | 'completed' | 'error';
}

/**
 * Tool result content block
 */
export interface ExternalAgentToolResultContent {
  type: 'tool_result';
  toolUseId: string;
  content: string | Record<string, unknown>;
  isError?: boolean;
}

/**
 * Thinking content block (for chain-of-thought)
 */
export interface ExternalAgentThinkingContent {
  type: 'thinking';
  thinking: string;
}

/**
 * Error content block
 */
export interface ExternalAgentErrorContent {
  type: 'error';
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Union of all content block types
 */
export type ExternalAgentContent =
  | ExternalAgentTextContent
  | ExternalAgentImageContent
  | ExternalAgentFileContent
  | ExternalAgentToolUseContent
  | ExternalAgentToolResultContent
  | ExternalAgentThinkingContent
  | ExternalAgentErrorContent;

/**
 * External agent message
 */
export interface ExternalAgentMessage {
  /** Message ID */
  id: string;
  /** Message role */
  role: ExternalAgentMessageRole;
  /** Content blocks */
  content: ExternalAgentContent[];
  /** Timestamp */
  timestamp: Date;
  /** Token usage for this message */
  tokenUsage?: ExternalAgentTokenUsage;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// External Agent Events (Streaming)
// ============================================================================

/**
 * Event types for streaming responses
 */
export type ExternalAgentEventType =
  | 'session_start'
  | 'session_end'
  | 'message_start'
  | 'message_delta'
  | 'message_end'
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_end'
  | 'tool_use_start'
  | 'tool_use_delta'
  | 'tool_use_end'
  | 'tool_result'
  | 'permission_request'
  | 'permission_response'
  | 'thinking'
  | 'plan_update'
  | 'commands_update'
  | 'progress'
  | 'error'
  | 'done';

/**
 * Base event interface
 */
export interface ExternalAgentEventBase {
  type: ExternalAgentEventType;
  sessionId: string;
  timestamp: Date;
}

/**
 * Session start event
 */
export interface ExternalAgentSessionStartEvent extends ExternalAgentEventBase {
  type: 'session_start';
  capabilities?: AcpCapabilities;
  tools?: AcpToolInfo[];
}

/**
 * Session end event
 */
export interface ExternalAgentSessionEndEvent extends ExternalAgentEventBase {
  type: 'session_end';
  reason?: 'completed' | 'cancelled' | 'error' | 'timeout';
  error?: string;
}

/**
 * Message start event
 */
export interface ExternalAgentMessageStartEvent extends ExternalAgentEventBase {
  type: 'message_start';
  messageId: string;
  role: ExternalAgentMessageRole;
}

/**
 * Message delta event
 */
export interface ExternalAgentMessageDeltaEvent extends ExternalAgentEventBase {
  type: 'message_delta';
  messageId: string;
  delta: {
    type: 'text' | 'thinking';
    text: string;
  };
}

/**
 * Message end event
 */
export interface ExternalAgentMessageEndEvent extends ExternalAgentEventBase {
  type: 'message_end';
  messageId: string;
  tokenUsage?: ExternalAgentTokenUsage;
}

/**
 * Tool use start event
 */
export interface ExternalAgentToolUseStartEvent extends ExternalAgentEventBase {
  type: 'tool_use_start';
  toolUseId: string;
  toolName: string;
}

/**
 * Tool use delta event
 */
export interface ExternalAgentToolUseDeltaEvent extends ExternalAgentEventBase {
  type: 'tool_use_delta';
  toolUseId: string;
  delta: string;
}

/**
 * Tool use end event
 */
export interface ExternalAgentToolUseEndEvent extends ExternalAgentEventBase {
  type: 'tool_use_end';
  toolUseId: string;
  input: Record<string, unknown>;
}

/**
 * Tool result event
 */
export interface ExternalAgentToolResultEvent extends ExternalAgentEventBase {
  type: 'tool_result';
  toolUseId: string;
  result: string | Record<string, unknown>;
  isError?: boolean;
}

/**
 * Permission request event
 */
export interface ExternalAgentPermissionRequestEvent extends ExternalAgentEventBase {
  type: 'permission_request';
  request: AcpPermissionRequest;
}

/**
 * Permission response event
 */
export interface ExternalAgentPermissionResponseEvent extends ExternalAgentEventBase {
  type: 'permission_response';
  response: AcpPermissionResponse;
}

/**
 * Thinking event
 */
export interface ExternalAgentThinkingEvent extends ExternalAgentEventBase {
  type: 'thinking';
  thinking: string;
}

/**
 * Plan update event
 */
export interface ExternalAgentPlanUpdateEvent extends ExternalAgentEventBase {
  type: 'plan_update';
  entries: AcpPlanEntry[];
  progress: number;
  step: number;
  totalSteps: number;
}

/**
 * Available commands update event
 */
export interface ExternalAgentCommandsUpdateEvent extends ExternalAgentEventBase {
  type: 'commands_update';
  commands: AcpAvailableCommand[];
}

/**
 * Progress event
 */
export interface ExternalAgentProgressEvent extends ExternalAgentEventBase {
  type: 'progress';
  progress: number;
  message?: string;
  step?: number;
  totalSteps?: number;
}

/**
 * Error event
 */
export interface ExternalAgentErrorEvent extends ExternalAgentEventBase {
  type: 'error';
  error: string;
  code?: string;
  recoverable?: boolean;
}

/**
 * Done event
 */
export interface ExternalAgentDoneEvent extends ExternalAgentEventBase {
  type: 'done';
  success: boolean;
  tokenUsage?: ExternalAgentTokenUsage;
}

/**
 * Union of all event types
 */
export type ExternalAgentEvent =
  | ExternalAgentSessionStartEvent
  | ExternalAgentSessionEndEvent
  | ExternalAgentMessageStartEvent
  | ExternalAgentMessageDeltaEvent
  | ExternalAgentMessageEndEvent
  | ExternalAgentToolUseStartEvent
  | ExternalAgentToolUseDeltaEvent
  | ExternalAgentToolUseEndEvent
  | ExternalAgentToolResultEvent
  | ExternalAgentPermissionRequestEvent
  | ExternalAgentPermissionResponseEvent
  | ExternalAgentThinkingEvent
  | ExternalAgentPlanUpdateEvent
  | ExternalAgentCommandsUpdateEvent
  | ExternalAgentProgressEvent
  | ExternalAgentErrorEvent
  | ExternalAgentDoneEvent;

// ============================================================================
// External Agent Execution
// ============================================================================

/**
 * Execution step
 */
export interface ExternalAgentStep {
  id: string;
  stepNumber: number;
  type: 'thinking' | 'message' | 'tool_call' | 'tool_result' | 'error';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  content?: ExternalAgentContent[];
  toolCall?: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
  toolResult?: {
    toolCallId: string;
    result: string | Record<string, unknown>;
    isError?: boolean;
  };
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
}

/**
 * Execution result
 */
export interface ExternalAgentResult {
  /** Whether execution was successful */
  success: boolean;
  /** Session ID used */
  sessionId: string;
  /** Final response text */
  finalResponse: string;
  /** All messages in conversation */
  messages: ExternalAgentMessage[];
  /** Execution steps */
  steps: ExternalAgentStep[];
  /** Tool calls made */
  toolCalls: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
    result?: string | Record<string, unknown>;
    status: 'pending' | 'completed' | 'error';
    error?: string;
  }>;
  /** Total duration (ms) */
  duration: number;
  /** Token usage */
  tokenUsage?: ExternalAgentTokenUsage;
  /** Structured output */
  output?: Record<string, unknown>;
  /** Error message if failed */
  error?: string;
  /** Error code */
  errorCode?: string;
}

/**
 * Execution options
 */
export interface ExternalAgentExecutionOptions {
  /** System prompt override */
  systemPrompt?: string;
  /** Permission mode override */
  permissionMode?: AcpPermissionMode;
  /** Execution timeout (ms) */
  timeout?: number;
  /** Maximum steps */
  maxSteps?: number;
  /** Context to pass to agent */
  context?: ExternalAgentContext;
  /** Files to include */
  files?: Array<{ path: string; content?: string }>;
  /** Callback for events */
  onEvent?: (event: ExternalAgentEvent) => void;
  /** Callback for permission requests */
  onPermissionRequest?: (request: AcpPermissionRequest) => Promise<AcpPermissionResponse>;
  /** Callback for progress */
  onProgress?: (progress: number, message?: string) => void;
  /** Abort signal */
  signal?: AbortSignal;
}

// ============================================================================
// External Agent Instance (Runtime)
// ============================================================================

/**
 * Runtime instance of an external agent
 */
export interface ExternalAgentInstance {
  /** Configuration */
  config: ExternalAgentConfig;
  /** Connection status */
  connectionStatus: ExternalAgentConnectionStatus;
  /** Agent status */
  status: ExternalAgentStatus;
  /** Active sessions */
  sessions: Map<string, ExternalAgentSession>;
  /** Discovered capabilities */
  capabilities?: AcpCapabilities;
  /** Available tools */
  tools?: AcpToolInfo[];
  /** Process ID (for stdio transport) */
  processId?: number;
  /** Last error */
  lastError?: string;
  /** Connection attempts */
  connectionAttempts: number;
  /** Last connection attempt timestamp */
  lastConnectionAttempt?: Date;
  /** Statistics */
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    totalTokensUsed: number;
    averageResponseTime: number;
  };
}

// ============================================================================
// Delegation & Routing
// ============================================================================

/**
 * Delegation rule for routing tasks to external agents
 */
export interface ExternalAgentDelegationRule {
  /** Rule ID */
  id: string;
  /** Rule name */
  name: string;
  /** Condition type */
  condition: 'task-type' | 'capability' | 'keyword' | 'tool-needed' | 'always' | 'custom';
  /** Matcher pattern or function serialized as string */
  matcher: string;
  /** Target external agent ID */
  targetAgentId: string;
  /** Rule priority (higher = checked first) */
  priority: number;
  /** Whether rule is enabled */
  enabled: boolean;
  /** Optional description */
  description?: string;
}

/**
 * Result of checking delegation rules
 */
export interface ExternalAgentDelegationResult {
  /** Whether task should be delegated */
  shouldDelegate: boolean;
  /** Target agent ID if delegating */
  targetAgentId?: string;
  /** Matched rule if any */
  matchedRule?: ExternalAgentDelegationRule;
  /** Reason for decision */
  reason?: string;
}

// ============================================================================
// Defaults & Constants
// ============================================================================

/**
 * Default retry configuration
 */
export const DEFAULT_EXTERNAL_AGENT_RETRY_CONFIG: ExternalAgentRetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  maxRetryDelay: 30000,
};

/**
 * Default external agent configuration
 */
export const DEFAULT_EXTERNAL_AGENT_CONFIG: Partial<ExternalAgentConfig> = {
  enabled: true,
  protocol: 'acp',
  transport: 'stdio',
  defaultPermissionMode: 'default',
  timeout: 300000, // 5 minutes
  retryConfig: DEFAULT_EXTERNAL_AGENT_RETRY_CONFIG,
  maxConcurrentSessions: 3,
  sessionIdleTimeout: 600000, // 10 minutes
};

/**
 * Status display configuration
 */
export const EXTERNAL_AGENT_STATUS_CONFIG: Record<
  ExternalAgentStatus,
  {
    label: string;
    color: string;
    icon: string;
    animate?: boolean;
  }
> = {
  idle: { label: 'Idle', color: 'text-muted-foreground', icon: 'Circle' },
  initializing: { label: 'Initializing', color: 'text-blue-500', icon: 'Loader2', animate: true },
  ready: { label: 'Ready', color: 'text-green-500', icon: 'CheckCircle' },
  executing: { label: 'Executing', color: 'text-primary', icon: 'Loader2', animate: true },
  waiting_permission: { label: 'Waiting', color: 'text-orange-500', icon: 'AlertCircle' },
  paused: { label: 'Paused', color: 'text-yellow-500', icon: 'Pause' },
  completed: { label: 'Completed', color: 'text-green-500', icon: 'CheckCircle' },
  failed: { label: 'Failed', color: 'text-destructive', icon: 'XCircle' },
  cancelled: { label: 'Cancelled', color: 'text-orange-500', icon: 'Ban' },
  timeout: { label: 'Timeout', color: 'text-red-500', icon: 'AlertTriangle' },
};

/**
 * Connection status display configuration
 */
export const EXTERNAL_AGENT_CONNECTION_STATUS_CONFIG: Record<
  ExternalAgentConnectionStatus,
  {
    label: string;
    color: string;
    icon: string;
    animate?: boolean;
  }
> = {
  disconnected: { label: 'Disconnected', color: 'text-muted-foreground', icon: 'CircleOff' },
  connecting: { label: 'Connecting', color: 'text-blue-500', icon: 'Loader2', animate: true },
  connected: { label: 'Connected', color: 'text-green-500', icon: 'CheckCircle' },
  reconnecting: { label: 'Reconnecting', color: 'text-yellow-500', icon: 'RefreshCw', animate: true },
  error: { label: 'Error', color: 'text-destructive', icon: 'AlertTriangle' },
};

// ============================================================================
// Serialization Helpers
// ============================================================================

/**
 * Serialize external agent config for storage
 */
export function serializeExternalAgentConfig(config: ExternalAgentConfig): string {
  return JSON.stringify({
    ...config,
    createdAt: config.createdAt?.toISOString(),
    updatedAt: config.updatedAt?.toISOString(),
  });
}

/**
 * Deserialize external agent config from storage
 */
export function deserializeExternalAgentConfig(data: string): ExternalAgentConfig {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    createdAt: parsed.createdAt ? new Date(parsed.createdAt) : undefined,
    updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : undefined,
  };
}

/**
 * Serialize external agent session for storage
 */
export function serializeExternalAgentSession(session: ExternalAgentSession): string {
  return JSON.stringify({
    ...session,
    createdAt: session.createdAt.toISOString(),
    lastActivityAt: session.lastActivityAt.toISOString(),
    expiresAt: session.expiresAt?.toISOString(),
    messages: session.messages.map((m) => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    })),
  });
}

/**
 * Deserialize external agent session from storage
 */
export function deserializeExternalAgentSession(data: string): ExternalAgentSession {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
    lastActivityAt: new Date(parsed.lastActivityAt),
    expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
    messages: parsed.messages.map((m: Record<string, unknown>) => ({
      ...m,
      timestamp: new Date(m.timestamp as string),
    })),
  };
}

/**
 * Serialize external agent result for storage
 */
export function serializeExternalAgentResult(result: ExternalAgentResult): string {
  return JSON.stringify({
    ...result,
    messages: result.messages.map((m) => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    })),
    steps: result.steps.map((s) => ({
      ...s,
      startedAt: s.startedAt?.toISOString(),
      completedAt: s.completedAt?.toISOString(),
    })),
  });
}

/**
 * Deserialize external agent result from storage
 */
export function deserializeExternalAgentResult(data: string): ExternalAgentResult {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    messages: parsed.messages.map((m: Record<string, unknown>) => ({
      ...m,
      timestamp: new Date(m.timestamp as string),
    })),
    steps: parsed.steps.map((s: Record<string, unknown>) => ({
      ...s,
      startedAt: s.startedAt ? new Date(s.startedAt as string) : undefined,
      completedAt: s.completedAt ? new Date(s.completedAt as string) : undefined,
    })),
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if content is text
 */
export function isTextContent(content: ExternalAgentContent): content is ExternalAgentTextContent {
  return content.type === 'text';
}

/**
 * Check if content is image
 */
export function isImageContent(
  content: ExternalAgentContent
): content is ExternalAgentImageContent {
  return content.type === 'image';
}

/**
 * Check if content is file
 */
export function isFileContent(content: ExternalAgentContent): content is ExternalAgentFileContent {
  return content.type === 'file';
}

/**
 * Check if content is tool use
 */
export function isToolUseContent(
  content: ExternalAgentContent
): content is ExternalAgentToolUseContent {
  return content.type === 'tool_use';
}

/**
 * Check if content is tool result
 */
export function isToolResultContent(
  content: ExternalAgentContent
): content is ExternalAgentToolResultContent {
  return content.type === 'tool_result';
}

/**
 * Check if content is thinking
 */
export function isThinkingContent(
  content: ExternalAgentContent
): content is ExternalAgentThinkingContent {
  return content.type === 'thinking';
}

/**
 * Check if content is error
 */
export function isErrorContent(
  content: ExternalAgentContent
): content is ExternalAgentErrorContent {
  return content.type === 'error';
}

/**
 * Check if event is a streaming text event
 */
export function isStreamingTextEvent(
  event: ExternalAgentEvent
): event is ExternalAgentMessageDeltaEvent {
  return event.type === 'message_delta' && event.delta.type === 'text';
}

/**
 * Check if event is a tool use event
 */
export function isToolUseEvent(
  event: ExternalAgentEvent
): event is
  | ExternalAgentToolUseStartEvent
  | ExternalAgentToolUseDeltaEvent
  | ExternalAgentToolUseEndEvent {
  return event.type === 'tool_use_start' || event.type === 'tool_use_delta' || event.type === 'tool_use_end';
}

/**
 * Check if event is a permission event
 */
export function isPermissionEvent(
  event: ExternalAgentEvent
): event is ExternalAgentPermissionRequestEvent | ExternalAgentPermissionResponseEvent {
  return event.type === 'permission_request' || event.type === 'permission_response';
}
