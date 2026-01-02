/**
 * Tests for Learning Mode Library exports
 * 
 * Verifies that all public APIs are properly exported from the index.
 */

import * as LearningLib from './index';

describe('Learning Library Exports', () => {
  describe('prompts exports', () => {
    it('should export SOCRATIC_MENTOR_PROMPT', () => {
      expect(LearningLib.SOCRATIC_MENTOR_PROMPT).toBeDefined();
      expect(typeof LearningLib.SOCRATIC_MENTOR_PROMPT).toBe('string');
    });

    it('should export PHASE_PROMPTS', () => {
      expect(LearningLib.PHASE_PROMPTS).toBeDefined();
      expect(typeof LearningLib.PHASE_PROMPTS).toBe('object');
    });

    it('should export DIFFICULTY_PROMPTS', () => {
      expect(LearningLib.DIFFICULTY_PROMPTS).toBeDefined();
      expect(typeof LearningLib.DIFFICULTY_PROMPTS).toBe('object');
    });

    it('should export LEARNING_STYLE_PROMPTS', () => {
      expect(LearningLib.LEARNING_STYLE_PROMPTS).toBeDefined();
      expect(typeof LearningLib.LEARNING_STYLE_PROMPTS).toBe('object');
    });

    it('should export UNDERSTANDING_PROMPTS', () => {
      expect(LearningLib.UNDERSTANDING_PROMPTS).toBeDefined();
      expect(typeof LearningLib.UNDERSTANDING_PROMPTS).toBe('object');
    });

    it('should export SCENARIO_PROMPTS', () => {
      expect(LearningLib.SCENARIO_PROMPTS).toBeDefined();
      expect(typeof LearningLib.SCENARIO_PROMPTS).toBe('object');
    });

    it('should export ENCOURAGEMENT_MESSAGES', () => {
      expect(LearningLib.ENCOURAGEMENT_MESSAGES).toBeDefined();
      expect(typeof LearningLib.ENCOURAGEMENT_MESSAGES).toBe('object');
    });

    it('should export buildLearningSystemPrompt', () => {
      expect(LearningLib.buildLearningSystemPrompt).toBeDefined();
      expect(typeof LearningLib.buildLearningSystemPrompt).toBe('function');
    });

    it('should export buildAdaptiveLearningPrompt', () => {
      expect(LearningLib.buildAdaptiveLearningPrompt).toBeDefined();
      expect(typeof LearningLib.buildAdaptiveLearningPrompt).toBe('function');
    });

    it('should export generateHintGuidance', () => {
      expect(LearningLib.generateHintGuidance).toBeDefined();
      expect(typeof LearningLib.generateHintGuidance).toBe('function');
    });

    it('should export generateContextualHint', () => {
      expect(LearningLib.generateContextualHint).toBeDefined();
      expect(typeof LearningLib.generateContextualHint).toBe('function');
    });

    it('should export generateCelebrationMessage', () => {
      expect(LearningLib.generateCelebrationMessage).toBeDefined();
      expect(typeof LearningLib.generateCelebrationMessage).toBe('function');
    });

    it('should export getEncouragementMessage', () => {
      expect(LearningLib.getEncouragementMessage).toBeDefined();
      expect(typeof LearningLib.getEncouragementMessage).toBe('function');
    });
  });

  describe('analyzer exports', () => {
    it('should export analyzeLearnerResponse', () => {
      expect(LearningLib.analyzeLearnerResponse).toBeDefined();
      expect(typeof LearningLib.analyzeLearnerResponse).toBe('function');
    });

    it('should export detectPhaseTransition', () => {
      expect(LearningLib.detectPhaseTransition).toBeDefined();
      expect(typeof LearningLib.detectPhaseTransition).toBe('function');
    });

    it('should export extractSubQuestions', () => {
      expect(LearningLib.extractSubQuestions).toBeDefined();
      expect(typeof LearningLib.extractSubQuestions).toBe('function');
    });

    it('should export shouldProvideHint', () => {
      expect(LearningLib.shouldProvideHint).toBeDefined();
      expect(typeof LearningLib.shouldProvideHint).toBe('function');
    });

    it('should export generateProgressSummary', () => {
      expect(LearningLib.generateProgressSummary).toBeDefined();
      expect(typeof LearningLib.generateProgressSummary).toBe('function');
    });
  });

  describe('formatters exports', () => {
    it('should export formatLearningGoals', () => {
      expect(LearningLib.formatLearningGoals).toBeDefined();
      expect(typeof LearningLib.formatLearningGoals).toBe('function');
    });

    it('should export formatSubQuestionsList', () => {
      expect(LearningLib.formatSubQuestionsList).toBeDefined();
      expect(typeof LearningLib.formatSubQuestionsList).toBe('function');
    });

    it('should export formatProgressReport', () => {
      expect(LearningLib.formatProgressReport).toBeDefined();
      expect(typeof LearningLib.formatProgressReport).toBe('function');
    });

    it('should export formatSessionSummary', () => {
      expect(LearningLib.formatSessionSummary).toBeDefined();
      expect(typeof LearningLib.formatSessionSummary).toBe('function');
    });

    it('should export formatStatusLine', () => {
      expect(LearningLib.formatStatusLine).toBeDefined();
      expect(typeof LearningLib.formatStatusLine).toBe('function');
    });
  });

  describe('integration sanity checks', () => {
    it('should allow basic usage of analyzeLearnerResponse', () => {
      const result = LearningLib.analyzeLearnerResponse('test response', []);
      expect(result).toHaveProperty('understanding');
      expect(result).toHaveProperty('confidenceScore');
      expect(result).toHaveProperty('suggestedAction');
    });

    it('should allow basic usage of formatLearningGoals', () => {
      const result = LearningLib.formatLearningGoals([]);
      expect(typeof result).toBe('string');
    });

    it('should allow basic usage of buildLearningSystemPrompt', () => {
      const result = LearningLib.buildLearningSystemPrompt(null);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
