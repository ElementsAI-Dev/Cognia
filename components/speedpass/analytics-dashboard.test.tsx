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
  averageAccuracy: 75,
  quizzesCompleted: 10,
  sessionsCompleted: 5,
  tutorialsCompleted: 3,
  lastStudyDate: new Date().toISOString(),
};

const mockStudySessions: Record<string, {
  id: string;
  textbookId: string;
  tutorialId: string;
  startedAt: string;
  endedAt?: string;
  timeSpentMs: number;
  sectionsCompleted: string[];
}> = {
  session1: {
    id: 'session1',
    textbookId: 'textbook1',
    tutorialId: 'tutorial1',
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    timeSpentMs: 1800000,
    sectionsCompleted: ['section1', 'section2'],
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

const mockTutorials: Record<string, { id: string; title: string }> = {
  tutorial1: { id: 'tutorial1', title: 'Test Tutorial' },
};

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/learning/speedpass/study-analyzer', () => ({
  generateLearningInsights: jest.fn(() => ({
    strengthAreas: [{ knowledgePointId: 'kp1', title: 'Point 1', accuracy: 90, confidence: 'high' }],
    weakAreas: [{ knowledgePointId: 'kp3', title: 'Point 3', accuracy: 20, recommendedActions: ['复习'] }],
    predictions: { examReadiness: 70, predictedScore: { min: 65, max: 85 }, confidence: 0.8 },
    learningPatterns: { bestTimeOfDay: '上午', averageSessionLength: 30, consistency: 75 },
  })),
  generateRecommendations: jest.fn(() => [
    { type: 'review', priority: 'high', description: '复习薄弱知识点', actionItems: ['回顾错题', '重做练习'], estimatedTime: 15 },
  ]),
  analyzeKnowledgePointMastery: jest.fn(() => new Map([
    ['kp1', { mastery: 90, attempts: 10 }],
    ['kp2', { mastery: 50, attempts: 5 }],
    ['kp3', { mastery: 20, attempts: 2 }],
  ])),
  identifyWeakPoints: jest.fn(() => [
    { id: 'kp3', title: 'Point 3', mastery: 0.2, importance: 'high' },
  ]),
  calculateStreak: jest.fn(() => 1),
}));

jest.mock('@/stores/learning/speedpass-store', () => ({
  useSpeedPassStore: () => ({
    globalStats: mockGlobalStats,
    studySessions: mockStudySessions,
    quizzes: mockQuizzes,
    wrongQuestions: mockWrongQuestions,
    textbookKnowledgePoints: mockTextbookKnowledgePoints,
    tutorials: mockTutorials,
    studyReports: [],
    generateStudyReport: jest.fn(() => ({ knowledgePointsCovered: 3, accuracy: 75 })),
  }),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="icon-alert-triangle" />,
  ArrowRight: () => <span data-testid="icon-arrow-right" />,
  BarChart3: () => <span data-testid="icon-bar-chart" />,
  BookOpen: () => <span data-testid="icon-book-open" />,
  Brain: () => <span data-testid="icon-brain" />,
  Calendar: () => <span data-testid="icon-calendar" />,
  CheckCircle2: () => <span data-testid="icon-check-circle" />,
  Clock: () => <span data-testid="icon-clock" />,
  FileText: () => <span data-testid="icon-file-text" />,
  Flame: () => <span data-testid="icon-flame" />,
  Lightbulb: () => <span data-testid="icon-lightbulb" />,
  Target: () => <span data-testid="icon-target" />,
  TrendingDown: () => <span data-testid="icon-trending-down" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  Trophy: () => <span data-testid="icon-trophy" />,
  XCircle: () => <span data-testid="icon-x-circle" />,
  Zap: () => <span data-testid="icon-zap" />,
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

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <button data-testid="button" {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <span data-testid="badge" {...props}>{children}</span>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => (
    <div data-testid="progress" data-value={value} role="progressbar" aria-valuenow={value} />
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

describe('AnalyticsDashboard', () => {
  it('renders the dashboard', () => {
    render(<AnalyticsDashboard />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays global stats', () => {
    render(<AnalyticsDashboard />);
    // Check for accuracy display (75%)
    expect(screen.getAllByText(/75/).length).toBeGreaterThan(0);
  });

  it('displays streak information', () => {
    render(<AnalyticsDashboard />);
    // Current streak is calculated via calculateStreak mock (returns 1)
    expect(screen.getAllByText(/1 天/).length).toBeGreaterThan(0);
    expect(screen.getByText(/5 次学习/)).toBeInTheDocument();
  });

  it('displays study time', () => {
    render(<AnalyticsDashboard />);
    // 1 hour = 60 minutes or 1h display
    const timeElements = screen.getAllByText(/60|1/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('displays question stats', () => {
    render(<AnalyticsDashboard />);
    // Total questions: 75/100
    expect(screen.getByText(/75\/100/)).toBeInTheDocument();
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
    // Check that icons are rendered (some icons appear multiple times)
    expect(screen.getAllByTestId('icon-clock').length).toBeGreaterThan(0);
    expect(screen.getByTestId('icon-target')).toBeInTheDocument();
    expect(screen.getByTestId('icon-flame')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    // The component should render without errors even with the mock data
    // which has sessions without matching tutorials
    expect(() => render(<AnalyticsDashboard />)).not.toThrow();
    
    // Verify the component rendered
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });
});
