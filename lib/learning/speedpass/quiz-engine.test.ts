/**
 * Quiz Engine Tests
 */

import {
  compareAnswers,
  selectQuestions,
  selectQuestionsWithDistribution,
  createQuizFromInput,
  createSectionQuiz,
  evaluateAnswer,
  generateHint,
  calculateQuizResult,
  createWrongQuestionRecord,
  updateWrongQuestionAfterReview,
  getQuestionsDueForReview,
  recommendSimilarQuestions,
} from './quiz-engine';
import { createMockQuestion, createMockQuizQuestion } from './test-helpers';
import type { TextbookQuestion, Quiz, QuizQuestion, WrongQuestionRecord } from '@/types/learning/speedpass';

describe('quiz-engine', () => {
  describe('compareAnswers', () => {
    it('should match exact answers', () => {
      expect(compareAnswers('A', 'A')).toBe(true);
      expect(compareAnswers('hello', 'hello')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(compareAnswers('Answer', 'answer')).toBe(true);
      expect(compareAnswers('HELLO', 'hello')).toBe(true);
    });

    it('should normalize whitespace', () => {
      expect(compareAnswers('hello  world', 'hello world')).toBe(true);
      expect(compareAnswers(' trimmed ', 'trimmed')).toBe(true);
    });

    it('should normalize Chinese punctuation', () => {
      expect(compareAnswers('你好，世界', '你好,世界')).toBe(true);
      expect(compareAnswers('问题？', '问题?')).toBe(true);
    });

    it('should match choice letters', () => {
      expect(compareAnswers('a', 'A')).toBe(true);
      expect(compareAnswers('B', 'b')).toBe(true);
      expect(compareAnswers('c', 'D')).toBe(false);
    });

    it('should match if user answer contains correct answer', () => {
      expect(compareAnswers('The answer is 42', '42')).toBe(true);
    });

    it('should return false for mismatched answers', () => {
      expect(compareAnswers('wrong', 'correct')).toBe(false);
    });
  });

  describe('selectQuestions', () => {
    const mockQuestions: TextbookQuestion[] = [
      createMockQuestion({ id: 'q1', sourceType: 'example', difficulty: 0.3, knowledgePointIds: ['kp1'] }),
      createMockQuestion({ id: 'q2', sourceType: 'exercise', difficulty: 0.6, knowledgePointIds: ['kp1', 'kp2'] }),
      createMockQuestion({ id: 'q3', chapterId: 'ch2', sourceType: 'exam', difficulty: 0.9, knowledgePointIds: ['kp2'] }),
    ];

    it('should select questions up to count limit', () => {
      const result = selectQuestions(mockQuestions, { textbookId: 'tb1', count: 2 });
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should filter by knowledge point IDs', () => {
      const result = selectQuestions(mockQuestions, { textbookId: 'tb1', knowledgePointIds: ['kp2'], count: 10 });
      expect(result.every(q => q.knowledgePointIds.includes('kp2'))).toBe(true);
    });

    it('should filter by chapter IDs', () => {
      const result = selectQuestions(mockQuestions, { textbookId: 'tb1', chapterIds: ['ch1'], count: 10 });
      expect(result.every(q => q.chapterId === 'ch1')).toBe(true);
    });

    it('should filter by difficulty level', () => {
      const easyQuestions = selectQuestions(mockQuestions, { textbookId: 'tb1', difficulty: 'easy', count: 10 });
      expect(easyQuestions.every(q => q.difficulty <= 0.33)).toBe(true);
    });

    it('should exclude specified question IDs', () => {
      const result = selectQuestions(mockQuestions, { textbookId: 'tb1', excludeQuestionIds: ['q1'], count: 10 });
      expect(result.every(q => q.id !== 'q1')).toBe(true);
    });
  });

  describe('selectQuestionsWithDistribution', () => {
    const mockQuestions: TextbookQuestion[] = [
      createMockQuestion({ id: 'q1', sourceType: 'example' }),
      createMockQuestion({ id: 'q2', sourceType: 'example' }),
      createMockQuestion({ id: 'q3', sourceType: 'exercise' }),
      createMockQuestion({ id: 'q4', sourceType: 'exam' }),
      createMockQuestion({ id: 'q5', sourceType: 'ai_generated' }),
    ];

    it('should select questions based on mode distribution', () => {
      const result = selectQuestionsWithDistribution(mockQuestions, 3, 'extreme');
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should filter by knowledge point IDs', () => {
      const result = selectQuestionsWithDistribution(mockQuestions, 3, 'speed', ['kp1']);
      expect(result.every(q => q.knowledgePointIds.includes('kp1'))).toBe(true);
    });

    it('should handle empty question list', () => {
      const result = selectQuestionsWithDistribution([], 5, 'comprehensive');
      expect(result).toEqual([]);
    });
  });

  describe('createQuizFromInput', () => {
    const mockQuestions: TextbookQuestion[] = [
      createMockQuestion({ id: 'q1' }),
      createMockQuestion({ id: 'q2' }),
    ];

    it('should create quiz with correct structure', () => {
      const quiz = createQuizFromInput({ textbookId: 'tb1', questionCount: 2 }, mockQuestions, 'user1');
      expect(quiz.id).toMatch(/^quiz_\d+$/);
      expect(quiz.userId).toBe('user1');
      expect(quiz.questions.length).toBeLessThanOrEqual(2);
    });

    it('should include quiz questions with hints available', () => {
      const quiz = createQuizFromInput({ textbookId: 'tb1', questionCount: 1 }, mockQuestions, 'user1');
      if (quiz.questions.length > 0) {
        expect(quiz.questions[0].hintsAvailable).toBe(3);
      }
    });
  });

  describe('createSectionQuiz', () => {
    const mockQuestions: TextbookQuestion[] = [createMockQuestion({ id: 'q1' })];

    it('should create section quiz', () => {
      const quiz = createSectionQuiz('section1', ['kp1'], mockQuestions, 5, 'user1');
      expect(quiz.id).toContain('section1');
      expect(quiz.sessionId).toBe('section1');
      expect(quiz.title).toBe('随堂测验');
    });
  });

  describe('evaluateAnswer', () => {
    it('should evaluate correct answer', () => {
      const question = createMockQuestion({
        solution: { answer: '4', steps: [{ stepNumber: 1, content: '2+2=4' }] },
      });
      const result = evaluateAnswer(question, '4');
      expect(result.isCorrect).toBe(true);
      expect(result.correctAnswer).toBe('4');
    });

    it('should evaluate incorrect answer', () => {
      const question = createMockQuestion({
        solution: { answer: '4', steps: [] },
      });
      const result = evaluateAnswer(question, '5');
      expect(result.isCorrect).toBe(false);
    });

    it('should handle question without solution', () => {
      const question = createMockQuestion({});
      const result = evaluateAnswer(question, 'any');
      expect(result.isCorrect).toBe(false);
      expect(result.correctAnswer).toBe('答案未知');
    });
  });

  describe('generateHint', () => {
    it('should generate hints', () => {
      const question = createMockQuestion({
        solution: { answer: 'answer', steps: [{ stepNumber: 1, content: '第一步提示' }] },
      });
      expect(generateHint(question, 0)).toContain('仔细审题');
      expect(generateHint(question, 1)).toContain('回顾');
      expect(generateHint(question, 2)).toContain('第一步提示');
    });
  });

  describe('calculateQuizResult', () => {
    it('should calculate result for all correct answers', () => {
      const quiz: Quiz = {
        id: 'quiz1',
        userId: 'user1',
        title: 'Test Quiz',
        knowledgePointIds: ['kp1'],
        questionCount: 2,
        questions: [
          { ...createMockQuizQuestion(), userAnswer: 'a', isCorrect: true },
          { ...createMockQuizQuestion({ id: 'qq2' }), userAnswer: 'b', isCorrect: true },
        ],
        currentQuestionIndex: 0,
      };
      const result = calculateQuizResult(quiz, 5000);
      expect(result.correctAnswers).toBe(2);
      expect(result.accuracy).toBe(100);
    });

    it('should calculate result for mixed answers', () => {
      const quiz: Quiz = {
        id: 'quiz1',
        userId: 'user1',
        title: 'Test Quiz',
        knowledgePointIds: ['kp1'],
        questionCount: 3,
        questions: [
          { ...createMockQuizQuestion(), userAnswer: 'a', isCorrect: true },
          { ...createMockQuizQuestion({ id: 'qq2' }), userAnswer: 'b', isCorrect: false },
          { ...createMockQuizQuestion({ id: 'qq3' }), userAnswer: undefined, isCorrect: undefined },
        ],
        currentQuestionIndex: 0,
      };
      const result = calculateQuizResult(quiz, 10000);
      expect(result.answeredQuestions).toBe(2);
      expect(result.correctAnswers).toBe(1);
      expect(result.skippedQuestions).toBe(1);
    });
  });

  describe('createWrongQuestionRecord', () => {
    it('should create wrong question record', () => {
      const record = createWrongQuestionRecord('q1', 'tb1', 'wrong answer', 'user1');
      expect(record.id).toMatch(/^wrq_\d+$/);
      expect(record.userId).toBe('user1');
      expect(record.questionId).toBe('q1');
      expect(record.status).toBe('new');
      expect(record.attempts).toHaveLength(1);
    });
  });

  describe('updateWrongQuestionAfterReview', () => {
    const baseRecord: WrongQuestionRecord = {
      id: 'wrq1',
      userId: 'user1',
      questionId: 'q1',
      textbookId: 'tb1',
      attempts: [{ attemptedAt: new Date(), userAnswer: 'wrong', isCorrect: false, timeSpentMs: 1000 }],
      status: 'new',
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should add new attempt and increment review count', () => {
      const updated = updateWrongQuestionAfterReview(baseRecord, true, 'correct', 2000);
      expect(updated.attempts).toHaveLength(2);
      expect(updated.reviewCount).toBe(1);
    });

    it('should mark as mastered after 3 correct answers', () => {
      let record = baseRecord;
      for (let i = 0; i < 3; i++) {
        record = updateWrongQuestionAfterReview(record, true, 'correct', 1000);
      }
      expect(record.status).toBe('mastered');
    });
  });

  describe('getQuestionsDueForReview', () => {
    const pastDate = new Date(Date.now() - 86400000);
    const futureDate = new Date(Date.now() + 86400000);

    const mockRecords: WrongQuestionRecord[] = [
      { id: 'wrq1', userId: 'user1', questionId: 'q1', textbookId: 'tb1', attempts: [], status: 'new', reviewCount: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: 'wrq2', userId: 'user1', questionId: 'q2', textbookId: 'tb1', attempts: [], status: 'reviewing', reviewCount: 2, nextReviewAt: pastDate, createdAt: new Date(), updatedAt: new Date() },
      { id: 'wrq3', userId: 'user1', questionId: 'q3', textbookId: 'tb1', attempts: [], status: 'reviewing', reviewCount: 1, nextReviewAt: futureDate, createdAt: new Date(), updatedAt: new Date() },
      { id: 'wrq4', userId: 'user1', questionId: 'q4', textbookId: 'tb1', attempts: [], status: 'mastered', reviewCount: 5, createdAt: new Date(), updatedAt: new Date() },
    ];

    it('should return questions due for review', () => {
      const due = getQuestionsDueForReview(mockRecords);
      expect(due.some(r => r.id === 'wrq1')).toBe(true);
      expect(due.some(r => r.id === 'wrq2')).toBe(true);
    });

    it('should exclude mastered and future review questions', () => {
      const due = getQuestionsDueForReview(mockRecords);
      expect(due.every(r => r.status !== 'mastered')).toBe(true);
      expect(due.some(r => r.id === 'wrq3')).toBe(false);
    });
  });

  describe('recommendSimilarQuestions', () => {
    const mockQuestions: TextbookQuestion[] = [
      createMockQuestion({ id: 'q1', knowledgePointIds: ['kp1', 'kp2'] }),
      createMockQuestion({ id: 'q2', knowledgePointIds: ['kp1'] }),
      createMockQuestion({ id: 'q3', knowledgePointIds: ['kp3'] }),
    ];

    it('should recommend questions with shared knowledge points', () => {
      const similar = recommendSimilarQuestions(mockQuestions[0], mockQuestions);
      expect(similar.some(q => q.id === 'q2')).toBe(true);
      expect(similar.every(q => q.id !== 'q1')).toBe(true);
    });

    it('should not include unrelated questions', () => {
      const similar = recommendSimilarQuestions(mockQuestions[0], mockQuestions);
      expect(similar.every(q => q.id !== 'q3')).toBe(true);
    });

    it('should respect limit parameter', () => {
      const similar = recommendSimilarQuestions(mockQuestions[0], mockQuestions, 1);
      expect(similar.length).toBeLessThanOrEqual(1);
    });
  });
});
