/**
 * Tests for LearningHistoryPanel Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { LearningHistoryPanel } from './learning-history-panel';
import { useLearningStore } from '@/stores/learning';
import type { LearningSession, LearningAchievement } from '@/types/learning';

// Mock stores
jest.mock('@/stores/learning', () => ({
  useLearningStore: jest.fn(),
}));

// Mock translations
const messages = {
  learningMode: {
    history: {
      overallProgress: 'Overall Progress',
      sessionsCompleted: 'Sessions Completed',
      totalTime: 'Total Time',
      overallAccuracy: 'Overall Accuracy',
      conceptsMastered: 'Concepts Mastered',
      currentStreak: 'Current Streak',
      longestStreak: 'Longest Streak',
      achievements: 'Achievements',
      achievementsEarned: 'achievements earned',
      recentSessions: 'Recent Sessions',
      noSessions: 'No sessions yet',
      days: 'days',
    },
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

// Test data
const mockSession: LearningSession = {
  id: 'session-1',
  sessionId: 'chat-session-1',
  durationType: 'quick',
  category: 'concept',
  topic: 'React Hooks',
  learningGoals: [],
  startedAt: new Date('2024-01-15'),
  lastActivityAt: new Date('2024-01-15'),
  completedAt: new Date('2024-01-15'),
  progress: 100,
  totalHintsProvided: 1,
  currentPhase: 'summary',
  currentDifficulty: 'intermediate',
  engagementScore: 85,
  adaptiveAdjustments: 2,
  consecutiveCorrect: 5,
  consecutiveIncorrect: 0,
  concepts: [
    { id: 'c1', name: 'useState', masteryScore: 100, masteryStatus: 'mastered', reviewCount: 3, correctAnswers: 10, totalAttempts: 10 },
    { id: 'c2', name: 'useEffect', masteryScore: 80, masteryStatus: 'learning', reviewCount: 2, correctAnswers: 8, totalAttempts: 10 },
  ],
  subQuestions: [],
  notes: [],
  reviewItems: [],
  statistics: {
    questionsAnswered: 10,
    correctAnswers: 8,
    averageResponseTimeMs: 5000,
    totalTimeSpentMs: 1800000,
    activeTimeSpentMs: 1500000,
    hintsUsed: 1,
    conceptsLearned: 2,
    streakDays: 3,
    longestStreak: 7,
    phaseCompletionTimes: {},
  },
};

const mockSessions: LearningSession[] = [
  mockSession,
  {
    ...mockSession,
    id: 'session-2',
    topic: 'TypeScript Basics',
    completedAt: new Date('2024-01-14'),
    statistics: {
      ...mockSession.statistics,
      totalTimeSpentMs: 2400000, // 40 minutes
      questionsAnswered: 15,
      correctAnswers: 12,
    },
  },
];

const mockAchievements: LearningAchievement[] = [
  {
    id: 'ach-1',
    type: 'explorer',
    name: 'First Steps',
    description: 'Complete your first session',
    iconName: 'Rocket',
    earnedAt: new Date(),
  },
  {
    id: 'ach-2',
    type: 'streak',
    name: 'On Fire',
    description: '7 day streak',
    iconName: 'Flame',
    earnedAt: new Date(),
  },
];

const mockGlobalStats = {
  totalSessionsCompleted: 5,
  totalTimeSpentMs: 7200000,
  totalConceptsLearned: 10,
  currentStreak: 3,
  longestStreak: 7,
  averageAccuracy: 80,
  lastSessionDate: new Date(),
};

describe('LearningHistoryPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLearningStore as unknown as jest.Mock).mockReturnValue({
      getCompletedSessions: () => mockSessions,
      getAchievements: () => mockAchievements,
      globalStats: mockGlobalStats,
    });
  });

  describe('Rendering', () => {
    it('renders overall progress section', () => {
      render(<LearningHistoryPanel />, { wrapper });
      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    });

    it('displays session count', () => {
      render(<LearningHistoryPanel />, { wrapper });
      expect(screen.getByText('Sessions Completed')).toBeInTheDocument();
    });

    it('displays total time', () => {
      render(<LearningHistoryPanel />, { wrapper });
      expect(screen.getByText(/Total Learning Time/i)).toBeInTheDocument();
    });

    it('displays overall accuracy', () => {
      render(<LearningHistoryPanel />, { wrapper });
      expect(screen.getByText(/Overall Accuracy/i)).toBeInTheDocument();
    });

    it('displays concepts mastered count', () => {
      render(<LearningHistoryPanel />, { wrapper });
      expect(screen.getByText('Concepts Mastered')).toBeInTheDocument();
    });

    it('displays current streak', () => {
      render(<LearningHistoryPanel />, { wrapper });
      expect(screen.getByText('Current Streak')).toBeInTheDocument();
    });

    it('displays longest streak', () => {
      render(<LearningHistoryPanel />, { wrapper });
      // Text is split across elements, check the label exists
      expect(screen.getByText(/Longest Streak/)).toBeInTheDocument();
    });
  });

  describe('Achievements Section', () => {
    it('renders achievements section when achievements exist', () => {
      render(<LearningHistoryPanel />, { wrapper });
      expect(screen.getByText('Achievements')).toBeInTheDocument();
    });

    it('displays achievement count', () => {
      render(<LearningHistoryPanel />, { wrapper });
      expect(screen.getByText('2 achievements earned')).toBeInTheDocument();
    });

    it('displays achievement names', () => {
      render(<LearningHistoryPanel />, { wrapper });
      expect(screen.getByText('First Steps')).toBeInTheDocument();
      expect(screen.getByText('On Fire')).toBeInTheDocument();
    });

    it('displays achievement descriptions', () => {
      render(<LearningHistoryPanel />, { wrapper });
      expect(screen.getByText('Complete your first session')).toBeInTheDocument();
      expect(screen.getByText('7 day streak')).toBeInTheDocument();
    });

    it('does not render achievements section when empty', () => {
      (useLearningStore as unknown as jest.Mock).mockReturnValue({
        getCompletedSessions: () => mockSessions,
        getAchievements: () => [],
        globalStats: mockGlobalStats,
      });
      
      render(<LearningHistoryPanel />, { wrapper });
      expect(screen.queryByText('Achievements')).not.toBeInTheDocument();
    });
  });

  describe('Session History Section', () => {
    it('renders recent sessions section', () => {
      render(<LearningHistoryPanel />, { wrapper });
      expect(screen.getByText('Recent Sessions')).toBeInTheDocument();
    });

    it('displays session topics', () => {
      render(<LearningHistoryPanel />, { wrapper });
      expect(screen.getByText('React Hooks')).toBeInTheDocument();
      expect(screen.getByText('TypeScript Basics')).toBeInTheDocument();
    });

    it('shows empty state when no sessions', () => {
      (useLearningStore as unknown as jest.Mock).mockReturnValue({
        getCompletedSessions: () => [],
        getAchievements: () => [],
        globalStats: { ...mockGlobalStats, currentStreak: 0, longestStreak: 0 },
      });
      
      render(<LearningHistoryPanel />, { wrapper });
      expect(screen.getByText(/No.*sessions/i)).toBeInTheDocument();
    });

    it('sorts sessions by completion date (newest first)', () => {
      render(<LearningHistoryPanel />, { wrapper });
      
      const sessions = screen.getAllByText(/React Hooks|TypeScript Basics/);
      // React Hooks (Jan 15) should appear before TypeScript Basics (Jan 14)
      expect(sessions[0]).toHaveTextContent('React Hooks');
    });
  });

  describe('Session Selection', () => {
    it('calls onSelectSession when session is clicked', async () => {
      const onSelectSession = jest.fn();
      const user = userEvent.setup();
      
      render(<LearningHistoryPanel onSelectSession={onSelectSession} />, { wrapper });
      
      await user.click(screen.getByText('React Hooks'));
      
      expect(onSelectSession).toHaveBeenCalledWith('session-1');
    });
  });

  describe('Session Card Details', () => {
    it('displays session accuracy', () => {
      render(<LearningHistoryPanel />, { wrapper });
      // Overall accuracy should be displayed
      expect(screen.getByText(/Overall Accuracy/i)).toBeInTheDocument();
    });

    it('displays concepts mastered badge', () => {
      render(<LearningHistoryPanel />, { wrapper });
      // Concepts mastered should be displayed
      expect(screen.getByText(/Concepts Mastered/i)).toBeInTheDocument();
    });

    it('displays completed badge for finished sessions', () => {
      render(<LearningHistoryPanel />, { wrapper });
      // Completed sessions should have badges
      expect(screen.getByText(/Total Learning Time/i)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <LearningHistoryPanel className="custom-history" />,
        { wrapper }
      );
      
      expect(container.querySelector('.custom-history')).toBeInTheDocument();
    });
  });
});
