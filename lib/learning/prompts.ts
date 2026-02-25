/**
 * Learning Mode Prompts
 * 
 * Socratic Method system prompts for guided learning.
 * These prompts guide the AI to act as a mentor who never gives direct answers,
 * but instead helps the learner discover knowledge through questioning.
 */

import type { LearningSession, LearningModeConfig, PromptTemplate, DifficultyLevel, UnderstandingLevel } from '@/types/learning';
import {
  resolveBasePrompt,
  resolvePhasePrompt,
  resolveDifficultyPrompt,
  resolveStylePrompt,
  resolveScenarioPrompt,
  resolveUnderstandingPrompt,
  buildConfigModifiers,
} from './prompt-templates';
import {
  SOCRATIC_MENTOR_PROMPT,
  PHASE_PROMPTS,
  SCENARIO_PROMPTS,
  ENCOURAGEMENT_MESSAGES,
  UNDERSTANDING_PROMPTS,
  DIFFICULTY_PROMPTS,
  LEARNING_STYLE_PROMPTS,
} from './prompt-constants';

// Re-export all constants to preserve the public API
export {
  SOCRATIC_MENTOR_PROMPT,
  PHASE_PROMPTS,
  DIFFICULTY_PROMPTS,
  LEARNING_STYLE_PROMPTS,
  UNDERSTANDING_PROMPTS,
  SCENARIO_PROMPTS,
  ENCOURAGEMENT_MESSAGES,
} from './prompt-constants';

/**
 * Build the complete system prompt for learning mode
 */
export function buildLearningSystemPrompt(
  session?: LearningSession | null,
  customContext?: string,
  config?: LearningModeConfig,
  customTemplates?: Record<string, PromptTemplate>
): string {
  let prompt = config ? resolveBasePrompt(config, customTemplates) : SOCRATIC_MENTOR_PROMPT;

  // Add phase-specific guidance if session exists
  if (session) {
    const phasePrompt = config
      ? resolvePhasePrompt(session.currentPhase, config, customTemplates)
      : PHASE_PROMPTS[session.currentPhase];
    prompt += '\n\n' + phasePrompt;

    // Add session context
    prompt += `\n\n## Current Learning Context
- **Topic**: ${session.topic}
- **Learning Goals**: ${session.learningGoals.map(g => g.description).join(', ') || 'Not yet defined'}
- **Background Knowledge**: ${session.backgroundKnowledge || 'Not specified'}
- **Progress**: ${session.progress}%`;

    // Add sub-questions context if in questioning/feedback phase
    if (
      session.currentPhase === 'questioning' ||
      session.currentPhase === 'feedback'
    ) {
      const currentSQ = session.subQuestions.find(
        (sq) => sq.id === session.currentSubQuestionId
      );
      if (currentSQ) {
        prompt += `\n- **Current Sub-Question**: ${currentSQ.question}`;
        prompt += `\n- **Attempts on this question**: ${currentSQ.userAttempts}`;
        if (currentSQ.hints.length > 0) {
          prompt += `\n- **Hints already provided**: ${currentSQ.hints.length}`;
        }
      }

      const resolvedCount = session.subQuestions.filter(
        (sq) => sq.status === 'resolved'
      ).length;
      prompt += `\n- **Sub-questions resolved**: ${resolvedCount}/${session.subQuestions.length}`;
    }
  }

  // Add config-based modifiers (personality, subject, language, etc.)
  if (config) {
    prompt += buildConfigModifiers(config);
  }

  // Add custom context if provided
  if (customContext) {
    prompt += `\n\n## Additional Context\n${customContext}`;
  }

  return prompt;
}

/**
 * Generate a hint based on the current learning state
 */
export function generateHintGuidance(
  attemptCount: number,
  _maxHints: number
): string {
  if (attemptCount < 2) {
    return 'The learner is still early in their attempts. Ask a simpler prerequisite question to guide their thinking.';
  } else if (attemptCount < 4) {
    return 'The learner has made several attempts. You may provide a small hint - reveal one aspect or corner of the problem.';
  } else {
    return `The learner has struggled significantly (${attemptCount} attempts). Provide a more substantial hint while still requiring them to make the final connection.`;
  }
}

/**
 * Get a random encouragement message
 */
export function getEncouragementMessage(
  type: keyof typeof ENCOURAGEMENT_MESSAGES,
  config?: LearningModeConfig
): string {
  const customMessages = config?.customEncouragementMessages?.[type];
  const messages = (customMessages && customMessages.length > 0) ? customMessages : ENCOURAGEMENT_MESSAGES[type];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Build enhanced system prompt with adaptive features
 */
export function buildAdaptiveLearningPrompt(
  session: LearningSession,
  options?: {
    scenario?: keyof typeof SCENARIO_PROMPTS;
    understandingLevel?: UnderstandingLevel;
    customContext?: string;
    config?: LearningModeConfig;
    customTemplates?: Record<string, PromptTemplate>;
  }
): string {
  const cfg = options?.config;
  const tpl = options?.customTemplates;

  let prompt = cfg ? resolveBasePrompt(cfg, tpl) : SOCRATIC_MENTOR_PROMPT;

  // Add phase-specific guidance
  const phasePrompt = cfg
    ? resolvePhasePrompt(session.currentPhase, cfg, tpl)
    : PHASE_PROMPTS[session.currentPhase];
  prompt += '\n\n' + phasePrompt;

  // Add difficulty-level guidance
  if (session.currentDifficulty) {
    const diffPrompt = cfg
      ? resolveDifficultyPrompt(session.currentDifficulty, cfg, tpl)
      : DIFFICULTY_PROMPTS[session.currentDifficulty];
    prompt += '\n\n' + diffPrompt;
  }

  // Add learning style guidance if specified
  if (session.preferredStyle) {
    const stylePrompt = cfg
      ? resolveStylePrompt(session.preferredStyle, cfg, tpl)
      : LEARNING_STYLE_PROMPTS[session.preferredStyle];
    prompt += '\n\n' + stylePrompt;
  }

  // Add scenario-specific guidance if provided
  if (options?.scenario) {
    const scenarioPrompt = cfg
      ? resolveScenarioPrompt(options.scenario, cfg, tpl)
      : SCENARIO_PROMPTS[options.scenario];
    prompt += '\n\n' + scenarioPrompt;
  }

  // Add understanding-based guidance if provided
  if (options?.understandingLevel) {
    const understandingPrompt = cfg
      ? resolveUnderstandingPrompt(options.understandingLevel, cfg, tpl)
      : UNDERSTANDING_PROMPTS[options.understandingLevel];
    prompt += `\n\n## Current Understanding Assessment\n${understandingPrompt}`;
  }

  // Add engagement guidance based on session metrics
  if (session.engagementScore < 40) {
    prompt += `\n\n## Engagement Alert
The learner's engagement appears low. Try to:
- Make questions more interactive and relevant
- Use surprising facts or counterintuitive examples
- Connect to their interests or real-world applications
- Vary your approach to rekindle interest`;
  } else if (session.engagementScore > 80) {
    prompt += `\n\n## High Engagement
The learner is highly engaged! You can:
- Introduce more challenging questions
- Explore tangential but interesting topics
- Encourage deeper exploration of insights`;
  }

  // Add adaptive difficulty guidance
  if (session.consecutiveCorrect >= 3) {
    prompt += `\n\n## Performance Note
The learner has answered ${session.consecutiveCorrect} questions correctly in a row. Consider increasing the challenge level.`;
  } else if (session.consecutiveIncorrect >= 2) {
    prompt += `\n\n## Performance Note
The learner has struggled with ${session.consecutiveIncorrect} consecutive questions. Consider providing more scaffolding or simpler prerequisite questions.`;
  }

  // Add session context
  prompt += `\n\n## Current Learning Context
- **Topic**: ${session.topic}
- **Learning Goals**: ${session.learningGoals.map(g => g.description).join(', ') || 'Not yet defined'}
- **Background Knowledge**: ${session.backgroundKnowledge || 'Not specified'}
- **Progress**: ${session.progress}%
- **Current Difficulty**: ${session.currentDifficulty}
- **Engagement Score**: ${session.engagementScore}/100`;

  // Add sub-questions context for relevant phases
  if (session.currentPhase === 'questioning' || session.currentPhase === 'feedback') {
    const currentSQ = session.subQuestions.find(
      (sq) => sq.id === session.currentSubQuestionId
    );
    if (currentSQ) {
      prompt += `\n- **Current Sub-Question**: ${currentSQ.question}`;
      prompt += `\n- **Attempts on this question**: ${currentSQ.userAttempts}`;
      if (currentSQ.hints.length > 0) {
        prompt += `\n- **Hints already provided**: ${currentSQ.hints.length}`;
      }
      if (currentSQ.difficulty) {
        prompt += `\n- **Question Difficulty**: ${currentSQ.difficulty}`;
      }
    }

    const resolvedCount = session.subQuestions.filter(
      (sq) => sq.status === 'resolved'
    ).length;
    prompt += `\n- **Sub-questions resolved**: ${resolvedCount}/${session.subQuestions.length}`;
  }

  // Add concepts being learned
  if (session.concepts.length > 0) {
    const masteredCount = session.concepts.filter(c => c.masteryStatus === 'mastered').length;
    prompt += `\n- **Concepts tracked**: ${session.concepts.length} (${masteredCount} mastered)`;
  }

  // Add config-based modifiers (personality, subject, language, etc.)
  if (cfg) {
    prompt += buildConfigModifiers(cfg);
  }

  // Add custom context if provided
  if (options?.customContext) {
    prompt += `\n\n## Additional Context\n${options.customContext}`;
  }

  return prompt;
}

/**
 * Generate contextual hints based on learning state
 */
export function generateContextualHint(
  session: LearningSession,
  attemptCount: number
): string {
  const difficulty = session.currentDifficulty;
  const baseHint = generateHintGuidance(attemptCount, 5);

  const difficultyModifiers: Record<DifficultyLevel, string> = {
    beginner: 'Use very simple language and concrete examples in your hint.',
    intermediate: 'Provide a hint that bridges to their existing knowledge.',
    advanced: 'Give a subtle hint that points to the right direction without revealing too much.',
    expert: 'Offer a sophisticated hint that respects their expertise.',
  };

  return `${baseHint}\n${difficultyModifiers[difficulty]}`;
}

/**
 * Generate celebration message based on achievement
 */
export function generateCelebrationMessage(
  achievementType: 'concept_mastered' | 'question_solved' | 'phase_complete' | 'session_complete',
  session: LearningSession,
  config?: LearningModeConfig
): string {
  const customMessages = config?.customCelebrationMessages?.[achievementType];
  if (customMessages && customMessages.length > 0) {
    return customMessages[Math.floor(Math.random() * customMessages.length)];
  }

  const messages: Record<typeof achievementType, string[]> = {
    concept_mastered: [
      "🎯 Excellent! You've mastered a new concept through your own reasoning!",
      "🌟 Outstanding! Your understanding has reached mastery level!",
      "💡 Brilliant! You've internalized this concept completely!",
    ],
    question_solved: [
      "✨ Well done! You worked through that question beautifully!",
      "🎉 Great thinking! Your reasoning led you to the answer!",
      "👏 Impressive! You discovered the solution yourself!",
    ],
    phase_complete: [
      `🚀 You've completed the ${session.currentPhase} phase! Ready for the next challenge!`,
      `📈 Excellent progress! Moving on from ${session.currentPhase}!`,
      `🌱 You're growing! ${session.currentPhase} phase mastered!`,
    ],
    session_complete: [
      "🏆 Congratulations! You've completed this learning session!",
      "🎓 Amazing work! You've learned so much through your own thinking!",
      "⭐ Outstanding! This session showcases your intellectual growth!",
    ],
  };

  const typeMessages = messages[achievementType];
  return typeMessages[Math.floor(Math.random() * typeMessages.length)];
}
