/**
 * SpeedPass Learning Platform Type Definitions
 *
 * Types for exam preparation with textbook matching, knowledge extraction,
 * speed learning tutorials, and intelligent question banks.
 */

// ============================================================================
// University & Course Types
// ============================================================================

export interface University {
  id: string;
  name: string;
  shortName?: string;
  province?: string;
  city?: string;
  type?: 'c9' | '985' | '211' | 'double-first-class' | 'regular';
  logoUrl?: string;
}

export interface Major {
  id: string;
  code: string; // e.g., "080901"
  name: string;
  category?: string; // e.g., "工学", "理学"
  universityId?: string;
}

export interface Course {
  id: string;
  name: string;
  code?: string;
  universityId?: string;
  majorId?: string;
  semester?: number; // 1-8
  credits?: number;
  description?: string;
}

export interface UserAcademicProfile {
  universityId: string;
  majorId: string;
  grade: number; // 1-4 for undergraduate
  currentSemester: number;
  enrolledCourses: string[]; // Course IDs
}

// ============================================================================
// Textbook Types
// ============================================================================

export type TextbookParseStatus =
  | 'pending'
  | 'uploading'
  | 'parsing'
  | 'extracting_chapters'
  | 'extracting_knowledge_points'
  | 'extracting_questions'
  | 'completed'
  | 'failed';

export type TextbookSource = 'official' | 'user_upload' | 'community' | 'crawl';

export interface Textbook {
  id: string;

  // Basic metadata
  name: string;
  author: string;
  publisher: string;
  edition?: string;
  isbn?: string;
  coverUrl?: string;

  // Content info
  totalPages?: number;
  totalChapters?: number;
  totalKnowledgePoints?: number;
  totalExamples?: number;
  totalExercises?: number;

  // Storage
  pdfUrl?: string;
  originalFileSize?: number; // bytes

  // Parsing status
  parseStatus: TextbookParseStatus;
  parseProgress?: number; // 0-100
  parseError?: string;

  // Source & ownership
  source: TextbookSource;
  uploaderId?: string;
  isPublic: boolean;

  // Usage stats
  usageCount: number;
  rating?: number; // 1-5
  ratingCount?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  parsedAt?: Date;
}

export interface TextbookChapter {
  id: string;
  textbookId: string;
  parentId?: string; // For nested chapters (sections)

  // Structure
  chapterNumber: string; // e.g., "2", "2.3", "2.3.1"
  title: string;
  level: number; // 1 = chapter, 2 = section, 3 = subsection
  orderIndex: number;

  // Page info
  pageStart: number;
  pageEnd: number;

  // Content counts
  knowledgePointCount: number;
  exampleCount: number;
  exerciseCount: number;

  // Summary
  summary?: string;
}

// ============================================================================
// Knowledge Point Types
// ============================================================================

export type KnowledgePointType =
  | 'definition' // 定义
  | 'theorem' // 定理
  | 'formula' // 公式
  | 'concept' // 概念
  | 'method' // 方法
  | 'property' // 性质
  | 'corollary' // 推论
  | 'lemma'; // 引理

export type KnowledgePointImportance = 'critical' | 'high' | 'medium' | 'low';

export interface TextbookKnowledgePoint {
  id: string;
  textbookId: string;
  chapterId: string;

  // Content
  title: string;
  content: string;
  summary?: string;

  // Classification
  type: KnowledgePointType;
  importance: KnowledgePointImportance;
  difficulty: number; // 0-1

  // Formulas (LaTeX)
  formulas?: string[];

  // Location
  pageNumber: number;

  // Relations
  prerequisites?: string[]; // IDs of prerequisite knowledge points
  relatedKnowledgePoints?: string[];

  // Examples & exercises linked to this knowledge point
  relatedExampleIds?: string[];
  relatedExerciseIds?: string[];

  // AI extraction confidence
  extractionConfidence: number; // 0-1
  verified: boolean;

  // Vector embedding for semantic search
  vectorEmbedding?: number[];

  // Tags for filtering
  tags?: string[];
}

// ============================================================================
// Question Types (Examples & Exercises)
// ============================================================================

export type QuestionSourceType =
  | 'example' // 课本例题
  | 'exercise' // 章节习题
  | 'review' // 复习题
  | 'exam' // 真题
  | 'ai_generated'; // AI生成

export type QuestionType =
  | 'choice' // 选择题
  | 'fill_blank' // 填空题
  | 'calculation' // 计算题
  | 'proof' // 证明题
  | 'short_answer' // 简答题
  | 'comprehensive'; // 综合题

export interface QuestionOption {
  label: string; // A, B, C, D
  content: string;
  isCorrect?: boolean;
}

export interface SolutionStep {
  stepNumber: number;
  content: string;
  explanation?: string;
  formula?: string; // LaTeX
}

export interface TextbookQuestion {
  id: string;
  textbookId: string;
  chapterId: string;

  // Source info
  sourceType: QuestionSourceType;
  questionNumber: string; // e.g., "例5", "习题2.1第3题"
  pageNumber: number;

  // Question content
  content: string;
  contentImages?: string[]; // Image URLs
  formulas?: string[]; // LaTeX formulas in question

  // Question classification
  questionType: QuestionType;
  options?: QuestionOption[]; // For choice questions

  // Solution
  solution?: {
    steps: SolutionStep[];
    answer: string;
    answerImages?: string[];
  };
  hasSolution: boolean;

  // AI-generated solution (if original has no solution)
  aiGeneratedSolution?: {
    steps: SolutionStep[];
    answer: string;
    confidence: number;
  };

  // Classification
  difficulty: number; // 0-1
  knowledgePointIds: string[];

  // Exam relevance
  examFrequency?: number; // 0-1, how often this type appears in exams
  isHighFrequency?: boolean;

  // Similar questions
  similarQuestionIds?: string[];

  // Learning value rating
  learningValue: 'essential' | 'recommended' | 'optional';

  // Extraction info
  extractionConfidence: number;
  verified: boolean;
}

// ============================================================================
// Course-Textbook Mapping
// ============================================================================

export interface CourseTextbookMapping {
  id: string;
  universityId: string;
  majorId?: string;
  courseId: string;
  courseName: string;
  textbookId: string;

  // Priority
  isPrimary: boolean; // Main textbook for this course

  // Usage stats
  usageCount: number;
  confirmedByUsers: number;

  // Semester info
  semester?: number;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// User Textbook Library
// ============================================================================

export type UserTextbookSource = 'matched' | 'uploaded' | 'community';

export interface UserTextbook {
  id: string;
  userId: string;
  textbookId: string;
  courseId?: string;

  source: UserTextbookSource;
  addedAt: Date;
  lastAccessedAt?: Date;

  // Study progress
  studyProgress?: number; // 0-100
  chaptersStudied?: string[];
  questionsAttempted?: number;
  questionsCorrect?: number;
}

// ============================================================================
// Teacher Key Points (老师重点)
// ============================================================================

export type TeacherKeyPointInputType = 'photo' | 'file' | 'text';

export interface TeacherKeyPointInput {
  inputType: TeacherKeyPointInputType;
  courseId: string;
  textbookId?: string;

  // Input data
  fileData?: string; // Base64 encoded
  fileFormat?: 'jpg' | 'png' | 'pdf' | 'docx';
  textContent?: string;
  userNote?: string;
}

export interface MatchedKnowledgePoint {
  teacherNote: string;
  matchedKnowledgePoint: TextbookKnowledgePoint;
  matchConfidence: number;

  // Textbook location
  chapter: {
    number: string;
    title: string;
  };
  pageRange: string; // e.g., "P23-P35"

  // Related content
  relatedDefinitions?: string[];
  relatedFormulas?: number;
  relatedExamples: Array<{
    id: string;
    title: string;
    page: number;
    difficulty: number;
  }>;
  relatedExercises: string[];
}

export interface TeacherKeyPointResult {
  status: 'success' | 'partial' | 'failed';
  matchedPoints: MatchedKnowledgePoint[];
  unmatchedNotes: string[];

  // Coverage summary
  textbookCoverage: {
    chaptersInvolved: number[];
    totalExamples: number;
    totalExercises: number;
  };

  // Study plan suggestion
  studyPlanSuggestion: {
    totalKnowledgePoints: number;
    totalExamples: number;
    totalExercises: number;
    estimatedTime: string; // e.g., "3.5小时"
  };
}

// ============================================================================
// Speed Learning Modes
// ============================================================================

export type SpeedLearningMode =
  | 'extreme' // 极速模式 1-2h - 及格(60分)
  | 'speed' // 速成模式 2-4h - 中等(70-80分)
  | 'comprehensive'; // 全面模式 6-12h - 高分(85+)

export interface SpeedLearningModeConfig {
  mode: SpeedLearningMode;
  targetScore: number;
  estimatedDuration: {
    min: number; // hours
    max: number;
  };

  // Content coverage
  coverageStrategy: 'critical_only' | 'critical_and_related' | 'full';

  // Question strategy
  exampleCount: {
    min: number;
    max: number;
  };
  includeExercises: boolean;

  // Tutorial depth
  tutorialDepth: 'brief' | 'standard' | 'detailed';
}

export const SPEED_LEARNING_MODES: Record<SpeedLearningMode, SpeedLearningModeConfig> = {
  extreme: {
    mode: 'extreme',
    targetScore: 60,
    estimatedDuration: { min: 1, max: 2 },
    coverageStrategy: 'critical_only',
    exampleCount: { min: 5, max: 8 },
    includeExercises: false,
    tutorialDepth: 'brief',
  },
  speed: {
    mode: 'speed',
    targetScore: 75,
    estimatedDuration: { min: 2, max: 4 },
    coverageStrategy: 'critical_and_related',
    exampleCount: { min: 15, max: 25 },
    includeExercises: true,
    tutorialDepth: 'standard',
  },
  comprehensive: {
    mode: 'comprehensive',
    targetScore: 85,
    estimatedDuration: { min: 6, max: 12 },
    coverageStrategy: 'full',
    exampleCount: { min: 30, max: 50 },
    includeExercises: true,
    tutorialDepth: 'detailed',
  },
};

// ============================================================================
// Speed Learning Tutorial
// ============================================================================

export interface TutorialSection {
  id: string;
  knowledgePointId: string;
  orderIndex: number;

  // Importance level (from teacher key points)
  importanceLevel: 'critical' | 'important' | 'supplementary';

  // Content sections
  textbookLocation: {
    textbookName: string;
    chapter: string;
    section: string;
    pageRange: string;
  };

  // Original textbook content
  originalContent: string;

  // Speed learning summary
  quickSummary: string;
  keyPoints: string[];

  // Formulas to memorize
  mustKnowFormulas: Array<{
    formula: string; // LaTeX
    explanation: string;
    pageNumber: number;
  }>;

  // Examples from textbook
  examples: Array<{
    questionId: string;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    pageNumber: number;
  }>;

  // Exercises to practice
  recommendedExercises: Array<{
    questionId: string;
    number: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;

  // Common mistakes & tips
  commonMistakes: string[];
  memoryTips?: string[];

  // Estimated study time
  estimatedMinutes: number;
}

export interface SpeedLearningTutorial {
  id: string;
  userId: string;
  courseId: string;
  textbookId: string;

  // Tutorial settings
  mode: SpeedLearningMode;
  createdAt: Date;

  // Source data
  teacherKeyPointIds: string[];

  // Tutorial content
  title: string;
  overview: string;
  sections: TutorialSection[];

  // Time estimates
  totalEstimatedMinutes: number;
  actualTimeSpentMinutes?: number;

  // Progress
  completedSectionIds: string[];
  currentSectionId?: string;
  progress: number; // 0-100

  // Quiz at the end
  finalQuizId?: string;

  // Completion
  completedAt?: Date;
  finalScore?: number;
}

// ============================================================================
// Study Session (Speed Learning)
// ============================================================================

export interface SpeedStudySession {
  id: string;
  tutorialId: string;
  userId: string;

  // Session info
  startedAt: Date;
  endedAt?: Date;
  pausedAt?: Date;
  totalPausedMs: number;

  // Progress
  sectionsCompleted: string[];
  currentSectionId?: string;
  questionsAttempted: number;
  questionsCorrect: number;

  // Time tracking
  timeSpentMs: number;

  // Session state
  status: 'active' | 'paused' | 'completed' | 'abandoned';
}

// ============================================================================
// Question Bank & Quiz
// ============================================================================

export type QuestionBankSource =
  | 'textbook_example' // 课本例题 60%
  | 'textbook_exercise' // 课本习题 20%
  | 'past_exam' // 历年真题 15%
  | 'ai_generated'; // AI生成 5%

export interface QuestionBankConfig {
  mode: SpeedLearningMode;
  sourceDistribution: Record<QuestionBankSource, number>; // Percentages
}

export const QUESTION_BANK_CONFIGS: Record<SpeedLearningMode, QuestionBankConfig> = {
  extreme: {
    mode: 'extreme',
    sourceDistribution: {
      textbook_example: 70,
      textbook_exercise: 15,
      past_exam: 10,
      ai_generated: 5,
    },
  },
  speed: {
    mode: 'speed',
    sourceDistribution: {
      textbook_example: 60,
      textbook_exercise: 20,
      past_exam: 15,
      ai_generated: 5,
    },
  },
  comprehensive: {
    mode: 'comprehensive',
    sourceDistribution: {
      textbook_example: 40,
      textbook_exercise: 35,
      past_exam: 20,
      ai_generated: 5,
    },
  },
};

export interface QuizQuestion {
  id: string;
  sourceQuestion: TextbookQuestion;
  source: QuestionBankSource;

  // User's answer
  userAnswer?: string;
  isCorrect?: boolean;
  attemptedAt?: Date;
  timeSpentMs?: number;

  // Hints used
  hintsUsed: number;
  hintsAvailable: number;
}

export interface Quiz {
  id: string;
  tutorialId?: string;
  sessionId?: string;
  userId: string;

  // Quiz config
  title: string;
  knowledgePointIds: string[];
  questionCount: number;
  timeLimit?: number; // minutes

  // Questions
  questions: QuizQuestion[];
  currentQuestionIndex: number;

  // Progress
  startedAt?: Date;
  completedAt?: Date;

  // Results
  totalScore?: number;
  maxScore?: number;
  accuracy?: number; // 0-100

  // For wrong question book
  wrongQuestionIds?: string[];
}

// ============================================================================
// Wrong Question Book (错题本)
// ============================================================================

export interface WrongQuestionRecord {
  id: string;
  userId: string;
  questionId: string;
  textbookId: string;

  // Attempt history
  attempts: Array<{
    attemptedAt: Date;
    userAnswer: string;
    isCorrect: boolean;
    timeSpentMs: number;
  }>;

  // Learning status
  status: 'new' | 'reviewing' | 'mastered';
  reviewCount: number;
  lastReviewedAt?: Date;
  nextReviewAt?: Date;

  // Notes
  userNotes?: string;

  // Related practice
  similarQuestionsRecommended?: string[];

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Study Report
// ============================================================================

export interface StudyReport {
  id: string;
  sessionId?: string;
  tutorialId?: string;
  userId: string;

  // Time
  generatedAt: Date;
  studyPeriod: {
    start: Date;
    end: Date;
  };

  // Overall stats
  totalTimeSpentMinutes: number;
  knowledgePointsCovered: number;
  questionsPracticed: number;
  accuracy: number; // 0-100

  // Strengths & weaknesses
  strengthAreas: Array<{
    knowledgePointId: string;
    title: string;
    accuracy: number;
  }>;
  weakAreas: Array<{
    knowledgePointId: string;
    title: string;
    accuracy: number;
    recommendedExercises: string[];
  }>;

  // Predictions
  predictedScore?: {
    min: number;
    max: number;
    confidence: number;
  };

  // Recommendations
  nextSteps: string[];
  recommendedExercises: string[];
  recommendedReviewPoints: string[];
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateTextbookInput {
  name: string;
  author: string;
  publisher: string;
  edition?: string;
  isbn?: string;
  courseId?: string;
  universityId?: string;

  // File upload
  fileType: 'pdf' | 'images';
  fileData: string | string[]; // Base64 or array of base64 images
}

export interface StartSpeedLearningInput {
  userId?: string;
  courseId: string;
  textbookId: string;
  mode: SpeedLearningMode;
  teacherKeyPoints?: TeacherKeyPointInput;
  teacherKeyPointIds?: string[];
  availableTimeMinutes?: number;
  examDate?: Date;
}

export interface CreateQuizInput {
  textbookId: string;
  knowledgePointIds?: string[];
  chapterIds?: string[];
  questionCount: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  sources?: QuestionBankSource[];
  timeLimit?: number;
}

// ============================================================================
// Store State Types
// ============================================================================

export interface SpeedPassState {
  // User profile
  academicProfile?: UserAcademicProfile;

  // Textbooks
  userTextbooks: UserTextbook[];
  currentTextbook?: Textbook;

  // Current study session
  currentTutorial?: SpeedLearningTutorial;
  currentSession?: SpeedStudySession;
  currentQuiz?: Quiz;

  // Wrong question book
  wrongQuestions: WrongQuestionRecord[];

  // Statistics
  totalStudyTimeMinutes: number;
  sessionsCompleted: number;
  averageAccuracy: number;

  // Loading states
  isLoading: boolean;
  parseProgress?: {
    textbookId: string;
    status: TextbookParseStatus;
    progress: number;
  };
}
