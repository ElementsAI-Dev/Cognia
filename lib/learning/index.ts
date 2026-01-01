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
} from './formatters';
