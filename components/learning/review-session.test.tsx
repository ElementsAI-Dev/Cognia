/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { 
  ReviewSession, 
  ProgressSummary, 
  ReviewSessionFromTool, 
  ProgressSummaryFromTool 
} from './review-session';
import type { 
  ReviewSessionData, 
  ReviewSessionToolOutput, 
  ProgressSummaryToolOutput,
  ProgressStats,
} from '@/lib/ai/tools/learning-tools';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'review.sessionComplete': 'Session Complete!',
      'review.correctCount': `${params?.correct} of ${params?.total} correct`,
      'review.targetMet': 'Target Met',
      'review.targetNotMet': 'Target Not Met',
      'review.target': 'Target',
      'review.restart': 'Restart',
      'review.itemProgress': `${params?.current} of ${params?.total}`,
      'review.finish': 'Finish',
      'review.mode.standard': 'Standard',
      'review.mode.spaced_repetition': 'Spaced Repetition',
      'review.mode.cramming': 'Cramming',
      'progress.mastered': 'Mastered',
      'progress.learning': 'Learning',
      'progress.accuracy': 'Accuracy',
      'progress.streakDays': 'Day Streak',
      'progress.overallMastery': 'Overall Mastery',
      'progress.recentActivity': 'Recent Activity',
      'progress.reviewed': 'reviewed',
      'progress.recommendations': 'Recommendations',
      'previous': 'Previous',
      'next': 'Next',
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant, size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant} data-size={size} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 data-testid="card-title" className={className}>{children}</h3>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value?: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className} role="progressbar" />
  ),
}));

// Mock learning store
const mockRecordAnswer = jest.fn();

jest.mock('@/stores/learning', () => ({
  useLearningStore: () => ({
    recordAnswer: mockRecordAnswer,
  }),
}));

// Mock child components
jest.mock('./flashcard', () => ({
  Flashcard: ({ flashcard, onRate }: { flashcard: { id: string; front: string }; onRate?: (rating: string, id: string) => void }) => (
    <div data-testid="flashcard">
      <span>{flashcard.front}</span>
      <button onClick={() => onRate?.('good', flashcard.id)}>Rate Good</button>
    </div>
  ),
}));

jest.mock('./quiz', () => ({
  QuizQuestion: ({ question, onAnswer }: { question: { id: string; question: string }; onAnswer?: (result: { questionId: string; correct: boolean; timeSpentMs: number }) => void }) => (
    <div data-testid="quiz-question">
      <span>{question.question}</span>
      <button onClick={() => onAnswer?.({ questionId: question.id, correct: true, timeSpentMs: 1000 })}>
        Answer Correct
      </button>
    </div>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  BookOpen: () => <span data-testid="icon-book">📖</span>,
  Trophy: () => <span data-testid="icon-trophy">🏆</span>,
  Target: () => <span data-testid="icon-target">🎯</span>,
  BarChart3: () => <span data-testid="icon-chart">📊</span>,
  ChevronLeft: () => <span data-testid="icon-chevron-left">←</span>,
  ChevronRight: () => <span data-testid="icon-chevron-right">→</span>,
  RotateCcw: () => <span data-testid="icon-rotate">↻</span>,
  Sparkles: () => <span data-testid="icon-sparkles">✨</span>,
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('ReviewSession', () => {
  const defaultSession: ReviewSessionData = {
    id: 'rs-1',
    title: 'Daily Review',
    items: [
      {
        id: 'item-1',
        type: 'flashcard',
        data: { id: 'fc-1', front: 'Question 1', back: 'Answer 1' },
      },
      {
        id: 'item-2',
        type: 'quiz_question',
        data: { id: 'q-1', question: 'Quiz Question 1', type: 'short_answer', correctAnswer: 'answer' },
      },
    ],
    mode: 'spaced_repetition',
    targetAccuracy: 80,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders session title', () => {
    render(<ReviewSession session={defaultSession} />);
    
    expect(screen.getByText('Daily Review')).toBeInTheDocument();
  });

  it('renders mode badge', () => {
    render(<ReviewSession session={defaultSession} />);
    
    expect(screen.getByText('Spaced Repetition')).toBeInTheDocument();
  });

  it('renders progress indicator', () => {
    render(<ReviewSession session={defaultSession} />);
    
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders first item as flashcard', () => {
    render(<ReviewSession session={defaultSession} />);
    
    expect(screen.getByTestId('flashcard')).toBeInTheDocument();
    expect(screen.getByText('Question 1')).toBeInTheDocument();
  });

  it('shows navigation buttons', () => {
    render(<ReviewSession session={defaultSession} />);
    
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('disables previous button on first item', () => {
    render(<ReviewSession session={defaultSession} />);
    
    const previousButton = screen.getByText('Previous').closest('button');
    expect(previousButton).toBeDisabled();
  });

  it('disables next button until item is completed', () => {
    render(<ReviewSession session={defaultSession} />);
    
    const nextButton = screen.getByText('Next').closest('button');
    expect(nextButton).toBeDisabled();
  });

  it('enables next button after rating flashcard', () => {
    render(<ReviewSession session={defaultSession} />);
    
    // Rate the flashcard
    fireEvent.click(screen.getByText('Rate Good'));
    
    const nextButton = screen.getByText('Next').closest('button');
    expect(nextButton).not.toBeDisabled();
  });

  it('advances to next item when next is clicked', async () => {
    render(<ReviewSession session={defaultSession} />);
    
    // Rate first item
    fireEvent.click(screen.getByText('Rate Good'));
    
    // Click next
    fireEvent.click(screen.getByText('Next'));
    
    await waitFor(() => {
      expect(screen.getByTestId('quiz-question')).toBeInTheDocument();
      expect(screen.getByText('Quiz Question 1')).toBeInTheDocument();
    });
  });

  it('shows completion screen after all items', async () => {
    const onComplete = jest.fn();
    
    render(<ReviewSession session={defaultSession} onComplete={onComplete} />);
    
    // Complete first item
    fireEvent.click(screen.getByText('Rate Good'));
    fireEvent.click(screen.getByText('Next'));
    
    // Complete second item
    await waitFor(() => {
      fireEvent.click(screen.getByText('Answer Correct'));
    });
    
    // Finish
    await waitFor(() => {
      fireEvent.click(screen.getByText('Finish'));
    });
    
    await waitFor(() => {
      expect(screen.getByText('Session Complete!')).toBeInTheDocument();
    });
  });

  it('shows accuracy on completion', async () => {
    render(<ReviewSession session={defaultSession} />);
    
    // Complete both items correctly
    fireEvent.click(screen.getByText('Rate Good'));
    fireEvent.click(screen.getByText('Next'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Answer Correct'));
    });
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Finish'));
    });
    
    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('2 of 2 correct')).toBeInTheDocument();
    });
  });

  it('shows target met/not met badge', async () => {
    render(<ReviewSession session={defaultSession} />);
    
    // Complete both items correctly (100% accuracy, target is 80%)
    fireEvent.click(screen.getByText('Rate Good'));
    fireEvent.click(screen.getByText('Next'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Answer Correct'));
    });
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Finish'));
    });
    
    await waitFor(() => {
      expect(screen.getByText('Target Met')).toBeInTheDocument();
    });
  });

  it('shows restart button on completion', async () => {
    render(<ReviewSession session={defaultSession} />);
    
    fireEvent.click(screen.getByText('Rate Good'));
    fireEvent.click(screen.getByText('Next'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Answer Correct'));
    });
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Finish'));
    });
    
    await waitFor(() => {
      expect(screen.getByText('Restart')).toBeInTheDocument();
    });
  });

  it('calls onComplete with results', async () => {
    const onComplete = jest.fn();
    
    render(<ReviewSession session={defaultSession} onComplete={onComplete} />);
    
    fireEvent.click(screen.getByText('Rate Good'));
    fireEvent.click(screen.getByText('Next'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Answer Correct'));
    });
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Finish'));
    });
    
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
        totalItems: 2,
        correctCount: 2,
        accuracy: 100,
        results: expect.any(Array),
        timeSpentMs: expect.any(Number),
      }));
    });
  });

  it('calls learning store recordAnswer when item is completed', () => {
    render(<ReviewSession session={defaultSession} learningSessionId="learning-1" />);
    
    fireEvent.click(screen.getByText('Rate Good'));
    
    expect(mockRecordAnswer).toHaveBeenCalledWith('learning-1', true, expect.any(Number));
  });
});

describe('ProgressSummary', () => {
  const defaultStats: ProgressStats = {
    totalConcepts: 50,
    masteredConcepts: 30,
    learningConcepts: 15,
    accuracy: 85,
    streakDays: 7,
    timeSpentMinutes: 120,
  };

  it('renders title', () => {
    render(<ProgressSummary title="My Progress" stats={defaultStats} />);
    
    expect(screen.getByText('My Progress')).toBeInTheDocument();
  });

  it('renders stat cards', () => {
    render(<ProgressSummary title="Progress" stats={defaultStats} />);
    
    expect(screen.getByText('30')).toBeInTheDocument(); // masteredConcepts
    expect(screen.getByText('15')).toBeInTheDocument(); // learningConcepts
    expect(screen.getByText('85%')).toBeInTheDocument(); // accuracy
    expect(screen.getByText('7')).toBeInTheDocument(); // streakDays
  });

  it('renders stat labels', () => {
    render(<ProgressSummary title="Progress" stats={defaultStats} />);
    
    expect(screen.getByText('Mastered')).toBeInTheDocument();
    expect(screen.getByText('Learning')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Day Streak')).toBeInTheDocument();
  });

  it('renders mastery progress bar', () => {
    render(<ProgressSummary title="Progress" stats={defaultStats} />);
    
    expect(screen.getByText('Overall Mastery')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument(); // 30/50 = 60%
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders recent activity when provided', () => {
    const recentActivity = [
      { date: '2024-01-15', conceptsReviewed: 10, accuracy: 90 },
      { date: '2024-01-14', conceptsReviewed: 8, accuracy: 75 },
    ];
    
    render(
      <ProgressSummary 
        title="Progress" 
        stats={defaultStats} 
        recentActivity={recentActivity}
      />
    );
    
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
    expect(screen.getByText('10 reviewed')).toBeInTheDocument();
  });

  it('renders recommendations when provided', () => {
    const recommendations = [
      'Review JavaScript basics',
      'Practice React hooks',
    ];
    
    render(
      <ProgressSummary 
        title="Progress" 
        stats={defaultStats} 
        recommendations={recommendations}
      />
    );
    
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Review JavaScript basics')).toBeInTheDocument();
    expect(screen.getByText('Practice React hooks')).toBeInTheDocument();
  });

  it('handles zero total concepts gracefully', () => {
    const emptyStats: ProgressStats = {
      totalConcepts: 0,
      masteredConcepts: 0,
      learningConcepts: 0,
      accuracy: 0,
    };
    
    render(<ProgressSummary title="Progress" stats={emptyStats} />);
    
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});

describe('ReviewSessionFromTool', () => {
  it('renders review session from tool output', () => {
    const toolOutput: ReviewSessionToolOutput = {
      type: 'review_session',
      session: {
        id: 'rs-1',
        title: 'Tool Review Session',
        items: [
          { id: '1', type: 'flashcard', data: { id: 'fc-1', front: 'Q', back: 'A' } },
        ],
      },
      learningSessionId: 'learning-1',
      timestamp: new Date().toISOString(),
    };
    
    render(<ReviewSessionFromTool output={toolOutput} />);
    
    expect(screen.getByText('Tool Review Session')).toBeInTheDocument();
  });
});

describe('ProgressSummaryFromTool', () => {
  it('renders progress summary from tool output', () => {
    const toolOutput: ProgressSummaryToolOutput = {
      type: 'progress_summary',
      title: 'Tool Progress',
      stats: {
        totalConcepts: 20,
        masteredConcepts: 10,
        learningConcepts: 5,
        accuracy: 80,
      },
      timestamp: new Date().toISOString(),
    };
    
    render(<ProgressSummaryFromTool output={toolOutput} />);
    
    expect(screen.getByText('Tool Progress')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });
});
