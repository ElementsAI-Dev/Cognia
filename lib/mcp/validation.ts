/**
 * MCP Validation Utilities
 * Validation functions for MCP server configurations
 */

import type { McpServerConfig, McpConnectionType } from '@/types/mcp';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface ServerConfigValidationOptions {
  requireEnvValues?: boolean;
  allowedConnectionTypes?: McpConnectionType[];
}

/**
 * Validate server name
 */
export function validateServerName(name: string): string | null {
  if (!name || !name.trim()) {
    return 'Server name is required';
  }
  if (name.length > 100) {
    return 'Server name must be 100 characters or less';
  }
  return null;
}

/**
 * Validate command for stdio connections
 */
export function validateCommand(command: string): string | null {
  if (!command || !command.trim()) {
    return 'Command is required for stdio connections';
  }
  // Basic command validation - no spaces at start/end, reasonable length
  const trimmed = command.trim();
  if (trimmed.length > 500) {
    return 'Command must be 500 characters or less';
  }
  return null;
}

/**
 * Validate URL for SSE connections
 */
export function validateSseUrl(url: string): string | null {
  if (!url || !url.trim()) {
    return 'URL is required for SSE connections';
  }
  
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'URL must use http or https protocol';
    }
  } catch {
    return 'Invalid URL format';
  }
  
  return null;
}

/**
 * Validate environment variable key
 */
export function validateEnvKey(key: string): string | null {
  if (!key || !key.trim()) {
    return 'Environment variable key is required';
  }
  
  // Check for valid env var naming (alphanumeric + underscore, starting with letter)
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key.trim())) {
    return 'Environment variable key must start with a letter and contain only letters, numbers, and underscores';
  }
  
  if (key.length > 100) {
    return 'Environment variable key must be 100 characters or less';
  }
  
  return null;
}

/**
 * Validate command argument
 */
export function validateArg(arg: string): string | null {
  if (!arg || !arg.trim()) {
    return 'Argument cannot be empty';
  }
  if (arg.length > 1000) {
    return 'Argument must be 1000 characters or less';
  }
  return null;
}

/**
 * Validate complete server configuration
 */
export function validateServerConfig(
  config: Partial<McpServerConfig>,
  options: ServerConfigValidationOptions = {}
): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate name
  const nameError = validateServerName(config.name || '');
  if (nameError) {
    errors.name = nameError;
  }

  // Validate based on connection type
  const connectionType = config.connectionType || 'stdio';

  if (options.allowedConnectionTypes && !options.allowedConnectionTypes.includes(connectionType)) {
    errors.connectionType = `Connection type must be one of: ${options.allowedConnectionTypes.join(', ')}`;
  }

  if (connectionType === 'stdio') {
    const commandError = validateCommand(config.command || '');
    if (commandError) {
      errors.command = commandError;
    }
  } else if (connectionType === 'sse') {
    const urlError = validateSseUrl(config.url || '');
    if (urlError) {
      errors.url = urlError;
    }
  }

  // Validate args if present
  if (config.args && config.args.length > 0) {
    for (let i = 0; i < config.args.length; i++) {
      const argError = validateArg(config.args[i]);
      if (argError) {
        errors[`args.${i}`] = argError;
        break; // Report first error only
      }
    }
  }

  // Validate env keys if present
  if (config.env) {
    for (const key of Object.keys(config.env)) {
      const keyError = validateEnvKey(key);
      if (keyError) {
        errors[`env.${key}`] = keyError;
        break; // Report first error only
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Generate a valid server ID from name
 */
export function generateServerId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
    .substring(0, 50); // Limit length
}

/**
 * Check if a server ID is valid
 */
export function isValidServerId(id: string): boolean {
  if (!id || id.length === 0 || id.length > 100) {
    return false;
  }
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(id);
}

/**
 * Sanitize user input for display
 */
export function sanitizeDisplayText(text: string, maxLength = 200): string {
  if (!text) return '';
  return text
    .replace(/[<>]/g, '') // Remove HTML-like characters
    .trim()
    .substring(0, maxLength);
}
