/**
 * Tests for useMcpServerForm hook
 */

import { renderHook, act } from '@testing-library/react';
import { useMcpServerForm } from './use-mcp-server-form';
import { useMcpStore } from '@/stores/mcp';
import { createDefaultServerConfig } from '@/types/mcp';
import type { McpServerState, McpConnectionType } from '@/types/mcp';

// Mock the MCP store and default config
jest.mock('@/stores/mcp', () => ({
  useMcpStore: jest.fn(),
}));

jest.mock('@/types/mcp', () => ({
  createDefaultServerConfig: jest.fn(),
}));

const mockUseMcpStore = useMcpStore as jest.MockedFunction<typeof useMcpStore>;
const mockCreateDefaultServerConfig = createDefaultServerConfig as jest.MockedFunction<typeof createDefaultServerConfig>;

describe('useMcpServerForm', () => {
  const mockServer: McpServerState = {
    id: 'test-server',
    name: 'Test Server',
    config: {
      name: 'Test Server',
      command: 'test-command',
      args: ['--help'],
      env: { NODE_ENV: 'test' },
      connectionType: 'stdio',
      url: '',
      enabled: true,
      autoStart: false,
    },
    status: { type: 'disconnected' },
    tools: [],
    resources: [],
    prompts: [],
    reconnectAttempts: 0,
  };

  const mockDefaultConfig = {
    name: '',
    command: '',
    args: [],
    env: {},
    connectionType: 'stdio' as McpConnectionType,
    url: '',
    enabled: true,
    autoStart: false,
  };

  const createMockStore = (overrides: Record<string, unknown> = {}) => ({
    addServer: jest.fn(),
    updateServer: jest.fn(),
    servers: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateDefaultServerConfig.mockReturnValue(mockDefaultConfig);
  });

  describe('initial state', () => {
    it('should initialize with default values when not editing', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      expect(result.current.state.data).toEqual(mockDefaultConfig);
      expect(result.current.state.newArg).toBe('');
      expect(result.current.state.newEnvKey).toBe('');
      expect(result.current.state.newEnvValue).toBe('');
      expect(result.current.state.showEnvValues).toEqual({});
      expect(result.current.state.saving).toBe(false);
      expect(result.current.state.isValid).toBe(false);
      expect(typeof result.current.setName).toBe('function');
      expect(typeof result.current.setCommand).toBe('function');
      expect(typeof result.current.setConnectionType).toBe('function');
      expect(typeof result.current.setUrl).toBe('function');
      expect(typeof result.current.setEnabled).toBe('function');
      expect(typeof result.current.setAutoStart).toBe('function');
      expect(typeof result.current.setNewArg).toBe('function');
      expect(typeof result.current.setNewEnvKey).toBe('function');
      expect(typeof result.current.setNewEnvValue).toBe('function');
      expect(typeof result.current.addArg).toBe('function');
      expect(typeof result.current.removeArg).toBe('function');
      expect(typeof result.current.addEnv).toBe('function');
      expect(typeof result.current.removeEnv).toBe('function');
      expect(typeof result.current.toggleEnvVisibility).toBe('function');
      expect(typeof result.current.resetForm).toBe('function');
      expect(typeof result.current.handleSave).toBe('function');
    });

    it('should populate form when editing server', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: mockServer })
      );

      expect(result.current.state.data).toEqual({
        name: mockServer.config.name,
        command: mockServer.config.command,
        args: [...mockServer.config.args],
        env: { ...mockServer.config.env },
        connectionType: mockServer.config.connectionType,
        url: mockServer.config.url || '',
        enabled: mockServer.config.enabled,
        autoStart: mockServer.config.autoStart,
      });
      expect(result.current.state.isValid).toBe(true);
    });

    it('should reset form when editingServer changes to null', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result, rerender } = renderHook(
        ({ editingServer }: { editingServer: McpServerState | null }) => useMcpServerForm({ editingServer }),
        { initialProps: { editingServer: mockServer as McpServerState | null } }
      );

      expect(result.current.state.data.name).toBe(mockServer.config.name);

      rerender({ editingServer: null });

      expect(result.current.state.data).toEqual(mockDefaultConfig);
      expect(result.current.state.newArg).toBe('');
      expect(result.current.state.newEnvKey).toBe('');
      expect(result.current.state.newEnvValue).toBe('');
      expect(result.current.state.showEnvValues).toEqual({});
    });
  });

  describe('form validation', () => {
    it('should be valid when name is provided and stdio command is provided', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setName('Test Server');
        result.current.setCommand('test-command');
      });

      expect(result.current.state.isValid).toBe(true);
    });

    it('should be valid when name is provided and SSE URL is provided', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setName('Test Server');
        result.current.setConnectionType('sse');
        result.current.setUrl('http://localhost:3000');
      });

      expect(result.current.state.isValid).toBe(true);
    });

    it('should be invalid when name is empty', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setCommand('test-command');
      });

      expect(result.current.state.isValid).toBe(false);
    });

    it('should be invalid when stdio command is empty', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setName('Test Server');
        result.current.setConnectionType('stdio');
      });

      expect(result.current.state.isValid).toBe(false);
    });

    it('should be invalid when SSE URL is empty', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setName('Test Server');
        result.current.setConnectionType('sse');
      });

      expect(result.current.state.isValid).toBe(false);
    });

    it('should handle whitespace in validation', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setName('  Test Server  ');
        result.current.setCommand('  test-command  ');
      });

      expect(result.current.state.isValid).toBe(true);
    });
  });

  describe('setName', () => {
    it('should update name in form data', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setName('New Server Name');
      });

      expect(result.current.state.data.name).toBe('New Server Name');
    });

    it('should handle empty name', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setName('');
      });

      expect(result.current.state.data.name).toBe('');
      expect(result.current.state.isValid).toBe(false);
    });
  });

  describe('setCommand', () => {
    it('should update command in form data', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setCommand('new-command');
      });

      expect(result.current.state.data.command).toBe('new-command');
    });
  });

  describe('setConnectionType', () => {
    it('should update connection type in form data', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setConnectionType('sse');
      });

      expect(result.current.state.data.connectionType).toBe('sse');
    });
  });

  describe('setUrl', () => {
    it('should update URL in form data', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setUrl('http://localhost:3000');
      });

      expect(result.current.state.data.url).toBe('http://localhost:3000');
    });
  });

  describe('setEnabled', () => {
    it('should update enabled state in form data', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setEnabled(false);
      });

      expect(result.current.state.data.enabled).toBe(false);
    });
  });

  describe('setAutoStart', () => {
    it('should update auto start state in form data', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setAutoStart(true);
      });

      expect(result.current.state.data.autoStart).toBe(true);
    });
  });

  describe('arguments management', () => {
    it('should set new argument value', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setNewArg('--help');
      });

      expect(result.current.state.newArg).toBe('--help');
    });

    it('should add argument to form data', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setNewArg('--help');
        result.current.addArg();
      });

      expect(result.current.state.data.args).toEqual(['--help']);
      expect(result.current.state.newArg).toBe('');
    });

    it('should not add empty argument', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.addArg();
      });

      expect(result.current.state.data.args).toEqual([]);
    });

    it('should remove argument from form data', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setNewArg('--help');
        result.current.addArg();
        result.current.setNewArg('--verbose');
        result.current.addArg();
        result.current.removeArg(0);
      });

      expect(result.current.state.data.args).toEqual(['--verbose']);
    });

    it('should handle removing non-existent argument index', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.removeArg(10);
      });

      expect(result.current.state.data.args).toEqual([]);
    });
  });

  describe('environment variables management', () => {
    it('should set new environment key and value', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setNewEnvKey('API_KEY');
        result.current.setNewEnvValue('secret-key');
      });

      expect(result.current.state.newEnvKey).toBe('API_KEY');
      expect(result.current.state.newEnvValue).toBe('secret-key');
    });

    it('should add environment variable to form data', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setNewEnvKey('API_KEY');
        result.current.setNewEnvValue('secret-key');
        result.current.addEnv();
      });

      expect(result.current.state.data.env).toEqual({ API_KEY: 'secret-key' });
      expect(result.current.state.newEnvKey).toBe('');
      expect(result.current.state.newEnvValue).toBe('');
      expect(result.current.state.showEnvValues).toEqual({ API_KEY: false });
    });

    it('should not add environment variable with empty key', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setNewEnvValue('value');
        result.current.addEnv();
      });

      expect(result.current.state.data.env).toEqual({});
    });

    it('should remove environment variable from form data', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setNewEnvKey('API_KEY');
        result.current.setNewEnvValue('secret');
        result.current.addEnv();
        result.current.setNewEnvKey('DATABASE_URL');
        result.current.setNewEnvValue('localhost');
        result.current.addEnv();
        result.current.removeEnv('API_KEY');
      });

      expect(result.current.state.data.env).toEqual({ DATABASE_URL: 'localhost' });
      expect(result.current.state.showEnvValues).toEqual({ DATABASE_URL: false });
    });

    it('should toggle environment variable visibility', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      act(() => {
        result.current.setNewEnvKey('API_KEY');
        result.current.setNewEnvValue('secret');
        result.current.addEnv();
        result.current.toggleEnvVisibility('API_KEY');
      });

      expect(result.current.state.showEnvValues.API_KEY).toBe(true);

      act(() => {
        result.current.toggleEnvVisibility('API_KEY');
      });

      expect(result.current.state.showEnvValues.API_KEY).toBe(false);
    });
  });

  describe('resetForm', () => {
    it('should reset form to default values', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      // Modify form state
      act(() => {
        result.current.setName('Modified Server');
        result.current.setCommand('modified-command');
        result.current.setNewArg('--help');
        result.current.addArg();
        result.current.setNewEnvKey('API_KEY');
        result.current.setNewEnvValue('secret');
        result.current.addEnv();
      });

      expect(result.current.state.data.name).toBe('Modified Server');
      expect(result.current.state.data.args).toEqual(['--help']);
      expect(result.current.state.data.env).toEqual({ API_KEY: 'secret' });

      // Reset form
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.state.data).toEqual(mockDefaultConfig);
      expect(result.current.state.newArg).toBe('');
      expect(result.current.state.newEnvKey).toBe('');
      expect(result.current.state.newEnvValue).toBe('');
      expect(result.current.state.showEnvValues).toEqual({});
    });

    it('should reset form to editing server values when editing', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: mockServer })
      );

      // Modify form state
      act(() => {
        result.current.setName('Modified Server');
        result.current.setCommand('modified-command');
      });

      expect(result.current.state.data.name).toBe('Modified Server');
      expect(result.current.state.data.command).toBe('modified-command');

      // Reset form
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.state.data.name).toBe(mockServer.config.name);
      expect(result.current.state.data.command).toBe(mockServer.config.command);
    });
  });

  describe('handleSave', () => {
    it('should add new server when not editing', async () => {
      const mockAddServer = jest.fn();
      const onSuccess = jest.fn();
      mockUseMcpStore.mockReturnValue(createMockStore({
        addServer: mockAddServer,
      }));

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null, onSuccess })
      );

      // Fill form with valid data
      act(() => {
        result.current.setName('New Server');
        result.current.setCommand('new-command');
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(mockAddServer).toHaveBeenCalledWith({
        name: 'New Server',
        command: 'new-command',
        args: [],
        env: {},
        connectionType: 'stdio',
        url: '',
        enabled: true,
        autoStart: false,
      });
      expect(result.current.state.saving).toBe(false);
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should update existing server when editing', async () => {
      const mockUpdateServer = jest.fn();
      const onSuccess = jest.fn();
      mockUseMcpStore.mockReturnValue(createMockStore({
        updateServer: mockUpdateServer,
      }));

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: mockServer, onSuccess })
      );

      // Modify form data
      act(() => {
        result.current.setName('Updated Server');
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(mockUpdateServer).toHaveBeenCalledWith(mockServer.id, {
        ...mockServer.config,
        name: 'Updated Server',
      });
      expect(result.current.state.saving).toBe(false);
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should not save when form is invalid', async () => {
      const mockAddServer = jest.fn();
      const onError = jest.fn();
      mockUseMcpStore.mockReturnValue(createMockStore({
        addServer: mockAddServer,
      }));

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null, onError })
      );

      await act(async () => {
        await result.current.handleSave();
      });

      expect(mockAddServer).not.toHaveBeenCalled();
      expect(result.current.state.saving).toBe(false);
      expect(onError).toHaveBeenCalledWith('Please fill in all required fields');
    });

    it('should handle save errors', async () => {
      const errorMessage = 'Save failed';
      const mockAddServer = jest.fn().mockRejectedValue(new Error(errorMessage));
      const onError = jest.fn();
      mockUseMcpStore.mockReturnValue(createMockStore({
        addServer: mockAddServer,
      }));

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null, onError })
      );

      // Fill form with valid data
      act(() => {
        result.current.setName('New Server');
        result.current.setCommand('new-command');
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.state.saving).toBe(false);
      expect(onError).toHaveBeenCalledWith(errorMessage);
    });

    it('should set loading state during save', async () => {
      let resolveSave: (value: void) => void;
      const savePromise = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
      const mockAddServer = jest.fn().mockReturnValue(savePromise);
      mockUseMcpStore.mockReturnValue(createMockStore({
        addServer: mockAddServer,
      }));

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      // Fill form with valid data
      act(() => {
        result.current.setName('New Server');
        result.current.setCommand('new-command');
      });

      act(() => {
        result.current.handleSave();
      });

      expect(result.current.state.saving).toBe(true);

      await act(async () => {
        resolveSave!();
        await savePromise;
      });

      expect(result.current.state.saving).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined store methods gracefully', () => {
      mockUseMcpStore.mockReturnValue({
        addServer: jest.fn(),
        updateServer: jest.fn(),
      } as unknown);

      const { result } = renderHook(() => 
        useMcpServerForm({ editingServer: null })
      );

      expect(() => {
        result.current.setName('test');
        result.current.setCommand('test');
      }).not.toThrow();
    });
  });
});
