/**
 * SpeedPass Hook - React hook for speed learning mode
 * 
 * Provides a clean interface to interact with the SpeedPass store
 * for textbook management, tutorials, quizzes, and study sessions.
 */

import { useCallback, useMemo } from 'react';
import { useSpeedPassStore } from '@/stores/learning/speedpass-store';
import type {
  Textbook,
  TextbookChapter,
  TextbookKnowledgePoint,
  TextbookQuestion,
  UserTextbook,
  TeacherKeyPointInput,
  SpeedLearningMode,
  SpeedLearningTutorial,
  SpeedStudySession,
  Quiz,
  WrongQuestionRecord,
  StudyReport,
  StartSpeedLearningInput,
  CreateQuizInput,
  UserAcademicProfile,
  SPEED_LEARNING_MODES,
} from '@/types/learning/speedpass';

// ============================================================================
// Hook Return Type
// ============================================================================

interface UseSpeedPassReturn {
  // State
  isLoading: boolean;
  error: string | null;
  parseProgress: {
    textbookId: string;
    status: string;
    progress: number;
    message?: string;
  } | null;
  
  // Academic Profile
  academicProfile: UserAcademicProfile | null;
  setAcademicProfile: (profile: UserAcademicProfile) => void;
  updateAcademicProfile: (updates: Partial<UserAcademicProfile>) => void;
  
  // Textbooks
  textbooks: Textbook[];
  userTextbooks: UserTextbook[];
  currentTextbook: Textbook | undefined;
  setCurrentTextbook: (textbookId: string | null) => void;
  addTextbook: (textbook: Textbook) => void;
  removeTextbook: (textbookId: string) => void;
  getTextbookChapters: (textbookId: string) => TextbookChapter[];
  getTextbookKnowledgePoints: (textbookId: string) => TextbookKnowledgePoint[];
  getTextbookQuestions: (textbookId: string) => TextbookQuestion[];
  getRecommendedTextbooks: (courseId: string, universityId?: string) => Textbook[];
  addUserTextbook: (userId: string, textbookId: string, courseId?: string, source?: 'matched' | 'uploaded' | 'community') => UserTextbook;
  removeUserTextbook: (userTextbookId: string) => void;
  
  // Teacher Key Points
  processTeacherKeyPoints: (input: TeacherKeyPointInput) => Promise<void>;
  
  // Tutorials
  tutorials: SpeedLearningTutorial[];
  currentTutorial: SpeedLearningTutorial | undefined;
  createTutorial: (input: StartSpeedLearningInput) => Promise<SpeedLearningTutorial>;
  setCurrentTutorial: (tutorialId: string | null) => void;
  updateTutorialProgress: (tutorialId: string, sectionId: string) => void;
  completeTutorial: (tutorialId: string) => void;
  deleteTutorial: (tutorialId: string) => void;
  
  // Study Sessions
  currentSession: SpeedStudySession | undefined;
  startStudySession: (tutorialId: string) => SpeedStudySession;
  pauseStudySession: (sessionId: string) => void;
  resumeStudySession: (sessionId: string) => void;
  endStudySession: (sessionId: string) => void;
  
  // Quizzes
  currentQuiz: Quiz | undefined;
  createQuiz: (input: CreateQuizInput) => Quiz;
  startQuiz: (quizId: string) => void;
  answerQuestion: (quizId: string, questionIndex: number, answer: string) => void;
  useHint: (quizId: string, questionIndex: number) => string | undefined;
  nextQuestion: (quizId: string) => void;
  previousQuestion: (quizId: string) => void;
  completeQuiz: (quizId: string) => void;
  getQuizResults: (quizId: string) => { score: number; accuracy: number; wrongQuestions: string[] } | undefined;
  
  // Wrong Question Book
  wrongQuestions: WrongQuestionRecord[];
  wrongQuestionsCount: number;
  addWrongQuestion: (questionId: string, textbookId: string, userAnswer: string) => void;
  markWrongQuestionReviewed: (recordId: string, isCorrect: boolean) => void;
  getWrongQuestionsForReview: () => WrongQuestionRecord[];
  getWrongQuestionsByTextbook: (textbookId: string) => WrongQuestionRecord[];
  
  // Study Reports
  studyReports: StudyReport[];
  generateStudyReport: (sessionId?: string, tutorialId?: string) => StudyReport;
  getRecentReports: (limit?: number) => StudyReport[];
  
  // Statistics
  globalStats: {
    totalStudyTimeMs: number;
    sessionsCompleted: number;
    tutorialsCompleted: number;
    quizzesCompleted: number;
    totalQuestionsAttempted: number;
    totalQuestionsCorrect: number;
    averageAccuracy: number;
    currentStreak: number;
    longestStreak: number;
  };
  
  // Utilities
  getModeConfig: (mode: SpeedLearningMode) => typeof SPEED_LEARNING_MODES[SpeedLearningMode];
  formatStudyTime: (ms: number) => string;
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSpeedPass(): UseSpeedPassReturn {
  const store = useSpeedPassStore();
  
  // Memoized computed values
  const textbooks = useMemo(() => Object.values(store.textbooks), [store.textbooks]);
  const tutorials = useMemo(() => Object.values(store.tutorials), [store.tutorials]);
  const wrongQuestions = useMemo(() => Object.values(store.wrongQuestions), [store.wrongQuestions]);
  
  const currentTextbook = useMemo(
    () => (store.currentTextbookId ? store.textbooks[store.currentTextbookId] : undefined),
    [store.currentTextbookId, store.textbooks]
  );
  
  const currentTutorial = useMemo(
    () => (store.currentTutorialId ? store.tutorials[store.currentTutorialId] : undefined),
    [store.currentTutorialId, store.tutorials]
  );
  
  const currentSession = useMemo(
    () => (store.currentSessionId ? store.studySessions[store.currentSessionId] : undefined),
    [store.currentSessionId, store.studySessions]
  );
  
  const currentQuiz = useMemo(
    () => (store.currentQuizId ? store.quizzes[store.currentQuizId] : undefined),
    [store.currentQuizId, store.quizzes]
  );
  
  const wrongQuestionsCount = useMemo(
    () => wrongQuestions.filter((r) => r.status !== 'mastered').length,
    [wrongQuestions]
  );
  
  // Callbacks
  const getTextbookChapters = useCallback(
    (textbookId: string) => store.textbookChapters[textbookId] || [],
    [store.textbookChapters]
  );
  
  const getTextbookKnowledgePoints = useCallback(
    (textbookId: string) => store.textbookKnowledgePoints[textbookId] || [],
    [store.textbookKnowledgePoints]
  );
  
  const getTextbookQuestions = useCallback(
    (textbookId: string) => store.textbookQuestions[textbookId] || [],
    [store.textbookQuestions]
  );
  
  const addUserTextbook = useCallback(
    (userId: string, textbookId: string, courseId?: string, source: 'matched' | 'uploaded' | 'community' = 'matched') => {
      return store.addUserTextbook({
        userId,
        textbookId,
        courseId,
        source,
      });
    },
    [store]
  );
  
  const processTeacherKeyPoints = useCallback(
    async (input: TeacherKeyPointInput) => {
      await store.processTeacherKeyPoints(input);
    },
    [store]
  );
  
  const getModeConfig = useCallback((mode: SpeedLearningMode) => {
    return SPEED_LEARNING_MODES[mode];
  }, []);
  
  const formatStudyTime = useCallback((ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  }, []);
  
  const clearError = useCallback(() => {
    store.setError(null);
  }, [store]);
  
  return {
    // State
    isLoading: store.isLoading,
    error: store.error,
    parseProgress: store.parseProgress,
    
    // Academic Profile
    academicProfile: store.academicProfile,
    setAcademicProfile: store.setAcademicProfile,
    updateAcademicProfile: store.updateAcademicProfile,
    
    // Textbooks
    textbooks,
    userTextbooks: store.userTextbooks,
    currentTextbook,
    setCurrentTextbook: store.setCurrentTextbook,
    addTextbook: store.addTextbook,
    removeTextbook: store.removeTextbook,
    getTextbookChapters,
    getTextbookKnowledgePoints,
    getTextbookQuestions,
    getRecommendedTextbooks: store.getRecommendedTextbooks,
    addUserTextbook,
    removeUserTextbook: store.removeUserTextbook,
    
    // Teacher Key Points
    processTeacherKeyPoints,
    
    // Tutorials
    tutorials,
    currentTutorial,
    createTutorial: store.createTutorial,
    setCurrentTutorial: store.setCurrentTutorial,
    updateTutorialProgress: store.updateTutorialProgress,
    completeTutorial: store.completeTutorial,
    deleteTutorial: store.deleteTutorial,
    
    // Study Sessions
    currentSession,
    startStudySession: store.startStudySession,
    pauseStudySession: store.pauseStudySession,
    resumeStudySession: store.resumeStudySession,
    endStudySession: store.endStudySession,
    
    // Quizzes
    currentQuiz,
    createQuiz: store.createQuiz,
    startQuiz: store.startQuiz,
    answerQuestion: store.answerQuestion,
    useHint: store.useHint,
    nextQuestion: store.nextQuestion,
    previousQuestion: store.previousQuestion,
    completeQuiz: store.completeQuiz,
    getQuizResults: store.getQuizResults,
    
    // Wrong Question Book
    wrongQuestions,
    wrongQuestionsCount,
    addWrongQuestion: store.addWrongQuestion,
    markWrongQuestionReviewed: store.markWrongQuestionReviewed,
    getWrongQuestionsForReview: store.getWrongQuestionsForReview,
    getWrongQuestionsByTextbook: store.getWrongQuestionsByTextbook,
    
    // Study Reports
    studyReports: store.studyReports,
    generateStudyReport: store.generateStudyReport,
    getRecentReports: store.getRecentReports,
    
    // Statistics
    globalStats: store.globalStats,
    
    // Utilities
    getModeConfig,
    formatStudyTime,
    clearError,
    reset: store.reset,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for textbook management only
 */
export function useTextbooks() {
  const store = useSpeedPassStore();
  
  const textbooks = useMemo(() => Object.values(store.textbooks), [store.textbooks]);
  
  const currentTextbook = useMemo(
    () => (store.currentTextbookId ? store.textbooks[store.currentTextbookId] : undefined),
    [store.currentTextbookId, store.textbooks]
  );
  
  return {
    textbooks,
    userTextbooks: store.userTextbooks,
    currentTextbook,
    currentTextbookId: store.currentTextbookId,
    setCurrentTextbook: store.setCurrentTextbook,
    addTextbook: store.addTextbook,
    updateTextbook: store.updateTextbook,
    removeTextbook: store.removeTextbook,
    getRecommendedTextbooks: store.getRecommendedTextbooks,
    getChapters: (textbookId: string) => store.textbookChapters[textbookId] || [],
    getKnowledgePoints: (textbookId: string) => store.textbookKnowledgePoints[textbookId] || [],
    getQuestions: (textbookId: string) => store.textbookQuestions[textbookId] || [],
    parseProgress: store.parseProgress,
    isLoading: store.isLoading,
  };
}

/**
 * Hook for tutorial management only
 */
export function useTutorials() {
  const store = useSpeedPassStore();
  
  const tutorials = useMemo(() => Object.values(store.tutorials), [store.tutorials]);
  
  const currentTutorial = useMemo(
    () => (store.currentTutorialId ? store.tutorials[store.currentTutorialId] : undefined),
    [store.currentTutorialId, store.tutorials]
  );
  
  const activeTutorials = useMemo(
    () => tutorials.filter((t) => !t.completedAt),
    [tutorials]
  );
  
  const completedTutorials = useMemo(
    () => tutorials.filter((t) => t.completedAt),
    [tutorials]
  );
  
  return {
    tutorials,
    activeTutorials,
    completedTutorials,
    currentTutorial,
    currentTutorialId: store.currentTutorialId,
    createTutorial: store.createTutorial,
    setCurrentTutorial: store.setCurrentTutorial,
    updateProgress: store.updateTutorialProgress,
    completeTutorial: store.completeTutorial,
    deleteTutorial: store.deleteTutorial,
    isLoading: store.isLoading,
  };
}

/**
 * Hook for quiz management only
 */
export function useQuizzes() {
  const store = useSpeedPassStore();
  
  const quizzes = useMemo(() => Object.values(store.quizzes), [store.quizzes]);
  
  const currentQuiz = useMemo(
    () => (store.currentQuizId ? store.quizzes[store.currentQuizId] : undefined),
    [store.currentQuizId, store.quizzes]
  );
  
  const currentQuestion = useMemo(() => {
    if (!currentQuiz) return undefined;
    return currentQuiz.questions[currentQuiz.currentQuestionIndex];
  }, [currentQuiz]);
  
  const quizProgress = useMemo(() => {
    if (!currentQuiz) return 0;
    const answered = currentQuiz.questions.filter((q) => q.userAnswer !== undefined).length;
    return Math.round((answered / currentQuiz.questions.length) * 100);
  }, [currentQuiz]);
  
  return {
    quizzes,
    currentQuiz,
    currentQuizId: store.currentQuizId,
    currentQuestion,
    quizProgress,
    createQuiz: store.createQuiz,
    startQuiz: store.startQuiz,
    answerQuestion: store.answerQuestion,
    useHint: store.useHint,
    nextQuestion: store.nextQuestion,
    previousQuestion: store.previousQuestion,
    completeQuiz: store.completeQuiz,
    getResults: store.getQuizResults,
  };
}

/**
 * Hook for wrong question book management
 */
export function useWrongQuestions() {
  const store = useSpeedPassStore();
  
  const wrongQuestions = useMemo(() => Object.values(store.wrongQuestions), [store.wrongQuestions]);
  
  const dueForReview = useMemo(() => store.getWrongQuestionsForReview(), [store]);
  
  const stats = useMemo(() => {
    const total = wrongQuestions.length;
    const mastered = wrongQuestions.filter((r) => r.status === 'mastered').length;
    const reviewing = wrongQuestions.filter((r) => r.status === 'reviewing').length;
    const newItems = wrongQuestions.filter((r) => r.status === 'new').length;
    
    return { total, mastered, reviewing, new: newItems };
  }, [wrongQuestions]);
  
  return {
    wrongQuestions,
    dueForReview,
    stats,
    addWrongQuestion: store.addWrongQuestion,
    markReviewed: store.markWrongQuestionReviewed,
    getByTextbook: store.getWrongQuestionsByTextbook,
  };
}

/**
 * Hook for study statistics
 */
export function useStudyStats() {
  const store = useSpeedPassStore();
  
  const formattedTotalTime = useMemo(() => {
    const ms = store.globalStats.totalStudyTimeMs;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  }, [store.globalStats.totalStudyTimeMs]);
  
  return {
    ...store.globalStats,
    formattedTotalTime,
    recentReports: store.studyReports.slice(-10),
    generateReport: store.generateStudyReport,
  };
}
