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
import type { DifficultyLevel, LearningStyle, LearningDurationType, LearningCategory, LearningPathDuration } from '@/types/learning';
import { detectLearningType } from '@/lib/learning';
import { cn } from '@/lib/utils';

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
  const { startLearning } = useLearningMode();

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

    onOpenChange(false);
    onStart?.();
  }, [topic, background, goals, difficulty, learningStyle, durationType, category, estimatedDuration, startLearning, onOpenChange, onStart]);

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
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            {t('startDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('startDialog.description')}
          </DialogDescription>
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

          {/* Learning Type Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {t('startDialog.learningType') || '学习类型'}
              {detectionConfidence > 0 && (
                <Badge variant="outline" className="text-xs ml-1">
                  {t('startDialog.autoDetected') || '自动检测'}
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
                <Zap className={cn('h-5 w-5', durationType === 'quick' ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-sm font-medium">{t('learningType.quick') || '快速学习'}</span>
                <span className="text-xs text-muted-foreground text-center">
                  {t('learningType.quickDesc') || '问个问题，快速解答'}
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
                <Map className={cn('h-5 w-5', durationType === 'journey' ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-sm font-medium">{t('learningType.journey') || '系统学习'}</span>
                <span className="text-xs text-muted-foreground text-center">
                  {t('learningType.journeyDesc') || '制定学习路径，跟踪进度'}
                </span>
              </button>
            </div>
          </div>

          {/* Journey-specific options */}
          {durationType === 'journey' && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50">
              <Label className="flex items-center gap-2">
                {t('startDialog.estimatedDuration') || '预计学习时长'}
              </Label>
              <Select value={estimatedDuration} onValueChange={(v) => setEstimatedDuration(v as LearningPathDuration)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">{t('duration.days') || '1-7 天'}</SelectItem>
                  <SelectItem value="weeks">{t('duration.weeks') || '1-4 周'}</SelectItem>
                  <SelectItem value="months">{t('duration.months') || '1-6 个月'}</SelectItem>
                  <SelectItem value="long-term">{t('duration.longTerm') || '6个月以上'}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('startDialog.journeyHint') || '系统学习会创建学习路径，包含里程碑和进度跟踪'}
              </p>
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
              <span className="text-muted-foreground text-xs">
                ({t('startDialog.optional')})
              </span>
            </Label>
            <Select value={learningStyle || ''} onValueChange={(v) => setLearningStyle(v as LearningStyle || undefined)}>
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
              <span className="text-muted-foreground text-xs">
                ({t('startDialog.optional')})
              </span>
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
            <p className="text-xs text-muted-foreground">
              {t('startDialog.goalHint')}
            </p>
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
