'use client';

/**
 * useLearningTools - Hook for integrating learning tools into chat
 *
 * Provides the learning tools (flashcards, quizzes, review sessions)
 * for use in the AI chat system's generative UI.
 */

import { useMemo, useCallback } from 'react';
import { useLearningStore } from '@/stores/learning';
import { useSessionStore } from '@/stores/chat';
import {
  learningToolsByCanonicalName,
  learningTools,
  toLearningToolAliasName,
  executeDisplayFlashcard,
  executeDisplayFlashcardDeck,
  executeDisplayQuiz,
  executeDisplayQuizQuestion,
  executeDisplayReviewSession,
  executeDisplayProgressSummary,
  executeDisplayConceptExplanation,
  executeDisplayStepGuide,
  executeDisplayConceptMap,
  executeDisplayAnimation,
  type DisplayFlashcardInput,
  type DisplayFlashcardDeckInput,
  type DisplayQuizInput,
  type DisplayQuizQuestionInput,
  type DisplayReviewSessionInput,
  type DisplayProgressSummaryInput,
  type DisplayConceptExplanationInput,
  type DisplayStepGuideInput,
  type DisplayConceptMapInput,
  type DisplayAnimationInput,
  type FlashcardData,
  type QuizQuestionData,
} from '@/lib/ai/tools/learning-tools';
import type { AgentTool } from '@/lib/ai/agent/agent-executor';

export interface UseLearningToolsOptions {
  /** Enable flashcard tools */
  enableFlashcards?: boolean;
  /** Enable quiz tools */
  enableQuizzes?: boolean;
  /** Enable review session tools */
  enableReviewSessions?: boolean;
  /** Enable progress summary tools */
  enableProgressSummary?: boolean;
  /** Enable concept explanation tools */
  enableConceptExplanation?: boolean;
  /** Enable visualization tools (step guide, concept map, animation) */
  enableVisualization?: boolean;
}

export interface UseLearningToolsReturn {
  /** Learning tools ready for use with agent executor */
  tools: Record<string, AgentTool>;

  /** Generate flashcards from learning session review items */
  generateFlashcardsFromSession: () => FlashcardData[];

  /** Generate quiz questions from learning session concepts */
  generateQuizFromSession: () => QuizQuestionData[];

  /** Get current learning progress stats */
  getProgressStats: () => {
    totalConcepts: number;
    masteredConcepts: number;
    learningConcepts: number;
    accuracy: number;
    streakDays?: number;
  };

  /** Check if learning mode is active */
  isLearningActive: boolean;
}

/**
 * Hook to provide learning tools for AI chat integration
 */
export function useLearningTools(options: UseLearningToolsOptions = {}): UseLearningToolsReturn {
  const {
    enableFlashcards = true,
    enableQuizzes = true,
    enableReviewSessions = true,
    enableProgressSummary = true,
    enableConceptExplanation = true,
    enableVisualization = true,
  } = options;

  const learningStore = useLearningStore();
  const sessionStore = useSessionStore();

  // Get current learning session
  const currentSession = useMemo(() => {
    const activeSessionId = sessionStore.activeSessionId;
    if (!activeSessionId) return undefined;
    return learningStore.getLearningSessionByChat(activeSessionId);
  }, [sessionStore.activeSessionId, learningStore]);

  const isLearningActive = !!currentSession && !currentSession.completedAt;

  // Build agent tools from learning tools
  const tools = useMemo(() => {
    const agentTools: Record<string, AgentTool> = {};
    const addTool = (
      canonicalName: keyof typeof learningToolsByCanonicalName,
      execute: AgentTool['execute']
    ) => {
      const aliasName = toLearningToolAliasName(canonicalName);
      const aliasDefinition =
        aliasName && aliasName in learningTools
          ? learningTools[aliasName as keyof typeof learningTools]
          : undefined;
      const definition =
        learningToolsByCanonicalName[canonicalName] || aliasDefinition;
      if (!definition) {
        return;
      }
      const normalizedTool: AgentTool = {
        name: definition.name,
        description: definition.description,
        parameters: definition.parameters,
        execute,
        requiresApproval: false,
      };

      agentTools[canonicalName] = normalizedTool;
      if (aliasName) {
        agentTools[aliasName] = normalizedTool;
      }
    };

    if (enableFlashcards) {
      addTool('display_flashcard', async (args) => {
          const input = args as DisplayFlashcardInput;
          return executeDisplayFlashcard(input);
      });

      addTool('display_flashcard_deck', async (args) => {
          const input = args as DisplayFlashcardDeckInput;
          return executeDisplayFlashcardDeck(input);
      });
    }

    if (enableQuizzes) {
      addTool('display_quiz', async (args) => {
          const input = args as DisplayQuizInput;
          return executeDisplayQuiz(input);
      });

      addTool('display_quiz_question', async (args) => {
          const input = args as DisplayQuizQuestionInput;
          return executeDisplayQuizQuestion(input);
      });
    }

    if (enableReviewSessions) {
      addTool('display_review_session', async (args) => {
          const input = args as DisplayReviewSessionInput;
          return executeDisplayReviewSession(input);
      });
    }

    if (enableProgressSummary) {
      addTool('display_progress_summary', async (args) => {
          const input = args as DisplayProgressSummaryInput;
          return executeDisplayProgressSummary(input);
      });
    }

    if (enableConceptExplanation) {
      addTool('display_concept_explanation', async (args) => {
          const input = args as DisplayConceptExplanationInput;
          return executeDisplayConceptExplanation(input);
      });
    }

    if (enableVisualization) {
      addTool('display_step_guide', async (args) => {
          const input = args as DisplayStepGuideInput;
          return executeDisplayStepGuide(input);
      });

      addTool('display_concept_map', async (args) => {
          const input = args as DisplayConceptMapInput;
          return executeDisplayConceptMap(input);
      });

      addTool('display_animation', async (args) => {
          const input = args as DisplayAnimationInput;
          return executeDisplayAnimation(input);
      });
    }

    return agentTools;
  }, [
    enableFlashcards,
    enableQuizzes,
    enableReviewSessions,
    enableProgressSummary,
    enableConceptExplanation,
    enableVisualization,
  ]);

  // Generate flashcards from current session's review items
  const generateFlashcardsFromSession = useCallback((): FlashcardData[] => {
    if (!currentSession) return [];

    return currentSession.reviewItems.map((item) => ({
      id: item.id,
      front: item.question,
      back: item.answer,
      conceptId: item.conceptId,
      difficulty: item.easeFactor < 2.0 ? 'hard' : item.easeFactor > 2.5 ? 'easy' : 'medium',
    }));
  }, [currentSession]);

  // Generate quiz questions from current session's concepts
  const generateQuizFromSession = useCallback((): QuizQuestionData[] => {
    if (!currentSession) return [];

    return currentSession.concepts.map((concept) => ({
      id: concept.id,
      question: `What is ${concept.name}?`,
      type: 'short_answer' as const,
      correctAnswer: concept.description || concept.name,
      conceptId: concept.id,
      points: concept.masteryStatus === 'mastered' ? 1 : 2,
    }));
  }, [currentSession]);

  // Get progress stats for current session
  const getProgressStats = useCallback(() => {
    if (!currentSession) {
      return {
        totalConcepts: 0,
        masteredConcepts: 0,
        learningConcepts: 0,
        accuracy: 0,
      };
    }

    const concepts = currentSession.concepts;
    const totalConcepts = concepts.length;
    const masteredConcepts = concepts.filter((c) => c.masteryStatus === 'mastered').length;
    const learningConcepts = concepts.filter((c) => c.masteryStatus === 'learning').length;

    const stats = currentSession.statistics;
    const accuracy =
      stats.questionsAnswered > 0
        ? Math.round((stats.correctAnswers / stats.questionsAnswered) * 100)
        : 0;

    return {
      totalConcepts,
      masteredConcepts,
      learningConcepts,
      accuracy,
      streakDays: stats.streakDays,
    };
  }, [currentSession]);

  return {
    tools,
    generateFlashcardsFromSession,
    generateQuizFromSession,
    getProgressStats,
    isLearningActive,
  };
}

export default useLearningTools;
