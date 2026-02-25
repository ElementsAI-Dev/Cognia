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
  LearningNote,
  KnowledgeConcept,
  ReviewItem,
  LearningStatistics,
  DifficultyLevel,
  LearningAchievement,
  LearningPath,
  LearningDurationType,
  CreateLearningPathInput,
  QuickLearningSession,
  PromptTemplate,
} from '@/types/learning';
import { DEFAULT_LEARNING_CONFIG, DEFAULT_LEARNING_STATISTICS } from '@/types/learning';
import { detectLearningType, getSuggestedMilestones } from '@/lib/learning/learning-type-detector';
import {
  createLearningPath,
  updateMilestoneProgress,
  recordStudySession,
} from '@/lib/learning/learning-path';

interface LearningState {
  // State
  sessions: Record<string, LearningSession>;
  activeSessionId: string | null;
  config: LearningModeConfig;
  achievements: LearningAchievement[];
  // Learning paths for long-term learning
  learningPaths: Record<string, LearningPath>;
  activeLearningPathId: string | null;
  // Quick learning sessions history
  quickSessions: Record<string, QuickLearningSession>;
  // User-defined prompt templates (built-in templates are not stored here)
  promptTemplates: Record<string, PromptTemplate>;
  globalStats: {
    totalSessions: number;
    totalTimeSpentMs: number;
    conceptsMastered: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate?: string;
    // Learning type stats
    quickSessionsCount: number;
    journeySessionsCount: number;
    pathsCompleted: number;
  };
  isLoading: boolean;
  error: string | null;

  // Session management
  startLearningSession: (sessionId: string, input: StartLearningInput) => LearningSession;
  endLearningSession: (learningSessionId: string, summary?: string, takeaways?: string[]) => void;
  getLearningSession: (learningSessionId: string) => LearningSession | undefined;
  getLearningSessionByChat: (chatSessionId: string) => LearningSession | undefined;
  getAllSessions: () => LearningSession[];
  getCompletedSessions: () => LearningSession[];
  setActiveSession: (learningSessionId: string | null) => void;
  deleteLearningSession: (learningSessionId: string) => void;

  // Phase management
  advancePhase: (learningSessionId: string) => void;
  setPhase: (learningSessionId: string, phase: LearningPhase) => void;
  getCurrentPhase: (learningSessionId: string) => LearningPhase | undefined;

  // Sub-questions management
  addSubQuestion: (
    learningSessionId: string,
    question: string,
    difficulty?: DifficultyLevel
  ) => LearningSubQuestion;
  updateSubQuestion: (
    learningSessionId: string,
    subQuestionId: string,
    updates: Partial<LearningSubQuestion>
  ) => void;
  setCurrentSubQuestion: (learningSessionId: string, subQuestionId: string) => void;
  markSubQuestionResolved: (
    learningSessionId: string,
    subQuestionId: string,
    insights?: string[]
  ) => void;
  addHintToSubQuestion: (learningSessionId: string, subQuestionId: string, hint: string) => void;
  incrementAttempts: (learningSessionId: string, subQuestionId: string) => void;

  // Goals management
  addLearningGoal: (learningSessionId: string, description: string) => LearningGoal;
  markGoalAchieved: (learningSessionId: string, goalId: string) => void;
  updateGoals: (learningSessionId: string, goals: LearningGoal[]) => void;

  // Notes management
  addNote: (learningSessionId: string, content: string, subQuestionId?: string) => LearningNote;
  updateNote: (learningSessionId: string, noteId: string, updates: Partial<LearningNote>) => void;
  deleteNote: (learningSessionId: string, noteId: string) => void;
  toggleNoteHighlight: (learningSessionId: string, noteId: string) => void;

  // Concept tracking
  addConcept: (learningSessionId: string, name: string, description?: string) => KnowledgeConcept;
  updateConceptMastery: (learningSessionId: string, conceptId: string, correct: boolean) => void;
  getConceptsForReview: (learningSessionId: string) => KnowledgeConcept[];

  // Review items (spaced repetition)
  addReviewItem: (learningSessionId: string, item: Omit<ReviewItem, 'id'>) => ReviewItem;
  updateReviewItem: (learningSessionId: string, itemId: string, quality: number) => void;
  getDueReviewItems: () => ReviewItem[];

  // Statistics
  updateStatistics: (learningSessionId: string, updates: Partial<LearningStatistics>) => void;
  recordAnswer: (learningSessionId: string, correct: boolean, responseTimeMs: number) => void;
  updateEngagement: (learningSessionId: string, engaged: boolean) => void;

  // Adaptive difficulty
  adjustDifficulty: (learningSessionId: string) => void;
  setDifficulty: (learningSessionId: string, difficulty: DifficultyLevel) => void;

  // Progress tracking
  updateProgress: (learningSessionId: string) => void;
  getProgress: (learningSessionId: string) => number;

  // Topic and background
  updateTopic: (learningSessionId: string, topic: string) => void;
  updateBackgroundKnowledge: (learningSessionId: string, background: string) => void;

  // Achievements
  checkAndAwardAchievements: () => void;
  getAchievements: () => LearningAchievement[];

  // Learning path management (for long-term/journey learning)
  createPath: (sessionId: string, input: CreateLearningPathInput) => LearningPath;
  getPath: (pathId: string) => LearningPath | undefined;
  getAllPaths: () => LearningPath[];
  getActivePaths: () => LearningPath[];
  setActivePath: (pathId: string | null) => void;
  deletePath: (pathId: string) => void;
  updatePathMilestone: (pathId: string, milestoneId: string, progress: number) => void;
  completeMilestone: (pathId: string, milestoneId: string) => void;
  recordPathSession: (pathId: string, durationMs: number) => void;
  getPathBySession: (sessionId: string) => LearningPath | undefined;

  // Quick learning sessions (for short-term learning)
  saveQuickSession: (sessionId: string, question: string, answer?: string) => QuickLearningSession;
  getQuickSession: (id: string) => QuickLearningSession | undefined;
  getAllQuickSessions: () => QuickLearningSession[];
  linkQuickToPath: (quickSessionId: string, pathId: string) => void;

  // Learning type utilities
  detectType: (topic: string) => LearningDurationType;
  getSessionsByType: (type: LearningDurationType) => LearningSession[];

  // Prompt template CRUD
  addPromptTemplate: (template: Omit<PromptTemplate, 'id' | 'createdAt' | 'isBuiltIn'>) => PromptTemplate;
  updatePromptTemplate: (id: string, updates: Partial<Omit<PromptTemplate, 'id' | 'isBuiltIn'>>) => void;
  deletePromptTemplate: (id: string) => void;
  exportPromptTemplates: () => string;
  importPromptTemplates: (json: string) => { imported: number; errors: string[] };

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

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function calculateDayDifference(fromDateKey: string, toDateKey: string): number {
  const fromDate = new Date(`${fromDateKey}T00:00:00.000Z`);
  const toDate = new Date(`${toDateKey}T00:00:00.000Z`);
  return Math.floor((toDate.getTime() - fromDate.getTime()) / ONE_DAY_MS);
}

function buildFallbackTakeaways(session: LearningSession): string[] {
  const takeaways = new Set<string>();

  session.learningGoals.forEach((goal) => {
    if (goal.description?.trim()) {
      takeaways.add(goal.description.trim());
    }
  });

  session.subQuestions.forEach((subQuestion) => {
    if (subQuestion.keyInsights?.length) {
      subQuestion.keyInsights.forEach((insight) => {
        if (insight?.trim()) {
          takeaways.add(insight.trim());
        }
      });
    } else if (subQuestion.status === 'resolved' && subQuestion.question.trim()) {
      takeaways.add(subQuestion.question.trim());
    }
  });

  session.concepts
    .filter((concept) => concept.masteryStatus === 'mastered')
    .forEach((concept) => {
      if (concept.name?.trim()) {
        takeaways.add(concept.name.trim());
      }
    });

  return Array.from(takeaways).slice(0, 5);
}

function buildFallbackSummary(session: LearningSession, keyTakeaways: string[]): string {
  const durationMinutes = Math.max(
    1,
    Math.round((Date.now() - new Date(session.startedAt).getTime()) / (1000 * 60))
  );
  const takeawaysText =
    keyTakeaways.length > 0
      ? ` Key takeaways: ${keyTakeaways.join('；')}.`
      : '';
  return `Completed learning session on "${session.topic}" in about ${durationMinutes} minutes.${takeawaysText}`;
}

const initialState = {
  sessions: {} as Record<string, LearningSession>,
  activeSessionId: null as string | null,
  config: DEFAULT_LEARNING_CONFIG,
  achievements: [] as LearningAchievement[],
  learningPaths: {} as Record<string, LearningPath>,
  activeLearningPathId: null as string | null,
  quickSessions: {} as Record<string, QuickLearningSession>,
  promptTemplates: {} as Record<string, PromptTemplate>,
  globalStats: {
    totalSessions: 0,
    totalTimeSpentMs: 0,
    conceptsMastered: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: undefined as string | undefined,
    quickSessionsCount: 0,
    journeySessionsCount: 0,
    pathsCompleted: 0,
  },
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

        // Detect learning type if auto-detection is enabled or not specified
        let durationType = input.durationType;
        let category = input.category;
        let detectionResult: ReturnType<typeof detectLearningType> | undefined;

        if (input.autoDetectType !== false && (!durationType || !category)) {
          detectionResult = detectLearningType(input.topic, {
            backgroundKnowledge: input.backgroundKnowledge,
            goals: input.learningGoals,
          });
          durationType = durationType || detectionResult.detectedType;
          category = category || detectionResult.category;
        }

        const resolvedDurationType = durationType || 'quick';
        const resolvedCategory = category || 'other';

        const session: LearningSession = {
          id: learningSessionId,
          sessionId,
          // Learning type
          durationType: resolvedDurationType,
          category: resolvedCategory,
          // Topic and goals
          topic: input.topic,
          backgroundKnowledge: input.backgroundKnowledge,
          learningGoals: goals,
          currentPhase: 'clarification',
          subQuestions: [],
          progress: 0,
          totalHintsProvided: 0,
          startedAt: now,
          lastActivityAt: now,
          // Enhanced features
          notes: [],
          concepts: [],
          statistics: { ...DEFAULT_LEARNING_STATISTICS },
          reviewItems: [],
          // Adaptive learning
          currentDifficulty: input.preferredDifficulty || 'intermediate',
          preferredStyle: input.preferredStyle,
          adaptiveAdjustments: 0,
          // Engagement metrics
          engagementScore: 50,
          consecutiveCorrect: 0,
          consecutiveIncorrect: 0,
        };

        let journeyPath: LearningPath | undefined;
        if (resolvedDurationType === 'journey') {
          const suggestedMilestones = getSuggestedMilestones(resolvedCategory, input.topic);
          journeyPath = createLearningPath(sessionId, {
            title: input.topic,
            description: input.backgroundKnowledge,
            category: resolvedCategory,
            estimatedDuration: input.estimatedDuration || detectionResult?.suggestedDuration || 'weeks',
            milestones: suggestedMilestones.map((title) => ({ title })),
          });
          session.learningPathId = journeyPath.id;
        }

        set((state) => ({
          sessions: { ...state.sessions, [learningSessionId]: session },
          activeSessionId: learningSessionId,
          learningPaths: journeyPath
            ? { ...state.learningPaths, [journeyPath.id]: journeyPath }
            : state.learningPaths,
          activeLearningPathId: journeyPath ? journeyPath.id : state.activeLearningPathId,
        }));

        return session;
      },

      endLearningSession: (learningSessionId: string, summary?: string, takeaways?: string[]) => {
        let completed = false;

        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;
          if (session.completedAt) return state;

          const completedAt = new Date();
          const startedAt = new Date(session.startedAt);
          const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime());
          const keyTakeaways =
            takeaways && takeaways.length > 0
              ? takeaways.filter((item) => item.trim().length > 0).slice(0, 5)
              : buildFallbackTakeaways(session);
          const finalSummary = summary?.trim() || buildFallbackSummary(session, keyTakeaways);
          const masteredConcepts = session.concepts.filter(
            (concept) => concept.masteryStatus === 'mastered'
          ).length;

          const todayKey = getDateKey(completedAt);
          const previousDateKey = state.globalStats.lastActiveDate;
          let nextStreak = state.globalStats.currentStreak;
          if (!previousDateKey) {
            nextStreak = 1;
          } else {
            const dayDifference = calculateDayDifference(previousDateKey, todayKey);
            if (dayDifference > 1) {
              nextStreak = 1;
            } else if (dayDifference === 1) {
              nextStreak += 1;
            }
          }

          const shouldCreateQuickArchive = session.durationType === 'quick';
          const quickSessionId = nanoid();
          const quickSessions = shouldCreateQuickArchive
            ? {
                ...state.quickSessions,
                [quickSessionId]: {
                  id: quickSessionId,
                  sessionId: session.sessionId,
                  question: session.topic,
                  answer: finalSummary,
                  createdAt: session.startedAt,
                  resolvedAt: completedAt,
                  relatedTopics: session.concepts.map((concept) => concept.name).slice(0, 5),
                  savedToPath: session.learningPathId,
                },
              }
            : state.quickSessions;

          const linkedPathId = session.learningPathId;
          const path = linkedPathId ? state.learningPaths[linkedPathId] : undefined;
          const learningPaths =
            path && linkedPathId
              ? {
                  ...state.learningPaths,
                  [linkedPathId]: recordStudySession(path, durationMs),
                }
              : state.learningPaths;

          completed = true;
          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                currentPhase: 'summary',
                progress: 100,
                completedAt,
                lastActivityAt: completedAt,
                finalSummary,
                keyTakeaways,
              },
            },
            learningPaths,
            quickSessions,
            globalStats: {
              ...state.globalStats,
              totalSessions: state.globalStats.totalSessions + 1,
              totalTimeSpentMs: state.globalStats.totalTimeSpentMs + durationMs,
              conceptsMastered: state.globalStats.conceptsMastered + masteredConcepts,
              currentStreak: nextStreak,
              longestStreak: Math.max(state.globalStats.longestStreak, nextStreak),
              lastActiveDate: todayKey,
              quickSessionsCount:
                state.globalStats.quickSessionsCount + (shouldCreateQuickArchive ? 1 : 0),
              journeySessionsCount:
                state.globalStats.journeySessionsCount + (session.durationType === 'journey' ? 1 : 0),
            },
          };
        });

        if (completed) {
          get().checkAndAwardAchievements();
        }
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
                    sq.id === subQuestionId && sq.status === 'pending' ? 'in_progress' : sq.status,
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
                  sq.id === subQuestionId ? { ...sq, userAttempts: sq.userAttempts + 1 } : sq
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

      // Session queries
      getAllSessions: () => {
        return Object.values(get().sessions);
      },

      getCompletedSessions: () => {
        return Object.values(get().sessions).filter((s) => s.completedAt);
      },

      // Notes management
      addNote: (learningSessionId: string, content: string, subQuestionId?: string) => {
        const note: LearningNote = {
          id: nanoid(),
          content,
          createdAt: new Date(),
          subQuestionId,
          isHighlight: false,
        };

        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                notes: [...session.notes, note],
                lastActivityAt: new Date(),
              },
            },
          };
        });

        return note;
      },

      updateNote: (learningSessionId: string, noteId: string, updates: Partial<LearningNote>) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                notes: session.notes.map((n) => (n.id === noteId ? { ...n, ...updates } : n)),
                lastActivityAt: new Date(),
              },
            },
          };
        });
      },

      deleteNote: (learningSessionId: string, noteId: string) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                notes: session.notes.filter((n) => n.id !== noteId),
                lastActivityAt: new Date(),
              },
            },
          };
        });
      },

      toggleNoteHighlight: (learningSessionId: string, noteId: string) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                notes: session.notes.map((n) =>
                  n.id === noteId ? { ...n, isHighlight: !n.isHighlight } : n
                ),
              },
            },
          };
        });
      },

      // Concept tracking
      addConcept: (learningSessionId: string, name: string, description?: string) => {
        const concept: KnowledgeConcept = {
          id: nanoid(),
          name,
          description,
          masteryStatus: 'learning',
          masteryScore: 0,
          reviewCount: 0,
          correctAnswers: 0,
          totalAttempts: 0,
        };

        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                concepts: [...session.concepts, concept],
                lastActivityAt: new Date(),
              },
            },
          };
        });

        return concept;
      },

      updateConceptMastery: (learningSessionId: string, conceptId: string, correct: boolean) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                concepts: session.concepts.map((c) => {
                  if (c.id !== conceptId) return c;

                  const newCorrect = c.correctAnswers + (correct ? 1 : 0);
                  const newTotal = c.totalAttempts + 1;
                  const newScore = Math.round((newCorrect / newTotal) * 100);

                  let newStatus = c.masteryStatus;
                  if (newScore >= 90 && newTotal >= 5) {
                    newStatus = 'mastered';
                  } else if (newScore >= 60) {
                    newStatus = 'practicing';
                  } else if (newTotal > 0) {
                    newStatus = 'learning';
                  }

                  return {
                    ...c,
                    correctAnswers: newCorrect,
                    totalAttempts: newTotal,
                    masteryScore: newScore,
                    masteryStatus: newStatus,
                    lastPracticedAt: new Date(),
                  };
                }),
                lastActivityAt: new Date(),
              },
            },
          };
        });
      },

      getConceptsForReview: (learningSessionId: string) => {
        const session = get().sessions[learningSessionId];
        if (!session) return [];

        const now = new Date();
        return session.concepts.filter((c) => {
          if (!c.nextReviewAt) return c.masteryStatus !== 'mastered';
          return new Date(c.nextReviewAt) <= now;
        });
      },

      // Review items (spaced repetition with SM-2 algorithm)
      addReviewItem: (learningSessionId: string, item: Omit<ReviewItem, 'id'>) => {
        const reviewItem: ReviewItem = {
          ...item,
          id: nanoid(),
        };

        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                reviewItems: [...session.reviewItems, reviewItem],
              },
            },
          };
        });

        return reviewItem;
      },

      updateReviewItem: (learningSessionId: string, itemId: string, quality: number) => {
        // SM-2 algorithm implementation
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                reviewItems: session.reviewItems.map((item) => {
                  if (item.id !== itemId) return item;

                  // SM-2 algorithm
                  let { easeFactor, interval, repetitions } = item;

                  if (quality >= 3) {
                    // Correct response
                    if (repetitions === 0) {
                      interval = 1;
                    } else if (repetitions === 1) {
                      interval = 6;
                    } else {
                      interval = Math.round(interval * easeFactor);
                    }
                    repetitions += 1;
                  } else {
                    // Incorrect response - reset
                    repetitions = 0;
                    interval = 1;
                  }

                  // Update ease factor
                  easeFactor = Math.max(
                    1.3,
                    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
                  );

                  const nextReviewAt = new Date();
                  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

                  return {
                    ...item,
                    easeFactor,
                    interval,
                    repetitions,
                    nextReviewAt,
                    lastReviewedAt: new Date(),
                  };
                }),
              },
            },
          };
        });
      },

      getDueReviewItems: () => {
        const now = new Date();
        const allItems: ReviewItem[] = [];

        Object.values(get().sessions).forEach((session) => {
          session.reviewItems.forEach((item) => {
            if (new Date(item.nextReviewAt) <= now) {
              allItems.push(item);
            }
          });
        });

        return allItems;
      },

      // Statistics
      updateStatistics: (learningSessionId: string, updates: Partial<LearningStatistics>) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                statistics: { ...session.statistics, ...updates },
                lastActivityAt: new Date(),
              },
            },
          };
        });
      },

      recordAnswer: (learningSessionId: string, correct: boolean, responseTimeMs: number) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          const stats = session.statistics;
          const newQuestionsAnswered = stats.questionsAnswered + 1;
          const newCorrect = stats.correctAnswers + (correct ? 1 : 0);
          const newAvgTime = Math.round(
            (stats.averageResponseTimeMs * stats.questionsAnswered + responseTimeMs) /
              newQuestionsAnswered
          );

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                statistics: {
                  ...stats,
                  questionsAnswered: newQuestionsAnswered,
                  correctAnswers: newCorrect,
                  averageResponseTimeMs: newAvgTime,
                },
                consecutiveCorrect: correct ? session.consecutiveCorrect + 1 : 0,
                consecutiveIncorrect: correct ? 0 : session.consecutiveIncorrect + 1,
                lastActivityAt: new Date(),
              },
            },
          };
        });

        // Check if difficulty should be adjusted
        if (get().config.enableAdaptiveDifficulty) {
          get().adjustDifficulty(learningSessionId);
        }
      },

      updateEngagement: (learningSessionId: string, engaged: boolean) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          const delta = engaged ? 5 : -10;
          const newScore = Math.max(0, Math.min(100, session.engagementScore + delta));

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                engagementScore: newScore,
              },
            },
          };
        });
      },

      // Adaptive difficulty
      adjustDifficulty: (learningSessionId: string) => {
        const session = get().sessions[learningSessionId];
        if (!session) return;

        const { difficultyAdjustThreshold } = get().config;
        const difficulties: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
        const currentIndex = difficulties.indexOf(session.currentDifficulty);

        let newDifficulty = session.currentDifficulty;

        if (
          session.consecutiveCorrect >= difficultyAdjustThreshold &&
          currentIndex < difficulties.length - 1
        ) {
          newDifficulty = difficulties[currentIndex + 1];
        } else if (session.consecutiveIncorrect >= difficultyAdjustThreshold && currentIndex > 0) {
          newDifficulty = difficulties[currentIndex - 1];
        }

        if (newDifficulty !== session.currentDifficulty) {
          set((state) => ({
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...state.sessions[learningSessionId],
                currentDifficulty: newDifficulty,
                adaptiveAdjustments: session.adaptiveAdjustments + 1,
                consecutiveCorrect: 0,
                consecutiveIncorrect: 0,
              },
            },
          }));
        }
      },

      setDifficulty: (learningSessionId: string, difficulty: DifficultyLevel) => {
        set((state) => {
          const session = state.sessions[learningSessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [learningSessionId]: {
                ...session,
                currentDifficulty: difficulty,
                lastActivityAt: new Date(),
              },
            },
          };
        });
      },

      // Achievements
      checkAndAwardAchievements: () => {
        const state = get();
        const newAchievements: LearningAchievement[] = [];
        const completedSessions = Object.values(state.sessions).filter((s) => s.completedAt);

        // First session achievement
        if (
          completedSessions.length === 1 &&
          !state.achievements.find((a) => a.type === 'explorer')
        ) {
          newAchievements.push({
            id: nanoid(),
            type: 'explorer',
            name: 'First Steps',
            description: 'Complete your first learning session',
            iconName: 'Rocket',
            earnedAt: new Date(),
          });
        }

        // Scholar achievement (10 sessions)
        if (
          completedSessions.length >= 10 &&
          !state.achievements.find((a) => a.name === 'Scholar')
        ) {
          newAchievements.push({
            id: nanoid(),
            type: 'scholar',
            name: 'Scholar',
            description: 'Complete 10 learning sessions',
            iconName: 'GraduationCap',
            earnedAt: new Date(),
          });
        }

        // Quick learner achievement
        const quickSession = completedSessions.find((s) => {
          if (!s.completedAt) return false;
          const duration = new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime();
          return duration < 15 * 60 * 1000; // Under 15 minutes
        });
        if (quickSession && !state.achievements.find((a) => a.type === 'speed')) {
          newAchievements.push({
            id: nanoid(),
            type: 'speed',
            name: 'Quick Learner',
            description: 'Complete a session in under 15 minutes',
            iconName: 'Zap',
            earnedAt: new Date(),
          });
        }

        if (newAchievements.length > 0) {
          set((state) => ({
            achievements: [...state.achievements, ...newAchievements],
          }));
        }
      },

      getAchievements: () => {
        return get().achievements;
      },

      // Learning path management
      createPath: (sessionId: string, input: CreateLearningPathInput) => {
        const path = createLearningPath(sessionId, input);

        set((state) => ({
          learningPaths: { ...state.learningPaths, [path.id]: path },
          activeLearningPathId: path.id,
        }));

        return path;
      },

      getPath: (pathId: string) => {
        return get().learningPaths[pathId];
      },

      getAllPaths: () => {
        return Object.values(get().learningPaths);
      },

      getActivePaths: () => {
        return Object.values(get().learningPaths).filter((p) => !p.completedAt);
      },

      setActivePath: (pathId: string | null) => {
        set({ activeLearningPathId: pathId });
      },

      deletePath: (pathId: string) => {
        set((state) => {
          const { [pathId]: _, ...rest } = state.learningPaths;
          return {
            learningPaths: rest,
            activeLearningPathId:
              state.activeLearningPathId === pathId ? null : state.activeLearningPathId,
          };
        });
      },

      updatePathMilestone: (pathId: string, milestoneId: string, progress: number) => {
        set((state) => {
          const path = state.learningPaths[pathId];
          if (!path) return state;

          const updatedPath = updateMilestoneProgress(path, milestoneId, progress);

          return {
            learningPaths: { ...state.learningPaths, [pathId]: updatedPath },
            globalStats: updatedPath.completedAt
              ? { ...state.globalStats, pathsCompleted: state.globalStats.pathsCompleted + 1 }
              : state.globalStats,
          };
        });
      },

      completeMilestone: (pathId: string, milestoneId: string) => {
        get().updatePathMilestone(pathId, milestoneId, 100);
      },

      recordPathSession: (pathId: string, durationMs: number) => {
        set((state) => {
          const path = state.learningPaths[pathId];
          if (!path) return state;

          const updatedPath = recordStudySession(path, durationMs);

          return {
            learningPaths: { ...state.learningPaths, [pathId]: updatedPath },
            globalStats: {
              ...state.globalStats,
              totalTimeSpentMs: state.globalStats.totalTimeSpentMs + durationMs,
            },
          };
        });
      },

      getPathBySession: (sessionId: string) => {
        return Object.values(get().learningPaths).find((p) => p.sessionId === sessionId);
      },

      // Quick learning sessions
      saveQuickSession: (sessionId: string, question: string, answer?: string) => {
        const now = new Date();
        const quickSession: QuickLearningSession = {
          id: nanoid(),
          sessionId,
          question,
          answer,
          createdAt: now,
          resolvedAt: answer ? now : undefined,
        };

        set((state) => ({
          quickSessions: { ...state.quickSessions, [quickSession.id]: quickSession },
          globalStats: {
            ...state.globalStats,
            quickSessionsCount: state.globalStats.quickSessionsCount + 1,
          },
        }));

        return quickSession;
      },

      getQuickSession: (id: string) => {
        return get().quickSessions[id];
      },

      getAllQuickSessions: () => {
        return Object.values(get().quickSessions);
      },

      linkQuickToPath: (quickSessionId: string, pathId: string) => {
        set((state) => {
          const quickSession = state.quickSessions[quickSessionId];
          if (!quickSession) return state;

          return {
            quickSessions: {
              ...state.quickSessions,
              [quickSessionId]: { ...quickSession, savedToPath: pathId },
            },
          };
        });
      },

      // Learning type utilities
      detectType: (topic: string) => {
        const result = detectLearningType(topic);
        return result.detectedType;
      },

      getSessionsByType: (type: LearningDurationType) => {
        return Object.values(get().sessions).filter((s) => s.durationType === type);
      },

      // Prompt template CRUD
      addPromptTemplate: (template) => {
        const id = nanoid();
        const now = new Date().toISOString();
        const newTemplate: PromptTemplate = {
          ...template,
          id,
          isBuiltIn: false,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          promptTemplates: { ...state.promptTemplates, [id]: newTemplate },
        }));
        return newTemplate;
      },

      updatePromptTemplate: (id, updates) => {
        set((state) => {
          const existing = state.promptTemplates[id];
          if (!existing || existing.isBuiltIn) return state;
          return {
            promptTemplates: {
              ...state.promptTemplates,
              [id]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
            },
          };
        });
      },

      deletePromptTemplate: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.promptTemplates;
          const config =
            state.config.activeTemplateId === id
              ? { ...state.config, activeTemplateId: 'builtin-socratic' }
              : state.config;
          return { promptTemplates: rest, config };
        });
      },

      exportPromptTemplates: () => {
        const state = get();
        const exportData = {
          version: 1,
          exportedAt: new Date().toISOString(),
          templates: Object.values(state.promptTemplates).filter((t) => !t.isBuiltIn),
          config: {
            activeTemplateId: state.config.activeTemplateId,
            promptLanguage: state.config.promptLanguage,
            responseLanguage: state.config.responseLanguage,
            mentorPersonality: state.config.mentorPersonality,
            subjectContext: state.config.subjectContext,
            customEncouragementMessages: state.config.customEncouragementMessages,
            customCelebrationMessages: state.config.customCelebrationMessages,
          },
        };
        return JSON.stringify(exportData, null, 2);
      },

      importPromptTemplates: (json: string) => {
        const errors: string[] = [];
        let imported = 0;
        try {
          const data = JSON.parse(json);
          if (!data || typeof data !== 'object') {
            return { imported: 0, errors: ['Invalid JSON format'] };
          }

          const templates = Array.isArray(data.templates) ? data.templates : [];
          const MAX_PROMPT_LENGTH = 10000;

          for (const tpl of templates) {
            if (!tpl.name || !tpl.basePrompt) {
              errors.push(`Skipped template: missing name or basePrompt`);
              continue;
            }
            if (tpl.basePrompt.length > MAX_PROMPT_LENGTH) {
              errors.push(`Skipped "${tpl.name}": basePrompt exceeds ${MAX_PROMPT_LENGTH} characters`);
              continue;
            }
            get().addPromptTemplate({
              name: tpl.name,
              description: tpl.description || '',
              approach: tpl.approach || 'custom',
              basePrompt: tpl.basePrompt,
              phaseOverrides: tpl.phaseOverrides,
              difficultyOverrides: tpl.difficultyOverrides,
              styleOverrides: tpl.styleOverrides,
              scenarioOverrides: tpl.scenarioOverrides,
              understandingOverrides: tpl.understandingOverrides,
              language: tpl.language || 'en',
            });
            imported++;
          }

          if (data.config && typeof data.config === 'object') {
            const configUpdates: Partial<LearningModeConfig> = {};
            if (data.config.mentorPersonality) configUpdates.mentorPersonality = String(data.config.mentorPersonality);
            if (data.config.subjectContext) configUpdates.subjectContext = String(data.config.subjectContext);
            if (data.config.customEncouragementMessages && typeof data.config.customEncouragementMessages === 'object') {
              const validated: Record<string, string[]> = {};
              for (const [key, val] of Object.entries(data.config.customEncouragementMessages)) {
                if (Array.isArray(val) && val.every((v: unknown) => typeof v === 'string')) {
                  validated[key] = val as string[];
                }
              }
              if (Object.keys(validated).length > 0) configUpdates.customEncouragementMessages = validated;
            }
            if (data.config.customCelebrationMessages && typeof data.config.customCelebrationMessages === 'object') {
              const validated: Record<string, string[]> = {};
              for (const [key, val] of Object.entries(data.config.customCelebrationMessages)) {
                if (Array.isArray(val) && val.every((v: unknown) => typeof v === 'string')) {
                  validated[key] = val as string[];
                }
              }
              if (Object.keys(validated).length > 0) configUpdates.customCelebrationMessages = validated;
            }
            if (Object.keys(configUpdates).length > 0) {
              get().updateConfig(configUpdates);
            }
          }
        } catch (e) {
          errors.push(`Parse error: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
        return { imported, errors };
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
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        const state = (persistedState || {}) as Record<string, unknown>;
        const globalStats =
          (state.globalStats as Record<string, unknown> | undefined) || {};

        if (version < 2) {
          state.globalStats = {
            totalSessions: Number(globalStats.totalSessions ?? 0),
            totalTimeSpentMs: Number(globalStats.totalTimeSpentMs ?? 0),
            conceptsMastered: Number(globalStats.conceptsMastered ?? 0),
            currentStreak: Number(globalStats.currentStreak ?? 0),
            longestStreak: Number(globalStats.longestStreak ?? 0),
            lastActiveDate:
              typeof globalStats.lastActiveDate === 'string'
                ? globalStats.lastActiveDate
                : undefined,
            quickSessionsCount: Number(globalStats.quickSessionsCount ?? 0),
            journeySessionsCount: Number(globalStats.journeySessionsCount ?? 0),
            pathsCompleted: Number(globalStats.pathsCompleted ?? 0),
          };
        }

        if (version < 3) {
          const config = (state.config as Record<string, unknown>) || {};
          config.activeTemplateId = config.activeTemplateId ?? 'builtin-socratic';
          config.promptLanguage = config.promptLanguage ?? 'auto';
          config.responseLanguage = config.responseLanguage ?? 'match-ui';
          state.config = config;
          state.promptTemplates = state.promptTemplates ?? {};
        }

        return state;
      },
      partialize: (state) => {
        // Limit quick sessions to last 50 to prevent storage bloat
        const quickSessionsArray = Object.entries(state.quickSessions);
        const limitedQuickSessions: Record<string, typeof state.quickSessions[string]> = {};
        if (quickSessionsArray.length > 50) {
          // Sort by creation time and keep last 50
          const sorted = quickSessionsArray.sort((a, b) => {
            const aTime = new Date(a[1].createdAt).getTime();
            const bTime = new Date(b[1].createdAt).getTime();
            return bTime - aTime;
          }).slice(0, 50);
          for (const [key, value] of sorted) {
            limitedQuickSessions[key] = value;
          }
        } else {
          Object.assign(limitedQuickSessions, state.quickSessions);
        }
        return {
          sessions: state.sessions,
          config: state.config,
          learningPaths: state.learningPaths,
          quickSessions: limitedQuickSessions,
          achievements: state.achievements,
          globalStats: state.globalStats,
          promptTemplates: state.promptTemplates,
        };
      },
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
            session.notes = (session.notes || []).map((note) => ({
              ...note,
              createdAt: new Date(note.createdAt),
            }));
            session.concepts = (session.concepts || []).map((concept) => ({
              ...concept,
              lastPracticedAt: concept.lastPracticedAt ? new Date(concept.lastPracticedAt) : undefined,
              nextReviewAt: concept.nextReviewAt ? new Date(concept.nextReviewAt) : undefined,
            }));
            session.reviewItems = (session.reviewItems || []).map((reviewItem) => ({
              ...reviewItem,
              nextReviewAt: new Date(reviewItem.nextReviewAt),
              lastReviewedAt: reviewItem.lastReviewedAt ? new Date(reviewItem.lastReviewedAt) : undefined,
            }));
          }
        }
        if (state?.achievements) {
          state.achievements = state.achievements.map((achievement) => ({
            ...achievement,
            earnedAt: new Date(achievement.earnedAt),
          }));
        }
        if (state?.learningPaths) {
          for (const pathId in state.learningPaths) {
            const path = state.learningPaths[pathId];
            path.startedAt = new Date(path.startedAt);
            path.lastActivityAt = new Date(path.lastActivityAt);
            path.completedAt = path.completedAt ? new Date(path.completedAt) : undefined;
            path.targetCompletionDate = path.targetCompletionDate
              ? new Date(path.targetCompletionDate)
              : undefined;
            path.milestones = (path.milestones || []).map((milestone) => ({
              ...milestone,
              targetDate: milestone.targetDate ? new Date(milestone.targetDate) : undefined,
              completedAt: milestone.completedAt ? new Date(milestone.completedAt) : undefined,
            }));
          }
        }
        if (state?.quickSessions) {
          for (const quickSessionId in state.quickSessions) {
            const quickSession = state.quickSessions[quickSessionId];
            quickSession.createdAt = new Date(quickSession.createdAt);
            quickSession.resolvedAt = quickSession.resolvedAt
              ? new Date(quickSession.resolvedAt)
              : undefined;
          }
        }
      },
    }
  )
);

// Selectors
export const selectLearningSession = (learningSessionId: string) => (state: LearningState) =>
  state.sessions[learningSessionId];

export const selectActiveLearningSession = (state: LearningState) =>
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
