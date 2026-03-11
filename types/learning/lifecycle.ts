/**
 * Canonical learning lifecycle types shared across Socratic and SpeedPass flows.
 */

import type { LearningSubMode, LearningResumeContext } from '../core/session';
import type { DifficultyLevel, LearningModeConfig, LearningSession } from './learning';
import type { SpeedLearningTutorial, SpeedStudySession } from './speedpass';

export type LearningLifecycleState =
  | 'idle'
  | 'preparing'
  | 'active'
  | 'paused'
  | 'completed'
  | 'errored';

export type LearningLifecycleActionId =
  | 'start'
  | 'resume'
  | 'pause'
  | 'complete'
  | 'reset'
  | 'retry'
  | 'open-workspace';

export interface LearningLifecycleActionAvailability {
  action: LearningLifecycleActionId;
  enabled: boolean;
  reason?: string;
}

export type LearningErrorStage =
  | 'initialization'
  | 'state_persistence'
  | 'session_resume'
  | 'content_generation'
  | 'sync';

export type LearningFallbackAction = 'retry' | 'fallback' | 'reset' | 'none';

export interface LearningRecoverableError {
  stage: LearningErrorStage;
  code: string;
  message: string;
  retryable: boolean;
  fallbackAction: LearningFallbackAction;
  affectedTargets?: string[];
  occurredAt: Date;
}

export type LearningResumeOutcomeType = 'resume' | 'fallback' | 'reset-required';

export interface LearningResumeOutcome {
  outcome: LearningResumeOutcomeType;
  reason: string;
  recoveredContext?: LearningResumeContext;
  missingTargets?: string[];
}

export interface LearningProgressSnapshot {
  subMode: LearningSubMode;
  lifecycleState: LearningLifecycleState;
  percent: number;
  completedUnits: number;
  totalUnits: number;
  statusLabel: string;
  updatedAt: Date;
}

export type GuidanceDepth = 'high' | 'medium' | 'low';
export type PracticeIntensity = 'reduced' | 'balanced' | 'challenging';

export interface AdaptiveLearningProfile {
  guidanceDepth: GuidanceDepth;
  practiceIntensity: PracticeIntensity;
  targetDifficulty: DifficultyLevel;
  reasonCodes: string[];
  guardrails: {
    minDifficulty: DifficultyLevel;
    maxDifficulty: DifficultyLevel;
    steppedAdjustment: boolean;
  };
}

export interface CanonicalLearningContextInput {
  subMode: LearningSubMode;
  learningSession?: LearningSession;
  speedPassSession?: SpeedStudySession;
  activeTutorial?: SpeedLearningTutorial;
  isPreparing?: boolean;
  recoverableError?: LearningRecoverableError | null;
}

export interface AdaptiveLearningInput {
  session: Pick<
    LearningSession,
    | 'currentDifficulty'
    | 'consecutiveCorrect'
    | 'consecutiveIncorrect'
    | 'engagementScore'
    | 'statistics'
    | 'preferredStyle'
  >;
  config: Pick<LearningModeConfig, 'enableAdaptiveDifficulty' | 'difficultyAdjustThreshold'>;
  preferredDifficulty?: DifficultyLevel;
}

export type { LearningResumeContext } from '../core/session';
