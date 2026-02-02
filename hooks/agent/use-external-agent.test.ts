/**
 * @jest-environment jsdom
 */

/**
 * Tests for useExternalAgent hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useExternalAgent } from './use-external-agent';

// Mock the external agent manager with dynamic import mock
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockCreateSession = jest.fn();
const mockCloseSession = jest.fn().mockResolvedValue(undefined);
const mockExecute = jest.fn();
const mockCancel = jest.fn().mockResolvedValue(undefined);
const mockGetTools = jest.fn().mockReturnValue({});
const mockGetCapabilities = jest.fn().mockReturnValue({});
const mockIsConnected = jest.fn().mockReturnValue(false);
const mockRespondToPermission = jest.fn().mockResolvedValue(undefined);

const mockManager = {
  connect: mockConnect,
  disconnect: mockDisconnect,
  createSession: mockCreateSession,
  closeSession: mockCloseSession,
  execute: mockExecute,
  cancel: mockCancel,
  getTools: mockGetTools,
  getCapabilities: mockGetCapabilities,
  isConnected: mockIsConnected,
  respondToPermission: mockRespondToPermission,
};

jest.mock('@/lib/ai/agent/external/manager', () => ({
  getExternalAgentManager: () => mockManager,
}));

// Mock the external agent store
const mockAddAgent = jest.fn();
const mockRemoveAgent = jest.fn();
const mockGetAllAgents = jest.fn();
const mockGetAgent = jest.fn();
const mockSetConnectionStatus = jest.fn();
const mockGetConnectionStatus = jest.fn();

jest.mock('@/stores/agent/external-agent-store', () => ({
  useExternalAgentStore: () => ({
    addAgent: mockAddAgent,
    removeAgent: mockRemoveAgent,
    getAllAgents: mockGetAllAgents,
    getAgent: mockGetAgent,
    setConnectionStatus: mockSetConnectionStatus,
    getConnectionStatus: mockGetConnectionStatus,
    enabled: true,
  }),
}));

describe('useExternalAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllAgents.mockReturnValue([]);
    mockGetConnectionStatus.mockReturnValue('disconnected');
    mockIsConnected.mockReturnValue(false);
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useExternalAgent());

      expect(result.current.agents).toEqual([]);
      expect(result.current.activeAgentId).toBeNull();
      expect(result.current.activeSession).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isExecuting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.progress).toBe(0);
      expect(result.current.pendingPermission).toBeNull();
      expect(result.current.streamingResponse).toBe('');
      expect(result.current.lastResult).toBeNull();
    });
  });

  describe('setActiveAgent', () => {
    it('should set active agent', () => {
      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      expect(result.current.activeAgentId).toBe('agent-1');
    });

    it('should clear active agent with null', () => {
      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      act(() => {
        result.current.setActiveAgent(null);
      });

      expect(result.current.activeAgentId).toBeNull();
    });
  });

  describe('connect', () => {
    it('should call connect on manager', async () => {
      const { result } = renderHook(() => useExternalAgent());

      await act(async () => {
        await result.current.connect('agent-1');
      });

      expect(mockConnect).toHaveBeenCalledWith('agent-1');
    });

    it('should handle connection errors and set error state', async () => {
      const error = new Error('Connection failed');
      mockConnect.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useExternalAgent());

      await act(async () => {
        try {
          await result.current.connect('agent-1');
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBe('Connection failed');
    });
  });

  describe('disconnect', () => {
    it('should call disconnect on manager', async () => {
      const { result } = renderHook(() => useExternalAgent());

      await act(async () => {
        await result.current.disconnect('agent-1');
      });

      expect(mockDisconnect).toHaveBeenCalledWith('agent-1');
    });
  });

  describe('createSession', () => {
    it('should throw if no active agent', async () => {
      const { result } = renderHook(() => useExternalAgent());

      let thrownError: Error | undefined;
      await act(async () => {
        try {
          await result.current.createSession();
        } catch (e) {
          thrownError = e as Error;
        }
      });

      expect(thrownError?.message).toContain('No active agent');
    });

    it('should create session when active agent is set', async () => {
      const mockSession = {
        id: 'session-1',
        agentId: 'agent-1',
        status: 'active',
        createdAt: new Date(),
      };

      mockCreateSession.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      let session;
      await act(async () => {
        session = await result.current.createSession();
      });

      expect(session).toEqual(mockSession);
      expect(result.current.activeSession).toEqual(mockSession);
    });
  });

  describe('execute', () => {
    it('should execute a prompt and store result', async () => {
      const mockResult = {
        success: true,
        response: 'Test response',
      };

      mockExecute.mockResolvedValue(mockResult);
      mockCreateSession.mockResolvedValue({
        id: 'session-1',
        agentId: 'agent-1',
        status: 'active',
        createdAt: new Date(),
      });

      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      await act(async () => {
        await result.current.createSession();
      });

      let execResult;
      await act(async () => {
        execResult = await result.current.execute('Hello');
      });

      expect(execResult).toEqual(mockResult);
      expect(result.current.lastResult).toEqual(mockResult);
    });

    it('should set isExecuting during execution', async () => {
      let resolveExec: (value: unknown) => void;
      const execPromise = new Promise((resolve) => {
        resolveExec = resolve;
      });

      mockExecute.mockReturnValue(execPromise);
      mockCreateSession.mockResolvedValue({
        id: 'session-1',
        agentId: 'agent-1',
        status: 'active',
        createdAt: new Date(),
      });

      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      await act(async () => {
        await result.current.createSession();
      });

      // Start execution
      act(() => {
        result.current.execute('Hello');
      });

      await waitFor(() => {
        expect(result.current.isExecuting).toBe(true);
      });

      // Complete execution
      await act(async () => {
        resolveExec!({ success: true, response: 'Done' });
        await execPromise;
      });

      await waitFor(() => {
        expect(result.current.isExecuting).toBe(false);
      });
    });
  });

  describe('getAgentTools', () => {
    it('should return empty object by default', () => {
      const { result } = renderHook(() => useExternalAgent());

      const tools = result.current.getAgentTools('agent-1');
      expect(tools).toEqual({});
    });
  });

  describe('checkHealth', () => {
    it('should return false for unhealthy agent', async () => {
      mockIsConnected.mockReturnValue(false);

      const { result } = renderHook(() => useExternalAgent());

      let isHealthy;
      await act(async () => {
        isHealthy = await result.current.checkHealth('agent-1');
      });

      expect(isHealthy).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockConnect.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useExternalAgent());

      await act(async () => {
        try {
          await result.current.connect('agent-1');
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
