/**
 * Cross-store selector contracts for canonical learning lifecycle behavior.
 */

import type { LearningSubMode } from '@/types/core/session';
import type {
  LearningLifecycleActionAvailability,
  LearningLifecycleActionId,
  LearningLifecycleState,
  LearningProgressSnapshot,
  LearningRecoverableError,
  LearningResumeContext,
  LearningResumeOutcome,
} from '@/types/learning/lifecycle';
import type { LearningSession } from '@/types/learning/learning';
import type { SpeedLearningTutorial, SpeedStudySession } from '@/types/learning/speedpass';
import {
  buildLearningActionAvailability,
  buildLearningProgressSnapshot,
  resolveLearningLifecycleState,
  resolveLearningResumeOutcome,
} from '@/lib/learning/lifecycle';

interface LearningLifecycleSelectorInput {
  subMode: LearningSubMode;
  chatSessionId?: string;
  resumeContext?: LearningResumeContext;
  learningSession?: LearningSession;
  learningSessions?: Record<string, LearningSession>;
  activeLearningSessionId?: string | null;
  activeTutorial?: SpeedLearningTutorial;
  tutorials?: Record<string, SpeedLearningTutorial>;
  speedPassSession?: SpeedStudySession;
  studySessions?: Record<string, SpeedStudySession>;
  currentTutorialId?: string | null;
  currentSpeedPassSessionId?: string | null;
  isPreparing?: boolean;
  recoverableError?: LearningRecoverableError | null;
}

export function selectLearningResumeOutcome(
  input: LearningLifecycleSelectorInput
): LearningResumeOutcome {
  return resolveLearningResumeOutcome({
    subMode: input.subMode,
    chatSessionId: input.chatSessionId,
    context: input.resumeContext,
    learningSession: input.learningSession,
    learningSessions: input.learningSessions,
    activeLearningSessionId: input.activeLearningSessionId,
    tutorials: input.tutorials,
    studySessions: input.studySessions,
    currentTutorialId: input.currentTutorialId,
    currentSpeedPassSessionId: input.currentSpeedPassSessionId,
  });
}

export function selectLearningLifecycleState(
  input: LearningLifecycleSelectorInput
): LearningLifecycleState {
  return resolveLearningLifecycleState({
    subMode: input.subMode,
    learningSession: input.learningSession,
    speedPassSession: input.speedPassSession,
    activeTutorial: input.activeTutorial,
    isPreparing: input.isPreparing,
    recoverableError: input.recoverableError,
  });
}

export function selectLearningProgressSnapshot(
  input: LearningLifecycleSelectorInput,
  lifecycleState: LearningLifecycleState
): LearningProgressSnapshot {
  return buildLearningProgressSnapshot({
    subMode: input.subMode,
    lifecycleState,
    learningSession: input.learningSession,
    activeTutorial: input.activeTutorial,
    speedPassSession: input.speedPassSession,
  });
}

export function selectLearningActionAvailability(
  input: LearningLifecycleSelectorInput,
  lifecycleState: LearningLifecycleState,
  resumeOutcome: LearningResumeOutcome
): Record<LearningLifecycleActionId, LearningLifecycleActionAvailability> {
  return buildLearningActionAvailability({
    subMode: input.subMode,
    lifecycleState,
    resumeOutcome,
    recoverableError: input.recoverableError,
  });
}
