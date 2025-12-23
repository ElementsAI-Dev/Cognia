/**
 * MCP (Model Context Protocol) TypeScript types
 *
 * These types mirror the Rust types in src-tauri/src/mcp/types.rs
 */

/** Connection type for MCP server */
export type McpConnectionType = 'stdio' | 'sse';

/** Server runtime status */
export type McpServerStatus =
  | { type: 'disconnected' }
  | { type: 'connecting' }
  | { type: 'connected' }
  | { type: 'error'; message: string }
  | { type: 'reconnecting' };

/** MCP server configuration */
export interface McpServerConfig {
  /** Display name of the server */
  name: string;
  /** Command to execute (for stdio) */
  command: string;
  /** Command arguments */
  args: string[];
  /** Environment variables */
  env: Record<string, string>;
  /** Connection type (stdio or sse) */
  connectionType: McpConnectionType;
  /** URL for SSE connections */
  url?: string;
  /** Whether the server is enabled */
  enabled: boolean;
  /** Whether to auto-start on application launch */
  autoStart: boolean;
}

/** MCP Tool definition */
export interface McpTool {
  /** Tool name (unique within server) */
  name: string;
  /** Human-readable description */
  description?: string;
  /** JSON Schema for input parameters */
  inputSchema: Record<string, unknown>;
}

/** MCP Resource definition */
export interface McpResource {
  /** Resource URI */
  uri: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description?: string;
  /** MIME type */
  mimeType?: string;
}

/** MCP Prompt definition */
export interface McpPrompt {
  /** Prompt name */
  name: string;
  /** Description */
  description?: string;
  /** Arguments the prompt accepts */
  arguments?: PromptArgument[];
}

/** Prompt argument definition */
export interface PromptArgument {
  /** Argument name */
  name: string;
  /** Description */
  description?: string;
  /** Whether the argument is required */
  required: boolean;
}

/** Server capabilities from initialize response */
export interface ServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  sampling?: Record<string, unknown>;
  logging?: Record<string, unknown>;
}

/** Runtime state for a server (received from backend) */
export interface McpServerState {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Server configuration */
  config: McpServerConfig;
  /** Current status */
  status: McpServerStatus;
  /** Server capabilities */
  capabilities?: ServerCapabilities;
  /** Available tools */
  tools: McpTool[];
  /** Available resources */
  resources: McpResource[];
  /** Available prompts */
  prompts: McpPrompt[];
  /** Error message if status is error */
  errorMessage?: string;
  /** Timestamp when connected */
  connectedAt?: number;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
}

/** Content item in tool results or messages */
export type ContentItem =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'resource'; resource: EmbeddedResource };

/** Embedded resource in content */
export interface EmbeddedResource {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

/** Tool call result */
export interface ToolCallResult {
  content: ContentItem[];
  isError: boolean;
}

/** Resource content from read_resource */
export interface ResourceContent {
  contents: ResourceContentItem[];
}

/** Individual resource content item */
export interface ResourceContentItem {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

/** Prompt content from get_prompt */
export interface PromptContent {
  description?: string;
  messages: PromptMessage[];
}

/** Message in prompt content */
export interface PromptMessage {
  role: 'user' | 'assistant';
  content: string | ContentItem[];
}

// Helper functions

/** Check if server is connected */
export function isServerConnected(status: McpServerStatus): boolean {
  return status.type === 'connected';
}

/** Check if server has an error */
export function isServerError(status: McpServerStatus): status is { type: 'error'; message: string } {
  return status.type === 'error';
}

/** Get status display text */
export function getStatusText(status: McpServerStatus): string {
  switch (status.type) {
    case 'disconnected':
      return 'Disconnected';
    case 'connecting':
      return 'Connecting...';
    case 'connected':
      return 'Connected';
    case 'error':
      return `Error: ${status.message}`;
    case 'reconnecting':
      return 'Reconnecting...';
    default:
      return 'Unknown';
  }
}

/** Get status color class */
export function getStatusColor(status: McpServerStatus): string {
  switch (status.type) {
    case 'disconnected':
      return 'text-muted-foreground';
    case 'connecting':
    case 'reconnecting':
      return 'text-yellow-500';
    case 'connected':
      return 'text-green-500';
    case 'error':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
}

/** Create a default server config */
export function createDefaultServerConfig(): McpServerConfig {
  return {
    name: '',
    command: 'npx',
    args: [],
    env: {},
    connectionType: 'stdio',
    enabled: true,
    autoStart: false,
  };
}

// ============================================================================
// Mention System Types
// ============================================================================

/** Types of mentions available in chat */
export type MentionType = 'tool' | 'resource' | 'prompt' | 'server';

/** Base mention item */
export interface BaseMentionItem {
  /** Unique identifier for the mention */
  id: string;
  /** Display label */
  label: string;
  /** Description */
  description?: string;
  /** Type of mention */
  type: MentionType;
  /** Server ID this mention belongs to */
  serverId: string;
  /** Server display name */
  serverName: string;
}

/** Tool mention */
export interface ToolMentionItem extends BaseMentionItem {
  type: 'tool';
  /** Tool definition */
  tool: McpTool;
}

/** Resource mention */
export interface ResourceMentionItem extends BaseMentionItem {
  type: 'resource';
  /** Resource definition */
  resource: McpResource;
}

/** Prompt mention */
export interface PromptMentionItem extends BaseMentionItem {
  type: 'prompt';
  /** Prompt definition */
  prompt: McpPrompt;
}

/** Server mention (to select all tools from a server) */
export interface ServerMentionItem extends BaseMentionItem {
  type: 'server';
  /** Number of tools available */
  toolCount: number;
}

/** Union type for all mention items */
export type MentionItem = ToolMentionItem | ResourceMentionItem | PromptMentionItem | ServerMentionItem;

/** Selected mention in the input */
export interface SelectedMention {
  /** The mention item */
  item: MentionItem;
  /** Start position in text */
  startIndex: number;
  /** End position in text */
  endIndex: number;
  /** Display text (e.g., @server:tool_name) */
  displayText: string;
}

/** Mention state for the input */
export interface MentionState {
  /** Whether the mention popover is open */
  isOpen: boolean;
  /** Current search query (text after @) */
  query: string;
  /** Cursor position where @ was typed */
  triggerPosition: number;
  /** Selected mentions in the current input */
  selectedMentions: SelectedMention[];
}

/** Tool call request parsed from message */
export interface ParsedToolCall {
  /** Server ID */
  serverId: string;
  /** Tool name */
  toolName: string;
  /** Arguments (parsed from message context) */
  arguments?: Record<string, unknown>;
  /** Original mention text */
  mentionText: string;
}

/** Helper to create a tool mention item */
export function createToolMention(
  serverId: string,
  serverName: string,
  tool: McpTool
): ToolMentionItem {
  return {
    id: `${serverId}:${tool.name}`,
    label: tool.name,
    description: tool.description,
    type: 'tool',
    serverId,
    serverName,
    tool,
  };
}

/** Helper to create a resource mention item */
export function createResourceMention(
  serverId: string,
  serverName: string,
  resource: McpResource
): ResourceMentionItem {
  return {
    id: `${serverId}:resource:${resource.uri}`,
    label: resource.name,
    description: resource.description,
    type: 'resource',
    serverId,
    serverName,
    resource,
  };
}

/** Helper to create a prompt mention item */
export function createPromptMention(
  serverId: string,
  serverName: string,
  prompt: McpPrompt
): PromptMentionItem {
  return {
    id: `${serverId}:prompt:${prompt.name}`,
    label: prompt.name,
    description: prompt.description,
    type: 'prompt',
    serverId,
    serverName,
    prompt,
  };
}

/** Helper to create a server mention item */
export function createServerMention(
  serverId: string,
  serverName: string,
  toolCount: number
): ServerMentionItem {
  return {
    id: `server:${serverId}`,
    label: serverName,
    description: `${toolCount} tools available`,
    type: 'server',
    serverId,
    serverName,
    toolCount,
  };
}

/** Parse mention text to extract server and tool info */
export function parseMentionText(text: string): { serverId?: string; name?: string; type?: MentionType } | null {
  // Format: @server:tool_name or @server:resource:uri or @server:prompt:name
  const match = text.match(/^@([^:]+):(?:(resource|prompt):)?(.+)$/);
  if (!match) return null;
  
  const [, serverId, typeStr, name] = match;
  let type: MentionType = 'tool';
  if (typeStr === 'resource') type = 'resource';
  else if (typeStr === 'prompt') type = 'prompt';
  
  return { serverId, name, type };
}

/** Format mention for display */
export function formatMentionDisplay(item: MentionItem): string {
  switch (item.type) {
    case 'tool':
      return `@${item.serverId}:${item.tool.name}`;
    case 'resource':
      return `@${item.serverId}:resource:${item.resource.uri}`;
    case 'prompt':
      return `@${item.serverId}:prompt:${item.prompt.name}`;
    case 'server':
      return `@${item.serverId}`;
  }
}

/** Common MCP server templates for quick installation */
export const MCP_SERVER_TEMPLATES: Array<{
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
  envKeys?: string[];
}> = [
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Read and write files on your local filesystem',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem'],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Access GitHub repositories, issues, and pull requests',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    envKeys: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Query PostgreSQL databases',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    description: 'Query SQLite databases',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite'],
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Web search using Brave Search API',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    envKeys: ['BRAVE_API_KEY'],
  },
  {
    id: 'memory',
    name: 'Memory',
    description: 'Persistent memory storage for conversations',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    description: 'Browser automation and web scraping',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Interact with Slack workspaces',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    envKeys: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
  },
];

// ============================================================================
// Notification and Progress Types (matching Rust types)
// ============================================================================

/** Progress notification params */
export interface ProgressNotification {
  progressToken: string;
  progress: number;
  total?: number;
  message?: string;
}

/** Log message notification */
export interface LogMessageNotification {
  level: LogLevel;
  message: string;
  logger?: string;
  data?: unknown;
}

/** Log level */
export type LogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

/** Resource list changed notification */
export interface ResourceListChanged { readonly _tag?: 'ResourceListChanged' }

/** Resource updated notification */
export interface ResourceUpdatedNotification {
  uri: string;
}

/** Tools list changed notification */
export interface ToolsListChanged { readonly _tag?: 'ToolsListChanged' }

/** Prompts list changed notification */
export interface PromptsListChanged { readonly _tag?: 'PromptsListChanged' }

/** Cancelled notification */
export interface CancelledNotification {
  requestId: unknown;
  reason?: string;
}

/** MCP notification payload */
export type McpNotification =
  | { type: 'progress'; data: ProgressNotification }
  | { type: 'logMessage'; data: LogMessageNotification }
  | { type: 'resourceListChanged'; data: ResourceListChanged }
  | { type: 'resourceUpdated'; data: ResourceUpdatedNotification }
  | { type: 'toolsListChanged'; data: ToolsListChanged }
  | { type: 'promptsListChanged'; data: PromptsListChanged }
  | { type: 'cancelled'; data: CancelledNotification }
  | { type: 'unknown'; method: string; params?: unknown };

/** Tool call progress event */
export interface ToolCallProgress {
  serverId: string;
  toolName: string;
  callId: string;
  state: ToolCallState;
  progress?: number;
  message?: string;
  error?: string;
  startedAt: number;
  endedAt?: number;
}

/** Tool call state */
export type ToolCallState = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/** Reconnection configuration */
export interface ReconnectConfig {
  enabled: boolean;
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/** Server health status */
export interface ServerHealth {
  serverId: string;
  isHealthy: boolean;
  lastPingAt?: number;
  pingLatencyMs?: number;
  failedPings: number;
}

/** MCP notification event payload (from Tauri) */
export interface McpNotificationEvent {
  serverId: string;
  notification: McpNotification;
}

/** Log message event payload (from Tauri) */
export interface McpLogMessageEvent {
  serverId: string;
  message: LogMessageNotification;
}

