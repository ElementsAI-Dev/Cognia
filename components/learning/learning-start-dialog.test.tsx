/**
 * LearningStartDialog Tests
 * 
 * Unit tests for the learning start dialog component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LearningStartDialog } from './learning-start-dialog';
import { useLearningMode } from '@/hooks/ui';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'startDialog.title': 'Start Learning Session',
      'startDialog.description': 'Define what you want to learn.',
      'startDialog.topic': 'What do you want to learn?',
      'startDialog.topicPlaceholder': 'e.g., How does recursion work?',
      'startDialog.background': 'What do you already know?',
      'startDialog.backgroundPlaceholder': 'Describe your understanding...',
      'startDialog.optional': 'optional',
      'startDialog.goals': 'Learning Goals',
      'startDialog.goalPlaceholder': 'Add a learning goal...',
      'startDialog.goalHint': 'Press Enter to add',
      'startDialog.cancel': 'Cancel',
      'startDialog.start': 'Start Learning',
      'startDialog.difficulty': 'Preferred Difficulty',
      'startDialog.difficultyHint': 'Select your comfort level',
      'startDialog.learningStyle': 'Learning Style',
      'startDialog.learningStyleHint': 'How do you learn best?',
      'difficulty.beginner': 'Beginner',
      'difficulty.intermediate': 'Intermediate',
      'difficulty.advanced': 'Advanced',
      'difficulty.expert': 'Expert',
      'style.visual': 'Visual',
      'style.auditory': 'Auditory',
      'style.reading': 'Reading/Writing',
      'style.kinesthetic': 'Hands-on',
    };
    return translations[key] || key;
  },
}));

// Mock the useLearningMode hook
jest.mock('@/hooks/use-learning-mode');
const mockUseLearningMode = useLearningMode as jest.MockedFunction<typeof useLearningMode>;

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
  getProgressReport: jest.fn(),
  getSessionSummary: jest.fn(),
  getProgressSummary: jest.fn(),
  getStatusLine: jest.fn().mockReturnValue(''),
  getFormattedGoals: jest.fn().mockReturnValue(''),
  getFormattedSubQuestions: jest.fn().mockReturnValue(''),
  getAdaptivePrompt: jest.fn().mockReturnValue(''),
  getCelebrationMessage: jest.fn().mockReturnValue(''),
  getEncouragement: jest.fn().mockReturnValue(''),
  getContextualHint: jest.fn().mockReturnValue(''),
  updateConfig: jest.fn(),
  ...overrides,
});

describe('LearningStartDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('should not render dialog content when closed', () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());

      render(
        <LearningStartDialog open={false} onOpenChange={() => {}} />
      );

      expect(screen.queryByText('Start Learning Session')).not.toBeInTheDocument();
    });

    it('should render dialog content when open', () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());

      render(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      expect(screen.getByText('Start Learning Session')).toBeInTheDocument();
      expect(screen.getByText('What do you want to learn?')).toBeInTheDocument();
    });

    it('should display topic input field', () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());

      render(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      const topicInput = screen.getByPlaceholderText('e.g., How does recursion work?');
      expect(topicInput).toBeInTheDocument();
    });

    it('should display background knowledge textarea', () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());

      render(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      const backgroundInput = screen.getByPlaceholderText('Describe your understanding...');
      expect(backgroundInput).toBeInTheDocument();
    });

    it('should display goal input field', () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());

      render(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      const goalInput = screen.getByPlaceholderText('Add a learning goal...');
      expect(goalInput).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should update topic input value', async () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());
      const user = userEvent.setup();

      render(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      const topicInput = screen.getByPlaceholderText('e.g., How does recursion work?');
      await user.type(topicInput, 'Understanding React Hooks');

      expect(topicInput).toHaveValue('Understanding React Hooks');
    });

    it('should update background input value', async () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());
      const user = userEvent.setup();

      render(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      const backgroundInput = screen.getByPlaceholderText('Describe your understanding...');
      await user.type(backgroundInput, 'I know basic JavaScript');

      expect(backgroundInput).toHaveValue('I know basic JavaScript');
    });

    it('should add a goal when pressing Enter', async () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());
      const user = userEvent.setup();

      render(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      const goalInput = screen.getByPlaceholderText('Add a learning goal...');
      await user.type(goalInput, 'Understand useState{enter}');

      // Goal should be added and displayed as a badge
      expect(screen.getByText('Understand useState')).toBeInTheDocument();
      // Input should be cleared
      expect(goalInput).toHaveValue('');
    });

    it('should add a goal when clicking the add button', async () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());
      const user = userEvent.setup();

      render(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      const goalInput = screen.getByPlaceholderText('Add a learning goal...');
      await user.type(goalInput, 'Learn useEffect');

      // Find and click the add button (Plus icon button)
      const addButtons = screen.getAllByRole('button');
      const addButton = addButtons.find(btn => btn.querySelector('svg'));
      if (addButton) {
        await user.click(addButton);
      }

      expect(screen.getByText('Learn useEffect')).toBeInTheDocument();
    });

    it('should remove a goal when clicking the remove button', async () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());
      const user = userEvent.setup();

      render(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      // Add a goal first
      const goalInput = screen.getByPlaceholderText('Add a learning goal...');
      await user.type(goalInput, 'Test Goal{enter}');

      expect(screen.getByText('Test Goal')).toBeInTheDocument();

      // Find and click the remove button on the badge
      const removeButton = screen.getByText('Test Goal').parentElement?.querySelector('button');
      if (removeButton) {
        await user.click(removeButton);
      }

      expect(screen.queryByText('Test Goal')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should disable start button when topic is empty', () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());

      render(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      const startButton = screen.getByRole('button', { name: /start learning/i });
      expect(startButton).toBeDisabled();
    });

    it('should enable start button when topic is provided', async () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());
      const user = userEvent.setup();

      render(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      const topicInput = screen.getByPlaceholderText('e.g., How does recursion work?');
      await user.type(topicInput, 'Test Topic');

      const startButton = screen.getByRole('button', { name: /start learning/i });
      expect(startButton).not.toBeDisabled();
    });

    it('should call startLearning with correct parameters when form is submitted', async () => {
      const startLearningMock = jest.fn();
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({ startLearning: startLearningMock })
      );
      const user = userEvent.setup();
      const onOpenChangeMock = jest.fn();

      render(
        <LearningStartDialog open={true} onOpenChange={onOpenChangeMock} />
      );

      // Fill in the form
      const topicInput = screen.getByPlaceholderText('e.g., How does recursion work?');
      await user.type(topicInput, 'Understanding Recursion');

      const backgroundInput = screen.getByPlaceholderText('Describe your understanding...');
      await user.type(backgroundInput, 'I know basic programming');

      const goalInput = screen.getByPlaceholderText('Add a learning goal...');
      await user.type(goalInput, 'Understand base case{enter}');
      await user.type(goalInput, 'Understand recursive case{enter}');

      // Submit the form
      const startButton = screen.getByRole('button', { name: /start learning/i });
      await user.click(startButton);

      expect(startLearningMock).toHaveBeenCalledWith({
        topic: 'Understanding Recursion',
        backgroundKnowledge: 'I know basic programming',
        learningGoals: ['Understand base case', 'Understand recursive case'],
        preferredDifficulty: 'intermediate',
        preferredStyle: undefined,
      });

      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });

    it('should call onStart callback after successful submission', async () => {
      const startLearningMock = jest.fn();
      const onStartMock = jest.fn();
      mockUseLearningMode.mockReturnValue(
        createMockHookReturn({ startLearning: startLearningMock })
      );
      const user = userEvent.setup();

      render(
        <LearningStartDialog 
          open={true} 
          onOpenChange={() => {}} 
          onStart={onStartMock}
        />
      );

      const topicInput = screen.getByPlaceholderText('e.g., How does recursion work?');
      await user.type(topicInput, 'Test Topic');

      const startButton = screen.getByRole('button', { name: /start learning/i });
      await user.click(startButton);

      expect(onStartMock).toHaveBeenCalled();
    });
  });

  describe('Difficulty and Learning Style Selectors', () => {
    it('should display difficulty selector', () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());

      render(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      expect(screen.getByText('Preferred Difficulty')).toBeInTheDocument();
    });

    it('should display learning style selector', () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());

      render(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      expect(screen.getByText('Learning Style')).toBeInTheDocument();
    });

    it('should have intermediate as default difficulty', () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());

      render(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      // Default difficulty should be intermediate
      expect(screen.getByText('Intermediate')).toBeInTheDocument();
    });
  });

  describe('Cancel Behavior', () => {
    it('should call onOpenChange with false when cancel is clicked', async () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());
      const onOpenChangeMock = jest.fn();
      const user = userEvent.setup();

      render(
        <LearningStartDialog open={true} onOpenChange={onOpenChangeMock} />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });

    it('should maintain form state during rerender', async () => {
      mockUseLearningMode.mockReturnValue(createMockHookReturn());
      const user = userEvent.setup();

      const { rerender } = render(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      // Fill in the form
      const topicInput = screen.getByPlaceholderText('e.g., How does recursion work?');
      await user.type(topicInput, 'Test Topic');

      // Rerender with same props
      rerender(
        <LearningStartDialog open={true} onOpenChange={() => {}} />
      );

      // Form state should be maintained
      const sameTopicInput = screen.getByPlaceholderText('e.g., How does recursion work?');
      expect(sameTopicInput).toHaveValue('Test Topic');
    });
  });
});
