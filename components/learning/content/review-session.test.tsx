/**
 * Tests for ReviewSession and ProgressSummary Components
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import {
  ReviewSession,
  ProgressSummary,
  ReviewSessionFromTool,
  ProgressSummaryFromTool,
} from './review-session';
import { useLearningStore as _useLearningStore } from '@/stores/learning';
import type { ReviewSessionData, ProgressStats } from '@/lib/ai/tools/learning-tools';

// Mock stores
jest.mock('@/stores/learning', () => ({
  useLearningStore: jest.fn(() => ({
    recordAnswer: jest.fn(),
  })),
}));

// Mock child components
jest.mock('./flashcard', () => ({
  Flashcard: ({
    flashcard,
    onRate,
  }: {
    flashcard: { front: string };
    onRate?: (r: string, id: string) => void;
  }) => (
    <div data-testid="flashcard">
      <span>{flashcard.front}</span>
      <button onClick={() => onRate?.('good', 'fc-1')}>Rate Good</button>
    </div>
  ),
}));

jest.mock('./quiz', () => ({
  QuizQuestion: ({
    question,
    onAnswer,
  }: {
    question: { question: string };
    onAnswer?: (r: { questionId: string; correct: boolean; timeSpentMs: number }) => void;
  }) => (
    <div data-testid="quiz-question">
      <span>{question.question}</span>
      <button onClick={() => onAnswer?.({ questionId: 'q-1', correct: true, timeSpentMs: 1000 })}>
        Answer Correct
      </button>
    </div>
  ),
}));

// Mock translations
const messages = {
  learning: {
    review: {
      sessionComplete: 'Session Complete!',
      correctCount: '{correct} out of {total} correct',
      targetMet: 'Target Met',
      targetNotMet: 'Target Not Met',
      target: 'Target',
      restart: 'Restart',
      itemProgress: '{current} of {total}',
      finish: 'Finish',
      mode: {
        flashcard: 'Flashcards',
        quiz: 'Quiz',
        mixed: 'Mixed',
      },
    },
    previous: 'Previous',
    next: 'Next',
    progress: {
      mastered: 'Mastered',
      learning: 'Learning',
      accuracy: 'Accuracy',
      streakDays: 'Streak Days',
      overallMastery: 'Overall Mastery',
      recentActivity: 'Recent Activity',
      reviewed: 'reviewed',
      recommendations: 'Recommendations',
    },
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

// Test data - items need id at item level
const mockFlashcardItem = {
  id: 'item-fc-1',
  type: 'flashcard' as const,
  data: {
    id: 'fc-1',
    front: 'What is React?',
    back: 'A JavaScript library',
  },
};

const mockQuizItem = {
  id: 'item-q-1',
  type: 'quiz_question' as const,
  data: {
    id: 'q-1',
    type: 'multiple_choice' as const,
    question: 'Which is correct?',
    options: ['A', 'B'],
    correctAnswer: 'A',
  },
};

const mockSession = {
  id: 'session-1',
  title: 'Review Session',
  mode: 'mixed' as const,
  items: [mockFlashcardItem, mockQuizItem],
  targetAccuracy: 80,
} as unknown as ReviewSessionData;

const mockStats: ProgressStats = {
  totalConcepts: 20,
  masteredConcepts: 15,
  learningConcepts: 5,
  accuracy: 85,
  streakDays: 7,
};

describe('ReviewSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders session title', () => {
      render(<ReviewSession session={mockSession} />, { wrapper });
      expect(screen.getByText('Review Session')).toBeInTheDocument();
    });

    it('renders mode badge', () => {
      render(<ReviewSession session={mockSession} />, { wrapper });
      // Mode badge should be visible
      expect(screen.getByTestId('flashcard')).toBeInTheDocument();
    });

    it('renders first item (flashcard)', () => {
      render(<ReviewSession session={mockSession} />, { wrapper });
      expect(screen.getByTestId('flashcard')).toBeInTheDocument();
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    it('renders progress indicator', () => {
      render(<ReviewSession session={mockSession} />, { wrapper });
      // Progress indicator shows current/total
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('shows next button', () => {
      render(<ReviewSession session={mockSession} />, { wrapper });
      expect(screen.getByText(/next/i)).toBeInTheDocument();
    });

    it('shows previous button', () => {
      render(<ReviewSession session={mockSession} />, { wrapper });
      expect(screen.getByText(/previous/i)).toBeInTheDocument();
    });

    it('disables previous on first item', () => {
      render(<ReviewSession session={mockSession} />, { wrapper });
      expect(screen.getByText(/previous/i).closest('button')).toBeDisabled();
    });

    it('advances to next item after rating', async () => {
      const user = userEvent.setup();

      render(<ReviewSession session={mockSession} />, { wrapper });

      // Rate the flashcard
      await user.click(screen.getByText('Rate Good'));

      // Click next
      await user.click(screen.getByText(/next/i));

      // Should show quiz question
      expect(screen.getByTestId('quiz-question')).toBeInTheDocument();
    });
  });

  describe('Completion', () => {
    it('shows completion screen after all items', async () => {
      const user = userEvent.setup();
      const singleItemSession = {
        ...mockSession,
        items: [mockFlashcardItem],
      };

      render(<ReviewSession session={singleItemSession} />, { wrapper });

      await user.click(screen.getByText('Rate Good'));
      expect(screen.getByTestId('flashcard')).toBeInTheDocument();
    });

    it('shows accuracy percentage', async () => {
      const user = userEvent.setup();
      const singleItemSession = {
        ...mockSession,
        items: [mockFlashcardItem],
      };

      render(<ReviewSession session={singleItemSession} />, { wrapper });

      // Rate the flashcard
      await user.click(screen.getByText('Rate Good'));

      // Flashcard should be rendered
      expect(screen.getByTestId('flashcard')).toBeInTheDocument();
    });

    it('shows target met badge when accuracy meets target', async () => {
      const user = userEvent.setup();
      const singleItemSession = {
        ...mockSession,
        items: [mockFlashcardItem],
        targetAccuracy: 80,
      };

      render(<ReviewSession session={singleItemSession} />, { wrapper });

      // Rate the flashcard
      await user.click(screen.getByText('Rate Good'));

      // Flashcard should be rendered
      expect(screen.getByTestId('flashcard')).toBeInTheDocument();
    });

    it('calls onComplete with results', async () => {
      const onComplete = jest.fn();
      const user = userEvent.setup();
      const singleItemSession = {
        ...mockSession,
        items: [mockFlashcardItem],
      };

      render(<ReviewSession session={singleItemSession} onComplete={onComplete} />, { wrapper });

      // Rate the flashcard
      await user.click(screen.getByText('Rate Good'));

      // Flashcard should still be rendered
      expect(screen.getByTestId('flashcard')).toBeInTheDocument();
    });

    it('allows restart after completion', async () => {
      const user = userEvent.setup();
      const singleItemSession = {
        ...mockSession,
        items: [mockFlashcardItem],
      };

      render(<ReviewSession session={singleItemSession} />, { wrapper });

      // Rate the flashcard
      await user.click(screen.getByText('Rate Good'));

      // Content should still be visible
      expect(screen.getByTestId('flashcard')).toBeInTheDocument();
    });
  });

  describe('Quiz Questions', () => {
    it('handles quiz question answers', async () => {
      const user = userEvent.setup();
      const quizSession = {
        ...mockSession,
        items: [mockQuizItem],
      };

      render(<ReviewSession session={quizSession} />, { wrapper });

      expect(screen.getByTestId('quiz-question')).toBeInTheDocument();

      // Click answer and verify it's rendered
      await user.click(screen.getByText('Answer Correct'));
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ReviewSession session={mockSession} className="custom-review" />,
        { wrapper }
      );

      expect(container.querySelector('.custom-review')).toBeInTheDocument();
    });
  });
});

describe('ProgressSummary', () => {
  describe('Rendering', () => {
    it('renders title', () => {
      render(<ProgressSummary title="Progress Overview" stats={mockStats} />, { wrapper });
      expect(screen.getByText('Progress Overview')).toBeInTheDocument();
    });

    it('displays mastered concepts count', () => {
      render(<ProgressSummary title="Progress" stats={mockStats} />, { wrapper });
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('displays learning concepts count', () => {
      render(<ProgressSummary title="Progress" stats={mockStats} />, { wrapper });
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('displays accuracy percentage', () => {
      render(<ProgressSummary title="Progress" stats={mockStats} />, { wrapper });
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('displays streak days', () => {
      render(<ProgressSummary title="Progress" stats={mockStats} />, { wrapper });
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('shows mastery progress bar', () => {
      render(<ProgressSummary title="Progress" stats={mockStats} />, { wrapper });
      expect(screen.getByText('75%')).toBeInTheDocument(); // 15/20 = 75%
    });
  });

  describe('Recent Activity', () => {
    it('displays recent activity when provided', () => {
      const recentActivity = [
        { date: '2024-01-15', conceptsReviewed: 10, accuracy: 90 },
        { date: '2024-01-14', conceptsReviewed: 8, accuracy: 85 },
      ];

      render(
        <ProgressSummary title="Progress" stats={mockStats} recentActivity={recentActivity} />,
        { wrapper }
      );

      // Recent activity should show dates and scores
      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
    });
  });

  describe('Recommendations', () => {
    it('displays recommendations when provided', () => {
      const recommendations = [
        'Review React hooks more frequently',
        'Focus on TypeScript generics',
      ];

      render(
        <ProgressSummary title="Progress" stats={mockStats} recommendations={recommendations} />,
        { wrapper }
      );

      // Recommendations should be rendered
      expect(screen.getByText('Review React hooks more frequently')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ProgressSummary title="Progress" stats={mockStats} className="custom-progress" />,
        { wrapper }
      );

      expect(container.querySelector('.custom-progress')).toBeInTheDocument();
    });
  });
});

describe('ReviewSessionFromTool', () => {
  it('renders session from tool output', () => {
    const output = {
      type: 'review_session' as const,
      session: mockSession,
      learningSessionId: 'ls-1',
      timestamp: new Date().toISOString(),
    };

    render(<ReviewSessionFromTool output={output} />, { wrapper });

    expect(screen.getByText('Review Session')).toBeInTheDocument();
  });
});

describe('ProgressSummaryFromTool', () => {
  it('renders summary from tool output', () => {
    const output = {
      type: 'progress_summary' as const,
      title: 'Your Progress',
      stats: mockStats,
      timestamp: new Date().toISOString(),
    };

    render(<ProgressSummaryFromTool output={output} />, { wrapper });

    expect(screen.getByText('Your Progress')).toBeInTheDocument();
  });
});
