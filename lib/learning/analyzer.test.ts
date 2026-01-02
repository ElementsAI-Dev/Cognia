/**
 * Tests for Learning Response Analyzer
 */

import {
  analyzeLearnerResponse,
  detectPhaseTransition,
  extractSubQuestions,
  shouldProvideHint,
  generateProgressSummary,
} from './analyzer';
import type { LearningSession, LearningSubQuestion } from '@/types/learning';

// Helper to create a minimal learning session for testing
function createMockSession(overrides: Partial<LearningSession> = {}): LearningSession {
  return {
    id: 'test-session-id',
    sessionId: 'test-chat-session-id',
    topic: 'Test Topic',
    learningGoals: [],
    currentPhase: 'clarification',
    subQuestions: [],
    progress: 0,
    totalHintsProvided: 0,
    startedAt: new Date(),
    lastActivityAt: new Date(),
    notes: [],
    concepts: [],
    statistics: {
      totalTimeSpentMs: 0,
      activeTimeSpentMs: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      hintsUsed: 0,
      conceptsLearned: 0,
      averageResponseTimeMs: 0,
      streakDays: 0,
      longestStreak: 0,
      phaseCompletionTimes: {},
    },
    reviewItems: [],
    currentDifficulty: 'intermediate',
    adaptiveAdjustments: 0,
    engagementScore: 50,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    ...overrides,
  };
}

// Helper to create a mock sub-question
function createMockSubQuestion(overrides: Partial<LearningSubQuestion> = {}): LearningSubQuestion {
  return {
    id: 'sq-1',
    question: 'What is the main concept?',
    status: 'in_progress',
    hints: [],
    userAttempts: 0,
    ...overrides,
  };
}

describe('analyzeLearnerResponse', () => {
  describe('understanding level detection', () => {
    it('should detect "none" understanding for short uncertain responses', () => {
      const result = analyzeLearnerResponse("I don't know", []);
      expect(result.understanding).toBe('none');
      expect(result.confidenceScore).toBe(20);
    });

    it('should detect "partial" understanding for uncertain responses without confidence indicators', () => {
      const result = analyzeLearnerResponse(
        "I'm not sure what exactly it means, maybe it could be related",
        []
      );
      expect(result.understanding).toBe('partial');
      expect(result.confidenceScore).toBe(40);
    });

    it('should detect "good" understanding when confidence indicators are present', () => {
      const result = analyzeLearnerResponse(
        'Because the system works in a specific way, therefore we can conclude that it functions correctly',
        []
      );
      expect(result.understanding).toBe('good');
    });

    it('should detect "excellent" understanding with confidence and high concept coverage', () => {
      const result = analyzeLearnerResponse(
        'Because recursion means the function calls itself, therefore we need a base case to prevent infinite loops. This means we need proper termination conditions.',
        ['recursion', 'base case', 'function']
      );
      expect(result.understanding).toBe('excellent');
      expect(result.confidenceScore).toBe(90);
    });
  });

  describe('concept detection', () => {
    it('should detect mentioned concepts in response', () => {
      const concepts = ['variable', 'function', 'loop'];
      const result = analyzeLearnerResponse(
        'A variable stores data and a function can use that variable in a loop',
        concepts
      );
      expect(result.detectedConcepts).toContain('variable');
      expect(result.detectedConcepts).toContain('function');
      expect(result.detectedConcepts).toContain('loop');
    });

    it('should handle case-insensitive concept matching', () => {
      const result = analyzeLearnerResponse(
        'The ALGORITHM processes the data',
        ['algorithm']
      );
      expect(result.detectedConcepts).toContain('algorithm');
    });

    it('should return empty array when no concepts match', () => {
      const result = analyzeLearnerResponse(
        'I understand the basic idea',
        ['recursion', 'iteration']
      );
      expect(result.detectedConcepts).toHaveLength(0);
    });
  });

  describe('suggested action', () => {
    it('should suggest "hint" for no understanding', () => {
      const result = analyzeLearnerResponse("I don't know what to do", []);
      expect(result.suggestedAction).toBe('hint');
    });

    it('should suggest "rephrase" for partial understanding with uncertainty', () => {
      const result = analyzeLearnerResponse(
        "Maybe it could be this but I'm not sure if that's right",
        []
      );
      expect(result.suggestedAction).toBe('rephrase');
    });

    it('should suggest "advance" for excellent understanding', () => {
      const result = analyzeLearnerResponse(
        'Because the concept works this way, therefore we can apply it in other contexts as well',
        ['concept']
      );
      expect(result.suggestedAction).toBe('advance');
    });

    it('should suggest "celebrate" for good understanding with very high concept coverage', () => {
      // celebrate requires: understanding === 'good' AND conceptCoverage > 0.8
      // For 'good' understanding: needs hasConfidence OR conceptCoverage > 0.5, but NOT excellent
      // Note: confidence indicators include "so" which matches in "solutions", so avoid such words
      const result = analyzeLearnerResponse(
        'The algorithm handles recursion with nested data in elegant ways',
        ['algorithm', 'recursion', 'nested', 'data', 'elegant']
      );
      // With high concept coverage (5/5 = 100% > 0.8) but no confidence indicator
      expect(result.understanding).toBe('good');
      expect(result.suggestedAction).toBe('celebrate');
    });
  });

  it('should return empty potentialMisconceptions array (placeholder)', () => {
    const result = analyzeLearnerResponse('Any response', []);
    expect(result.potentialMisconceptions).toEqual([]);
  });

  describe('edge cases', () => {
    it('should handle empty response', () => {
      const result = analyzeLearnerResponse('', []);
      expect(result).toBeDefined();
      expect(result.understanding).toBeDefined();
    });

    it('should handle response with only whitespace', () => {
      const result = analyzeLearnerResponse('   \n\t  ', []);
      expect(result).toBeDefined();
    });

    it('should handle empty expected concepts array', () => {
      const result = analyzeLearnerResponse('This is a detailed response with many words', []);
      expect(result.detectedConcepts).toEqual([]);
    });

    it('should handle very long response', () => {
      const longResponse = 'word '.repeat(1000);
      const result = analyzeLearnerResponse(longResponse, ['word']);
      expect(result).toBeDefined();
      expect(result.detectedConcepts).toContain('word');
    });

    it('should handle special characters in response', () => {
      const result = analyzeLearnerResponse('The @#$% concept is !!! important???', ['concept']);
      expect(result.detectedConcepts).toContain('concept');
    });

    it('should handle unicode characters', () => {
      // Note: avoid 'help' as it's an uncertainty indicator
      const result = analyzeLearnerResponse('学习是重要的 because it matters greatly', []);
      expect(result).toBeDefined();
      expect(result.understanding).toBe('good'); // has 'because'
    });

    it('should handle multiple uncertainty indicators', () => {
      // wordCount must be < 10 AND hasUncertainty for 'none'
      const result = analyzeLearnerResponse(
        "I don't know, not sure",
        []
      );
      expect(result.understanding).toBe('none');
    });

    it('should handle multiple confidence indicators', () => {
      const result = analyzeLearnerResponse(
        'Because this works, therefore it leads to success, which means it functions, so we conclude in other words specifically',
        []
      );
      expect(result.understanding).toBe('good');
    });
  });
});

describe('detectPhaseTransition', () => {
  describe('clarification phase', () => {
    it('should not transition without topic and goals', () => {
      const session = createMockSession({
        currentPhase: 'clarification',
        topic: '',
        learningGoals: [],
      });
      const result = detectPhaseTransition(session);
      expect(result.shouldTransition).toBe(false);
    });

    it('should transition to deconstruction when topic and goals are set', () => {
      const session = createMockSession({
        currentPhase: 'clarification',
        topic: 'JavaScript Closures',
        learningGoals: [
          { id: '1', description: 'Understand closures', achieved: false },
        ],
      });
      const result = detectPhaseTransition(session);
      expect(result.shouldTransition).toBe(true);
      expect(result.nextPhase).toBe('deconstruction');
      expect(result.reason).toBe('Topic and learning goals have been established');
    });
  });

  describe('deconstruction phase', () => {
    it('should not transition with fewer than 2 sub-questions', () => {
      const session = createMockSession({
        currentPhase: 'deconstruction',
        subQuestions: [createMockSubQuestion()],
      });
      const result = detectPhaseTransition(session);
      expect(result.shouldTransition).toBe(false);
    });

    it('should transition to questioning with 2+ sub-questions', () => {
      const session = createMockSession({
        currentPhase: 'deconstruction',
        subQuestions: [
          createMockSubQuestion({ id: 'sq-1' }),
          createMockSubQuestion({ id: 'sq-2' }),
        ],
      });
      const result = detectPhaseTransition(session);
      expect(result.shouldTransition).toBe(true);
      expect(result.nextPhase).toBe('questioning');
      expect(result.reason).toBe('Sub-questions have been identified');
    });
  });

  describe('questioning phase', () => {
    it('should not transition with few resolved sub-questions', () => {
      const session = createMockSession({
        currentPhase: 'questioning',
        subQuestions: [
          createMockSubQuestion({ id: 'sq-1', status: 'resolved' }),
          createMockSubQuestion({ id: 'sq-2', status: 'in_progress' }),
          createMockSubQuestion({ id: 'sq-3', status: 'pending' }),
          createMockSubQuestion({ id: 'sq-4', status: 'pending' }),
          createMockSubQuestion({ id: 'sq-5', status: 'pending' }),
        ],
      });
      const result = detectPhaseTransition(session);
      expect(result.shouldTransition).toBe(false);
    });

    it('should transition to feedback when 80%+ sub-questions resolved', () => {
      const session = createMockSession({
        currentPhase: 'questioning',
        subQuestions: [
          createMockSubQuestion({ id: 'sq-1', status: 'resolved' }),
          createMockSubQuestion({ id: 'sq-2', status: 'resolved' }),
          createMockSubQuestion({ id: 'sq-3', status: 'resolved' }),
          createMockSubQuestion({ id: 'sq-4', status: 'resolved' }),
          createMockSubQuestion({ id: 'sq-5', status: 'in_progress' }),
        ],
      });
      const result = detectPhaseTransition(session);
      expect(result.shouldTransition).toBe(true);
      expect(result.nextPhase).toBe('feedback');
      expect(result.reason).toBe('Most sub-questions have been explored');
    });
  });

  describe('feedback phase', () => {
    it('should not transition with few achieved goals', () => {
      const session = createMockSession({
        currentPhase: 'feedback',
        learningGoals: [
          { id: '1', description: 'Goal 1', achieved: true },
          { id: '2', description: 'Goal 2', achieved: false },
          { id: '3', description: 'Goal 3', achieved: false },
          { id: '4', description: 'Goal 4', achieved: false },
        ],
      });
      const result = detectPhaseTransition(session);
      expect(result.shouldTransition).toBe(false);
    });

    it('should transition to summary when 70%+ goals achieved', () => {
      const session = createMockSession({
        currentPhase: 'feedback',
        learningGoals: [
          { id: '1', description: 'Goal 1', achieved: true },
          { id: '2', description: 'Goal 2', achieved: true },
          { id: '3', description: 'Goal 3', achieved: true },
          { id: '4', description: 'Goal 4', achieved: false },
        ],
      });
      const result = detectPhaseTransition(session);
      expect(result.shouldTransition).toBe(true);
      expect(result.nextPhase).toBe('summary');
      expect(result.reason).toBe('Learning goals have been substantially achieved');
    });
  });

  describe('summary phase', () => {
    it('should never transition from summary phase', () => {
      const session = createMockSession({
        currentPhase: 'summary',
        learningGoals: [
          { id: '1', description: 'Goal 1', achieved: true },
        ],
        subQuestions: [
          createMockSubQuestion({ status: 'resolved' }),
        ],
      });
      const result = detectPhaseTransition(session);
      expect(result.shouldTransition).toBe(false);
    });
  });
});

describe('extractSubQuestions', () => {
  it('should extract questions from numbered lists with dots', () => {
    const response = `Here are some questions to consider:
1. What is the main purpose?
2. How does it work?
3. Why is this important?`;
    
    const questions = extractSubQuestions(response);
    expect(questions).toContain('What is the main purpose?');
    expect(questions).toContain('How does it work?');
    expect(questions).toContain('Why is this important?');
  });

  it('should extract questions from numbered lists with parentheses', () => {
    const response = `Consider these:
1) What are the key components?
2) How do they interact?`;
    
    const questions = extractSubQuestions(response);
    expect(questions).toContain('What are the key components?');
    expect(questions).toContain('How do they interact?');
  });

  it('should extract questions from bullet points with dash', () => {
    const response = `Key questions:
- What defines this concept?
- How can we apply it?`;
    
    const questions = extractSubQuestions(response);
    expect(questions).toContain('What defines this concept?');
    expect(questions).toContain('How can we apply it?');
  });

  it('should extract questions from bullet points with bullet character', () => {
    const response = `Think about:
• What is the underlying mechanism?
• Why does this matter?`;
    
    const questions = extractSubQuestions(response);
    expect(questions).toContain('What is the underlying mechanism?');
    expect(questions).toContain('Why does this matter?');
  });

  it('should extract standalone questions when no lists are found', () => {
    const response = `Let me ask you something. What makes this approach unique and different from others? Also, How would you explain this to a beginner learner?`;
    
    const questions = extractSubQuestions(response);
    expect(questions.length).toBeGreaterThan(0);
  });

  it('should filter out very short questions', () => {
    const response = `Here we go. Why? What is the underlying concept here?`;
    const questions = extractSubQuestions(response);
    // "Why?" is too short (< 20 chars) and should be filtered
    expect(questions.every(q => q.length > 20)).toBe(true);
  });

  it('should remove duplicates', () => {
    const response = `1. What is the main concept?
- What is the main concept?`;
    
    const questions = extractSubQuestions(response);
    const mainConceptCount = questions.filter(q => q === 'What is the main concept?').length;
    expect(mainConceptCount).toBe(1);
  });

  it('should limit to 5 questions maximum', () => {
    const response = `1. Question one here?
2. Question two here?
3. Question three here?
4. Question four here?
5. Question five here?
6. Question six here?
7. Question seven here?`;
    
    const questions = extractSubQuestions(response);
    expect(questions.length).toBeLessThanOrEqual(5);
  });

  it('should return empty array for text without questions', () => {
    const response = 'This is just a statement. No questions here. End of text.';
    const questions = extractSubQuestions(response);
    expect(questions).toEqual([]);
  });
});

describe('shouldProvideHint', () => {
  const defaultConfig = { hintDelayMessages: 2, maxHintsPerQuestion: 3 };

  it('should not hint when max hints reached', () => {
    const subQuestion = createMockSubQuestion({
      hints: ['hint1', 'hint2', 'hint3'],
      userAttempts: 5,
    });
    const result = shouldProvideHint(subQuestion, defaultConfig);
    expect(result.shouldHint).toBe(false);
  });

  it('should not hint before delay threshold', () => {
    const subQuestion = createMockSubQuestion({
      hints: [],
      userAttempts: 1,
    });
    const result = shouldProvideHint(subQuestion, defaultConfig);
    expect(result.shouldHint).toBe(false);
  });

  it('should provide subtle hint at threshold', () => {
    const subQuestion = createMockSubQuestion({
      hints: [],
      userAttempts: 2,
    });
    const result = shouldProvideHint(subQuestion, defaultConfig);
    expect(result.shouldHint).toBe(true);
    expect(result.hintLevel).toBe('subtle');
  });

  it('should provide moderate hint after more attempts', () => {
    const subQuestion = createMockSubQuestion({
      hints: [],
      userAttempts: 4,
    });
    const result = shouldProvideHint(subQuestion, defaultConfig);
    expect(result.shouldHint).toBe(true);
    expect(result.hintLevel).toBe('moderate');
  });

  it('should provide strong hint after many attempts', () => {
    const subQuestion = createMockSubQuestion({
      hints: [],
      userAttempts: 6,
    });
    const result = shouldProvideHint(subQuestion, defaultConfig);
    expect(result.shouldHint).toBe(true);
    expect(result.hintLevel).toBe('strong');
  });

  it('should work with custom config', () => {
    const subQuestion = createMockSubQuestion({
      hints: [],
      userAttempts: 3,
    });
    const customConfig = { hintDelayMessages: 3, maxHintsPerQuestion: 5 };
    const result = shouldProvideHint(subQuestion, customConfig);
    expect(result.shouldHint).toBe(true);
    expect(result.hintLevel).toBe('subtle');
  });
});

describe('generateProgressSummary', () => {
  it('should generate summary with progress percentage', () => {
    const session = createMockSession({ progress: 45 });
    const summary = generateProgressSummary(session);
    expect(summary).toContain('45%');
  });

  it('should include current phase name', () => {
    const session = createMockSession({ currentPhase: 'questioning' });
    const summary = generateProgressSummary(session);
    expect(summary).toContain('Exploring Through Questions');
  });

  it('should show sub-question progress', () => {
    const session = createMockSession({
      subQuestions: [
        createMockSubQuestion({ id: 'sq-1', status: 'resolved' }),
        createMockSubQuestion({ id: 'sq-2', status: 'resolved' }),
        createMockSubQuestion({ id: 'sq-3', status: 'in_progress' }),
      ],
    });
    const summary = generateProgressSummary(session);
    expect(summary).toContain('2/3 explored');
  });

  it('should show learning goals progress', () => {
    const session = createMockSession({
      learningGoals: [
        { id: '1', description: 'Goal 1', achieved: true },
        { id: '2', description: 'Goal 2', achieved: false },
      ],
    });
    const summary = generateProgressSummary(session);
    expect(summary).toContain('1/2 achieved');
  });

  it('should not show sub-question section if none exist', () => {
    const session = createMockSession({ subQuestions: [] });
    const summary = generateProgressSummary(session);
    expect(summary).not.toContain('Sub-questions');
  });

  it('should not show goals section if none exist', () => {
    const session = createMockSession({ learningGoals: [] });
    const summary = generateProgressSummary(session);
    expect(summary).not.toContain('Goals');
  });

  it('should include all phase names correctly', () => {
    const phases: Array<LearningSession['currentPhase']> = [
      'clarification',
      'deconstruction',
      'questioning',
      'feedback',
      'summary',
    ];
    const phaseNames = [
      'Understanding the Problem',
      'Breaking Down the Topic',
      'Exploring Through Questions',
      'Refining Understanding',
      'Consolidating Learning',
    ];

    phases.forEach((phase, index) => {
      const session = createMockSession({ currentPhase: phase });
      const summary = generateProgressSummary(session);
      expect(summary).toContain(phaseNames[index]);
    });
  });
});
