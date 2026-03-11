'use client';

/**
 * useLearningMode - Hook for managing learning mode state and interactions
 *
 * Provides easy access to learning mode functionality for React components.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  useLearningStore,
  useSpeedPassStore,
  selectLearningActionAvailability,
  selectLearningLifecycleState,
  selectLearningProgressSnapshot,
  selectLearningResumeOutcome,
} from '@/stores/learning';
import { useSessionStore } from '@/stores/chat';
import {
  buildLearningSystemPrompt,
  buildAdaptiveLearningPrompt,
  buildLearningRecoverableError,
  buildLearningResumeContext,
  computeAdaptiveLearningProfile,
  computeSpeedPassAdaptiveProfile,
  analyzeLearnerResponse,
  analyzeLearnerResponseWithAI,
  detectPhaseTransition,
  extractSubQuestions,
  shouldProvideHint,
  generateProgressSummary,
  formatProgressReport,
  formatSessionSummary,
  formatStatusLine,
  formatLearningGoals,
  formatSubQuestionsList,
  generateCelebrationMessage,
  getEncouragementMessage,
  generateContextualHint,
  getAvailableTemplates,
  getTemplateById,
} from '@/lib/learning';
import type {
  LearningSession,
  LearningPhase,
  LearningSubQuestion,
  LearningGoal,
  StartLearningInput,
  LearningModeConfig,
  PromptTemplate,
} from '@/types/learning';
import type {
  AdaptiveLearningProfile,
  LearningLifecycleActionAvailability,
  LearningLifecycleActionId,
  LearningLifecycleState,
  LearningProgressSnapshot,
  LearningRecoverableError,
  LearningResumeOutcome,
} from '@/types/learning/lifecycle';
import type { LearningSubMode } from '@/types/core/session';

export interface UseLearningModeReturn {
  // State
  learningSession: LearningSession | undefined;
  isLearningActive: boolean;
  currentPhase: LearningPhase | undefined;
  progress: number;
  subQuestions: LearningSubQuestion[];
  learningGoals: LearningGoal[];
  config: LearningModeConfig;
  lifecycleState: LearningLifecycleState;
  progressSnapshot: LearningProgressSnapshot;
  resumeOutcome: LearningResumeOutcome;
  actionAvailability: Record<LearningLifecycleActionId, LearningLifecycleActionAvailability>;
  adaptiveProfile: AdaptiveLearningProfile | null;
  recoverableError: LearningRecoverableError | null;

  // Session management
  startLearning: (input: StartLearningInput) => LearningSession;
  endLearning: (summary?: string, takeaways?: string[]) => void;
  resetLearning: () => void;
  resumeLearningFromContext: () => LearningResumeOutcome;
  useFallbackLearningContext: () => LearningResumeOutcome;
  resetLearningContext: () => void;
  clearRecoverableError: () => void;

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
  analyzeResponse: (
    response: string,
    expectedConcepts?: string[]
  ) => ReturnType<typeof analyzeLearnerResponse>;
  analyzeResponseWithAI: (
    response: string,
    expectedConcepts?: string[]
  ) => ReturnType<typeof analyzeLearnerResponseWithAI>;
  checkPhaseTransition: () => ReturnType<typeof detectPhaseTransition>;
  extractQuestionsFromResponse: (response: string) => string[];
  checkShouldHint: (subQuestionId: string) => {
    shouldHint: boolean;
    hintLevel: 'subtle' | 'moderate' | 'strong';
  };

  // Formatting
  getProgressReport: () => string;
  getSessionSummary: () => string;
  getProgressSummary: () => string;
  getStatusLine: () => string;
  getFormattedGoals: () => string;
  getFormattedSubQuestions: () => string;

  // Adaptive prompts
  getAdaptivePrompt: (options?: {
    scenario?: string;
    understandingLevel?: string;
    customContext?: string;
  }) => string;

  // Celebration and encouragement
  getCelebrationMessage: (
    type: 'concept_mastered' | 'question_solved' | 'phase_complete' | 'session_complete'
  ) => string;
  getEncouragement: (type: 'struggling' | 'goodProgress' | 'breakthrough' | 'completion') => string;
  getContextualHint: (attemptCount: number) => string;

  // Template management
  promptTemplates: PromptTemplate[];
  activeTemplate: PromptTemplate | undefined;
  addPromptTemplate: (template: Omit<PromptTemplate, 'id' | 'createdAt' | 'isBuiltIn'>) => PromptTemplate;
  updatePromptTemplate: (id: string, updates: Partial<PromptTemplate>) => void;
  deletePromptTemplate: (id: string) => void;
  getPromptPreview: () => string;

  // Configuration
  updateConfig: (config: Partial<LearningModeConfig>) => void;
}

export function useLearningMode(): UseLearningModeReturn {
  const learningStore = useLearningStore();
  const speedPassStore = useSpeedPassStore();
  const sessionStore = useSessionStore();
  const persistResumeRef = useRef<string>('');

  const activeSessionId = sessionStore.activeSessionId;
  const activeChatSession = useMemo(
    () => (activeSessionId ? sessionStore.sessions.find((session) => session.id === activeSessionId) : undefined),
    [activeSessionId, sessionStore.sessions]
  );
  const currentSubMode: LearningSubMode = activeChatSession?.learningContext?.subMode || 'socratic';
  const activeTutorial = speedPassStore.currentTutorialId
    ? speedPassStore.tutorials[speedPassStore.currentTutorialId]
    : undefined;
  const activeSpeedPassSession = speedPassStore.currentSessionId
    ? speedPassStore.studySessions[speedPassStore.currentSessionId]
    : undefined;
  const resumeContext = activeChatSession?.learningContext?.resumeContext;

  // Get current learning session based on active chat session
  const learningSession = useMemo(() => {
    if (!activeSessionId) return undefined;
    return learningStore.getLearningSessionByChat(activeSessionId);
  }, [activeSessionId, learningStore]);

  // Derived state
  const isLearningActive = !!learningSession && !learningSession.completedAt;
  const currentPhase = learningSession?.currentPhase;
  const progress = learningSession?.progress ?? activeTutorial?.progress ?? 0;
  const subQuestions = useMemo(
    () => learningSession?.subQuestions ?? [],
    [learningSession?.subQuestions]
  );
  const learningGoals = useMemo(
    () => learningSession?.learningGoals ?? [],
    [learningSession?.learningGoals]
  );
  const updateSession =
    typeof sessionStore.updateSession === 'function' ? sessionStore.updateSession : undefined;

  const recoverableError = useMemo<LearningRecoverableError | null>(() => {
    if (learningStore.error) {
      return buildLearningRecoverableError({
        stage: 'state_persistence',
        code: 'LEARNING_STORE_ERROR',
        message: learningStore.error,
        retryable: true,
        fallbackAction: 'retry',
      });
    }
    if (speedPassStore.error) {
      return buildLearningRecoverableError({
        stage: 'content_generation',
        code: 'SPEEDPASS_STORE_ERROR',
        message: speedPassStore.error,
        retryable: true,
        fallbackAction: 'retry',
      });
    }
    return null;
  }, [learningStore.error, speedPassStore.error]);

  const lifecycleSelectorInput = useMemo(
    () => ({
      subMode: currentSubMode,
      chatSessionId: activeSessionId || undefined,
      resumeContext,
      learningSession,
      learningSessions: learningStore.sessions,
      activeLearningSessionId: learningStore.activeSessionId,
      activeTutorial,
      tutorials: speedPassStore.tutorials,
      speedPassSession: activeSpeedPassSession,
      studySessions: speedPassStore.studySessions,
      currentTutorialId: speedPassStore.currentTutorialId,
      currentSpeedPassSessionId: speedPassStore.currentSessionId,
      isPreparing: learningStore.isLoading || speedPassStore.isLoading,
      recoverableError,
    }),
    [
      currentSubMode,
      activeSessionId,
      resumeContext,
      learningSession,
      learningStore.sessions,
      learningStore.activeSessionId,
      learningStore.isLoading,
      activeTutorial,
      speedPassStore.tutorials,
      activeSpeedPassSession,
      speedPassStore.studySessions,
      speedPassStore.currentTutorialId,
      speedPassStore.currentSessionId,
      speedPassStore.isLoading,
      recoverableError,
    ]
  );

  const resumeOutcome = useMemo(
    () => selectLearningResumeOutcome(lifecycleSelectorInput),
    [lifecycleSelectorInput]
  );
  const lifecycleState = useMemo(
    () => selectLearningLifecycleState(lifecycleSelectorInput),
    [lifecycleSelectorInput]
  );
  const progressSnapshot = useMemo(
    () => selectLearningProgressSnapshot(lifecycleSelectorInput, lifecycleState),
    [lifecycleSelectorInput, lifecycleState]
  );
  const actionAvailability = useMemo(
    () => selectLearningActionAvailability(lifecycleSelectorInput, lifecycleState, resumeOutcome),
    [lifecycleSelectorInput, lifecycleState, resumeOutcome]
  );

  const adaptiveProfile = useMemo<AdaptiveLearningProfile | null>(() => {
    if (currentSubMode === 'socratic' && learningSession) {
      return computeAdaptiveLearningProfile({
        session: learningSession,
        config: {
          enableAdaptiveDifficulty: learningStore.config.enableAdaptiveDifficulty,
          difficultyAdjustThreshold: learningStore.config.difficultyAdjustThreshold,
        },
      });
    }

    if (currentSubMode === 'speedpass') {
      const speedPassAdaptive = computeSpeedPassAdaptiveProfile({
        preferredMode:
          activeChatSession?.learningContext?.speedpassContext?.recommendedMode ||
          speedPassStore.userProfile?.preferredMode ||
          'speed',
        averageAccuracy: speedPassStore.globalStats.averageAccuracy,
        currentStreak: speedPassStore.globalStats.currentStreak,
      });

      const modeToDifficulty: Record<typeof speedPassAdaptive.recommendedMode, LearningSession['currentDifficulty']> = {
        comprehensive: 'beginner',
        speed: 'intermediate',
        extreme: 'advanced',
      };

      return {
        guidanceDepth: speedPassAdaptive.guidanceDepth,
        practiceIntensity: speedPassAdaptive.practiceIntensity,
        targetDifficulty: modeToDifficulty[speedPassAdaptive.recommendedMode],
        reasonCodes: speedPassAdaptive.reasonCodes,
        guardrails: {
          minDifficulty: modeToDifficulty[speedPassStore.userProfile?.preferredMode || 'speed'],
          maxDifficulty:
            speedPassStore.userProfile?.preferredMode === 'comprehensive'
              ? 'intermediate'
              : speedPassStore.userProfile?.preferredMode === 'speed'
                ? 'advanced'
                : 'expert',
          steppedAdjustment: true,
        },
      };
    }

    return null;
  }, [
    currentSubMode,
    learningSession,
    learningStore.config.enableAdaptiveDifficulty,
    learningStore.config.difficultyAdjustThreshold,
    activeChatSession?.learningContext?.speedpassContext?.recommendedMode,
    speedPassStore.userProfile?.preferredMode,
    speedPassStore.globalStats.averageAccuracy,
    speedPassStore.globalStats.currentStreak,
  ]);

  const stableResumeContext = useMemo(() => {
    if (!activeSessionId) {
      return undefined;
    }
    if (lifecycleState === 'idle' || lifecycleState === 'preparing') {
      return undefined;
    }
    return buildLearningResumeContext({
      chatSessionId: activeSessionId,
      subMode: currentSubMode,
      learningSession,
      activeTutorial,
      speedPassSession: activeSpeedPassSession,
    });
  }, [
    activeSessionId,
    lifecycleState,
    currentSubMode,
    learningSession,
    activeTutorial,
    activeSpeedPassSession,
  ]);

  useEffect(() => {
    if (!updateSession || !activeChatSession || !stableResumeContext) {
      return;
    }

    const nextSnapshot = JSON.stringify({
      ...stableResumeContext,
      lastStableAt:
        stableResumeContext.lastStableAt instanceof Date
          ? stableResumeContext.lastStableAt.toISOString()
          : stableResumeContext.lastStableAt,
    });
    const currentSnapshot = JSON.stringify({
      ...(activeChatSession.learningContext?.resumeContext || {}),
      lastStableAt:
        activeChatSession.learningContext?.resumeContext?.lastStableAt instanceof Date
          ? activeChatSession.learningContext.resumeContext.lastStableAt.toISOString()
          : activeChatSession.learningContext?.resumeContext?.lastStableAt,
    });

    if (nextSnapshot === currentSnapshot || persistResumeRef.current === nextSnapshot) {
      return;
    }

    updateSession(activeChatSession.id, {
      learningContext: {
        subMode: currentSubMode,
        speedpassContext: activeChatSession.learningContext?.speedpassContext,
        resumeContext: stableResumeContext,
      },
    });
    persistResumeRef.current = nextSnapshot;
  }, [activeChatSession, currentSubMode, stableResumeContext, updateSession]);

  // Session management
  const startLearning = useCallback(
    (input: StartLearningInput) => {
      if (!activeSessionId) {
        throw new Error('No active chat session');
      }
      const created = learningStore.startLearningSession(activeSessionId, input);
      if (updateSession && activeChatSession) {
        updateSession(activeChatSession.id, {
          learningContext: {
            subMode: 'socratic',
            speedpassContext: activeChatSession.learningContext?.speedpassContext,
            resumeContext: buildLearningResumeContext({
              chatSessionId: activeSessionId,
              subMode: 'socratic',
              learningSession: created,
            }),
          },
        });
      }
      return created;
    },
    [activeSessionId, learningStore, updateSession, activeChatSession]
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

  const applyRecoveredContext = useCallback(
    (outcome: LearningResumeOutcome, allowFallback: boolean): LearningResumeOutcome => {
      if (outcome.outcome === 'reset-required') {
        return outcome;
      }
      if (outcome.outcome === 'fallback' && !allowFallback) {
        return outcome;
      }
      const recoveredContext = outcome.recoveredContext;
      if (!recoveredContext) {
        return outcome;
      }

      if (recoveredContext.learningSessionId) {
        learningStore.setActiveSession(recoveredContext.learningSessionId);
      }
      if (recoveredContext.tutorialId) {
        speedPassStore.setCurrentTutorial(recoveredContext.tutorialId);
      }
      if (recoveredContext.speedPassSessionId) {
        const recoveredSession = speedPassStore.studySessions[recoveredContext.speedPassSessionId];
        if (recoveredSession?.status === 'paused') {
          speedPassStore.resumeStudySession(recoveredSession.id);
        }
      }

      if (updateSession && activeChatSession) {
        updateSession(activeChatSession.id, {
          learningContext: {
            subMode: recoveredContext.subMode,
            speedpassContext: activeChatSession.learningContext?.speedpassContext,
            resumeContext: recoveredContext,
          },
        });
      }

      return outcome;
    },
    [learningStore, speedPassStore, updateSession, activeChatSession]
  );

  const resumeLearningFromContext = useCallback(() => {
    return applyRecoveredContext(resumeOutcome, false);
  }, [applyRecoveredContext, resumeOutcome]);

  const useFallbackLearningContext = useCallback(() => {
    return applyRecoveredContext(resumeOutcome, true);
  }, [applyRecoveredContext, resumeOutcome]);

  const resetLearningContext = useCallback(() => {
    if (updateSession && activeChatSession) {
      updateSession(activeChatSession.id, {
        learningContext: {
          subMode: currentSubMode,
          speedpassContext: activeChatSession.learningContext?.speedpassContext,
          resumeContext: undefined,
        },
      });
    }
  }, [updateSession, activeChatSession, currentSubMode]);

  const clearRecoverableError = useCallback(() => {
    learningStore.clearError();
    speedPassStore.setError(null);
  }, [learningStore, speedPassStore]);

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
      return buildLearningSystemPrompt(
        learningSession, customContext, learningStore.config, learningStore.promptTemplates
      );
    },
    [learningSession, learningStore.config, learningStore.promptTemplates]
  );

  // Analysis functions
  const analyzeResponse = useCallback(
    (response: string, expectedConcepts?: string[]) => {
      return analyzeLearnerResponse(response, expectedConcepts, learningSession);
    },
    [learningSession]
  );

  const analyzeResponseWithAI = useCallback(
    async (response: string, expectedConcepts?: string[]) => {
      return analyzeLearnerResponseWithAI(response, expectedConcepts, learningSession);
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

  const getStatusLine = useCallback(() => {
    if (!learningSession) return '';
    return formatStatusLine(learningSession);
  }, [learningSession]);

  const getFormattedGoals = useCallback(() => {
    if (!learningSession) return '';
    return formatLearningGoals(learningSession.learningGoals);
  }, [learningSession]);

  const getFormattedSubQuestions = useCallback(() => {
    if (!learningSession) return '';
    return formatSubQuestionsList(learningSession.subQuestions);
  }, [learningSession]);

  // Adaptive prompts
  const getAdaptivePrompt = useCallback(
    (options?: { scenario?: string; understandingLevel?: string; customContext?: string }) => {
      if (!learningSession) return '';
      const adaptiveContext = adaptiveProfile
        ? [
            `Adaptive guidance depth: ${adaptiveProfile.guidanceDepth}`,
            `Adaptive practice intensity: ${adaptiveProfile.practiceIntensity}`,
            `Adaptive target difficulty: ${adaptiveProfile.targetDifficulty}`,
            `Adaptive reason codes: ${adaptiveProfile.reasonCodes.join(', ')}`,
            `Difficulty guardrails: ${adaptiveProfile.guardrails.minDifficulty} -> ${adaptiveProfile.guardrails.maxDifficulty}`,
          ].join('\n')
        : '';

      return buildAdaptiveLearningPrompt(learningSession, {
        ...(options as Parameters<typeof buildAdaptiveLearningPrompt>[1]),
        config: learningStore.config,
        customTemplates: learningStore.promptTemplates,
        customContext: [options?.customContext, adaptiveContext].filter(Boolean).join('\n\n'),
      });
    },
    [learningSession, learningStore.config, learningStore.promptTemplates, adaptiveProfile]
  );

  // Celebration and encouragement
  const getCelebrationMessage = useCallback(
    (type: 'concept_mastered' | 'question_solved' | 'phase_complete' | 'session_complete') => {
      if (!learningSession) return '';
      return generateCelebrationMessage(type, learningSession);
    },
    [learningSession]
  );

  const getEncouragement = useCallback(
    (type: 'struggling' | 'goodProgress' | 'breakthrough' | 'completion') => {
      return getEncouragementMessage(type);
    },
    []
  );

  const getContextualHint = useCallback(
    (attemptCount: number) => {
      if (!learningSession) return '';
      return generateContextualHint(learningSession, attemptCount);
    },
    [learningSession]
  );

  // Template management
  const promptTemplates = useMemo(
    () => getAvailableTemplates(learningStore.config.promptLanguage, learningStore.promptTemplates),
    [learningStore.config.promptLanguage, learningStore.promptTemplates]
  );

  const activeTemplate = useMemo(
    () => getTemplateById(learningStore.config.activeTemplateId, learningStore.promptTemplates),
    [learningStore.config.activeTemplateId, learningStore.promptTemplates]
  );

  const addPromptTemplate = useCallback(
    (template: Omit<PromptTemplate, 'id' | 'createdAt' | 'isBuiltIn'>) => {
      return learningStore.addPromptTemplate(template);
    },
    [learningStore]
  );

  const updatePromptTemplate = useCallback(
    (id: string, updates: Partial<PromptTemplate>) => {
      learningStore.updatePromptTemplate(id, updates);
    },
    [learningStore]
  );

  const deletePromptTemplate = useCallback(
    (id: string) => {
      learningStore.deletePromptTemplate(id);
    },
    [learningStore]
  );

  const getPromptPreview = useCallback(() => {
    return buildLearningSystemPrompt(
      learningSession, undefined, learningStore.config, learningStore.promptTemplates
    );
  }, [learningSession, learningStore.config, learningStore.promptTemplates]);

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
    lifecycleState,
    progressSnapshot,
    resumeOutcome,
    actionAvailability,
    adaptiveProfile,
    recoverableError,

    // Session management
    startLearning,
    endLearning,
    resetLearning,
    resumeLearningFromContext,
    useFallbackLearningContext,
    resetLearningContext,
    clearRecoverableError,

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
    analyzeResponseWithAI,
    checkPhaseTransition,
    extractQuestionsFromResponse,
    checkShouldHint,

    // Formatting
    getProgressReport,
    getSessionSummary,
    getProgressSummary,
    getStatusLine,
    getFormattedGoals,
    getFormattedSubQuestions,

    // Adaptive prompts
    getAdaptivePrompt,

    // Celebration and encouragement
    getCelebrationMessage,
    getEncouragement,
    getContextualHint,

    // Template management
    promptTemplates,
    activeTemplate,
    addPromptTemplate,
    updatePromptTemplate,
    deletePromptTemplate,
    getPromptPreview,

    // Configuration
    updateConfig,
  };
}

/**
 * Hook to get just the learning system prompt
 */
export function useLearningSystemPrompt(customContext?: string): string {
  const { learningSession } = useLearningMode();
  const { config, promptTemplates } = useLearningStore();
  return useMemo(() => {
    return buildLearningSystemPrompt(learningSession, customContext, config, promptTemplates);
  }, [learningSession, customContext, config, promptTemplates]);
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
