'use client';

/**
 * Learning Tool Part - Renders learning-specific generative UI components
 * 
 * Handles rendering of:
 * - Flashcards and flashcard decks
 * - Quiz questions and full quizzes
 * - Review sessions
 * - Progress summaries
 * - Concept explanations
 */

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader } from '@/components/ai-elements/loader';
import { cn } from '@/lib/utils';
import {
  Flashcard,
  FlashcardFromTool,
  FlashcardDeckFromTool,
} from '@/components/learning/flashcard';
import {
  QuizFromTool,
  QuizQuestionFromTool,
} from '@/components/learning/quiz';
import {
  ReviewSessionFromTool,
  ProgressSummaryFromTool,
} from '@/components/learning/review-session';
import type {
  LearningToolOutput,
  FlashcardToolOutput,
  FlashcardDeckToolOutput,
  QuizToolOutput,
  QuizQuestionToolOutput,
  ReviewSessionToolOutput,
  ProgressSummaryToolOutput,
  ConceptExplanationToolOutput,
} from '@/lib/ai/tools/learning-tools';
import type { ToolInvocationPart } from '@/types/core/message';

/**
 * Learning tool names that this component handles
 */
export const LEARNING_TOOL_NAMES = [
  'displayFlashcard',
  'displayFlashcardDeck',
  'displayQuiz',
  'displayQuizQuestion',
  'displayReviewSession',
  'displayProgressSummary',
  'displayConceptExplanation',
] as const;

export type LearningToolName = typeof LEARNING_TOOL_NAMES[number];

/**
 * Check if a tool name is a learning tool
 */
export function isLearningTool(toolName: string): toolName is LearningToolName {
  return LEARNING_TOOL_NAMES.includes(toolName as LearningToolName);
}

interface LearningToolPartProps {
  part: ToolInvocationPart;
  className?: string;
}

/**
 * Loading state component for learning tools
 */
const LearningToolLoading = memo(function LearningToolLoading({
  toolName,
}: {
  toolName: string;
}) {
  const t = useTranslations('learning');

  const loadingMessages: Record<LearningToolName, string> = {
    displayFlashcard: t('loading.flashcard'),
    displayFlashcardDeck: t('loading.flashcardDeck'),
    displayQuiz: t('loading.quiz'),
    displayQuizQuestion: t('loading.quizQuestion'),
    displayReviewSession: t('loading.reviewSession'),
    displayProgressSummary: t('loading.progressSummary'),
    displayConceptExplanation: t('loading.conceptExplanation'),
  };

  return (
    <Card className="w-full">
      <CardContent className="flex items-center justify-center py-8">
        <Loader size={24} className="text-muted-foreground mr-2" />
        <span className="text-muted-foreground">
          {loadingMessages[toolName as LearningToolName] || t('loading.default')}
        </span>
      </CardContent>
    </Card>
  );
});

/**
 * Error state component for learning tools
 */
const LearningToolError = memo(function LearningToolError({
  errorText,
}: {
  errorText?: string;
}) {
  const t = useTranslations('learning');

  return (
    <Alert variant="destructive" className="w-full">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {errorText || t('error.default')}
      </AlertDescription>
    </Alert>
  );
});

/**
 * Concept Explanation Component
 */
interface ConceptExplanationProps {
  output: ConceptExplanationToolOutput;
  className?: string;
}

const ConceptExplanation = memo(function ConceptExplanation({
  output,
  className,
}: ConceptExplanationProps) {
  const t = useTranslations('learning');

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="pt-6 space-y-4">
        {/* Title and Summary */}
        <div>
          <h3 className="text-lg font-semibold">{output.title}</h3>
          <p className="text-muted-foreground mt-1">{output.summary}</p>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {output.sections.map((section, index) => (
            <div
              key={index}
              className={cn(
                'p-3 rounded-lg',
                section.type === 'example' && 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500',
                section.type === 'warning' && 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500',
                section.type === 'tip' && 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500',
                (!section.type || section.type === 'text') && 'bg-muted/50'
              )}
            >
              <h4 className="font-medium text-sm mb-1">{section.title}</h4>
              <p className="text-sm text-muted-foreground">{section.content}</p>
            </div>
          ))}
        </div>

        {/* Related Concepts */}
        {output.relatedConcepts && output.relatedConcepts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">{t('concept.relatedConcepts')}</h4>
            <div className="flex flex-wrap gap-2">
              {output.relatedConcepts.map((concept) => (
                <div
                  key={concept.id}
                  className="px-3 py-1 bg-muted rounded-full text-sm"
                >
                  {concept.title}
                  {concept.relationship && (
                    <span className="text-muted-foreground ml-1">
                      ({concept.relationship})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Review Flashcard */}
        {output.quickReview && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">{t('concept.quickReview')}</h4>
            <Flashcard flashcard={output.quickReview} />
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * Main Learning Tool Part Component
 * 
 * Renders the appropriate learning UI based on tool name and state
 */
export const LearningToolPart = memo(function LearningToolPart({
  part,
  className,
}: LearningToolPartProps) {
  const { toolName, state, result, errorText } = part;

  // Handle loading states
  if (state === 'input-streaming' || state === 'input-available') {
    return <LearningToolLoading toolName={toolName} />;
  }

  // Handle error states
  if (state === 'output-error' || state === 'output-denied') {
    return <LearningToolError errorText={errorText} />;
  }

  // Handle completed state with result
  if (state === 'output-available' && result) {
    const output = result as LearningToolOutput;

    switch (toolName) {
      case 'displayFlashcard':
        return (
          <div className={className}>
            <FlashcardFromTool output={output as FlashcardToolOutput} />
          </div>
        );

      case 'displayFlashcardDeck':
        return (
          <div className={className}>
            <FlashcardDeckFromTool output={output as FlashcardDeckToolOutput} />
          </div>
        );

      case 'displayQuiz':
        return (
          <div className={className}>
            <QuizFromTool output={output as QuizToolOutput} />
          </div>
        );

      case 'displayQuizQuestion':
        return (
          <div className={className}>
            <QuizQuestionFromTool output={output as QuizQuestionToolOutput} />
          </div>
        );

      case 'displayReviewSession':
        return (
          <div className={className}>
            <ReviewSessionFromTool output={output as ReviewSessionToolOutput} />
          </div>
        );

      case 'displayProgressSummary':
        return (
          <div className={className}>
            <ProgressSummaryFromTool output={output as ProgressSummaryToolOutput} />
          </div>
        );

      case 'displayConceptExplanation':
        return (
          <div className={className}>
            <ConceptExplanation output={output as ConceptExplanationToolOutput} />
          </div>
        );

      default:
        return null;
    }
  }

  return null;
});

export default LearningToolPart;
