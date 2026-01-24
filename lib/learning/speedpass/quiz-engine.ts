/**
 * Quiz Engine
 * 
 * Intelligent question selection, quiz generation, and scoring
 * for speed learning mode. Includes wrong question tracking.
 */

import type {
  TextbookQuestion,
  Quiz,
  QuizQuestion,
  QuestionBankSource,
  SpeedLearningMode,
  WrongQuestionRecord,
  CreateQuizInput,
} from '@/types/learning/speedpass';

// ============================================================================
// Types
// ============================================================================

export interface QuestionSelectionCriteria {
  textbookId: string;
  knowledgePointIds?: string[];
  chapterIds?: string[];
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  sources?: QuestionBankSource[];
  excludeQuestionIds?: string[];
  count: number;
}

export interface QuizResult {
  quizId: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedQuestions: number;
  accuracy: number;
  score: number;
  maxScore: number;
  timeSpentMs: number;
  wrongQuestionIds: string[];
  strengthKnowledgePoints: string[];
  weakKnowledgePoints: string[];
}

export interface AnswerEvaluation {
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
  partialCredit?: number;
}

// ============================================================================
// Question Selection Strategies
// ============================================================================

const SOURCE_DISTRIBUTIONS: Record<SpeedLearningMode, Record<QuestionBankSource, number>> = {
  extreme: {
    textbook_example: 70,
    textbook_exercise: 15,
    past_exam: 10,
    ai_generated: 5,
  },
  speed: {
    textbook_example: 60,
    textbook_exercise: 20,
    past_exam: 15,
    ai_generated: 5,
  },
  comprehensive: {
    textbook_example: 40,
    textbook_exercise: 35,
    past_exam: 20,
    ai_generated: 5,
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get source type from TextbookQuestion
 */
function getSourceType(question: TextbookQuestion): QuestionBankSource {
  switch (question.sourceType) {
    case 'example':
      return 'textbook_example';
    case 'exercise':
      return 'textbook_exercise';
    case 'exam':
      return 'past_exam';
    case 'ai_generated':
      return 'ai_generated';
    default:
      return 'textbook_example';
  }
}

/**
 * Normalize answer for comparison
 */
function normalizeAnswer(answer: string): string {
  return answer
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[，。！？、；：""''（）【】]/g, (match) => {
      const map = new Map<string, string>([
        ['，', ','], ['。', '.'], ['！', '!'], ['？', '?'],
        ['、', ','], ['；', ';'], ['：', ':'],
        ['\u201c', '"'], ['\u201d', '"'], ['\u2018', "'"], ['\u2019', "'"],
        ['（', '('], ['）', ')'], ['【', '['], ['】', ']'],
      ]);
      return map.get(match) || match;
    });
}

/**
 * Compare two answers for equality
 */
export function compareAnswers(userAnswer: string, correctAnswer: string): boolean {
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);
  
  // Exact match
  if (normalizedUser === normalizedCorrect) return true;
  
  // Check if user answer contains correct answer (for short answers)
  if (normalizedCorrect.length < 50 && normalizedUser.includes(normalizedCorrect)) {
    return true;
  }
  
  // For choice questions, check option letter
  if (/^[a-d]$/i.test(normalizedUser) && /^[a-d]$/i.test(normalizedCorrect)) {
    return normalizedUser === normalizedCorrect;
  }
  
  return false;
}

// ============================================================================
// Question Selection Functions
// ============================================================================

/**
 * Select questions based on criteria
 */
export function selectQuestions(
  allQuestions: TextbookQuestion[],
  criteria: QuestionSelectionCriteria
): TextbookQuestion[] {
  let filtered = [...allQuestions];
  
  // Filter by knowledge points
  if (criteria.knowledgePointIds?.length) {
    filtered = filtered.filter((q) =>
      q.knowledgePointIds.some((kpId) => criteria.knowledgePointIds?.includes(kpId))
    );
  }
  
  // Filter by chapters
  if (criteria.chapterIds?.length) {
    filtered = filtered.filter((q) => criteria.chapterIds?.includes(q.chapterId));
  }
  
  // Filter by difficulty
  if (criteria.difficulty && criteria.difficulty !== 'mixed') {
    const difficultyRanges: Record<string, [number, number]> = {
      easy: [0, 0.33],
      medium: [0.33, 0.66],
      hard: [0.66, 1],
    };
    const [min, max] = difficultyRanges[criteria.difficulty];
    filtered = filtered.filter((q) => q.difficulty >= min && q.difficulty <= max);
  }
  
  // Filter by sources
  if (criteria.sources?.length) {
    filtered = filtered.filter((q) => criteria.sources?.includes(getSourceType(q)));
  }
  
  // Exclude specific questions
  if (criteria.excludeQuestionIds?.length) {
    filtered = filtered.filter((q) => !criteria.excludeQuestionIds?.includes(q.id));
  }
  
  // Shuffle and select
  const shuffled = shuffleArray(filtered);
  return shuffled.slice(0, criteria.count);
}

/**
 * Select questions with balanced source distribution
 */
export function selectQuestionsWithDistribution(
  allQuestions: TextbookQuestion[],
  totalCount: number,
  mode: SpeedLearningMode,
  knowledgePointIds?: string[]
): TextbookQuestion[] {
  const distribution = SOURCE_DISTRIBUTIONS[mode];
  const selected: TextbookQuestion[] = [];
  
  // Filter by knowledge points if provided
  const filtered = knowledgePointIds?.length
    ? allQuestions.filter((q) =>
        q.knowledgePointIds.some((kpId) => knowledgePointIds.includes(kpId))
      )
    : allQuestions;
  
  // Group by source
  const bySource: Record<QuestionBankSource, TextbookQuestion[]> = {
    textbook_example: [],
    textbook_exercise: [],
    past_exam: [],
    ai_generated: [],
  };
  
  for (const q of filtered) {
    const source = getSourceType(q);
    bySource[source].push(q);
  }
  
  // Select from each source according to distribution
  for (const [source, percentage] of Object.entries(distribution)) {
    const sourceQuestions = shuffleArray(bySource[source as QuestionBankSource]);
    const targetCount = Math.round((totalCount * percentage) / 100);
    selected.push(...sourceQuestions.slice(0, targetCount));
  }
  
  // If we don't have enough, fill with any available
  if (selected.length < totalCount) {
    const selectedIds = new Set(selected.map((q) => q.id));
    const remaining = shuffleArray(filtered.filter((q) => !selectedIds.has(q.id)));
    selected.push(...remaining.slice(0, totalCount - selected.length));
  }
  
  return shuffleArray(selected).slice(0, totalCount);
}

// ============================================================================
// Quiz Generation Functions
// ============================================================================

/**
 * Create a quiz from input
 */
export function createQuizFromInput(
  input: CreateQuizInput,
  allQuestions: TextbookQuestion[],
  userId: string
): Quiz {
  const selectedQuestions = selectQuestions(allQuestions, {
    textbookId: input.textbookId,
    knowledgePointIds: input.knowledgePointIds,
    chapterIds: input.chapterIds,
    difficulty: input.difficulty,
    sources: input.sources,
    count: input.questionCount,
  });
  
  const quizQuestions: QuizQuestion[] = selectedQuestions.map((q) => ({
    id: `qq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    sourceQuestion: q,
    source: getSourceType(q),
    hintsUsed: 0,
    hintsAvailable: 3,
  }));
  
  return {
    id: `quiz_${Date.now()}`,
    userId,
    title: `${input.questionCount}道题测验`,
    knowledgePointIds: input.knowledgePointIds || [],
    questionCount: quizQuestions.length,
    timeLimit: input.timeLimit,
    questions: quizQuestions,
    currentQuestionIndex: 0,
  };
}

/**
 * Generate quiz for tutorial section
 */
export function createSectionQuiz(
  sectionId: string,
  knowledgePointIds: string[],
  allQuestions: TextbookQuestion[],
  questionCount: number = 5,
  userId: string
): Quiz {
  const selected = selectQuestionsWithDistribution(
    allQuestions,
    questionCount,
    'speed',
    knowledgePointIds
  );
  
  const quizQuestions: QuizQuestion[] = selected.map((q) => ({
    id: `qq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    sourceQuestion: q,
    source: getSourceType(q),
    hintsUsed: 0,
    hintsAvailable: 2,
  }));
  
  return {
    id: `quiz_section_${sectionId}_${Date.now()}`,
    sessionId: sectionId,
    userId,
    title: '随堂测验',
    knowledgePointIds,
    questionCount: quizQuestions.length,
    questions: quizQuestions,
    currentQuestionIndex: 0,
  };
}

// ============================================================================
// Answer Evaluation Functions
// ============================================================================

/**
 * Evaluate user's answer
 */
export function evaluateAnswer(
  question: TextbookQuestion,
  userAnswer: string
): AnswerEvaluation {
  const solution = question.solution || question.aiGeneratedSolution;
  
  if (!solution) {
    return {
      isCorrect: false,
      userAnswer,
      correctAnswer: '答案未知',
      explanation: '该题目暂无标准答案',
    };
  }
  
  const isCorrect = compareAnswers(userAnswer, solution.answer);
  
  return {
    isCorrect,
    userAnswer,
    correctAnswer: solution.answer,
    explanation: solution.steps?.map((s) => s.content).join('\n'),
  };
}

/**
 * Generate hint for a question
 */
export function generateHint(question: TextbookQuestion, hintIndex: number): string {
  const hints = [
    '仔细审题，注意题目中的关键条件',
    '回顾相关的定义和公式，想想它们如何应用',
    question.solution?.steps[0]?.content || '尝试从基本概念出发，逐步推导',
  ];
  
  return hints[Math.min(hintIndex, hints.length - 1)];
}

// ============================================================================
// Quiz Result Functions
// ============================================================================

/**
 * Calculate quiz results
 */
export function calculateQuizResult(quiz: Quiz, timeSpentMs: number): QuizResult {
  const answeredQuestions = quiz.questions.filter((q) => q.userAnswer !== undefined);
  const correctAnswers = quiz.questions.filter((q) => q.isCorrect === true);
  const incorrectAnswers = quiz.questions.filter((q) => q.isCorrect === false);
  const skippedQuestions = quiz.questions.filter((q) => q.userAnswer === undefined);
  
  const wrongQuestionIds = incorrectAnswers.map((q) => q.sourceQuestion.id);
  
  // Analyze knowledge point performance
  const kpPerformance: Record<string, { correct: number; total: number }> = {};
  
  for (const q of answeredQuestions) {
    for (const kpId of q.sourceQuestion.knowledgePointIds) {
      if (!kpPerformance[kpId]) {
        kpPerformance[kpId] = { correct: 0, total: 0 };
      }
      kpPerformance[kpId].total++;
      if (q.isCorrect) {
        kpPerformance[kpId].correct++;
      }
    }
  }
  
  const strengthKnowledgePoints: string[] = [];
  const weakKnowledgePoints: string[] = [];
  
  for (const [kpId, perf] of Object.entries(kpPerformance)) {
    const accuracy = perf.correct / perf.total;
    if (accuracy >= 0.8) {
      strengthKnowledgePoints.push(kpId);
    } else if (accuracy < 0.5) {
      weakKnowledgePoints.push(kpId);
    }
  }
  
  return {
    quizId: quiz.id,
    totalQuestions: quiz.questions.length,
    answeredQuestions: answeredQuestions.length,
    correctAnswers: correctAnswers.length,
    incorrectAnswers: incorrectAnswers.length,
    skippedQuestions: skippedQuestions.length,
    accuracy: answeredQuestions.length > 0
      ? Math.round((correctAnswers.length / answeredQuestions.length) * 100)
      : 0,
    score: correctAnswers.length,
    maxScore: quiz.questions.length,
    timeSpentMs,
    wrongQuestionIds,
    strengthKnowledgePoints,
    weakKnowledgePoints,
  };
}

// ============================================================================
// Wrong Question Book Functions
// ============================================================================

/**
 * Create wrong question record
 */
export function createWrongQuestionRecord(
  questionId: string,
  textbookId: string,
  userAnswer: string,
  userId: string
): WrongQuestionRecord {
  return {
    id: `wrq_${Date.now()}`,
    userId,
    questionId,
    textbookId,
    attempts: [{
      attemptedAt: new Date(),
      userAnswer,
      isCorrect: false,
      timeSpentMs: 0,
    }],
    status: 'new',
    reviewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Update wrong question record after review
 */
export function updateWrongQuestionAfterReview(
  record: WrongQuestionRecord,
  isCorrect: boolean,
  userAnswer: string,
  timeSpentMs: number
): WrongQuestionRecord {
  const newAttempts = [
    ...record.attempts,
    {
      attemptedAt: new Date(),
      userAnswer,
      isCorrect,
      timeSpentMs,
    },
  ];
  
  // Determine new status
  let newStatus: 'new' | 'reviewing' | 'mastered' = 'reviewing';
  
  // If correct 3 times in a row, consider mastered
  const recentAttempts = newAttempts.slice(-3);
  if (recentAttempts.length >= 3 && recentAttempts.every((a) => a.isCorrect)) {
    newStatus = 'mastered';
  }
  
  // Calculate next review date using spaced repetition
  const correctStreak = getCorrectStreak(newAttempts);
  const daysUntilReview = calculateReviewInterval(correctStreak);
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + daysUntilReview);
  
  return {
    ...record,
    attempts: newAttempts,
    status: newStatus,
    reviewCount: record.reviewCount + 1,
    lastReviewedAt: new Date(),
    nextReviewAt,
    updatedAt: new Date(),
  };
}

/**
 * Get current correct answer streak
 */
function getCorrectStreak(attempts: WrongQuestionRecord['attempts']): number {
  let streak = 0;
  for (let i = attempts.length - 1; i >= 0; i--) {
    if (attempts[i].isCorrect) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Calculate review interval based on streak (simple spaced repetition)
 */
function calculateReviewInterval(correctStreak: number): number {
  // 1, 3, 7, 14, 30, 60 days
  const intervals = [1, 3, 7, 14, 30, 60];
  return intervals[Math.min(correctStreak, intervals.length - 1)];
}

/**
 * Get questions due for review
 */
export function getQuestionsDueForReview(
  wrongQuestions: WrongQuestionRecord[]
): WrongQuestionRecord[] {
  const now = new Date();
  
  return wrongQuestions
    .filter((r) => r.status !== 'mastered')
    .filter((r) => !r.nextReviewAt || new Date(r.nextReviewAt) <= now)
    .sort((a, b) => {
      // Prioritize: new > reviewing, then by review count (fewer first)
      if (a.status !== b.status) {
        return a.status === 'new' ? -1 : 1;
      }
      return a.reviewCount - b.reviewCount;
    });
}

/**
 * Recommend similar questions for practice
 */
export function recommendSimilarQuestions(
  wrongQuestion: TextbookQuestion,
  allQuestions: TextbookQuestion[],
  limit: number = 5
): TextbookQuestion[] {
  // Find questions with same knowledge points
  const sameKPQuestions = allQuestions.filter((q) =>
    q.id !== wrongQuestion.id &&
    q.knowledgePointIds.some((kpId) => wrongQuestion.knowledgePointIds.includes(kpId))
  );
  
  // Sort by similarity (more shared knowledge points = more similar)
  sameKPQuestions.sort((a, b) => {
    const aShared = a.knowledgePointIds.filter((kpId) =>
      wrongQuestion.knowledgePointIds.includes(kpId)
    ).length;
    const bShared = b.knowledgePointIds.filter((kpId) =>
      wrongQuestion.knowledgePointIds.includes(kpId)
    ).length;
    return bShared - aShared;
  });
  
  return sameKPQuestions.slice(0, limit);
}
