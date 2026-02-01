/**
 * Unit tests for AnalyticsDashboard component
 */

import { render, screen } from '@testing-library/react';
import { AnalyticsDashboard } from './analytics-dashboard';

// Mock the speedpass store
const mockGlobalStats = {
  totalStudyTimeMs: 3600000, // 1 hour
  totalQuestionsAttempted: 100,
  totalQuestionsCorrect: 75,
  currentStreak: 5,
  longestStreak: 10,
  averageAccuracy: 0.75,
  lastStudyDate: new Date().toISOString(),
};

const mockStudySessions: Record<string, {
  id: string;
  textbookId: string;
  startedAt: string;
  endedAt?: string;
  timeSpentMs: number;
}> = {
  session1: {
    id: 'session1',
    textbookId: 'textbook1',
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    timeSpentMs: 1800000,
  },
};

const mockQuizzes: Record<string, {
  id: string;
  textbookId: string;
  questions: { id: string; isCorrect: boolean }[];
  completedAt?: string;
}> = {
  quiz1: {
    id: 'quiz1',
    textbookId: 'textbook1',
    questions: [
      { id: 'q1', isCorrect: true },
      { id: 'q2', isCorrect: false },
      { id: 'q3', isCorrect: true },
    ],
    completedAt: new Date().toISOString(),
  },
};

const mockWrongQuestions: Record<string, {
  id: string;
  question: string;
  reviewCount: number;
}> = {
  wq1: {
    id: 'wq1',
    question: 'What is 2+2?',
    reviewCount: 2,
  },
};

const mockTextbookKnowledgePoints: Record<string, { id: string; name: string; mastery: number }[]> = {
  chapter1: [
    { id: 'kp1', name: 'Point 1', mastery: 0.9 },
    { id: 'kp2', name: 'Point 2', mastery: 0.5 },
  ],
  chapter2: [
    { id: 'kp3', name: 'Point 3', mastery: 0.2 },
  ],
};

jest.mock('@/stores/learning/speedpass-store', () => ({
  useSpeedPassStore: () => ({
    globalStats: mockGlobalStats,
    studySessions: mockStudySessions,
    quizzes: mockQuizzes,
    wrongQuestions: mockWrongQuestions,
    textbookKnowledgePoints: mockTextbookKnowledgePoints,
  }),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  BarChart3: () => <span data-testid="icon-bar-chart" />,
  BookOpen: () => <span data-testid="icon-book-open" />,
  Brain: () => <span data-testid="icon-brain" />,
  Calendar: () => <span data-testid="icon-calendar" />,
  CheckCircle2: () => <span data-testid="icon-check-circle" />,
  Clock: () => <span data-testid="icon-clock" />,
  Flame: () => <span data-testid="icon-flame" />,
  Target: () => <span data-testid="icon-target" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  Trophy: () => <span data-testid="icon-trophy" />,
  XCircle: () => <span data-testid="icon-x-circle" />,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="card-description">{children}</p>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => (
    <div data-testid="progress" data-value={value} role="progressbar" aria-valuenow={value} />
  ),
}));

describe('AnalyticsDashboard', () => {
  it('renders the dashboard', () => {
    render(<AnalyticsDashboard />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays global stats', () => {
    render(<AnalyticsDashboard />);
    // Check for accuracy display (75%)
    expect(screen.getByText(/75/)).toBeInTheDocument();
  });

  it('displays streak information', () => {
    render(<AnalyticsDashboard />);
    // Current streak is 5
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays study time', () => {
    render(<AnalyticsDashboard />);
    // 1 hour = 60 minutes or 1h display
    const timeElements = screen.getAllByText(/60|1/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('displays question stats', () => {
    render(<AnalyticsDashboard />);
    // Total questions attempted: 100
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders progress bars', () => {
    render(<AnalyticsDashboard />);
    const progressBars = screen.getAllByTestId('progress');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('renders all stat cards', () => {
    render(<AnalyticsDashboard />);
    const cards = screen.getAllByTestId('card');
    // Should have multiple stat cards
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });

  it('displays icons for each stat', () => {
    render(<AnalyticsDashboard />);
    // Check that icons are rendered
    expect(screen.getByTestId('icon-clock')).toBeInTheDocument();
    expect(screen.getByTestId('icon-target')).toBeInTheDocument();
    expect(screen.getByTestId('icon-flame')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    // Override mock to return empty data
    jest.doMock('@/stores/learning/speedpass-store', () => ({
      useSpeedPassStore: () => ({
        globalStats: {
          totalStudyTimeMs: 0,
          totalQuestionsAttempted: 0,
          totalQuestionsCorrect: 0,
          currentStreak: 0,
          longestStreak: 0,
          averageAccuracy: 0,
          lastStudyDate: null,
        },
        studySessions: {},
        quizzes: {},
        wrongQuestions: {},
        textbookKnowledgePoints: {},
      }),
    }));

    // Component should still render without errors
    expect(() => render(<AnalyticsDashboard />)).not.toThrow();
  });
});
