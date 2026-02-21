/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpeedPassPage from './page';
import type { StoredFeatureNavigationContext } from '@/lib/ai/routing/feature-navigation-context';

const mockPush = jest.fn();
const mockModeDialog = jest.fn();
let mockCtxKey: string | null = null;
const mockConsumeFeatureNavigationContext = jest.fn<
  StoredFeatureNavigationContext | null,
  [string | null | undefined]
>(() => null);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: () => mockCtxKey }),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/hooks/learning', () => ({
  useSpeedPassUser: () => ({
    profile: {
      displayName: 'Test User',
      preferredMode: 'speed',
      dailyStudyTarget: 60,
    },
    progress: {
      level: 1,
      badges: [],
    },
    todayProgress: {
      studyMinutes: 0,
      targetMinutes: 60,
      percentage: 0,
    },
    isDailyGoalMet: false,
  }),
}));

jest.mock('@/lib/ai/routing', () => ({
  consumeFeatureNavigationContext: (ctxKey: string | null | undefined) =>
    mockConsumeFeatureNavigationContext(ctxKey),
}));

jest.mock('@/lib/learning/speedpass', () => ({
  detectSpeedLearningMode: jest.fn(() => ({
    detected: true,
    recommendedMode: 'speed',
    reasonZh: 'mock',
  })),
}));

jest.mock('@/components/speedpass/textbook-library', () => ({
  TextbookLibrary: () => <div data-testid="textbook-library">library</div>,
  TextbookCardSkeleton: () => <div data-testid="textbook-skeleton">skeleton</div>,
}));

jest.mock('@/components/speedpass/analytics-dashboard', () => ({
  AnalyticsDashboard: () => <div data-testid="analytics-dashboard">analytics</div>,
}));

jest.mock('@/components/speedpass/quiz-interface', () => ({
  QuizInterface: () => <div data-testid="quiz-interface">quiz</div>,
}));

jest.mock('@/components/speedpass/mode-selector-dialog', () => ({
  ModeSelectorDialog: (props: any) => {
    mockModeDialog(props);
    return (
      <div
        data-testid="mode-selector-dialog"
        data-open={String(Boolean(props.open))}
        data-initial-mode={props.initialMode || ''}
      />
    );
  },
}));

jest.mock('@/components/speedpass/speedpass-settings-dialog', () => ({
  SpeedPassSettingsDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="settings-dialog">settings-open</div> : null,
}));

const mockStore = {
  textbooks: {
    tb1: {
      id: 'tb1',
      name: 'Book 1',
      parseStatus: 'completed',
      source: 'user_upload',
      isPublic: false,
      usageCount: 0,
      author: 'A',
      publisher: 'P',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  tutorials: {},
  studySessions: {},
  currentSessionId: null,
  wrongQuestions: {},
  globalStats: {
    totalStudyTimeMs: 0,
    sessionsCompleted: 0,
    tutorialsCompleted: 0,
    quizzesCompleted: 0,
    totalQuestionsAttempted: 0,
    totalQuestionsCorrect: 0,
    averageAccuracy: 0,
    currentStreak: 0,
    longestStreak: 0,
  },
  currentTutorialId: null,
  textbookKnowledgePoints: { tb1: [] },
  textbookQuestions: { tb1: [] },
  isLoading: false,
  createTutorial: jest.fn(async () => ({
    id: 'tutorial-1',
    totalEstimatedMinutes: 120,
  })),
  setCurrentTutorial: jest.fn(),
  deleteTutorial: jest.fn(),
  markWrongQuestionReviewed: jest.fn(),
};

jest.mock('@/stores/learning/speedpass-store', () => ({
  useSpeedPassStore: jest.fn(() => mockStore),
}));

describe('SpeedPassPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCtxKey = null;
    mockConsumeFeatureNavigationContext.mockReset();
    mockConsumeFeatureNavigationContext.mockReturnValue(null);
  });

  it('renders speedpass tabs and textbook library', () => {
    render(<SpeedPassPage />);

    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /tabs.overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /tabs.textbooks/i })).toBeInTheDocument();
  });

  it('opens settings dialog from header action', async () => {
    const user = userEvent.setup();
    render(<SpeedPassPage />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByTestId('settings-dialog')).toBeInTheDocument();
  });

  it('opens mode dialog with selected quick mode', async () => {
    const user = userEvent.setup();
    render(<SpeedPassPage />);

    await user.click(screen.getByText('modes.rapid.title'));

    const modeDialog = screen.getByTestId('mode-selector-dialog');
    expect(modeDialog).toHaveAttribute('data-open', 'true');
    expect(modeDialog).toHaveAttribute('data-initial-mode', 'extreme');
  });

  it('consumes speedpass navigation context with nested speedpassContext payload', async () => {
    mockCtxKey = 'feature-nav-context-test';
    mockConsumeFeatureNavigationContext.mockReturnValue({
      from: '/chat',
      timestamp: Date.now(),
      message: '明天考试，帮我速通',
      speedpassContext: {
        textbookId: 'tb1',
        availableTimeMinutes: 120,
        targetScore: 78,
        examDate: '2026-03-01T00:00:00.000Z',
        recommendedMode: 'comprehensive',
      },
    });

    render(<SpeedPassPage />);

    await waitFor(() => {
      const modeDialog = screen.getByTestId('mode-selector-dialog');
      expect(modeDialog).toHaveAttribute('data-open', 'true');
      expect(modeDialog).toHaveAttribute('data-initial-mode', 'comprehensive');
    });
  });
});
