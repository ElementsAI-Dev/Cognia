import { renderHook, act } from '@testing-library/react';
import {
  useSpeedPass,
  useTextbooks,
  useTutorials,
  useQuizzes,
  useWrongQuestions,
  useStudyStats,
} from './use-speedpass';
import { useSpeedPassStore } from '@/stores/learning/speedpass-store';

// Mock the store
jest.mock('@/stores/learning/speedpass-store', () => ({
  useSpeedPassStore: jest.fn(),
}));

describe('useSpeedPass Hook', () => {
  const mockStore = {
    textbooks: {
      t1: {
        id: 't1',
        name: 'Textbook 1',
        coverUrl: '',
        subject: 'Math',
        grade: '10',
        publisher: 'Pub',
        publishYear: '2023',
        description: '',
        tags: [],
        rating: 5,
        difficulty: 0.5,
        usageCount: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      t2: {
        id: 't2',
        name: 'Textbook 2',
        coverUrl: '',
        subject: 'English',
        grade: '11',
        publisher: 'Pub',
        publishYear: '2023',
        description: '',
        tags: [],
        rating: 5,
        difficulty: 0.5,
        usageCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    textbookChapters: {
      t1: [
        {
          id: 'c1',
          textbookId: 't1',
          title: 'Chapter 1',
          chapterNumber: '1',
          level: 1,
          orderIndex: 0,
          pageStart: 1,
          pageEnd: 10,
        },
      ],
    },
    textbookKnowledgePoints: {
      t1: [
        {
          id: 'kp1',
          textbookId: 't1',
          chapterId: 'c1',
          title: 'Point 1',
          content: 'Content 1',
          pageNumber: 5,
          importance: 'high',
          masteryLevel: 0,
        },
      ],
    },
    textbookQuestions: {
      t1: [
        {
          id: 'q1',
          textbookId: 't1',
          source: 'textbook',
          question: 'Question 1',
          answer: 'Answer 1',
        },
      ],
    },
    userTextbooks: [
      {
        id: 'ut1',
        userId: 'u1',
        textbookId: 't1',
        studyProgress: 50,
        addedAt: new Date(),
        lastAccessedAt: new Date(),
      },
    ],
    tutorials: {
      tut1: {
        id: 'tut1',
        textbookId: 't1',
        title: 'Tutorial 1',
        progress: 30,
        completedSectionIds: ['s1'],
        completedAt: null,
      },
      tut2: {
        id: 'tut2',
        textbookId: 't1',
        title: 'Tutorial 2',
        progress: 100,
        completedSectionIds: ['s1', 's2'],
        completedAt: new Date(),
      },
    },
    studySessions: {
      sess1: { id: 'sess1', tutorialId: 'tut1', status: 'active', startedAt: new Date() },
    },
    quizzes: {
      quiz1: {
        id: 'quiz1',
        textbookId: 't1',
        questions: [{ id: 'qq1', userAnswer: 'A' }, { id: 'qq2' }],
        currentQuestionIndex: 0,
      },
    },
    wrongQuestions: {
      wq1: { id: 'wq1', questionId: 'q1', textbookId: 't1', status: 'new', reviewCount: 0 },
      wq2: { id: 'wq2', questionId: 'q2', textbookId: 't1', status: 'mastered', reviewCount: 5 },
    },
    studyReports: [{ id: 'r1', userId: 'u1', generatedAt: new Date() }],
    globalStats: {
      totalStudyTimeMs: 3600000 + 1800000, // 1.5 hours
      sessionsCompleted: 10,
    },

    // Current IDs
    currentTextbookId: 't1',
    currentTutorialId: 'tut1',
    currentSessionId: 'sess1',
    currentQuizId: 'quiz1',

    // Actions
    setCurrentTextbook: jest.fn(),
    addTextbook: jest.fn(),
    removeTextbook: jest.fn(),
    setCurrentTutorial: jest.fn(),
    createTutorial: jest.fn(),
    updateTutorialProgress: jest.fn(),
    completeTutorial: jest.fn(),
    deleteTutorial: jest.fn(),
    startStudySession: jest.fn(),
    pauseStudySession: jest.fn(),
    resumeStudySession: jest.fn(),
    endStudySession: jest.fn(),
    createQuiz: jest.fn(),
    startQuiz: jest.fn(),
    answerQuestion: jest.fn(),
    useHint: jest.fn(),
    nextQuestion: jest.fn(),
    previousQuestion: jest.fn(),
    completeQuiz: jest.fn(),
    getQuizResults: jest.fn(),
    addWrongQuestion: jest.fn(),
    markWrongQuestionReviewed: jest.fn(),
    getWrongQuestionsForReview: jest.fn(() => []),
    getWrongQuestionsByTextbook: jest.fn(() => []),
    generateStudyReport: jest.fn(),
    getRecentReports: jest.fn(() => []),
    reset: jest.fn(),
    setError: jest.fn(),

    // Helper Methods that are part of the store
    addUserTextbook: jest.fn(),
    processTeacherKeyPoints: jest.fn(),
    getRecommendedTextbooks: jest.fn(),
    removeUserTextbook: jest.fn(),

    // State
    isLoading: false,
    error: null,
    parseProgress: null,
    academicProfile: null,
    setAcademicProfile: jest.fn(),
    updateAcademicProfile: jest.fn(),
  };

  beforeEach(() => {
    (useSpeedPassStore as unknown as jest.Mock).mockReturnValue(mockStore);
    jest.clearAllMocks();
  });

  describe('Main useSpeedPass Hook', () => {
    it('should return all selectors and actions', () => {
      const { result } = renderHook(() => useSpeedPass());

      // Check State
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);

      // Check Textbooks
      expect(result.current.textbooks).toHaveLength(2);
      expect(result.current.currentTextbook).toEqual(mockStore.textbooks['t1']);
      expect(result.current.userTextbooks).toHaveLength(1);

      // Check Tutorials
      expect(result.current.tutorials).toHaveLength(2);
      expect(result.current.currentTutorial).toEqual(mockStore.tutorials['tut1']);

      // Check Sessions
      expect(result.current.currentSession).toEqual(mockStore.studySessions['sess1']);

      // Check Quizzes
      expect(result.current.currentQuiz).toEqual(mockStore.quizzes['quiz1']);

      // Check Wrong Questions
      expect(result.current.wrongQuestions).toHaveLength(2);
      expect(result.current.wrongQuestionsCount).toBe(1); // Only non-mastered

      // Check Actions presence
      expect(result.current.setCurrentTextbook).toBeDefined();
      expect(result.current.createTutorial).toBeDefined();
    });

    it('should format study time correctly', () => {
      const { result } = renderHook(() => useSpeedPass());

      expect(result.current.formatStudyTime(3600000)).toBe('1小时0分钟');
      expect(result.current.formatStudyTime(3660000)).toBe('1小时1分钟');
      expect(result.current.formatStudyTime(1800000)).toBe('30分钟');
    });

    it('should handle action calls', () => {
      const { result } = renderHook(() => useSpeedPass());

      result.current.setCurrentTextbook('t2');
      expect(mockStore.setCurrentTextbook).toHaveBeenCalledWith('t2');

      result.current.completeQuiz('q1');
      expect(mockStore.completeQuiz).toHaveBeenCalledWith('q1');
    });

    it('should use callbacks for looking up textbook data', () => {
      const { result } = renderHook(() => useSpeedPass());

      const chapters = result.current.getTextbookChapters('t1');
      expect(chapters).toEqual(mockStore.textbookChapters['t1']);

      const kps = result.current.getTextbookKnowledgePoints('t1');
      expect(kps).toEqual(mockStore.textbookKnowledgePoints['t1']);
    });
  });

  describe('Specialized Hooks', () => {
    describe('useTextbooks', () => {
      it('should return textbook specific data', () => {
        const { result } = renderHook(() => useTextbooks());

        expect(result.current.textbooks).toHaveLength(2);
        expect(result.current.currentTextbook?.id).toBe('t1');
        expect(result.current.getChapters('t1')).toHaveLength(1);
      });
    });

    describe('useTutorials', () => {
      it('should filter active and completed tutorials', () => {
        const { result } = renderHook(() => useTutorials());

        expect(result.current.tutorials).toHaveLength(2);
        expect(result.current.activeTutorials).toHaveLength(1); // tut1 (no completedAt)
        expect(result.current.completedTutorials).toHaveLength(1); // tut2 (has completedAt)
        expect(result.current.activeTutorials[0].id).toBe('tut1');
        expect(result.current.completedTutorials[0].id).toBe('tut2');
      });
    });

    describe('useQuizzes', () => {
      it('should calculate quiz progress', () => {
        const { result } = renderHook(() => useQuizzes());

        expect(result.current.currentQuiz?.id).toBe('quiz1');
        expect(result.current.quizProgress).toBe(50); // 1 out of 2 answered

        // currentQuestion depends on currentQuestionIndex which is 0
        expect(result.current.currentQuestion).toEqual(mockStore.quizzes['quiz1'].questions[0]);
      });

      it('should handle undefined quiz gracefully', () => {
        (useSpeedPassStore as unknown as jest.Mock).mockReturnValue({
          ...mockStore,
          currentQuizId: null,
          quizzes: {},
        });
        const { result } = renderHook(() => useQuizzes());

        expect(result.current.currentQuiz).toBeUndefined();
        expect(result.current.quizProgress).toBe(0);
        expect(result.current.currentQuestion).toBeUndefined();
      });
    });

    describe('useWrongQuestions', () => {
      it('should calculate stats correctly', () => {
        const { result } = renderHook(() => useWrongQuestions());

        expect(result.current.stats).toEqual({
          total: 2,
          mastered: 1,
          reviewing: 0,
          new: 1,
        });
      });
    });

    describe('useStudyStats', () => {
      it('should format total time from stats', () => {
        const { result } = renderHook(() => useStudyStats());

        expect(result.current.totalStudyTimeMs).toBe(5400000);
        expect(result.current.formattedTotalTime).toBe('1小时30分钟');
      });
    });
  });
});
