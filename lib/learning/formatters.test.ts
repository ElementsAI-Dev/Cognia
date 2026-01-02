/**
 * Tests for Learning Mode Formatters
 */

import {
  formatLearningGoals,
  formatSubQuestionsList,
  formatProgressReport,
  formatSessionSummary,
  formatStatusLine,
} from './formatters';
import type {
  LearningSession,
  LearningGoal,
  LearningSubQuestion,
} from '@/types/learning';

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
    startedAt: new Date('2024-01-01T10:00:00Z'),
    lastActivityAt: new Date('2024-01-01T10:30:00Z'),
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

// Helper to create mock goals
function createMockGoal(overrides: Partial<LearningGoal> = {}): LearningGoal {
  return {
    id: 'goal-1',
    description: 'Test Goal',
    achieved: false,
    ...overrides,
  };
}

// Helper to create a mock sub-question
function createMockSubQuestion(overrides: Partial<LearningSubQuestion> = {}): LearningSubQuestion {
  return {
    id: 'sq-1',
    question: 'What is the main concept?',
    status: 'pending',
    hints: [],
    userAttempts: 0,
    ...overrides,
  };
}

describe('formatLearningGoals', () => {
  it('should return placeholder text for empty goals', () => {
    const result = formatLearningGoals([]);
    expect(result).toBe('_No learning goals defined yet_');
  });

  it('should format achieved goals with checkmark', () => {
    const goals = [createMockGoal({ description: 'Learn basics', achieved: true })];
    const result = formatLearningGoals(goals);
    expect(result).toContain('✅');
    expect(result).toContain('Learn basics');
  });

  it('should format unachieved goals with empty box', () => {
    const goals = [createMockGoal({ description: 'Advanced topic', achieved: false })];
    const result = formatLearningGoals(goals);
    expect(result).toContain('⬜');
    expect(result).toContain('Advanced topic');
  });

  it('should number goals correctly', () => {
    const goals = [
      createMockGoal({ id: '1', description: 'Goal one', achieved: true }),
      createMockGoal({ id: '2', description: 'Goal two', achieved: false }),
      createMockGoal({ id: '3', description: 'Goal three', achieved: true }),
    ];
    const result = formatLearningGoals(goals);
    expect(result).toContain('1. ✅ Goal one');
    expect(result).toContain('2. ⬜ Goal two');
    expect(result).toContain('3. ✅ Goal three');
  });

  it('should join multiple goals with newlines', () => {
    const goals = [
      createMockGoal({ id: '1', description: 'First', achieved: false }),
      createMockGoal({ id: '2', description: 'Second', achieved: false }),
    ];
    const result = formatLearningGoals(goals);
    const lines = result.split('\n');
    expect(lines).toHaveLength(2);
  });
});

describe('formatSubQuestionsList', () => {
  it('should return placeholder text for empty sub-questions', () => {
    const result = formatSubQuestionsList([]);
    expect(result).toBe('_No sub-questions identified yet_');
  });

  it('should format pending questions with hourglass', () => {
    const sqs = [createMockSubQuestion({ status: 'pending', question: 'Pending Q?' })];
    const result = formatSubQuestionsList(sqs);
    expect(result).toContain('⏳');
    expect(result).toContain('Pending Q?');
  });

  it('should format in_progress questions with refresh icon', () => {
    const sqs = [createMockSubQuestion({ status: 'in_progress', question: 'Working Q?' })];
    const result = formatSubQuestionsList(sqs);
    expect(result).toContain('🔄');
  });

  it('should format resolved questions with checkmark', () => {
    const sqs = [createMockSubQuestion({ status: 'resolved', question: 'Done Q?' })];
    const result = formatSubQuestionsList(sqs);
    expect(result).toContain('✅');
  });

  it('should format skipped questions with skip icon', () => {
    const sqs = [createMockSubQuestion({ status: 'skipped', question: 'Skip Q?' })];
    const result = formatSubQuestionsList(sqs);
    expect(result).toContain('⏭️');
  });

  it('should show attempt count for in_progress questions', () => {
    const sqs = [
      createMockSubQuestion({ status: 'in_progress', question: 'Q?', userAttempts: 3 }),
    ];
    const result = formatSubQuestionsList(sqs);
    expect(result).toContain('(3 attempts)');
  });

  it('should not show attempt count when attempts is 0', () => {
    const sqs = [
      createMockSubQuestion({ status: 'in_progress', question: 'Q?', userAttempts: 0 }),
    ];
    const result = formatSubQuestionsList(sqs);
    expect(result).not.toContain('attempts');
  });

  it('should show hint count when hints provided', () => {
    const sqs = [
      createMockSubQuestion({ question: 'Q?', hints: ['hint1', 'hint2'] }),
    ];
    const result = formatSubQuestionsList(sqs);
    expect(result).toContain('💡×2');
  });

  it('should number questions correctly', () => {
    const sqs = [
      createMockSubQuestion({ id: 'sq-1', question: 'First?' }),
      createMockSubQuestion({ id: 'sq-2', question: 'Second?' }),
    ];
    const result = formatSubQuestionsList(sqs);
    expect(result).toContain('1.');
    expect(result).toContain('2.');
  });
});

describe('formatProgressReport', () => {
  it('should include topic in header', () => {
    const session = createMockSession({ topic: 'JavaScript Closures' });
    const result = formatProgressReport(session);
    expect(result).toContain('JavaScript Closures');
  });

  it('should include current phase with emoji', () => {
    const session = createMockSession({ currentPhase: 'questioning' });
    const result = formatProgressReport(session);
    expect(result).toContain('❓');
    expect(result).toContain('Questioning');
  });

  it('should show progress bar', () => {
    const session = createMockSession({ progress: 50 });
    const result = formatProgressReport(session);
    expect(result).toContain('█'.repeat(5));
    expect(result).toContain('░'.repeat(5));
    expect(result).toContain('50%');
  });

  it('should show 0% progress correctly', () => {
    const session = createMockSession({ progress: 0 });
    const result = formatProgressReport(session);
    expect(result).toContain('░'.repeat(10));
    expect(result).toContain('0%');
  });

  it('should show 100% progress correctly', () => {
    const session = createMockSession({ progress: 100 });
    const result = formatProgressReport(session);
    expect(result).toContain('█'.repeat(10));
    expect(result).toContain('100%');
  });

  it('should include sub-questions section when present', () => {
    const session = createMockSession({
      subQuestions: [
        createMockSubQuestion({ status: 'resolved' }),
        createMockSubQuestion({ status: 'pending' }),
      ],
    });
    const result = formatProgressReport(session);
    expect(result).toContain('Sub-Questions (1/2)');
  });

  it('should include learning goals section when present', () => {
    const session = createMockSession({
      learningGoals: [
        createMockGoal({ achieved: true }),
        createMockGoal({ achieved: false }),
      ],
    });
    const result = formatProgressReport(session);
    expect(result).toContain('Learning Goals (1/2)');
  });

  it('should include all phase emojis correctly', () => {
    const phaseEmojis: Record<LearningSession['currentPhase'], string> = {
      clarification: '🎯',
      deconstruction: '🧩',
      questioning: '❓',
      feedback: '💬',
      summary: '📝',
    };

    Object.entries(phaseEmojis).forEach(([phase, emoji]) => {
      const session = createMockSession({ currentPhase: phase as LearningSession['currentPhase'] });
      const result = formatProgressReport(session);
      expect(result).toContain(emoji);
    });
  });
});

describe('formatSessionSummary', () => {
  it('should include topic in summary', () => {
    const session = createMockSession({ topic: 'React Hooks' });
    const result = formatSessionSummary(session);
    expect(result).toContain('React Hooks');
  });

  it('should calculate duration in minutes', () => {
    const startTime = new Date('2024-01-01T10:00:00Z');
    const endTime = new Date('2024-01-01T10:45:00Z');
    const session = createMockSession({
      startedAt: startTime,
      completedAt: endTime,
    });
    const result = formatSessionSummary(session);
    expect(result).toContain('45 minutes');
  });

  it('should use current time if session not completed', () => {
    const session = createMockSession({
      startedAt: new Date(),
      completedAt: undefined,
    });
    const result = formatSessionSummary(session);
    expect(result).toContain('minutes');
  });

  it('should show achievement counts', () => {
    const session = createMockSession({
      learningGoals: [
        createMockGoal({ achieved: true }),
        createMockGoal({ achieved: true }),
        createMockGoal({ achieved: false }),
      ],
      subQuestions: [
        createMockSubQuestion({ status: 'resolved' }),
        createMockSubQuestion({ status: 'resolved' }),
      ],
      totalHintsProvided: 5,
    });
    const result = formatSessionSummary(session);
    expect(result).toContain('2/3 learning goals achieved');
    expect(result).toContain('2 concepts explored');
    expect(result).toContain('5 hints used');
  });

  it('should include key takeaways when provided', () => {
    const session = createMockSession({
      keyTakeaways: ['First insight', 'Second insight'],
    });
    const result = formatSessionSummary(session);
    expect(result).toContain('Key Takeaways');
    expect(result).toContain('1. First insight');
    expect(result).toContain('2. Second insight');
  });

  it('should not include key takeaways section when empty', () => {
    const session = createMockSession({ keyTakeaways: [] });
    const result = formatSessionSummary(session);
    expect(result).not.toContain('Key Takeaways');
  });

  it('should include final summary when provided', () => {
    const session = createMockSession({
      finalSummary: 'This was a great learning session.',
    });
    const result = formatSessionSummary(session);
    expect(result).toContain('## Summary');
    expect(result).toContain('This was a great learning session.');
  });

  it('should include insights from resolved sub-questions', () => {
    const session = createMockSession({
      subQuestions: [
        createMockSubQuestion({
          status: 'resolved',
          question: 'How does it work?',
          keyInsights: ['Insight A', 'Insight B'],
        }),
      ],
    });
    const result = formatSessionSummary(session);
    expect(result).toContain('Insights Discovered');
    expect(result).toContain('How does it work?');
    expect(result).toContain('Insight A');
    expect(result).toContain('Insight B');
  });

  it('should include closing encouragement message', () => {
    const session = createMockSession({});
    const result = formatSessionSummary(session);
    expect(result).toContain('Great job');
    expect(result).toContain('teach it to someone else');
  });
});

describe('formatStatusLine', () => {
  it('should include phase short name', () => {
    const session = createMockSession({ currentPhase: 'questioning' });
    const result = formatStatusLine(session);
    expect(result).toContain('Exploring');
  });

  it('should include progress percentage', () => {
    const session = createMockSession({ progress: 75 });
    const result = formatStatusLine(session);
    expect(result).toContain('75%');
  });

  it('should include sub-question count when present', () => {
    const session = createMockSession({
      subQuestions: [
        createMockSubQuestion({ status: 'resolved' }),
        createMockSubQuestion({ status: 'pending' }),
        createMockSubQuestion({ status: 'pending' }),
      ],
    });
    const result = formatStatusLine(session);
    expect(result).toContain('1/3 questions');
  });

  it('should not include questions text when no sub-questions', () => {
    const session = createMockSession({ subQuestions: [] });
    const result = formatStatusLine(session);
    expect(result).not.toContain('questions');
  });

  it('should have all phase short names', () => {
    const phaseShortNames: Record<LearningSession['currentPhase'], string> = {
      clarification: 'Clarifying',
      deconstruction: 'Breaking Down',
      questioning: 'Exploring',
      feedback: 'Refining',
      summary: 'Summarizing',
    };

    Object.entries(phaseShortNames).forEach(([phase, shortName]) => {
      const session = createMockSession({ currentPhase: phase as LearningSession['currentPhase'] });
      const result = formatStatusLine(session);
      expect(result).toContain(shortName);
    });
  });

  it('should use bullet separator', () => {
    const session = createMockSession({ progress: 50 });
    const result = formatStatusLine(session);
    expect(result).toContain('•');
  });
});

describe('edge cases', () => {
  describe('formatLearningGoals edge cases', () => {
    it('should handle goals with special characters', () => {
      const goals = [createMockGoal({ description: 'Learn <html> & "quotes"' })];
      const result = formatLearningGoals(goals);
      expect(result).toContain('<html>');
      expect(result).toContain('&');
    });

    it('should handle very long goal descriptions', () => {
      const longDesc = 'Learn '.repeat(100);
      const goals = [createMockGoal({ description: longDesc })];
      const result = formatLearningGoals(goals);
      expect(result).toContain(longDesc);
    });

    it('should handle many goals', () => {
      const goals = Array.from({ length: 20 }, (_, i) =>
        createMockGoal({ id: `goal-${i}`, description: `Goal ${i}` })
      );
      const result = formatLearningGoals(goals);
      expect(result).toContain('20.');
    });
  });

  describe('formatSubQuestionsList edge cases', () => {
    it('should handle questions with special characters', () => {
      const sqs = [createMockSubQuestion({ question: 'What is <code>??' })];
      const result = formatSubQuestionsList(sqs);
      expect(result).toContain('<code>');
    });

    it('should handle high attempt counts', () => {
      const sqs = [
        createMockSubQuestion({ status: 'in_progress', userAttempts: 99 }),
      ];
      const result = formatSubQuestionsList(sqs);
      expect(result).toContain('(99 attempts)');
    });

    it('should handle many hints', () => {
      const sqs = [
        createMockSubQuestion({ hints: Array(10).fill('hint') }),
      ];
      const result = formatSubQuestionsList(sqs);
      expect(result).toContain('💡×10');
    });
  });

  describe('formatProgressReport edge cases', () => {
    it('should handle topic with special characters', () => {
      const session = createMockSession({ topic: 'C++ & <Templates>' });
      const result = formatProgressReport(session);
      expect(result).toContain('C++ & <Templates>');
    });

    it('should handle 100% progress correctly', () => {
      const session = createMockSession({ progress: 100 });
      const result = formatProgressReport(session);
      expect(result).toContain('██████████');
      expect(result).not.toContain('░');
    });

    it('should handle partial progress bars', () => {
      const session = createMockSession({ progress: 33 });
      const result = formatProgressReport(session);
      expect(result).toContain('███');
      expect(result).toContain('░░░░░░░');
    });
  });

  describe('formatSessionSummary edge cases', () => {
    it('should handle session with no achievements', () => {
      const session = createMockSession({
        learningGoals: [],
        subQuestions: [],
        totalHintsProvided: 0,
      });
      const result = formatSessionSummary(session);
      expect(result).toContain('0/0 learning goals');
      expect(result).toContain('0 concepts explored');
    });

    it('should handle very long session duration', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T12:00:00Z');
      const session = createMockSession({
        startedAt: startTime,
        completedAt: endTime,
      });
      const result = formatSessionSummary(session);
      expect(result).toContain('720 minutes');
    });

    it('should handle sub-questions with empty keyInsights', () => {
      const session = createMockSession({
        subQuestions: [
          createMockSubQuestion({
            status: 'resolved',
            keyInsights: [],
          }),
        ],
      });
      const result = formatSessionSummary(session);
      expect(result).not.toContain('Insights Discovered');
    });

    it('should handle sub-questions with undefined keyInsights', () => {
      const session = createMockSession({
        subQuestions: [
          createMockSubQuestion({
            status: 'resolved',
            keyInsights: undefined,
          }),
        ],
      });
      const result = formatSessionSummary(session);
      expect(result).toBeDefined();
    });
  });

  describe('formatStatusLine edge cases', () => {
    it('should handle 0% progress', () => {
      const session = createMockSession({ progress: 0 });
      const result = formatStatusLine(session);
      expect(result).toContain('0%');
    });

    it('should handle 100% progress', () => {
      const session = createMockSession({ progress: 100 });
      const result = formatStatusLine(session);
      expect(result).toContain('100%');
    });

    it('should handle all questions resolved', () => {
      const session = createMockSession({
        subQuestions: [
          createMockSubQuestion({ status: 'resolved' }),
          createMockSubQuestion({ status: 'resolved' }),
        ],
      });
      const result = formatStatusLine(session);
      expect(result).toContain('2/2 questions');
    });
  });
});
