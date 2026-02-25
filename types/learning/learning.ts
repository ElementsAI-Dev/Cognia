/**
 * Learning Mode Type Definitions
 *
 * Types for the Socratic Method-based learning mode that provides
 * step-by-step guided learning through questioning and discovery.
 */

// ============================================================================
// Learning Duration Types (Short-term vs Long-term)
// ============================================================================

/**
 * Learning duration type - determines the learning approach
 * - quick: Short-term learning for immediate questions, concept explanations
 * - journey: Long-term learning for systematic study, skill mastery
 */
export type LearningDurationType = 'quick' | 'journey';

/**
 * Learning category for classification
 */
export type LearningCategory =
  | 'concept' // Understanding a concept
  | 'problem-solving' // Solving a specific problem
  | 'skill' // Learning a skill
  | 'language' // Programming/human language
  | 'framework' // Framework or library
  | 'domain' // Domain knowledge
  | 'project' // Project-based learning
  | 'certification' // Certification preparation
  | 'other';

/**
 * Learning path milestone for long-term learning
 */
export interface LearningMilestone {
  id: string;
  title: string;
  description?: string;
  targetDate?: Date;
  completedAt?: Date;
  progress: number; // 0-100
  subMilestones?: string[]; // IDs of sub-milestones
  prerequisites?: string[]; // IDs of prerequisite milestones
  resources?: LearningResource[];
  estimatedHours?: number;
}

/**
 * Learning resource for study materials
 */
export interface LearningResource {
  id: string;
  title: string;
  type:
    | 'article'
    | 'video'
    | 'book'
    | 'course'
    | 'documentation'
    | 'exercise'
    | 'project'
    | 'other';
  url?: string;
  notes?: string;
  completed: boolean;
  rating?: number; // 1-5
}

/**
 * Learning path for long-term structured learning
 */
export interface LearningPath {
  id: string;
  sessionId: string; // Reference to chat session

  // Path metadata
  title: string;
  description?: string;
  category: LearningCategory;
  estimatedDuration: LearningPathDuration;

  // Structure
  milestones: LearningMilestone[];
  currentMilestoneId?: string;

  // Progress
  overallProgress: number; // 0-100
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
  targetCompletionDate?: Date;

  // Learning schedule
  schedule?: LearningSchedule;

  // Metrics
  totalTimeSpentMs: number;
  sessionsCompleted: number;
  streakDays: number;

  // AI-generated recommendations
  nextSteps?: string[];
  suggestedResources?: LearningResource[];
}

/**
 * Estimated duration for learning path
 */
export type LearningPathDuration =
  | 'days' // 1-7 days
  | 'weeks' // 1-4 weeks
  | 'months' // 1-6 months
  | 'long-term'; // 6+ months

/**
 * Learning schedule for regular study
 */
export interface LearningSchedule {
  frequency: 'daily' | 'weekly' | 'custom';
  daysPerWeek?: number;
  minutesPerSession?: number;
  preferredTimes?: string[]; // e.g., "09:00", "18:00"
  remindersEnabled: boolean;
}

/**
 * Quick learning session for short-term questions
 */
export interface QuickLearningSession {
  id: string;
  sessionId: string; // Reference to chat session
  question: string;
  answer?: string;
  relatedTopics?: string[];
  savedToPath?: string; // If saved to a learning path
  createdAt: Date;
  resolvedAt?: Date;
  followUpQuestions?: string[];
}

/**
 * Learning type detection result
 */
export interface LearningTypeDetectionResult {
  detectedType: LearningDurationType;
  confidence: number; // 0-100
  category: LearningCategory;
  suggestedDuration?: LearningPathDuration;
  reasoning: string;
  keywords: string[];
}

// ============================================================================
// Learning Phases
// ============================================================================

/**
 * Learning phases following the Socratic Method workflow
 */
export type LearningPhase =
  | 'clarification' // Understanding the problem and learning goals
  | 'deconstruction' // Breaking down into sub-questions
  | 'questioning' // Strategic questioning for each sub-question
  | 'feedback' // Progressive feedback based on responses
  | 'summary'; // Summarization and elevation of learning

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

  // Learning type (short-term vs long-term)
  durationType: LearningDurationType;
  category: LearningCategory;
  learningPathId?: string; // Reference to learning path for journey type

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
  // Learning type options
  durationType?: LearningDurationType;
  category?: LearningCategory;
  estimatedDuration?: LearningPathDuration;
  autoDetectType?: boolean; // If true, automatically detect learning type
}

/**
 * Input for creating a learning path (long-term learning)
 */
export interface CreateLearningPathInput {
  title: string;
  description?: string;
  category: LearningCategory;
  estimatedDuration: LearningPathDuration;
  targetCompletionDate?: Date;
  schedule?: LearningSchedule;
  milestones?: Omit<LearningMilestone, 'id' | 'progress' | 'completedAt'>[];
}

/**
 * Teaching approach preset
 */
export type TeachingApproach = 'socratic' | 'semi-socratic' | 'cognitive' | 'codeaid' | 'custom';

/**
 * Prompt language preference
 */
export type PromptLanguage = 'en' | 'zh-CN' | 'auto';

/**
 * Customizable prompt template for learning mode
 */
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  approach: TeachingApproach;
  basePrompt: string;
  phaseOverrides?: Partial<Record<LearningPhase, string>>;
  difficultyOverrides?: Partial<Record<DifficultyLevel, string>>;
  styleOverrides?: Partial<Record<LearningStyle, string>>;
  scenarioOverrides?: Partial<Record<string, string>>;
  understandingOverrides?: Partial<Record<UnderstandingLevel, string>>;
  language: PromptLanguage;
  isBuiltIn: boolean;
  createdAt?: string;
  updatedAt?: string;
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

  // Custom message overrides
  customEncouragementMessages?: Partial<Record<string, string[]>>;
  customCelebrationMessages?: Partial<Record<string, string[]>>;

  // Prompt customization settings
  activeTemplateId: string;
  promptLanguage: PromptLanguage;
  responseLanguage: 'match-ui' | 'en' | 'zh-CN';
  mentorPersonality?: string;
  subjectContext?: string;
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
  activeTemplateId: 'builtin-socratic',
  promptLanguage: 'auto',
  responseLanguage: 'match-ui',
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
export const LEARNING_ACHIEVEMENTS: Record<
  string,
  Omit<LearningAchievement, 'id' | 'earnedAt' | 'progress' | 'maxProgress'>
> = {
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
export const LEARNING_PHASE_INFO: Record<
  LearningPhase,
  {
    title: string;
    description: string;
    icon: string;
  }
> = {
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
