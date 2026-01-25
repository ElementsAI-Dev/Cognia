/**
 * Test Helpers for SpeedPass Module
 * 
 * Provides factory functions to create properly typed mock objects for tests.
 */

import type {
  TextbookKnowledgePoint,
  TextbookQuestion,
  TextbookChapter,
  Quiz,
  QuizQuestion,
  WrongQuestionRecord,
  SpeedStudySession,
  SpeedLearningTutorial,
  TutorialSection,
  Textbook,
} from '@/types/learning/speedpass';

export function createMockKnowledgePoint(
  overrides: Partial<TextbookKnowledgePoint> = {}
): TextbookKnowledgePoint {
  return {
    id: 'kp_test_1',
    textbookId: 'tb1',
    chapterId: 'ch1',
    title: 'Test Knowledge Point',
    content: 'Test content',
    type: 'definition',
    importance: 'medium',
    difficulty: 0.5,
    pageNumber: 1,
    extractionConfidence: 0.8,
    verified: false,
    ...overrides,
  };
}

export function createMockQuestion(
  overrides: Partial<TextbookQuestion> = {}
): TextbookQuestion {
  return {
    id: 'q_test_1',
    textbookId: 'tb1',
    chapterId: 'ch1',
    questionNumber: '1.1',
    content: 'Test question content',
    sourceType: 'example',
    questionType: 'short_answer',
    difficulty: 0.5,
    pageNumber: 1,
    knowledgePointIds: ['kp1'],
    hasSolution: false,
    learningValue: 'recommended',
    extractionConfidence: 0.8,
    verified: false,
    ...overrides,
  };
}

export function createMockChapter(
  overrides: Partial<TextbookChapter> = {}
): TextbookChapter {
  return {
    id: 'ch_test_1',
    textbookId: 'tb1',
    chapterNumber: '1',
    title: 'Test Chapter',
    level: 1,
    orderIndex: 1,
    pageStart: 1,
    pageEnd: 10,
    knowledgePointCount: 0,
    exampleCount: 0,
    exerciseCount: 0,
    ...overrides,
  };
}

export function createMockQuizQuestion(
  overrides: Partial<QuizQuestion> = {}
): QuizQuestion {
  return {
    id: 'qq_test_1',
    sourceQuestion: createMockQuestion(),
    source: 'textbook_example',
    hintsUsed: 0,
    hintsAvailable: 3,
    ...overrides,
  };
}

export function createMockQuiz(overrides: Partial<Quiz> = {}): Quiz {
  return {
    id: 'quiz_test_1',
    userId: 'user1',
    title: 'Test Quiz',
    knowledgePointIds: ['kp1'],
    questionCount: 1,
    questions: [createMockQuizQuestion()],
    currentQuestionIndex: 0,
    ...overrides,
  };
}

export function createMockWrongQuestionRecord(
  overrides: Partial<WrongQuestionRecord> = {}
): WrongQuestionRecord {
  return {
    id: 'wrq_test_1',
    userId: 'user1',
    questionId: 'q1',
    textbookId: 'tb1',
    attempts: [
      {
        attemptedAt: new Date(),
        userAnswer: 'wrong',
        isCorrect: false,
        timeSpentMs: 1000,
      },
    ],
    status: 'new',
    reviewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockSession(
  overrides: Partial<SpeedStudySession> = {}
): SpeedStudySession {
  return {
    id: 'session_test_1',
    tutorialId: 'tutorial1',
    userId: 'user1',
    startedAt: new Date(),
    status: 'active',
    sectionsCompleted: [],
    questionsAttempted: 0,
    questionsCorrect: 0,
    totalPausedMs: 0,
    timeSpentMs: 0,
    ...overrides,
  };
}

export function createMockTutorialSection(
  overrides: Partial<TutorialSection> = {}
): TutorialSection {
  return {
    id: 'section_test_1',
    knowledgePointId: 'kp1',
    orderIndex: 0,
    importanceLevel: 'important',
    textbookLocation: {
      textbookName: 'Test Book',
      chapter: '1',
      section: '1.1',
      pageRange: 'P1-5',
    },
    originalContent: 'Test content',
    quickSummary: 'Test summary',
    keyPoints: ['Point 1', 'Point 2'],
    mustKnowFormulas: [],
    examples: [],
    recommendedExercises: [],
    commonMistakes: ['Mistake 1'],
    memoryTips: ['Tip 1'],
    estimatedMinutes: 10,
    ...overrides,
  };
}

export function createMockTutorial(
  overrides: Partial<SpeedLearningTutorial> = {}
): SpeedLearningTutorial {
  return {
    id: 'tutorial_test_1',
    userId: 'user1',
    courseId: 'course1',
    textbookId: 'tb1',
    mode: 'speed',
    createdAt: new Date(),
    teacherKeyPointIds: [],
    title: 'Test Tutorial',
    overview: 'Test overview',
    sections: [createMockTutorialSection()],
    totalEstimatedMinutes: 10,
    completedSectionIds: [],
    progress: 0,
    ...overrides,
  };
}

export function createMockTextbook(overrides: Partial<Textbook> = {}): Textbook {
  return {
    id: 'textbook_test_1',
    name: 'Test Textbook',
    author: 'Test Author',
    publisher: 'Test Publisher',
    parseStatus: 'completed',
    source: 'user_upload',
    isPublic: false,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
