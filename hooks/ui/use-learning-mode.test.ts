/**
 * useLearningMode Hook Tests
 * 
 * Unit tests for the learning mode React hook.
 */

import { renderHook, act } from '@testing-library/react';
import { useLearningMode, useIsLearningMode } from './use-learning-mode';
import { useLearningStore } from '@/stores/learning';
import { useSessionStore } from '@/stores/chat';

// Mock the stores
jest.mock('@/stores/learning');
jest.mock('@/stores/chat');

const mockUseLearningStore = useLearningStore as jest.MockedFunction<typeof useLearningStore>;
const mockUseSessionStore = useSessionStore as jest.MockedFunction<typeof useSessionStore>;

describe('useLearningMode', () => {
  const mockLearningStore = {
    sessions: {},
    activeSessionId: null,
    config: {
      maxHintsPerQuestion: 3,
      hintDelayMessages: 2,
      enableProgressiveHints: true,
      enableEncouragement: true,
      autoGenerateSummary: true,
      includeKeyTakeaways: true,
    },
    isLoading: false,
    error: null,
    startLearningSession: jest.fn(),
    endLearningSession: jest.fn(),
    getLearningSession: jest.fn(),
    getLearningSessionByChat: jest.fn(),
    setActiveSession: jest.fn(),
    deleteLearningSession: jest.fn(),
    advancePhase: jest.fn(),
    setPhase: jest.fn(),
    getCurrentPhase: jest.fn(),
    addSubQuestion: jest.fn(),
    updateSubQuestion: jest.fn(),
    setCurrentSubQuestion: jest.fn(),
    markSubQuestionResolved: jest.fn(),
    addHintToSubQuestion: jest.fn(),
    incrementAttempts: jest.fn(),
    addLearningGoal: jest.fn(),
    markGoalAchieved: jest.fn(),
    updateGoals: jest.fn(),
    updateProgress: jest.fn(),
    getProgress: jest.fn(),
    updateTopic: jest.fn(),
    updateBackgroundKnowledge: jest.fn(),
    updateConfig: jest.fn(),
    resetConfig: jest.fn(),
    setError: jest.fn(),
    clearError: jest.fn(),
    reset: jest.fn(),
  };

  const mockSessionStore = {
    activeSessionId: 'session-1',
    sessions: [],
    getActiveSession: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLearningStore.mockReturnValue(mockLearningStore);
    mockUseSessionStore.mockReturnValue(mockSessionStore as ReturnType<typeof useSessionStore>);
  });

  describe('State', () => {
    it('should return undefined learning session when no active session', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningMode());

      expect(result.current.learningSession).toBeUndefined();
      expect(result.current.isLearningActive).toBe(false);
    });

    it('should return learning session when active', () => {
      const mockSession = {
        id: 'learning-1',
        sessionId: 'session-1',
        topic: 'Test Topic',
        currentPhase: 'questioning' as const,
        progress: 50,
        subQuestions: [],
        learningGoals: [],
        totalHintsProvided: 0,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      mockLearningStore.getLearningSessionByChat.mockReturnValue(mockSession);

      const { result } = renderHook(() => useLearningMode());

      expect(result.current.learningSession).toEqual(mockSession);
      expect(result.current.isLearningActive).toBe(true);
      expect(result.current.currentPhase).toBe('questioning');
      expect(result.current.progress).toBe(50);
    });

    it('should return config from store', () => {
      const { result } = renderHook(() => useLearningMode());

      expect(result.current.config).toEqual(mockLearningStore.config);
    });
  });

  describe('Session Management', () => {
    it('should call startLearningSession with correct parameters', () => {
      const mockSession = {
        id: 'learning-1',
        sessionId: 'session-1',
        topic: 'Test Topic',
        currentPhase: 'clarification' as const,
        progress: 0,
        subQuestions: [],
        learningGoals: [],
        totalHintsProvided: 0,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      mockLearningStore.startLearningSession.mockReturnValue(mockSession);

      const { result } = renderHook(() => useLearningMode());

      act(() => {
        result.current.startLearning({
          topic: 'Test Topic',
          learningGoals: ['Goal 1'],
        });
      });

      expect(mockLearningStore.startLearningSession).toHaveBeenCalledWith(
        'session-1',
        { topic: 'Test Topic', learningGoals: ['Goal 1'] }
      );
    });

    it('should throw error if no active session when starting learning', () => {
      mockUseSessionStore.mockReturnValue({
        ...mockSessionStore,
        activeSessionId: null,
      } as ReturnType<typeof useSessionStore>);

      const { result } = renderHook(() => useLearningMode());

      expect(() => {
        result.current.startLearning({ topic: 'Test' });
      }).toThrow('No active chat session');
    });

    it('should call endLearningSession when ending learning', () => {
      const mockSession = {
        id: 'learning-1',
        sessionId: 'session-1',
        topic: 'Test Topic',
        currentPhase: 'questioning' as const,
        progress: 50,
        subQuestions: [],
        learningGoals: [],
        totalHintsProvided: 0,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      mockLearningStore.getLearningSessionByChat.mockReturnValue(mockSession);

      const { result } = renderHook(() => useLearningMode());

      act(() => {
        result.current.endLearning('Great session!', ['Takeaway 1']);
      });

      expect(mockLearningStore.endLearningSession).toHaveBeenCalledWith(
        'learning-1',
        'Great session!',
        ['Takeaway 1']
      );
    });
  });

  describe('Phase Management', () => {
    it('should call advancePhase on the store', () => {
      const mockSession = {
        id: 'learning-1',
        sessionId: 'session-1',
        topic: 'Test Topic',
        currentPhase: 'clarification' as const,
        progress: 0,
        subQuestions: [],
        learningGoals: [],
        totalHintsProvided: 0,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      mockLearningStore.getLearningSessionByChat.mockReturnValue(mockSession);

      const { result } = renderHook(() => useLearningMode());

      act(() => {
        result.current.advancePhase();
      });

      expect(mockLearningStore.advancePhase).toHaveBeenCalledWith('learning-1');
    });

    it('should call setPhase on the store', () => {
      const mockSession = {
        id: 'learning-1',
        sessionId: 'session-1',
        topic: 'Test Topic',
        currentPhase: 'clarification' as const,
        progress: 0,
        subQuestions: [],
        learningGoals: [],
        totalHintsProvided: 0,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      mockLearningStore.getLearningSessionByChat.mockReturnValue(mockSession);

      const { result } = renderHook(() => useLearningMode());

      act(() => {
        result.current.setPhase('questioning');
      });

      expect(mockLearningStore.setPhase).toHaveBeenCalledWith('learning-1', 'questioning');
    });
  });

  describe('Sub-Questions', () => {
    it('should call addSubQuestion on the store', () => {
      const mockSession = {
        id: 'learning-1',
        sessionId: 'session-1',
        topic: 'Test Topic',
        currentPhase: 'clarification' as const,
        progress: 0,
        subQuestions: [],
        learningGoals: [],
        totalHintsProvided: 0,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      const mockSubQuestion = {
        id: 'sq-1',
        question: 'Test question?',
        status: 'pending' as const,
        hints: [],
        userAttempts: 0,
      };
      mockLearningStore.getLearningSessionByChat.mockReturnValue(mockSession);
      mockLearningStore.addSubQuestion.mockReturnValue(mockSubQuestion);

      const { result } = renderHook(() => useLearningMode());

      act(() => {
        result.current.addSubQuestion('Test question?');
      });

      expect(mockLearningStore.addSubQuestion).toHaveBeenCalledWith('learning-1', 'Test question?');
    });

    it('should call markSubQuestionResolved on the store', () => {
      const mockSession = {
        id: 'learning-1',
        sessionId: 'session-1',
        topic: 'Test Topic',
        currentPhase: 'questioning' as const,
        progress: 50,
        subQuestions: [{ id: 'sq-1', question: 'Test?', status: 'in_progress' as const, hints: [], userAttempts: 0 }],
        learningGoals: [],
        totalHintsProvided: 0,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      mockLearningStore.getLearningSessionByChat.mockReturnValue(mockSession);

      const { result } = renderHook(() => useLearningMode());

      act(() => {
        result.current.resolveSubQuestion('sq-1', ['Insight 1']);
      });

      expect(mockLearningStore.markSubQuestionResolved).toHaveBeenCalledWith(
        'learning-1',
        'sq-1',
        ['Insight 1']
      );
    });
  });

  describe('Goals', () => {
    it('should call addLearningGoal on the store', () => {
      const mockSession = {
        id: 'learning-1',
        sessionId: 'session-1',
        topic: 'Test Topic',
        currentPhase: 'clarification' as const,
        progress: 0,
        subQuestions: [],
        learningGoals: [],
        totalHintsProvided: 0,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      const mockGoal = {
        id: 'goal-1',
        description: 'Test goal',
        achieved: false,
      };
      mockLearningStore.getLearningSessionByChat.mockReturnValue(mockSession);
      mockLearningStore.addLearningGoal.mockReturnValue(mockGoal);

      const { result } = renderHook(() => useLearningMode());

      act(() => {
        result.current.addGoal('Test goal');
      });

      expect(mockLearningStore.addLearningGoal).toHaveBeenCalledWith('learning-1', 'Test goal');
    });

    it('should call markGoalAchieved on the store', () => {
      const mockSession = {
        id: 'learning-1',
        sessionId: 'session-1',
        topic: 'Test Topic',
        currentPhase: 'questioning' as const,
        progress: 50,
        subQuestions: [],
        learningGoals: [{ id: 'goal-1', description: 'Test', achieved: false }],
        totalHintsProvided: 0,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      mockLearningStore.getLearningSessionByChat.mockReturnValue(mockSession);

      const { result } = renderHook(() => useLearningMode());

      act(() => {
        result.current.achieveGoal('goal-1');
      });

      expect(mockLearningStore.markGoalAchieved).toHaveBeenCalledWith('learning-1', 'goal-1');
    });
  });

  describe('Configuration', () => {
    it('should call updateConfig on the store', () => {
      const { result } = renderHook(() => useLearningMode());

      act(() => {
        result.current.updateConfig({ maxHintsPerQuestion: 5 });
      });

      expect(mockLearningStore.updateConfig).toHaveBeenCalledWith({ maxHintsPerQuestion: 5 });
    });
  });

  describe('Formatting', () => {
    it('should return empty string for getStatusLine when no session', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningMode());

      expect(result.current.getStatusLine()).toBe('');
    });

    it('should return status line when session exists', () => {
      const mockSession = {
        id: 'learning-1',
        sessionId: 'session-1',
        topic: 'Test Topic',
        currentPhase: 'questioning' as const,
        progress: 50,
        subQuestions: [
          { id: 'sq-1', status: 'resolved' as const },
          { id: 'sq-2', status: 'pending' as const },
        ],
        learningGoals: [],
        totalHintsProvided: 0,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      mockLearningStore.getLearningSessionByChat.mockReturnValue(mockSession);

      const { result } = renderHook(() => useLearningMode());
      const statusLine = result.current.getStatusLine();

      expect(statusLine).toContain('Exploring');
      expect(statusLine).toContain('50%');
    });

    it('should return empty string for getFormattedGoals when no session', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningMode());

      expect(result.current.getFormattedGoals()).toBe('');
    });

    it('should return formatted goals when session exists', () => {
      const mockSession = {
        id: 'learning-1',
        sessionId: 'session-1',
        topic: 'Test Topic',
        currentPhase: 'questioning' as const,
        progress: 50,
        subQuestions: [],
        learningGoals: [
          { id: 'g1', description: 'Understand basics', achieved: true },
          { id: 'g2', description: 'Apply concepts', achieved: false },
        ],
        totalHintsProvided: 0,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      mockLearningStore.getLearningSessionByChat.mockReturnValue(mockSession);

      const { result } = renderHook(() => useLearningMode());
      const formattedGoals = result.current.getFormattedGoals();

      expect(formattedGoals).toContain('Understand basics');
      expect(formattedGoals).toContain('Apply concepts');
    });

    it('should return empty string for getFormattedSubQuestions when no session', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningMode());

      expect(result.current.getFormattedSubQuestions()).toBe('');
    });
  });

  describe('Adaptive Prompts', () => {
    it('should return empty string for getAdaptivePrompt when no session', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningMode());

      expect(result.current.getAdaptivePrompt()).toBe('');
    });

    it('should return adaptive prompt when session exists', () => {
      const mockSession = {
        id: 'learning-1',
        sessionId: 'session-1',
        topic: 'Test Topic',
        currentPhase: 'questioning' as const,
        progress: 50,
        subQuestions: [],
        learningGoals: [],
        totalHintsProvided: 0,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        currentDifficulty: 'intermediate' as const,
        engagementScore: 50,
        consecutiveCorrect: 0,
        consecutiveIncorrect: 0,
        notes: [],
        concepts: [],
        statistics: {
          totalTimeSpentMs: 0,
          activeTimeSpentMs: 0,
          questionsAnswered: 0,
          correctAnswers: 0,
          hintsUsed: 0,
          conceptsLearned: 0,
          averageResponseTimeMs: 0,
          streakDays: 0,
          longestStreak: 0,
          phaseCompletionTimes: {},
        },
        reviewItems: [],
        adaptiveAdjustments: 0,
      };
      mockLearningStore.getLearningSessionByChat.mockReturnValue(mockSession);

      const { result } = renderHook(() => useLearningMode());
      const prompt = result.current.getAdaptivePrompt();

      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  describe('Celebration and Encouragement', () => {
    it('should return empty string for getCelebrationMessage when no session', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningMode());

      expect(result.current.getCelebrationMessage('question_solved')).toBe('');
    });

    it('should return celebration message when session exists', () => {
      const mockSession = {
        id: 'learning-1',
        sessionId: 'session-1',
        topic: 'Test Topic',
        currentPhase: 'questioning' as const,
        progress: 50,
        subQuestions: [],
        learningGoals: [],
        totalHintsProvided: 0,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      mockLearningStore.getLearningSessionByChat.mockReturnValue(mockSession);

      const { result } = renderHook(() => useLearningMode());
      const message = result.current.getCelebrationMessage('question_solved');

      expect(message).toBeTruthy();
      expect(message.length).toBeGreaterThan(0);
    });

    it('should return encouragement message', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningMode());
      const message = result.current.getEncouragement('goodProgress');

      expect(message).toBeTruthy();
      expect(message.length).toBeGreaterThan(0);
    });

    it('should return empty string for getContextualHint when no session', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningMode());

      expect(result.current.getContextualHint(3)).toBe('');
    });

    it('should return contextual hint when session exists', () => {
      const mockSession = {
        id: 'learning-1',
        sessionId: 'session-1',
        topic: 'Test Topic',
        currentPhase: 'questioning' as const,
        progress: 50,
        subQuestions: [],
        learningGoals: [],
        totalHintsProvided: 0,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      mockLearningStore.getLearningSessionByChat.mockReturnValue(mockSession);

      const { result } = renderHook(() => useLearningMode());
      const hint = result.current.getContextualHint(3);

      expect(hint).toBeTruthy();
      expect(hint.length).toBeGreaterThan(0);
    });
  });
});

describe('useIsLearningMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when session mode is learning', () => {
    const mockSession = { mode: 'learning' };
    mockUseSessionStore.mockReturnValue({
      getActiveSession: jest.fn().mockReturnValue(mockSession),
    } as unknown as ReturnType<typeof useSessionStore>);

    const { result } = renderHook(() => useIsLearningMode());

    expect(result.current).toBe(true);
  });

  it('should return false when session mode is not learning', () => {
    const mockSession = { mode: 'chat' };
    mockUseSessionStore.mockReturnValue({
      getActiveSession: jest.fn().mockReturnValue(mockSession),
    } as unknown as ReturnType<typeof useSessionStore>);

    const { result } = renderHook(() => useIsLearningMode());

    expect(result.current).toBe(false);
  });

  it('should return false when no active session', () => {
    mockUseSessionStore.mockReturnValue({
      getActiveSession: jest.fn().mockReturnValue(undefined),
    } as unknown as ReturnType<typeof useSessionStore>);

    const { result } = renderHook(() => useIsLearningMode());

    expect(result.current).toBe(false);
  });
});
