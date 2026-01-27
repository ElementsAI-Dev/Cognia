/**
 * MCP Validation Utilities Tests
 */

import {
  validateServerName,
  validateCommand,
  validateSseUrl,
  validateEnvKey,
  validateArg,
  validateServerConfig,
  generateServerId,
  isValidServerId,
  sanitizeDisplayText,
} from './validation';

describe('MCP Validation', () => {
  describe('validateServerName', () => {
    it('should return null for valid server names', () => {
      expect(validateServerName('my-server')).toBeNull();
      expect(validateServerName('Server 1')).toBeNull();
      expect(validateServerName('a')).toBeNull();
    });

    it('should return error for empty server name', () => {
      expect(validateServerName('')).toBe('Server name is required');
      expect(validateServerName('   ')).toBe('Server name is required');
    });

    it('should return error for server name exceeding 100 characters', () => {
      const longName = 'a'.repeat(101);
      expect(validateServerName(longName)).toBe('Server name must be 100 characters or less');
    });

    it('should accept server name with exactly 100 characters', () => {
      const exactName = 'a'.repeat(100);
      expect(validateServerName(exactName)).toBeNull();
    });
  });

  describe('validateCommand', () => {
    it('should return null for valid commands', () => {
      expect(validateCommand('npx')).toBeNull();
      expect(validateCommand('npx @modelcontextprotocol/server-filesystem')).toBeNull();
      expect(validateCommand('uvx mcp-server-git')).toBeNull();
    });

    it('should return error for empty command', () => {
      expect(validateCommand('')).toBe('Command is required for stdio connections');
      expect(validateCommand('   ')).toBe('Command is required for stdio connections');
    });

    it('should return error for command exceeding 500 characters', () => {
      const longCommand = 'a'.repeat(501);
      expect(validateCommand(longCommand)).toBe('Command must be 500 characters or less');
    });

    it('should accept command with exactly 500 characters', () => {
      const exactCommand = 'a'.repeat(500);
      expect(validateCommand(exactCommand)).toBeNull();
    });
  });

  describe('validateSseUrl', () => {
    it('should return null for valid http URLs', () => {
      expect(validateSseUrl('http://localhost:3000')).toBeNull();
      expect(validateSseUrl('http://127.0.0.1:8080/sse')).toBeNull();
    });

    it('should return null for valid https URLs', () => {
      expect(validateSseUrl('https://api.example.com')).toBeNull();
      expect(validateSseUrl('https://mcp.server.io/events')).toBeNull();
    });

    it('should return error for empty URL', () => {
      expect(validateSseUrl('')).toBe('URL is required for SSE connections');
      expect(validateSseUrl('   ')).toBe('URL is required for SSE connections');
    });

    it('should return error for invalid URL format', () => {
      expect(validateSseUrl('not-a-url')).toBe('Invalid URL format');
      expect(validateSseUrl('://missing-protocol.com')).toBe('Invalid URL format');
    });

    it('should return error for non-http/https protocols', () => {
      expect(validateSseUrl('ftp://files.example.com')).toBe('URL must use http or https protocol');
      expect(validateSseUrl('ws://websocket.example.com')).toBe('URL must use http or https protocol');
      expect(validateSseUrl('file:///path/to/file')).toBe('URL must use http or https protocol');
    });
  });

  describe('validateEnvKey', () => {
    it('should return null for valid environment variable keys', () => {
      expect(validateEnvKey('API_KEY')).toBeNull();
      expect(validateEnvKey('OPENAI_API_KEY')).toBeNull();
      expect(validateEnvKey('MyVar123')).toBeNull();
      expect(validateEnvKey('a')).toBeNull();
    });

    it('should return error for empty key', () => {
      expect(validateEnvKey('')).toBe('Environment variable key is required');
      expect(validateEnvKey('   ')).toBe('Environment variable key is required');
    });

    it('should return error for keys starting with number', () => {
      expect(validateEnvKey('123KEY')).toBe(
        'Environment variable key must start with a letter and contain only letters, numbers, and underscores'
      );
    });

    it('should return error for keys with invalid characters', () => {
      expect(validateEnvKey('API-KEY')).toBe(
        'Environment variable key must start with a letter and contain only letters, numbers, and underscores'
      );
      expect(validateEnvKey('API.KEY')).toBe(
        'Environment variable key must start with a letter and contain only letters, numbers, and underscores'
      );
      expect(validateEnvKey('API KEY')).toBe(
        'Environment variable key must start with a letter and contain only letters, numbers, and underscores'
      );
    });

    it('should return error for key exceeding 100 characters', () => {
      const longKey = 'A' + 'B'.repeat(100);
      expect(validateEnvKey(longKey)).toBe('Environment variable key must be 100 characters or less');
    });
  });

  describe('validateArg', () => {
    it('should return null for valid arguments', () => {
      expect(validateArg('--help')).toBeNull();
      expect(validateArg('/path/to/file')).toBeNull();
      expect(validateArg('value with spaces')).toBeNull();
    });

    it('should return error for empty argument', () => {
      expect(validateArg('')).toBe('Argument cannot be empty');
      expect(validateArg('   ')).toBe('Argument cannot be empty');
    });

    it('should return error for argument exceeding 1000 characters', () => {
      const longArg = 'a'.repeat(1001);
      expect(validateArg(longArg)).toBe('Argument must be 1000 characters or less');
    });
  });

  describe('validateServerConfig', () => {
    it('should return valid for complete stdio config', () => {
      const result = validateServerConfig({
        name: 'test-server',
        connectionType: 'stdio',
        command: 'npx test-server',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return valid for complete SSE config', () => {
      const result = validateServerConfig({
        name: 'sse-server',
        connectionType: 'sse',
        url: 'https://api.example.com/sse',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return error for missing name', () => {
      const result = validateServerConfig({
        connectionType: 'stdio',
        command: 'npx test',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Server name is required');
    });

    it('should return error for missing command in stdio mode', () => {
      const result = validateServerConfig({
        name: 'test-server',
        connectionType: 'stdio',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.command).toBe('Command is required for stdio connections');
    });

    it('should return error for missing URL in SSE mode', () => {
      const result = validateServerConfig({
        name: 'test-server',
        connectionType: 'sse',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.url).toBe('URL is required for SSE connections');
    });

    it('should validate args if present', () => {
      const result = validateServerConfig({
        name: 'test-server',
        connectionType: 'stdio',
        command: 'npx test',
        args: ['valid', ''],
      });
      expect(result.isValid).toBe(false);
      expect(result.errors['args.1']).toBe('Argument cannot be empty');
    });

    it('should validate env keys if present', () => {
      const result = validateServerConfig({
        name: 'test-server',
        connectionType: 'stdio',
        command: 'npx test',
        env: { '123INVALID': 'value' },
      });
      expect(result.isValid).toBe(false);
      expect(result.errors['env.123INVALID']).toBeDefined();
    });

    it('should respect allowedConnectionTypes option', () => {
      const result = validateServerConfig(
        {
          name: 'test-server',
          connectionType: 'sse',
          url: 'https://api.example.com',
        },
        { allowedConnectionTypes: ['stdio'] }
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.connectionType).toBe('Connection type must be one of: stdio');
    });

    it('should default to stdio connection type', () => {
      const result = validateServerConfig({
        name: 'test-server',
        command: 'npx test',
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('generateServerId', () => {
    it('should convert name to lowercase kebab-case', () => {
      expect(generateServerId('My Server')).toBe('my-server');
      expect(generateServerId('Test Server 123')).toBe('test-server-123');
    });

    it('should remove invalid characters', () => {
      expect(generateServerId('Server@#$%')).toBe('server');
      expect(generateServerId('Test!Server')).toBe('testserver');
    });

    it('should remove leading and trailing dashes', () => {
      expect(generateServerId('--test--')).toBe('test');
      expect(generateServerId('  test  ')).toBe('test');
    });

    it('should limit length to 50 characters', () => {
      const longName = 'a'.repeat(60);
      expect(generateServerId(longName).length).toBe(50);
    });

    it('should handle empty string', () => {
      expect(generateServerId('')).toBe('');
    });
  });

  describe('isValidServerId', () => {
    it('should return true for valid server IDs', () => {
      expect(isValidServerId('my-server')).toBe(true);
      expect(isValidServerId('server123')).toBe(true);
      expect(isValidServerId('a')).toBe(true);
      expect(isValidServerId('a-b-c')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isValidServerId('')).toBe(false);
    });

    it('should return false for IDs exceeding 100 characters', () => {
      const longId = 'a'.repeat(101);
      expect(isValidServerId(longId)).toBe(false);
    });

    it('should return false for IDs with invalid characters', () => {
      expect(isValidServerId('My-Server')).toBe(false);
      expect(isValidServerId('server_name')).toBe(false);
      expect(isValidServerId('server.name')).toBe(false);
    });

    it('should return false for IDs starting or ending with dash', () => {
      expect(isValidServerId('-server')).toBe(false);
      expect(isValidServerId('server-')).toBe(false);
    });
  });

  describe('sanitizeDisplayText', () => {
    it('should return empty string for falsy input', () => {
      expect(sanitizeDisplayText('')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeDisplayText('  hello  ')).toBe('hello');
    });

    it('should remove HTML-like characters', () => {
      expect(sanitizeDisplayText('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeDisplayText('Hello <b>World</b>')).toBe('Hello bWorld/b');
    });

    it('should truncate to maxLength', () => {
      const longText = 'a'.repeat(300);
      expect(sanitizeDisplayText(longText).length).toBe(200);
      expect(sanitizeDisplayText(longText, 50).length).toBe(50);
    });

    it('should handle custom maxLength', () => {
      expect(sanitizeDisplayText('Hello World', 5)).toBe('Hello');
    });
  });
});
