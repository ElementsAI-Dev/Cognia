'use client';

/**
 * Learning Mode Panel
 * 
 * Side panel showing learning progress, phases, and sub-questions
 * for the Socratic Method-based learning mode.
 */

import { memo, useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  GraduationCap,
  HelpCircle,
  GitBranch,
  MessageCircleQuestion,
  RefreshCw,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Target,
  X,
  Play,
  Pause,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLearningMode } from '@/hooks/use-learning-mode';
import type { LearningPhase, LearningSubQuestion, LearningGoal } from '@/types/learning';

const PHASE_ICONS: Record<LearningPhase, React.ReactNode> = {
  clarification: <HelpCircle className="h-4 w-4" />,
  deconstruction: <GitBranch className="h-4 w-4" />,
  questioning: <MessageCircleQuestion className="h-4 w-4" />,
  feedback: <RefreshCw className="h-4 w-4" />,
  summary: <GraduationCap className="h-4 w-4" />,
};

const PHASE_ORDER: LearningPhase[] = [
  'clarification',
  'deconstruction',
  'questioning',
  'feedback',
  'summary',
];

interface LearningModePanelProps {
  onClose?: () => void;
  className?: string;
}

export const LearningModePanel = memo(function LearningModePanel({
  onClose,
  className,
}: LearningModePanelProps) {
  const t = useTranslations('learningMode');
  const {
    learningSession,
    isLearningActive,
    currentPhase,
    progress,
    subQuestions,
    learningGoals,
    advancePhase,
    endLearning,
  } = useLearningMode();

  const [isGoalsExpanded, setIsGoalsExpanded] = useState(true);
  const [isQuestionsExpanded, setIsQuestionsExpanded] = useState(true);

  const handleEndLearning = useCallback(() => {
    endLearning();
  }, [endLearning]);

  if (!isLearningActive || !learningSession) {
    return (
      <Card className={cn('flex flex-col items-center justify-center p-6 relative', className)}>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-2 right-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center">
          {t('noActiveSession')}
        </p>
      </Card>
    );
  }

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('title')}</CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription className="line-clamp-2">
          {learningSession.topic}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('progress')}</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Phase Timeline */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t('phases')}</h4>
          <div className="flex items-center justify-between">
            {PHASE_ORDER.map((phase, index) => {
              const isActive = phase === currentPhase;
              const isPast = PHASE_ORDER.indexOf(currentPhase!) > index;
              const isFuture = !isActive && !isPast;

              return (
                <div key={phase} className="flex items-center">
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                      isActive && 'border-primary bg-primary text-primary-foreground',
                      isPast && 'border-green-500 bg-green-500 text-white',
                      isFuture && 'border-muted-foreground/30 text-muted-foreground/50'
                    )}
                  >
                    {isPast ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      PHASE_ICONS[phase]
                    )}
                  </div>
                  {index < PHASE_ORDER.length - 1 && (
                    <div
                      className={cn(
                        'w-4 h-0.5 mx-1',
                        isPast ? 'bg-green-500' : 'bg-muted-foreground/20'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t(`phase.${currentPhase}`)}
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-4">
            {/* Learning Goals */}
            <Collapsible open={isGoalsExpanded} onOpenChange={setIsGoalsExpanded}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('goals')}</span>
                  <Badge variant="secondary" className="text-xs">
                    {learningGoals.filter((g) => g.achieved).length}/{learningGoals.length}
                  </Badge>
                </div>
                {isGoalsExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {learningGoals.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    {t('noGoalsYet')}
                  </p>
                ) : (
                  learningGoals.map((goal) => (
                    <GoalItem key={goal.id} goal={goal} />
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Sub-Questions */}
            <Collapsible open={isQuestionsExpanded} onOpenChange={setIsQuestionsExpanded}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                <div className="flex items-center gap-2">
                  <MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('subQuestions')}</span>
                  <Badge variant="secondary" className="text-xs">
                    {subQuestions.filter((sq) => sq.status === 'resolved').length}/{subQuestions.length}
                  </Badge>
                </div>
                {isQuestionsExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {subQuestions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    {t('noQuestionsYet')}
                  </p>
                ) : (
                  subQuestions.map((sq) => (
                    <SubQuestionItem
                      key={sq.id}
                      subQuestion={sq}
                      isActive={sq.id === learningSession.currentSubQuestionId}
                    />
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {currentPhase !== 'summary' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={advancePhase}
            >
              <Play className="h-3 w-3 mr-1" />
              {t('nextPhase')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEndLearning}
          >
            <Pause className="h-3 w-3 mr-1" />
            {t('endSession')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

interface GoalItemProps {
  goal: LearningGoal;
}

const GoalItem = memo(function GoalItem({ goal }: GoalItemProps) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
      {goal.achieved ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      )}
      <span
        className={cn(
          'text-sm',
          goal.achieved && 'line-through text-muted-foreground'
        )}
      >
        {goal.description}
      </span>
    </div>
  );
});

interface SubQuestionItemProps {
  subQuestion: LearningSubQuestion;
  isActive: boolean;
}

const SubQuestionItem = memo(function SubQuestionItem({
  subQuestion,
  isActive,
}: SubQuestionItemProps) {
  const t = useTranslations('learningMode');
  const statusColors = {
    pending: 'text-muted-foreground',
    in_progress: 'text-blue-500',
    resolved: 'text-green-500',
    skipped: 'text-yellow-500',
  };

  const statusIcons = {
    pending: <Circle className="h-3 w-3" />,
    in_progress: <RefreshCw className="h-3 w-3 animate-spin" />,
    resolved: <CheckCircle2 className="h-3 w-3" />,
    skipped: <ChevronRight className="h-3 w-3" />,
  };

  return (
    <div
      className={cn(
        'p-2 rounded-md border transition-colors',
        isActive && 'border-primary bg-primary/5',
        !isActive && 'border-transparent bg-muted/50'
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn('mt-0.5 shrink-0', statusColors[subQuestion.status])}>
          {statusIcons[subQuestion.status]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm line-clamp-2">{subQuestion.question}</p>
          <div className="flex items-center gap-2 mt-1">
            {subQuestion.userAttempts > 0 && (
              <span className="text-xs text-muted-foreground">
                {t('attempts', { count: subQuestion.userAttempts })}
              </span>
            )}
            {subQuestion.hints.length > 0 && (
              <span className="text-xs text-amber-500 flex items-center gap-0.5">
                <Lightbulb className="h-3 w-3" />
                {subQuestion.hints.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default LearningModePanel;
