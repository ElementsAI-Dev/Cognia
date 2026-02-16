/**
 * Tests for useMcpServerActions hook
 */

import { renderHook, act } from '@testing-library/react';
import { useMcpServerActions } from './use-mcp-server-actions';
import { useMcpStore } from '@/stores/mcp';
import { toast } from 'sonner';
import type { McpServerState } from '@/types/mcp';

// Mock the MCP store
jest.mock('@/stores/mcp', () => ({
  useMcpStore: jest.fn(),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

const mockUseMcpStore = useMcpStore as jest.MockedFunction<typeof useMcpStore>;
const mockToast = toast as unknown as {
  error: jest.Mock;
  success: jest.Mock;
  warning: jest.Mock;
};

describe('useMcpServerActions', () => {
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

  const createMockStore = (overrides: Record<string, unknown> = {}) => ({
    connectServer: jest.fn(),
    disconnectServer: jest.fn(),
    removeServer: jest.fn(),
    updateServer: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.error.mockClear();
    mockToast.success.mockClear();
    mockToast.warning.mockClear();
  });

  describe('initial state', () => {
    it('should initialize with default values', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpServerActions());

      expect(result.current.actionLoading).toBeNull();
      expect(result.current.removeConfirmId).toBeNull();
      expect(typeof result.current.handleConnect).toBe('function');
      expect(typeof result.current.handleDisconnect).toBe('function');
      expect(typeof result.current.handleRemove).toBe('function');
      expect(typeof result.current.confirmRemove).toBe('function');
      expect(typeof result.current.cancelRemove).toBe('function');
      expect(typeof result.current.handleToggleEnabled).toBe('function');
    });
  });

  describe('handleConnect', () => {
    it('should connect server successfully', async () => {
      const mockConnectServer = jest.fn().mockResolvedValue(undefined);
      mockUseMcpStore.mockReturnValue(createMockStore({
        connectServer: mockConnectServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      await act(async () => {
        await result.current.handleConnect('test-server');
      });

      expect(mockConnectServer).toHaveBeenCalledWith('test-server');
      expect(result.current.actionLoading).toBeNull();
    });

    it('should set loading state during connection', async () => {
      let resolveConnect: (value: void) => void;
      const connectPromise = new Promise<void>((resolve) => {
        resolveConnect = resolve;
      });
      const mockConnectServer = jest.fn().mockReturnValue(connectPromise);
      mockUseMcpStore.mockReturnValue(createMockStore({
        connectServer: mockConnectServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      act(() => {
        result.current.handleConnect('test-server');
      });

      expect(result.current.actionLoading).toBe('test-server');

      await act(async () => {
        resolveConnect!();
        await connectPromise;
      });

      expect(result.current.actionLoading).toBeNull();
    });

    it('should handle connection errors and show toast', async () => {
      const errorMessage = 'Connection failed';
      const mockConnectServer = jest.fn().mockRejectedValue(new Error(errorMessage));

      mockUseMcpStore.mockReturnValue(createMockStore({
        connectServer: mockConnectServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      await act(async () => {
        await result.current.handleConnect('test-server');
      });

      expect(mockConnectServer).toHaveBeenCalledWith('test-server');
      expect(result.current.actionLoading).toBeNull();
      expect(mockToast.error).toHaveBeenCalledWith('Failed to connect', {
        description: errorMessage,
      });
    });

    it('should handle multiple concurrent connections', async () => {
      const mockConnectServer = jest.fn().mockResolvedValue(undefined);
      mockUseMcpStore.mockReturnValue(createMockStore({
        connectServer: mockConnectServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      const promises = [
        result.current.handleConnect('server-1'),
        result.current.handleConnect('server-2'),
        result.current.handleConnect('server-3'),
      ];

      await act(async () => {
        await Promise.all(promises);
      });

      expect(mockConnectServer).toHaveBeenCalledTimes(3);
      expect(mockConnectServer).toHaveBeenCalledWith('server-1');
      expect(mockConnectServer).toHaveBeenCalledWith('server-2');
      expect(mockConnectServer).toHaveBeenCalledWith('server-3');
    });
  });

  describe('handleDisconnect', () => {
    it('should disconnect server successfully', async () => {
      const mockDisconnectServer = jest.fn().mockResolvedValue(undefined);
      mockUseMcpStore.mockReturnValue(createMockStore({
        disconnectServer: mockDisconnectServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      await act(async () => {
        await result.current.handleDisconnect('test-server');
      });

      expect(mockDisconnectServer).toHaveBeenCalledWith('test-server');
      expect(result.current.actionLoading).toBeNull();
    });

    it('should set loading state during disconnection', async () => {
      let resolveDisconnect: (value: void) => void;
      const disconnectPromise = new Promise<void>((resolve) => {
        resolveDisconnect = resolve;
      });
      const mockDisconnectServer = jest.fn().mockReturnValue(disconnectPromise);
      mockUseMcpStore.mockReturnValue(createMockStore({
        disconnectServer: mockDisconnectServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      act(() => {
        result.current.handleDisconnect('test-server');
      });

      expect(result.current.actionLoading).toBe('test-server');

      await act(async () => {
        resolveDisconnect!();
        await disconnectPromise;
      });

      expect(result.current.actionLoading).toBeNull();
    });

    it('should handle disconnection errors and show toast', async () => {
      const errorMessage = 'Disconnection failed';
      const mockDisconnectServer = jest.fn().mockRejectedValue(new Error(errorMessage));

      mockUseMcpStore.mockReturnValue(createMockStore({
        disconnectServer: mockDisconnectServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      await act(async () => {
        await result.current.handleDisconnect('test-server');
      });

      expect(mockDisconnectServer).toHaveBeenCalledWith('test-server');
      expect(result.current.actionLoading).toBeNull();
      expect(mockToast.error).toHaveBeenCalledWith('Failed to disconnect', {
        description: errorMessage,
      });
    });
  });

  describe('handleRemove', () => {
    it('should set removeConfirmId when handleRemove is called', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpServerActions());

      act(() => {
        result.current.handleRemove('test-server');
      });

      expect(result.current.removeConfirmId).toBe('test-server');
    });

    it('should handle multiple remove calls', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpServerActions());

      act(() => {
        result.current.handleRemove('server-1');
        result.current.handleRemove('server-2');
      });

      expect(result.current.removeConfirmId).toBe('server-2');
    });
  });

  describe('confirmRemove', () => {
    it('should remove server and clear confirmId', async () => {
      const mockRemoveServer = jest.fn().mockResolvedValue(undefined);
      mockUseMcpStore.mockReturnValue(createMockStore({
        removeServer: mockRemoveServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      // First set the confirmId
      act(() => {
        result.current.handleRemove('test-server');
      });

      expect(result.current.removeConfirmId).toBe('test-server');

      // Then confirm removal
      await act(async () => {
        await result.current.confirmRemove();
      });

      expect(mockRemoveServer).toHaveBeenCalledWith('test-server');
      expect(result.current.removeConfirmId).toBeNull();
    });

    it('should handle removal errors and show toast', async () => {
      const errorMessage = 'Removal failed';
      const mockRemoveServer = jest.fn().mockRejectedValue(new Error(errorMessage));

      mockUseMcpStore.mockReturnValue(createMockStore({
        removeServer: mockRemoveServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      act(() => {
        result.current.handleRemove('test-server');
      });

      await act(async () => {
        await result.current.confirmRemove();
      });

      expect(mockRemoveServer).toHaveBeenCalledWith('test-server');
      expect(result.current.removeConfirmId).toBeNull();
      expect(mockToast.error).toHaveBeenCalledWith('Failed to remove server', {
        description: errorMessage,
      });
    });

    it('should do nothing if removeConfirmId is null', async () => {
      const mockRemoveServer = jest.fn();
      mockUseMcpStore.mockReturnValue(createMockStore({
        removeServer: mockRemoveServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      await act(async () => {
        await result.current.confirmRemove();
      });

      expect(mockRemoveServer).not.toHaveBeenCalled();
    });
  });

  describe('cancelRemove', () => {
    it('should clear removeConfirmId', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpServerActions());

      act(() => {
        result.current.handleRemove('test-server');
      });

      expect(result.current.removeConfirmId).toBe('test-server');

      act(() => {
        result.current.cancelRemove();
      });

      expect(result.current.removeConfirmId).toBeNull();
    });

    it('should do nothing if removeConfirmId is already null', () => {
      mockUseMcpStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpServerActions());

      act(() => {
        result.current.cancelRemove();
      });

      expect(result.current.removeConfirmId).toBeNull();
    });
  });

  describe('handleToggleEnabled', () => {
    it('should toggle server enabled state', async () => {
      const mockUpdateServer = jest.fn().mockResolvedValue(undefined);
      mockUseMcpStore.mockReturnValue(createMockStore({
        updateServer: mockUpdateServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      await act(async () => {
        await result.current.handleToggleEnabled(mockServer);
      });

      expect(mockUpdateServer).toHaveBeenCalledWith(mockServer.id, {
        ...mockServer.config,
        enabled: !mockServer.config.enabled,
      });
    });

    it('should handle toggle errors and show toast', async () => {
      const errorMessage = 'Toggle failed';
      const mockUpdateServer = jest.fn().mockRejectedValue(new Error(errorMessage));

      mockUseMcpStore.mockReturnValue(createMockStore({
        updateServer: mockUpdateServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      await act(async () => {
        await result.current.handleToggleEnabled(mockServer);
      });

      expect(mockUpdateServer).toHaveBeenCalledWith(mockServer.id, {
        ...mockServer.config,
        enabled: !mockServer.config.enabled,
      });
      expect(mockToast.error).toHaveBeenCalledWith('Failed to toggle server', {
        description: errorMessage,
      });
    });

    it('should toggle from enabled to disabled', async () => {
      const enabledServer = {
        ...mockServer,
        config: { ...mockServer.config, enabled: true },
      };
      const mockUpdateServer = jest.fn().mockResolvedValue(undefined);
      mockUseMcpStore.mockReturnValue(createMockStore({
        updateServer: mockUpdateServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      await act(async () => {
        await result.current.handleToggleEnabled(enabledServer);
      });

      expect(mockUpdateServer).toHaveBeenCalledWith(enabledServer.id, {
        ...enabledServer.config,
        enabled: false,
      });
    });

    it('should toggle from disabled to enabled', async () => {
      const disabledServer = {
        ...mockServer,
        config: { ...mockServer.config, enabled: false },
      };
      const mockUpdateServer = jest.fn().mockResolvedValue(undefined);
      mockUseMcpStore.mockReturnValue(createMockStore({
        updateServer: mockUpdateServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      await act(async () => {
        await result.current.handleToggleEnabled(disabledServer);
      });

      expect(mockUpdateServer).toHaveBeenCalledWith(disabledServer.id, {
        ...disabledServer.config,
        enabled: true,
      });
    });
  });

  describe('loading state management', () => {
    it('should not interfere with different action types', async () => {
      const mockConnectServer = jest.fn().mockResolvedValue(undefined);
      const mockDisconnectServer = jest.fn().mockResolvedValue(undefined);
      mockUseMcpStore.mockReturnValue(createMockStore({
        connectServer: mockConnectServer,
        disconnectServer: mockDisconnectServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      // Start connection
      act(() => {
        result.current.handleConnect('server-1');
      });

      expect(result.current.actionLoading).toBe('server-1');

      // Start disconnection of different server
      act(() => {
        result.current.handleDisconnect('server-2');
      });

      // Connection should finish first
      await act(async () => {
        await mockConnectServer.mock.results[0].value;
      });

      expect(mockConnectServer).toHaveBeenCalledWith('server-1');
      expect(mockDisconnectServer).toHaveBeenCalledWith('server-2');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined store methods gracefully', () => {
      mockUseMcpStore.mockReturnValue({
        connectServer: undefined,
        disconnectServer: undefined,
        removeServer: undefined,
        updateServer: undefined,
      } as unknown);

      const { result } = renderHook(() => useMcpServerActions());

      expect(() => {
        act(() => {
          result.current.handleConnect('test');
          result.current.handleDisconnect('test');
          result.current.handleRemove('test');
          result.current.confirmRemove();
          result.current.cancelRemove();
          result.current.handleToggleEnabled(mockServer);
        });
      }).not.toThrow();
    });

    it('should handle null/undefined server IDs', async () => {
      const mockConnectServer = jest.fn();
      mockUseMcpStore.mockReturnValue(createMockStore({
        connectServer: mockConnectServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      await act(async () => {
        await result.current.handleConnect(null as unknown as string);
        await result.current.handleConnect(undefined as unknown as string);
      });

      expect(mockConnectServer).toHaveBeenCalledWith(null);
      expect(mockConnectServer).toHaveBeenCalledWith(undefined);
    });

    it('should handle null/undefined server in toggle', async () => {
      const mockUpdateServer = jest.fn();
      mockUseMcpStore.mockReturnValue(createMockStore({
        updateServer: mockUpdateServer,
      }));

      const { result } = renderHook(() => useMcpServerActions());

      expect(() => {
        act(() => {
          result.current.handleToggleEnabled(null as unknown as McpServerState);
          result.current.handleToggleEnabled(undefined as unknown as McpServerState);
        });
      }).not.toThrow();
    });
  });
});
