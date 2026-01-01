/**
 * Learning Mode Type Definitions
 * 
 * Types for the Socratic Method-based learning mode that provides
 * step-by-step guided learning through questioning and discovery.
 */

/**
 * Learning phases following the Socratic Method workflow
 */
export type LearningPhase = 
  | 'clarification'    // Understanding the problem and learning goals
  | 'deconstruction'   // Breaking down into sub-questions
  | 'questioning'      // Strategic questioning for each sub-question
  | 'feedback'         // Progressive feedback based on responses
  | 'summary';         // Summarization and elevation of learning

/**
 * Status of a learning sub-question
 */
export type SubQuestionStatus = 'pending' | 'in_progress' | 'resolved' | 'skipped';

/**
 * Understanding level assessed by AI
 */
export type UnderstandingLevel = 'none' | 'partial' | 'good' | 'excellent';

/**
 * Learning style preferences
 */
export type LearningStyle = 'visual' | 'auditory' | 'reading' | 'kinesthetic';

/**
 * Difficulty level for adaptive learning
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Knowledge mastery status
 */
export type MasteryStatus = 'not_started' | 'learning' | 'practicing' | 'mastered';

/**
 * A sub-question derived from the main learning topic
 */
export interface LearningSubQuestion {
  id: string;
  question: string;
  status: SubQuestionStatus;
  hints: string[];
  userAttempts: number;
  resolvedAt?: Date;
  keyInsights?: string[];
  // Enhanced tracking
  difficulty?: DifficultyLevel;
  timeSpentMs?: number;
  masteryScore?: number; // 0-100
  relatedConcepts?: string[];
}

/**
 * Learning note created during a session
 */
export interface LearningNote {
  id: string;
  content: string;
  createdAt: Date;
  subQuestionId?: string; // Optional link to a sub-question
  conceptTags?: string[];
  isHighlight?: boolean;
}

/**
 * Knowledge concept for mastery tracking
 */
export interface KnowledgeConcept {
  id: string;
  name: string;
  description?: string;
  masteryStatus: MasteryStatus;
  masteryScore: number; // 0-100
  lastPracticedAt?: Date;
  nextReviewAt?: Date; // For spaced repetition
  reviewCount: number;
  correctAnswers: number;
  totalAttempts: number;
  relatedConceptIds?: string[];
}

/**
 * Learning statistics for a session
 */
export interface LearningStatistics {
  totalTimeSpentMs: number;
  activeTimeSpentMs: number; // Time actively engaged
  questionsAnswered: number;
  correctAnswers: number;
  hintsUsed: number;
  conceptsLearned: number;
  averageResponseTimeMs: number;
  streakDays: number;
  longestStreak: number;
  phaseCompletionTimes: Partial<Record<LearningPhase, number>>;
}

/**
 * Spaced repetition review item
 */
export interface ReviewItem {
  id: string;
  conceptId: string;
  sessionId: string;
  question: string;
  answer: string;
  nextReviewAt: Date;
  interval: number; // Days until next review
  easeFactor: number; // SM-2 algorithm ease factor
  repetitions: number;
  lastReviewedAt?: Date;
}

/**
 * AI-powered response analysis result
 */
export interface AIResponseAnalysis {
  understanding: UnderstandingLevel;
  confidenceScore: number; // 0-100
  suggestedAction: 'continue' | 'hint' | 'rephrase' | 'advance' | 'celebrate' | 'simplify';
  detectedConcepts: string[];
  potentialMisconceptions: string[];
  strengthAreas: string[];
  improvementAreas: string[];
  recommendedNextSteps: string[];
  emotionalTone?: 'frustrated' | 'confused' | 'neutral' | 'engaged' | 'excited';
}

/**
 * Learning goal set by the user
 */
export interface LearningGoal {
  id: string;
  description: string;
  achieved: boolean;
  achievedAt?: Date;
}

/**
 * Complete learning session state
 */
export interface LearningSession {
  id: string;
  sessionId: string; // Reference to the chat session
  
  // Topic and goals
  topic: string;
  backgroundKnowledge?: string;
  learningGoals: LearningGoal[];
  
  // Current state
  currentPhase: LearningPhase;
  currentSubQuestionId?: string;
  
  // Sub-questions for deconstruction
  subQuestions: LearningSubQuestion[];
  
  // Progress tracking
  progress: number; // 0-100
  totalHintsProvided: number;
  
  // Timestamps
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
  
  // Final summary
  finalSummary?: string;
  keyTakeaways?: string[];
  
  // Enhanced features
  notes: LearningNote[];
  concepts: KnowledgeConcept[];
  statistics: LearningStatistics;
  reviewItems: ReviewItem[];
  
  // Adaptive learning
  currentDifficulty: DifficultyLevel;
  preferredStyle?: LearningStyle;
  adaptiveAdjustments: number; // How many times difficulty was adjusted
  
  // Engagement metrics
  engagementScore: number; // 0-100
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
}

/**
 * Input for starting a new learning session
 */
export interface StartLearningInput {
  topic: string;
  backgroundKnowledge?: string;
  learningGoals?: string[];
  preferredDifficulty?: DifficultyLevel;
  preferredStyle?: LearningStyle;
}

/**
 * Learning mode configuration
 */
export interface LearningModeConfig {
  // Hint settings
  maxHintsPerQuestion: number;
  hintDelayMessages: number; // Number of failed attempts before offering hint
  
  // Feedback settings
  enableProgressiveHints: boolean;
  enableEncouragement: boolean;
  
  // Summary settings
  autoGenerateSummary: boolean;
  includeKeyTakeaways: boolean;
  
  // Adaptive learning settings
  enableAdaptiveDifficulty: boolean;
  difficultyAdjustThreshold: number; // Number of correct/incorrect before adjusting
  
  // Spaced repetition settings
  enableSpacedRepetition: boolean;
  defaultReviewIntervalDays: number;
  
  // Note-taking settings
  enableAutoNotes: boolean;
  autoHighlightInsights: boolean;
  
  // AI analysis settings
  enableAIAnalysis: boolean;
  analysisDepth: 'basic' | 'standard' | 'deep';
}

/**
 * Default learning mode configuration
 */
export const DEFAULT_LEARNING_CONFIG: LearningModeConfig = {
  maxHintsPerQuestion: 3,
  hintDelayMessages: 2,
  enableProgressiveHints: true,
  enableEncouragement: true,
  autoGenerateSummary: true,
  includeKeyTakeaways: true,
  enableAdaptiveDifficulty: true,
  difficultyAdjustThreshold: 3,
  enableSpacedRepetition: true,
  defaultReviewIntervalDays: 1,
  enableAutoNotes: false,
  autoHighlightInsights: true,
  enableAIAnalysis: true,
  analysisDepth: 'standard',
};

/**
 * Default learning statistics
 */
export const DEFAULT_LEARNING_STATISTICS: LearningStatistics = {
  totalTimeSpentMs: 0,
  activeTimeSpentMs: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
  hintsUsed: 0,
  conceptsLearned: 0,
  averageResponseTimeMs: 0,
  streakDays: 0,
  longestStreak: 0,
  phaseCompletionTimes: {},
};

/**
 * Learning achievement/badge types
 */
export interface LearningAchievement {
  id: string;
  type: 'streak' | 'mastery' | 'speed' | 'persistence' | 'explorer' | 'scholar';
  name: string;
  description: string;
  iconName: string;
  earnedAt: Date;
  progress?: number; // For progressive achievements
  maxProgress?: number;
}

/**
 * Achievement definitions
 */
export const LEARNING_ACHIEVEMENTS: Record<string, Omit<LearningAchievement, 'id' | 'earnedAt' | 'progress' | 'maxProgress'>> = {
  first_session: {
    type: 'explorer',
    name: 'First Steps',
    description: 'Complete your first learning session',
    iconName: 'Rocket',
  },
  week_streak: {
    type: 'streak',
    name: 'Week Warrior',
    description: 'Learn for 7 days in a row',
    iconName: 'Flame',
  },
  concept_master: {
    type: 'mastery',
    name: 'Concept Master',
    description: 'Master 10 concepts',
    iconName: 'Crown',
  },
  quick_learner: {
    type: 'speed',
    name: 'Quick Learner',
    description: 'Complete a session in under 15 minutes',
    iconName: 'Zap',
  },
  persistent: {
    type: 'persistence',
    name: 'Never Give Up',
    description: 'Solve a question after 5+ attempts',
    iconName: 'Mountain',
  },
  scholar: {
    type: 'scholar',
    name: 'Scholar',
    description: 'Complete 10 learning sessions',
    iconName: 'GraduationCap',
  },
};

/**
 * Phase descriptions for UI display
 */
export const LEARNING_PHASE_INFO: Record<LearningPhase, {
  title: string;
  description: string;
  icon: string;
}> = {
  clarification: {
    title: 'Clarification',
    description: 'Understanding your problem and learning goals',
    icon: 'HelpCircle',
  },
  deconstruction: {
    title: 'Deconstruction',
    description: 'Breaking down into manageable sub-questions',
    icon: 'GitBranch',
  },
  questioning: {
    title: 'Guided Questioning',
    description: 'Exploring each concept through strategic questions',
    icon: 'MessageCircleQuestion',
  },
  feedback: {
    title: 'Progressive Feedback',
    description: 'Refining understanding with targeted guidance',
    icon: 'RefreshCw',
  },
  summary: {
    title: 'Summary & Elevation',
    description: 'Consolidating learnings into broader principles',
    icon: 'GraduationCap',
  },
};
