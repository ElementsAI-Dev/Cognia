/**
 * MCP Server Configuration Utilities
 * Functions for creating, parsing, and transforming server configurations
 */

import type { McpServerConfig, McpConnectionType } from '@/types/mcp';
import type { McpMarketplaceItem } from '@/types/mcp/mcp-marketplace';

/**
 * Create a default server configuration
 */
export function createEmptyServerConfig(): McpServerConfig {
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

/**
 * Create server config from marketplace item
 */
export function createConfigFromMarketplaceItem(
  item: McpMarketplaceItem,
  envValues: Record<string, string> = {}
): McpServerConfig {
  const config: McpServerConfig = {
    name: item.name,
    command: 'npx',
    args: ['-y', item.mcpId],
    env: { ...envValues },
    connectionType: 'stdio',
    enabled: true,
    autoStart: false,
  };

  // Handle remote/SSE connections
  if (item.remote && item.connectionConfig) {
    if (item.connectionConfig.type === 'sse' || item.connectionConfig.type === 'streamable-http') {
      config.connectionType = 'sse';
      config.url = item.connectionConfig.url;
      config.command = '';
      config.args = [];
    } else if (item.connectionConfig.command) {
      config.command = item.connectionConfig.command;
      config.args = item.connectionConfig.args || [];
    }
  }

  // Handle official MCP servers
  if (item.githubUrl?.includes('modelcontextprotocol/servers')) {
    const serverName = item.mcpId.replace(/^@modelcontextprotocol\/server-/, '');
    config.args = ['-y', `@modelcontextprotocol/server-${serverName}`];
  }

  return config;
}

/**
 * Merge environment variables, preferring new values
 */
export function mergeEnvVariables(
  existing: Record<string, string>,
  newValues: Record<string, string>
): Record<string, string> {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(newValues)) {
    if (value && value.trim()) {
      merged[key] = value.trim();
    }
  }
  return merged;
}

/**
 * Parse command line string into command and args
 */
export function parseCommandLine(commandLine: string): { command: string; args: string[] } {
  if (!commandLine || !commandLine.trim()) {
    return { command: '', args: [] };
  }

  const parts = commandLine.trim().split(/\s+/);
  const command = parts[0] || '';
  const args = parts.slice(1);

  return { command, args };
}

/**
 * Format command and args into display string
 */
export function formatCommandLine(command: string, args: string[]): string {
  if (!command) return '';
  if (args.length === 0) return command;
  return `${command} ${args.join(' ')}`;
}

/**
 * Clone server config with optional overrides
 */
export function cloneServerConfig(
  config: McpServerConfig,
  overrides: Partial<McpServerConfig> = {}
): McpServerConfig {
  return {
    name: overrides.name ?? config.name,
    command: overrides.command ?? config.command,
    args: overrides.args ?? [...config.args],
    env: overrides.env ?? { ...config.env },
    connectionType: overrides.connectionType ?? config.connectionType,
    url: overrides.url ?? config.url,
    enabled: overrides.enabled ?? config.enabled,
    autoStart: overrides.autoStart ?? config.autoStart,
  };
}

/**
 * Check if two server configs are equal
 */
export function areConfigsEqual(a: McpServerConfig, b: McpServerConfig): boolean {
  return (
    a.name === b.name &&
    a.command === b.command &&
    a.connectionType === b.connectionType &&
    a.url === b.url &&
    a.enabled === b.enabled &&
    a.autoStart === b.autoStart &&
    JSON.stringify(a.args) === JSON.stringify(b.args) &&
    JSON.stringify(a.env) === JSON.stringify(b.env)
  );
}

/**
 * Get connection type label
 */
export function getConnectionTypeLabel(type: McpConnectionType): string {
  switch (type) {
    case 'stdio':
      return 'Standard I/O (Local)';
    case 'sse':
      return 'Server-Sent Events (Remote)';
    default:
      return type;
  }
}

/**
 * Determine if a config requires local execution
 */
export function requiresLocalExecution(config: McpServerConfig): boolean {
  return config.connectionType === 'stdio';
}

/**
 * Get display summary for a server config
 */
export function getConfigSummary(config: McpServerConfig): string {
  if (config.connectionType === 'sse') {
    return config.url || 'SSE Connection';
  }
  return formatCommandLine(config.command, config.args) || 'No command specified';
}

/**
 * Extract npm package name from args
 */
export function extractPackageName(args: string[]): string | null {
  // Look for -y followed by package name, or just package name
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-y' && i + 1 < args.length) {
      return args[i + 1];
    }
    // Check if it looks like a package name (starts with @ or is alphanumeric with -)
    if (/^@?[a-z0-9][-a-z0-9/]*$/i.test(arg)) {
      return arg;
    }
  }
  return null;
}
