/**
 * Study Analyzer Tests
 */

import {
  analyzeSession,
  calculateEfficiencyScore,
  analyzeKnowledgePointMastery,
  identifyWeakPoints,
  generateLearningInsights,
  generateStudyReport,
  generateRecommendations,
  formatStudyTime,
  calculateStreak,
} from './study-analyzer';
import {
  createMockSession,
  createMockTutorial,
  createMockQuiz,
  createMockQuizQuestion,
  createMockKnowledgePoint,
  createMockWrongQuestionRecord,
} from './test-helpers';

describe('study-analyzer', () => {
  describe('analyzeSession', () => {
    it('should analyze session duration', () => {
      const startTime = new Date(Date.now() - 3600000); // 1 hour ago
      const session = createMockSession({
        startedAt: startTime,
        endedAt: new Date(),
        totalPausedMs: 600000, // 10 minutes paused
        sectionsCompleted: ['s1', 's2'],
        questionsAttempted: 10,
        questionsCorrect: 8,
      });
      const tutorial = createMockTutorial({
        sections: [
          { id: 's1', knowledgePointId: 'kp1', orderIndex: 0, importanceLevel: 'important', textbookLocation: { textbookName: '', chapter: '', section: '', pageRange: '' }, originalContent: '', quickSummary: '', keyPoints: [], mustKnowFormulas: [], examples: [], recommendedExercises: [], commonMistakes: [], memoryTips: [], estimatedMinutes: 10 },
          { id: 's2', knowledgePointId: 'kp2', orderIndex: 1, importanceLevel: 'important', textbookLocation: { textbookName: '', chapter: '', section: '', pageRange: '' }, originalContent: '', quickSummary: '', keyPoints: [], mustKnowFormulas: [], examples: [], recommendedExercises: [], commonMistakes: [], memoryTips: [], estimatedMinutes: 10 },
          { id: 's3', knowledgePointId: 'kp3', orderIndex: 2, importanceLevel: 'important', textbookLocation: { textbookName: '', chapter: '', section: '', pageRange: '' }, originalContent: '', quickSummary: '', keyPoints: [], mustKnowFormulas: [], examples: [], recommendedExercises: [], commonMistakes: [], memoryTips: [], estimatedMinutes: 10 },
        ],
        totalEstimatedMinutes: 30,
      });

      const analysis = analyzeSession(session, tutorial);

      expect(analysis.sessionId).toBe(session.id);
      expect(analysis.duration.totalMs).toBeGreaterThan(0);
      expect(analysis.duration.pausedMs).toBe(600000);
      expect(analysis.progress.sectionsCompleted).toBe(2);
      expect(analysis.progress.sectionsTotal).toBe(3);
      expect(analysis.performance.accuracy).toBe(80);
    });

    it('should calculate progress percentage', () => {
      const session = createMockSession({
        sectionsCompleted: ['s1'],
      });
      const tutorial = createMockTutorial({
        sections: [
          { id: 's1', knowledgePointId: 'kp1', orderIndex: 0, importanceLevel: 'important', textbookLocation: { textbookName: '', chapter: '', section: '', pageRange: '' }, originalContent: '', quickSummary: '', keyPoints: [], mustKnowFormulas: [], examples: [], recommendedExercises: [], commonMistakes: [], memoryTips: [], estimatedMinutes: 10 },
          { id: 's2', knowledgePointId: 'kp2', orderIndex: 1, importanceLevel: 'important', textbookLocation: { textbookName: '', chapter: '', section: '', pageRange: '' }, originalContent: '', quickSummary: '', keyPoints: [], mustKnowFormulas: [], examples: [], recommendedExercises: [], commonMistakes: [], memoryTips: [], estimatedMinutes: 10 },
        ],
      });

      const analysis = analyzeSession(session, tutorial);

      expect(analysis.progress.percentage).toBe(50);
    });
  });

  describe('calculateEfficiencyScore', () => {
    it('should calculate efficiency based on progress and accuracy', () => {
      const analysis = {
        sessionId: 's1',
        duration: { totalMs: 3600000, activeMs: 3000000, pausedMs: 600000 },
        progress: { sectionsCompleted: 5, sectionsTotal: 10, percentage: 50 },
        performance: { questionsAttempted: 10, questionsCorrect: 8, accuracy: 80 },
        pace: { avgTimePerSection: 600000, isOnTrack: true, estimatedCompletion: null },
      };

      const score = calculateEfficiencyScore(analysis);

      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give bonus for being on track', () => {
      const onTrack = {
        sessionId: 's1',
        duration: { totalMs: 1000, activeMs: 1000, pausedMs: 0 },
        progress: { sectionsCompleted: 0, sectionsTotal: 1, percentage: 0 },
        performance: { questionsAttempted: 0, questionsCorrect: 0, accuracy: 0 },
        pace: { avgTimePerSection: 0, isOnTrack: true, estimatedCompletion: null },
      };
      const notOnTrack = { ...onTrack, pace: { ...onTrack.pace, isOnTrack: false } };

      expect(calculateEfficiencyScore(onTrack)).toBeGreaterThan(calculateEfficiencyScore(notOnTrack));
    });
  });

  describe('analyzeKnowledgePointMastery', () => {
    it('should analyze mastery from quiz performance', () => {
      const knowledgePoints = [
        createMockKnowledgePoint({ id: 'kp1' }),
        createMockKnowledgePoint({ id: 'kp2' }),
      ];
      const quizzes = [
        createMockQuiz({
          questions: [
            { ...createMockQuizQuestion(), sourceQuestion: { ...createMockQuizQuestion().sourceQuestion, knowledgePointIds: ['kp1'] }, userAnswer: 'a', isCorrect: true },
            { ...createMockQuizQuestion({ id: 'qq2' }), sourceQuestion: { ...createMockQuizQuestion().sourceQuestion, knowledgePointIds: ['kp1'] }, userAnswer: 'b', isCorrect: false },
          ],
        }),
      ];

      const masteryMap = analyzeKnowledgePointMastery(knowledgePoints, quizzes, []);

      expect(masteryMap.get('kp1')).toBeDefined();
      expect(masteryMap.get('kp1')!.attempts).toBeGreaterThan(0);
    });

    it('should initialize all knowledge points', () => {
      const knowledgePoints = [
        createMockKnowledgePoint({ id: 'kp1' }),
        createMockKnowledgePoint({ id: 'kp2' }),
      ];

      const masteryMap = analyzeKnowledgePointMastery(knowledgePoints, [], []);

      expect(masteryMap.has('kp1')).toBe(true);
      expect(masteryMap.has('kp2')).toBe(true);
      expect(masteryMap.get('kp1')!.mastery).toBe(0);
    });
  });

  describe('identifyWeakPoints', () => {
    it('should identify weak knowledge points', () => {
      const knowledgePoints = [
        createMockKnowledgePoint({ id: 'kp1', importance: 'critical' }),
        createMockKnowledgePoint({ id: 'kp2', importance: 'high' }),
      ];
      const masteryMap = new Map([
        ['kp1', { mastery: 40, attempts: 5 }],
        ['kp2', { mastery: 80, attempts: 5 }],
      ]);

      const weakPoints = identifyWeakPoints(masteryMap, knowledgePoints, 60);

      expect(weakPoints.length).toBe(1);
      expect(weakPoints[0].id).toBe('kp1');
    });

    it('should include critical points with no attempts', () => {
      const knowledgePoints = [
        createMockKnowledgePoint({ id: 'kp1', importance: 'critical' }),
      ];
      const masteryMap = new Map([
        ['kp1', { mastery: 0, attempts: 0 }],
      ]);

      const weakPoints = identifyWeakPoints(masteryMap, knowledgePoints, 60);

      expect(weakPoints.some(wp => wp.id === 'kp1')).toBe(true);
    });

    it('should sort by importance then mastery', () => {
      const knowledgePoints = [
        createMockKnowledgePoint({ id: 'kp1', importance: 'high' }),
        createMockKnowledgePoint({ id: 'kp2', importance: 'critical' }),
      ];
      const masteryMap = new Map([
        ['kp1', { mastery: 30, attempts: 3 }],
        ['kp2', { mastery: 40, attempts: 3 }],
      ]);

      const weakPoints = identifyWeakPoints(masteryMap, knowledgePoints, 60);

      expect(weakPoints[0].id).toBe('kp2'); // Critical first
    });
  });

  describe('generateLearningInsights', () => {
    it('should generate insights from study data', () => {
      const sessions = [createMockSession({ timeSpentMs: 1800000 })];
      const quizzes = [createMockQuiz()];
      const wrongQuestions = [createMockWrongQuestionRecord()];
      const knowledgePoints = [createMockKnowledgePoint()];

      const insights = generateLearningInsights(sessions, quizzes, wrongQuestions, knowledgePoints);

      expect(insights).toHaveProperty('strengthAreas');
      expect(insights).toHaveProperty('weakAreas');
      expect(insights).toHaveProperty('learningPatterns');
      expect(insights).toHaveProperty('predictions');
    });

    it('should calculate learning patterns', () => {
      const sessions = [
        createMockSession({ startedAt: new Date(), timeSpentMs: 1800000 }),
        createMockSession({ startedAt: new Date(), timeSpentMs: 2400000 }),
      ];

      const insights = generateLearningInsights(sessions, [], [], []);

      expect(insights.learningPatterns.averageSessionLength).toBeGreaterThan(0);
    });
  });

  describe('generateStudyReport', () => {
    it('should generate comprehensive report', () => {
      const sessions = [createMockSession({ questionsAttempted: 10, questionsCorrect: 8, timeSpentMs: 1800000 })];
      const tutorials = [createMockTutorial()];
      const quizzes = [createMockQuiz()];
      const wrongQuestions = [createMockWrongQuestionRecord()];
      const knowledgePoints = [createMockKnowledgePoint()];

      const report = generateStudyReport(sessions, tutorials, quizzes, wrongQuestions, knowledgePoints, 'user1', 7);

      expect(report.id).toMatch(/^report_\d+$/);
      expect(report.userId).toBe('user1');
      expect(report.totalTimeSpentMinutes).toBeGreaterThanOrEqual(0);
      expect(report.accuracy).toBe(80);
    });
  });

  describe('generateRecommendations', () => {
    it('should recommend wrong question review', () => {
      const insights = {
        strengthAreas: [],
        weakAreas: [],
        learningPatterns: { averageSessionLength: 30, consistency: 50 },
        predictions: { examReadiness: 60, predictedScore: { min: 60, max: 80 }, confidence: 0.5 },
      };
      const wrongQuestions = [createMockWrongQuestionRecord({ status: 'new' })];

      const recommendations = generateRecommendations(insights, wrongQuestions);

      expect(recommendations.some(r => r.type === 'review')).toBe(true);
    });

    it('should recommend break after recent session', () => {
      const insights = {
        strengthAreas: [],
        weakAreas: [],
        learningPatterns: { averageSessionLength: 30, consistency: 50 },
        predictions: { examReadiness: 60, predictedScore: { min: 60, max: 80 }, confidence: 0.5 },
      };
      const lastSessionTime = new Date(Date.now() - 30 * 60000); // 30 minutes ago

      const recommendations = generateRecommendations(insights, [], lastSessionTime);

      expect(recommendations.some(r => r.type === 'break')).toBe(true);
    });

    it('should recommend practice for weak areas', () => {
      const insights = {
        strengthAreas: [],
        weakAreas: [{ knowledgePointId: 'kp1', title: 'Test', accuracy: 40, recommendedActions: ['Action 1'] }],
        learningPatterns: { averageSessionLength: 30, consistency: 50 },
        predictions: { examReadiness: 60, predictedScore: { min: 60, max: 80 }, confidence: 0.5 },
      };

      const recommendations = generateRecommendations(insights, []);

      expect(recommendations.some(r => r.type === 'practice')).toBe(true);
    });
  });

  describe('formatStudyTime', () => {
    it('should format minutes only', () => {
      expect(formatStudyTime(45)).toBe('45分钟');
    });

    it('should format hours only', () => {
      expect(formatStudyTime(60)).toBe('1小时');
      expect(formatStudyTime(120)).toBe('2小时');
    });

    it('should format hours and minutes', () => {
      expect(formatStudyTime(90)).toBe('1小时30分钟');
      expect(formatStudyTime(150)).toBe('2小时30分钟');
    });
  });

  describe('calculateStreak', () => {
    it('should return 0 for empty sessions', () => {
      expect(calculateStreak([])).toBe(0);
    });

    it('should return 0 if streak is broken', () => {
      const oldSession = createMockSession({
        startedAt: new Date(Date.now() - 3 * 86400000), // 3 days ago
      });
      expect(calculateStreak([oldSession])).toBe(0);
    });

    it('should count consecutive days', () => {
      const today = new Date();
      const yesterday = new Date(Date.now() - 86400000);
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000);

      const sessions = [
        createMockSession({ startedAt: today }),
        createMockSession({ startedAt: yesterday }),
        createMockSession({ startedAt: twoDaysAgo }),
      ];

      const streak = calculateStreak(sessions);
      expect(streak).toBe(3);
    });

    it('should handle multiple sessions on same day', () => {
      const today = new Date();
      const sessions = [
        createMockSession({ startedAt: today }),
        createMockSession({ startedAt: new Date(today.getTime() - 3600000) }),
      ];

      const streak = calculateStreak(sessions);
      expect(streak).toBe(1);
    });
  });
});
