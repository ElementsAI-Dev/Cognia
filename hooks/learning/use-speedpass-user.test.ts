/**
 * useSpeedPassUser Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useSpeedPassUser } from './use-speedpass-user';
import { useSpeedPassStore } from '@/stores/learning/speedpass-store';

// Mock the store
jest.mock('@/stores/learning/speedpass-store', () => ({
  useSpeedPassStore: jest.fn(),
}));

const mockUseSpeedPassStore = useSpeedPassStore as jest.MockedFunction<typeof useSpeedPassStore>;

// ============================================================================
// Test Data
// ============================================================================

const createMockStore = (overrides = {}) => ({
  globalStats: {
    totalStudyTimeMs: 3600000, // 1 hour
    sessionsCompleted: 5,
    tutorialsCompleted: 2,
    quizzesCompleted: 10,
    totalQuestionsAttempted: 50,
    totalQuestionsCorrect: 40,
    averageAccuracy: 80,
    currentStreak: 3,
    longestStreak: 7,
  },
  studySessions: {
    'session-1': {
      id: 'session-1',
      tutorialId: 'tutorial-1',
      startedAt: new Date().toISOString(),
      timeSpentMs: 1800000,
      sectionsCompleted: ['section-1'],
    },
    'session-2': {
      id: 'session-2',
      tutorialId: 'tutorial-1',
      startedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      timeSpentMs: 1800000,
      sectionsCompleted: ['section-2'],
    },
  },
  textbooks: {
    'tb-1': { id: 'tb-1', name: 'Test Textbook' },
  },
  tutorials: {
    'tutorial-1': { id: 'tutorial-1', title: 'Test Tutorial', completedAt: new Date() },
  },
  quizzes: {},
  userProfile: null,
  setUserProfile: jest.fn(),
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('useSpeedPassUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('profile', () => {
    it('should return default profile when store has no profile', () => {
      mockUseSpeedPassStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useSpeedPassUser());

      expect(result.current.profile).toBeDefined();
      expect(result.current.profile.id).toBe('local-user');
      expect(result.current.profile.displayName).toBe('学习者');
      expect(result.current.profile.preferredMode).toBe('speed');
    });

    it('should return stored profile when available', () => {
      const customProfile = {
        id: 'user-123',
        displayName: '小明',
        preferredMode: 'extreme' as const,
        studyGoal: 'excellent' as const,
        dailyStudyTarget: 120,
        reminderEnabled: true,
        reminderTime: '20:00',
      };

      mockUseSpeedPassStore.mockReturnValue(
        createMockStore({ userProfile: customProfile })
      );

      const { result } = renderHook(() => useSpeedPassUser());

      expect(result.current.profile.displayName).toBe('小明');
      expect(result.current.profile.preferredMode).toBe('extreme');
      expect(result.current.profile.dailyStudyTarget).toBe(120);
    });
  });

  describe('stats', () => {
    it('should calculate user stats from store data', () => {
      mockUseSpeedPassStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useSpeedPassUser());

      expect(result.current.stats).toBeDefined();
      expect(result.current.stats.totalQuizzes).toBe(10);
      expect(result.current.stats.averageAccuracy).toBe(80);
      expect(result.current.stats.totalStudyTimeMs).toBe(3600000);
      expect(result.current.stats.textbooksCount).toBe(1);
    });

    it('should calculate study days from sessions', () => {
      mockUseSpeedPassStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useSpeedPassUser());

      expect(result.current.stats.totalStudyDays).toBeGreaterThanOrEqual(1);
    });

    it('should track tutorials completed', () => {
      mockUseSpeedPassStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useSpeedPassUser());

      expect(result.current.stats.tutorialsCompleted).toBe(1);
    });
  });

  describe('progress', () => {
    it('should calculate level from experience', () => {
      mockUseSpeedPassStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useSpeedPassUser());

      expect(result.current.progress.level).toBeGreaterThanOrEqual(1);
      expect(result.current.progress.experience).toBeGreaterThanOrEqual(0);
      expect(result.current.progress.nextLevelExperience).toBeGreaterThan(0);
    });

    it('should track achievements', () => {
      mockUseSpeedPassStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useSpeedPassUser());

      expect(result.current.progress.achievements).toBeDefined();
      expect(Array.isArray(result.current.progress.achievements)).toBe(true);
      expect(result.current.progress.achievements.length).toBeGreaterThan(0);
    });

    it('should unlock first_session achievement after first study', () => {
      mockUseSpeedPassStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useSpeedPassUser());

      const firstSession = result.current.progress.achievements.find(
        (a) => a.id === 'first_session'
      );
      expect(firstSession?.unlockedAt).toBeDefined();
    });

    it('should track quiz_master achievement progress', () => {
      mockUseSpeedPassStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useSpeedPassUser());

      const quizMaster = result.current.progress.achievements.find(
        (a) => a.id === 'quiz_master'
      );
      expect(quizMaster?.target).toBe(10);
      expect(quizMaster?.progress).toBe(10);
      expect(quizMaster?.unlockedAt).toBeDefined();
    });

    it('should collect badges for unlocked achievements', () => {
      mockUseSpeedPassStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useSpeedPassUser());

      expect(result.current.progress.badges).toBeDefined();
      expect(Array.isArray(result.current.progress.badges)).toBe(true);
    });
  });

  describe('updateProfile', () => {
    it('should call setUserProfile with merged profile', () => {
      const setUserProfile = jest.fn();
      mockUseSpeedPassStore.mockReturnValue(
        createMockStore({ setUserProfile })
      );

      const { result } = renderHook(() => useSpeedPassUser());

      act(() => {
        result.current.updateProfile({ displayName: '新名字' });
      });

      expect(setUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: '新名字' })
      );
    });

    it('should preserve existing profile values', () => {
      const setUserProfile = jest.fn();
      const existingProfile = {
        id: 'user-1',
        displayName: '原名字',
        preferredMode: 'comprehensive' as const,
        studyGoal: 'good' as const,
        dailyStudyTarget: 90,
        reminderEnabled: false,
      };

      mockUseSpeedPassStore.mockReturnValue(
        createMockStore({ userProfile: existingProfile, setUserProfile })
      );

      const { result } = renderHook(() => useSpeedPassUser());

      act(() => {
        result.current.updateProfile({ displayName: '新名字' });
      });

      expect(setUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          preferredMode: 'comprehensive',
          dailyStudyTarget: 90,
        })
      );
    });
  });

  describe('isDailyGoalMet', () => {
    it('should return false when no study today', () => {
      const yesterdaySessions = {
        'session-1': {
          id: 'session-1',
          tutorialId: 'tutorial-1',
          startedAt: new Date(Date.now() - 86400000).toISOString(),
          timeSpentMs: 7200000,
          sectionsCompleted: [],
        },
      };

      mockUseSpeedPassStore.mockReturnValue(
        createMockStore({ studySessions: yesterdaySessions })
      );

      const { result } = renderHook(() => useSpeedPassUser());

      expect(result.current.isDailyGoalMet).toBe(false);
    });

    it('should return true when daily goal exceeded', () => {
      const todaySessions = {
        'session-1': {
          id: 'session-1',
          tutorialId: 'tutorial-1',
          startedAt: new Date().toISOString(),
          timeSpentMs: 7200000, // 2 hours (default goal is 60 min)
          sectionsCompleted: [],
        },
      };

      mockUseSpeedPassStore.mockReturnValue(
        createMockStore({ studySessions: todaySessions })
      );

      const { result } = renderHook(() => useSpeedPassUser());

      expect(result.current.isDailyGoalMet).toBe(true);
    });
  });

  describe('todayProgress', () => {
    it('should calculate today study progress', () => {
      const todaySessions = {
        'session-1': {
          id: 'session-1',
          tutorialId: 'tutorial-1',
          startedAt: new Date().toISOString(),
          timeSpentMs: 1800000, // 30 minutes
          sectionsCompleted: [],
        },
      };

      mockUseSpeedPassStore.mockReturnValue(
        createMockStore({ studySessions: todaySessions })
      );

      const { result } = renderHook(() => useSpeedPassUser());

      expect(result.current.todayProgress.studyMinutes).toBe(30);
      expect(result.current.todayProgress.targetMinutes).toBe(60);
      expect(result.current.todayProgress.percentage).toBe(50);
    });

    it('should cap percentage at 100', () => {
      const todaySessions = {
        'session-1': {
          id: 'session-1',
          tutorialId: 'tutorial-1',
          startedAt: new Date().toISOString(),
          timeSpentMs: 7200000, // 2 hours
          sectionsCompleted: [],
        },
      };

      mockUseSpeedPassStore.mockReturnValue(
        createMockStore({ studySessions: todaySessions })
      );

      const { result } = renderHook(() => useSpeedPassUser());

      expect(result.current.todayProgress.percentage).toBe(100);
    });
  });

  describe('authentication state', () => {
    it('should indicate local mode', () => {
      mockUseSpeedPassStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useSpeedPassUser());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLocalMode).toBe(true);
    });
  });
});

describe('streak calculation', () => {
  it('should calculate current streak correctly', () => {
    const today = new Date();
    const sessions: Record<string, unknown> = {};

    // Create sessions for the last 5 days
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      sessions[`session-${i}`] = {
        id: `session-${i}`,
        tutorialId: 'tutorial-1',
        startedAt: date.toISOString(),
        timeSpentMs: 1800000,
        sectionsCompleted: [],
      };
    }

    mockUseSpeedPassStore.mockReturnValue(createMockStore({ studySessions: sessions }));

    const { result } = renderHook(() => useSpeedPassUser());

    expect(result.current.stats.currentStreak).toBeGreaterThanOrEqual(5);
  });

  it('should break streak on missed days', () => {
    const sessions = {
      'session-1': {
        id: 'session-1',
        tutorialId: 'tutorial-1',
        startedAt: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
        timeSpentMs: 1800000,
        sectionsCompleted: [],
      },
    };

    mockUseSpeedPassStore.mockReturnValue(createMockStore({ studySessions: sessions }));

    const { result } = renderHook(() => useSpeedPassUser());

    expect(result.current.stats.currentStreak).toBe(0);
  });
});
