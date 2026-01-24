import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useTextbookProcessor,
  useTutorialGenerator,
  useQuizManager,
  ProcessingResult,
} from './use-textbook-processor';
import { useSpeedPassStore } from '@/stores/learning/speedpass-store';
import { parseTextbookContent } from '@/lib/learning/speedpass/textbook-parser';
import { extractKnowledgePoints } from '@/lib/learning/speedpass/knowledge-extractor';

// Mock store
jest.mock('@/stores/learning/speedpass-store', () => ({
  useSpeedPassStore: jest.fn(),
}));

// Mock libraries
jest.mock('@/lib/learning/speedpass/textbook-parser', () => ({
  parseTextbookContent: jest.fn(),
}));

jest.mock('@/lib/learning/speedpass/knowledge-extractor', () => ({
  extractKnowledgePoints: jest.fn(),
}));

// Helper to mock store actions
const mockActions = {
  setTextbookChapters: jest.fn(),
  setTextbookKnowledgePoints: jest.fn(),
  setTextbookQuestions: jest.fn(),
  setParseProgress: jest.fn(),
  createTutorial: jest.fn(),
  createQuiz: jest.fn(),
  startQuiz: jest.fn(),
  answerQuestion: jest.fn(),
  completeQuiz: jest.fn(),
};

describe('useTextbookProcessor Hook', () => {
  const mockStore = {
    textbooks: {
      t1: { id: 't1', name: 'Book 1' },
    },
    quizzes: {},
    ...mockActions,
  };

  beforeEach(() => {
    (useSpeedPassStore as unknown as jest.Mock).mockReturnValue(mockStore);
    jest.clearAllMocks();
  });

  describe('useTextbookProcessor', () => {
    it('should initialize with idle state', () => {
      const { result } = renderHook(() => useTextbookProcessor());

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.progress.stage).toBe('idle');
      expect(result.current.error).toBe(null);
    });

    it('should handle processing success flow', async () => {
      // Mock successful library calls
      (parseTextbookContent as jest.Mock).mockReturnValue({
        chapters: [{ id: 'c1', title: 'Chap 1', pageStart: 1, pageEnd: 5 }],
        pages: [{ pageNumber: 1, content: 'Page 1 content' }],
      });

      (extractKnowledgePoints as jest.Mock).mockReturnValue({
        knowledgePoints: [{ id: 'kp1', title: 'KP 1', pageNumber: 1 }],
      });

      const { result } = renderHook(() => useTextbookProcessor());

      await act(async () => {
        await result.current.processTextbook('t1', 'raw content');
      });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.progress.stage).toBe('complete');

      expect(mockActions.setTextbookChapters).toHaveBeenCalled();
      expect(mockActions.setTextbookKnowledgePoints).toHaveBeenCalled();
      expect(mockActions.setTextbookQuestions).toHaveBeenCalled(); // Should be called after extraction
      expect(result.current.progress.stage).toBe('complete');
    });

    it('should handle missing textbook error', async () => {
      (useSpeedPassStore as unknown as jest.Mock).mockReturnValue({
        textbooks: {}, // Empty textbooks
        ...mockActions,
      });

      const { result } = renderHook(() => useTextbookProcessor());

      await act(async () => {
        await result.current.processTextbook('t1', 'raw');
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Textbook data not found');
      expect(result.current.progress.stage).toBe('error');
    });

    it('should allow abortion', async () => {
      // Mock a process that triggers abort via side effect or simulation
      // Since processTextbook is synchronous-like, we need to abort *during* execution.
      // However, we can't easily access result.current.abort from inside the mock unless we do a trick.
      // Instead, let's verify that IF abortRef is true, it aborts.
      // We can simulate this by making the mock throw 'Aborted' (which the real code does when checking ref).
      // Or better, we can assume the abort logic works if we can't test concurrency on sync code.

      // But wait! We can update the hook state from inside the callback? No.
      // We can use a shared reference or just mock the abort behavior?

      // Let's actually TRY to call abort from the mock!

      let triggerAbort: (() => void) | null = null;

      (parseTextbookContent as jest.Mock).mockImplementation((content, cb) => {
        if (triggerAbort) triggerAbort();
        // The real code checks abortRef here.
        // If we called abort(), the ref is true.
        // Then calling cb might trigger the check?
        // The check is INSIDE the callback passed TO parseTextbookContent in the real code?
        // No, the real code passes a callback: (p) => { if (abortRef.current) throw... }
        // So in OUR mock, we should CALL that callback multiple times.
        // And between calls, providing we can interleave, we abort.
        // But we can't interleave sync code.

        // So we must abort BEFORE calling the callback?
        if (triggerAbort) triggerAbort();

        // Call the callback provided by useTextbookProcessor
        try {
          cb({ progress: 10, message: 'Parsing' });
        } catch (e) {
          // If callback throws (due to abort), we catch it here to match real behavior?
          // No, parseTextbookContent implementation should just propagation exception.
          throw e;
        }
        return { chapters: [], pages: [] };
      });

      const { result } = renderHook(() => useTextbookProcessor());

      // Setup the trigger
      triggerAbort = () => result.current.abort();

      let promise: Promise<ProcessingResult | null> = Promise.resolve(null);
      await act(async () => {
        promise = result.current.processTextbook('t1', 'content');
      });

      // The mock should have triggered abort, which sets ref=true.
      // Then mock calls cb.
      // cb checks ref, sees true, throws 'Aborted'.
      // processTextbook catches 'Aborted', returns null.

      const res = await promise;
      expect(res).toBeNull();
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('useTutorialGenerator', () => {
    it('should generate tutorial successfully', async () => {
      mockActions.createTutorial.mockResolvedValue({ id: 'tut1' });

      const { result } = renderHook(() => useTutorialGenerator());

      await act(async () => {
        const tut = await result.current.generate('t1', 'speed');
        expect(tut).toEqual({ id: 'tut1' });
      });

      expect(mockActions.createTutorial).toHaveBeenCalledWith(
        expect.objectContaining({
          textbookId: 't1',
          mode: 'speed',
        })
      );
    });

    it('should handle generation error', async () => {
      mockActions.createTutorial.mockRejectedValue(new Error('Gen failed'));

      const { result } = renderHook(() => useTutorialGenerator());

      await act(async () => {
        const tut = await result.current.generate('t1', 'speed');
        expect(tut).toBeNull();
      });

      expect(result.current.error?.message).toBe('Gen failed');
    });
  });

  describe('useQuizManager', () => {
    it('should create and start quiz', () => {
      const mockQuiz = { id: 'q1' };
      mockActions.createQuiz.mockReturnValue(mockQuiz);

      const { result } = renderHook(() => useQuizManager());

      let quiz;
      act(() => {
        quiz = result.current.createQuiz('t1', ['kp1'], 5);
      });

      expect(quiz).toEqual(mockQuiz);
      expect(mockActions.createQuiz).toHaveBeenCalled();
      expect(mockActions.startQuiz).toHaveBeenCalledWith('q1');
      expect(result.current.currentQuiz).toEqual(mockQuiz);
    });

    it('should submit answer', () => {
      const mockQuiz = { id: 'q1' };

      // Setup store to return the quiz when accessed
      (useSpeedPassStore as unknown as jest.Mock).mockReturnValue({
        textbooks: {},
        quizzes: { q1: mockQuiz },
        ...mockActions,
      });

      const { result } = renderHook(() => useQuizManager());

      // Needs currentQuiz to be set first (usually via createQuiz, but we can manually set state if exposed, OR simulating the flow)
      // Since we can't easily set state internal to hook without calling createQuiz, let's call it.
      mockActions.createQuiz.mockReturnValue(mockQuiz);

      act(() => {
        result.current.createQuiz('t1', [], 1);
      });

      act(() => {
        result.current.submitAnswer(0, 'A');
      });

      expect(mockActions.answerQuestion).toHaveBeenCalledWith('q1', 0, 'A');
    });
  });
});
