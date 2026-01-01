/**
 * Learning History Panel Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { LearningHistoryPanel } from './learning-history-panel';
import { useLearningStore } from '@/stores/learning-store';
import type { LearningSession, LearningAchievement } from '@/types/learning';
import { DEFAULT_LEARNING_STATISTICS } from '@/types/learning';

// Mock the learning store
jest.mock('@/stores/learning-store', () => ({
  useLearningStore: jest.fn(),
}));

const mockMessages = {
  learningMode: {
    history: {
      overallProgress: 'Overall Progress',
      sessionsCompleted: 'Sessions Completed',
      totalTime: 'Total Learning Time',
      overallAccuracy: 'Overall Accuracy',
      conceptsMastered: 'Concepts Mastered',
      currentStreak: 'Current Streak',
      longestStreak: 'Longest Streak',
      achievements: 'Achievements',
      achievementsEarned: 'achievements earned',
      recentSessions: 'Recent Sessions',
      noSessions: 'No completed sessions yet. Start learning to track your progress!',
    },
  },
};

const createMockSession = (overrides?: Partial<LearningSession>): LearningSession => ({
  id: 'session-1',
  sessionId: 'chat-1',
  topic: 'Test Topic',
  learningGoals: [{ id: 'g1', description: 'Test goal', achieved: true, achievedAt: new Date() }],
  currentPhase: 'summary',
  subQuestions: [],
  progress: 100,
  totalHintsProvided: 2,
  startedAt: new Date('2024-01-01T10:00:00'),
  lastActivityAt: new Date('2024-01-01T11:00:00'),
  completedAt: new Date('2024-01-01T11:00:00'),
  notes: [],
  concepts: [],
  statistics: { ...DEFAULT_LEARNING_STATISTICS, totalTimeSpentMs: 3600000 },
  reviewItems: [],
  currentDifficulty: 'intermediate',
  adaptiveAdjustments: 0,
  engagementScore: 70,
  consecutiveCorrect: 5,
  consecutiveIncorrect: 0,
  ...overrides,
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={mockMessages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('LearningHistoryPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no completed sessions', () => {
    (useLearningStore as unknown as jest.Mock).mockReturnValue({
      getCompletedSessions: jest.fn().mockReturnValue([]),
      getAchievements: jest.fn().mockReturnValue([]),
      globalStats: {
        totalSessionsCompleted: 0,
        totalTimeSpentMs: 0,
        totalQuestionsAnswered: 0,
        totalCorrectAnswers: 0,
        conceptsMastered: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastSessionAt: undefined,
      },
    });

    renderWithProviders(<LearningHistoryPanel />);

    expect(screen.getByText('No completed sessions yet. Start learning to track your progress!')).toBeInTheDocument();
  });

  it('should render overall statistics', () => {
    (useLearningStore as unknown as jest.Mock).mockReturnValue({
      getCompletedSessions: jest.fn().mockReturnValue([]),
      getAchievements: jest.fn().mockReturnValue([]),
      globalStats: {
        totalSessionsCompleted: 5,
        totalTimeSpentMs: 7200000, // 2 hours
        totalQuestionsAnswered: 50,
        totalCorrectAnswers: 40,
        conceptsMastered: 10,
        currentStreak: 3,
        longestStreak: 7,
        lastSessionAt: new Date(),
      },
    });

    renderWithProviders(<LearningHistoryPanel />);

    expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    expect(screen.getByText('Sessions Completed')).toBeInTheDocument();
  });

  it('should render completed sessions list', () => {
    const sessions = [
      createMockSession({ id: 's1', topic: 'Recursion Basics' }),
      createMockSession({ id: 's2', topic: 'Data Structures' }),
    ];

    (useLearningStore as unknown as jest.Mock).mockReturnValue({
      getCompletedSessions: jest.fn().mockReturnValue(sessions),
      getAchievements: jest.fn().mockReturnValue([]),
      globalStats: {
        totalSessionsCompleted: 2,
        totalTimeSpentMs: 7200000,
        totalQuestionsAnswered: 20,
        totalCorrectAnswers: 15,
        conceptsMastered: 5,
        currentStreak: 2,
        longestStreak: 2,
        lastSessionAt: new Date(),
      },
    });

    renderWithProviders(<LearningHistoryPanel />);

    expect(screen.getByText('Recursion Basics')).toBeInTheDocument();
    expect(screen.getByText('Data Structures')).toBeInTheDocument();
  });

  it('should render achievements when earned', () => {
    const achievements: LearningAchievement[] = [
      {
        id: 'a1',
        type: 'explorer',
        name: 'First Steps',
        description: 'Complete your first learning session',
        iconName: 'Rocket',
        earnedAt: new Date(),
      },
      {
        id: 'a2',
        type: 'mastery',
        name: 'Perfect Score',
        description: 'Get 100% accuracy in a session',
        iconName: 'Trophy',
        earnedAt: new Date(),
      },
    ];

    (useLearningStore as unknown as jest.Mock).mockReturnValue({
      getCompletedSessions: jest.fn().mockReturnValue([]),
      getAchievements: jest.fn().mockReturnValue(achievements),
      globalStats: {
        totalSessionsCompleted: 1,
        totalTimeSpentMs: 3600000,
        totalQuestionsAnswered: 10,
        totalCorrectAnswers: 10,
        conceptsMastered: 2,
        currentStreak: 1,
        longestStreak: 1,
        lastSessionAt: new Date(),
      },
    });

    renderWithProviders(<LearningHistoryPanel />);

    expect(screen.getByText('Achievements')).toBeInTheDocument();
    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Perfect Score')).toBeInTheDocument();
  });

  it('should display streak information', () => {
    (useLearningStore as unknown as jest.Mock).mockReturnValue({
      getCompletedSessions: jest.fn().mockReturnValue([]),
      getAchievements: jest.fn().mockReturnValue([]),
      globalStats: {
        totalSessionsCompleted: 10,
        totalTimeSpentMs: 36000000,
        totalQuestionsAnswered: 100,
        totalCorrectAnswers: 85,
        conceptsMastered: 20,
        currentStreak: 5,
        longestStreak: 10,
        lastSessionAt: new Date(),
      },
    });

    renderWithProviders(<LearningHistoryPanel />);

    // Should render without errors and show streak-related content
    expect(screen.getByText('Current Streak')).toBeInTheDocument();
  });

  it('should render concepts mastered count', () => {
    (useLearningStore as unknown as jest.Mock).mockReturnValue({
      getCompletedSessions: jest.fn().mockReturnValue([]),
      getAchievements: jest.fn().mockReturnValue([]),
      globalStats: {
        totalSessionsCompleted: 5,
        totalTimeSpentMs: 18000000,
        totalQuestionsAnswered: 50,
        totalCorrectAnswers: 40,
        conceptsMastered: 15,
        currentStreak: 3,
        longestStreak: 5,
        lastSessionAt: new Date(),
      },
    });

    renderWithProviders(<LearningHistoryPanel />);

    expect(screen.getByText('Concepts Mastered')).toBeInTheDocument();
  });

  it('should handle session with final summary', () => {
    const sessions = [
      createMockSession({
        id: 's1',
        topic: 'Advanced Topic',
        finalSummary: 'Great learning session about advanced concepts.',
        keyTakeaways: ['Key point 1', 'Key point 2'],
      }),
    ];

    (useLearningStore as unknown as jest.Mock).mockReturnValue({
      getCompletedSessions: jest.fn().mockReturnValue(sessions),
      getAchievements: jest.fn().mockReturnValue([]),
      globalStats: {
        totalSessionsCompleted: 1,
        totalTimeSpentMs: 3600000,
        totalQuestionsAnswered: 10,
        totalCorrectAnswers: 8,
        conceptsMastered: 3,
        currentStreak: 1,
        longestStreak: 1,
        lastSessionAt: new Date(),
      },
    });

    renderWithProviders(<LearningHistoryPanel />);

    expect(screen.getByText('Advanced Topic')).toBeInTheDocument();
  });
});
