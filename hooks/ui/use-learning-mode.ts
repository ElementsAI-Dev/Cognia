'use client';

/**
 * useLearningMode - Hook for managing learning mode state and interactions
 * 
 * Provides easy access to learning mode functionality for React components.
 */

import { useCallback, useMemo } from 'react';
import { useLearningStore } from '@/stores/learning';
import { useSessionStore } from '@/stores/chat';
import {
  buildLearningSystemPrompt,
  analyzeLearnerResponse,
  detectPhaseTransition,
  extractSubQuestions,
  shouldProvideHint,
  generateProgressSummary,
  formatProgressReport,
  formatSessionSummary,
} from '@/lib/learning';
import type {
  LearningSession,
  LearningPhase,
  LearningSubQuestion,
  LearningGoal,
  StartLearningInput,
  LearningModeConfig,
} from '@/types/learning';

export interface UseLearningModeReturn {
  // State
  learningSession: LearningSession | undefined;
  isLearningActive: boolean;
  currentPhase: LearningPhase | undefined;
  progress: number;
  subQuestions: LearningSubQuestion[];
  learningGoals: LearningGoal[];
  config: LearningModeConfig;

  // Session management
  startLearning: (input: StartLearningInput) => LearningSession;
  endLearning: (summary?: string, takeaways?: string[]) => void;
  resetLearning: () => void;

  // Phase management
  advancePhase: () => void;
  setPhase: (phase: LearningPhase) => void;

  // Sub-questions
  addSubQuestion: (question: string) => LearningSubQuestion;
  resolveSubQuestion: (subQuestionId: string, insights?: string[]) => void;
  setCurrentSubQuestion: (subQuestionId: string) => void;
  recordAttempt: (subQuestionId: string) => void;
  addHint: (subQuestionId: string, hint: string) => void;

  // Goals
  addGoal: (description: string) => LearningGoal;
  achieveGoal: (goalId: string) => void;

  // Topic and context
  updateTopic: (topic: string) => void;
  updateBackground: (background: string) => void;

  // System prompt
  getSystemPrompt: (customContext?: string) => string;

  // Analysis
  analyzeResponse: (response: string, expectedConcepts?: string[]) => ReturnType<typeof analyzeLearnerResponse>;
  checkPhaseTransition: () => ReturnType<typeof detectPhaseTransition>;
  extractQuestionsFromResponse: (response: string) => string[];
  checkShouldHint: (subQuestionId: string) => { shouldHint: boolean; hintLevel: 'subtle' | 'moderate' | 'strong' };

  // Formatting
  getProgressReport: () => string;
  getSessionSummary: () => string;
  getProgressSummary: () => string;

  // Configuration
  updateConfig: (config: Partial<LearningModeConfig>) => void;
}

export function useLearningMode(): UseLearningModeReturn {
  const learningStore = useLearningStore();
  const sessionStore = useSessionStore();

  // Get current learning session based on active chat session
  const learningSession = useMemo(() => {
    const activeSessionId = sessionStore.activeSessionId;
    if (!activeSessionId) return undefined;
    return learningStore.getLearningSessionByChat(activeSessionId);
  }, [sessionStore.activeSessionId, learningStore]);

  // Derived state
  const isLearningActive = !!learningSession && !learningSession.completedAt;
  const currentPhase = learningSession?.currentPhase;
  const progress = learningSession?.progress ?? 0;
  const subQuestions = useMemo(
    () => learningSession?.subQuestions ?? [],
    [learningSession?.subQuestions]
  );
  const learningGoals = useMemo(
    () => learningSession?.learningGoals ?? [],
    [learningSession?.learningGoals]
  );

  // Session management
  const startLearning = useCallback(
    (input: StartLearningInput) => {
      const activeSessionId = sessionStore.activeSessionId;
      if (!activeSessionId) {
        throw new Error('No active chat session');
      }
      return learningStore.startLearningSession(activeSessionId, input);
    },
    [sessionStore.activeSessionId, learningStore]
  );

  const endLearning = useCallback(
    (summary?: string, takeaways?: string[]) => {
      if (learningSession) {
        learningStore.endLearningSession(learningSession.id, summary, takeaways);
      }
    },
    [learningSession, learningStore]
  );

  const resetLearning = useCallback(() => {
    if (learningSession) {
      learningStore.deleteLearningSession(learningSession.id);
    }
  }, [learningSession, learningStore]);

  // Phase management
  const advancePhase = useCallback(() => {
    if (learningSession) {
      learningStore.advancePhase(learningSession.id);
    }
  }, [learningSession, learningStore]);

  const setPhase = useCallback(
    (phase: LearningPhase) => {
      if (learningSession) {
        learningStore.setPhase(learningSession.id, phase);
      }
    },
    [learningSession, learningStore]
  );

  // Sub-questions management
  const addSubQuestion = useCallback(
    (question: string) => {
      if (!learningSession) {
        throw new Error('No active learning session');
      }
      return learningStore.addSubQuestion(learningSession.id, question);
    },
    [learningSession, learningStore]
  );

  const resolveSubQuestion = useCallback(
    (subQuestionId: string, insights?: string[]) => {
      if (learningSession) {
        learningStore.markSubQuestionResolved(learningSession.id, subQuestionId, insights);
      }
    },
    [learningSession, learningStore]
  );

  const setCurrentSubQuestion = useCallback(
    (subQuestionId: string) => {
      if (learningSession) {
        learningStore.setCurrentSubQuestion(learningSession.id, subQuestionId);
      }
    },
    [learningSession, learningStore]
  );

  const recordAttempt = useCallback(
    (subQuestionId: string) => {
      if (learningSession) {
        learningStore.incrementAttempts(learningSession.id, subQuestionId);
      }
    },
    [learningSession, learningStore]
  );

  const addHint = useCallback(
    (subQuestionId: string, hint: string) => {
      if (learningSession) {
        learningStore.addHintToSubQuestion(learningSession.id, subQuestionId, hint);
      }
    },
    [learningSession, learningStore]
  );

  // Goals management
  const addGoal = useCallback(
    (description: string) => {
      if (!learningSession) {
        throw new Error('No active learning session');
      }
      return learningStore.addLearningGoal(learningSession.id, description);
    },
    [learningSession, learningStore]
  );

  const achieveGoal = useCallback(
    (goalId: string) => {
      if (learningSession) {
        learningStore.markGoalAchieved(learningSession.id, goalId);
      }
    },
    [learningSession, learningStore]
  );

  // Topic and context
  const updateTopic = useCallback(
    (topic: string) => {
      if (learningSession) {
        learningStore.updateTopic(learningSession.id, topic);
      }
    },
    [learningSession, learningStore]
  );

  const updateBackground = useCallback(
    (background: string) => {
      if (learningSession) {
        learningStore.updateBackgroundKnowledge(learningSession.id, background);
      }
    },
    [learningSession, learningStore]
  );

  // System prompt
  const getSystemPrompt = useCallback(
    (customContext?: string) => {
      return buildLearningSystemPrompt(learningSession, customContext);
    },
    [learningSession]
  );

  // Analysis functions
  const analyzeResponse = useCallback(
    (response: string, expectedConcepts?: string[]) => {
      return analyzeLearnerResponse(response, expectedConcepts, learningSession);
    },
    [learningSession]
  );

  const checkPhaseTransition = useCallback(() => {
    if (!learningSession) {
      return { shouldTransition: false };
    }
    return detectPhaseTransition(learningSession);
  }, [learningSession]);

  const extractQuestionsFromResponse = useCallback((response: string) => {
    return extractSubQuestions(response);
  }, []);

  const checkShouldHint = useCallback(
    (subQuestionId: string) => {
      const subQuestion = subQuestions.find((sq) => sq.id === subQuestionId);
      if (!subQuestion) {
        return { shouldHint: false, hintLevel: 'subtle' as const };
      }
      return shouldProvideHint(subQuestion, learningStore.config);
    },
    [subQuestions, learningStore.config]
  );

  // Formatting functions
  const getProgressReport = useCallback(() => {
    if (!learningSession) return '';
    return formatProgressReport(learningSession);
  }, [learningSession]);

  const getSessionSummary = useCallback(() => {
    if (!learningSession) return '';
    return formatSessionSummary(learningSession);
  }, [learningSession]);

  const getProgressSummary = useCallback(() => {
    if (!learningSession) return '';
    return generateProgressSummary(learningSession);
  }, [learningSession]);

  // Configuration
  const updateConfig = useCallback(
    (config: Partial<LearningModeConfig>) => {
      learningStore.updateConfig(config);
    },
    [learningStore]
  );

  return {
    // State
    learningSession,
    isLearningActive,
    currentPhase,
    progress,
    subQuestions,
    learningGoals,
    config: learningStore.config,

    // Session management
    startLearning,
    endLearning,
    resetLearning,

    // Phase management
    advancePhase,
    setPhase,

    // Sub-questions
    addSubQuestion,
    resolveSubQuestion,
    setCurrentSubQuestion,
    recordAttempt,
    addHint,

    // Goals
    addGoal,
    achieveGoal,

    // Topic and context
    updateTopic,
    updateBackground,

    // System prompt
    getSystemPrompt,

    // Analysis
    analyzeResponse,
    checkPhaseTransition,
    extractQuestionsFromResponse,
    checkShouldHint,

    // Formatting
    getProgressReport,
    getSessionSummary,
    getProgressSummary,

    // Configuration
    updateConfig,
  };
}

/**
 * Hook to get just the learning system prompt
 */
export function useLearningSystemPrompt(customContext?: string): string {
  const { learningSession } = useLearningMode();
  return useMemo(() => {
    return buildLearningSystemPrompt(learningSession, customContext);
  }, [learningSession, customContext]);
}

/**
 * Hook to check if learning mode should be active for the current session
 */
export function useIsLearningMode(): boolean {
  const sessionStore = useSessionStore();
  const activeSession = sessionStore.getActiveSession();
  return activeSession?.mode === 'learning';
}

export default useLearningMode;
