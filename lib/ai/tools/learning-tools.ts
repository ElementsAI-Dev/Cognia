/**
 * Learning Tools - AI tools for generative learning UI
 * 
 * These tools enable the AI to generate interactive learning components:
 * - Flashcards for spaced repetition review
 * - Quizzes for memory testing
 * - Review sessions for comprehensive practice
 * 
 * Based on AI SDK Generative UI pattern:
 * https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces
 */

import { z } from 'zod';

/**
 * Flashcard data schema
 */
export const flashcardSchema = z.object({
  id: z.string().describe('Unique identifier for the flashcard'),
  front: z.string().describe('Question or prompt on the front of the card'),
  back: z.string().describe('Answer or explanation on the back of the card'),
  hint: z.string().optional().describe('Optional hint to help recall'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('Difficulty level'),
  tags: z.array(z.string()).optional().describe('Tags for categorization'),
  conceptId: z.string().optional().describe('Related concept ID for tracking'),
});

export type FlashcardData = z.infer<typeof flashcardSchema>;

/**
 * Quiz question schema
 */
export const quizQuestionSchema = z.object({
  id: z.string().describe('Unique identifier for the question'),
  question: z.string().describe('The question text'),
  type: z.enum(['multiple_choice', 'true_false', 'fill_blank', 'short_answer']).describe('Question type'),
  options: z.array(z.string()).optional().describe('Options for multiple choice questions'),
  correctAnswer: z.string().describe('The correct answer'),
  explanation: z.string().optional().describe('Explanation of the correct answer'),
  hint: z.string().optional().describe('Hint for the question'),
  points: z.number().optional().describe('Points for this question'),
  conceptId: z.string().optional().describe('Related concept ID'),
});

export type QuizQuestionData = z.infer<typeof quizQuestionSchema>;

/**
 * Quiz data schema
 */
export const quizSchema = z.object({
  id: z.string().describe('Unique identifier for the quiz'),
  title: z.string().describe('Title of the quiz'),
  description: z.string().optional().describe('Description of the quiz'),
  questions: z.array(quizQuestionSchema).describe('Array of quiz questions'),
  timeLimit: z.number().optional().describe('Time limit in seconds'),
  passingScore: z.number().optional().describe('Minimum score to pass (percentage)'),
  shuffleQuestions: z.boolean().optional().describe('Whether to shuffle questions'),
});

export type QuizData = z.infer<typeof quizSchema>;

/**
 * Review session schema
 */
export const reviewSessionSchema = z.object({
  id: z.string().describe('Unique identifier for the review session'),
  title: z.string().describe('Title of the review session'),
  items: z.array(z.object({
    id: z.string(),
    type: z.enum(['flashcard', 'quiz_question']),
    data: z.union([flashcardSchema, quizQuestionSchema]),
  })).describe('Items to review'),
  mode: z.enum(['standard', 'spaced_repetition', 'cramming']).optional().describe('Review mode'),
  targetAccuracy: z.number().optional().describe('Target accuracy percentage'),
});

export type ReviewSessionData = z.infer<typeof reviewSessionSchema>;

/**
 * Progress summary stats schema
 */
export const progressStatsSchema = z.object({
  totalConcepts: z.number().describe('Total number of concepts'),
  masteredConcepts: z.number().describe('Number of mastered concepts'),
  learningConcepts: z.number().describe('Number of concepts being learned'),
  accuracy: z.number().describe('Overall accuracy percentage'),
  streakDays: z.number().optional().describe('Current streak in days'),
  timeSpentMinutes: z.number().optional().describe('Total time spent learning'),
});

export type ProgressStats = z.infer<typeof progressStatsSchema>;

/**
 * Recent activity schema
 */
export const recentActivitySchema = z.object({
  date: z.string(),
  conceptsReviewed: z.number(),
  accuracy: z.number(),
});

export type RecentActivity = z.infer<typeof recentActivitySchema>;

/**
 * Concept section schema
 */
export const conceptSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  type: z.enum(['text', 'example', 'warning', 'tip']).optional(),
});

export type ConceptSection = z.infer<typeof conceptSectionSchema>;

/**
 * Related concept schema
 */
export const relatedConceptSchema = z.object({
  id: z.string(),
  title: z.string(),
  relationship: z.string().optional(),
});

export type RelatedConcept = z.infer<typeof relatedConceptSchema>;

export const LEARNING_TOOL_CANONICAL_NAMES = [
  'display_flashcard',
  'display_flashcard_deck',
  'display_quiz',
  'display_quiz_question',
  'display_review_session',
  'display_progress_summary',
  'display_concept_explanation',
  'display_step_guide',
  'display_concept_map',
  'display_animation',
] as const;

export type CanonicalLearningToolName = (typeof LEARNING_TOOL_CANONICAL_NAMES)[number];

export const LEARNING_TOOL_ALIASES: Record<string, CanonicalLearningToolName> = {
  displayFlashcard: 'display_flashcard',
  displayFlashcardDeck: 'display_flashcard_deck',
  displayQuiz: 'display_quiz',
  displayQuizQuestion: 'display_quiz_question',
  displayReviewSession: 'display_review_session',
  displayProgressSummary: 'display_progress_summary',
  displayConceptExplanation: 'display_concept_explanation',
  displayStepGuide: 'display_step_guide',
  displayConceptMap: 'display_concept_map',
  displayAnimation: 'display_animation',
};

export type LearningToolAliasName = keyof typeof LEARNING_TOOL_ALIASES;
export type LearningToolName = CanonicalLearningToolName | LearningToolAliasName;

export const LEARNING_TOOL_CANONICAL_TO_ALIAS: Record<CanonicalLearningToolName, LearningToolAliasName> = {
  display_flashcard: 'displayFlashcard',
  display_flashcard_deck: 'displayFlashcardDeck',
  display_quiz: 'displayQuiz',
  display_quiz_question: 'displayQuizQuestion',
  display_review_session: 'displayReviewSession',
  display_progress_summary: 'displayProgressSummary',
  display_concept_explanation: 'displayConceptExplanation',
  display_step_guide: 'displayStepGuide',
  display_concept_map: 'displayConceptMap',
  display_animation: 'displayAnimation',
};

export function normalizeLearningToolName(
  name: string | null | undefined
): CanonicalLearningToolName | undefined {
  if (!name) {
    return undefined;
  }

  if (LEARNING_TOOL_CANONICAL_NAMES.includes(name as CanonicalLearningToolName)) {
    return name as CanonicalLearningToolName;
  }

  if (name in LEARNING_TOOL_ALIASES) {
    return LEARNING_TOOL_ALIASES[name];
  }

  const snakeName = name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();

  return LEARNING_TOOL_CANONICAL_NAMES.includes(snakeName as CanonicalLearningToolName)
    ? (snakeName as CanonicalLearningToolName)
    : undefined;
}

export function toLearningToolAliasName(name: LearningToolName): LearningToolAliasName | undefined {
  const canonicalName = normalizeLearningToolName(name);
  if (!canonicalName) {
    return undefined;
  }

  return LEARNING_TOOL_CANONICAL_TO_ALIAS[canonicalName];
}

export function isLearningToolName(name: string | null | undefined): name is LearningToolName {
  return !!normalizeLearningToolName(name);
}

// Input schemas for tools
export const displayFlashcardInputSchema = z.object({
  flashcard: flashcardSchema,
  sessionId: z.string().optional().describe('Learning session ID for tracking'),
  showHint: z.boolean().optional().describe('Whether to show hint initially'),
});

export const displayFlashcardDeckInputSchema = z.object({
  title: z.string().describe('Title of the flashcard deck'),
  description: z.string().optional().describe('Description of what this deck covers'),
  flashcards: z.array(flashcardSchema).min(1).describe('Array of flashcards in the deck'),
  sessionId: z.string().optional().describe('Learning session ID for tracking'),
  shuffled: z.boolean().optional().describe('Whether cards should be shuffled'),
});

export const displayQuizInputSchema = z.object({
  quiz: quizSchema,
  sessionId: z.string().optional().describe('Learning session ID for tracking'),
  allowRetry: z.boolean().optional().describe('Allow retrying incorrect answers'),
  showFeedback: z.boolean().optional().describe('Show immediate feedback after each answer'),
});

export const displayQuizQuestionInputSchema = z.object({
  question: quizQuestionSchema,
  sessionId: z.string().optional().describe('Learning session ID for tracking'),
  showHint: z.boolean().optional().describe('Whether to show hint initially'),
});

export const displayReviewSessionInputSchema = z.object({
  session: reviewSessionSchema,
  learningSessionId: z.string().optional().describe('Learning session ID for tracking'),
});

export const displayProgressSummaryInputSchema = z.object({
  title: z.string().describe('Title for the progress summary'),
  stats: progressStatsSchema,
  recentActivity: z.array(recentActivitySchema).optional().describe('Recent learning activity'),
  recommendations: z.array(z.string()).optional().describe('Personalized recommendations'),
});

export const displayConceptExplanationInputSchema = z.object({
  conceptId: z.string().describe('Unique identifier for the concept'),
  title: z.string().describe('Title of the concept'),
  summary: z.string().describe('Brief summary of the concept'),
  sections: z.array(conceptSectionSchema).describe('Expandable sections with detailed content'),
  relatedConcepts: z.array(relatedConceptSchema).optional().describe('Related concepts for further exploration'),
  quickReview: flashcardSchema.optional().describe('Quick review flashcard for this concept'),
});

// Type definitions for inputs
export type DisplayFlashcardInput = z.infer<typeof displayFlashcardInputSchema>;
export type DisplayFlashcardDeckInput = z.infer<typeof displayFlashcardDeckInputSchema>;
export type DisplayQuizInput = z.infer<typeof displayQuizInputSchema>;
export type DisplayQuizQuestionInput = z.infer<typeof displayQuizQuestionInputSchema>;
export type DisplayReviewSessionInput = z.infer<typeof displayReviewSessionInputSchema>;
export type DisplayProgressSummaryInput = z.infer<typeof displayProgressSummaryInputSchema>;
export type DisplayConceptExplanationInput = z.infer<typeof displayConceptExplanationInputSchema>;

// Tool output types
export interface FlashcardToolOutput {
  type: 'flashcard';
  flashcard: FlashcardData;
  sessionId?: string;
  showHint: boolean;
  timestamp: string;
}

export interface FlashcardDeckToolOutput {
  type: 'flashcard_deck';
  title: string;
  description?: string;
  flashcards: FlashcardData[];
  totalCards: number;
  sessionId?: string;
  timestamp: string;
}

export interface QuizToolOutput {
  type: 'quiz';
  quiz: QuizData;
  sessionId?: string;
  allowRetry: boolean;
  showFeedback: boolean;
  timestamp: string;
}

export interface QuizQuestionToolOutput {
  type: 'quiz_question';
  question: QuizQuestionData;
  sessionId?: string;
  showHint: boolean;
  timestamp: string;
}

export interface ReviewSessionToolOutput {
  type: 'review_session';
  session: ReviewSessionData;
  learningSessionId?: string;
  timestamp: string;
}

export interface ProgressSummaryToolOutput {
  type: 'progress_summary';
  title: string;
  stats: ProgressStats;
  recentActivity?: RecentActivity[];
  recommendations?: string[];
  timestamp: string;
}

export interface ConceptExplanationToolOutput {
  type: 'concept_explanation';
  conceptId: string;
  title: string;
  summary: string;
  sections: ConceptSection[];
  relatedConcepts?: RelatedConcept[];
  quickReview?: FlashcardData;
  timestamp: string;
}

// Step Guide schemas
export const guideStepSchema = z.object({
  id: z.string().describe('Unique identifier for the step'),
  title: z.string().describe('Step title'),
  content: z.string().describe('Step content (markdown supported)'),
  description: z.string().optional().describe('Brief description of the step'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  estimatedTimeMinutes: z.number().optional(),
  tips: z.array(z.string()).optional().describe('Helpful tips for this step'),
  hints: z.array(z.string()).optional().describe('Hints for learners who are stuck'),
  requiresConfirmation: z.boolean().optional().describe('Require user confirmation before proceeding'),
});

export type GuideStepData = z.infer<typeof guideStepSchema>;

export const displayStepGuideInputSchema = z.object({
  title: z.string().describe('Title of the step guide'),
  description: z.string().optional().describe('Overview description'),
  steps: z.array(guideStepSchema).min(1).describe('Array of guide steps'),
  showProgress: z.boolean().optional().describe('Show progress bar'),
  allowSkip: z.boolean().optional().describe('Allow skipping the guide'),
});

export type DisplayStepGuideInput = z.infer<typeof displayStepGuideInputSchema>;

// Concept Map schemas
export const conceptNodeSchema = z.object({
  id: z.string().describe('Unique node identifier'),
  label: z.string().describe('Display label for the node'),
  description: z.string().optional().describe('Node description shown on hover'),
  type: z.enum(['input', 'output', 'process', 'decision', 'data', 'default']).optional(),
  parentId: z.string().optional().describe('Parent node ID for hierarchy type'),
  layer: z.number().optional().describe('Layer index for layers type'),
  annotations: z.array(z.string()).optional(),
});

export const conceptConnectionSchema = z.object({
  id: z.string().describe('Connection identifier'),
  sourceId: z.string().describe('Source node ID'),
  targetId: z.string().describe('Target node ID'),
  label: z.string().optional(),
  type: z.enum(['directed', 'bidirectional']).optional(),
});

export const displayConceptMapInputSchema = z.object({
  title: z.string().describe('Title of the concept map'),
  description: z.string().optional(),
  type: z.enum(['flow', 'hierarchy', 'network', 'layers', 'sequence']).describe('Visualization layout type'),
  nodes: z.array(conceptNodeSchema).min(1).describe('Nodes in the visualization'),
  connections: z.array(conceptConnectionSchema).optional().describe('Connections between nodes'),
  tags: z.array(z.string()).optional(),
});

export type DisplayConceptMapInput = z.infer<typeof displayConceptMapInputSchema>;

// Animation schemas
export const animationElementSchema = z.object({
  id: z.string().describe('Element identifier'),
  type: z.enum(['text', 'shape', 'arrow', 'highlight', 'group']).describe('Element type'),
  content: z.string().optional().describe('Text content'),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  tooltip: z.string().optional(),
});

export const animationStepSchema = z.object({
  id: z.string().describe('Step identifier'),
  title: z.string().describe('Step title'),
  description: z.string().optional(),
  elements: z.array(animationElementSchema).describe('Elements visible in this step'),
  duration: z.number().optional().describe('Step duration in milliseconds').default(2000),
});

export const displayAnimationInputSchema = z.object({
  name: z.string().describe('Animation name/title'),
  description: z.string().optional(),
  width: z.number().optional().describe('Canvas width').default(600),
  height: z.number().optional().describe('Canvas height').default(400),
  steps: z.array(animationStepSchema).min(1).describe('Animation steps'),
  autoPlay: z.boolean().optional().describe('Auto-play on render'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

export type DisplayAnimationInput = z.infer<typeof displayAnimationInputSchema>;

// Tool output types for new tools
export interface StepGuideToolOutput {
  type: 'step_guide';
  title: string;
  description?: string;
  steps: GuideStepData[];
  showProgress: boolean;
  allowSkip: boolean;
  timestamp: string;
}

export interface ConceptMapToolOutput {
  type: 'concept_map';
  title: string;
  description?: string;
  visualizationType: 'flow' | 'hierarchy' | 'network' | 'layers' | 'sequence';
  nodes: z.infer<typeof conceptNodeSchema>[];
  connections?: z.infer<typeof conceptConnectionSchema>[];
  tags?: string[];
  timestamp: string;
}

export interface AnimationToolOutput {
  type: 'animation';
  name: string;
  description?: string;
  width: number;
  height: number;
  steps: z.infer<typeof animationStepSchema>[];
  autoPlay: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  timestamp: string;
}

export type LearningToolOutput =
  | FlashcardToolOutput
  | FlashcardDeckToolOutput
  | QuizToolOutput
  | QuizQuestionToolOutput
  | ReviewSessionToolOutput
  | ProgressSummaryToolOutput
  | ConceptExplanationToolOutput
  | StepGuideToolOutput
  | ConceptMapToolOutput
  | AnimationToolOutput;

/**
 * Execute display flashcard
 */
export async function executeDisplayFlashcard(
  input: DisplayFlashcardInput
): Promise<FlashcardToolOutput> {
  return {
    type: 'flashcard',
    flashcard: input.flashcard,
    sessionId: input.sessionId,
    showHint: input.showHint ?? false,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execute display flashcard deck
 */
export async function executeDisplayFlashcardDeck(
  input: DisplayFlashcardDeckInput
): Promise<FlashcardDeckToolOutput> {
  const orderedCards = input.shuffled
    ? [...input.flashcards].sort(() => Math.random() - 0.5)
    : input.flashcards;

  return {
    type: 'flashcard_deck',
    title: input.title,
    description: input.description,
    flashcards: orderedCards,
    totalCards: input.flashcards.length,
    sessionId: input.sessionId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execute display quiz
 */
export async function executeDisplayQuiz(
  input: DisplayQuizInput
): Promise<QuizToolOutput> {
  return {
    type: 'quiz',
    quiz: input.quiz,
    sessionId: input.sessionId,
    allowRetry: input.allowRetry ?? true,
    showFeedback: input.showFeedback ?? true,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execute display quiz question
 */
export async function executeDisplayQuizQuestion(
  input: DisplayQuizQuestionInput
): Promise<QuizQuestionToolOutput> {
  return {
    type: 'quiz_question',
    question: input.question,
    sessionId: input.sessionId,
    showHint: input.showHint ?? false,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execute display review session
 */
export async function executeDisplayReviewSession(
  input: DisplayReviewSessionInput
): Promise<ReviewSessionToolOutput> {
  return {
    type: 'review_session',
    session: input.session,
    learningSessionId: input.learningSessionId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execute display progress summary
 */
export async function executeDisplayProgressSummary(
  input: DisplayProgressSummaryInput
): Promise<ProgressSummaryToolOutput> {
  return {
    type: 'progress_summary',
    title: input.title,
    stats: input.stats,
    recentActivity: input.recentActivity,
    recommendations: input.recommendations,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execute display concept explanation
 */
export async function executeDisplayConceptExplanation(
  input: DisplayConceptExplanationInput
): Promise<ConceptExplanationToolOutput> {
  return {
    type: 'concept_explanation',
    conceptId: input.conceptId,
    title: input.title,
    summary: input.summary,
    sections: input.sections,
    relatedConcepts: input.relatedConcepts,
    quickReview: input.quickReview,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execute display step guide
 */
export async function executeDisplayStepGuide(
  input: DisplayStepGuideInput
): Promise<StepGuideToolOutput> {
  return {
    type: 'step_guide',
    title: input.title,
    description: input.description,
    steps: input.steps,
    showProgress: input.showProgress ?? true,
    allowSkip: input.allowSkip ?? true,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execute display concept map
 */
export async function executeDisplayConceptMap(
  input: DisplayConceptMapInput
): Promise<ConceptMapToolOutput> {
  return {
    type: 'concept_map',
    title: input.title,
    description: input.description,
    visualizationType: input.type,
    nodes: input.nodes,
    connections: input.connections,
    tags: input.tags,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execute display animation
 */
export async function executeDisplayAnimation(
  input: DisplayAnimationInput
): Promise<AnimationToolOutput> {
  return {
    type: 'animation',
    name: input.name,
    description: input.description,
    width: input.width ?? 600,
    height: input.height ?? 400,
    steps: input.steps,
    autoPlay: input.autoPlay ?? false,
    difficulty: input.difficulty,
    timestamp: new Date().toISOString(),
  };
}

const canonicalLearningTools = {
  display_flashcard: {
    name: 'display_flashcard',
    description:
      'Display an interactive flashcard for the user to review. Use this when presenting a concept that needs memorization with a question-answer format.',
    parameters: displayFlashcardInputSchema,
    execute: executeDisplayFlashcard,
    requiresApproval: false,
    category: 'learning' as const,
  },
  display_flashcard_deck: {
    name: 'display_flashcard_deck',
    description:
      'Display a deck of flashcards for sequential review. Use this when presenting multiple related concepts for study.',
    parameters: displayFlashcardDeckInputSchema,
    execute: executeDisplayFlashcardDeck,
    requiresApproval: false,
    category: 'learning' as const,
  },
  display_quiz: {
    name: 'display_quiz',
    description:
      'Display an interactive quiz to test the user\'s understanding. Use this to assess knowledge retention with various question types.',
    parameters: displayQuizInputSchema,
    execute: executeDisplayQuiz,
    requiresApproval: false,
    category: 'learning' as const,
  },
  display_quiz_question: {
    name: 'display_quiz_question',
    description:
      'Display a single quiz question for quick knowledge check. Use this for spot-checking understanding during a learning conversation.',
    parameters: displayQuizQuestionInputSchema,
    execute: executeDisplayQuizQuestion,
    requiresApproval: false,
    category: 'learning' as const,
  },
  display_review_session: {
    name: 'display_review_session',
    description:
      'Start an interactive review session combining flashcards and quiz questions. Use this for comprehensive review of learned material with spaced repetition support.',
    parameters: displayReviewSessionInputSchema,
    execute: executeDisplayReviewSession,
    requiresApproval: false,
    category: 'learning' as const,
  },
  display_progress_summary: {
    name: 'display_progress_summary',
    description:
      'Display a visual summary of learning progress including mastery levels, review statistics, and achievements.',
    parameters: displayProgressSummaryInputSchema,
    execute: executeDisplayProgressSummary,
    requiresApproval: false,
    category: 'learning' as const,
  },
  display_concept_explanation: {
    name: 'display_concept_explanation',
    description:
      'Display an interactive concept explanation with expandable sections, examples, and related concepts.',
    parameters: displayConceptExplanationInputSchema,
    execute: executeDisplayConceptExplanation,
    requiresApproval: false,
    category: 'learning' as const,
  },
  display_step_guide: {
    name: 'display_step_guide',
    description:
      'Display an interactive step-by-step guide for learning a process or procedure. Use this when walking the user through a multi-step workflow, tutorial, or methodology.',
    parameters: displayStepGuideInputSchema,
    execute: executeDisplayStepGuide,
    requiresApproval: false,
    category: 'learning' as const,
  },
  display_concept_map: {
    name: 'display_concept_map',
    description:
      'Display an interactive concept visualization (flow diagram, hierarchy, network graph, or layered diagram). Use this when explaining relationships between concepts, system architectures, or data flows.',
    parameters: displayConceptMapInputSchema,
    execute: executeDisplayConceptMap,
    requiresApproval: false,
    category: 'learning' as const,
  },
  display_animation: {
    name: 'display_animation',
    description:
      'Display an interactive step-by-step animation with playback controls. Use this for visualizing algorithms, processes, or any concept that benefits from animated step-by-step illustration.',
    parameters: displayAnimationInputSchema,
    execute: executeDisplayAnimation,
    requiresApproval: false,
    category: 'learning' as const,
  },
};

export const learningToolsByCanonicalName = canonicalLearningTools;

/**
 * Learning tool definitions (compatible with project's tool pattern)
 */
export const learningTools = {
  displayFlashcard: canonicalLearningTools.display_flashcard,
  displayFlashcardDeck: canonicalLearningTools.display_flashcard_deck,
  displayQuiz: canonicalLearningTools.display_quiz,
  displayQuizQuestion: canonicalLearningTools.display_quiz_question,
  displayReviewSession: canonicalLearningTools.display_review_session,
  displayProgressSummary: canonicalLearningTools.display_progress_summary,
  displayConceptExplanation: canonicalLearningTools.display_concept_explanation,
  displayStepGuide: canonicalLearningTools.display_step_guide,
  displayConceptMap: canonicalLearningTools.display_concept_map,
  displayAnimation: canonicalLearningTools.display_animation,
};

export default learningTools;
