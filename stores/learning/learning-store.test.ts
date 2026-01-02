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

  describe('Notes Management', () => {
    it('should add a note to a session', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      let note!: ReturnType<typeof result.current.addNote>;
      act(() => {
        note = result.current.addNote(learningSession.id, 'This is an important insight');
      });

      expect(note.content).toBe('This is an important insight');
      expect(note.isHighlight).toBe(false);

      const session = result.current.getLearningSession(learningSession.id);
      expect(session?.notes).toHaveLength(1);
    });

    it('should update a note', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      let note!: ReturnType<typeof result.current.addNote>;
      act(() => {
        note = result.current.addNote(learningSession.id, 'Original content');
      });

      act(() => {
        result.current.updateNote(learningSession.id, note.id, { content: 'Updated content' });
      });

      const session = result.current.getLearningSession(learningSession.id);
      expect(session?.notes[0].content).toBe('Updated content');
    });

    it('should delete a note', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      let note!: ReturnType<typeof result.current.addNote>;
      act(() => {
        note = result.current.addNote(learningSession.id, 'Note to delete');
      });

      act(() => {
        result.current.deleteNote(learningSession.id, note.id);
      });

      const session = result.current.getLearningSession(learningSession.id);
      expect(session?.notes).toHaveLength(0);
    });

    it('should toggle note highlight', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      let note!: ReturnType<typeof result.current.addNote>;
      act(() => {
        note = result.current.addNote(learningSession.id, 'Important note');
      });

      act(() => {
        result.current.toggleNoteHighlight(learningSession.id, note.id);
      });

      let session = result.current.getLearningSession(learningSession.id);
      expect(session?.notes[0].isHighlight).toBe(true);

      act(() => {
        result.current.toggleNoteHighlight(learningSession.id, note.id);
      });

      session = result.current.getLearningSession(learningSession.id);
      expect(session?.notes[0].isHighlight).toBe(false);
    });
  });

  describe('Concept Tracking', () => {
    it('should add a concept to a session', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      let concept!: ReturnType<typeof result.current.addConcept>;
      act(() => {
        concept = result.current.addConcept(learningSession.id, 'Recursion', 'A function that calls itself');
      });

      expect(concept.name).toBe('Recursion');
      expect(concept.masteryStatus).toBe('learning');
      expect(concept.masteryScore).toBe(0);

      const session = result.current.getLearningSession(learningSession.id);
      expect(session?.concepts).toHaveLength(1);
    });

    it('should update concept mastery on correct answer', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      let concept!: ReturnType<typeof result.current.addConcept>;
      act(() => {
        concept = result.current.addConcept(learningSession.id, 'Recursion');
      });

      act(() => {
        result.current.updateConceptMastery(learningSession.id, concept.id, true);
        result.current.updateConceptMastery(learningSession.id, concept.id, true);
        result.current.updateConceptMastery(learningSession.id, concept.id, true);
      });

      const session = result.current.getLearningSession(learningSession.id);
      const updatedConcept = session?.concepts.find(c => c.id === concept.id);
      expect(updatedConcept?.correctAnswers).toBe(3);
      expect(updatedConcept?.totalAttempts).toBe(3);
      expect(updatedConcept?.masteryScore).toBe(100);
      expect(updatedConcept?.masteryStatus).toBe('practicing');
    });

    it('should update concept mastery on incorrect answer', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      let concept!: ReturnType<typeof result.current.addConcept>;
      act(() => {
        concept = result.current.addConcept(learningSession.id, 'Recursion');
      });

      act(() => {
        result.current.updateConceptMastery(learningSession.id, concept.id, false);
      });

      const session = result.current.getLearningSession(learningSession.id);
      const updatedConcept = session?.concepts.find(c => c.id === concept.id);
      expect(updatedConcept?.correctAnswers).toBe(0);
      expect(updatedConcept?.totalAttempts).toBe(1);
      expect(updatedConcept?.masteryScore).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should record answers and update statistics', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      act(() => {
        result.current.recordAnswer(learningSession.id, true, 5000);
        result.current.recordAnswer(learningSession.id, true, 3000);
        result.current.recordAnswer(learningSession.id, false, 8000);
      });

      const session = result.current.getLearningSession(learningSession.id);
      expect(session?.statistics.questionsAnswered).toBe(3);
      expect(session?.statistics.correctAnswers).toBe(2);
      expect(session?.consecutiveCorrect).toBe(0);
      expect(session?.consecutiveIncorrect).toBe(1);
    });

    it('should track consecutive correct answers', () => {
      const { result } = renderHook(() => useLearningStore());

      // Disable adaptive difficulty to test consecutive tracking alone
      act(() => {
        result.current.updateConfig({ enableAdaptiveDifficulty: false });
      });

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      act(() => {
        result.current.recordAnswer(learningSession.id, true, 1000);
        result.current.recordAnswer(learningSession.id, true, 1000);
        result.current.recordAnswer(learningSession.id, true, 1000);
      });

      const session = result.current.getLearningSession(learningSession.id);
      expect(session?.consecutiveCorrect).toBe(3);
      expect(session?.consecutiveIncorrect).toBe(0);
    });

    it('should update engagement score', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      const initialEngagement = result.current.getLearningSession(learningSession.id)?.engagementScore;

      act(() => {
        result.current.updateEngagement(learningSession.id, true);
      });

      let session = result.current.getLearningSession(learningSession.id);
      expect(session?.engagementScore).toBe(initialEngagement! + 5);

      act(() => {
        result.current.updateEngagement(learningSession.id, false);
      });

      session = result.current.getLearningSession(learningSession.id);
      expect(session?.engagementScore).toBe(initialEngagement! + 5 - 10);
    });
  });

  describe('Adaptive Difficulty', () => {
    it('should start with default difficulty', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      const session = result.current.getLearningSession(learningSession.id);
      expect(session?.currentDifficulty).toBe('intermediate');
    });

    it('should start with preferred difficulty', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
          preferredDifficulty: 'beginner',
        });
      });

      const session = result.current.getLearningSession(learningSession.id);
      expect(session?.currentDifficulty).toBe('beginner');
    });

    it('should manually set difficulty', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      act(() => {
        result.current.setDifficulty(learningSession.id, 'expert');
      });

      const session = result.current.getLearningSession(learningSession.id);
      expect(session?.currentDifficulty).toBe('expert');
    });

    it('should increase difficulty after consecutive correct answers', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.updateConfig({ difficultyAdjustThreshold: 3 });
      });

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
          preferredDifficulty: 'beginner',
        });
      });

      act(() => {
        result.current.recordAnswer(learningSession.id, true, 1000);
        result.current.recordAnswer(learningSession.id, true, 1000);
        result.current.recordAnswer(learningSession.id, true, 1000);
      });

      const session = result.current.getLearningSession(learningSession.id);
      expect(session?.currentDifficulty).toBe('intermediate');
      expect(session?.adaptiveAdjustments).toBe(1);
    });
  });

  describe('Session Queries', () => {
    it('should get all sessions', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.startLearningSession('session-1', { topic: 'Topic 1' });
        result.current.startLearningSession('session-2', { topic: 'Topic 2' });
      });

      const allSessions = result.current.getAllSessions();
      expect(allSessions).toHaveLength(2);
    });

    it('should get completed sessions', () => {
      const { result } = renderHook(() => useLearningStore());

      let session1!: LearningSession;
      act(() => {
        session1 = result.current.startLearningSession('session-1', { topic: 'Topic 1' });
        result.current.startLearningSession('session-2', { topic: 'Topic 2' });
      });

      act(() => {
        result.current.endLearningSession(session1.id, 'Summary');
      });

      const completedSessions = result.current.getCompletedSessions();
      expect(completedSessions).toHaveLength(1);
      expect(completedSessions[0].topic).toBe('Topic 1');
    });
  });

  describe('Review Items (Spaced Repetition)', () => {
    it('should add a review item', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      let reviewItem!: ReturnType<typeof result.current.addReviewItem>;
      act(() => {
        reviewItem = result.current.addReviewItem(learningSession.id, {
          conceptId: 'concept-1',
          sessionId: learningSession.sessionId,
          question: 'What is recursion?',
          answer: 'A function that calls itself',
          nextReviewAt: tomorrow,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
        });
      });

      expect(reviewItem.question).toBe('What is recursion?');
      expect(reviewItem.interval).toBe(1);

      const session = result.current.getLearningSession(learningSession.id);
      expect(session?.reviewItems).toHaveLength(1);
    });

    it('should update review item with SM-2 algorithm', () => {
      const { result } = renderHook(() => useLearningStore());

      let learningSession!: LearningSession;
      act(() => {
        learningSession = result.current.startLearningSession('session-1', {
          topic: 'Test Topic',
        });
      });

      const now = new Date();

      let reviewItem!: ReturnType<typeof result.current.addReviewItem>;
      act(() => {
        reviewItem = result.current.addReviewItem(learningSession.id, {
          conceptId: 'concept-1',
          sessionId: learningSession.sessionId,
          question: 'Test question',
          answer: 'Test answer',
          nextReviewAt: now,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
        });
      });

      act(() => {
        result.current.updateReviewItem(learningSession.id, reviewItem.id, 4);
      });

      const session = result.current.getLearningSession(learningSession.id);
      const updatedItem = session?.reviewItems.find(r => r.id === reviewItem.id);
      expect(updatedItem?.repetitions).toBe(1);
      expect(updatedItem?.interval).toBe(1);
      expect(updatedItem?.lastReviewedAt).toBeDefined();
    });
  });
});
