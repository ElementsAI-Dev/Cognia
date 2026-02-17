/**
 * SpeedPass Store - Zustand state management for Speed Learning Mode
 *
 * Manages textbooks, knowledge points, tutorials, quizzes, and study sessions.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { DEFAULT_SPEEDPASS_USER_ID } from '@/types/learning/speedpass';
import type {
  University,
  Major,
  Course,
  UserAcademicProfile,
  Textbook,
  TextbookChapter,
  TextbookKnowledgePoint,
  TextbookQuestion,
  UserTextbook,
  CourseTextbookMapping,
  TeacherKeyPointInput,
  TeacherKeyPointResult,
  SpeedLearningTutorial,
  SpeedStudySession,
  Quiz,
  WrongQuestionRecord,
  StudyReport,
  TextbookParseStatus,
  StartSpeedLearningInput,
  CreateQuizInput,
  SpeedPassPersistedState,
} from '@/types/learning/speedpass';
import { generateTutorial } from '@/lib/learning/speedpass/tutorial-generator';
import { matchTeacherKeyPoints as matchTeacherKeyPointsLocally } from '@/lib/learning/speedpass/knowledge-matcher';
import { speedpassRuntime } from '@/lib/native/speedpass-runtime';
import { isTauri } from '@/lib/utils';
import { loggers } from '@/lib/logger';

// ============================================================================
// Store Interface
// ============================================================================

export interface SpeedPassState {
  // User Academic Profile
  academicProfile: UserAcademicProfile | null;
  universities: University[];
  majors: Major[];
  courses: Course[];

  // Textbooks
  textbooks: Record<string, Textbook>;
  textbookChapters: Record<string, TextbookChapter[]>;
  textbookKnowledgePoints: Record<string, TextbookKnowledgePoint[]>;
  textbookQuestions: Record<string, TextbookQuestion[]>;
  userTextbooks: UserTextbook[];
  courseTextbookMappings: CourseTextbookMapping[];

  // Current selections
  currentTextbookId: string | null;
  currentChapterId: string | null;

  // Teacher Key Points
  teacherKeyPointResults: Record<string, TeacherKeyPointResult>;

  // Tutorials
  tutorials: Record<string, SpeedLearningTutorial>;
  currentTutorialId: string | null;

  // Study Sessions
  studySessions: Record<string, SpeedStudySession>;
  currentSessionId: string | null;

  // Quizzes
  quizzes: Record<string, Quiz>;
  currentQuizId: string | null;

  // Wrong Question Book
  wrongQuestions: Record<string, WrongQuestionRecord>;

  // Study Reports
  studyReports: StudyReport[];

  // Statistics
  globalStats: {
    totalStudyTimeMs: number;
    sessionsCompleted: number;
    tutorialsCompleted: number;
    quizzesCompleted: number;
    totalQuestionsAttempted: number;
    totalQuestionsCorrect: number;
    averageAccuracy: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate?: string;
  };

  // User Profile (for SpeedPass preferences)
  userProfile: {
    id: string;
    displayName: string;
    preferredMode: 'extreme' | 'speed' | 'comprehensive';
    studyGoal: 'passing' | 'good' | 'excellent';
    dailyStudyTarget: number;
    reminderEnabled: boolean;
    reminderTime?: string;
  } | null;

  // Loading states
  isLoading: boolean;
  parseProgress: {
    textbookId: string;
    status: TextbookParseStatus;
    progress: number;
    message?: string;
  } | null;
  error: string | null;

  // ============================================================================
  // Actions - User Profile
  // ============================================================================
  setUserProfile: (profile: SpeedPassState['userProfile']) => void;

  // ============================================================================
  // Actions - Academic Profile
  // ============================================================================
  setAcademicProfile: (profile: UserAcademicProfile) => void;
  updateAcademicProfile: (updates: Partial<UserAcademicProfile>) => void;
  addEnrolledCourse: (courseId: string) => void;
  removeEnrolledCourse: (courseId: string) => void;

  // ============================================================================
  // Actions - Universities, Majors, Courses
  // ============================================================================
  setUniversities: (universities: University[]) => void;
  setMajors: (majors: Major[]) => void;
  setCourses: (courses: Course[]) => void;
  addCourse: (course: Course) => void;

  // ============================================================================
  // Actions - Textbooks
  // ============================================================================
  addTextbook: (textbook: Textbook) => void;
  updateTextbook: (textbookId: string, updates: Partial<Textbook>) => void;
  removeTextbook: (textbookId: string) => void;
  setCurrentTextbook: (textbookId: string | null) => void;

  // Textbook content
  setTextbookChapters: (textbookId: string, chapters: TextbookChapter[]) => void;
  setTextbookKnowledgePoints: (textbookId: string, points: TextbookKnowledgePoint[]) => void;
  setTextbookQuestions: (textbookId: string, questions: TextbookQuestion[]) => void;

  // User textbooks
  addUserTextbook: (userTextbook: Omit<UserTextbook, 'id' | 'addedAt'>) => UserTextbook;
  removeUserTextbook: (userTextbookId: string) => void;
  updateUserTextbookProgress: (userTextbookId: string, progress: number) => void;

  // Course-Textbook mappings
  addCourseTextbookMapping: (
    mapping: Omit<CourseTextbookMapping, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  getRecommendedTextbooks: (courseId: string, universityId?: string) => Textbook[];

  // Parse progress
  setParseProgress: (
    progress: {
      textbookId: string;
      status: TextbookParseStatus;
      progress: number;
      message?: string;
    } | null
  ) => void;

  // ============================================================================
  // Actions - Teacher Key Points
  // ============================================================================
  processTeacherKeyPoints: (input: TeacherKeyPointInput) => Promise<TeacherKeyPointResult>;
  getTeacherKeyPointResult: (inputId: string) => TeacherKeyPointResult | undefined;

  // ============================================================================
  // Actions - Tutorials
  // ============================================================================
  createTutorial: (input: StartSpeedLearningInput) => Promise<SpeedLearningTutorial>;
  getTutorial: (tutorialId: string) => SpeedLearningTutorial | undefined;
  setCurrentTutorial: (tutorialId: string | null) => void;
  updateTutorialProgress: (tutorialId: string, sectionId: string) => void;
  completeTutorial: (tutorialId: string) => void;
  deleteTutorial: (tutorialId: string) => void;

  // ============================================================================
  // Actions - Study Sessions
  // ============================================================================
  startStudySession: (tutorialId: string) => SpeedStudySession;
  pauseStudySession: (sessionId: string) => void;
  resumeStudySession: (sessionId: string) => void;
  endStudySession: (sessionId: string) => void;
  updateSessionProgress: (sessionId: string, updates: Partial<SpeedStudySession>) => void;
  getActiveSession: () => SpeedStudySession | undefined;

  // ============================================================================
  // Actions - Quizzes
  // ============================================================================
  createQuiz: (input: CreateQuizInput) => Quiz;
  startQuiz: (quizId: string) => void;
  answerQuestion: (quizId: string, questionIndex: number, answer: string) => void;
  useHint: (quizId: string, questionIndex: number) => string | undefined;
  nextQuestion: (quizId: string) => void;
  previousQuestion: (quizId: string) => void;
  completeQuiz: (quizId: string) => void;
  getQuizResults: (
    quizId: string
  ) => { score: number; accuracy: number; wrongQuestions: string[] } | undefined;

  // ============================================================================
  // Actions - Wrong Question Book
  // ============================================================================
  addWrongQuestion: (questionId: string, textbookId: string, userAnswer: string) => void;
  markWrongQuestionReviewed: (recordId: string, isCorrect: boolean) => void;
  getWrongQuestionsForReview: () => WrongQuestionRecord[];
  getWrongQuestionsByTextbook: (textbookId: string) => WrongQuestionRecord[];

  // ============================================================================
  // Actions - Study Reports
  // ============================================================================
  generateStudyReport: (sessionId?: string, tutorialId?: string) => StudyReport;
  getRecentReports: (limit?: number) => StudyReport[];

  // ============================================================================
  // Actions - Statistics
  // ============================================================================
  updateGlobalStats: (updates: Partial<SpeedPassState['globalStats']>) => void;
  recordStudyTime: (durationMs: number) => void;

  // ============================================================================
  // Actions - Utility
  // ============================================================================
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  hydrateFromSnapshot: (snapshot: SpeedPassPersistedState) => void;
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  academicProfile: null,
  universities: [],
  majors: [],
  courses: [],

  textbooks: {},
  textbookChapters: {},
  textbookKnowledgePoints: {},
  textbookQuestions: {},
  userTextbooks: [],
  courseTextbookMappings: [],

  currentTextbookId: null,
  currentChapterId: null,

  teacherKeyPointResults: {},

  tutorials: {},
  currentTutorialId: null,

  studySessions: {},
  currentSessionId: null,

  quizzes: {},
  currentQuizId: null,

  wrongQuestions: {},

  studyReports: [],

  globalStats: {
    totalStudyTimeMs: 0,
    sessionsCompleted: 0,
    tutorialsCompleted: 0,
    quizzesCompleted: 0,
    totalQuestionsAttempted: 0,
    totalQuestionsCorrect: 0,
    averageAccuracy: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: undefined,
  },

  userProfile: null,

  isLoading: false,
  parseProgress: null,
  error: null,
};

const log = loggers.store;

type PersistedSpeedPassFields = Pick<
  SpeedPassState,
  | 'academicProfile'
  | 'textbooks'
  | 'textbookChapters'
  | 'textbookKnowledgePoints'
  | 'textbookQuestions'
  | 'userTextbooks'
  | 'courseTextbookMappings'
  | 'tutorials'
  | 'studySessions'
  | 'quizzes'
  | 'wrongQuestions'
  | 'studyReports'
  | 'globalStats'
  | 'userProfile'
>;

function resolveSpeedPassUserId(candidate?: string | null): string {
  const normalized = (candidate || '').trim();
  return normalized.length > 0 ? normalized : DEFAULT_SPEEDPASS_USER_ID;
}

export function extractSpeedPassPersistedState(
  state: PersistedSpeedPassFields
): SpeedPassPersistedState {
  return {
    academicProfile: state.academicProfile,
    textbooks: state.textbooks,
    textbookChapters: state.textbookChapters,
    textbookKnowledgePoints: state.textbookKnowledgePoints,
    textbookQuestions: state.textbookQuestions,
    userTextbooks: state.userTextbooks,
    courseTextbookMappings: state.courseTextbookMappings,
    tutorials: state.tutorials,
    studySessions: state.studySessions,
    quizzes: state.quizzes,
    wrongQuestions: state.wrongQuestions,
    studyReports: state.studyReports,
    globalStats: state.globalStats,
    userProfile: state.userProfile,
  };
}

export function isSpeedPassPersistedSnapshotEmpty(
  snapshot: SpeedPassPersistedState | null | undefined
): boolean {
  if (!snapshot) {
    return true;
  }

  return (
    Object.keys(snapshot.textbooks || {}).length === 0 &&
    Object.keys(snapshot.tutorials || {}).length === 0 &&
    Object.keys(snapshot.studySessions || {}).length === 0 &&
    Object.keys(snapshot.quizzes || {}).length === 0 &&
    Object.keys(snapshot.wrongQuestions || {}).length === 0 &&
    (snapshot.studyReports || []).length === 0 &&
    (snapshot.userTextbooks || []).length === 0
  );
}

function extractTeacherNotes(input: TeacherKeyPointInput): string[] {
  const notesFromText = (input.textContent || '')
    .split(/[;\n；。！？!?]/g)
    .map((note) => note.trim())
    .filter((note) => note.length > 0);

  const notes: string[] = [];
  for (const note of notesFromText) {
    if (!notes.includes(note)) {
      notes.push(note);
    }
  }

  if (input.userNote?.trim() && !notes.includes(input.userNote.trim())) {
    notes.push(input.userNote.trim());
  }

  return notes;
}

function parseChapterNumberAsInt(chapterNumber: string | undefined, fallback: number): number {
  if (!chapterNumber) {
    return fallback;
  }

  const head = chapterNumber.split('.')[0] || chapterNumber;
  const numeric = Number.parseInt(head.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function buildLocalTeacherKeyPointResult(params: {
  notes: string[];
  knowledgePoints: TextbookKnowledgePoint[];
  chapters: TextbookChapter[];
  questions: TextbookQuestion[];
  threshold: number;
}): TeacherKeyPointResult {
  const { notes, knowledgePoints, chapters, questions, threshold } = params;
  const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const chapterNumberById = new Map(
    chapters.map((chapter, index) => [
      chapter.id,
      parseChapterNumberAsInt(chapter.chapterNumber, chapter.orderIndex || index + 1),
    ])
  );

  const chapterExampleQuestionIds = new Set<string>();
  const chapterExerciseQuestionIds = new Set<string>();
  const chapterNumbers = new Set<number>();
  const matchedPoints: TeacherKeyPointResult['matchedPoints'] = [];
  const unmatchedNotes: string[] = [];

  for (const note of notes) {
    const matches = matchTeacherKeyPointsLocally(note, knowledgePoints, {
      minMatchScore: threshold,
      maxMatches: 1,
      includePartialMatches: true,
      prioritizeExactMatches: true,
    });
    const topMatch = matches[0]?.matches[0];
    if (!topMatch || topMatch.matchScore < threshold) {
      unmatchedNotes.push(note);
      continue;
    }

    const matchedKnowledgePoint = topMatch.knowledgePoint;
    const chapter = chapterById.get(matchedKnowledgePoint.chapterId);
    const chapterNumber = chapterNumberById.get(matchedKnowledgePoint.chapterId) || 1;
    chapterNumbers.add(chapterNumber);

    const relatedExamples = questions
      .filter(
        (question) =>
          question.sourceType === 'example' &&
          Array.isArray(question.knowledgePointIds) &&
          question.knowledgePointIds.includes(matchedKnowledgePoint.id)
      )
      .slice(0, 5)
      .map((question) => {
        chapterExampleQuestionIds.add(question.id);
        return {
          id: question.id,
          title: question.questionNumber || question.content.slice(0, 48),
          page: question.pageNumber || matchedKnowledgePoint.pageNumber || 0,
          difficulty: question.difficulty || 0,
        };
      });

    const relatedExercises = questions
      .filter(
        (question) =>
          question.sourceType !== 'example' &&
          Array.isArray(question.knowledgePointIds) &&
          question.knowledgePointIds.includes(matchedKnowledgePoint.id)
      )
      .slice(0, 8)
      .map((question) => {
        chapterExerciseQuestionIds.add(question.id);
        return question.id;
      });

    const relatedDefinitions = knowledgePoints
      .filter(
        (knowledgePoint) =>
          knowledgePoint.chapterId === matchedKnowledgePoint.chapterId &&
          knowledgePoint.type === 'definition' &&
          knowledgePoint.id !== matchedKnowledgePoint.id
      )
      .slice(0, 3)
      .map((knowledgePoint) => knowledgePoint.title);

    matchedPoints.push({
      teacherNote: note,
      matchedKnowledgePoint,
      matchConfidence: Math.round(topMatch.matchScore * 100) / 100,
      chapter: {
        number: chapter?.chapterNumber || `${chapterNumber}`,
        title: chapter?.title || '未知章节',
      },
      pageRange:
        chapter && Number.isFinite(chapter.pageStart) && Number.isFinite(chapter.pageEnd)
          ? `P${chapter.pageStart}-P${chapter.pageEnd}`
          : `P${matchedKnowledgePoint.pageNumber || 0}`,
      relatedDefinitions,
      relatedFormulas: Array.isArray(matchedKnowledgePoint.formulas)
        ? matchedKnowledgePoint.formulas.length
        : 0,
      relatedExamples,
      relatedExercises,
    });
  }

  const totalKnowledgePoints = matchedPoints.length;
  const totalExamples = chapterExampleQuestionIds.size;
  const totalExercises = chapterExerciseQuestionIds.size;
  const estimatedMinutes = Math.max(20, totalKnowledgePoints * 18 + totalExamples * 5 + totalExercises * 7);
  const estimatedHours = Math.round((estimatedMinutes / 60) * 10) / 10;

  return {
    status:
      matchedPoints.length === 0 ? 'failed' : unmatchedNotes.length === 0 ? 'success' : 'partial',
    matchedPoints,
    unmatchedNotes,
    textbookCoverage: {
      chaptersInvolved: Array.from(chapterNumbers.values()).sort((a, b) => a - b),
      totalExamples,
      totalExercises,
    },
    studyPlanSuggestion: {
      totalKnowledgePoints,
      totalExamples,
      totalExercises,
      estimatedTime: `${estimatedHours}小时`,
    },
  };
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useSpeedPassStore = create<SpeedPassState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========================================================================
      // User Profile Actions
      // ========================================================================

      setUserProfile: (profile) => {
        if (!profile) {
          set({ userProfile: null });
          return;
        }

        set({
          userProfile: {
            ...profile,
            id: resolveSpeedPassUserId(profile.id),
          },
        });
      },

      // ========================================================================
      // Academic Profile Actions
      // ========================================================================

      setAcademicProfile: (profile) => {
        set({ academicProfile: profile });
      },

      updateAcademicProfile: (updates) => {
        set((state) => ({
          academicProfile: state.academicProfile ? { ...state.academicProfile, ...updates } : null,
        }));
      },

      addEnrolledCourse: (courseId) => {
        set((state) => {
          if (!state.academicProfile) return state;
          if (state.academicProfile.enrolledCourses.includes(courseId)) return state;
          return {
            academicProfile: {
              ...state.academicProfile,
              enrolledCourses: [...state.academicProfile.enrolledCourses, courseId],
            },
          };
        });
      },

      removeEnrolledCourse: (courseId) => {
        set((state) => {
          if (!state.academicProfile) return state;
          return {
            academicProfile: {
              ...state.academicProfile,
              enrolledCourses: state.academicProfile.enrolledCourses.filter(
                (id) => id !== courseId
              ),
            },
          };
        });
      },

      // ========================================================================
      // Universities, Majors, Courses Actions
      // ========================================================================

      setUniversities: (universities) => set({ universities }),
      setMajors: (majors) => set({ majors }),
      setCourses: (courses) => set({ courses }),

      addCourse: (course) => {
        set((state) => ({
          courses: [...state.courses, course],
        }));
      },

      // ========================================================================
      // Textbook Actions
      // ========================================================================

      addTextbook: (textbook) => {
        set((state) => ({
          textbooks: { ...state.textbooks, [textbook.id]: textbook },
        }));
      },

      updateTextbook: (textbookId, updates) => {
        set((state) => {
          const textbook = state.textbooks[textbookId];
          if (!textbook) return state;
          return {
            textbooks: {
              ...state.textbooks,
              [textbookId]: { ...textbook, ...updates, updatedAt: new Date() },
            },
          };
        });
      },

      removeTextbook: (textbookId) => {
        set((state) => {
          const { [textbookId]: _, ...rest } = state.textbooks;
          return { textbooks: rest };
        });
      },

      setCurrentTextbook: (textbookId) => {
        set({ currentTextbookId: textbookId });
      },

      setTextbookChapters: (textbookId, chapters) => {
        set((state) => ({
          textbookChapters: { ...state.textbookChapters, [textbookId]: chapters },
        }));
      },

      setTextbookKnowledgePoints: (textbookId, points) => {
        set((state) => ({
          textbookKnowledgePoints: { ...state.textbookKnowledgePoints, [textbookId]: points },
        }));
      },

      setTextbookQuestions: (textbookId, questions) => {
        set((state) => ({
          textbookQuestions: { ...state.textbookQuestions, [textbookId]: questions },
        }));
      },

      addUserTextbook: (input) => {
        const userTextbook: UserTextbook = {
          id: nanoid(),
          ...input,
          userId: resolveSpeedPassUserId(input.userId),
          addedAt: new Date(),
        };
        set((state) => ({
          userTextbooks: [...state.userTextbooks, userTextbook],
        }));
        return userTextbook;
      },

      removeUserTextbook: (userTextbookId) => {
        set((state) => ({
          userTextbooks: state.userTextbooks.filter((t) => t.id !== userTextbookId),
        }));
      },

      updateUserTextbookProgress: (userTextbookId, progress) => {
        set((state) => ({
          userTextbooks: state.userTextbooks.map((t) =>
            t.id === userTextbookId
              ? { ...t, studyProgress: progress, lastAccessedAt: new Date() }
              : t
          ),
        }));
      },

      addCourseTextbookMapping: (mapping) => {
        const newMapping: CourseTextbookMapping = {
          id: nanoid(),
          ...mapping,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          courseTextbookMappings: [...state.courseTextbookMappings, newMapping],
        }));
      },

      getRecommendedTextbooks: (courseId, universityId) => {
        const state = get();
        const mappings = state.courseTextbookMappings.filter(
          (m) => m.courseId === courseId && (!universityId || m.universityId === universityId)
        );

        // Sort by isPrimary and usageCount
        mappings.sort((a, b) => {
          if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
          return b.usageCount - a.usageCount;
        });

        return mappings.map((m) => state.textbooks[m.textbookId]).filter(Boolean) as Textbook[];
      },

      setParseProgress: (progress) => {
        set({ parseProgress: progress });
      },

      // ========================================================================
      // Teacher Key Points Actions
      // ========================================================================

      processTeacherKeyPoints: async (input) => {
        const state = get();
        set({ isLoading: true, error: null });

        try {
          const textbookId = input.textbookId || state.currentTextbookId;
          if (!textbookId) {
            throw new Error('No textbook selected');
          }

          const knowledgePoints = state.textbookKnowledgePoints[textbookId] || [];
          const chapters = state.textbookChapters[textbookId] || [];
          const questions = state.textbookQuestions[textbookId] || [];
          const teacherNotes = extractTeacherNotes(input);

          if (teacherNotes.length === 0) {
            throw new Error('No teacher key points provided');
          }
          if (knowledgePoints.length === 0) {
            throw new Error('No textbook knowledge points available');
          }

          const threshold = 0.45;
          const resolvedUserId = resolveSpeedPassUserId(state.userProfile?.id);
          let result: TeacherKeyPointResult;

          if (isTauri()) {
            try {
              result = await speedpassRuntime.matchTeacherKeyPoints(
                {
                  textbookId,
                  teacherNotes,
                  aiEnhance: false,
                  confidenceOverride: threshold,
                },
                resolvedUserId
              );
            } catch (error) {
              log.warn('SpeedPass runtime keypoint match failed, using local fallback', { error });
              result = buildLocalTeacherKeyPointResult({
                notes: teacherNotes,
                knowledgePoints,
                chapters,
                questions,
                threshold,
              });
            }
          } else {
            result = buildLocalTeacherKeyPointResult({
              notes: teacherNotes,
              knowledgePoints,
              chapters,
              questions,
              threshold,
            });
          }

          const inputId = nanoid();
          set((state) => ({
            teacherKeyPointResults: {
              ...state.teacherKeyPointResults,
              [inputId]: result,
            },
            isLoading: false,
          }));

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      getTeacherKeyPointResult: (inputId) => {
        return get().teacherKeyPointResults[inputId];
      },

      // ========================================================================
      // Tutorial Actions
      // ========================================================================

      createTutorial: async (input) => {
        const state = get();
        set({ isLoading: true, error: null });

        try {
          const textbook = state.textbooks[input.textbookId];
          if (!textbook) {
            throw new Error('Textbook not found');
          }

          const knowledgePoints = state.textbookKnowledgePoints[input.textbookId] || [];
          const questions = state.textbookQuestions[input.textbookId] || [];
          const chapters = state.textbookChapters[input.textbookId] || [];

          // Use the library's generateTutorial for richer content
          // (summaries, key points, memory tips, common mistakes)
          const result = generateTutorial({
            textbook,
            chapters,
            knowledgePoints,
            questions,
            mode: input.mode,
            userId: resolveSpeedPassUserId(input.userId || state.userProfile?.id),
            courseId: input.courseId || '',
          });

          // Override the generated ID with nanoid for consistency
          const tutorial: SpeedLearningTutorial = {
            ...result.tutorial,
            id: nanoid(),
            teacherKeyPointIds: input.teacherKeyPointIds || [],
          };

          set((state) => ({
            tutorials: { ...state.tutorials, [tutorial.id]: tutorial },
            currentTutorialId: tutorial.id,
            isLoading: false,
          }));

          return tutorial;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      getTutorial: (tutorialId) => {
        return get().tutorials[tutorialId];
      },

      setCurrentTutorial: (tutorialId) => {
        set({ currentTutorialId: tutorialId });
      },

      updateTutorialProgress: (tutorialId, sectionId) => {
        set((state) => {
          const tutorial = state.tutorials[tutorialId];
          if (!tutorial) return state;

          const completedSectionIds = tutorial.completedSectionIds.includes(sectionId)
            ? tutorial.completedSectionIds
            : [...tutorial.completedSectionIds, sectionId];

          const progress = Math.round(
            (completedSectionIds.length / tutorial.sections.length) * 100
          );

          // Find next section
          const currentIndex = tutorial.sections.findIndex((s) => s.id === sectionId);
          const nextSection = tutorial.sections[currentIndex + 1];

          return {
            tutorials: {
              ...state.tutorials,
              [tutorialId]: {
                ...tutorial,
                completedSectionIds,
                currentSectionId: nextSection?.id,
                progress,
              },
            },
          };
        });
      },

      completeTutorial: (tutorialId) => {
        set((state) => {
          const tutorial = state.tutorials[tutorialId];
          if (!tutorial) return state;

          return {
            tutorials: {
              ...state.tutorials,
              [tutorialId]: {
                ...tutorial,
                completedAt: new Date(),
                progress: 100,
                completedSectionIds: tutorial.sections.map((s) => s.id),
              },
            },
            globalStats: {
              ...state.globalStats,
              tutorialsCompleted: state.globalStats.tutorialsCompleted + 1,
            },
          };
        });
      },

      deleteTutorial: (tutorialId) => {
        set((state) => {
          const { [tutorialId]: _, ...rest } = state.tutorials;
          return {
            tutorials: rest,
            currentTutorialId:
              state.currentTutorialId === tutorialId ? null : state.currentTutorialId,
          };
        });
      },

      // ========================================================================
      // Study Session Actions
      // ========================================================================

      startStudySession: (tutorialId) => {
        const tutorial = get().tutorials[tutorialId];
        if (!tutorial) {
          throw new Error('Tutorial not found');
        }

        const session: SpeedStudySession = {
          id: nanoid(),
          tutorialId,
          userId: resolveSpeedPassUserId(get().userProfile?.id),
          startedAt: new Date(),
          totalPausedMs: 0,
          sectionsCompleted: [],
          questionsAttempted: 0,
          questionsCorrect: 0,
          timeSpentMs: 0,
          status: 'active',
        };

        set((state) => ({
          studySessions: { ...state.studySessions, [session.id]: session },
          currentSessionId: session.id,
        }));

        return session;
      },

      pauseStudySession: (sessionId) => {
        set((state) => {
          const session = state.studySessions[sessionId];
          if (!session || session.status !== 'active') return state;

          return {
            studySessions: {
              ...state.studySessions,
              [sessionId]: {
                ...session,
                pausedAt: new Date(),
                status: 'paused',
              },
            },
          };
        });
      },

      resumeStudySession: (sessionId) => {
        set((state) => {
          const session = state.studySessions[sessionId];
          if (!session || session.status !== 'paused') return state;

          const pausedDuration = session.pausedAt
            ? Date.now() - new Date(session.pausedAt).getTime()
            : 0;

          return {
            studySessions: {
              ...state.studySessions,
              [sessionId]: {
                ...session,
                pausedAt: undefined,
                totalPausedMs: session.totalPausedMs + pausedDuration,
                status: 'active',
              },
            },
          };
        });
      },

      endStudySession: (sessionId) => {
        set((state) => {
          const session = state.studySessions[sessionId];
          if (!session) return state;

          const now = new Date();
          const totalTime =
            now.getTime() - new Date(session.startedAt).getTime() - session.totalPausedMs;

          return {
            studySessions: {
              ...state.studySessions,
              [sessionId]: {
                ...session,
                endedAt: now,
                timeSpentMs: totalTime,
                status: 'completed',
              },
            },
            currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
            globalStats: {
              ...state.globalStats,
              sessionsCompleted: state.globalStats.sessionsCompleted + 1,
              totalStudyTimeMs: state.globalStats.totalStudyTimeMs + totalTime,
            },
          };
        });
      },

      updateSessionProgress: (sessionId, updates) => {
        set((state) => {
          const session = state.studySessions[sessionId];
          if (!session) return state;

          return {
            studySessions: {
              ...state.studySessions,
              [sessionId]: { ...session, ...updates },
            },
          };
        });
      },

      getActiveSession: () => {
        const state = get();
        if (!state.currentSessionId) return undefined;
        const session = state.studySessions[state.currentSessionId];
        return session?.status === 'active' ? session : undefined;
      },

      // ========================================================================
      // Quiz Actions
      // ========================================================================

      createQuiz: (input) => {
        const state = get();
        const questions = state.textbookQuestions[input.textbookId] || [];

        // Filter questions based on input criteria
        let filteredQuestions = questions;

        if (input.knowledgePointIds?.length) {
          filteredQuestions = filteredQuestions.filter((q) =>
            q.knowledgePointIds.some((kpId) => input.knowledgePointIds?.includes(kpId))
          );
        }

        if (input.chapterIds?.length) {
          filteredQuestions = filteredQuestions.filter((q) =>
            input.chapterIds?.includes(q.chapterId)
          );
        }

        if (input.sources?.length) {
          const sourceMap: Record<string, string> = {
            textbook_example: 'example',
            textbook_exercise: 'exercise',
            past_exam: 'exam',
            ai_generated: 'ai_generated',
          };
          filteredQuestions = filteredQuestions.filter((q) =>
            input.sources?.some((s) => sourceMap[s] === q.sourceType)
          );
        }

        if (input.difficulty && input.difficulty !== 'mixed') {
          const difficultyRange = {
            easy: [0, 0.33],
            medium: [0.33, 0.66],
            hard: [0.66, 1],
          };
          const [min, max] = difficultyRange[input.difficulty];
          filteredQuestions = filteredQuestions.filter(
            (q) => q.difficulty >= min && q.difficulty <= max
          );
        }

        // Shuffle and select questions
        const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
        const selectedQuestions = shuffled.slice(0, input.questionCount);

        const quiz: Quiz = {
          id: nanoid(),
          userId: resolveSpeedPassUserId(state.userProfile?.id),
          title: `${input.questionCount}道题测验`,
          knowledgePointIds: input.knowledgePointIds || [],
          questionCount: selectedQuestions.length,
          timeLimit: input.timeLimit,
          questions: selectedQuestions.map((q) => ({
            id: nanoid(),
            sourceQuestion: q,
            source:
              q.sourceType === 'example'
                ? 'textbook_example'
                : q.sourceType === 'exercise'
                  ? 'textbook_exercise'
                  : q.sourceType === 'exam'
                    ? 'past_exam'
                    : 'ai_generated',
            hintsUsed: 0,
            hintsAvailable: 3,
          })),
          currentQuestionIndex: 0,
        };

        set((state) => ({
          quizzes: { ...state.quizzes, [quiz.id]: quiz },
          currentQuizId: quiz.id,
        }));

        return quiz;
      },

      startQuiz: (quizId) => {
        set((state) => {
          const quiz = state.quizzes[quizId];
          if (!quiz) return state;

          return {
            quizzes: {
              ...state.quizzes,
              [quizId]: {
                ...quiz,
                startedAt: new Date(),
              },
            },
            currentQuizId: quizId,
          };
        });
      },

      answerQuestion: (quizId, questionIndex, answer) => {
        set((state) => {
          const quiz = state.quizzes[quizId];
          if (!quiz || !quiz.questions[questionIndex]) return state;

          const question = quiz.questions[questionIndex];
          const sourceQuestion = question.sourceQuestion;

          // Check if answer is correct
          let isCorrect = false;
          if (sourceQuestion.solution) {
            isCorrect =
              answer.trim().toLowerCase() === sourceQuestion.solution.answer.trim().toLowerCase();
          }

          const updatedQuestions = [...quiz.questions];
          updatedQuestions[questionIndex] = {
            ...question,
            userAnswer: answer,
            isCorrect,
            attemptedAt: new Date(),
          };

          return {
            quizzes: {
              ...state.quizzes,
              [quizId]: {
                ...quiz,
                questions: updatedQuestions,
              },
            },
          };
        });
      },

      useHint: (quizId, questionIndex) => {
        const state = get();
        const quiz = state.quizzes[quizId];
        if (!quiz || !quiz.questions[questionIndex]) return undefined;

        const question = quiz.questions[questionIndex];
        if (question.hintsUsed >= question.hintsAvailable) return undefined;

        // Generate hint based on hints used
        const hints = [
          '仔细审题，注意题目中的关键条件',
          '回顾相关的定义和公式',
          question.sourceQuestion.solution?.steps[0]?.content || '尝试从基本概念出发',
        ];

        const hint = hints[question.hintsUsed] || hints[0];

        set((state) => {
          const quiz = state.quizzes[quizId];
          if (!quiz) return state;

          const updatedQuestions = [...quiz.questions];
          updatedQuestions[questionIndex] = {
            ...question,
            hintsUsed: question.hintsUsed + 1,
          };

          return {
            quizzes: {
              ...state.quizzes,
              [quizId]: {
                ...quiz,
                questions: updatedQuestions,
              },
            },
          };
        });

        return hint;
      },

      nextQuestion: (quizId) => {
        set((state) => {
          const quiz = state.quizzes[quizId];
          if (!quiz) return state;

          const nextIndex = Math.min(quiz.currentQuestionIndex + 1, quiz.questions.length - 1);

          return {
            quizzes: {
              ...state.quizzes,
              [quizId]: {
                ...quiz,
                currentQuestionIndex: nextIndex,
              },
            },
          };
        });
      },

      previousQuestion: (quizId) => {
        set((state) => {
          const quiz = state.quizzes[quizId];
          if (!quiz) return state;

          const prevIndex = Math.max(quiz.currentQuestionIndex - 1, 0);

          return {
            quizzes: {
              ...state.quizzes,
              [quizId]: {
                ...quiz,
                currentQuestionIndex: prevIndex,
              },
            },
          };
        });
      },

      completeQuiz: (quizId) => {
        set((state) => {
          const quiz = state.quizzes[quizId];
          if (!quiz) return state;

          const attemptedQuestions = quiz.questions.filter((q) => q.userAnswer !== undefined);
          const correctQuestions = quiz.questions.filter((q) => q.isCorrect);
          const wrongQuestionIds = quiz.questions
            .filter((q) => q.userAnswer !== undefined && !q.isCorrect)
            .map((q) => q.sourceQuestion.id);

          const score = correctQuestions.length;
          const accuracy =
            attemptedQuestions.length > 0
              ? Math.round((correctQuestions.length / attemptedQuestions.length) * 100)
              : 0;

          return {
            quizzes: {
              ...state.quizzes,
              [quizId]: {
                ...quiz,
                completedAt: new Date(),
                totalScore: score,
                maxScore: quiz.questions.length,
                accuracy,
                wrongQuestionIds,
              },
            },
            currentQuizId: state.currentQuizId === quizId ? null : state.currentQuizId,
            globalStats: {
              ...state.globalStats,
              quizzesCompleted: state.globalStats.quizzesCompleted + 1,
              totalQuestionsAttempted:
                state.globalStats.totalQuestionsAttempted + attemptedQuestions.length,
              totalQuestionsCorrect:
                state.globalStats.totalQuestionsCorrect + correctQuestions.length,
              averageAccuracy:
                Math.round(
                  ((state.globalStats.totalQuestionsCorrect + correctQuestions.length) /
                    (state.globalStats.totalQuestionsAttempted + attemptedQuestions.length)) *
                    100
                ) || 0,
            },
          };
        });
      },

      getQuizResults: (quizId) => {
        const quiz = get().quizzes[quizId];
        if (!quiz || !quiz.completedAt) return undefined;

        return {
          score: quiz.totalScore || 0,
          accuracy: quiz.accuracy || 0,
          wrongQuestions: quiz.wrongQuestionIds || [],
        };
      },

      // ========================================================================
      // Wrong Question Book Actions
      // ========================================================================

      addWrongQuestion: (questionId, textbookId, userAnswer) => {
        set((state) => {
          const existingRecord = Object.values(state.wrongQuestions).find(
            (r) => r.questionId === questionId
          );

          if (existingRecord) {
            // Add new attempt to existing record
            return {
              wrongQuestions: {
                ...state.wrongQuestions,
                [existingRecord.id]: {
                  ...existingRecord,
                  attempts: [
                    ...existingRecord.attempts,
                    {
                      attemptedAt: new Date(),
                      userAnswer,
                      isCorrect: false,
                      timeSpentMs: 0,
                    },
                  ],
                  status: 'reviewing',
                  updatedAt: new Date(),
                },
              },
            };
          }

          // Create new record
          const record: WrongQuestionRecord = {
            id: nanoid(),
            userId: resolveSpeedPassUserId(state.userProfile?.id),
            questionId,
            textbookId,
            attempts: [
              {
                attemptedAt: new Date(),
                userAnswer,
                isCorrect: false,
                timeSpentMs: 0,
              },
            ],
            status: 'new',
            reviewCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          return {
            wrongQuestions: {
              ...state.wrongQuestions,
              [record.id]: record,
            },
          };
        });
      },

      markWrongQuestionReviewed: (recordId, isCorrect) => {
        set((state) => {
          const record = state.wrongQuestions[recordId];
          if (!record) return state;

          const newReviewCount = record.reviewCount + 1;

          // SM-2 inspired spaced repetition intervals (in days)
          // Correct: intervals grow exponentially: 1, 3, 7, 14, 30, 60
          // Incorrect: reset to 1 day but keep review count for mastery tracking
          const sm2Intervals = [1, 3, 7, 14, 30, 60];
          let intervalDays: number;

          if (isCorrect) {
            const intervalIndex = Math.min(newReviewCount - 1, sm2Intervals.length - 1);
            intervalDays = sm2Intervals[intervalIndex];
          } else {
            // Reset interval on incorrect, but don't reset review count
            intervalDays = 1;
          }

          // Mastery requires 3+ correct reviews with the last being correct
          const newStatus = isCorrect && newReviewCount >= 3 ? 'mastered' : 'reviewing';

          return {
            wrongQuestions: {
              ...state.wrongQuestions,
              [recordId]: {
                ...record,
                status: newStatus,
                reviewCount: newReviewCount,
                lastReviewedAt: new Date(),
                nextReviewAt: new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000),
                updatedAt: new Date(),
              },
            },
          };
        });
      },

      getWrongQuestionsForReview: () => {
        const now = new Date();
        return Object.values(get().wrongQuestions)
          .filter((r) => r.status !== 'mastered')
          .filter((r) => !r.nextReviewAt || new Date(r.nextReviewAt) <= now)
          .sort((a, b) => a.reviewCount - b.reviewCount);
      },

      getWrongQuestionsByTextbook: (textbookId) => {
        return Object.values(get().wrongQuestions).filter((r) => r.textbookId === textbookId);
      },

      // ========================================================================
      // Study Report Actions
      // ========================================================================

      generateStudyReport: (sessionId, tutorialId) => {
        const state = get();

        const session = sessionId ? state.studySessions[sessionId] : undefined;
        const tutorial = tutorialId ? state.tutorials[tutorialId] : undefined;

        const report: StudyReport = {
          id: nanoid(),
          sessionId,
          tutorialId,
          userId: resolveSpeedPassUserId(state.userProfile?.id),
          generatedAt: new Date(),
          studyPeriod: {
            start: session?.startedAt || tutorial?.createdAt || new Date(),
            end: session?.endedAt || new Date(),
          },
          totalTimeSpentMinutes: session ? Math.round(session.timeSpentMs / 60000) : 0,
          knowledgePointsCovered: tutorial?.sections.length || 0,
          questionsPracticed: session?.questionsAttempted || 0,
          accuracy: session?.questionsAttempted
            ? Math.round((session.questionsCorrect / session.questionsAttempted) * 100)
            : 0,
          strengthAreas: [],
          weakAreas: [],
          nextSteps: ['复习本次学习中的薄弱知识点', '完成推荐的练习题', '明天继续学习下一个章节'],
          recommendedExercises: [],
          recommendedReviewPoints: [],
        };

        set((state) => ({
          studyReports: [...state.studyReports, report],
        }));

        return report;
      },

      getRecentReports: (limit = 10) => {
        return get()
          .studyReports.sort(
            (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
          )
          .slice(0, limit);
      },

      // ========================================================================
      // Statistics Actions
      // ========================================================================

      updateGlobalStats: (updates) => {
        set((state) => ({
          globalStats: { ...state.globalStats, ...updates },
        }));
      },

      recordStudyTime: (durationMs) => {
        set((state) => ({
          globalStats: {
            ...state.globalStats,
            totalStudyTimeMs: state.globalStats.totalStudyTimeMs + durationMs,
          },
        }));
      },

      // ========================================================================
      // Utility Actions
      // ========================================================================

      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),
      hydrateFromSnapshot: (snapshot) =>
        set((state) => ({
          ...state,
          ...snapshot,
          userProfile: snapshot.userProfile
            ? {
                ...snapshot.userProfile,
                id: resolveSpeedPassUserId(snapshot.userProfile.id),
              }
            : null,
          error: null,
          isLoading: false,
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'cognia-speedpass',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => extractSpeedPassPersistedState(state),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectCurrentTextbook = (state: SpeedPassState) =>
  state.currentTextbookId ? state.textbooks[state.currentTextbookId] : undefined;

export const selectCurrentTutorial = (state: SpeedPassState) =>
  state.currentTutorialId ? state.tutorials[state.currentTutorialId] : undefined;

export const selectCurrentQuiz = (state: SpeedPassState) =>
  state.currentQuizId ? state.quizzes[state.currentQuizId] : undefined;

export const selectActiveSession = (state: SpeedPassState) =>
  state.currentSessionId ? state.studySessions[state.currentSessionId] : undefined;

export const selectWrongQuestionsCount = (state: SpeedPassState) =>
  Object.values(state.wrongQuestions).filter((r) => r.status !== 'mastered').length;
