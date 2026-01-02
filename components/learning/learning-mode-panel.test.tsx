/**
 * LearningModePanel Tests
 * 
 * Unit tests for the learning mode panel component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LearningModePanel } from './learning-mode-panel';
import { useLearningMode } from '@/hooks/ui';
import type { LearningSession, LearningPhase } from '@/types/learning';
import { DEFAULT_LEARNING_STATISTICS } from '@/types/learning';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Learning Mode',
      noActiveSession: 'No active learning session. Start one to begin guided learning.',
      progress: 'Progress',
      phases: 'Learning Phases',
      'phase.clarification': 'Clarifying your learning goals',
      'phase.deconstruction': 'Breaking down the topic',
      'phase.questioning': 'Exploring through questions',
      'phase.feedback': 'Refining understanding',
      'phase.summary': 'Summarizing learnings',
      goals: 'Learning Goals',
      noGoalsYet: 'No goals defined yet',
      subQuestions: 'Sub-Questions',
      noQuestionsYet: 'No sub-questions identified yet',
      nextPhase: 'Next Phase',
      endSession: 'End Session',
    };
    return translations[key] || key;
  },
}));

// Mock the useLearningMode hook
jest.mock('@/hooks/ui', () => ({
  useLearningMode: jest.fn(),
}));
const mockUseLearningMode = useLearningMode as jest.MockedFunction<typeof useLearningMode>;

// Mock the learning store
jest.mock('@/stores/learning', () => ({
  useLearningStore: jest.fn(() => ({
    getAchievements: jest.fn().mockReturnValue([]),
  })),
}));

const createMockSession = (overrides?: Partial<LearningSession>): LearningSession => ({
  id: 'learning-1',
  sessionId: 'session-1',
  topic: 'Understanding Recursion',
  learningGoals: [
    { id: 'goal-1', description: 'Understand base case', achieved: false },
    { id: 'goal-2', description: 'Understand recursive case', achieved: true, achievedAt: new Date() },
  ],
  currentPhase: 'questioning' as LearningPhase,
  subQuestions: [
    { id: 'sq-1', question: 'What is a base case?', status: 'resolved', hints: [], userAttempts: 2, resolvedAt: new Date() },
    { id: 'sq-2', question: 'What is recursion?', status: 'in_progress', hints: ['Think about self-reference'], userAttempts: 1 },
    { id: 'sq-3', question: 'When to use recursion?', status: 'pending', hints: [], userAttempts: 0 },
  ],
  currentSubQuestionId: 'sq-2',
  progress: 45,
  totalHintsProvided: 1,
  startedAt: new Date(),
  lastActivityAt: new Date(),
  // New enhanced fields
  notes: [],
  concepts: [],
  statistics: { ...DEFAULT_LEARNING_STATISTICS },
  reviewItems: [],
  currentDifficulty: 'intermediate',
  adaptiveAdjustments: 0,
  engagementScore: 50,
  consecutiveCorrect: 0,
  consecutiveIncorrect: 0,
  ...overrides,
});

const createMockHookReturn = (overrides?: Partial<ReturnType<typeof useLearningMode>>) => ({
  learningSession: undefined,
  isLearningActive: false,
  currentPhase: undefined,
  progress: 0,
  subQuestions: [],
  learningGoals: [],
  config: {
    maxHintsPerQuestion: 3,
    hintDelayMessages: 2,
    enableProgressiveHints: true,
    enableEncouragement: true,
    autoGenerateSummary: true,
    includeKeyTakeaways: true,
    enableAdaptiveDifficulty: true,
    difficultyAdjustThreshold: 3,
    enableSpacedRepetition: true,
    defaultReviewIntervalDays: 1,
    enableAutoNotes: false,
    autoHighlightInsights: true,
    enableAIAnalysis: true,
    analysisDepth: 'standard' as const,
  },
  startLearning: jest.fn(),
  endLearning: jest.fn(),
  resetLearning: jest.fn(),
  advancePhase: jest.fn(),
  setPhase: jest.fn(),
  addSubQuestion: jest.fn(),
  resolveSubQuestion: jest.fn(),
  setCurrentSubQuestion: jest.fn(),
  recordAttempt: jest.fn(),
  addHint: jest.fn(),
  addGoal: jest.fn(),
  achieveGoal: jest.fn(),
  updateTopic: jest.fn(),
  updateBackground: jest.fn(),
  getSystemPrompt: jest.fn(),
  analyzeResponse: jest.fn(),
  checkPhaseTransition: jest.fn(),
  extractQuestionsFromResponse: jest.fn(),
  checkShouldHint: jest.fn(),
  getProgressReport: jest.fn().mockReturnValue(''),
  getSessionSummary: jest.fn().mockReturnValue(''),
  getProgressSummary: jest.fn().mockReturnValue(''),
  getStatusLine: jest.fn().mockReturnValue('Exploring • 50%'),
  getFormattedGoals: jest.fn().mockReturnValue(''),
  getFormattedSubQuestions: jest.fn().mockReturnValue(''),
  getAdaptivePrompt: jest.fn().mockReturnValue(''),
  getCelebrationMessage: jest.fn().mockReturnValue('Great job!'),
  getEncouragement: jest.fn().mockReturnValue("You're on the right track!"),
  getContextualHint: jest.fn().mockReturnValue(''),
  updateConfig: jest.fn(),
  ...overrides,
});

describe('LearningModePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('No Active Session', () => {
    it('should display no active session message', () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());

      render(<LearningModePanel />);

      expect(screen.getByText('No active learning session. Start one to begin guided learning.')).toBeInTheDocument();
    });
  });

  describe('Active Session', () => {
    it('should display session topic', () => {
      const session = createMockSession();
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: session.currentPhase,
          progress: session.progress,
          subQuestions: session.subQuestions,
          learningGoals: session.learningGoals,
        })
      );

      render(<LearningModePanel />);

      expect(screen.getByText('Understanding Recursion')).toBeInTheDocument();
    });

    it('should display progress percentage', () => {
      const session = createMockSession({ progress: 45 });
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          progress: 45,
          currentPhase: session.currentPhase,
          subQuestions: session.subQuestions,
          learningGoals: session.learningGoals,
        })
      );

      render(<LearningModePanel />);

      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should display learning goals count', () => {
      const session = createMockSession();
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: session.currentPhase,
          progress: session.progress,
          subQuestions: session.subQuestions,
          learningGoals: session.learningGoals,
        })
      );

      render(<LearningModePanel />);

      // Should show achieved/total goals count
      expect(screen.getByText('1/2')).toBeInTheDocument();
    });

    it('should display sub-questions count', () => {
      const session = createMockSession();
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: session.currentPhase,
          progress: session.progress,
          subQuestions: session.subQuestions,
          learningGoals: session.learningGoals,
        })
      );

      render(<LearningModePanel />);

      // Should show resolved/total sub-questions count
      expect(screen.getByText('1/3')).toBeInTheDocument();
    });

    it('should call advancePhase when Next Phase button is clicked', () => {
      const advancePhaseMock = jest.fn();
      const session = createMockSession();
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: session.currentPhase,
          progress: session.progress,
          subQuestions: session.subQuestions,
          learningGoals: session.learningGoals,
          advancePhase: advancePhaseMock,
        })
      );

      render(<LearningModePanel />);

      const nextPhaseButton = screen.getByText('Next Phase');
      fireEvent.click(nextPhaseButton);

      expect(advancePhaseMock).toHaveBeenCalled();
    });

    it('should call endLearning when End Session button is clicked', () => {
      const endLearningMock = jest.fn();
      const session = createMockSession();
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: session.currentPhase,
          progress: session.progress,
          subQuestions: session.subQuestions,
          learningGoals: session.learningGoals,
          endLearning: endLearningMock,
        })
      );

      render(<LearningModePanel />);

      const endSessionButton = screen.getByText('End Session');
      fireEvent.click(endSessionButton);

      expect(endLearningMock).toHaveBeenCalled();
    });

    it('should not show Next Phase button when in summary phase', () => {
      const session = createMockSession({ currentPhase: 'summary' });
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: 'summary',
          progress: session.progress,
          subQuestions: session.subQuestions,
          learningGoals: session.learningGoals,
        })
      );

      render(<LearningModePanel />);

      expect(screen.queryByText('Next Phase')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const onCloseMock = jest.fn();
      const session = createMockSession();
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: session.currentPhase,
          progress: session.progress,
          subQuestions: session.subQuestions,
          learningGoals: session.learningGoals,
        })
      );

      render(<LearningModePanel onClose={onCloseMock} />);

      // Find and click the close button (X icon)
      const closeButton = screen.getByRole('button', { name: '' });
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(onCloseMock).toHaveBeenCalled();
      }
    });
  });

  describe('Goal Display', () => {
    it('should show no goals message when no goals defined', () => {
      const session = createMockSession({ learningGoals: [] });
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: session.currentPhase,
          progress: session.progress,
          subQuestions: session.subQuestions,
          learningGoals: [],
        })
      );

      render(<LearningModePanel />);

      expect(screen.getByText('No goals defined yet')).toBeInTheDocument();
    });

    it('should display goal descriptions', () => {
      const session = createMockSession();
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: session.currentPhase,
          progress: session.progress,
          subQuestions: session.subQuestions,
          learningGoals: session.learningGoals,
        })
      );

      render(<LearningModePanel />);

      expect(screen.getByText('Understand base case')).toBeInTheDocument();
      expect(screen.getByText('Understand recursive case')).toBeInTheDocument();
    });
  });

  describe('Sub-Questions Display', () => {
    it('should show no questions message when no sub-questions', () => {
      const session = createMockSession({ subQuestions: [] });
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: session.currentPhase,
          progress: session.progress,
          subQuestions: [],
          learningGoals: session.learningGoals,
        })
      );

      render(<LearningModePanel />);

      expect(screen.getByText('No sub-questions identified yet')).toBeInTheDocument();
    });

    it('should display sub-question text', () => {
      const session = createMockSession();
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: session.currentPhase,
          progress: session.progress,
          subQuestions: session.subQuestions,
          learningGoals: session.learningGoals,
        })
      );

      render(<LearningModePanel />);

      expect(screen.getByText('What is a base case?')).toBeInTheDocument();
      expect(screen.getByText('What is recursion?')).toBeInTheDocument();
      expect(screen.getByText('When to use recursion?')).toBeInTheDocument();
    });
  });

  describe('Tabs Navigation', () => {
    it('should render all four tabs', () => {
      const session = createMockSession();
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: session.currentPhase,
          progress: session.progress,
          subQuestions: session.subQuestions,
          learningGoals: session.learningGoals,
        })
      );

      render(<LearningModePanel />);

      // Use role to find tab buttons specifically
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(4);
      expect(screen.getByRole('tab', { name: /stats/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /notes/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();
    });

    it('should allow clicking on tabs without errors', () => {
      const session = createMockSession();
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: session.currentPhase,
          progress: session.progress,
          subQuestions: session.subQuestions,
          learningGoals: session.learningGoals,
        })
      );

      render(<LearningModePanel />);

      // Should be able to click all tabs without errors
      const statsTab = screen.getByRole('tab', { name: /stats/i });
      const notesTab = screen.getByRole('tab', { name: /notes/i });
      const historyTab = screen.getByRole('tab', { name: /history/i });

      expect(() => fireEvent.click(statsTab)).not.toThrow();
      expect(() => fireEvent.click(notesTab)).not.toThrow();
      expect(() => fireEvent.click(historyTab)).not.toThrow();
    });
  });

  describe('Enhanced Session Data', () => {
    it('should render with notes in session', () => {
      const session = createMockSession({
        notes: [
          { id: 'n1', content: 'Important insight', createdAt: new Date(), isHighlight: false },
        ],
      });
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: session.currentPhase,
          progress: session.progress,
          subQuestions: session.subQuestions,
          learningGoals: session.learningGoals,
        })
      );

      // Should render without error
      const { container } = render(<LearningModePanel />);
      expect(container).toBeInTheDocument();
    });

    it('should render with concepts in session', () => {
      const session = createMockSession({
        concepts: [
          {
            id: 'c1',
            name: 'Recursion',
            masteryStatus: 'learning',
            masteryScore: 50,
            reviewCount: 2,
            correctAnswers: 3,
            totalAttempts: 6,
          },
        ],
      });
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: session.currentPhase,
          progress: session.progress,
          subQuestions: session.subQuestions,
          learningGoals: session.learningGoals,
        })
      );

      // Should render without error
      const { container } = render(<LearningModePanel />);
      expect(container).toBeInTheDocument();
    });

    it('should render with achievements', () => {
      const session = createMockSession();
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({
          learningSession: session,
          isLearningActive: true,
          currentPhase: session.currentPhase,
          progress: session.progress,
          subQuestions: session.subQuestions,
          learningGoals: session.learningGoals,
        })
      );

      // Should render without error
      const { container } = render(<LearningModePanel />);
      expect(container).toBeInTheDocument();
    });
  });
});
