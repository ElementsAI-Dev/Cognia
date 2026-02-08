/**
 * Tests for MCP Error Handler
 */

import {
  McpErrorType,
  classifyMcpError,
  getUserFriendlyMessage,
  getRecoverySuggestions,
  isRetryable,
  createClassifiedError,
  formatErrorWithRecovery,
  McpErrorHandler,
} from './error-handler';

const mockLogError = jest.fn();
jest.mock('@/lib/logger', () => ({
  loggers: {
    mcp: {
      error: (...args: unknown[]) => mockLogError(...args),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
    },
  },
}));

describe('MCP Error Handler', () => {
  describe('classifyMcpError', () => {
    it('should classify timeout errors', () => {
      expect(classifyMcpError('Request timeout after 30s')).toBe(McpErrorType.Timeout);
      expect(classifyMcpError('Operation timed out')).toBe(McpErrorType.Timeout);
    });

    it('should classify connection errors', () => {
      expect(classifyMcpError('Connection refused')).toBe(McpErrorType.Connection);
      expect(classifyMcpError('Failed to connect to server')).toBe(McpErrorType.Connection);
      expect(classifyMcpError('ECONNREFUSED')).toBe(McpErrorType.Connection);
    });

    it('should classify tool not found errors', () => {
      expect(classifyMcpError('Tool "xyz" not found')).toBe(McpErrorType.ToolNotFound);
    });

    it('should classify permission errors', () => {
      expect(classifyMcpError('Permission denied')).toBe(McpErrorType.Permission);
      expect(classifyMcpError('Unauthorized access')).toBe(McpErrorType.Permission);
      expect(classifyMcpError('Forbidden')).toBe(McpErrorType.Permission);
    });

    it('should classify rate limit errors', () => {
      expect(classifyMcpError('Rate limit exceeded')).toBe(McpErrorType.RateLimit);
      expect(classifyMcpError('Too many requests')).toBe(McpErrorType.RateLimit);
    });

    it('should classify invalid argument errors', () => {
      expect(classifyMcpError('Invalid argument: path')).toBe(McpErrorType.InvalidArgs);
      expect(classifyMcpError('Invalid parameter provided')).toBe(McpErrorType.InvalidArgs);
    });

    it('should classify not connected errors', () => {
      expect(classifyMcpError('Server not connected')).toBe(McpErrorType.NotConnected);
    });

    it('should classify protocol errors', () => {
      expect(classifyMcpError('Protocol error')).toBe(McpErrorType.Protocol);
      expect(classifyMcpError('JSON parse error')).toBe(McpErrorType.Protocol);
    });

    it('should return unknown for unclassified errors', () => {
      expect(classifyMcpError('Something went wrong')).toBe(McpErrorType.Unknown);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly messages for each error type', () => {
      expect(getUserFriendlyMessage(McpErrorType.Timeout)).toContain('timed out');
      expect(getUserFriendlyMessage(McpErrorType.Connection)).toContain('connect');
      expect(getUserFriendlyMessage(McpErrorType.ToolNotFound)).toContain('not available');
      expect(getUserFriendlyMessage(McpErrorType.Permission)).toContain('Permission');
      expect(getUserFriendlyMessage(McpErrorType.RateLimit)).toContain('requests');
      expect(getUserFriendlyMessage(McpErrorType.InvalidArgs)).toContain('Invalid');
      expect(getUserFriendlyMessage(McpErrorType.NotConnected)).toContain('not connected');
      expect(getUserFriendlyMessage(McpErrorType.Protocol)).toContain('Protocol');
      expect(getUserFriendlyMessage(McpErrorType.Unknown)).toContain('unexpected');
    });
  });

  describe('getRecoverySuggestions', () => {
    it('should return recovery suggestions for each error type', () => {
      expect(getRecoverySuggestions(McpErrorType.Timeout)).toHaveLength(3);
      expect(getRecoverySuggestions(McpErrorType.Connection)).toHaveLength(3);
      expect(getRecoverySuggestions(McpErrorType.Unknown)).toHaveLength(3);
    });

    it('should return relevant suggestions', () => {
      const timeoutSuggestions = getRecoverySuggestions(McpErrorType.Timeout);
      expect(timeoutSuggestions.some((s) => s.includes('network'))).toBe(true);

      const connectionSuggestions = getRecoverySuggestions(McpErrorType.Connection);
      expect(connectionSuggestions.some((s) => s.includes('server'))).toBe(true);
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable errors', () => {
      expect(isRetryable(McpErrorType.Timeout)).toBe(true);
      expect(isRetryable(McpErrorType.Connection)).toBe(true);
      expect(isRetryable(McpErrorType.RateLimit)).toBe(true);
      expect(isRetryable(McpErrorType.NotConnected)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      expect(isRetryable(McpErrorType.ToolNotFound)).toBe(false);
      expect(isRetryable(McpErrorType.InvalidArgs)).toBe(false);
      expect(isRetryable(McpErrorType.Permission)).toBe(false);
      expect(isRetryable(McpErrorType.Protocol)).toBe(false);
      expect(isRetryable(McpErrorType.Unknown)).toBe(false);
    });
  });

  describe('createClassifiedError', () => {
    it('should create a fully classified error', () => {
      const error = createClassifiedError('Connection timeout after 30s');

      expect(error.type).toBe(McpErrorType.Timeout);
      expect(error.originalError).toBe('Connection timeout after 30s');
      expect(error.userMessage).toBeTruthy();
      expect(error.recoverySteps).toHaveLength(3);
      expect(error.isRetryable).toBe(true);
    });

    it('should preserve original error message', () => {
      const originalMessage = 'Specific error details here';
      const error = createClassifiedError(originalMessage);

      expect(error.originalError).toBe(originalMessage);
    });
  });

  describe('formatErrorWithRecovery', () => {
    it('should format error with suggestions', () => {
      const formatted = formatErrorWithRecovery('Request timeout');

      expect(formatted).toContain('Suggestions:');
      expect(formatted).toContain('•');
    });
  });

  describe('McpErrorHandler', () => {
    it('should call onError callback when handling errors', () => {
      const onError = jest.fn();
      const handler = new McpErrorHandler(onError);

      handler.handle('Test error');

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          originalError: 'Test error',
        })
      );
    });

    it('should log errors with context', () => {
      mockLogError.mockClear();
      const handler = new McpErrorHandler();

      handler.handle('Test error', 'TestContext');

      expect(mockLogError).toHaveBeenCalledWith(
        'MCP Error [TestContext]: Test error'
      );
    });

    it('should wrap async functions with error handling', async () => {
      const onError = jest.fn();
      const handler = new McpErrorHandler(onError);

      const failingFn = async () => {
        throw new Error('Async failure');
      };

      await expect(handler.wrap(failingFn, 'TestWrap')).rejects.toThrow('Async failure');
      expect(onError).toHaveBeenCalled();
    });

    it('should return result for successful wrapped functions', async () => {
      const handler = new McpErrorHandler();

      const successFn = async () => 'success';

      const result = await handler.wrap(successFn);
      expect(result).toBe('success');
    });
  });
});
