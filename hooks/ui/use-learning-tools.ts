'use client';

/**
 * useLearningTools - Hook for integrating learning tools into chat
 * 
 * Provides the learning tools (flashcards, quizzes, review sessions) 
 * for use in the AI chat system's generative UI.
 */

import { useMemo, useCallback } from 'react';
import { useLearningStore } from '@/stores/learning-store';
import { useSessionStore } from '@/stores/session-store';
import {
  learningTools,
  executeDisplayFlashcard,
  executeDisplayFlashcardDeck,
  executeDisplayQuiz,
  executeDisplayQuizQuestion,
  executeDisplayReviewSession,
  executeDisplayProgressSummary,
  executeDisplayConceptExplanation,
  type DisplayFlashcardInput,
  type DisplayFlashcardDeckInput,
  type DisplayQuizInput,
  type DisplayQuizQuestionInput,
  type DisplayReviewSessionInput,
  type DisplayProgressSummaryInput,
  type DisplayConceptExplanationInput,
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
export function useLearningTools(
  options: UseLearningToolsOptions = {}
): UseLearningToolsReturn {
  const {
    enableFlashcards = true,
    enableQuizzes = true,
    enableReviewSessions = true,
    enableProgressSummary = true,
    enableConceptExplanation = true,
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

    if (enableFlashcards) {
      agentTools.displayFlashcard = {
        name: learningTools.displayFlashcard.name,
        description: learningTools.displayFlashcard.description,
        parameters: learningTools.displayFlashcard.parameters,
        execute: async (args) => {
          const input = args as DisplayFlashcardInput;
          return executeDisplayFlashcard(input);
        },
        requiresApproval: false,
      };

      agentTools.displayFlashcardDeck = {
        name: learningTools.displayFlashcardDeck.name,
        description: learningTools.displayFlashcardDeck.description,
        parameters: learningTools.displayFlashcardDeck.parameters,
        execute: async (args) => {
          const input = args as DisplayFlashcardDeckInput;
          return executeDisplayFlashcardDeck(input);
        },
        requiresApproval: false,
      };
    }

    if (enableQuizzes) {
      agentTools.displayQuiz = {
        name: learningTools.displayQuiz.name,
        description: learningTools.displayQuiz.description,
        parameters: learningTools.displayQuiz.parameters,
        execute: async (args) => {
          const input = args as DisplayQuizInput;
          return executeDisplayQuiz(input);
        },
        requiresApproval: false,
      };

      agentTools.displayQuizQuestion = {
        name: learningTools.displayQuizQuestion.name,
        description: learningTools.displayQuizQuestion.description,
        parameters: learningTools.displayQuizQuestion.parameters,
        execute: async (args) => {
          const input = args as DisplayQuizQuestionInput;
          return executeDisplayQuizQuestion(input);
        },
        requiresApproval: false,
      };
    }

    if (enableReviewSessions) {
      agentTools.displayReviewSession = {
        name: learningTools.displayReviewSession.name,
        description: learningTools.displayReviewSession.description,
        parameters: learningTools.displayReviewSession.parameters,
        execute: async (args) => {
          const input = args as DisplayReviewSessionInput;
          return executeDisplayReviewSession(input);
        },
        requiresApproval: false,
      };
    }

    if (enableProgressSummary) {
      agentTools.displayProgressSummary = {
        name: learningTools.displayProgressSummary.name,
        description: learningTools.displayProgressSummary.description,
        parameters: learningTools.displayProgressSummary.parameters,
        execute: async (args) => {
          const input = args as DisplayProgressSummaryInput;
          return executeDisplayProgressSummary(input);
        },
        requiresApproval: false,
      };
    }

    if (enableConceptExplanation) {
      agentTools.displayConceptExplanation = {
        name: learningTools.displayConceptExplanation.name,
        description: learningTools.displayConceptExplanation.description,
        parameters: learningTools.displayConceptExplanation.parameters,
        execute: async (args) => {
          const input = args as DisplayConceptExplanationInput;
          return executeDisplayConceptExplanation(input);
        },
        requiresApproval: false,
      };
    }

    return agentTools;
  }, [
    enableFlashcards,
    enableQuizzes,
    enableReviewSessions,
    enableProgressSummary,
    enableConceptExplanation,
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
    const accuracy = stats.questionsAnswered > 0
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
