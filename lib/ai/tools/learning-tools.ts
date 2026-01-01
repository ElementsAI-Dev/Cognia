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

export type LearningToolOutput =
  | FlashcardToolOutput
  | FlashcardDeckToolOutput
  | QuizToolOutput
  | QuizQuestionToolOutput
  | ReviewSessionToolOutput
  | ProgressSummaryToolOutput
  | ConceptExplanationToolOutput;

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
 * Learning tool definitions (compatible with project's tool pattern)
 */
export const learningTools = {
  displayFlashcard: {
    name: 'displayFlashcard',
    description: 'Display an interactive flashcard for the user to review. Use this when presenting a concept that needs memorization with a question-answer format.',
    parameters: displayFlashcardInputSchema,
    execute: executeDisplayFlashcard,
    requiresApproval: false,
    category: 'learning' as const,
  },
  displayFlashcardDeck: {
    name: 'displayFlashcardDeck',
    description: 'Display a deck of flashcards for sequential review. Use this when presenting multiple related concepts for study.',
    parameters: displayFlashcardDeckInputSchema,
    execute: executeDisplayFlashcardDeck,
    requiresApproval: false,
    category: 'learning' as const,
  },
  displayQuiz: {
    name: 'displayQuiz',
    description: 'Display an interactive quiz to test the user\'s understanding. Use this to assess knowledge retention with various question types.',
    parameters: displayQuizInputSchema,
    execute: executeDisplayQuiz,
    requiresApproval: false,
    category: 'learning' as const,
  },
  displayQuizQuestion: {
    name: 'displayQuizQuestion',
    description: 'Display a single quiz question for quick knowledge check. Use this for spot-checking understanding during a learning conversation.',
    parameters: displayQuizQuestionInputSchema,
    execute: executeDisplayQuizQuestion,
    requiresApproval: false,
    category: 'learning' as const,
  },
  displayReviewSession: {
    name: 'displayReviewSession',
    description: 'Start an interactive review session combining flashcards and quiz questions. Use this for comprehensive review of learned material with spaced repetition support.',
    parameters: displayReviewSessionInputSchema,
    execute: executeDisplayReviewSession,
    requiresApproval: false,
    category: 'learning' as const,
  },
  displayProgressSummary: {
    name: 'displayProgressSummary',
    description: 'Display a visual summary of learning progress including mastery levels, review statistics, and achievements.',
    parameters: displayProgressSummaryInputSchema,
    execute: executeDisplayProgressSummary,
    requiresApproval: false,
    category: 'learning' as const,
  },
  displayConceptExplanation: {
    name: 'displayConceptExplanation',
    description: 'Display an interactive concept explanation with expandable sections, examples, and related concepts.',
    parameters: displayConceptExplanationInputSchema,
    execute: executeDisplayConceptExplanation,
    requiresApproval: false,
    category: 'learning' as const,
  },
};

export default learningTools;
