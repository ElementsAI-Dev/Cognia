/**
 * Learning Statistics Panel Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { LearningStatisticsPanel } from './learning-statistics-panel';
import type { LearningSession, LearningAchievement } from '@/types/learning';
import { DEFAULT_LEARNING_STATISTICS } from '@/types/learning';

const mockMessages = {
  learningMode: {
    stats: {
      timeSpent: 'Time Spent',
      accuracy: 'Accuracy',
      avgResponse: 'Avg Response',
      conceptsLearned: 'Concepts',
      currentDifficulty: 'Current Difficulty',
      engagement: 'Engagement',
      engagementHigh: "You're highly engaged!",
      engagementMedium: 'Steady engagement.',
      engagementLow: 'Try to stay engaged.',
      conceptMastery: 'Concept Mastery',
      currentStreak: 'Current Streak',
      achievements: 'Achievements',
    },
  },
};

const createMockSession = (overrides?: Partial<LearningSession>): LearningSession => ({
  id: 'session-1',
  sessionId: 'chat-1',
  topic: 'Test Topic',
  learningGoals: [],
  currentPhase: 'questioning',
  subQuestions: [],
  progress: 50,
  totalHintsProvided: 0,
  startedAt: new Date(),
  lastActivityAt: new Date(),
  notes: [],
  concepts: [],
  statistics: { ...DEFAULT_LEARNING_STATISTICS },
  reviewItems: [],
  currentDifficulty: 'intermediate',
  adaptiveAdjustments: 0,
  engagementScore: 60,
  consecutiveCorrect: 2,
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

describe('LearningStatisticsPanel', () => {
  it('should render basic statistics', () => {
    const session = createMockSession({
      statistics: {
        ...DEFAULT_LEARNING_STATISTICS,
        totalTimeSpentMs: 600000, // 10 minutes
        questionsAnswered: 10,
        correctAnswers: 8,
        averageResponseTimeMs: 5000,
      },
    });

    renderWithProviders(<LearningStatisticsPanel session={session} />);

    expect(screen.getByText('Time Spent')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Avg Response')).toBeInTheDocument();
  });

  it('should display current difficulty', () => {
    const session = createMockSession({ currentDifficulty: 'advanced' });

    renderWithProviders(<LearningStatisticsPanel session={session} />);

    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('should show engagement score and message', () => {
    const session = createMockSession({ engagementScore: 75 });

    renderWithProviders(<LearningStatisticsPanel session={session} />);

    expect(screen.getByText('Engagement')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should display concept mastery when concepts exist', () => {
    const session = createMockSession({
      concepts: [
        {
          id: 'c1',
          name: 'Recursion',
          masteryStatus: 'mastered',
          masteryScore: 95,
          reviewCount: 5,
          correctAnswers: 10,
          totalAttempts: 10,
        },
        {
          id: 'c2',
          name: 'Iteration',
          masteryStatus: 'learning',
          masteryScore: 40,
          reviewCount: 2,
          correctAnswers: 4,
          totalAttempts: 10,
        },
      ],
    });

    renderWithProviders(<LearningStatisticsPanel session={session} />);

    expect(screen.getByText('Concept Mastery')).toBeInTheDocument();
    expect(screen.getByText('Recursion')).toBeInTheDocument();
    expect(screen.getByText('Iteration')).toBeInTheDocument();
  });

  it('should display achievements when provided', () => {
    const session = createMockSession();
    const achievements: LearningAchievement[] = [
      {
        id: 'a1',
        type: 'explorer',
        name: 'First Steps',
        description: 'Complete your first session',
        iconName: 'Rocket',
        earnedAt: new Date(),
      },
    ];

    renderWithProviders(
      <LearningStatisticsPanel session={session} achievements={achievements} />
    );

    expect(screen.getByText('Achievements')).toBeInTheDocument();
    expect(screen.getByText('First Steps')).toBeInTheDocument();
  });

  it('should show consecutive correct/incorrect streak', () => {
    const session = createMockSession({
      consecutiveCorrect: 5,
      consecutiveIncorrect: 0,
    });

    renderWithProviders(<LearningStatisticsPanel session={session} />);

    expect(screen.getByText('Current Streak')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should show adaptive adjustments badge', () => {
    const session = createMockSession({
      adaptiveAdjustments: 3,
    });

    renderWithProviders(<LearningStatisticsPanel session={session} />);

    expect(screen.getByText('3 adjustments')).toBeInTheDocument();
  });
});
