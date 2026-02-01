/**
 * MCP Error Handler - Error classification and user-friendly messages
 *
 * Provides utilities for classifying MCP errors and generating
 * user-friendly error messages with recovery suggestions.
 */

import { loggers } from '@/lib/logger';

const log = loggers.mcp;

/**
 * MCP error types for classification
 */
export enum McpErrorType {
  Connection = 'connection',
  Timeout = 'timeout',
  Protocol = 'protocol',
  Server = 'server',
  ToolNotFound = 'tool_not_found',
  InvalidArgs = 'invalid_args',
  Permission = 'permission',
  RateLimit = 'rate_limit',
  NotConnected = 'not_connected',
  Unknown = 'unknown',
}

/**
 * Classified MCP error with metadata
 */
export interface ClassifiedMcpError {
  type: McpErrorType;
  message: string;
  userMessage: string;
  recoverySteps: string[];
  isRetryable: boolean;
  originalError: string;
}

/**
 * Classify an MCP error string into a typed error
 */
export function classifyMcpError(error: string): McpErrorType {
  const lower = error.toLowerCase();

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return McpErrorType.Timeout;
  }
  // Check "not connected" before general connection errors
  if (lower.includes('not connected')) {
    return McpErrorType.NotConnected;
  }
  if (lower.includes('connection') || lower.includes('connect') || lower.includes('econnrefused')) {
    return McpErrorType.Connection;
  }
  if (lower.includes('not found') && lower.includes('server')) {
    return McpErrorType.Server;
  }
  if (lower.includes('tool') && lower.includes('not found')) {
    return McpErrorType.ToolNotFound;
  }
  if (lower.includes('permission') || lower.includes('unauthorized') || lower.includes('forbidden')) {
    return McpErrorType.Permission;
  }
  if (lower.includes('rate limit') || lower.includes('too many') || lower.includes('throttle')) {
    return McpErrorType.RateLimit;
  }
  if (lower.includes('invalid') && (lower.includes('argument') || lower.includes('param'))) {
    return McpErrorType.InvalidArgs;
  }
  if (lower.includes('protocol') || lower.includes('json') || lower.includes('parse')) {
    return McpErrorType.Protocol;
  }

  return McpErrorType.Unknown;
}

/**
 * Get a user-friendly error message for an error type
 */
export function getUserFriendlyMessage(type: McpErrorType): string {
  switch (type) {
    case McpErrorType.Timeout:
      return 'Operation timed out. Please try again.';
    case McpErrorType.Connection:
      return 'Unable to connect to the server. Please check the server status.';
    case McpErrorType.Server:
      return 'Server not found. Please verify the server configuration.';
    case McpErrorType.ToolNotFound:
      return 'The requested tool is not available.';
    case McpErrorType.NotConnected:
      return 'Server is not connected. Please connect first.';
    case McpErrorType.Permission:
      return 'Permission denied. Please check your credentials.';
    case McpErrorType.RateLimit:
      return 'Too many requests. Please wait and try again.';
    case McpErrorType.InvalidArgs:
      return 'Invalid parameters provided. Please check your input.';
    case McpErrorType.Protocol:
      return 'Protocol error occurred. The server response was invalid.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Get recovery suggestions for an error type
 */
export function getRecoverySuggestions(type: McpErrorType): string[] {
  switch (type) {
    case McpErrorType.Timeout:
      return [
        'Check your network connection',
        'Try increasing the timeout setting',
        'Reduce the complexity of the request',
      ];
    case McpErrorType.Connection:
      return [
        'Verify the server is running',
        'Check the server configuration',
        'Review server logs for errors',
      ];
    case McpErrorType.Server:
      return [
        'Verify the server ID is correct',
        'Check if the server is configured',
        'Try reloading the configuration',
      ];
    case McpErrorType.ToolNotFound:
      return [
        'Verify the tool name is correct',
        'Check if the server supports this tool',
        'Try reconnecting to refresh the tool list',
      ];
    case McpErrorType.NotConnected:
      return [
        'Connect to the server first',
        'Check if the server is available',
        'Verify the server configuration',
      ];
    case McpErrorType.Permission:
      return [
        'Check API keys and credentials',
        'Verify environment variables',
        'Review server access permissions',
      ];
    case McpErrorType.RateLimit:
      return [
        'Wait a few moments before retrying',
        'Reduce request frequency',
        'Consider upgrading your plan',
      ];
    case McpErrorType.InvalidArgs:
      return [
        'Review the tool documentation',
        'Check required parameters',
        'Verify parameter types and formats',
      ];
    case McpErrorType.Protocol:
      return [
        'Check server compatibility',
        'Verify protocol version',
        'Review server logs',
      ];
    default:
      return ['Try the operation again', 'Check server status', 'Review error logs'];
  }
}

/**
 * Check if an error type is retryable
 */
export function isRetryable(type: McpErrorType): boolean {
  switch (type) {
    case McpErrorType.Timeout:
    case McpErrorType.Connection:
    case McpErrorType.RateLimit:
    case McpErrorType.NotConnected:
      return true;
    case McpErrorType.ToolNotFound:
    case McpErrorType.InvalidArgs:
    case McpErrorType.Permission:
    case McpErrorType.Protocol:
    case McpErrorType.Server:
    case McpErrorType.Unknown:
      return false;
    default:
      return false;
  }
}

/**
 * Create a fully classified error from an error string
 */
export function createClassifiedError(error: string): ClassifiedMcpError {
  const type = classifyMcpError(error);

  return {
    type,
    message: error,
    userMessage: getUserFriendlyMessage(type),
    recoverySteps: getRecoverySuggestions(type),
    isRetryable: isRetryable(type),
    originalError: error,
  };
}

/**
 * Format an error for display with recovery suggestions
 */
export function formatErrorWithRecovery(error: string): string {
  const classified = createClassifiedError(error);
  const suggestions = classified.recoverySteps.map((s) => `  • ${s}`).join('\n');

  return `${classified.userMessage}\n\nSuggestions:\n${suggestions}`;
}

/**
 * Error handler that logs and optionally notifies
 */
export class McpErrorHandler {
  private onError?: (error: ClassifiedMcpError) => void;

  constructor(onError?: (error: ClassifiedMcpError) => void) {
    this.onError = onError;
  }

  /**
   * Handle an error string
   */
  handle(error: string, context?: string): ClassifiedMcpError {
    const classified = createClassifiedError(error);

    if (context) {
      log.error(`MCP Error [${context}]: ${classified.message}`);
    } else {
      log.error(`MCP Error: ${classified.message}`);
    }

    if (this.onError) {
      this.onError(classified);
    }

    return classified;
  }

  /**
   * Wrap an async function with error handling
   */
  async wrap<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.handle(String(error), context);
      throw error;
    }
  }
}

/**
 * Default error handler instance
 */
export const defaultErrorHandler = new McpErrorHandler();
