'use client';

/**
 * Flashcard Component - Interactive flashcard for generative UI
 *
 * Renders an interactive flashcard that users can flip to reveal answers.
 * Supports difficulty rating, hints, and integration with learning store.
 */

import { memo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  RotateCcw,
  Lightbulb,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/stores/learning';
import type {
  FlashcardData,
  FlashcardToolOutput,
  FlashcardDeckToolOutput,
} from '@/lib/ai/tools/learning-tools';

/**
 * Rating for spaced repetition (SM-2 algorithm quality scores)
 */
type RecallRating = 'forgot' | 'hard' | 'good' | 'easy';

const RATING_QUALITY: Record<RecallRating, number> = {
  forgot: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

interface FlashcardProps {
  flashcard: FlashcardData;
  sessionId?: string;
  showHint?: boolean;
  onRate?: (rating: RecallRating, flashcardId: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  currentIndex?: number;
  totalCards?: number;
  className?: string;
}

export const Flashcard = memo(function Flashcard({
  flashcard,
  sessionId,
  showHint: initialShowHint = false,
  onRate,
  onNext,
  onPrevious,
  currentIndex,
  totalCards,
  className,
}: FlashcardProps) {
  const t = useTranslations('learning');
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(initialShowHint);
  const [hasRated, setHasRated] = useState(false);
  const learningStore = useLearningStore();

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleShowHint = useCallback(() => {
    setShowHint(true);
  }, []);

  const handleRate = useCallback(
    (rating: RecallRating) => {
      setHasRated(true);

      if (sessionId && flashcard.conceptId) {
        const quality = RATING_QUALITY[rating];
        learningStore.updateReviewItem(sessionId, flashcard.id, quality);
        learningStore.recordAnswer(sessionId, rating !== 'forgot', 0);
      }

      onRate?.(rating, flashcard.id);
    },
    [sessionId, flashcard.id, flashcard.conceptId, learningStore, onRate]
  );

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    setShowHint(false);
    setHasRated(false);
    onNext?.();
  }, [onNext]);

  const handlePrevious = useCallback(() => {
    setIsFlipped(false);
    setShowHint(false);
    setHasRated(false);
    onPrevious?.();
  }, [onPrevious]);

  const difficultyColors = {
    easy: 'bg-green-500/10 text-green-600 dark:text-green-400',
    medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    hard: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };

  return (
    <div className={cn('w-full max-w-lg mx-auto', className)}>
      {/* Progress indicator */}
      {currentIndex !== undefined && totalCards !== undefined && (
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-sm text-muted-foreground">
            {t('cardProgress', { current: currentIndex + 1, total: totalCards })}
          </span>
          {flashcard.difficulty && (
            <Badge variant="outline" className={difficultyColors[flashcard.difficulty]}>
              {t(`difficulty.${flashcard.difficulty}`)}
            </Badge>
          )}
        </div>
      )}

      {/* Flashcard */}
      <div
        className="relative w-full aspect-[3/2] perspective-1000 cursor-pointer"
        onClick={handleFlip}
      >
        <div
          className={cn(
            'absolute inset-0 w-full h-full transition-transform duration-500 transform-style-preserve-3d',
            isFlipped && 'rotate-y-180'
          )}
        >
          {/* Front */}
          <Card className="absolute inset-0 w-full h-full backface-hidden">
            <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center">
              <p className="text-lg font-medium">{flashcard.front}</p>

              {/* Hint */}
              {flashcard.hint && showHint && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Lightbulb className="h-4 w-4" />
                    <span className="text-sm">{flashcard.hint}</span>
                  </div>
                </div>
              )}

              {/* Tags */}
              {flashcard.tags && flashcard.tags.length > 0 && (
                <div className="absolute bottom-4 left-4 flex items-center gap-1 flex-wrap">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  {flashcard.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <p className="absolute bottom-4 right-4 text-xs text-muted-foreground">
                {t('clickToFlip')}
              </p>
            </CardContent>
          </Card>

          {/* Back */}
          <Card className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-primary/5">
            <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center">
              <p className="text-lg">{flashcard.back}</p>

              <p className="absolute bottom-4 right-4 text-xs text-muted-foreground">
                {t('clickToFlipBack')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 space-y-3">
        {/* Hint button (only show when front is visible and hint exists) */}
        {!isFlipped && flashcard.hint && !showHint && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleShowHint();
            }}
            className="w-full"
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            {t('showHint')}
          </Button>
        )}

        {/* Rating buttons (only show when flipped) */}
        {isFlipped && !hasRated && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={(e) => {
                e.stopPropagation();
                handleRate('forgot');
              }}
            >
              <X className="h-4 w-4 mr-1" />
              {t('rating.forgot')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-yellow-600 border-yellow-200 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
              onClick={(e) => {
                e.stopPropagation();
                handleRate('hard');
              }}
            >
              {t('rating.hard')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              onClick={(e) => {
                e.stopPropagation();
                handleRate('good');
              }}
            >
              {t('rating.good')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={(e) => {
                e.stopPropagation();
                handleRate('easy');
              }}
            >
              <Check className="h-4 w-4 mr-1" />
              {t('rating.easy')}
            </Button>
          </div>
        )}

        {/* Navigation */}
        {(onPrevious || onNext) && (
          <div className="flex justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              disabled={!onPrevious || currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('previous')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped(false);
              }}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {t('reset')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              disabled={
                !onNext ||
                (currentIndex !== undefined &&
                  totalCards !== undefined &&
                  currentIndex >= totalCards - 1)
              }
            >
              {t('next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Flashcard Deck Component - Multiple flashcards with navigation
 */
interface FlashcardDeckProps {
  title: string;
  description?: string;
  flashcards: FlashcardData[];
  sessionId?: string;
  shuffled?: boolean;
  onComplete?: (results: { cardId: string; rating: RecallRating }[]) => void;
  className?: string;
}

export const FlashcardDeck = memo(function FlashcardDeck({
  title,
  description,
  flashcards,
  sessionId,
  shuffled = false,
  onComplete,
  className,
}: FlashcardDeckProps) {
  const t = useTranslations('learning');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cards, setCards] = useState(() =>
    shuffled ? [...flashcards].sort(() => Math.random() - 0.5) : flashcards
  );
  const [results, setResults] = useState<{ cardId: string; rating: RecallRating }[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const handleRate = useCallback((rating: RecallRating, cardId: string) => {
    setResults((prev) => [...prev, { cardId, rating }]);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsComplete(true);
      onComplete?.(results);
    }
  }, [currentIndex, cards.length, results, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleShuffle = useCallback(() => {
    setCards([...cards].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setResults([]);
    setIsComplete(false);
  }, [cards]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setResults([]);
    setIsComplete(false);
  }, []);

  if (isComplete) {
    const correct = results.filter((r) => r.rating !== 'forgot').length;
    const accuracy = Math.round((correct / results.length) * 100);

    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold">{t('deckComplete')}</h3>
          <div className="text-4xl font-bold text-primary">{accuracy}%</div>
          <p className="text-muted-foreground">
            {t('deckResults', { correct, total: results.length })}
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={handleRestart}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('restart')}
            </Button>
            <Button variant="outline" onClick={handleShuffle}>
              <Shuffle className="h-4 w-4 mr-2" />
              {t('shuffleAndRestart')}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>

      {/* Current Card */}
      <Flashcard
        flashcard={cards[currentIndex]}
        sessionId={sessionId}
        onRate={handleRate}
        onNext={handleNext}
        onPrevious={handlePrevious}
        currentIndex={currentIndex}
        totalCards={cards.length}
      />
    </div>
  );
});

/**
 * Wrapper component for tool output
 */
interface FlashcardFromToolProps {
  output: FlashcardToolOutput;
  onRate?: (rating: RecallRating, flashcardId: string) => void;
}

export const FlashcardFromTool = memo(function FlashcardFromTool({
  output,
  onRate,
}: FlashcardFromToolProps) {
  return (
    <Flashcard
      flashcard={output.flashcard}
      sessionId={output.sessionId}
      showHint={output.showHint}
      onRate={onRate}
    />
  );
});

/**
 * Wrapper component for deck tool output
 */
interface FlashcardDeckFromToolProps {
  output: FlashcardDeckToolOutput;
  onComplete?: (results: { cardId: string; rating: RecallRating }[]) => void;
}

export const FlashcardDeckFromTool = memo(function FlashcardDeckFromTool({
  output,
  onComplete,
}: FlashcardDeckFromToolProps) {
  return (
    <FlashcardDeck
      title={output.title}
      description={output.description}
      flashcards={output.flashcards}
      sessionId={output.sessionId}
      onComplete={onComplete}
    />
  );
});

export default Flashcard;
