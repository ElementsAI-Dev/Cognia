/**
 * Learning Response Analyzer
 * 
 * Utilities for analyzing learner responses and determining
 * appropriate next steps in the Socratic learning process.
 */

import type { LearningPhase, LearningSession, LearningSubQuestion } from '@/types/learning';

/**
 * Response analysis result
 */
export interface ResponseAnalysis {
  understanding: 'none' | 'partial' | 'good' | 'excellent';
  confidenceScore: number; // 0-100
  suggestedAction: 'continue' | 'hint' | 'rephrase' | 'advance' | 'celebrate';
  detectedConcepts: string[];
  potentialMisconceptions: string[];
}

/**
 * Analyze a learner's response to determine their understanding level
 * This is a heuristic-based analysis that can be enhanced with AI
 */
export function analyzeLearnerResponse(
  response: string,
  expectedConcepts: string[] = [],
  _session?: LearningSession
): ResponseAnalysis {
  const lowerResponse = response.toLowerCase();
  const wordCount = response.split(/\s+/).length;

  // Basic heuristics for understanding level
  const uncertaintyIndicators = [
    "i don't know",
    "not sure",
    "maybe",
    "i think",
    "confused",
    "don't understand",
    "help",
    "stuck",
  ];

  const confidenceIndicators = [
    "because",
    "therefore",
    "this means",
    "so",
    "which leads to",
    "in other words",
    "specifically",
  ];

  const hasUncertainty = uncertaintyIndicators.some((ind) =>
    lowerResponse.includes(ind)
  );
  const hasConfidence = confidenceIndicators.some((ind) =>
    lowerResponse.includes(ind)
  );

  // Check for expected concepts
  const detectedConcepts = expectedConcepts.filter((concept) =>
    lowerResponse.includes(concept.toLowerCase())
  );
  const conceptCoverage = expectedConcepts.length > 0
    ? detectedConcepts.length / expectedConcepts.length
    : 0.5;

  // Calculate understanding level
  let understanding: ResponseAnalysis['understanding'] = 'partial';
  let confidenceScore = 50;

  if (wordCount < 10 && hasUncertainty) {
    understanding = 'none';
    confidenceScore = 20;
  } else if (hasConfidence && conceptCoverage > 0.7) {
    understanding = 'excellent';
    confidenceScore = 90;
  } else if (hasConfidence || conceptCoverage > 0.5) {
    understanding = 'good';
    confidenceScore = 70;
  } else if (hasUncertainty) {
    understanding = 'partial';
    confidenceScore = 40;
  }

  // Determine suggested action
  let suggestedAction: ResponseAnalysis['suggestedAction'] = 'continue';
  if (understanding === 'none') {
    suggestedAction = 'hint';
  } else if (understanding === 'partial' && hasUncertainty) {
    suggestedAction = 'rephrase';
  } else if (understanding === 'excellent') {
    suggestedAction = 'advance';
  } else if (understanding === 'good' && conceptCoverage > 0.8) {
    suggestedAction = 'celebrate';
  }

  return {
    understanding,
    confidenceScore,
    suggestedAction,
    detectedConcepts,
    potentialMisconceptions: [], // Would need AI to detect these
  };
}

/**
 * Detect if the learning session should transition to the next phase
 */
export function detectPhaseTransition(session: LearningSession): {
  shouldTransition: boolean;
  nextPhase?: LearningPhase;
  reason?: string;
} {
  const { currentPhase, subQuestions, learningGoals } = session;

  switch (currentPhase) {
    case 'clarification':
      // Transition when topic and goals are defined
      if (session.topic && learningGoals.length > 0) {
        return {
          shouldTransition: true,
          nextPhase: 'deconstruction',
          reason: 'Topic and learning goals have been established',
        };
      }
      break;

    case 'deconstruction':
      // Transition when sub-questions are defined
      if (subQuestions.length >= 2) {
        return {
          shouldTransition: true,
          nextPhase: 'questioning',
          reason: 'Sub-questions have been identified',
        };
      }
      break;

    case 'questioning':
      // Transition when most sub-questions are resolved
      const resolvedCount = subQuestions.filter(
        (sq) => sq.status === 'resolved'
      ).length;
      if (subQuestions.length > 0 && resolvedCount >= subQuestions.length * 0.8) {
        return {
          shouldTransition: true,
          nextPhase: 'feedback',
          reason: 'Most sub-questions have been explored',
        };
      }
      break;

    case 'feedback':
      // Transition when goals are mostly achieved
      const achievedCount = learningGoals.filter((g) => g.achieved).length;
      if (learningGoals.length > 0 && achievedCount >= learningGoals.length * 0.7) {
        return {
          shouldTransition: true,
          nextPhase: 'summary',
          reason: 'Learning goals have been substantially achieved',
        };
      }
      break;

    case 'summary':
      // No automatic transition from summary
      break;
  }

  return { shouldTransition: false };
}

/**
 * Extract potential sub-questions from AI response
 * This is a simple heuristic - would be enhanced with AI parsing
 */
export function extractSubQuestions(aiResponse: string): string[] {
  const questions: string[] = [];
  
  // Look for numbered lists with questions
  const numberedPattern = /\d+[\.\)]\s*([^?\n]+\?)/g;
  let match;
  while ((match = numberedPattern.exec(aiResponse)) !== null) {
    questions.push(match[1].trim());
  }

  // Look for bullet points with questions
  const bulletPattern = /[-•]\s*([^?\n]+\?)/g;
  while ((match = bulletPattern.exec(aiResponse)) !== null) {
    questions.push(match[1].trim());
  }

  // Look for standalone questions (sentences ending with ?)
  if (questions.length === 0) {
    const standalonePattern = /([A-Z][^.!?\n]*\?)/g;
    while ((match = standalonePattern.exec(aiResponse)) !== null) {
      const question = match[1].trim();
      // Filter out very short questions that might be rhetorical
      if (question.length > 20) {
        questions.push(question);
      }
    }
  }

  // Remove duplicates and limit to 5
  return [...new Set(questions)].slice(0, 5);
}

/**
 * Determine if a hint should be provided based on attempts
 */
export function shouldProvideHint(
  subQuestion: LearningSubQuestion,
  config: { hintDelayMessages: number; maxHintsPerQuestion: number }
): { shouldHint: boolean; hintLevel: 'subtle' | 'moderate' | 'strong' } {
  const { userAttempts, hints } = subQuestion;
  const { hintDelayMessages, maxHintsPerQuestion } = config;

  // Don't provide more hints than allowed
  if (hints.length >= maxHintsPerQuestion) {
    return { shouldHint: false, hintLevel: 'subtle' };
  }

  // Check if enough attempts have been made
  if (userAttempts < hintDelayMessages) {
    return { shouldHint: false, hintLevel: 'subtle' };
  }

  // Determine hint level based on attempts
  let hintLevel: 'subtle' | 'moderate' | 'strong' = 'subtle';
  if (userAttempts >= hintDelayMessages + 2) {
    hintLevel = 'moderate';
  }
  if (userAttempts >= hintDelayMessages + 4) {
    hintLevel = 'strong';
  }

  return { shouldHint: true, hintLevel };
}

/**
 * Generate a progress summary for the learning session
 */
export function generateProgressSummary(session: LearningSession): string {
  const { currentPhase, subQuestions, learningGoals, progress } = session;

  const resolvedSQ = subQuestions.filter((sq) => sq.status === 'resolved').length;
  const achievedGoals = learningGoals.filter((g) => g.achieved).length;

  const phaseNames: Record<LearningPhase, string> = {
    clarification: 'Understanding the Problem',
    deconstruction: 'Breaking Down the Topic',
    questioning: 'Exploring Through Questions',
    feedback: 'Refining Understanding',
    summary: 'Consolidating Learning',
  };

  let summary = `## Learning Progress: ${progress}%\n\n`;
  summary += `**Current Phase**: ${phaseNames[currentPhase]}\n\n`;

  if (subQuestions.length > 0) {
    summary += `**Sub-questions**: ${resolvedSQ}/${subQuestions.length} explored\n`;
  }

  if (learningGoals.length > 0) {
    summary += `**Goals**: ${achievedGoals}/${learningGoals.length} achieved\n`;
  }

  return summary;
}
