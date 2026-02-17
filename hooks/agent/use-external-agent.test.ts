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
const mockExecuteStreaming = jest.fn();
const mockCancel = jest.fn().mockResolvedValue(undefined);
const mockGetTools = jest.fn().mockReturnValue({});
const mockGetCapabilities = jest.fn().mockReturnValue({});
const mockIsConnected = jest.fn().mockReturnValue(false);
const mockRespondToPermission = jest.fn().mockResolvedValue(undefined);
const mockManagerGetAllAgents = jest.fn().mockReturnValue([]);
const mockAddEventListener = jest.fn().mockReturnValue(() => {});
const mockGetSession = jest.fn();
const mockSetSessionMode = jest.fn().mockResolvedValue(undefined);
const mockSetSessionModel = jest.fn().mockResolvedValue(undefined);
const mockGetSessionModels = jest.fn().mockReturnValue(undefined);
const mockGetAuthMethods = jest.fn().mockReturnValue([]);
const mockIsAuthenticationRequired = jest.fn().mockReturnValue(false);
const mockAuthenticate = jest.fn().mockResolvedValue(undefined);
const mockListSessions = jest.fn().mockResolvedValue([]);
const mockForkSession = jest.fn();
const mockResumeSession = jest.fn();

const mockManager = {
  connect: mockConnect,
  disconnect: mockDisconnect,
  createSession: mockCreateSession,
  closeSession: mockCloseSession,
  execute: mockExecute,
  executeStreaming: mockExecuteStreaming,
  cancel: mockCancel,
  getTools: mockGetTools,
  getCapabilities: mockGetCapabilities,
  isConnected: mockIsConnected,
  respondToPermission: mockRespondToPermission,
  getAllAgents: mockManagerGetAllAgents,
  addEventListener: mockAddEventListener,
  getSession: mockGetSession,
  setSessionMode: mockSetSessionMode,
  setSessionModel: mockSetSessionModel,
  getSessionModels: mockGetSessionModels,
  getAuthMethods: mockGetAuthMethods,
  isAuthenticationRequired: mockIsAuthenticationRequired,
  authenticate: mockAuthenticate,
  listSessions: mockListSessions,
  forkSession: mockForkSession,
  resumeSession: mockResumeSession,
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

  describe('plan/commands updates', () => {
    it('should update available commands and plan entries from events', async () => {
      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalled();
      });

      const listener = mockAddEventListener.mock.calls[0][1] as (event: unknown) => void;

      act(() => {
        listener({ type: 'commands_update', commands: [{ name: 'foo', description: 'Foo' }] });
      });

      expect(result.current.availableCommands).toEqual([
        { name: 'foo', description: 'Foo' },
      ]);

      act(() => {
        listener({
          type: 'plan_update',
          entries: [{ content: 'Step 1', priority: 'high', status: 'in_progress' }],
          step: 0,
        });
      });

      expect(result.current.planEntries).toEqual([
        { content: 'Step 1', priority: 'high', status: 'in_progress' },
      ]);
      expect(result.current.planStep).toBe(0);
    });

    it('should update config options and mode from events', async () => {
      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalled();
      });

      const listener = mockAddEventListener.mock.calls[0][1] as (event: unknown) => void;

      act(() => {
        listener({
          type: 'config_options_update',
          configOptions: [
            {
              id: 'mode',
              category: 'mode',
              type: 'select',
              name: 'Mode',
              currentValue: 'default',
              options: [{ value: 'default', name: 'Default' }, { value: 'plan', name: 'Plan' }],
            },
          ],
        });
      });

      expect(result.current.configOptions[0]?.currentValue).toBe('default');

      act(() => {
        listener({ type: 'mode_update', modeId: 'plan' });
      });

      expect(result.current.configOptions[0]?.currentValue).toBe('plan');
    });
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
      expect(result.current.availableCommands).toEqual([]);
      expect(result.current.planEntries).toEqual([]);
      expect(result.current.planStep).toBeNull();
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

  describe('session settings', () => {
    const mockSession = {
      id: 'session-1',
      agentId: 'agent-1',
      status: 'active',
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockCreateSession.mockResolvedValue(mockSession);
    });

    it('should call setSessionMode on manager', async () => {
      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      await act(async () => {
        await result.current.createSession();
      });

      await act(async () => {
        await result.current.setSessionMode('plan');
      });

      expect(mockSetSessionMode).toHaveBeenCalledWith('agent-1', 'session-1', 'plan');
    });

    it('should call setSessionModel on manager', async () => {
      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      await act(async () => {
        await result.current.createSession();
      });

      await act(async () => {
        await result.current.setSessionModel('model-1');
      });

      expect(mockSetSessionModel).toHaveBeenCalledWith('agent-1', 'session-1', 'model-1');
    });

    it('should read session models from manager', async () => {
      const models = { availableModels: [{ modelId: 'model-1', name: 'Model 1' }] };
      mockGetSessionModels.mockReturnValue(models);

      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      await act(async () => {
        await result.current.createSession();
      });

      expect(result.current.getSessionModels()).toEqual(models);
    });
  });

  describe('session extensions', () => {
    const mockSession = {
      id: 'session-1',
      agentId: 'agent-1',
      status: 'active',
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockCreateSession.mockResolvedValue(mockSession);
      mockForkSession.mockResolvedValue({ ...mockSession, id: 'session-2' });
      mockResumeSession.mockResolvedValue(mockSession);
      mockListSessions.mockResolvedValue([{ sessionId: 'session-1', title: 'Session 1' }]);
    });

    it('should list sessions for active agent', async () => {
      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      await act(async () => {
        const sessions = await result.current.listSessions();
        expect(sessions).toEqual([{ sessionId: 'session-1', title: 'Session 1' }]);
      });

      expect(mockListSessions).toHaveBeenCalledWith('agent-1');
    });

    it('should return empty session list when no agent is selected', async () => {
      const { result } = renderHook(() => useExternalAgent());

      await act(async () => {
        const sessions = await result.current.listSessions();
        expect(sessions).toEqual([]);
      });

      expect(mockListSessions).not.toHaveBeenCalled();
    });

    it('should allow listing sessions for explicit agent id', async () => {
      const { result } = renderHook(() => useExternalAgent());

      await act(async () => {
        const sessions = await result.current.listSessions('agent-explicit');
        expect(sessions).toEqual([{ sessionId: 'session-1', title: 'Session 1' }]);
      });

      expect(mockListSessions).toHaveBeenCalledWith('agent-explicit');
    });

    it('should fork session and set active session', async () => {
      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      await act(async () => {
        const session = await result.current.forkSession('session-1');
        expect(session.id).toBe('session-2');
      });

      expect(mockForkSession).toHaveBeenCalledWith('agent-1', 'session-1');
      expect(result.current.activeSession?.id).toBe('session-2');
    });

    it('should resume session and set active session', async () => {
      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      await act(async () => {
        const session = await result.current.resumeSession('session-1');
        expect(session.id).toBe('session-1');
      });

      expect(mockResumeSession).toHaveBeenCalledWith('agent-1', 'session-1', {
        systemPrompt: undefined,
      });
      expect(result.current.activeSession?.id).toBe('session-1');
    });
  });

  describe('auth helpers', () => {
    it('should expose auth methods and requirements', async () => {
      mockGetAuthMethods.mockReturnValue([{ id: 'token', label: 'Token' }]);
      mockIsAuthenticationRequired.mockReturnValue(true);

      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      await act(async () => {
        await result.current.connect('agent-1');
      });

      expect(result.current.getAuthMethods()).toEqual([{ id: 'token', label: 'Token' }]);
      expect(result.current.isAuthenticationRequired()).toBe(true);
    });

    it('should call authenticate on manager', async () => {
      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      await act(async () => {
        await result.current.authenticate('token', { value: 'abc' });
      });

      expect(mockAuthenticate).toHaveBeenCalledWith('agent-1', 'token', { value: 'abc' });
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

    it('should keep ACP permission options and resolve with optionId', async () => {
      const permissionRequest = {
        id: 'req-1',
        requestId: 'req-1',
        sessionId: 'session-1',
        toolInfo: { id: 'tool-1', name: 'write_file' },
        options: [
          { optionId: 'allow_once', name: 'Allow once', kind: 'allow_once', isDefault: true },
          { optionId: 'reject_once', name: 'Reject once', kind: 'reject_once' },
        ],
      };

      mockExecute.mockImplementationOnce(async (_agentId: string, _prompt: string, options?: { onPermissionRequest?: (request: unknown) => Promise<unknown> }) => {
        if (options?.onPermissionRequest) {
          await options.onPermissionRequest(permissionRequest);
        }
        return { success: true, response: 'ok' };
      });

      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      const executePromise = result.current.execute('hello');

      await waitFor(() => {
        expect(result.current.pendingPermission?.options?.[0].optionId).toBe('allow_once');
      });

      await act(async () => {
        await result.current.respondToPermission({
          requestId: 'req-1',
          granted: true,
          optionId: 'allow_once',
        });
      });

      await expect(executePromise).resolves.toEqual({ success: true, response: 'ok' });
    });
  });

  describe('respondToPermission', () => {
    it('should call manager.respondToPermission when handling streaming permission requests', async () => {
      async function* stream() {
        yield {
          type: 'permission_request',
          sessionId: 'session-1',
          request: {
            id: 'req-stream',
            requestId: 'req-stream',
            sessionId: 'session-1',
            toolInfo: { id: 'tool-1', name: 'write_file' },
            options: [{ optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' }],
          },
        };
      }

      mockExecuteStreaming.mockImplementation(stream);
      const { result } = renderHook(() => useExternalAgent());

      act(() => {
        result.current.setActiveAgent('agent-1');
      });

      const iterator = result.current.executeStreaming('hello');
      await act(async () => {
        await iterator[Symbol.asyncIterator]().next();
      });

      expect(result.current.pendingPermission?.requestId).toBe('req-stream');

      await act(async () => {
        await result.current.respondToPermission({
          requestId: 'req-stream',
          granted: true,
          optionId: 'allow_once',
        });
      });

      await act(async () => {
        await iterator[Symbol.asyncIterator]().return?.(undefined);
      });

      expect(mockRespondToPermission).toHaveBeenCalledWith('agent-1', 'session-1', {
        requestId: 'req-stream',
        granted: true,
        optionId: 'allow_once',
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
