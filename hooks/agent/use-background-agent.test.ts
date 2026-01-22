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

// Mock the background agent manager
const mockManager = {
  createAgent: jest.fn(() => ({ id: 'managed-agent-1' })),
  startAgent: jest.fn().mockResolvedValue(undefined),
  setProviders: jest.fn(),
  pauseAgent: jest.fn(),
  resumeAgent: jest.fn(),
  cancelAgent: jest.fn(),
  cancelAll: jest.fn(),
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
  const mockSetAgentStatus = jest.fn();
  const mockSetAgentProgress = jest.fn();
  const mockSetAgentResult = jest.fn();
  const mockSetAgentError = jest.fn();
  const mockQueueAgent = jest.fn();
  const mockDequeueAgent = jest.fn();
  const mockPauseQueue = jest.fn();
  const mockResumeQueue = jest.fn();
  const mockAddStep = jest.fn();
  const mockAddLog = jest.fn();
  const mockAddNotification = jest.fn();
  const mockMarkNotificationRead = jest.fn();
  const mockMarkAllNotificationsRead = jest.fn();
  const mockAddSubAgent = jest.fn();
  const mockUpdateSubAgent = jest.fn();
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
        updateAgent: mockUpdateAgent,
        deleteAgent: mockDeleteAgent,
        setAgentStatus: mockSetAgentStatus,
        setAgentProgress: mockSetAgentProgress,
        setAgentResult: mockSetAgentResult,
        setAgentError: mockSetAgentError,
        queueAgent: mockQueueAgent,
        dequeueAgent: mockDequeueAgent,
        pauseQueue: mockPauseQueue,
        resumeQueue: mockResumeQueue,
        addStep: mockAddStep,
        addLog: mockAddLog,
        addNotification: mockAddNotification,
        markNotificationRead: mockMarkNotificationRead,
        markAllNotificationsRead: mockMarkAllNotificationsRead,
        addSubAgent: mockAddSubAgent,
        updateSubAgent: mockUpdateSubAgent,
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

      expect(mockCreateAgent).toHaveBeenCalledWith(
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

      expect(mockCreateAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          name: 'Test Agent',
          task: 'Test task',
        })
      );
    });
  });

  describe('updateAgent', () => {
    it('should call store updateAgent', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.updateAgent('agent-1', { name: 'Updated Name' });
      });

      expect(mockUpdateAgent).toHaveBeenCalledWith('agent-1', { name: 'Updated Name' });
    });
  });

  describe('deleteAgent', () => {
    it('should call store deleteAgent', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.deleteAgent('agent-1');
      });

      expect(mockDeleteAgent).toHaveBeenCalledWith('agent-1');
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
  });

  describe('cancelAll', () => {
    it('should cancel all agents', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.cancelAll();
      });

      expect(mockCancelAllAgents).toHaveBeenCalled();
    });
  });

  describe('queue management', () => {
    it('should pause queue', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.pauseQueue();
      });

      expect(mockPauseQueue).toHaveBeenCalled();
    });

    it('should resume queue', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.resumeQueue();
      });

      expect(mockResumeQueue).toHaveBeenCalled();
    });
  });

  describe('notifications', () => {
    it('should mark notification as read', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.markNotificationRead('agent-1', 'notification-1');
      });

      expect(mockMarkNotificationRead).toHaveBeenCalledWith('agent-1', 'notification-1');
    });

    it('should mark all notifications as read', () => {
      const { result } = renderHook(() => useBackgroundAgent());

      act(() => {
        result.current.markAllNotificationsRead();
      });

      expect(mockMarkAllNotificationsRead).toHaveBeenCalled();
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
