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
}

/**
 * Input for starting a new learning session
 */
export interface StartLearningInput {
  topic: string;
  backgroundKnowledge?: string;
  learningGoals?: string[];
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
