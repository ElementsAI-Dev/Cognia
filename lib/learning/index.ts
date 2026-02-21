/**
 * Learning Mode Library
 * 
 * Core utilities for the Socratic Method-based learning mode.
 */

export {
  SOCRATIC_MENTOR_PROMPT,
  PHASE_PROMPTS,
  DIFFICULTY_PROMPTS,
  LEARNING_STYLE_PROMPTS,
  UNDERSTANDING_PROMPTS,
  SCENARIO_PROMPTS,
  buildLearningSystemPrompt,
  buildAdaptiveLearningPrompt,
  generateHintGuidance,
  generateContextualHint,
  generateCelebrationMessage,
  ENCOURAGEMENT_MESSAGES,
  getEncouragementMessage,
} from './prompts';

export {
  analyzeLearnerResponse,
  analyzeLearnerResponseWithAI,
  detectMisconceptionsWithAI,
  detectPhaseTransition,
  extractSubQuestions,
  shouldProvideHint,
  generateProgressSummary,
} from './analyzer';

export {
  formatLearningGoals,
  formatSubQuestionsList,
  formatProgressReport,
  formatSessionSummary,
  formatStatusLine,
} from './formatters';

// Learning type detection (short-term vs long-term)
export {
  detectLearningType,
  isLongTermSubject,
  getSuggestedMilestones,
  formatLearningDuration,
  formatLearningDurationEn,
} from './learning-type-detector';

// Learning path management
export {
  createLearningPath,
  createDefaultSchedule,
  calculatePathProgress,
  updateMilestoneProgress,
  completeMilestone,
  getCurrentMilestone,
  getNextMilestones,
  getCompletedMilestones,
  addResourceToMilestone,
  markResourceCompleted,
  recordStudySession,
  getEstimatedTimeRemaining,
  getDurationInDays,
  calculateTargetDate,
  formatTimeSpent,
  formatProgress,
  getProgressColorClass,
  getCategoryDisplayName,
  getCategoryDisplayNameEn,
} from './learning-path';

// SpeedPass learning utilities
export * from './speedpass';

// Learning mode feature flags
export {
  isLearningModeV2Enabled,
  isLearningInteropV2Enabled,
  learningFeatureFlagKeys,
} from './feature-flags';
