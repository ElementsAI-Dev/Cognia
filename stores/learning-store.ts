/**
 * Learning Store - Zustand state management for Learning Mode
 * 
 * Manages learning sessions with Socratic Method workflow tracking.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  LearningSession,
  LearningPhase,
  LearningSubQuestion,
  LearningGoal,
  SubQuestionStatus,
  StartLearningInput,
  LearningModeConfig,
} from '@/types/learning';
import { DEFAULT_LEARNING_CONFIG } from '@/types/learning';

interface LearningState {
  // State
  sessions: Record<string, LearningSession>;
  activeSessionId: string | null;
  config: LearningModeConfig;
  isLoading: boolean;
  error: string | null;

  // Session management
  startLearningSession: (sessionId: string, input: StartLearningInput) => LearningSession;
  endLearningSession: (learningSessionId: string, summary?: string, takeaways?: string[]) => void;
  getLearningSession: (learningSessionId: string) => LearningSession | undefined;
  getLearningSessionByChat: (chatSessionId: string) => LearningSession | undefined;
  setActiveSession: (learningSessionId: string | null) => void;
  deleteLearningSession: (learningSessionId: string) => void;

  // Phase management
  advancePhase: (learningSessionId: string) => void;
  setPhase: (learningSessionId: string, phase: LearningPhase) => void;
  getCurrentPhase: (learningSessionId: string) => LearningPhase | undefined;

  // Sub-questions management
  addSubQuestion: (learningSessionId: string, question: string) => LearningSubQuestion;
  updateSubQuestion: (learningSessionId: string, subQuestionId: string, updates: Partial<LearningSubQuestion>) => void;
  setCurrentSubQuestion: (learningSessionId: string, subQuestionId: string) => void;
  markSubQuestionResolved: (learningSessionId: string, subQuestionId: string, insights?: string[]) => void;
  addHintToSubQuestion: (learningSessionId: string, subQuestionId: string, hint: string) => void;
  incrementAttempts: (learningSessionId: string, subQuestionId: string) => void;

  // Goals management
  addLearningGoal: (learningSessionId: string, description: string) => LearningGoal;
  markGoalAchieved: (learningSessionId: string, goalId: string) => void;
  updateGoals: (learningSessionId: string, goals: LearningGoal[]) => void;

  // Progress tracking
  updateProgress: (learningSessionId: string) => void;
  getProgress: (learningSessionId: string) => number;

  // Topic and background
  updateTopic: (learningSessionId: string, topic: string) => void;
  updateBackgroundKnowledge: (learningSessionId: string, background: string) => void;

  // Configuration
  updateConfig: (config: Partial<LearningModeConfig>) => void;
  resetConfig: () => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Reset
  reset: () => void;
}

const PHASE_ORDER: LearningPhase[] = [
  'clarification',
  'deconstruction',
  'questioning',
  'feedback',
  'summary',
];

const initialState = {
  sessions: {} as Record<string, LearningSession>,
  activeSessionId: null as string | null,
  config: DEFAULT_LEARNING_CONFIG,
  isLoading: false,
  error: null as string | null,
};

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Session management
      startLearningSession: (sessionId: string, input: StartLearningInput) => {
        const now = new Date();
        const learningSessionId = nanoid();

        const goals: LearningGoal[] = (input.learningGoals || []).map((desc) => ({
          id: nanoid(),
          description: desc,
          achieved: false,
        }));

        const session: LearningSession = {
          id: learningSessionId,
          sessionId,
          topic: input.topic,
          backgroundKnowledge: input.backgroundKnowledge,
          learningGoals: goals,
          currentPhase: 'clarification',
          subQuestions: [],
          progress: 0,
          totalHintsProvided: 0,
          startedAt: now,
          lastActivityAt: now,
        };

        set((state) => ({
          sessions: { ...state.sessions, [learningSessionId]: session },
          activeSessionId: learningSessionId,
        }));

        return session;
      },

      endLearningSession: (learningSessionId: string, summary?: string, takeaways?: string[]) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                currentPhase: 'summary',
                progress: 100,
                completedAt: new Date(),
                lastActivityAt: new Date(),
                finalSummary: summary,
                keyTakeaways: takeaways,
              },
            },
          };
        });
      },

      getLearningSession: (learningSessionId: string) => {
        return get().sessions[learningSessionId];
      },

      getLearningSessionByChat: (chatSessionId: string) => {
        const sessions = Object.values(get().sessions);
        return sessions.find((s) => s.sessionId === chatSessionId && !s.completedAt);
      },

      setActiveSession: (learningSessionId: string | null) => {
        set({ activeSessionId: learningSessionId });
      },

      deleteLearningSession: (learningSessionId: string) => {
        set((state) => {
          const { [learningSessionId]: _, ...rest } = state.sessions;
          return {
            sessions: rest,
            activeSessionId:
              state.activeSessionId === learningSessionId ? null : state.activeSessionId,
          };
        });
      },

      // Phase management
      advancePhase: (learningSessionId: string) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          const currentIndex = PHASE_ORDER.indexOf(session.currentPhase);
          if (currentIndex >= PHASE_ORDER.length - 1) return state;

          const nextPhase = PHASE_ORDER[currentIndex + 1];

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                currentPhase: nextPhase,
                lastActivityAt: new Date(),
              },
            },
          };
        });

        // Update progress after phase change
        get().updateProgress(learningSessionId);
      },

      setPhase: (learningSessionId: string, phase: LearningPhase) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                currentPhase: phase,
                lastActivityAt: new Date(),
              },
            },
          };
        });

        get().updateProgress(learningSessionId);
      },

      getCurrentPhase: (learningSessionId: string) => {
        return get().sessions[learningSessionId]?.currentPhase;
      },

      // Sub-questions management
      addSubQuestion: (learningSessionId: string, question: string) => {
        const subQuestion: LearningSubQuestion = {
          id: nanoid(),
          question,
          status: 'pending',
          hints: [],
          userAttempts: 0,
        };

        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                subQuestions: [...session.subQuestions, subQuestion],
                lastActivityAt: new Date(),
              },
            },
          };
        });

        return subQuestion;
      },

      updateSubQuestion: (
        learningSessionId: string,
        subQuestionId: string,
        updates: Partial<LearningSubQuestion>
      ) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                subQuestions: session.subQuestions.map((sq) =>
                  sq.id === subQuestionId ? { ...sq, ...updates } : sq
                ),
                lastActivityAt: new Date(),
              },
            },
          };
        });
      },

      setCurrentSubQuestion: (learningSessionId: string, subQuestionId: string) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                currentSubQuestionId: subQuestionId,
                subQuestions: session.subQuestions.map((sq) => ({
                  ...sq,
                  status:
                    sq.id === subQuestionId && sq.status === 'pending'
                      ? 'in_progress'
                      : sq.status,
                })),
                lastActivityAt: new Date(),
              },
            },
          };
        });
      },

      markSubQuestionResolved: (
        learningSessionId: string,
        subQuestionId: string,
        insights?: string[]
      ) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          const updatedSubQuestions = session.subQuestions.map((sq) =>
            sq.id === subQuestionId
              ? {
                  ...sq,
                  status: 'resolved' as SubQuestionStatus,
                  resolvedAt: new Date(),
                  keyInsights: insights,
                }
              : sq
          );

          // Find next pending sub-question
          const nextPending = updatedSubQuestions.find((sq) => sq.status === 'pending');

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                subQuestions: updatedSubQuestions,
                currentSubQuestionId: nextPending?.id,
                lastActivityAt: new Date(),
              },
            },
          };
        });

        get().updateProgress(learningSessionId);
      },

      addHintToSubQuestion: (learningSessionId: string, subQuestionId: string, hint: string) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                subQuestions: session.subQuestions.map((sq) =>
                  sq.id === subQuestionId ? { ...sq, hints: [...sq.hints, hint] } : sq
                ),
                totalHintsProvided: session.totalHintsProvided + 1,
                lastActivityAt: new Date(),
              },
            },
          };
        });
      },

      incrementAttempts: (learningSessionId: string, subQuestionId: string) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                subQuestions: session.subQuestions.map((sq) =>
                  sq.id === subQuestionId
                    ? { ...sq, userAttempts: sq.userAttempts + 1 }
                    : sq
                ),
                lastActivityAt: new Date(),
              },
            },
          };
        });
      },

      // Goals management
      addLearningGoal: (learningSessionId: string, description: string) => {
        const goal: LearningGoal = {
          id: nanoid(),
          description,
          achieved: false,
        };

        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                learningGoals: [...session.learningGoals, goal],
                lastActivityAt: new Date(),
              },
            },
          };
        });

        return goal;
      },

      markGoalAchieved: (learningSessionId: string, goalId: string) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                learningGoals: session.learningGoals.map((g) =>
                  g.id === goalId ? { ...g, achieved: true, achievedAt: new Date() } : g
                ),
                lastActivityAt: new Date(),
              },
            },
          };
        });

        get().updateProgress(learningSessionId);
      },

      updateGoals: (learningSessionId: string, goals: LearningGoal[]) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                learningGoals: goals,
                lastActivityAt: new Date(),
              },
            },
          };
        });
      },

      // Progress tracking
      updateProgress: (learningSessionId: string) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          // Calculate progress based on phase, sub-questions, and goals
          const phaseWeight = 0.4;
          const subQuestionsWeight = 0.4;
          const goalsWeight = 0.2;

          // Phase progress (0-100)
          const phaseIndex = PHASE_ORDER.indexOf(session.currentPhase);
          const phaseProgress = ((phaseIndex + 1) / PHASE_ORDER.length) * 100;

          // Sub-questions progress (0-100)
          const totalSQ = session.subQuestions.length;
          const resolvedSQ = session.subQuestions.filter((sq) => sq.status === 'resolved').length;
          const sqProgress = totalSQ > 0 ? (resolvedSQ / totalSQ) * 100 : 0;

          // Goals progress (0-100)
          const totalGoals = session.learningGoals.length;
          const achievedGoals = session.learningGoals.filter((g) => g.achieved).length;
          const goalsProgress = totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0;

          // Weighted total
          const progress = Math.round(
            phaseProgress * phaseWeight +
              sqProgress * subQuestionsWeight +
              goalsProgress * goalsWeight
          );

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                progress: Math.min(progress, 100),
              },
            },
          };
        });
      },

      getProgress: (learningSessionId: string) => {
        return get().sessions[learningSessionId]?.progress ?? 0;
      },

      // Topic and background
      updateTopic: (learningSessionId: string, topic: string) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                topic,
                lastActivityAt: new Date(),
              },
            },
          };
        });
      },

      updateBackgroundKnowledge: (learningSessionId: string, background: string) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                backgroundKnowledge: background,
                lastActivityAt: new Date(),
              },
            },
          };
        });
      },

      // Configuration
      updateConfig: (config: Partial<LearningModeConfig>) => {
        set((state) => ({
          config: { ...state.config, ...config },
        }));
      },

      resetConfig: () => {
        set({ config: DEFAULT_LEARNING_CONFIG });
      },

      // Error handling
      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // Reset
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'cognia-learning-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        config: state.config,
      }),
      onRehydrateStorage: () => (state) => {
        // Convert date strings back to Date objects
        if (state?.sessions) {
          for (const id in state.sessions) {
            const session = state.sessions[id];
            session.startedAt = new Date(session.startedAt);
            session.lastActivityAt = new Date(session.lastActivityAt);
            if (session.completedAt) {
              session.completedAt = new Date(session.completedAt);
            }
            session.subQuestions = session.subQuestions.map((sq) => ({
              ...sq,
              resolvedAt: sq.resolvedAt ? new Date(sq.resolvedAt) : undefined,
            }));
            session.learningGoals = session.learningGoals.map((g) => ({
              ...g,
              achievedAt: g.achievedAt ? new Date(g.achievedAt) : undefined,
            }));
          }
        }
      },
    }
  )
);

// Selectors
export const selectLearningSession = (learningSessionId: string) => (state: LearningState) =>
  state.sessions[learningSessionId];

export const selectActiveLearningSes = (state: LearningState) =>
  state.activeSessionId ? state.sessions[state.activeSessionId] : undefined;

export const selectLearningConfig = (state: LearningState) => state.config;

export const selectLearningProgress = (learningSessionId: string) => (state: LearningState) =>
  state.sessions[learningSessionId]?.progress ?? 0;

export const selectCurrentPhase = (learningSessionId: string) => (state: LearningState) =>
  state.sessions[learningSessionId]?.currentPhase;

export const selectSubQuestions = (learningSessionId: string) => (state: LearningState) =>
  state.sessions[learningSessionId]?.subQuestions ?? [];

export const selectLearningGoals = (learningSessionId: string) => (state: LearningState) =>
  state.sessions[learningSessionId]?.learningGoals ?? [];
