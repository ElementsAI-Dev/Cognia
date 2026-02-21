/**
 * useBackgroundAgent Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useBackgroundAgentStore } from '@/stores/agent';

// Mock the stores before importing the hook
jest.mock('@/stores/settings', () => ({
  useSettingsStore: jest.fn((selector) => {
    if (typeof selector !== 'function') return {};
    const state = {
      providerSettings: {
        openai: {
          apiKey: 'test-api-key',
          defaultModel: 'gpt-4o',
        },
      },
      defaultProvider: 'openai',
    };
    return selector(state);
  }),
}));
jest.mock('@/stores/chat', () => ({
  useSessionStore: jest.fn((selector) => {
    const state = {
      getActiveSession: () => ({ id: 'session-1' }),
    };
    return selector(state);
  }),
}));

jest.mock('@/stores/skills', () => ({
  useSkillStore: jest.fn((selector) => {
    const state = {
      skills: [],
      activeSkillIds: [],
    };
    return selector(state);
  }),
}));

jest.mock('@/stores/agent', () => ({
  useBackgroundAgentStore: jest.fn(),
}));

jest.mock('@/stores/mcp', () => ({
  useMcpStore: jest.fn((selector) => {
    const state = {
      servers: [],
      callTool: jest.fn(),
    };
    return selector(state);
  }),
}));

jest.mock('@/stores/data', () => ({
  useVectorStore: jest.fn((selector) => {
    const state = {
      settings: {},
    };
    return selector(state);
  }),
}));

jest.mock('@/lib/vector/embedding', () => ({
  resolveEmbeddingApiKey: jest.fn(() => 'test-api-key'),
}));

// Mock the background agent manager
const mockQueueState = {
  items: [],
  maxConcurrent: 3,
  currentlyRunning: 0,
  isPaused: false,
};

const mockManager = {
  createAgent: jest.fn((input: Record<string, unknown>) => ({
    id: (input.id as string | undefined) || 'managed-agent-1',
    sessionId: input.sessionId,
    name: input.name,
    description: input.description,
    task: input.task,
    status: 'idle',
    progress: 0,
    config: input.config || {},
    executionState: {
      currentStep: 0,
      totalSteps: 0,
      currentPhase: 'planning',
      activeSubAgents: [],
      completedSubAgents: [],
      failedSubAgents: [],
      pendingApprovals: [],
      lastActivity: new Date(),
    },
    subAgents: [],
    steps: [],
    logs: [],
    notifications: [],
    createdAt: new Date(),
    retryCount: 0,
    priority: input.priority || 5,
    tags: input.tags,
    metadata: input.metadata,
  })),
  getAgent: jest.fn(),
  hydrateAgent: jest.fn((agent: Record<string, unknown>, options?: { normalizeRunningToQueued?: boolean }) => ({
    ...agent,
    status:
      options?.normalizeRunningToQueued && agent.status === 'running'
        ? 'queued'
        : agent.status,
  })),
  getAllAgents: jest.fn(() => []),
  getQueueState: jest.fn(() => mockQueueState),
  queueAgent: jest.fn().mockReturnValue(false),
  startAgent: jest.fn().mockResolvedValue(true),
  updateAgent: jest.fn(),
  deleteAgent: jest.fn(),
  setProviders: jest.fn(),
  pauseAgent: jest.fn().mockReturnValue(false),
  resumeAgent: jest.fn().mockReturnValue(false),
  cancelAgent: jest.fn().mockReturnValue(false),
  cancelAllAgents: jest.fn().mockReturnValue(0),
  pauseQueue: jest.fn(),
  resumeQueue: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  clearCompleted: jest.fn(),
  delegateToTeam: jest.fn().mockResolvedValue('delegation-id'),
};

jest.mock('@/lib/ai/agent/background-agent-manager', () => ({
  BackgroundAgentManager: jest.fn(),
  createBackgroundAgentManager: jest.fn(() => mockManager),
  getBackgroundAgentManager: jest.fn(() => mockManager),
}));

// Import after mocks
import { useBackgroundAgent } from './use-background-agent';

describe('useBackgroundAgent', () => {
  const mockAgents: Record<string, unknown> = {};
  const mockQueue = {
    items: [],
    maxConcurrent: 3,
    currentlyRunning: 0,
    isPaused: false,
  };

  const mockCreateAgent = jest.fn((input) => {
    const agent = {
      id: 'agent-1',
      sessionId: input.sessionId,
      name: input.name,
      task: input.task,
      status: 'idle',
      progress: 0,
      config: input.config || {},
      executionState: {
        currentStep: 0,
        totalSteps: 0,
        currentPhase: 'planning',
        activeSubAgents: [],
        completedSubAgents: [],
        failedSubAgents: [],
        pendingApprovals: [],
        lastActivity: new Date(),
      },
      subAgents: [],
      steps: [],
      logs: [],
      notifications: [],
      createdAt: new Date(),
      retryCount: 0,
      priority: input.priority || 5,
    };
    mockAgents[agent.id] = agent;
    return agent;
  });

  const mockUpdateAgent = jest.fn();
  const mockDeleteAgent = jest.fn();
  const mockUpsertAgentSnapshot = jest.fn();
  const mockSyncQueueState = jest.fn();
  const mockSetAgentStatus = jest.fn();
  const mockQueueAgent = jest.fn();
  const mockDequeueAgent = jest.fn();
  const mockPauseQueue = jest.fn();
  const mockResumeQueue = jest.fn();
  const mockAddLog = jest.fn();
  const mockMarkNotificationRead = jest.fn();
  const mockMarkAllNotificationsRead = jest.fn();
  const mockGetAgent = jest.fn((id) => mockAgents[id]);
  const mockGetAgentsBySession = jest.fn().mockReturnValue([]);
  const mockGetUnreadNotificationCount = jest.fn().mockReturnValue(0);
  const mockCancelAllAgents = jest.fn();
  const mockClearCompletedAgents = jest.fn();
  const mockOpenPanel = jest.fn();
  const mockClosePanel = jest.fn();
  const mockTogglePanel = jest.fn();
  const mockSelectAgent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockAgents).forEach((key) => delete mockAgents[key]);

    (useBackgroundAgentStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        agents: mockAgents,
        queue: mockQueue,
        isPanelOpen: false,
        selectedAgentId: null,
        createAgent: mockCreateAgent,
        upsertAgentSnapshot: mockUpsertAgentSnapshot,
        syncQueueState: mockSyncQueueState,
        updateAgent: mockUpdateAgent,
        deleteAgent: mockDeleteAgent,
        setAgentStatus: mockSetAgentStatus,
        queueAgent: mockQueueAgent,
        dequeueAgent: mockDequeueAgent,
        pauseQueue: mockPauseQueue,
        resumeQueue: mockResumeQueue,
        addLog: mockAddLog,
        markNotificationRead: mockMarkNotificationRead,
        markAllNotificationsRead: mockMarkAllNotificationsRead,
        getAgent: mockGetAgent,
        getAgentsBySession: mockGetAgentsBySession,
        getUnreadNotificationCount: mockGetUnreadNotificationCount,
        cancelAllAgents: mockCancelAllAgents,
        clearCompletedAgents: mockClearCompletedAgents,
        openPanel: mockOpenPanel,
        closePanel: mockClosePanel,
        togglePanel: mockTogglePanel,
        selectAgent: mockSelectAgent,
      };
      if (typeof selector === 'function') {
        return selector(state);
      }
      return state;
    });
  });

  describe('initialization', () => {
    it('should initialize with empty agents', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      expect(result.current.agents).toEqual([]);
      expect(result.current.runningAgents).toEqual([]);
      expect(result.current.queuedAgents).toEqual([]);
      expect(result.current.completedAgents).toEqual([]);
      expect(result.current.selectedAgent).toBeNull();
      expect(result.current.isPanelOpen).toBe(false);
      expect(result.current.unreadNotificationCount).toBe(0);
    });

    it('should use provided sessionId', () => {
      const { result } = renderHook(() => useBackgroundAgent({ sessionId: 'custom-session' }));

      act(() => {
        result.current.createAgent({
          name: 'Test Agent',
          task: 'Test task',
        });
      });

      expect(mockManager.createAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'custom-session',
        })
      );
    });
  });

  describe('createAgent', () => {
    it('should create an agent with session ID', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.createAgent({
          name: 'Test Agent',
          task: 'Test task',
        });
      });

      expect(mockManager.createAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        })
      );
      expect(mockUpsertAgentSnapshot).toHaveBeenCalled();
    });
  });

  describe('updateAgent', () => {
    it('should call store updateAgent', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.updateAgent('agent-1', { name: 'Updated Name' });
      });

      expect(mockUpdateAgent).toHaveBeenCalledWith('agent-1', { name: 'Updated Name' });
      expect(mockManager.updateAgent).toHaveBeenCalledWith('agent-1', { name: 'Updated Name' });
    });
  });

  describe('deleteAgent', () => {
    it('should call store deleteAgent', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.deleteAgent('agent-1');
      });

      expect(mockDeleteAgent).toHaveBeenCalledWith('agent-1');
      expect(mockManager.deleteAgent).toHaveBeenCalledWith('agent-1');
    });
  });

  describe('queueAgent', () => {
    it('should queue an agent', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.queueAgent('agent-1');
      });

      expect(mockQueueAgent).toHaveBeenCalledWith('agent-1');
    });

    it('should not fallback to store queue when managed agent exists but manager rejects', () => {
      mockManager.getAgent.mockReturnValueOnce({
        id: 'agent-1',
        status: 'running',
      });
      mockManager.queueAgent.mockReturnValueOnce(false);

      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.queueAgent('agent-1');
      });

      expect(mockManager.queueAgent).toHaveBeenCalledWith('agent-1');
      expect(mockQueueAgent).not.toHaveBeenCalled();
    });

    it('hydrates store snapshot and normalizes running state before queueing', () => {
      const stored = mockCreateAgent({
        sessionId: 'session-1',
        name: 'Stored Agent',
        task: 'Task',
      }) as { id: string; status: string };
      stored.status = 'running';
      mockManager.getAgent.mockReturnValueOnce(undefined);
      mockManager.queueAgent.mockReturnValueOnce(true);

      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.queueAgent(stored.id);
      });

      expect(mockManager.hydrateAgent).toHaveBeenCalledWith(
        expect.objectContaining({ id: stored.id, status: 'running' }),
        { normalizeRunningToQueued: true }
      );
      expect(mockManager.queueAgent).toHaveBeenCalledWith(stored.id);
      expect(mockQueueAgent).not.toHaveBeenCalled();
    });
  });

  describe('startAgent', () => {
    it('hydrates store snapshot with running normalization before start', async () => {
      const stored = mockCreateAgent({
        sessionId: 'session-1',
        name: 'Stored Running Agent',
        task: 'Task',
      }) as { id: string; status: string };
      stored.status = 'running';
      mockManager.getAgent.mockReturnValueOnce(undefined);
      mockManager.startAgent.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useBackgroundAgent());

      await act(async () => {
        await result.current.startAgent(stored.id);
      });

      expect(mockManager.hydrateAgent).toHaveBeenCalledWith(
        expect.objectContaining({ id: stored.id, status: 'running' }),
        { normalizeRunningToQueued: true }
      );
      expect(mockManager.startAgent).toHaveBeenCalledWith(stored.id, {});
    });
  });

  describe('pauseAgent', () => {
    it('should pause an agent', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.pauseAgent('agent-1');
      });

      expect(mockSetAgentStatus).toHaveBeenCalledWith('agent-1', 'paused');
      expect(mockAddLog).toHaveBeenCalledWith('agent-1', 'info', 'Agent paused', 'system');
    });

    it('should not fallback to store status update when managed agent exists but manager rejects', () => {
      mockManager.getAgent.mockReturnValueOnce({
        id: 'agent-1',
        status: 'idle',
      });
      mockManager.pauseAgent.mockReturnValueOnce(false);

      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.pauseAgent('agent-1');
      });

      expect(mockManager.pauseAgent).toHaveBeenCalledWith('agent-1');
      expect(mockSetAgentStatus).not.toHaveBeenCalled();
      expect(mockAddLog).not.toHaveBeenCalled();
    });
  });

  describe('resumeAgent', () => {
    it('should resume an agent', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.resumeAgent('agent-1');
      });

      expect(mockSetAgentStatus).toHaveBeenCalledWith('agent-1', 'queued');
      expect(mockQueueAgent).toHaveBeenCalledWith('agent-1');
      expect(mockAddLog).toHaveBeenCalledWith('agent-1', 'info', 'Agent resumed', 'system');
    });

    it('should not fallback to store queueing when managed agent exists but manager rejects', () => {
      mockManager.getAgent.mockReturnValueOnce({
        id: 'agent-1',
        status: 'idle',
      });
      mockManager.resumeAgent.mockReturnValueOnce(false);

      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.resumeAgent('agent-1');
      });

      expect(mockManager.resumeAgent).toHaveBeenCalledWith('agent-1');
      expect(mockSetAgentStatus).not.toHaveBeenCalled();
      expect(mockQueueAgent).not.toHaveBeenCalled();
      expect(mockAddLog).not.toHaveBeenCalled();
    });

    it('hydrates paused store snapshot before manager resume', () => {
      const stored = mockCreateAgent({
        sessionId: 'session-1',
        name: 'Paused Stored Agent',
        task: 'Task',
      }) as { id: string; status: string };
      stored.status = 'paused';
      mockManager.getAgent.mockReturnValueOnce(undefined);
      mockManager.resumeAgent.mockReturnValueOnce(true);

      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.resumeAgent(stored.id);
      });

      expect(mockManager.hydrateAgent).toHaveBeenCalledWith(
        expect.objectContaining({ id: stored.id, status: 'paused' }),
        {}
      );
      expect(mockManager.resumeAgent).toHaveBeenCalledWith(stored.id);
      expect(mockSetAgentStatus).not.toHaveBeenCalled();
      expect(mockQueueAgent).not.toHaveBeenCalled();
    });
  });

  describe('cancelAgent', () => {
    it('should cancel an agent', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.cancelAgent('agent-1');
      });

      expect(mockSetAgentStatus).toHaveBeenCalledWith('agent-1', 'cancelled');
      expect(mockDequeueAgent).toHaveBeenCalledWith('agent-1');
      expect(mockAddLog).toHaveBeenCalledWith('agent-1', 'info', 'Agent cancelled', 'system');
    });

    it('should not fallback to store cancellation when managed agent exists but manager rejects', () => {
      mockManager.getAgent.mockReturnValueOnce({
        id: 'agent-1',
        status: 'completed',
      });
      mockManager.cancelAgent.mockReturnValueOnce(false);

      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.cancelAgent('agent-1');
      });

      expect(mockManager.cancelAgent).toHaveBeenCalledWith('agent-1');
      expect(mockSetAgentStatus).not.toHaveBeenCalled();
      expect(mockDequeueAgent).not.toHaveBeenCalled();
      expect(mockAddLog).not.toHaveBeenCalled();
    });
  });

  describe('cancelAll', () => {
    it('should cancel all agents', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.cancelAll();
      });

      expect(mockManager.cancelAllAgents).toHaveBeenCalled();
      expect(mockCancelAllAgents).toHaveBeenCalled();
    });
  });

  describe('queue management', () => {
    it('should pause queue', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.pauseQueue();
      });

      expect(mockManager.pauseQueue).toHaveBeenCalled();
      expect(mockPauseQueue).not.toHaveBeenCalled();
    });

    it('should resume queue', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.resumeQueue();
      });

      expect(mockManager.resumeQueue).toHaveBeenCalled();
      expect(mockResumeQueue).not.toHaveBeenCalled();
    });
  });

  describe('notifications', () => {
    it('should mark notification as read through manager when agent is managed', () => {
      mockManager.getAgent.mockReturnValueOnce({
        id: 'agent-1',
      });

      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.markNotificationRead('agent-1', 'notification-1');
      });

      expect(mockManager.markNotificationRead).toHaveBeenCalledWith('agent-1', 'notification-1');
      expect(mockMarkNotificationRead).not.toHaveBeenCalled();
    });

    it('should fallback to store notification update when agent cannot be managed', () => {
      mockManager.getAgent.mockReturnValueOnce(undefined);

      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.markNotificationRead('agent-1', 'notification-1');
      });

      expect(mockMarkNotificationRead).toHaveBeenCalledWith('agent-1', 'notification-1');
      expect(mockManager.markNotificationRead).not.toHaveBeenCalled();
    });

    it('should mark all notifications as read', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.markAllNotificationsRead();
      });

      expect(mockManager.markAllNotificationsRead).toHaveBeenCalled();
      expect(mockMarkAllNotificationsRead).not.toHaveBeenCalled();
    });
  });

  describe('UI actions', () => {
    it('should open panel', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.openPanel();
      });

      expect(mockOpenPanel).toHaveBeenCalled();
    });

    it('should close panel', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.closePanel();
      });

      expect(mockClosePanel).toHaveBeenCalled();
    });

    it('should toggle panel', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.togglePanel();
      });

      expect(mockTogglePanel).toHaveBeenCalled();
    });

    it('should select agent', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.selectAgent('agent-1');
      });

      expect(mockSelectAgent).toHaveBeenCalledWith('agent-1');
    });
  });

  describe('clearCompleted', () => {
    it('should clear completed agents', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.clearCompleted();
      });

      expect(mockClearCompletedAgents).toHaveBeenCalled();
    });
  });

  describe('computed values', () => {
    it('should filter running agents', () => {
      mockGetAgentsBySession.mockReturnValue([
        { id: '1', status: 'running', progress: 50 },
        { id: '2', status: 'idle', progress: 0 },
        { id: '3', status: 'running', progress: 30 },
      ]);

      const { result } = renderHook(() => useBackgroundAgent());

      expect(result.current.runningAgents).toHaveLength(2);
    });

    it('should filter queued agents', () => {
      mockGetAgentsBySession.mockReturnValue([
        { id: '1', status: 'queued', progress: 0 },
        { id: '2', status: 'running', progress: 50 },
        { id: '3', status: 'queued', progress: 0 },
      ]);

      const { result } = renderHook(() => useBackgroundAgent());

      expect(result.current.queuedAgents).toHaveLength(2);
    });

    it('should filter completed agents', () => {
      mockGetAgentsBySession.mockReturnValue([
        { id: '1', status: 'completed', progress: 100 },
        { id: '2', status: 'failed', progress: 30 },
        { id: '3', status: 'cancelled', progress: 20 },
        { id: '4', status: 'running', progress: 50 },
      ]);

      const { result } = renderHook(() => useBackgroundAgent());

      expect(result.current.completedAgents).toHaveLength(3);
    });

    it('should compute queue state', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      expect(result.current.queueState).toEqual({
        items: 0,
        maxConcurrent: 3,
        currentlyRunning: 0,
        isPaused: false,
      });
    });
  });
});
