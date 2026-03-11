import {
  buildLearningActionAvailability,
  buildLearningProgressSnapshot,
  computeAdaptiveLearningProfile,
  computeSpeedPassAdaptiveProfile,
  resolveLearningLifecycleState,
  resolveLearningResumeOutcome,
} from './lifecycle';

describe('learning lifecycle utilities', () => {
  it('resolves paused state for speedpass sessions', () => {
    const state = resolveLearningLifecycleState({
      subMode: 'speedpass',
      speedPassSession: {
        id: 'session-1',
        tutorialId: 'tutorial-1',
        userId: 'user-1',
        startedAt: new Date(),
        status: 'paused',
        totalPausedMs: 0,
        sectionsCompleted: [],
        questionsAttempted: 0,
        questionsCorrect: 0,
        timeSpentMs: 0,
      },
    });

    expect(state).toBe('paused');
  });

  it('returns fallback outcome when stored tutorial is stale but alternative exists', () => {
    const outcome = resolveLearningResumeOutcome({
      subMode: 'speedpass',
      context: {
        subMode: 'speedpass',
        tutorialId: 'missing-tutorial',
      },
      tutorials: {
        'tutorial-2': {
          id: 'tutorial-2',
          userId: 'user-1',
          courseId: 'course-1',
          textbookId: 'textbook-1',
          mode: 'speed',
          title: 'Recovered tutorial',
          overview: 'Overview',
          sections: [],
          totalEstimatedMinutes: 30,
          createdAt: new Date(),
          progress: 0,
          completedSectionIds: [],
          teacherKeyPointIds: [],
        },
      },
    });

    expect(outcome.outcome).toBe('fallback');
    expect(outcome.recoveredContext?.tutorialId).toBe('tutorial-2');
  });

  it('computes adaptive profile and applies preference guardrails', () => {
    const profile = computeAdaptiveLearningProfile({
      session: {
        currentDifficulty: 'intermediate',
        consecutiveCorrect: 5,
        consecutiveIncorrect: 0,
        engagementScore: 90,
        statistics: {
          totalTimeSpentMs: 0,
          activeTimeSpentMs: 0,
          questionsAnswered: 10,
          correctAnswers: 10,
          hintsUsed: 0,
          conceptsLearned: 0,
          averageResponseTimeMs: 0,
          streakDays: 0,
          longestStreak: 0,
          phaseCompletionTimes: {},
        },
        preferredStyle: 'visual',
      },
      config: {
        enableAdaptiveDifficulty: true,
        difficultyAdjustThreshold: 3,
      },
      preferredDifficulty: 'beginner',
    });

    expect(profile.targetDifficulty).toBe('intermediate');
    expect(profile.reasonCodes).toContain('preference-guardrail');
    expect(profile.practiceIntensity).toBe('challenging');
  });

  it('keeps speedpass mode shifts within guardrail bounds', () => {
    const profile = computeSpeedPassAdaptiveProfile({
      preferredMode: 'comprehensive',
      averageAccuracy: 95,
      currentStreak: 6,
    });

    expect(profile.recommendedMode).toBe('speed');
    expect(profile.reasonCodes).toContain('high-accuracy-streak');
  });

  it('builds normalized progress snapshot for socratic sessions', () => {
    const snapshot = buildLearningProgressSnapshot({
      subMode: 'socratic',
      lifecycleState: 'active',
      learningSession: {
        id: 'learning-1',
        sessionId: 'chat-1',
        durationType: 'quick',
        category: 'concept',
        topic: 'Recursion',
        learningGoals: [
          { id: 'goal-1', description: 'Understand base case', achieved: true },
          { id: 'goal-2', description: 'Trace recursion tree', achieved: false },
        ],
        currentPhase: 'questioning',
        subQuestions: [
          { id: 'q1', question: 'What is recursion?', status: 'resolved', hints: [], userAttempts: 1 },
          { id: 'q2', question: 'How to stop recursion?', status: 'pending', hints: [], userAttempts: 0 },
        ],
        progress: 45,
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
      },
    });

    expect(snapshot.percent).toBe(45);
    expect(snapshot.totalUnits).toBeGreaterThan(1);
  });

  it('disables resume action when no resumable context is available', () => {
    const actions = buildLearningActionAvailability({
      subMode: 'socratic',
      lifecycleState: 'idle',
      resumeOutcome: {
        outcome: 'reset-required',
        reason: 'No restorable context',
      },
      recoverableError: null,
    });

    expect(actions.resume.enabled).toBe(false);
    expect(actions.start.enabled).toBe(true);
  });
});
