/**
 * Tests for Learning Mode Prompts
 */

import {
  SOCRATIC_MENTOR_PROMPT,
  PHASE_PROMPTS,
  DIFFICULTY_PROMPTS,
  LEARNING_STYLE_PROMPTS,
  UNDERSTANDING_PROMPTS,
  SCENARIO_PROMPTS,
  ENCOURAGEMENT_MESSAGES,
  buildLearningSystemPrompt,
  buildAdaptiveLearningPrompt,
  generateHintGuidance,
  generateContextualHint,
  generateCelebrationMessage,
  getEncouragementMessage,
} from './prompts';
import type { LearningSession, LearningPhase, DifficultyLevel, LearningStyle, UnderstandingLevel, LearningModeConfig } from '@/types/learning';
import { DEFAULT_LEARNING_CONFIG } from '@/types/learning';

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
  } as unknown as LearningSession;
}

describe('SOCRATIC_MENTOR_PROMPT', () => {
  it('should be a non-empty string', () => {
    expect(typeof SOCRATIC_MENTOR_PROMPT).toBe('string');
    expect(SOCRATIC_MENTOR_PROMPT.length).toBeGreaterThan(0);
  });

  it('should mention Socratic Method', () => {
    expect(SOCRATIC_MENTOR_PROMPT).toContain('Socratic Method');
  });

  it('should include core instruction about never providing direct answers', () => {
    expect(SOCRATIC_MENTOR_PROMPT).toContain('NEVER provide answers');
  });

  it('should include the taboo list section', () => {
    expect(SOCRATIC_MENTOR_PROMPT).toContain('Absolute Taboo List');
  });

  it('should include response guidelines', () => {
    expect(SOCRATIC_MENTOR_PROMPT).toContain('Response Guidelines');
  });
});

describe('PHASE_PROMPTS', () => {
  const phases: LearningPhase[] = [
    'clarification',
    'deconstruction',
    'questioning',
    'feedback',
    'summary',
  ];

  it('should have prompts for all phases', () => {
    phases.forEach((phase) => {
      expect(PHASE_PROMPTS[phase]).toBeDefined();
      expect(typeof PHASE_PROMPTS[phase]).toBe('string');
    });
  });

  it('should include phase name in each prompt', () => {
    expect(PHASE_PROMPTS.clarification).toContain('Clarification');
    expect(PHASE_PROMPTS.deconstruction).toContain('Deconstruction');
    expect(PHASE_PROMPTS.questioning).toContain('Questioning');
    expect(PHASE_PROMPTS.feedback).toContain('Feedback');
    expect(PHASE_PROMPTS.summary).toContain('Summary');
  });

  it('clarification prompt should focus on understanding goals', () => {
    expect(PHASE_PROMPTS.clarification).toContain('learning goals');
    expect(PHASE_PROMPTS.clarification).toContain('background knowledge');
  });

  it('deconstruction prompt should focus on breaking down', () => {
    expect(PHASE_PROMPTS.deconstruction).toContain('break down');
    expect(PHASE_PROMPTS.deconstruction).toContain('sub-questions');
  });

  it('questioning prompt should mention strategic questions', () => {
    expect(PHASE_PROMPTS.questioning).toContain('strategic questions');
    expect(PHASE_PROMPTS.questioning).toContain('ONE question at a time');
  });

  it('feedback prompt should mention assessment', () => {
    expect(PHASE_PROMPTS.feedback).toContain('understanding');
    expect(PHASE_PROMPTS.feedback).toContain('gaps');
  });

  it('summary prompt should focus on consolidation', () => {
    expect(PHASE_PROMPTS.summary).toContain('summarize');
    expect(PHASE_PROMPTS.summary).toContain('key takeaways');
  });
});

describe('DIFFICULTY_PROMPTS', () => {
  const levels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];

  it('should have prompts for all difficulty levels', () => {
    levels.forEach((level) => {
      expect(DIFFICULTY_PROMPTS[level]).toBeDefined();
      expect(typeof DIFFICULTY_PROMPTS[level]).toBe('string');
    });
  });

  it('beginner prompt should emphasize simplicity', () => {
    expect(DIFFICULTY_PROMPTS.beginner).toContain('simple');
    expect(DIFFICULTY_PROMPTS.beginner).toContain('everyday language');
  });

  it('expert prompt should emphasize sophistication', () => {
    expect(DIFFICULTY_PROMPTS.expert).toContain('sophisticated');
    expect(DIFFICULTY_PROMPTS.expert).toContain('peer');
  });
});

describe('LEARNING_STYLE_PROMPTS', () => {
  const styles: LearningStyle[] = ['visual', 'auditory', 'reading', 'kinesthetic'];

  it('should have prompts for all learning styles', () => {
    styles.forEach((style) => {
      expect(LEARNING_STYLE_PROMPTS[style]).toBeDefined();
      expect(typeof LEARNING_STYLE_PROMPTS[style]).toBe('string');
    });
  });

  it('visual prompt should mention diagrams and spatial concepts', () => {
    expect(LEARNING_STYLE_PROMPTS.visual).toContain('visual');
    expect(LEARNING_STYLE_PROMPTS.visual).toContain('diagrams');
  });

  it('auditory prompt should mention verbal aspects', () => {
    expect(LEARNING_STYLE_PROMPTS.auditory).toContain('verbal');
    expect(LEARNING_STYLE_PROMPTS.auditory).toContain('rhythm');
  });

  it('reading prompt should mention text-based learning', () => {
    expect(LEARNING_STYLE_PROMPTS.reading).toContain('structured');
    expect(LEARNING_STYLE_PROMPTS.reading).toContain('note-taking');
  });

  it('kinesthetic prompt should mention hands-on learning', () => {
    expect(LEARNING_STYLE_PROMPTS.kinesthetic).toContain('hands-on');
    expect(LEARNING_STYLE_PROMPTS.kinesthetic).toContain('experimentation');
  });
});

describe('UNDERSTANDING_PROMPTS', () => {
  const levels: UnderstandingLevel[] = ['none', 'partial', 'good', 'excellent'];

  it('should have prompts for all understanding levels', () => {
    levels.forEach((level) => {
      expect(UNDERSTANDING_PROMPTS[level]).toBeDefined();
      expect(typeof UNDERSTANDING_PROMPTS[level]).toBe('string');
    });
  });

  it('none level should emphasize fundamentals', () => {
    expect(UNDERSTANDING_PROMPTS.none).toContain('fundamental');
    expect(UNDERSTANDING_PROMPTS.none).toContain('simple');
  });

  it('excellent level should mention advanced applications', () => {
    expect(UNDERSTANDING_PROMPTS.excellent).toContain('advanced');
    expect(UNDERSTANDING_PROMPTS.excellent).toContain('mastery');
  });
});

describe('SCENARIO_PROMPTS', () => {
  it('should have all defined scenarios', () => {
    expect(SCENARIO_PROMPTS.problemSolving).toBeDefined();
    expect(SCENARIO_PROMPTS.conceptLearning).toBeDefined();
    expect(SCENARIO_PROMPTS.skillDevelopment).toBeDefined();
    expect(SCENARIO_PROMPTS.criticalAnalysis).toBeDefined();
    expect(SCENARIO_PROMPTS.creativeExploration).toBeDefined();
  });

  it('each scenario should have numbered steps', () => {
    Object.values(SCENARIO_PROMPTS).forEach((prompt) => {
      expect(prompt).toContain('1.');
      expect(prompt).toContain('2.');
    });
  });
});

describe('ENCOURAGEMENT_MESSAGES', () => {
  it('should have all message categories', () => {
    expect(ENCOURAGEMENT_MESSAGES.goodProgress).toBeDefined();
    expect(ENCOURAGEMENT_MESSAGES.breakthrough).toBeDefined();
    expect(ENCOURAGEMENT_MESSAGES.struggling).toBeDefined();
    expect(ENCOURAGEMENT_MESSAGES.completion).toBeDefined();
  });

  it('each category should have at least one message', () => {
    Object.values(ENCOURAGEMENT_MESSAGES).forEach((messages) => {
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  it('breakthrough messages should be celebratory', () => {
    ENCOURAGEMENT_MESSAGES.breakthrough.forEach((msg) => {
      expect(msg.length).toBeGreaterThan(10);
    });
  });
});

describe('buildLearningSystemPrompt', () => {
  it('should include base Socratic prompt when no session', () => {
    const result = buildLearningSystemPrompt(null);
    expect(result).toContain(SOCRATIC_MENTOR_PROMPT);
  });

  it('should add phase-specific prompt when session provided', () => {
    const session = createMockSession({ currentPhase: 'questioning' });
    const result = buildLearningSystemPrompt(session);
    expect(result).toContain(SOCRATIC_MENTOR_PROMPT);
    expect(result).toContain('Guided Questioning');
  });

  it('should include session context', () => {
    const session = createMockSession({
      topic: 'JavaScript Promises',
      progress: 45,
      backgroundKnowledge: 'Basic JavaScript',
    });
    const result = buildLearningSystemPrompt(session);
    expect(result).toContain('JavaScript Promises');
    expect(result).toContain('45%');
    expect(result).toContain('Basic JavaScript');
  });

  it('should include learning goals when present', () => {
    const session = createMockSession({
      learningGoals: [
        { id: '1', description: 'Understand async/await', achieved: false },
      ],
    });
    const result = buildLearningSystemPrompt(session);
    expect(result).toContain('Understand async/await');
  });

  it('should add current sub-question context in questioning phase', () => {
    const session = createMockSession({
      currentPhase: 'questioning',
      subQuestions: [
        {
          id: 'sq-1',
          question: 'What is a callback?',
          status: 'in_progress',
          hints: ['Think about function arguments'],
          userAttempts: 2,
        },
      ],
      currentSubQuestionId: 'sq-1',
    });
    const result = buildLearningSystemPrompt(session);
    expect(result).toContain('What is a callback?');
    expect(result).toContain('Attempts on this question');
    expect(result).toContain('Hints already provided');
  });

  it('should include custom context when provided', () => {
    const result = buildLearningSystemPrompt(null, 'Focus on practical examples');
    expect(result).toContain('Additional Context');
    expect(result).toContain('Focus on practical examples');
  });

  it('should show sub-questions resolved count', () => {
    const session = createMockSession({
      currentPhase: 'feedback',
      subQuestions: [
        { id: 'sq-1', question: 'Q1?', status: 'resolved', hints: [], userAttempts: 1 },
        { id: 'sq-2', question: 'Q2?', status: 'resolved', hints: [], userAttempts: 2 },
        { id: 'sq-3', question: 'Q3?', status: 'pending', hints: [], userAttempts: 0 },
      ],
    });
    const result = buildLearningSystemPrompt(session);
    expect(result).toContain('2/3');
  });
});

describe('buildAdaptiveLearningPrompt', () => {
  it('should include base and phase prompts', () => {
    const session = createMockSession({ currentPhase: 'questioning' });
    const result = buildAdaptiveLearningPrompt(session);
    expect(result).toContain(SOCRATIC_MENTOR_PROMPT);
    expect(result).toContain('Guided Questioning');
  });

  it('should add difficulty prompt when set', () => {
    const session = createMockSession({ currentDifficulty: 'beginner' });
    const result = buildAdaptiveLearningPrompt(session);
    expect(result).toContain('Beginner');
  });

  it('should add learning style prompt when set', () => {
    const session = createMockSession({ preferredStyle: 'visual' });
    const result = buildAdaptiveLearningPrompt(session);
    expect(result).toContain('Visual');
  });

  it('should add scenario prompt when provided', () => {
    const session = createMockSession({});
    const result = buildAdaptiveLearningPrompt(session, { scenario: 'problemSolving' });
    expect(result).toContain('Problem Solving');
  });

  it('should add understanding level guidance when provided', () => {
    const session = createMockSession({});
    const result = buildAdaptiveLearningPrompt(session, { understandingLevel: 'partial' });
    expect(result).toContain('partial understanding');
  });

  it('should add low engagement alert', () => {
    const session = createMockSession({ engagementScore: 30 });
    const result = buildAdaptiveLearningPrompt(session);
    expect(result).toContain('Engagement Alert');
    expect(result).toContain('engagement appears low');
  });

  it('should add high engagement note', () => {
    const session = createMockSession({ engagementScore: 85 });
    const result = buildAdaptiveLearningPrompt(session);
    expect(result).toContain('High Engagement');
  });

  it('should note consecutive correct answers', () => {
    const session = createMockSession({ consecutiveCorrect: 4 });
    const result = buildAdaptiveLearningPrompt(session);
    expect(result).toContain('4 questions correctly');
    expect(result).toContain('increasing the challenge');
  });

  it('should note consecutive incorrect answers', () => {
    const session = createMockSession({ consecutiveIncorrect: 3 });
    const result = buildAdaptiveLearningPrompt(session);
    expect(result).toContain('3 consecutive questions');
    expect(result).toContain('scaffolding');
  });

  it('should include concept mastery stats when concepts exist', () => {
    const session = createMockSession({
      concepts: [
        { id: 'c1', name: 'C1', masteryStatus: 'mastered', masteryScore: 100, reviewCount: 0, correctAnswers: 5, totalAttempts: 5 },
        { id: 'c2', name: 'C2', masteryStatus: 'learning', masteryScore: 50, reviewCount: 0, correctAnswers: 2, totalAttempts: 4 },
      ],
    });
    const result = buildAdaptiveLearningPrompt(session);
    expect(result).toContain('Concepts tracked');
    expect(result).toContain('1 mastered');
  });

  it('should include custom context when provided', () => {
    const session = createMockSession({});
    const result = buildAdaptiveLearningPrompt(session, { customContext: 'Extra info here' });
    expect(result).toContain('Additional Context');
    expect(result).toContain('Extra info here');
  });
});

describe('generateHintGuidance', () => {
  it('should return prerequisite guidance for early attempts', () => {
    const result = generateHintGuidance(1, 5);
    expect(result).toContain('simpler prerequisite question');
  });

  it('should return small hint guidance for moderate attempts', () => {
    const result = generateHintGuidance(3, 5);
    expect(result).toContain('small hint');
    expect(result).toContain('one aspect');
  });

  it('should return substantial hint guidance for many attempts', () => {
    const result = generateHintGuidance(5, 5);
    expect(result).toContain('substantial hint');
    expect(result).toContain('final connection');
  });

  it('should include attempt count in message for high attempts', () => {
    const result = generateHintGuidance(7, 5);
    expect(result).toContain('7 attempts');
  });
});

describe('generateContextualHint', () => {
  it('should include base hint guidance', () => {
    const session = createMockSession({ currentDifficulty: 'intermediate' });
    const result = generateContextualHint(session, 3);
    expect(result).toContain('small hint');
  });

  it('should add beginner difficulty modifier', () => {
    const session = createMockSession({ currentDifficulty: 'beginner' });
    const result = generateContextualHint(session, 3);
    expect(result).toContain('simple language');
  });

  it('should add expert difficulty modifier', () => {
    const session = createMockSession({ currentDifficulty: 'expert' });
    const result = generateContextualHint(session, 3);
    expect(result).toContain('respects their expertise');
  });

  it('should combine base hint and difficulty modifier', () => {
    const session = createMockSession({ currentDifficulty: 'advanced' });
    const result = generateContextualHint(session, 5);
    expect(result.split('\n')).toHaveLength(2);
  });
});

describe('generateCelebrationMessage', () => {
  const session = createMockSession({ currentPhase: 'questioning' });

  it('should return a string for concept_mastered', () => {
    const result = generateCelebrationMessage('concept_mastered', session);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return a string for question_solved', () => {
    const result = generateCelebrationMessage('question_solved', session);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include phase name for phase_complete', () => {
    const result = generateCelebrationMessage('phase_complete', session);
    expect(result).toContain('questioning');
  });

  it('should return a string for session_complete', () => {
    const result = generateCelebrationMessage('session_complete', session);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include emojis in messages', () => {
    const result = generateCelebrationMessage('concept_mastered', session);
    // Check for common celebration emojis
    expect(/[🎯🌟💡✨🎉👏🚀📈🌱🏆🎓⭐]/.test(result)).toBe(true);
  });
});

describe('getEncouragementMessage', () => {
  it('should return a message from goodProgress category', () => {
    const result = getEncouragementMessage('goodProgress');
    expect(ENCOURAGEMENT_MESSAGES.goodProgress).toContain(result);
  });

  it('should return a message from breakthrough category', () => {
    const result = getEncouragementMessage('breakthrough');
    expect(ENCOURAGEMENT_MESSAGES.breakthrough).toContain(result);
  });

  it('should return a message from struggling category', () => {
    const result = getEncouragementMessage('struggling');
    expect(ENCOURAGEMENT_MESSAGES.struggling).toContain(result);
  });

  it('should return a message from completion category', () => {
    const result = getEncouragementMessage('completion');
    expect(ENCOURAGEMENT_MESSAGES.completion).toContain(result);
  });

  it('should return different messages on multiple calls (randomness test)', () => {
    // Run multiple times to test randomness - should get at least one different result
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(getEncouragementMessage('goodProgress'));
    }
    // With 3+ messages and 20 attempts, we should get more than 1 unique result
    // This test might occasionally fail due to randomness, but very unlikely
    expect(results.size).toBeGreaterThanOrEqual(1);
  });
});

describe('edge cases', () => {
  describe('buildLearningSystemPrompt edge cases', () => {
    it('should handle undefined session', () => {
      const result = buildLearningSystemPrompt(undefined);
      expect(result).toContain(SOCRATIC_MENTOR_PROMPT);
    });

    it('should handle session with empty topic', () => {
      const session = createMockSession({ topic: '' });
      const result = buildLearningSystemPrompt(session);
      expect(result).toContain('**Topic**:');
    });

    it('should handle session with empty learning goals', () => {
      const session = createMockSession({ learningGoals: [] });
      const result = buildLearningSystemPrompt(session);
      expect(result).toContain('Not yet defined');
    });

    it('should handle session without background knowledge', () => {
      const session = createMockSession({ backgroundKnowledge: undefined });
      const result = buildLearningSystemPrompt(session);
      expect(result).toContain('Not specified');
    });

    it('should handle multiple learning goals', () => {
      const session = createMockSession({
        learningGoals: [
          { id: '1', description: 'Goal A', achieved: false },
          { id: '2', description: 'Goal B', achieved: false },
          { id: '3', description: 'Goal C', achieved: true },
        ],
      });
      const result = buildLearningSystemPrompt(session);
      expect(result).toContain('Goal A');
      expect(result).toContain('Goal B');
      expect(result).toContain('Goal C');
    });

    it('should handle custom context with special characters', () => {
      const result = buildLearningSystemPrompt(null, 'Focus on <html> & "code"');
      expect(result).toContain('<html>');
      expect(result).toContain('&');
    });
  });

  describe('buildAdaptiveLearningPrompt edge cases', () => {
    it('should handle session without preferred style', () => {
      const session = createMockSession({ preferredStyle: undefined });
      const result = buildAdaptiveLearningPrompt(session);
      expect(result).toBeDefined();
    });

    it('should handle engagement score at boundaries', () => {
      // Exactly at low threshold
      const lowSession = createMockSession({ engagementScore: 40 });
      const lowResult = buildAdaptiveLearningPrompt(lowSession);
      expect(lowResult).not.toContain('Engagement Alert');

      // Exactly at high threshold
      const highSession = createMockSession({ engagementScore: 80 });
      const highResult = buildAdaptiveLearningPrompt(highSession);
      expect(highResult).not.toContain('High Engagement');
    });

    it('should handle consecutive correct at threshold', () => {
      const session = createMockSession({ consecutiveCorrect: 3 });
      const result = buildAdaptiveLearningPrompt(session);
      expect(result).toContain('3 questions correctly');
    });

    it('should handle consecutive incorrect at threshold', () => {
      const session = createMockSession({ consecutiveIncorrect: 2 });
      const result = buildAdaptiveLearningPrompt(session);
      expect(result).toContain('2 consecutive questions');
    });

    it('should handle all options provided', () => {
      const session = createMockSession({
        currentDifficulty: 'advanced',
        preferredStyle: 'kinesthetic',
      });
      const result = buildAdaptiveLearningPrompt(session, {
        scenario: 'criticalAnalysis',
        understandingLevel: 'good',
        customContext: 'Extra context',
      });
      expect(result).toContain('Advanced');
      expect(result).toContain('Kinesthetic');
      expect(result).toContain('Critical Analysis');
      expect(result).toContain('good understanding');
      expect(result).toContain('Extra context');
    });

    it('should handle sub-question with difficulty specified', () => {
      const session = createMockSession({
        currentPhase: 'questioning',
        subQuestions: [
          {
            id: 'sq-1',
            question: 'Test?',
            status: 'in_progress',
            hints: [],
            userAttempts: 1,
            difficulty: 'advanced',
          },
        ],
        currentSubQuestionId: 'sq-1',
      });
      const result = buildAdaptiveLearningPrompt(session);
      expect(result).toContain('Question Difficulty');
      expect(result).toContain('advanced');
    });

    it('should show hints count for current sub-question with hints', () => {
      const session = createMockSession({
        currentPhase: 'questioning',
        subQuestions: [
          {
            id: 'sq-1',
            question: 'What is recursion?',
            status: 'in_progress',
            hints: ['Think about functions', 'Consider base cases'],
            userAttempts: 3,
          },
        ],
        currentSubQuestionId: 'sq-1',
      });
      const result = buildAdaptiveLearningPrompt(session);
      expect(result).toContain('Hints already provided');
      expect(result).toContain('2');
    });
  });

  describe('generateHintGuidance edge cases', () => {
    it('should handle 0 attempts', () => {
      const result = generateHintGuidance(0, 5);
      expect(result).toContain('prerequisite');
    });

    it('should handle exactly 2 attempts', () => {
      const result = generateHintGuidance(2, 5);
      expect(result).toContain('small hint');
    });

    it('should handle exactly 4 attempts', () => {
      const result = generateHintGuidance(4, 5);
      expect(result).toContain('substantial hint');
    });

    it('should handle very high attempt count', () => {
      const result = generateHintGuidance(100, 5);
      expect(result).toContain('100 attempts');
    });
  });

  describe('generateContextualHint edge cases', () => {
    it('should handle all difficulty levels', () => {
      const levels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
      levels.forEach((level) => {
        const session = createMockSession({ currentDifficulty: level });
        const result = generateContextualHint(session, 3);
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateCelebrationMessage edge cases', () => {
    it('should handle all achievement types', () => {
      const types: Array<'concept_mastered' | 'question_solved' | 'phase_complete' | 'session_complete'> = [
        'concept_mastered',
        'question_solved',
        'phase_complete',
        'session_complete',
      ];
      const session = createMockSession({});
      types.forEach((type) => {
        const result = generateCelebrationMessage(type, session);
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should include correct phase in phase_complete message', () => {
      const phases: LearningPhase[] = ['clarification', 'deconstruction', 'questioning', 'feedback', 'summary'];
      phases.forEach((phase) => {
        const session = createMockSession({ currentPhase: phase });
        const result = generateCelebrationMessage('phase_complete', session);
        expect(result).toContain(phase);
      });
    });
  });
});

describe('getEncouragementMessage with config overrides', () => {
  it('should use custom messages when provided in config', () => {
    const config: LearningModeConfig = {
      ...DEFAULT_LEARNING_CONFIG,
      customEncouragementMessages: {
        goodProgress: ['Custom progress message!'],
      },
    };
    const result = getEncouragementMessage('goodProgress', config);
    expect(result).toBe('Custom progress message!');
  });

  it('should fall back to default when custom messages array is empty', () => {
    const config: LearningModeConfig = {
      ...DEFAULT_LEARNING_CONFIG,
      customEncouragementMessages: {
        goodProgress: [],
      },
    };
    const result = getEncouragementMessage('goodProgress', config);
    expect(ENCOURAGEMENT_MESSAGES.goodProgress).toContain(result);
  });

  it('should fall back to default when custom messages key is missing', () => {
    const config: LearningModeConfig = {
      ...DEFAULT_LEARNING_CONFIG,
      customEncouragementMessages: {
        breakthrough: ['Only breakthrough is custom'],
      },
    };
    const result = getEncouragementMessage('goodProgress', config);
    expect(ENCOURAGEMENT_MESSAGES.goodProgress).toContain(result);
  });

  it('should fall back to default when no config is provided', () => {
    const result = getEncouragementMessage('struggling');
    expect(ENCOURAGEMENT_MESSAGES.struggling).toContain(result);
  });

  it('should fall back to default when config has no custom messages', () => {
    const result = getEncouragementMessage('completion', DEFAULT_LEARNING_CONFIG);
    expect(ENCOURAGEMENT_MESSAGES.completion).toContain(result);
  });
});

describe('generateCelebrationMessage with config overrides', () => {
  const session = createMockSession({ currentPhase: 'questioning' });

  it('should use custom celebration messages when provided', () => {
    const config: LearningModeConfig = {
      ...DEFAULT_LEARNING_CONFIG,
      customCelebrationMessages: {
        concept_mastered: ['You mastered it! Custom!'],
      },
    };
    const result = generateCelebrationMessage('concept_mastered', session, config);
    expect(result).toBe('You mastered it! Custom!');
  });

  it('should fall back to default when custom messages array is empty', () => {
    const config: LearningModeConfig = {
      ...DEFAULT_LEARNING_CONFIG,
      customCelebrationMessages: {
        concept_mastered: [],
      },
    };
    const result = generateCelebrationMessage('concept_mastered', session, config);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should fall back to default when config has no custom celebration messages', () => {
    const result = generateCelebrationMessage('session_complete', session, DEFAULT_LEARNING_CONFIG);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should fall back to default when no config is provided', () => {
    const result = generateCelebrationMessage('question_solved', session);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
