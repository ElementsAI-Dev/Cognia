'use client';

/**
 * Quiz Interface Component
 *
 * Interactive quiz and practice interface for SpeedPass learning.
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Flag,
  Lightbulb,
} from 'lucide-react';
import { useQuizManager } from '@/hooks/learning';
import { cn } from '@/lib/utils';
import type { QuizQuestion, QuestionOption } from '@/types/learning/speedpass';
import type { QuizResult } from '@/lib/learning/speedpass/quiz-engine';

// ============================================================================
// Main Component
// ============================================================================

import { useTranslations } from 'next-intl';

interface QuizInterfaceProps {
  textbookId: string;
  knowledgePointIds?: string[];
  questionCount?: number;
  onComplete?: (quizId: string) => void;
  onCancel?: () => void;
}

export function QuizInterface({
  textbookId,
  knowledgePointIds = [],
  questionCount = 10,
  onComplete,
  onCancel,
}: QuizInterfaceProps) {
  const t = useTranslations('learningMode.speedpass.quiz');
  const quizManager = useQuizManager();
  const { currentQuiz, quizResult, createQuiz, submitAnswer, finishQuiz } = quizManager;
  const hintAction = quizManager.useHint;
  const navigateToQuestion = quizManager.goToQuestion;
  const getLiveQuiz = quizManager.getLiveQuiz;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState<string>('');
  const [startTime] = useState(() => Date.now());
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  // Initialize quiz
  useEffect(() => {
    if (!currentQuiz) {
      createQuiz(textbookId, knowledgePointIds, questionCount);
    }
  }, [currentQuiz, createQuiz, textbookId, knowledgePointIds, questionCount]);

  const handleAnswerChange = useCallback(
    (answer: string) => {
      setUserAnswers((prev) => ({ ...prev, [currentIndex]: answer }));
      setShowHint(false);
      setHintText('');
    },
    [currentIndex]
  );

  const handleSubmitAnswer = useCallback(() => {
    const answer = userAnswers[currentIndex];
    if (answer && currentQuiz) {
      submitAnswer(currentIndex, answer);
    }
  }, [currentIndex, userAnswers, currentQuiz, submitAnswer]);

  const handleNext = useCallback(() => {
    if (currentQuiz && currentIndex < currentQuiz.questions.length - 1) {
      handleSubmitAnswer();
      const targetIndex = currentIndex + 1;
      navigateToQuestion?.(targetIndex);
      setCurrentIndex(targetIndex);
      setShowHint(false);
      setHintText('');
    }
  }, [currentQuiz, currentIndex, handleSubmitAnswer, navigateToQuestion]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      const targetIndex = currentIndex - 1;
      navigateToQuestion?.(targetIndex);
      setCurrentIndex(targetIndex);
      setShowHint(false);
      setHintText('');
    }
  }, [currentIndex, navigateToQuestion]);

  const handleFinish = useCallback(() => {
    handleSubmitAnswer();
    const timeSpent = Date.now() - startTime;
    finishQuiz(timeSpent);
    if (currentQuiz && onComplete) {
      onComplete(currentQuiz.id);
    }
  }, [handleSubmitAnswer, finishQuiz, startTime, currentQuiz, onComplete]);

  const handleToggleFlag = useCallback(() => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentIndex)) {
        newSet.delete(currentIndex);
      } else {
        newSet.add(currentIndex);
      }
      return newSet;
    });
  }, [currentIndex]);

  const handleRetry = useCallback(() => {
    setCurrentIndex(0);
    setUserAnswers({});
    setShowHint(false);
    setHintText('');
    setFlaggedQuestions(new Set());
    createQuiz(textbookId, knowledgePointIds, questionCount);
  }, [createQuiz, textbookId, knowledgePointIds, questionCount]);

  const handleUseHint = useCallback(() => {
    const generatedHint = hintAction?.(currentIndex);
    setHintText(generatedHint || t('hint.content'));
    setShowHint(true);
  }, [hintAction, currentIndex, t]);

  // Show results if quiz is complete
  if (quizResult) {
    const liveQuiz = getLiveQuiz?.() || currentQuiz;
    const wrongCount = liveQuiz?.wrongQuestionIds?.length || quizResult.incorrectAnswers;
    return (
      <QuizResults
        result={quizResult}
        wrongQuestionsCount={wrongCount}
        suggestedReviewCount={wrongCount}
        onRetry={handleRetry}
        onClose={onCancel}
      />
    );
  }

  // Show loading if quiz not ready
  if (!currentQuiz || currentQuiz.questions.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">{t('loading')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const question = currentQuiz.questions[currentIndex];
  const progress = ((currentIndex + 1) / currentQuiz.questions.length) * 100;
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                {t('progress', { current: currentIndex + 1, total: currentQuiz.questions.length })}
              </Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <ElapsedTime startTime={startTime} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleFlag}
                      aria-label={t('flagQuestion')}
                      className={cn(flaggedQuestions.has(currentIndex) && 'text-yellow-500')}
                    >
                      <Flag className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('flagQuestion')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="outline" size="sm" onClick={onCancel}>
                {t('exit')}
              </Button>
            </div>
          </div>
          <Progress value={progress} className="mt-3" />
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="secondary" className="mb-2">
                {t(`questionTypes.${question.sourceQuestion.questionType}`)}
              </Badge>
              <CardTitle className="text-lg" data-testid="question-content">
                {question.sourceQuestion.content}
              </CardTitle>
            </div>
            {question.sourceQuestion.difficulty !== undefined && (
              <DifficultyBadge difficulty={question.sourceQuestion.difficulty} />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Answer Input */}
          <QuestionInput
            question={question}
            value={userAnswers[currentIndex] || ''}
            onChange={handleAnswerChange}
          />

          {/* Hint */}
          {showHint && question.hintsAvailable > 0 && (
            <Alert
              aria-live="polite"
              className="border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
            >
              <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle>{t('hint.title')}</AlertTitle>
              <AlertDescription>{hintText || t('hint.content')}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('prev')}
          </Button>
          {!showHint && question.hintsAvailable > question.hintsUsed && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" onClick={handleUseHint}>
                    <Lightbulb className="mr-2 h-4 w-4" />
                    {t('hint.button')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('hint.title')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex gap-2">
          {currentIndex < currentQuiz.questions.length - 1 ? (
            <Button onClick={handleNext}>
              {t('next')}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish}>
              {t('submit', { current: answeredCount, total: currentQuiz.questions.length })}
            </Button>
          )}
        </div>
      </div>

      {/* Question Navigator */}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground mb-3">{t('navigator')}</p>
          <ScrollArea className="max-h-32">
            <div className="flex flex-wrap gap-2">
              {currentQuiz.questions.map((_, idx) => (
                <Button
                  key={idx}
                  variant={idx === currentIndex ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'h-8 w-8 p-0',
                    userAnswers[idx] && idx !== currentIndex && 'bg-green-500/20 border-green-500',
                    flaggedQuestions.has(idx) && 'border-yellow-500'
                  )}
                  onClick={() => {
                    navigateToQuestion?.(idx);
                    setCurrentIndex(idx);
                    setShowHint(false);
                    setHintText('');
                  }}
                >
                  {idx + 1}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Question Input
// ============================================================================

interface QuestionInputProps {
  question: QuizQuestion;
  value: string;
  onChange: (value: string) => void;
}

function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  const t = useTranslations('learningMode.speedpass.quiz');
  const sourceQ = question.sourceQuestion;
  if (sourceQ.questionType === 'choice' && sourceQ.options) {
    return (
      <RadioGroup value={value} onValueChange={onChange}>
        <div className="space-y-3">
          {sourceQ.options.map((option: QuestionOption, idx: number) => (
            <div
              key={idx}
              className={cn(
                'flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors',
                value === option.label && 'border-primary bg-primary/5'
              )}
              onClick={() => onChange(option.label)}
            >
              <RadioGroupItem value={option.label} id={`option-${idx}`} />
              <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                <span className="font-medium">{option.label}.</span> {option.content}
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    );
  }

  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t('placeholder')}
      rows={4}
    />
  );
}

// ============================================================================
// Quiz Results
// ============================================================================

interface QuizResultsProps {
  result: QuizResult;
  wrongQuestionsCount?: number;
  suggestedReviewCount?: number;
  onRetry: () => void;
  onClose?: () => void;
}

function QuizResults({
  result,
  wrongQuestionsCount = 0,
  suggestedReviewCount = 0,
  onRetry,
  onClose,
}: QuizResultsProps) {
  const t = useTranslations('learningMode.speedpass.quiz.results');
  const { correctAnswers, incorrectAnswers, accuracy, timeSpentMs } = result;
  const minutes = Math.floor(timeSpentMs / 60000);
  const seconds = Math.floor((timeSpentMs % 60000) / 1000);

  const getGrade = () => {
    if (accuracy >= 90) return { label: t('grade.excellent'), color: 'text-green-500' };
    if (accuracy >= 75) return { label: t('grade.good'), color: 'text-blue-500' };
    if (accuracy >= 60) return { label: t('grade.pass'), color: 'text-yellow-500' };
    return { label: t('grade.fail'), color: 'text-red-500' };
  };

  const grade = getGrade();

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score */}
        <div className="text-center">
          <div className={cn('text-6xl font-bold', grade.color)}>{accuracy}%</div>
          <Badge variant="secondary" className="mt-2">
            {grade.label}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-500">{correctAnswers}</span>
            </div>
            <p className="text-sm text-muted-foreground">{t('correct')}</p>
          </div>
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-500">{incorrectAnswers}</span>
            </div>
            <p className="text-sm text-muted-foreground">{t('incorrect')}</p>
          </div>
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold text-blue-500">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t('time')}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          <p className="font-medium">错题与复习建议</p>
          <p className="mt-1 text-muted-foreground">
            本次已记录 {wrongQuestionsCount} 道错题，建议优先复习 {suggestedReviewCount} 道。
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button variant="outline" className="flex-1" onClick={onRetry}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t('retry')}
          </Button>
          {onClose && (
            <Button className="flex-1" onClick={onClose}>
              {t('finish')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function ElapsedTime({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);

  return <span aria-live="polite">{minutes}:{seconds.toString().padStart(2, '0')}</span>;
}

function DifficultyBadge({ difficulty }: { difficulty: number }) {
  const t = useTranslations('learningMode.speedpass.quiz.difficulty');
  const config =
    difficulty < 0.3
      ? { label: t('easy'), variant: 'default' as const }
      : difficulty < 0.7
        ? { label: t('medium'), variant: 'secondary' as const }
        : { label: t('hard'), variant: 'destructive' as const };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default QuizInterface;
