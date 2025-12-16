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
