'use client';

/**
 * Quiz Component - Interactive quiz for generative UI
 * 
 * Renders interactive quizzes with multiple question types:
 * - Multiple choice
 * - True/False
 * - Fill in the blank
 * - Short answer
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Clock,
  Trophy,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/stores/learning-store';
import type {
  QuizData,
  QuizQuestionData,
  QuizToolOutput,
  QuizQuestionToolOutput,
} from '@/lib/ai/tools/learning-tools';

interface QuestionResult {
  questionId: string;
  correct: boolean;
  userAnswer: string;
  timeSpentMs: number;
}

interface QuizQuestionProps {
  question: QuizQuestionData;
  sessionId?: string;
  showHint?: boolean;
  showFeedback?: boolean;
  allowRetry?: boolean;
  onAnswer?: (result: QuestionResult) => void;
  className?: string;
}

export const QuizQuestion = memo(function QuizQuestion({
  question,
  sessionId,
  showHint: initialShowHint = false,
  showFeedback = true,
  allowRetry = true,
  onAnswer,
  className,
}: QuizQuestionProps) {
  const t = useTranslations('learning');
  const [userAnswer, setUserAnswer] = useState('');
  const [showHint, setShowHint] = useState(initialShowHint);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [startTime] = useState(() => Date.now());
  const learningStore = useLearningStore();

  const checkAnswer = useCallback((answer: string): boolean => {
    const normalizedAnswer = answer.trim().toLowerCase();
    const normalizedCorrect = question.correctAnswer.trim().toLowerCase();

    if (question.type === 'true_false') {
      return normalizedAnswer === normalizedCorrect;
    }

    if (question.type === 'multiple_choice') {
      return normalizedAnswer === normalizedCorrect;
    }

    if (question.type === 'fill_blank') {
      return normalizedAnswer === normalizedCorrect;
    }

    // Short answer - more lenient matching
    return normalizedCorrect.includes(normalizedAnswer) || 
           normalizedAnswer.includes(normalizedCorrect);
  }, [question.correctAnswer, question.type]);

  const handleSubmit = useCallback(() => {
    if (!userAnswer.trim()) return;

    const correct = checkAnswer(userAnswer);
    const timeSpentMs = Date.now() - startTime;
    
    setIsSubmitted(true);
    setIsCorrect(correct);

    if (sessionId && question.conceptId) {
      learningStore.recordAnswer(sessionId, correct, timeSpentMs);
    }

    onAnswer?.({
      questionId: question.id,
      correct,
      userAnswer,
      timeSpentMs,
    });
  }, [userAnswer, checkAnswer, startTime, sessionId, question.id, question.conceptId, learningStore, onAnswer]);

  const handleRetry = useCallback(() => {
    setUserAnswer('');
    setIsSubmitted(false);
    setIsCorrect(null);
    setShowHint(false);
  }, []);

  const renderQuestionInput = () => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <RadioGroup
            value={userAnswer}
            onValueChange={setUserAnswer}
            disabled={isSubmitted}
            className="space-y-2"
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={option}
                  id={`option-${index}`}
                  className={cn(
                    isSubmitted && option === question.correctAnswer && 'border-green-500',
                    isSubmitted && userAnswer === option && !isCorrect && 'border-red-500'
                  )}
                />
                <Label
                  htmlFor={`option-${index}`}
                  className={cn(
                    'cursor-pointer',
                    isSubmitted && option === question.correctAnswer && 'text-green-600 font-medium',
                    isSubmitted && userAnswer === option && !isCorrect && 'text-red-600 line-through'
                  )}
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'true_false':
        return (
          <RadioGroup
            value={userAnswer}
            onValueChange={setUserAnswer}
            disabled={isSubmitted}
            className="flex gap-4"
          >
            {['true', 'false'].map((value) => (
              <div key={value} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={value}
                  id={`tf-${value}`}
                  className={cn(
                    isSubmitted && value === question.correctAnswer && 'border-green-500',
                    isSubmitted && userAnswer === value && !isCorrect && 'border-red-500'
                  )}
                />
                <Label
                  htmlFor={`tf-${value}`}
                  className={cn(
                    'cursor-pointer capitalize',
                    isSubmitted && value === question.correctAnswer && 'text-green-600 font-medium',
                    isSubmitted && userAnswer === value && !isCorrect && 'text-red-600'
                  )}
                >
                  {t(`quiz.${value}`)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'fill_blank':
      case 'short_answer':
      default:
        return (
          <Input
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder={t('quiz.typeAnswer')}
            disabled={isSubmitted}
            className={cn(
              isSubmitted && isCorrect && 'border-green-500 bg-green-50 dark:bg-green-900/20',
              isSubmitted && !isCorrect && 'border-red-500 bg-red-50 dark:bg-red-900/20'
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isSubmitted) {
                handleSubmit();
              }
            }}
          />
        );
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="pt-6 space-y-4">
        {/* Question */}
        <div className="space-y-2">
          <p className="text-lg font-medium">{question.question}</p>
          {question.points && (
            <Badge variant="outline" className="text-xs">
              {question.points} {t('quiz.points')}
            </Badge>
          )}
        </div>

        {/* Hint */}
        {question.hint && showHint && !isSubmitted && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Lightbulb className="h-4 w-4" />
              <span className="text-sm">{question.hint}</span>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="space-y-3">
          {renderQuestionInput()}
        </div>

        {/* Feedback */}
        {isSubmitted && showFeedback && (
          <div
            className={cn(
              'p-4 rounded-lg',
              isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
            )}
          >
            <div className="flex items-start gap-3">
              {isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className={cn(
                  'font-medium',
                  isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                )}>
                  {isCorrect ? t('quiz.correct') : t('quiz.incorrect')}
                </p>
                {!isCorrect && (
                  <p className="text-sm text-muted-foreground">
                    {t('quiz.correctAnswerIs')}: <span className="font-medium">{question.correctAnswer}</span>
                  </p>
                )}
                {question.explanation && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {question.explanation}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!isSubmitted && (
            <>
              {question.hint && !showHint && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHint(true)}
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  {t('showHint')}
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!userAnswer.trim()}
                className="ml-auto"
              >
                {t('quiz.submit')}
              </Button>
            </>
          )}
          {isSubmitted && allowRetry && !isCorrect && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="ml-auto"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('quiz.tryAgain')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

interface QuizProps {
  quiz: QuizData;
  sessionId?: string;
  allowRetry?: boolean;
  showFeedback?: boolean;
  onComplete?: (results: {
    score: number;
    totalPoints: number;
    accuracy: number;
    results: QuestionResult[];
    timeSpentMs: number;
  }) => void;
  className?: string;
}

export const Quiz = memo(function Quiz({
  quiz,
  sessionId,
  allowRetry = true,
  showFeedback = true,
  onComplete,
  className,
}: QuizProps) {
  const t = useTranslations('learning');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(quiz.timeLimit ?? null);
  const [startTime] = useState(() => Date.now());

  const [questions] = useState(() => {
    if (quiz.shuffleQuestions) {
      // Shuffle once on initial render
      const shuffled = [...quiz.questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    return quiz.questions;
  });

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || isComplete) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isComplete]);

  const handleAnswer = useCallback((result: QuestionResult) => {
    setResults((prev) => [...prev, result]);
  }, []);

  const handleComplete = useCallback(() => {
    setIsComplete(true);
    
    const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points ?? 1), 0);
    const score = results.reduce((sum, r) => {
      const question = quiz.questions.find((q) => q.id === r.questionId);
      return sum + (r.correct ? (question?.points ?? 1) : 0);
    }, 0);
    const accuracy = results.length > 0 
      ? Math.round((results.filter((r) => r.correct).length / results.length) * 100)
      : 0;
    const timeSpentMs = Date.now() - startTime;

    onComplete?.({
      score,
      totalPoints,
      accuracy,
      results,
      timeSpentMs,
    });
  }, [quiz.questions, results, startTime, onComplete]);

  // Auto-submit when time runs out - defer to avoid setState in effect warning
  useEffect(() => {
    if (timeRemaining === 0 && !isComplete) {
      const timeoutId = setTimeout(() => {
        handleComplete();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [timeRemaining, isComplete, handleComplete]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentIndex, questions.length, handleComplete]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setResults([]);
    setIsComplete(false);
    setTimeRemaining(quiz.timeLimit ?? null);
  }, [quiz.timeLimit]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isComplete) {
    const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points ?? 1), 0);
    const score = results.reduce((sum, r) => {
      const question = quiz.questions.find((q) => q.id === r.questionId);
      return sum + (r.correct ? (question?.points ?? 1) : 0);
    }, 0);
    const accuracy = results.length > 0
      ? Math.round((results.filter((r) => r.correct).length / results.length) * 100)
      : 0;
    const passed = quiz.passingScore ? accuracy >= quiz.passingScore : true;

    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center space-y-4">
          <div className={cn(
            'mx-auto w-16 h-16 rounded-full flex items-center justify-center',
            passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
          )}>
            {passed ? (
              <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
            ) : (
              <Target className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            )}
          </div>
          
          <h3 className="text-xl font-semibold">{t('quiz.completed')}</h3>
          
          <div className="text-4xl font-bold text-primary">{accuracy}%</div>
          
          <div className="text-muted-foreground">
            <p>{t('quiz.scoreResult', { score, total: totalPoints })}</p>
            <p>{t('quiz.correctCount', { correct: results.filter((r) => r.correct).length, total: results.length })}</p>
          </div>

          {quiz.passingScore && (
            <Badge variant={passed ? 'default' : 'destructive'}>
              {passed ? t('quiz.passed') : t('quiz.failed')} ({t('quiz.passingScore')}: {quiz.passingScore}%)
            </Badge>
          )}

          <div className="flex justify-center gap-3 pt-4">
            <Button variant="outline" onClick={handleRestart}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('quiz.retake')}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{quiz.title}</CardTitle>
            {timeRemaining !== null && (
              <Badge variant={timeRemaining < 60 ? 'destructive' : 'outline'} className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(timeRemaining)}
              </Badge>
            )}
          </div>
          {quiz.description && (
            <p className="text-sm text-muted-foreground">{quiz.description}</p>
          )}
        </CardHeader>
      </Card>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t('quiz.questionProgress', { current: currentIndex + 1, total: questions.length })}
          </span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Current Question */}
      <QuizQuestion
        question={currentQuestion}
        sessionId={sessionId}
        showFeedback={showFeedback}
        allowRetry={allowRetry}
        onAnswer={handleAnswer}
      />

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentIndex((prev) => prev - 1)}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t('previous')}
        </Button>
        <Button
          size="sm"
          onClick={handleNext}
          disabled={!results.find((r) => r.questionId === currentQuestion.id)}
        >
          {currentIndex === questions.length - 1 ? t('quiz.finish') : t('next')}
          {currentIndex < questions.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
});

/**
 * Wrapper component for single question tool output
 */
interface QuizQuestionFromToolProps {
  output: QuizQuestionToolOutput;
  onAnswer?: (result: QuestionResult) => void;
}

export const QuizQuestionFromTool = memo(function QuizQuestionFromTool({
  output,
  onAnswer,
}: QuizQuestionFromToolProps) {
  return (
    <QuizQuestion
      question={output.question}
      sessionId={output.sessionId}
      showHint={output.showHint}
      onAnswer={onAnswer}
    />
  );
});

/**
 * Wrapper component for quiz tool output
 */
interface QuizFromToolProps {
  output: QuizToolOutput;
  onComplete?: (results: {
    score: number;
    totalPoints: number;
    accuracy: number;
    results: QuestionResult[];
    timeSpentMs: number;
  }) => void;
}

export const QuizFromTool = memo(function QuizFromTool({
  output,
  onComplete,
}: QuizFromToolProps) {
  return (
    <Quiz
      quiz={output.quiz}
      sessionId={output.sessionId}
      allowRetry={output.allowRetry}
      showFeedback={output.showFeedback}
      onComplete={onComplete}
    />
  );
});

export default Quiz;
