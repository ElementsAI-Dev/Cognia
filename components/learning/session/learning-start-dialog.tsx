'use client';

/**
 * Learning Start Dialog
 *
 * Dialog for starting a new learning session with topic and goals.
 */

import { memo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  GraduationCap,
  Plus,
  X,
  Target,
  BookOpen,
  Gauge,
  Palette,
  Zap,
  Map,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLearningMode } from '@/hooks/ui';
import { useSessionStore } from '@/stores/chat';
import type {
  DifficultyLevel,
  LearningStyle,
  LearningDurationType,
  LearningCategory,
  LearningPathDuration,
} from '@/types/learning';
import { detectLearningType, getTemplateById } from '@/lib/learning';
import { detectSpeedLearningMode } from '@/lib/learning/speedpass';
import { cn } from '@/lib/utils';
import type { LearningSubMode } from '@/types/core/session';

interface LearningStartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart?: () => void;
}

export const LearningStartDialog = memo(function LearningStartDialog({
  open,
  onOpenChange,
  onStart,
}: LearningStartDialogProps) {
  const t = useTranslations('learningMode');
  const { startLearning, config } = useLearningMode();
  const activeTemplateName = getTemplateById(config.activeTemplateId)?.name ?? 'Socratic Tutor';
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const updateSession = useSessionStore((state) => state.updateSession);

  const [topic, setTopic] = useState('');
  const [background, setBackground] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [learningStyle, setLearningStyle] = useState<LearningStyle | undefined>(undefined);

  // Learning type state
  const [durationType, setDurationType] = useState<LearningDurationType>('quick');
  const [category, setCategory] = useState<LearningCategory>('other');
  const [estimatedDuration, setEstimatedDuration] = useState<LearningPathDuration>('weeks');
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0);
  const [pathType, setPathType] = useState<LearningSubMode>('socratic');
  const [speedPassAvailableMinutes, setSpeedPassAvailableMinutes] = useState('');
  const [speedPassTargetScore, setSpeedPassTargetScore] = useState('');
  const [speedPassExamDate, setSpeedPassExamDate] = useState('');

  // Auto-detect learning type on topic blur
  const handleTopicBlur = useCallback(() => {
    if (topic.trim().length > 5) {
      const detection = detectLearningType(topic, {
        backgroundKnowledge: background,
        goals: goals,
      });
      setDurationType(detection.detectedType);
      setCategory(detection.category);
      if (detection.suggestedDuration) {
        setEstimatedDuration(detection.suggestedDuration);
      }
      setDetectionConfidence(detection.confidence);
    }
  }, [topic, background, goals]);

  const handleAddGoal = useCallback(() => {
    if (newGoal.trim()) {
      setGoals((prev) => [...prev, newGoal.trim()]);
      setNewGoal('');
    }
  }, [newGoal]);

  const handleRemoveGoal = useCallback((index: number) => {
    setGoals((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAddGoal();
      }
    },
    [handleAddGoal]
  );

  const handleStart = useCallback(() => {
    if (!topic.trim()) return;

    if (pathType === 'socratic') {
      startLearning({
        topic: topic.trim(),
        backgroundKnowledge: background.trim() || undefined,
        learningGoals: goals.length > 0 ? goals : undefined,
        preferredDifficulty: difficulty,
        preferredStyle: learningStyle,
        durationType,
        category,
        estimatedDuration: durationType === 'journey' ? estimatedDuration : undefined,
        autoDetectType: false, // We've already detected
      });
    }

    if (activeSessionId) {
      const parsedAvailableMinutes = Number.parseInt(speedPassAvailableMinutes, 10);
      const parsedTargetScore = Number.parseInt(speedPassTargetScore, 10);
      const modeDetection = detectSpeedLearningMode(topic, {
        availableTimeMinutes: Number.isFinite(parsedAvailableMinutes)
          ? parsedAvailableMinutes
          : undefined,
        targetScore: Number.isFinite(parsedTargetScore) ? parsedTargetScore : undefined,
      });

      updateSession(activeSessionId, {
        learningContext: {
          subMode: pathType,
          speedpassContext:
            pathType === 'speedpass'
              ? {
                  sourceMessage: topic.trim(),
                  availableTimeMinutes: Number.isFinite(parsedAvailableMinutes)
                    ? parsedAvailableMinutes
                    : undefined,
                  targetScore: Number.isFinite(parsedTargetScore) ? parsedTargetScore : undefined,
                  examDate: speedPassExamDate
                    ? new Date(`${speedPassExamDate}T00:00:00`).toISOString()
                    : undefined,
                  recommendedMode: modeDetection.recommendedMode,
                  updatedAt: new Date(),
                }
              : undefined,
        },
      });
    }

    // Reset form
    setTopic('');
    setBackground('');
    setGoals([]);
    setNewGoal('');
    setDifficulty('intermediate');
    setLearningStyle(undefined);
    setDurationType('quick');
    setCategory('other');
    setEstimatedDuration('weeks');
    setDetectionConfidence(0);
    setPathType('socratic');
    setSpeedPassAvailableMinutes('');
    setSpeedPassTargetScore('');
    setSpeedPassExamDate('');

    onOpenChange(false);
    onStart?.();
  }, [
    topic,
    background,
    goals,
    difficulty,
    learningStyle,
    durationType,
    category,
    estimatedDuration,
    pathType,
    startLearning,
    activeSessionId,
    speedPassAvailableMinutes,
    speedPassTargetScore,
    speedPassExamDate,
    updateSession,
    onOpenChange,
    onStart,
  ]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Reset form on close
    setTopic('');
    setBackground('');
    setGoals([]);
    setNewGoal('');
    setDifficulty('intermediate');
    setLearningStyle(undefined);
    setDurationType('quick');
    setCategory('other');
    setEstimatedDuration('weeks');
    setDetectionConfidence(0);
    setPathType('socratic');
    setSpeedPassAvailableMinutes('');
    setSpeedPassTargetScore('');
    setSpeedPassExamDate('');
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            {t('startDialog.title')}
          </DialogTitle>
          <DialogDescription>{t('startDialog.description')}</DialogDescription>
          <Badge variant="outline" className="mt-1 w-fit">
            {activeTemplateName}
          </Badge>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {t('startDialog.topic')}
            </Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onBlur={handleTopicBlur}
              placeholder={t('startDialog.topicPlaceholder')}
            />
          </div>

          {/* Learning Path Type */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              学习路径类型
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPathType('socratic')}
                className={cn(
                  'flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-colors text-left',
                  pathType === 'socratic'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <span className="text-sm font-medium">Socratic</span>
                <span className="text-xs text-muted-foreground">对话式引导理解与拆解</span>
              </button>
              <button
                type="button"
                onClick={() => setPathType('speedpass')}
                className={cn(
                  'flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-colors text-left',
                  pathType === 'speedpass'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <span className="text-sm font-medium">SpeedPass</span>
                <span className="text-xs text-muted-foreground">目标导向备考与刷题速通</span>
              </button>
            </div>
          </div>

          {pathType === 'speedpass' && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/50">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="speedpass-minutes">可用时长(分钟)</Label>
                  <Input
                    id="speedpass-minutes"
                    type="number"
                    min={0}
                    value={speedPassAvailableMinutes}
                    onChange={(e) => setSpeedPassAvailableMinutes(e.target.value)}
                    placeholder="120"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="speedpass-target">目标分数</Label>
                  <Input
                    id="speedpass-target"
                    type="number"
                    min={0}
                    max={100}
                    value={speedPassTargetScore}
                    onChange={(e) => setSpeedPassTargetScore(e.target.value)}
                    placeholder="75"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="speedpass-exam-date">考试日期</Label>
                <Input
                  id="speedpass-exam-date"
                  type="date"
                  value={speedPassExamDate}
                  onChange={(e) => setSpeedPassExamDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Learning Type Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {t('startDialog.learningType')}
              {detectionConfidence > 0 && (
                <Badge variant="outline" className="text-xs ml-1">
                  {t('startDialog.autoDetected')}
                </Badge>
              )}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDurationType('quick')}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors',
                  durationType === 'quick'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <Zap
                  className={cn(
                    'h-5 w-5',
                    durationType === 'quick' ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <span className="text-sm font-medium">{t('learningType.quick')}</span>
                <span className="text-xs text-muted-foreground text-center">
                  {t('learningType.quickDesc')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDurationType('journey')}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors',
                  durationType === 'journey'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <Map
                  className={cn(
                    'h-5 w-5',
                    durationType === 'journey' ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <span className="text-sm font-medium">{t('learningType.journey')}</span>
                <span className="text-xs text-muted-foreground text-center">
                  {t('learningType.journeyDesc')}
                </span>
              </button>
            </div>
          </div>

          {/* Journey-specific options */}
          {durationType === 'journey' && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50">
              <Label className="flex items-center gap-2">
                {t('startDialog.estimatedDuration')}
              </Label>
              <Select
                value={estimatedDuration}
                onValueChange={(v) => setEstimatedDuration(v as LearningPathDuration)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">{t('duration.days')}</SelectItem>
                  <SelectItem value="weeks">{t('duration.weeks')}</SelectItem>
                  <SelectItem value="months">{t('duration.months')}</SelectItem>
                  <SelectItem value="long-term">{t('duration.longTerm')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('startDialog.journeyHint')}</p>
            </div>
          )}

          {/* Background Knowledge */}
          <div className="space-y-2">
            <Label htmlFor="background">
              {t('startDialog.background')}
              <span className="text-muted-foreground text-xs ml-1">
                ({t('startDialog.optional')})
              </span>
            </Label>
            <Textarea
              id="background"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder={t('startDialog.backgroundPlaceholder')}
              className="min-h-[80px]"
            />
          </div>

          {/* Difficulty Level */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              {t('startDialog.difficulty')}
            </Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as DifficultyLevel)}>
              <SelectTrigger>
                <SelectValue placeholder={t('startDialog.difficultyHint')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">{t('difficulty.beginner')}</SelectItem>
                <SelectItem value="intermediate">{t('difficulty.intermediate')}</SelectItem>
                <SelectItem value="advanced">{t('difficulty.advanced')}</SelectItem>
                <SelectItem value="expert">{t('difficulty.expert')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Learning Style */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t('startDialog.learningStyle')}
              <span className="text-muted-foreground text-xs">({t('startDialog.optional')})</span>
            </Label>
            <Select
              value={learningStyle || ''}
              onValueChange={(v) => setLearningStyle((v as LearningStyle) || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('startDialog.learningStyleHint')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visual">{t('style.visual')}</SelectItem>
                <SelectItem value="auditory">{t('style.auditory')}</SelectItem>
                <SelectItem value="reading">{t('style.reading')}</SelectItem>
                <SelectItem value="kinesthetic">{t('style.kinesthetic')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Learning Goals */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              {t('startDialog.goals')}
              <span className="text-muted-foreground text-xs">({t('startDialog.optional')})</span>
            </Label>

            {goals.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {goals.map((goal, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 flex items-center gap-1"
                  >
                    <span className="text-xs max-w-[200px] truncate">{goal}</span>
                    <button
                      onClick={() => handleRemoveGoal(index)}
                      className="hover:bg-muted rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('startDialog.goalPlaceholder')}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddGoal}
                disabled={!newGoal.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('startDialog.goalHint')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('startDialog.cancel')}
          </Button>
          <Button onClick={handleStart} disabled={!topic.trim()}>
            <GraduationCap className="h-4 w-4 mr-2" />
            {t('startDialog.start')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default LearningStartDialog;
