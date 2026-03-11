/**
 * Learning lifecycle utilities shared by learning-mode entry surfaces.
 */

import type {
  AdaptiveLearningInput,
  AdaptiveLearningProfile,
  CanonicalLearningContextInput,
  GuidanceDepth,
  LearningLifecycleActionAvailability,
  LearningLifecycleActionId,
  LearningLifecycleState,
  LearningProgressSnapshot,
  LearningRecoverableError,
  LearningResumeContext,
  LearningResumeOutcome,
  PracticeIntensity,
} from '@/types/learning/lifecycle';
import type { LearningSubMode } from '@/types/core/session';
import type { DifficultyLevel, LearningSession } from '@/types/learning/learning';
import type { SpeedLearningMode, SpeedLearningTutorial, SpeedStudySession } from '@/types/learning/speedpass';

const DIFFICULTY_ORDER: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
const SPEEDPASS_MODE_ORDER: SpeedLearningMode[] = ['comprehensive', 'speed', 'extreme'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toDate(value: Date | string | undefined, fallback: Date = new Date()): Date {
  if (!value) {
    return fallback;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function buildLearningRecoverableError(input: {
  stage: LearningRecoverableError['stage'];
  code: string;
  message: string;
  retryable: boolean;
  fallbackAction: LearningRecoverableError['fallbackAction'];
  affectedTargets?: string[];
  occurredAt?: Date | string;
}): LearningRecoverableError {
  return {
    stage: input.stage,
    code: input.code,
    message: input.message,
    retryable: input.retryable,
    fallbackAction: input.fallbackAction,
    affectedTargets: input.affectedTargets,
    occurredAt: toDate(input.occurredAt),
  };
}

export function resolveLearningLifecycleState(
  input: CanonicalLearningContextInput
): LearningLifecycleState {
  if (input.recoverableError) {
    return 'errored';
  }

  if (input.subMode === 'speedpass') {
    if (input.speedPassSession?.status === 'paused') {
      return 'paused';
    }
    if (input.speedPassSession?.status === 'active') {
      return 'active';
    }
    if (input.isPreparing) {
      return 'preparing';
    }
    if (input.activeTutorial) {
      if (input.activeTutorial.completedAt || input.activeTutorial.progress >= 100) {
        return 'completed';
      }
      return 'active';
    }
    if (input.speedPassSession?.status === 'completed') {
      return 'completed';
    }
    return 'idle';
  }

  if (input.isPreparing) {
    return 'preparing';
  }
  if (!input.learningSession) {
    return 'idle';
  }
  if (input.learningSession.completedAt || input.learningSession.progress >= 100) {
    return 'completed';
  }
  return 'active';
}

export function resolveLearningResumeOutcome(input: {
  subMode: LearningSubMode;
  chatSessionId?: string;
  context?: LearningResumeContext;
  learningSession?: LearningSession;
  learningSessions?: Record<string, LearningSession>;
  activeLearningSessionId?: string | null;
  tutorials?: Record<string, SpeedLearningTutorial>;
  studySessions?: Record<string, SpeedStudySession>;
  currentTutorialId?: string | null;
  currentSpeedPassSessionId?: string | null;
}): LearningResumeOutcome {
  if (input.subMode === 'speedpass') {
    const tutorials = input.tutorials || {};
    const studySessions = input.studySessions || {};
    const missingTargets: string[] = [];

    const contextTutorialId = input.context?.tutorialId;
    const contextSessionId = input.context?.speedPassSessionId;

    if (contextTutorialId && !tutorials[contextTutorialId]) {
      missingTargets.push(`tutorial:${contextTutorialId}`);
    }
    if (contextSessionId && !studySessions[contextSessionId]) {
      missingTargets.push(`study-session:${contextSessionId}`);
    }

    const contextTutorial = contextTutorialId ? tutorials[contextTutorialId] : undefined;
    const currentTutorial = input.currentTutorialId ? tutorials[input.currentTutorialId] : undefined;
    const fallbackTutorial =
      currentTutorial ||
      Object.values(tutorials).find((tutorial) => !tutorial.completedAt) ||
      Object.values(tutorials)[0];

    const resolvedTutorial = contextTutorial || fallbackTutorial;
    if (!resolvedTutorial) {
      return {
        outcome: 'reset-required',
        reason: 'No restorable SpeedPass tutorial context found.',
        missingTargets: missingTargets.length > 0 ? missingTargets : undefined,
      };
    }

    const contextSession = contextSessionId ? studySessions[contextSessionId] : undefined;
    const currentSession = input.currentSpeedPassSessionId
      ? studySessions[input.currentSpeedPassSessionId]
      : undefined;
    const fallbackSession = contextSession || currentSession;

    if (contextTutorial) {
      return {
        outcome: missingTargets.length > 0 ? 'fallback' : 'resume',
        reason:
          missingTargets.length > 0
            ? 'Part of previous SpeedPass context was stale. Recovered to closest valid state.'
            : 'Recovered SpeedPass context from previous session.',
        recoveredContext: {
          chatSessionId: input.chatSessionId,
          subMode: 'speedpass',
          tutorialId: resolvedTutorial.id,
          tutorialSectionId: resolvedTutorial.currentSectionId,
          speedPassSessionId: fallbackSession?.id,
          lastStableAt: toDate(input.context?.lastStableAt),
        },
        missingTargets: missingTargets.length > 0 ? missingTargets : undefined,
      };
    }

    return {
      outcome: 'fallback',
      reason: 'Using closest available SpeedPass tutorial context.',
      recoveredContext: {
        chatSessionId: input.chatSessionId,
        subMode: 'speedpass',
        tutorialId: resolvedTutorial.id,
        tutorialSectionId: resolvedTutorial.currentSectionId,
        speedPassSessionId: fallbackSession?.id,
        lastStableAt: toDate(input.context?.lastStableAt),
      },
    };
  }

  const learningSessions = input.learningSessions || {};
  const missingTargets: string[] = [];
  const contextLearningSessionId = input.context?.learningSessionId;

  if (contextLearningSessionId && !learningSessions[contextLearningSessionId]) {
    missingTargets.push(`learning-session:${contextLearningSessionId}`);
  }

  const contextSession = contextLearningSessionId
    ? learningSessions[contextLearningSessionId]
    : undefined;
  const activeSession = input.activeLearningSessionId
    ? learningSessions[input.activeLearningSessionId]
    : undefined;
  const fallbackSession =
    input.learningSession ||
    contextSession ||
    activeSession ||
    Object.values(learningSessions).find((session) => !session.completedAt);

  if (!fallbackSession) {
    return {
      outcome: 'reset-required',
      reason: 'No restorable Socratic learning context found.',
      missingTargets: missingTargets.length > 0 ? missingTargets : undefined,
    };
  }

  const resolvedOutcome: LearningResumeOutcome['outcome'] = contextSession
    ? missingTargets.length > 0
      ? 'fallback'
      : 'resume'
    : 'fallback';

  return {
    outcome: resolvedOutcome,
    reason:
      resolvedOutcome === 'resume'
        ? 'Recovered Socratic learning context from previous session.'
        : 'Recovered closest available Socratic learning context.',
    recoveredContext: {
      chatSessionId: input.chatSessionId,
      subMode: 'socratic',
      learningSessionId: fallbackSession.id,
      learningPathId: fallbackSession.learningPathId,
      noteIds: fallbackSession.notes.map((note) => note.id),
      lastStableAt: toDate(fallbackSession.lastActivityAt),
    },
    missingTargets: missingTargets.length > 0 ? missingTargets : undefined,
  };
}

export function buildLearningProgressSnapshot(input: {
  subMode: LearningSubMode;
  lifecycleState: LearningLifecycleState;
  learningSession?: LearningSession;
  activeTutorial?: SpeedLearningTutorial;
  speedPassSession?: SpeedStudySession;
}): LearningProgressSnapshot {
  if (input.subMode === 'speedpass') {
    const tutorial = input.activeTutorial;
    const totalUnits = Math.max(1, tutorial?.sections.length || 0);
    const completedUnits = tutorial?.completedSectionIds.length || 0;
    const computedPercent =
      tutorial?.progress ??
      (tutorial ? Math.round((completedUnits / totalUnits) * 100) : 0);

    return {
      subMode: 'speedpass',
      lifecycleState: input.lifecycleState,
      percent: clamp(computedPercent, 0, 100),
      completedUnits,
      totalUnits,
      statusLabel:
        input.lifecycleState === 'paused'
          ? 'Paused'
          : input.lifecycleState === 'completed'
            ? 'Completed'
            : 'In progress',
      updatedAt: toDate(
        input.speedPassSession?.endedAt ||
          input.speedPassSession?.pausedAt ||
          input.speedPassSession?.startedAt ||
          tutorial?.completedAt ||
          tutorial?.createdAt
      ),
    };
  }

  const session = input.learningSession;
  const phaseOrder: Array<LearningSession['currentPhase']> = [
    'clarification',
    'deconstruction',
    'questioning',
    'feedback',
    'summary',
  ];
  const phaseIndex = session ? phaseOrder.indexOf(session.currentPhase) : -1;
  const resolvedQuestions = session?.subQuestions.filter((item) => item.status === 'resolved').length || 0;
  const achievedGoals = session?.learningGoals.filter((goal) => goal.achieved).length || 0;
  const totalUnits = Math.max(
    1,
    phaseOrder.length + (session?.subQuestions.length || 0) + (session?.learningGoals.length || 0)
  );
  const completedUnits = Math.max(0, phaseIndex + 1) + resolvedQuestions + achievedGoals;
  const computedPercent =
    session?.progress ??
    Math.round((completedUnits / totalUnits) * 100);

  return {
    subMode: 'socratic',
    lifecycleState: input.lifecycleState,
    percent: clamp(computedPercent, 0, 100),
    completedUnits: clamp(completedUnits, 0, totalUnits),
    totalUnits,
    statusLabel:
      input.lifecycleState === 'completed'
        ? 'Completed'
        : input.lifecycleState === 'preparing'
          ? 'Preparing'
          : 'In progress',
    updatedAt: toDate(session?.lastActivityAt || session?.startedAt),
  };
}

export function buildLearningActionAvailability(input: {
  subMode: LearningSubMode;
  lifecycleState: LearningLifecycleState;
  resumeOutcome: LearningResumeOutcome;
  recoverableError?: LearningRecoverableError | null;
}): Record<LearningLifecycleActionId, LearningLifecycleActionAvailability> {
  const canResume = input.resumeOutcome.outcome === 'resume' || input.resumeOutcome.outcome === 'fallback';
  const canRetry = input.lifecycleState === 'errored' && Boolean(input.recoverableError?.retryable);

  return {
    start: {
      action: 'start',
      enabled: input.lifecycleState === 'idle' || input.lifecycleState === 'completed',
      reason:
        input.lifecycleState === 'idle' || input.lifecycleState === 'completed'
          ? undefined
          : 'Learning session is already active.',
    },
    resume: {
      action: 'resume',
      enabled: canResume && (input.lifecycleState === 'idle' || input.lifecycleState === 'paused'),
      reason:
        canResume
          ? undefined
          : 'No resumable learning context available.',
    },
    pause: {
      action: 'pause',
      enabled: input.subMode === 'speedpass' && input.lifecycleState === 'active',
      reason:
        input.subMode !== 'speedpass'
          ? 'Pause is only available in SpeedPass sessions.'
          : undefined,
    },
    complete: {
      action: 'complete',
      enabled: input.lifecycleState === 'active',
      reason: input.lifecycleState === 'active' ? undefined : 'No active learning session to complete.',
    },
    reset: {
      action: 'reset',
      enabled: input.lifecycleState !== 'preparing',
      reason: input.lifecycleState !== 'preparing' ? undefined : 'Wait until initialization completes.',
    },
    retry: {
      action: 'retry',
      enabled: canRetry,
      reason: canRetry ? undefined : 'No retryable error is present.',
    },
    'open-workspace': {
      action: 'open-workspace',
      enabled: input.subMode === 'speedpass',
      reason: input.subMode === 'speedpass' ? undefined : 'Workspace is available in SpeedPass mode.',
    },
  };
}

function resolveDifficultyBounds(
  preferredDifficulty: DifficultyLevel | undefined,
  currentDifficulty: DifficultyLevel
): { minIndex: number; maxIndex: number } {
  if (!preferredDifficulty) {
    const currentIndex = DIFFICULTY_ORDER.indexOf(currentDifficulty);
    return {
      minIndex: clamp(currentIndex - 1, 0, DIFFICULTY_ORDER.length - 1),
      maxIndex: clamp(currentIndex + 1, 0, DIFFICULTY_ORDER.length - 1),
    };
  }

  const preferredIndex = DIFFICULTY_ORDER.indexOf(preferredDifficulty);
  return {
    minIndex: clamp(preferredIndex - 1, 0, DIFFICULTY_ORDER.length - 1),
    maxIndex: clamp(preferredIndex + 1, 0, DIFFICULTY_ORDER.length - 1),
  };
}

export function computeAdaptiveLearningProfile(input: AdaptiveLearningInput): AdaptiveLearningProfile {
  const currentIndex = DIFFICULTY_ORDER.indexOf(input.session.currentDifficulty);
  const { minIndex, maxIndex } = resolveDifficultyBounds(
    input.preferredDifficulty,
    input.session.currentDifficulty
  );
  const reasonCodes: string[] = [];

  if (!input.config.enableAdaptiveDifficulty) {
    return {
      guidanceDepth: 'medium',
      practiceIntensity: 'balanced',
      targetDifficulty: input.session.currentDifficulty,
      reasonCodes: ['adaptive-disabled'],
      guardrails: {
        minDifficulty: DIFFICULTY_ORDER[minIndex],
        maxDifficulty: DIFFICULTY_ORDER[maxIndex],
        steppedAdjustment: true,
      },
    };
  }

  let rawTargetIndex = currentIndex;
  const threshold = Math.max(1, input.config.difficultyAdjustThreshold);
  const questionsAnswered = input.session.statistics.questionsAnswered;
  const correctRate =
    questionsAnswered > 0
      ? input.session.statistics.correctAnswers / questionsAnswered
      : undefined;

  if (input.session.consecutiveIncorrect >= threshold) {
    rawTargetIndex -= 1;
    reasonCodes.push('struggling-streak');
  } else if (input.session.consecutiveCorrect >= threshold) {
    rawTargetIndex += 1;
    reasonCodes.push('strong-streak');
  }

  if (correctRate !== undefined && correctRate < 0.4 && rawTargetIndex >= currentIndex) {
    rawTargetIndex -= 1;
    reasonCodes.push('low-accuracy');
  } else if (correctRate !== undefined && correctRate > 0.85 && rawTargetIndex <= currentIndex) {
    rawTargetIndex += 1;
    reasonCodes.push('high-accuracy');
  }

  let guidanceDepth: GuidanceDepth = 'medium';
  let practiceIntensity: PracticeIntensity = 'balanced';
  if (input.session.engagementScore < 40) {
    guidanceDepth = 'high';
    practiceIntensity = 'reduced';
    reasonCodes.push('low-engagement');
  } else if (input.session.engagementScore > 80) {
    guidanceDepth = 'low';
    practiceIntensity = 'challenging';
    reasonCodes.push('high-engagement');
  }

  const boundedTargetIndex = clamp(rawTargetIndex, minIndex, maxIndex);
  if (boundedTargetIndex !== rawTargetIndex) {
    reasonCodes.push('preference-guardrail');
  }

  return {
    guidanceDepth,
    practiceIntensity,
    targetDifficulty: DIFFICULTY_ORDER[boundedTargetIndex],
    reasonCodes: reasonCodes.length > 0 ? reasonCodes : ['stable-profile'],
    guardrails: {
      minDifficulty: DIFFICULTY_ORDER[minIndex],
      maxDifficulty: DIFFICULTY_ORDER[maxIndex],
      steppedAdjustment: true,
    },
  };
}

export interface SpeedPassAdaptiveProfile {
  guidanceDepth: GuidanceDepth;
  practiceIntensity: PracticeIntensity;
  recommendedMode: SpeedLearningMode;
  quizDifficulty: 'easy' | 'medium' | 'hard';
  tutorialDepth: 'brief' | 'standard' | 'detailed';
  reasonCodes: string[];
}

function mapModeToDifficulty(mode: SpeedLearningMode): 'easy' | 'medium' | 'hard' {
  if (mode === 'comprehensive') {
    return 'easy';
  }
  if (mode === 'speed') {
    return 'medium';
  }
  return 'hard';
}

export function computeSpeedPassAdaptiveProfile(input: {
  preferredMode: SpeedLearningMode;
  averageAccuracy?: number;
  currentStreak?: number;
}): SpeedPassAdaptiveProfile {
  const reasonCodes: string[] = [];
  const preferredIndex = SPEEDPASS_MODE_ORDER.indexOf(input.preferredMode);
  let targetIndex = preferredIndex;
  let guidanceDepth: GuidanceDepth = 'medium';
  let practiceIntensity: PracticeIntensity = 'balanced';
  let tutorialDepth: SpeedPassAdaptiveProfile['tutorialDepth'] = 'standard';

  if (typeof input.averageAccuracy === 'number' && input.averageAccuracy < 55) {
    guidanceDepth = 'high';
    practiceIntensity = 'reduced';
    tutorialDepth = 'detailed';
    targetIndex -= 1;
    reasonCodes.push('low-accuracy');
  } else if (
    typeof input.averageAccuracy === 'number' &&
    input.averageAccuracy > 85 &&
    (input.currentStreak || 0) >= 3
  ) {
    guidanceDepth = 'low';
    practiceIntensity = 'challenging';
    tutorialDepth = 'brief';
    targetIndex += 1;
    reasonCodes.push('high-accuracy-streak');
  } else {
    reasonCodes.push('stable-profile');
  }

  const boundedTarget = clamp(targetIndex, preferredIndex - 1, preferredIndex + 1);
  if (boundedTarget !== targetIndex) {
    reasonCodes.push('mode-guardrail');
  }

  const finalMode = SPEEDPASS_MODE_ORDER[clamp(boundedTarget, 0, SPEEDPASS_MODE_ORDER.length - 1)];
  const quizDifficulty = mapModeToDifficulty(finalMode);

  return {
    guidanceDepth,
    practiceIntensity,
    recommendedMode: finalMode,
    quizDifficulty,
    tutorialDepth,
    reasonCodes,
  };
}

export function buildLearningResumeContext(input: {
  chatSessionId: string;
  subMode: LearningSubMode;
  learningSession?: LearningSession;
  activeTutorial?: SpeedLearningTutorial;
  speedPassSession?: SpeedStudySession;
}): LearningResumeContext {
  return {
    chatSessionId: input.chatSessionId,
    subMode: input.subMode,
    learningSessionId: input.learningSession?.id,
    learningPathId: input.learningSession?.learningPathId,
    tutorialId: input.activeTutorial?.id,
    tutorialSectionId: input.activeTutorial?.currentSectionId,
    speedPassSessionId: input.speedPassSession?.id,
    noteIds: input.learningSession?.notes.map((note) => note.id),
    lastStableAt: toDate(
      input.learningSession?.lastActivityAt ||
        input.speedPassSession?.pausedAt ||
        input.speedPassSession?.endedAt ||
        input.speedPassSession?.startedAt ||
        input.activeTutorial?.completedAt ||
        input.activeTutorial?.createdAt
    ),
  };
}
