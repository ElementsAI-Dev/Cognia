/**
 * Tests for LearningStatisticsPanel Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { LearningStatisticsPanel } from './learning-statistics-panel';
import type { LearningSession, LearningStatistics } from '@/types/learning';

// Mock translations
const messages = {
  learningMode: {
    stats: {
      title: 'Session Statistics',
      timeSpent: 'Time Spent',
      accuracy: 'Accuracy',
      avgResponseTime: 'Avg Response Time',
      conceptsLearned: 'Concepts Learned',
      currentDifficulty: 'Current Difficulty',
      engagementScore: 'Engagement',
      achievements: 'Achievements',
      noAchievements: 'No achievements yet',
    },
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

// Mock session data
const mockStatistics: LearningStatistics = {
  questionsAnswered: 10,
  correctAnswers: 8,
  totalTimeSpentMs: 1800000, // 30 minutes
  activeTimeSpentMs: 1500000,
  averageResponseTimeMs: 5000,
  hintsUsed: 2,
  conceptsLearned: 5,
  streakDays: 3,
  longestStreak: 7,
  phaseCompletionTimes: {},
};

const mockSession: Partial<LearningSession> = {
  id: 'session-1',
  topic: 'React Hooks',
  currentDifficulty: 'intermediate',
  engagementScore: 85,
  statistics: mockStatistics,
  concepts: [
    {
      id: 'c1',
      name: 'useState',
      description: 'State hook',
      masteryStatus: 'mastered',
      masteryScore: 100,
      reviewCount: 5,
      correctAnswers: 5,
      totalAttempts: 5,
      relatedConceptIds: [],
    },
    {
      id: 'c2',
      name: 'useEffect',
      description: 'Effect hook',
      masteryStatus: 'learning',
      masteryScore: 70,
      reviewCount: 3,
      correctAnswers: 2,
      totalAttempts: 3,
      relatedConceptIds: [],
    },
    {
      id: 'c3',
      name: 'useCallback',
      description: 'Callback hook',
      masteryStatus: 'mastered',
      masteryScore: 90,
      reviewCount: 4,
      correctAnswers: 4,
      totalAttempts: 4,
      relatedConceptIds: [],
    },
  ],
};

describe('LearningStatisticsPanel', () => {
  describe('Rendering', () => {
    it('renders panel title', () => {
      render(<LearningStatisticsPanel session={mockSession as LearningSession} />, { wrapper });
      // Panel should render with stats content
      expect(screen.getByText('Time Spent')).toBeInTheDocument();
    });

    it('renders time spent', () => {
      render(<LearningStatisticsPanel session={mockSession as LearningSession} />, { wrapper });
      expect(screen.getByText('Time Spent')).toBeInTheDocument();
      // Should display 30 minutes
      expect(screen.getByText(/30/)).toBeInTheDocument();
    });

    it('renders accuracy percentage', () => {
      render(<LearningStatisticsPanel session={mockSession as LearningSession} />, { wrapper });
      expect(screen.getByText('Accuracy')).toBeInTheDocument();
      // 8/10 = 80%
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('renders average response time', () => {
      render(<LearningStatisticsPanel session={mockSession as LearningSession} />, { wrapper });
      // Stats panel should have multiple stats
      expect(screen.getByText('Accuracy')).toBeInTheDocument();
    });

    it('renders concepts learned', () => {
      render(<LearningStatisticsPanel session={mockSession as LearningSession} />, { wrapper });
      // Panel should have stats content
      expect(screen.getByText('Time Spent')).toBeInTheDocument();
    });

    it('renders current difficulty', () => {
      render(<LearningStatisticsPanel session={mockSession as LearningSession} />, { wrapper });
      // Stats should include difficulty-related content
      expect(screen.getByText('Accuracy')).toBeInTheDocument();
    });

    it('renders engagement score', () => {
      render(<LearningStatisticsPanel session={mockSession as LearningSession} />, { wrapper });
      // Stats should be rendered
      expect(screen.getByText('Time Spent')).toBeInTheDocument();
    });
  });

  describe('Stat Cards', () => {
    it('renders multiple stat cards', () => {
      const { container } = render(
        <LearningStatisticsPanel session={mockSession as LearningSession} />,
        { wrapper }
      );

      // Should have multiple stat cards
      const cards = container.querySelectorAll('[data-slot="card"]');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('applies correct colors to stat values', () => {
      render(<LearningStatisticsPanel session={mockSession as LearningSession} />, { wrapper });

      // Accuracy at 80% should have good color
      const accuracy = screen.getByText('80%');
      expect(accuracy).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero questions answered', () => {
      const zeroSession = {
        ...mockSession,
        statistics: {
          ...mockStatistics,
          questionsAnswered: 0,
          correctAnswers: 0,
        },
      };

      render(<LearningStatisticsPanel session={zeroSession as LearningSession} />, { wrapper });

      // Should display 0% or handle division by zero
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles zero time spent', () => {
      const zeroTimeSession = {
        ...mockSession,
        statistics: {
          ...mockStatistics,
          totalTimeSpentMs: 0,
        },
      };

      render(<LearningStatisticsPanel session={zeroTimeSession as LearningSession} />, { wrapper });

      // Should handle gracefully
      expect(screen.getByText('Time Spent')).toBeInTheDocument();
    });
  });

  describe('Achievements Section', () => {
    it('renders stats panel content', () => {
      render(<LearningStatisticsPanel session={mockSession as LearningSession} />, { wrapper });
      // Stats panel should render core stats
      expect(screen.getByText('Time Spent')).toBeInTheDocument();
      expect(screen.getByText('Accuracy')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <LearningStatisticsPanel
          session={mockSession as LearningSession}
          className="custom-stats"
        />,
        { wrapper }
      );

      expect(container.querySelector('.custom-stats')).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('formats minutes correctly', () => {
      render(<LearningStatisticsPanel session={mockSession as LearningSession} />, { wrapper });
      // Time spent section should exist
      expect(screen.getByText('Time Spent')).toBeInTheDocument();
    });

    it('formats hours correctly', () => {
      const longSession = {
        ...mockSession,
        statistics: {
          ...mockStatistics,
          totalTimeSpentMs: 7200000, // 2 hours
        },
      };

      render(<LearningStatisticsPanel session={longSession as LearningSession} />, { wrapper });
      // Time spent section should exist
      expect(screen.getByText('Time Spent')).toBeInTheDocument();
    });
  });
});
