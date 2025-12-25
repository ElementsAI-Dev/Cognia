/**
 * Learning Store Tests
 * 
 * Unit tests for the learning mode Zustand store.
 */

import { act, renderHook } from '@testing-library/react';
import { useLearningStore } from './learning-store';
import type { LearningPhase, LearningSession } from '@/types/learning';

describe('useLearningStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useLearningStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Session Management', () => {
    it('should start a learning session', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.startLearningSession('session-1', {
          topic: 'Recursion in Programming',
          learningGoals: ['Understand base case', 'Understand recursive case'],
        });
      });

      const session = result.current.getLearningSessionByChat('session-1');
      expect(session).toBeDefined();
      expect(session?.topic).toBe('Recursion in Programming');
      expect(session?.learningGoals).toHaveLength(2);
      expect(session?.currentPhase).toBe('clarification');
      expect(session?.progress).toBe(0);
    });

    it('should end a learning session with summary', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      act(() => {
        result.current.endLearningSession(
          learningSession.id,
          'Great learning session!',
          ['Key takeaway 1', 'Key takeaway 2']
        );
      });

      const session = result.current.getLearningSession(learningSession.id);
      expect(session?.completedAt).toBeDefined();
      expect(session?.finalSummary).toBe('Great learning session!');
      expect(session?.keyTakeaways).toEqual(['Key takeaway 1', 'Key takeaway 2']);
      expect(session?.currentPhase).toBe('summary');
      expect(session?.progress).toBe(100);
    });

    it('should delete a learning session', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      act(() => {
        result.current.deleteLearningSession(learningSession.id);
      });

      expect(result.current.getLearningSession(learningSession.id)).toBeUndefined();
    });
  });

  describe('Phase Management', () => {
    it('should advance through phases in order', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      const expectedPhases: LearningPhase[] = [
        'clarification',
        'deconstruction',
        'questioning',
        'feedback',
        'summary',
      ];

      // Verify initial phase
      expect(result.current.getCurrentPhase(learningSession.id)).toBe('clarification');

      // Advance through all phases
      for (let i = 1; i < expectedPhases.length; i++) {
        act(() => {
          result.current.advancePhase(learningSession.id);
        });
        expect(result.current.getCurrentPhase(learningSession.id)).toBe(expectedPhases[i]);
      }

      // Should not advance past summary
      act(() => {
        result.current.advancePhase(learningSession.id);
      });
      expect(result.current.getCurrentPhase(learningSession.id)).toBe('summary');
    });

    it('should set phase directly', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      act(() => {
        result.current.setPhase(learningSession.id, 'questioning');
      });

      expect(result.current.getCurrentPhase(learningSession.id)).toBe('questioning');
    });
  });

  describe('Sub-Questions Management', () => {
    it('should add sub-questions', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      act(() => {
        result.current.addSubQuestion(learningSession.id, 'What is a base case?');
        result.current.addSubQuestion(learningSession.id, 'What is a recursive case?');
      });

      const session = result.current.getLearningSession(learningSession.id);
      expect(session?.subQuestions).toHaveLength(2);
      expect(session?.subQuestions[0].question).toBe('What is a base case?');
      expect(session?.subQuestions[0].status).toBe('pending');
    });

    it('should mark sub-question as resolved with insights', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      let subQuestion!: ReturnType<typeof result.current.addSubQuestion>;
      act(() => {
        subQuestion = result.current.addSubQuestion(learningSession.id, 'Test question');
      });

      act(() => {
        result.current.markSubQuestionResolved(
          learningSession.id,
          subQuestion.id,
          ['Insight 1', 'Insight 2']
        );
      });

      const session = result.current.getLearningSession(learningSession.id);
      const resolvedQuestion = session?.subQuestions.find((sq) => sq.id === subQuestion.id);
      expect(resolvedQuestion?.status).toBe('resolved');
      expect(resolvedQuestion?.keyInsights).toEqual(['Insight 1', 'Insight 2']);
      expect(resolvedQuestion?.resolvedAt).toBeDefined();
    });

    it('should track attempts and hints', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      let subQuestion!: ReturnType<typeof result.current.addSubQuestion>;
      act(() => {
        subQuestion = result.current.addSubQuestion(learningSession.id, 'Test question');
      });

      act(() => {
        result.current.incrementAttempts(learningSession.id, subQuestion.id);
        result.current.incrementAttempts(learningSession.id, subQuestion.id);
        result.current.addHintToSubQuestion(learningSession.id, subQuestion.id, 'Try thinking about...');
      });

      const session = result.current.getLearningSession(learningSession.id);
      const sq = session?.subQuestions.find((s) => s.id === subQuestion.id);
      expect(sq?.userAttempts).toBe(2);
      expect(sq?.hints).toHaveLength(1);
      expect(sq?.hints[0]).toBe('Try thinking about...');
      expect(session?.totalHintsProvided).toBe(1);
    });
  });

  describe('Goals Management', () => {
    it('should add and achieve goals', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      let goal!: ReturnType<typeof result.current.addLearningGoal>;
      act(() => {
        goal = result.current.addLearningGoal(learningSession.id, 'Understand the basics');
      });

      expect(goal.achieved).toBe(false);

      act(() => {
        result.current.markGoalAchieved(learningSession.id, goal.id);
      });

      const session = result.current.getLearningSession(learningSession.id);
      const achievedGoal = session?.learningGoals.find((g) => g.id === goal.id);
      expect(achievedGoal?.achieved).toBe(true);
      expect(achievedGoal?.achievedAt).toBeDefined();
    });
  });

  describe('Progress Tracking', () => {
    it('should update progress based on phases, sub-questions, and goals', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
          learningGoals: ['Goal 1'],
        });
      });

      // Initial progress should be low (only clarification phase)
      let session = result.current.getLearningSession(learningSession.id);
      expect(session?.progress).toBeGreaterThanOrEqual(0);

      // Add and resolve a sub-question
      let subQuestion!: ReturnType<typeof result.current.addSubQuestion>;
      act(() => {
        subQuestion = result.current.addSubQuestion(learningSession.id, 'Q1');
      });

      act(() => {
        result.current.markSubQuestionResolved(learningSession.id, subQuestion.id);
      });

      // Progress should increase
      session = result.current.getLearningSession(learningSession.id);
      expect(session?.progress).toBeGreaterThan(0);

      // Advance phase
      act(() => {
        result.current.advancePhase(learningSession.id);
      });

      session = result.current.getLearningSession(learningSession.id);
      expect(session?.progress).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should update and reset configuration', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.updateConfig({
          maxHintsPerQuestion: 5,
          enableEncouragement: false,
        });
      });

      expect(result.current.config.maxHintsPerQuestion).toBe(5);
      expect(result.current.config.enableEncouragement).toBe(false);

      act(() => {
        result.current.resetConfig();
      });

      expect(result.current.config.maxHintsPerQuestion).toBe(3);
      expect(result.current.config.enableEncouragement).toBe(true);
    });
  });
});
