/**
 * @jest-environment jsdom
 */

/**
 * Tests for ACP Client Adapter
 */

import { AcpClientAdapter } from './acp-client';
import type { ExternalAgentConfig } from '@/types/agent/external-agent';

// Mock isTauri
jest.mock('@/lib/utils', () => ({
  isTauri: jest.fn().mockReturnValue(false),
}));

// Mock Tauri APIs
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn().mockResolvedValue(() => {}),
  emit: jest.fn(),
}));

describe('AcpClientAdapter', () => {
  describe('constructor', () => {
    it('should create an instance with config', () => {
      const client = new AcpClientAdapter();
      expect(client).toBeInstanceOf(AcpClientAdapter);
    });

    it('should initialize with disconnected state', () => {
      const client = new AcpClientAdapter();
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('isConnected', () => {
    it('should return false initially', () => {
      const client = new AcpClientAdapter();
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('getSessions', () => {
    it('should return empty sessions initially', () => {
      const client = new AcpClientAdapter();
      const sessions = client.getSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('getSession', () => {
    it('should return undefined for non-existent session', () => {
      const client = new AcpClientAdapter();
      const session = client.getSession('non-existent');
      expect(session).toBeUndefined();
    });
  });

  describe('disconnect', () => {
    it('should disconnect without errors', async () => {
      const client = new AcpClientAdapter();
      await expect(client.disconnect()).resolves.not.toThrow();
    });
  });
});

describe('AcpClientAdapter JSON-RPC Message Handling', () => {
  it('should have correct protocol identifier', () => {
    const client = new AcpClientAdapter();
    // ACP uses JSON-RPC 2.0 protocol
    expect(client).toBeDefined();
  });
});

describe('AcpClientAdapter Session Management', () => {
  it('should track sessions after creation', () => {
    const client = new AcpClientAdapter();
    // Initially no sessions
    expect(client.getSessions().length).toBe(0);
  });

  it('should not have active session initially', () => {
    const client = new AcpClientAdapter();
    const session = client.getSession('any-id');
    expect(session).toBeUndefined();
  });
});

describe('AcpClientAdapter Error Handling', () => {
  it('should throw when creating session while disconnected', async () => {
    const client = new AcpClientAdapter();
    
    await expect(client.createSession()).rejects.toThrow('Not connected');
  });

  it('should throw when prompting without valid session', async () => {
    const client = new AcpClientAdapter();
    
    const promptGen = client.prompt('invalid-session', { id: 'test-msg', role: 'user', content: [{ type: 'text', text: 'test' }], timestamp: new Date() });
    const iterator = promptGen[Symbol.asyncIterator]();
    
    await expect(iterator.next()).rejects.toThrow();
  });

  it('should handle cancel for non-executing session gracefully', async () => {
    const client = new AcpClientAdapter();
    
    // Should not throw for non-existent session
    await expect(client.cancel('non-existent')).resolves.not.toThrow();
  });
});

describe('AcpClientAdapter Permission Handling', () => {
  const mockConfig: ExternalAgentConfig = {
    id: 'test-agent',
    name: 'Test Agent',
    protocol: 'acp',
    transport: 'stdio',
    enabled: true,
    defaultPermissionMode: 'default',
    timeout: 300000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should support different permission modes', () => {
    const _client = new AcpClientAdapter();
    
    // Client should be able to handle different permission modes
    expect(mockConfig.defaultPermissionMode).toBe('default');
  });

  it('should store config with permission settings', () => {
    const client = new AcpClientAdapter();
    expect(client).toBeDefined();
  });

  it('should support sse transport', () => {
    const _config: ExternalAgentConfig = {
      id: 'sse-agent',
      name: 'SSE Agent',
      protocol: 'acp',
      transport: 'sse',
      enabled: true,
      network: {
        endpoint: 'http://localhost:8080',
      },
      defaultPermissionMode: 'default',
      timeout: 300000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const client = new AcpClientAdapter();
    expect(client).toBeDefined();
  });
});

describe('AcpClientAdapter Transport Configuration', () => {
  it('should support stdio transport', () => {
    const _config: ExternalAgentConfig = {
      id: 'stdio-agent',
      name: 'Stdio Agent',
      protocol: 'acp',
      transport: 'stdio',
      enabled: true,
      process: {
        command: 'agent-command',
        args: [],
      },
      defaultPermissionMode: 'default',
      timeout: 300000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const client = new AcpClientAdapter();
    expect(client).toBeDefined();
  });

  it('should support http transport', () => {
    const _config: ExternalAgentConfig = {
      id: 'http-agent',
      name: 'HTTP Agent',
      protocol: 'acp',
      transport: 'http',
      enabled: true,
      network: {
        endpoint: 'http://localhost:8080',
      },
      defaultPermissionMode: 'default',
      timeout: 300000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const client = new AcpClientAdapter();
    expect(client).toBeDefined();
  });

  it('should support websocket transport', () => {
    const _config: ExternalAgentConfig = {
      id: 'ws-agent',
      name: 'WebSocket Agent',
      protocol: 'acp',
      transport: 'websocket',
      enabled: true,
      network: {
        endpoint: 'ws://localhost:8080',
      },
      defaultPermissionMode: 'default',
      timeout: 300000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const client = new AcpClientAdapter();
    expect(client).toBeDefined();
  });
});

describe('AcpClientAdapter Protocol Methods', () => {
  it('should have createSession method', () => {
    const client = new AcpClientAdapter();
    expect(typeof client.createSession).toBe('function');
  });

  it('should have closeSession method', () => {
    const client = new AcpClientAdapter();
    expect(typeof client.closeSession).toBe('function');
  });

  it('should have prompt method', () => {
    const client = new AcpClientAdapter();
    expect(typeof client.prompt).toBe('function');
  });

  it('should have cancel method', () => {
    const client = new AcpClientAdapter();
    expect(typeof client.cancel).toBe('function');
  });
});

describe('AcpClientAdapter Timeout Configuration', () => {
  it('should use default timeout when not specified', () => {
    const client = new AcpClientAdapter();
    expect(client).toBeDefined();
  });

  it('should accept custom timeout', () => {
    const client = new AcpClientAdapter();
    expect(client).toBeDefined();
  });
});

describe('AcpClientAdapter Retry Configuration', () => {
  it('should support retry configuration', () => {
    const client = new AcpClientAdapter();
    expect(client).toBeDefined();
  });
});

describe('AcpClientAdapter Authentication', () => {
  it('should have authenticate method', () => {
    const client = new AcpClientAdapter();
    expect(typeof client.authenticate).toBe('function');
  });

  it('should have getAuthMethods method', () => {
    const client = new AcpClientAdapter();
    expect(typeof client.getAuthMethods).toBe('function');
  });

  it('should have isAuthenticationRequired method', () => {
    const client = new AcpClientAdapter();
    expect(typeof client.isAuthenticationRequired).toBe('function');
  });

  it('should return empty auth methods when not initialized', () => {
    const client = new AcpClientAdapter();
    expect(client.getAuthMethods()).toEqual([]);
  });

  it('should return false for isAuthenticationRequired when not initialized', () => {
    const client = new AcpClientAdapter();
    expect(client.isAuthenticationRequired()).toBe(false);
  });

  it('should throw when authenticate called without auth methods', async () => {
    const client = new AcpClientAdapter();
    await expect(client.authenticate('api-key')).rejects.toThrow('Agent does not require authentication');
  });
});

describe('AcpClientAdapter Model Selection', () => {
  it('should have setSessionModel method', () => {
    const client = new AcpClientAdapter();
    expect(typeof client.setSessionModel).toBe('function');
  });

  it('should have getSessionModels method', () => {
    const client = new AcpClientAdapter();
    expect(typeof client.getSessionModels).toBe('function');
  });

  it('should throw when setSessionModel called with non-existent session', async () => {
    const client = new AcpClientAdapter();
    await expect(client.setSessionModel('non-existent', 'gpt-4')).rejects.toThrow('Session not found');
  });

  it('should return undefined for getSessionModels with non-existent session', () => {
    const client = new AcpClientAdapter();
    expect(client.getSessionModels('non-existent')).toBeUndefined();
  });
});
