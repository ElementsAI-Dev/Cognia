/**
 * useLearningTools Hook Tests
 *
 * Unit tests for the learning tools integration hook.
 */

import { renderHook } from '@testing-library/react';
import { useLearningTools } from './use-learning-tools';
import { useLearningStore } from '@/stores/learning';
import { useSessionStore } from '@/stores/chat';

// Mock ESM module that breaks Jest resolution chain
jest.mock('react-vega', () => ({
  VegaEmbed: () => null,
}));

// Mock the stores
jest.mock('@/stores/learning');
jest.mock('@/stores/chat');

// Mock the learning tools
jest.mock('@/lib/ai/tools/learning-tools', () => ({
  learningTools: {
    displayFlashcard: {
      name: 'displayFlashcard',
      description: 'Display a flashcard',
      parameters: { type: 'object', properties: {} },
    },
    displayFlashcardDeck: {
      name: 'displayFlashcardDeck',
      description: 'Display a deck of flashcards',
      parameters: { type: 'object', properties: {} },
    },
    displayQuiz: {
      name: 'displayQuiz',
      description: 'Display a quiz',
      parameters: { type: 'object', properties: {} },
    },
    displayQuizQuestion: {
      name: 'displayQuizQuestion',
      description: 'Display a quiz question',
      parameters: { type: 'object', properties: {} },
    },
    displayReviewSession: {
      name: 'displayReviewSession',
      description: 'Display a review session',
      parameters: { type: 'object', properties: {} },
    },
    displayProgressSummary: {
      name: 'displayProgressSummary',
      description: 'Display progress summary',
      parameters: { type: 'object', properties: {} },
    },
    displayConceptExplanation: {
      name: 'displayConceptExplanation',
      description: 'Display concept explanation',
      parameters: { type: 'object', properties: {} },
    },
    displayStepGuide: {
      name: 'displayStepGuide',
      description: 'Display step guide',
      parameters: { type: 'object', properties: {} },
    },
    displayConceptMap: {
      name: 'displayConceptMap',
      description: 'Display concept map',
      parameters: { type: 'object', properties: {} },
    },
    displayAnimation: {
      name: 'displayAnimation',
      description: 'Display animation',
      parameters: { type: 'object', properties: {} },
    },
  },
  executeDisplayFlashcard: jest.fn().mockResolvedValue({ success: true }),
  executeDisplayFlashcardDeck: jest.fn().mockResolvedValue({ success: true }),
  executeDisplayQuiz: jest.fn().mockResolvedValue({ success: true }),
  executeDisplayQuizQuestion: jest.fn().mockResolvedValue({ success: true }),
  executeDisplayReviewSession: jest.fn().mockResolvedValue({ success: true }),
  executeDisplayProgressSummary: jest.fn().mockResolvedValue({ success: true }),
  executeDisplayConceptExplanation: jest.fn().mockResolvedValue({ success: true }),
  executeDisplayStepGuide: jest.fn().mockResolvedValue({ success: true }),
  executeDisplayConceptMap: jest.fn().mockResolvedValue({ success: true }),
  executeDisplayAnimation: jest.fn().mockResolvedValue({ success: true }),
}));

const mockUseLearningStore = useLearningStore as jest.MockedFunction<typeof useLearningStore>;
const mockUseSessionStore = useSessionStore as jest.MockedFunction<typeof useSessionStore>;

describe('useLearningTools', () => {
  const mockLearningStore = {
    sessions: {},
    activeSessionId: null,
    getLearningSessionByChat: jest.fn(),
  };

  const mockSessionStore = {
    activeSessionId: 'session-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLearningStore.mockReturnValue(mockLearningStore as ReturnType<typeof useLearningStore>);
    mockUseSessionStore.mockReturnValue(mockSessionStore as ReturnType<typeof useSessionStore>);
  });

  describe('tools generation', () => {
    it('should return all tools when no options provided', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningTools());

      expect(result.current.tools).toHaveProperty('displayFlashcard');
      expect(result.current.tools).toHaveProperty('displayFlashcardDeck');
      expect(result.current.tools).toHaveProperty('displayQuiz');
      expect(result.current.tools).toHaveProperty('displayQuizQuestion');
      expect(result.current.tools).toHaveProperty('displayReviewSession');
      expect(result.current.tools).toHaveProperty('displayProgressSummary');
      expect(result.current.tools).toHaveProperty('displayConceptExplanation');
      expect(result.current.tools).toHaveProperty('displayStepGuide');
      expect(result.current.tools).toHaveProperty('displayConceptMap');
      expect(result.current.tools).toHaveProperty('displayAnimation');
    });

    it('should exclude flashcard tools when disabled', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningTools({ enableFlashcards: false }));

      expect(result.current.tools).not.toHaveProperty('displayFlashcard');
      expect(result.current.tools).not.toHaveProperty('displayFlashcardDeck');
      expect(result.current.tools).toHaveProperty('displayQuiz');
    });

    it('should exclude quiz tools when disabled', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningTools({ enableQuizzes: false }));

      expect(result.current.tools).not.toHaveProperty('displayQuiz');
      expect(result.current.tools).not.toHaveProperty('displayQuizQuestion');
      expect(result.current.tools).toHaveProperty('displayFlashcard');
    });

    it('should exclude review session tools when disabled', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningTools({ enableReviewSessions: false }));

      expect(result.current.tools).not.toHaveProperty('displayReviewSession');
    });

    it('should exclude progress summary tools when disabled', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningTools({ enableProgressSummary: false }));

      expect(result.current.tools).not.toHaveProperty('displayProgressSummary');
    });

    it('should exclude concept explanation tools when disabled', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningTools({ enableConceptExplanation: false }));

      expect(result.current.tools).not.toHaveProperty('displayConceptExplanation');
    });

    it('should exclude visualization tools when disabled', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningTools({ enableVisualization: false }));

      expect(result.current.tools).not.toHaveProperty('displayStepGuide');
      expect(result.current.tools).not.toHaveProperty('displayConceptMap');
      expect(result.current.tools).not.toHaveProperty('displayAnimation');
      expect(result.current.tools).toHaveProperty('displayFlashcard');
    });

    it('should return empty tools when all disabled', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useLearningTools({
          enableFlashcards: false,
          enableQuizzes: false,
          enableReviewSessions: false,
          enableProgressSummary: false,
          enableConceptExplanation: false,
          enableVisualization: false,
        })
      );

      expect(Object.keys(result.current.tools)).toHaveLength(0);
    });

    it('should have correct tool structure', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningTools());

      const flashcardTool = result.current.tools.displayFlashcard;
      expect(flashcardTool).toHaveProperty('name', 'displayFlashcard');
      expect(flashcardTool).toHaveProperty('description');
      expect(flashcardTool).toHaveProperty('parameters');
      expect(flashcardTool).toHaveProperty('execute');
      expect(flashcardTool).toHaveProperty('requiresApproval', false);
      expect(typeof flashcardTool.execute).toBe('function');
    });
  });

  describe('isLearningActive', () => {
    it('should return false when no active session', () => {
      mockUseSessionStore.mockReturnValue({
        activeSessionId: null,
      } as ReturnType<typeof useSessionStore>);
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningTools());

      expect(result.current.isLearningActive).toBe(false);
    });

    it('should return false when learning session not found', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningTools());

      expect(result.current.isLearningActive).toBe(false);
    });

    it('should return false when learning session is completed', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue({
        id: 'learning-1',
        completedAt: new Date(),
      });

      const { result } = renderHook(() => useLearningTools());

      expect(result.current.isLearningActive).toBe(false);
    });

    it('should return true when learning session is active', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue({
        id: 'learning-1',
        completedAt: undefined,
      });

      const { result } = renderHook(() => useLearningTools());

      expect(result.current.isLearningActive).toBe(true);
    });
  });

  describe('generateFlashcardsFromSession', () => {
    it('should return empty array when no session', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningTools());
      const flashcards = result.current.generateFlashcardsFromSession();

      expect(flashcards).toEqual([]);
    });

    it('should generate flashcards from review items', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue({
        id: 'learning-1',
        reviewItems: [
          {
            id: 'review-1',
            question: 'What is React?',
            answer: 'A JavaScript library for building UIs',
            conceptId: 'concept-1',
            easeFactor: 2.3,
          },
          {
            id: 'review-2',
            question: 'What is a hook?',
            answer: 'A function to use state in functional components',
            conceptId: 'concept-2',
            easeFactor: 1.8,
          },
          {
            id: 'review-3',
            question: 'What is JSX?',
            answer: 'JavaScript XML syntax extension',
            conceptId: 'concept-3',
            easeFactor: 2.7,
          },
        ],
      });

      const { result } = renderHook(() => useLearningTools());
      const flashcards = result.current.generateFlashcardsFromSession();

      expect(flashcards).toHaveLength(3);
      expect(flashcards[0]).toEqual({
        id: 'review-1',
        front: 'What is React?',
        back: 'A JavaScript library for building UIs',
        conceptId: 'concept-1',
        difficulty: 'medium',
      });
      expect(flashcards[1].difficulty).toBe('hard'); // easeFactor < 2.0
      expect(flashcards[2].difficulty).toBe('easy'); // easeFactor > 2.5
    });
  });

  describe('generateQuizFromSession', () => {
    it('should return empty array when no session', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningTools());
      const quiz = result.current.generateQuizFromSession();

      expect(quiz).toEqual([]);
    });

    it('should generate quiz questions from concepts', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue({
        id: 'learning-1',
        concepts: [
          {
            id: 'concept-1',
            name: 'React',
            description: 'A JavaScript library',
            masteryStatus: 'mastered',
          },
          {
            id: 'concept-2',
            name: 'Hooks',
            description: 'Functions for state management',
            masteryStatus: 'learning',
          },
        ],
      });

      const { result } = renderHook(() => useLearningTools());
      const quiz = result.current.generateQuizFromSession();

      expect(quiz).toHaveLength(2);
      expect(quiz[0]).toEqual({
        id: 'concept-1',
        question: 'What is React?',
        type: 'short_answer',
        correctAnswer: 'A JavaScript library',
        conceptId: 'concept-1',
        points: 1, // mastered = 1 point
      });
      expect(quiz[1].points).toBe(2); // learning = 2 points
    });

    it('should use concept name as answer if no description', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue({
        id: 'learning-1',
        concepts: [
          {
            id: 'concept-1',
            name: 'React',
            description: undefined,
            masteryStatus: 'learning',
          },
        ],
      });

      const { result } = renderHook(() => useLearningTools());
      const quiz = result.current.generateQuizFromSession();

      expect(quiz[0].correctAnswer).toBe('React');
    });
  });

  describe('getProgressStats', () => {
    it('should return zero stats when no session', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningTools());
      const stats = result.current.getProgressStats();

      expect(stats).toEqual({
        totalConcepts: 0,
        masteredConcepts: 0,
        learningConcepts: 0,
        accuracy: 0,
      });
    });

    it('should calculate stats from session', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue({
        id: 'learning-1',
        concepts: [
          { id: 'c1', masteryStatus: 'mastered' },
          { id: 'c2', masteryStatus: 'mastered' },
          { id: 'c3', masteryStatus: 'learning' },
          { id: 'c4', masteryStatus: 'practicing' },
        ],
        statistics: {
          questionsAnswered: 10,
          correctAnswers: 8,
          streakDays: 5,
        },
      });

      const { result } = renderHook(() => useLearningTools());
      const stats = result.current.getProgressStats();

      expect(stats).toEqual({
        totalConcepts: 4,
        masteredConcepts: 2,
        learningConcepts: 1,
        accuracy: 80,
        streakDays: 5,
      });
    });

    it('should return 0 accuracy when no questions answered', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue({
        id: 'learning-1',
        concepts: [],
        statistics: {
          questionsAnswered: 0,
          correctAnswers: 0,
          streakDays: 0,
        },
      });

      const { result } = renderHook(() => useLearningTools());
      const stats = result.current.getProgressStats();

      expect(stats.accuracy).toBe(0);
    });

    it('should round accuracy to nearest integer', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue({
        id: 'learning-1',
        concepts: [],
        statistics: {
          questionsAnswered: 3,
          correctAnswers: 2,
          streakDays: 0,
        },
      });

      const { result } = renderHook(() => useLearningTools());
      const stats = result.current.getProgressStats();

      expect(stats.accuracy).toBe(67); // 66.67 rounded
    });
  });

  describe('tool execution', () => {
    it('should execute displayFlashcard tool', async () => {
      const { executeDisplayFlashcard } = jest.requireMock('@/lib/ai/tools/learning-tools');
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningTools());
      const tool = result.current.tools.displayFlashcard;

      await tool.execute({ front: 'Question', back: 'Answer' });

      expect(executeDisplayFlashcard).toHaveBeenCalledWith({
        front: 'Question',
        back: 'Answer',
      });
    });

    it('should execute displayQuiz tool', async () => {
      const { executeDisplayQuiz } = jest.requireMock('@/lib/ai/tools/learning-tools');
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result } = renderHook(() => useLearningTools());
      const tool = result.current.tools.displayQuiz;

      await tool.execute({ title: 'Test Quiz', questions: [] });

      expect(executeDisplayQuiz).toHaveBeenCalledWith({
        title: 'Test Quiz',
        questions: [],
      });
    });
  });

  describe('memoization', () => {
    it('should return same tools reference when options unchanged', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result, rerender } = renderHook(() => useLearningTools());
      const firstTools = result.current.tools;

      rerender();

      expect(result.current.tools).toBe(firstTools);
    });

    it('should update tools reference when options change', () => {
      mockLearningStore.getLearningSessionByChat.mockReturnValue(undefined);

      const { result, rerender } = renderHook(({ options }) => useLearningTools(options), {
        initialProps: { options: { enableFlashcards: true } },
      });
      const firstTools = result.current.tools;

      rerender({ options: { enableFlashcards: false } });

      expect(result.current.tools).not.toBe(firstTools);
    });
  });
});
