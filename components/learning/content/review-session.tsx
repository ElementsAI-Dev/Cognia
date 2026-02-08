'use client';

/**
 * Review Session Component - Combined flashcard and quiz review
 *
 * Provides an interactive review session that combines flashcards and
 * quiz questions with spaced repetition support.
 */

import { memo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  Trophy,
  Target,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/stores/learning';
import { Flashcard } from './flashcard';
import { QuizQuestion } from './quiz';
import type {
  ReviewSessionData,
  ReviewSessionToolOutput,
  FlashcardData,
  QuizQuestionData,
  ProgressSummaryToolOutput,
  ProgressStats,
  RecentActivity,
} from '@/lib/ai/tools/learning-tools';

type RecallRating = 'forgot' | 'hard' | 'good' | 'easy';

interface ReviewResult {
  itemId: string;
  type: 'flashcard' | 'quiz_question';
  correct: boolean;
  rating?: RecallRating;
  timeSpentMs: number;
}

interface ReviewSessionProps {
  session: ReviewSessionData;
  learningSessionId?: string;
  onComplete?: (results: {
    totalItems: number;
    correctCount: number;
    accuracy: number;
    results: ReviewResult[];
    timeSpentMs: number;
  }) => void;
  className?: string;
}

export const ReviewSession = memo(function ReviewSession({
  session,
  learningSessionId,
  onComplete,
  className,
}: ReviewSessionProps) {
  const t = useTranslations('learning');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [itemStartTime, setItemStartTime] = useState(() => Date.now());
  const learningStore = useLearningStore();

  const currentItem = session.items[currentIndex];

  const handleFlashcardRate = useCallback(
    (rating: RecallRating, flashcardId: string) => {
      const timeSpentMs = Date.now() - itemStartTime;
      const correct = rating !== 'forgot';

      setResults((prev) => [
        ...prev,
        {
          itemId: flashcardId,
          type: 'flashcard',
          correct,
          rating,
          timeSpentMs,
        },
      ]);

      if (learningSessionId) {
        learningStore.recordAnswer(learningSessionId, correct, timeSpentMs);
      }
    },
    [itemStartTime, learningSessionId, learningStore]
  );

  const handleQuizAnswer = useCallback(
    (result: { questionId: string; correct: boolean; timeSpentMs: number }) => {
      setResults((prev) => [
        ...prev,
        {
          itemId: result.questionId,
          type: 'quiz_question',
          correct: result.correct,
          timeSpentMs: result.timeSpentMs,
        },
      ]);
    },
    []
  );

  const handleNext = useCallback(() => {
    if (currentIndex < session.items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setItemStartTime(Date.now());
    } else {
      // Complete the session
      setIsComplete(true);

      const totalTimeSpentMs = Date.now() - startTime;
      const correctCount = results.filter((r) => r.correct).length;
      const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

      onComplete?.({
        totalItems: session.items.length,
        correctCount,
        accuracy,
        results,
        timeSpentMs: totalTimeSpentMs,
      });
    }
  }, [currentIndex, session.items.length, startTime, results, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setItemStartTime(Date.now());
    }
  }, [currentIndex]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setResults([]);
    setIsComplete(false);
    setItemStartTime(Date.now());
  }, []);

  const progress = (currentIndex / session.items.length) * 100;

  if (isComplete) {
    const correctCount = results.filter((r) => r.correct).length;
    const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;
    const passed = session.targetAccuracy ? accuracy >= session.targetAccuracy : true;

    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center space-y-4">
          <div
            className={cn(
              'mx-auto w-16 h-16 rounded-full flex items-center justify-center',
              passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
            )}
          >
            {passed ? (
              <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
            ) : (
              <Target className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            )}
          </div>

          <h3 className="text-xl font-semibold">{t('review.sessionComplete')}</h3>

          <div className="text-4xl font-bold text-primary">{accuracy}%</div>

          <div className="text-muted-foreground">
            <p>{t('review.correctCount', { correct: correctCount, total: results.length })}</p>
          </div>

          {session.targetAccuracy && (
            <Badge variant={passed ? 'default' : 'destructive'}>
              {passed ? t('review.targetMet') : t('review.targetNotMet')} ({t('review.target')}:{' '}
              {session.targetAccuracy}%)
            </Badge>
          )}

          <div className="flex justify-center gap-3 pt-4">
            <Button variant="outline" onClick={handleRestart}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('review.restart')}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{session.title}</CardTitle>
            </div>
            {session.mode && <Badge variant="outline">{t(`review.mode.${session.mode}`)}</Badge>}
          </div>
        </CardHeader>
      </Card>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t('review.itemProgress', { current: currentIndex + 1, total: session.items.length })}
          </span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Current Item */}
      <div className="min-h-[300px]">
        {currentItem.type === 'flashcard' ? (
          <Flashcard
            flashcard={currentItem.data as FlashcardData}
            sessionId={learningSessionId}
            onRate={handleFlashcardRate}
          />
        ) : (
          <QuizQuestion
            question={currentItem.data as QuizQuestionData}
            sessionId={learningSessionId}
            onAnswer={handleQuizAnswer}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={handlePrevious} disabled={currentIndex === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t('previous')}
        </Button>
        <Button
          size="sm"
          onClick={handleNext}
          disabled={!results.find((r) => r.itemId === currentItem.data.id)}
        >
          {currentIndex === session.items.length - 1 ? t('review.finish') : t('next')}
          {currentIndex < session.items.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
});

/**
 * Progress Summary Component
 */
interface ProgressSummaryProps {
  title: string;
  stats: ProgressStats;
  recentActivity?: RecentActivity[];
  recommendations?: string[];
  className?: string;
}

export const ProgressSummary = memo(function ProgressSummary({
  title,
  stats,
  recentActivity,
  recommendations,
  className,
}: ProgressSummaryProps) {
  const t = useTranslations('learning');

  const masteryPercentage =
    stats.totalConcepts > 0 ? Math.round((stats.masteredConcepts / stats.totalConcepts) * 100) : 0;

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-primary">{stats.masteredConcepts}</p>
            <p className="text-xs text-muted-foreground">{t('progress.mastered')}</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{stats.learningConcepts}</p>
            <p className="text-xs text-muted-foreground">{t('progress.learning')}</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-green-600">{stats.accuracy}%</p>
            <p className="text-xs text-muted-foreground">{t('progress.accuracy')}</p>
          </div>
          {stats.streakDays !== undefined && (
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-orange-500">{stats.streakDays}</p>
              <p className="text-xs text-muted-foreground">{t('progress.streakDays')}</p>
            </div>
          )}
        </div>

        {/* Mastery Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('progress.overallMastery')}</span>
            <span className="font-medium">{masteryPercentage}%</span>
          </div>
          <Progress value={masteryPercentage} className="h-3" />
        </div>

        {/* Recent Activity */}
        {recentActivity && recentActivity.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('progress.recentActivity')}</h4>
            <div className="space-y-1">
              {recentActivity.slice(0, 5).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                >
                  <span className="text-muted-foreground">{activity.date}</span>
                  <div className="flex items-center gap-4">
                    <span>
                      {activity.conceptsReviewed} {t('progress.reviewed')}
                    </span>
                    <Badge variant={activity.accuracy >= 80 ? 'default' : 'secondary'}>
                      {activity.accuracy}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              {t('progress.recommendations')}
            </h4>
            <ul className="space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * Wrapper component for review session tool output
 */
interface ReviewSessionFromToolProps {
  output: ReviewSessionToolOutput;
  onComplete?: (results: {
    totalItems: number;
    correctCount: number;
    accuracy: number;
    results: ReviewResult[];
    timeSpentMs: number;
  }) => void;
}

export const ReviewSessionFromTool = memo(function ReviewSessionFromTool({
  output,
  onComplete,
}: ReviewSessionFromToolProps) {
  return (
    <ReviewSession
      session={output.session}
      learningSessionId={output.learningSessionId}
      onComplete={onComplete}
    />
  );
});

/**
 * Wrapper component for progress summary tool output
 */
interface ProgressSummaryFromToolProps {
  output: ProgressSummaryToolOutput;
}

export const ProgressSummaryFromTool = memo(function ProgressSummaryFromTool({
  output,
}: ProgressSummaryFromToolProps) {
  return (
    <ProgressSummary
      title={output.title}
      stats={output.stats}
      recentActivity={output.recentActivity}
      recommendations={output.recommendations}
    />
  );
});

export default ReviewSession;
