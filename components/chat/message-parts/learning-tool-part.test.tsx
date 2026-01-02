/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  LearningToolPart,
  isLearningTool,
  LEARNING_TOOL_NAMES,
} from './learning-tool-part';
import type { ToolInvocationPart } from '@/types/message';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'loading.flashcard': 'Loading flashcard...',
      'loading.flashcardDeck': 'Loading flashcard deck...',
      'loading.quiz': 'Loading quiz...',
      'loading.quizQuestion': 'Loading quiz question...',
      'loading.reviewSession': 'Loading review session...',
      'loading.progressSummary': 'Loading progress summary...',
      'loading.conceptExplanation': 'Loading concept explanation...',
      'loading.default': 'Loading...',
      'error.default': 'An error occurred',
      'concept.relatedConcepts': 'Related Concepts',
      'concept.quickReview': 'Quick Review',
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

// Mock learning components
jest.mock('@/components/learning/flashcard', () => ({
  Flashcard: ({ flashcard }: { flashcard: { front: string; back: string } }) => (
    <div data-testid="flashcard">
      <span>{flashcard.front}</span>
      <span>{flashcard.back}</span>
    </div>
  ),
  FlashcardFromTool: ({ output }: { output: { flashcard: { front: string } } }) => (
    <div data-testid="flashcard-from-tool">{output.flashcard.front}</div>
  ),
  FlashcardDeckFromTool: ({ output }: { output: { title: string } }) => (
    <div data-testid="flashcard-deck-from-tool">{output.title}</div>
  ),
}));

jest.mock('@/components/learning/quiz', () => ({
  QuizFromTool: ({ output }: { output: { title: string } }) => (
    <div data-testid="quiz-from-tool">{output.title}</div>
  ),
  QuizQuestionFromTool: ({ output }: { output: { question: string } }) => (
    <div data-testid="quiz-question-from-tool">{output.question}</div>
  ),
}));

jest.mock('@/components/learning/review-session', () => ({
  ReviewSessionFromTool: ({ output }: { output: { sessionId: string } }) => (
    <div data-testid="review-session-from-tool">{output.sessionId}</div>
  ),
  ProgressSummaryFromTool: ({ output }: { output: { totalCards: number } }) => (
    <div data-testid="progress-summary-from-tool">{output.totalCards}</div>
  ),
}));

// Mock cn
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

const createToolPart = (overrides: Partial<ToolInvocationPart> = {}): ToolInvocationPart => {
  const base: ToolInvocationPart = {
    type: 'tool-invocation',
    toolCallId: 'test-call-id',
    toolName: 'displayFlashcard',
    args: {},
    state: 'output-available',
    result: { flashcard: { front: 'Test Front', back: 'Test Back' } },
  };
  return { ...base, ...overrides, args: overrides.args ?? base.args };
};

describe('LearningToolPart', () => {
  describe('isLearningTool', () => {
    it('returns true for valid learning tool names', () => {
      expect(isLearningTool('displayFlashcard')).toBe(true);
      expect(isLearningTool('displayFlashcardDeck')).toBe(true);
      expect(isLearningTool('displayQuiz')).toBe(true);
      expect(isLearningTool('displayQuizQuestion')).toBe(true);
      expect(isLearningTool('displayReviewSession')).toBe(true);
      expect(isLearningTool('displayProgressSummary')).toBe(true);
      expect(isLearningTool('displayConceptExplanation')).toBe(true);
    });

    it('returns false for invalid tool names', () => {
      expect(isLearningTool('someOtherTool')).toBe(false);
      expect(isLearningTool('displayImage')).toBe(false);
      expect(isLearningTool('')).toBe(false);
    });
  });

  describe('LEARNING_TOOL_NAMES', () => {
    it('contains all expected tool names', () => {
      expect(LEARNING_TOOL_NAMES).toContain('displayFlashcard');
      expect(LEARNING_TOOL_NAMES).toContain('displayFlashcardDeck');
      expect(LEARNING_TOOL_NAMES).toContain('displayQuiz');
      expect(LEARNING_TOOL_NAMES).toContain('displayQuizQuestion');
      expect(LEARNING_TOOL_NAMES).toContain('displayReviewSession');
      expect(LEARNING_TOOL_NAMES).toContain('displayProgressSummary');
      expect(LEARNING_TOOL_NAMES).toContain('displayConceptExplanation');
      expect(LEARNING_TOOL_NAMES).toHaveLength(7);
    });
  });

  describe('Loading states', () => {
    it('renders loading state for input-streaming', () => {
      const part = createToolPart({
        state: 'input-streaming',
        toolName: 'displayFlashcard',
      });
      render(<LearningToolPart part={part} />);
      expect(screen.getByText('Loading flashcard...')).toBeInTheDocument();
    });

    it('renders loading state for input-available', () => {
      const part = createToolPart({
        state: 'input-available',
        toolName: 'displayQuiz',
      });
      render(<LearningToolPart part={part} />);
      expect(screen.getByText('Loading quiz...')).toBeInTheDocument();
    });

    it('renders correct loading message for each tool type', () => {
      const toolLoadingMessages: [string, string][] = [
        ['displayFlashcard', 'Loading flashcard...'],
        ['displayFlashcardDeck', 'Loading flashcard deck...'],
        ['displayQuiz', 'Loading quiz...'],
        ['displayQuizQuestion', 'Loading quiz question...'],
        ['displayReviewSession', 'Loading review session...'],
        ['displayProgressSummary', 'Loading progress summary...'],
        ['displayConceptExplanation', 'Loading concept explanation...'],
      ];

      toolLoadingMessages.forEach(([toolName, expectedMessage]) => {
        const part = createToolPart({
          state: 'input-streaming',
          toolName,
        });
        const { unmount } = render(<LearningToolPart part={part} />);
        expect(screen.getByText(expectedMessage)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Error states', () => {
    it('renders error state for output-error', () => {
      const part = createToolPart({
        state: 'output-error',
        errorText: 'Something went wrong',
      });
      render(<LearningToolPart part={part} />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders error state for output-denied', () => {
      const part = createToolPart({
        state: 'output-denied',
      });
      render(<LearningToolPart part={part} />);
      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });

    it('renders default error message when errorText is not provided', () => {
      const part = createToolPart({
        state: 'output-error',
      });
      render(<LearningToolPart part={part} />);
      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });
  });

  describe('Completed states - output-available', () => {
    it('renders FlashcardFromTool for displayFlashcard', () => {
      const part = createToolPart({
        toolName: 'displayFlashcard',
        state: 'output-available',
        result: { flashcard: { front: 'Question', back: 'Answer' } },
      });
      render(<LearningToolPart part={part} />);
      expect(screen.getByTestId('flashcard-from-tool')).toBeInTheDocument();
    });

    it('renders FlashcardDeckFromTool for displayFlashcardDeck', () => {
      const part = createToolPart({
        toolName: 'displayFlashcardDeck',
        state: 'output-available',
        result: { title: 'My Deck', flashcards: [] },
      });
      render(<LearningToolPart part={part} />);
      expect(screen.getByTestId('flashcard-deck-from-tool')).toBeInTheDocument();
    });

    it('renders QuizFromTool for displayQuiz', () => {
      const part = createToolPart({
        toolName: 'displayQuiz',
        state: 'output-available',
        result: { title: 'Test Quiz', questions: [] },
      });
      render(<LearningToolPart part={part} />);
      expect(screen.getByTestId('quiz-from-tool')).toBeInTheDocument();
    });

    it('renders QuizQuestionFromTool for displayQuizQuestion', () => {
      const part = createToolPart({
        toolName: 'displayQuizQuestion',
        state: 'output-available',
        result: { question: 'What is 2+2?', options: [] },
      });
      render(<LearningToolPart part={part} />);
      expect(screen.getByTestId('quiz-question-from-tool')).toBeInTheDocument();
    });

    it('renders ReviewSessionFromTool for displayReviewSession', () => {
      const part = createToolPart({
        toolName: 'displayReviewSession',
        state: 'output-available',
        result: { sessionId: 'session-123', cards: [] },
      });
      render(<LearningToolPart part={part} />);
      expect(screen.getByTestId('review-session-from-tool')).toBeInTheDocument();
    });

    it('renders ProgressSummaryFromTool for displayProgressSummary', () => {
      const part = createToolPart({
        toolName: 'displayProgressSummary',
        state: 'output-available',
        result: { totalCards: 50, masteredCards: 25 },
      });
      render(<LearningToolPart part={part} />);
      expect(screen.getByTestId('progress-summary-from-tool')).toBeInTheDocument();
    });

    it('renders ConceptExplanation for displayConceptExplanation', () => {
      const part = createToolPart({
        toolName: 'displayConceptExplanation',
        state: 'output-available',
        result: {
          title: 'Photosynthesis',
          summary: 'The process by which plants convert sunlight to energy',
          sections: [
            { title: 'Overview', content: 'Plants use chlorophyll...', type: 'text' },
          ],
        },
      });
      render(<LearningToolPart part={part} />);
      expect(screen.getByText('Photosynthesis')).toBeInTheDocument();
      expect(
        screen.getByText('The process by which plants convert sunlight to energy')
      ).toBeInTheDocument();
    });
  });

  describe('ConceptExplanation component', () => {
    it('renders title and summary', () => {
      const part = createToolPart({
        toolName: 'displayConceptExplanation',
        state: 'output-available',
        result: {
          title: 'Test Concept',
          summary: 'A test summary',
          sections: [],
        },
      });
      render(<LearningToolPart part={part} />);
      expect(screen.getByText('Test Concept')).toBeInTheDocument();
      expect(screen.getByText('A test summary')).toBeInTheDocument();
    });

    it('renders sections with different types', () => {
      const part = createToolPart({
        toolName: 'displayConceptExplanation',
        state: 'output-available',
        result: {
          title: 'Concept',
          summary: 'Summary',
          sections: [
            { title: 'Text Section', content: 'Text content', type: 'text' },
            { title: 'Example Section', content: 'Example content', type: 'example' },
            { title: 'Warning Section', content: 'Warning content', type: 'warning' },
            { title: 'Tip Section', content: 'Tip content', type: 'tip' },
          ],
        },
      });
      render(<LearningToolPart part={part} />);

      expect(screen.getByText('Text Section')).toBeInTheDocument();
      expect(screen.getByText('Example Section')).toBeInTheDocument();
      expect(screen.getByText('Warning Section')).toBeInTheDocument();
      expect(screen.getByText('Tip Section')).toBeInTheDocument();
    });

    it('renders related concepts when present', () => {
      const part = createToolPart({
        toolName: 'displayConceptExplanation',
        state: 'output-available',
        result: {
          title: 'Concept',
          summary: 'Summary',
          sections: [],
          relatedConcepts: [
            { id: '1', title: 'Related 1', relationship: 'prerequisite' },
            { id: '2', title: 'Related 2' },
          ],
        },
      });
      render(<LearningToolPart part={part} />);

      expect(screen.getByText('Related Concepts')).toBeInTheDocument();
      expect(screen.getByText('Related 1')).toBeInTheDocument();
      expect(screen.getByText('(prerequisite)')).toBeInTheDocument();
      expect(screen.getByText('Related 2')).toBeInTheDocument();
    });

    it('renders quick review flashcard when present', () => {
      const part = createToolPart({
        toolName: 'displayConceptExplanation',
        state: 'output-available',
        result: {
          title: 'Concept',
          summary: 'Summary',
          sections: [],
          quickReview: { front: 'Review Q', back: 'Review A' },
        },
      });
      render(<LearningToolPart part={part} />);

      expect(screen.getByText('Quick Review')).toBeInTheDocument();
      expect(screen.getByTestId('flashcard')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('returns null for unknown tool names with output-available state', () => {
      const part = createToolPart({
        toolName: 'unknownTool',
        state: 'output-available',
        result: {},
      });
      const { container } = render(<LearningToolPart part={part} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when state is output-available but no result', () => {
      const part = createToolPart({
        state: 'output-available',
        result: undefined,
      });
      const { container } = render(<LearningToolPart part={part} />);
      expect(container.firstChild).toBeNull();
    });

    it('applies custom className', () => {
      const part = createToolPart({
        toolName: 'displayFlashcard',
        state: 'output-available',
        result: { flashcard: { front: 'Q', back: 'A' } },
      });
      const { container } = render(<LearningToolPart part={part} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
