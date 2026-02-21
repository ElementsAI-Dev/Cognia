'use client';

/**
 * Mode Selector Dialog
 *
 * A dialog component for selecting SpeedPass learning modes with:
 * - Visual comparison of three modes (extreme, speed, comprehensive)
 * - Time-based recommendations
 * - Estimated learning content preview
 */

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { SpeedLearningMode, Textbook } from '@/types/learning/speedpass';
import { detectSpeedLearningMode, getModeRecommendation } from '@/lib/learning/speedpass';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  GraduationCap,
  BookOpen,
  Brain,
  Clock,
  Target,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface ModeSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  textbook: Textbook | null;
  availableTime?: number; // minutes
  examDate?: Date;
  initialMode?: SpeedLearningMode;
  contextHint?: {
    availableTimeMinutes?: number;
    examDate?: Date;
    targetScore?: number;
  };
  onSelect: (mode: SpeedLearningMode) => void;
}

interface ModeOption {
  mode: SpeedLearningMode;
  icon: React.ElementType;
  title: string;
  description: string;
  duration: string;
  durationMinutes: { min: number; max: number };
  color: string;
  bgColor: string;
  borderColor: string;
  features: string[];
  targetScore: string;
  coveragePercent: number;
}

// ============================================================================
// Mode Configuration
// ============================================================================

const MODE_OPTION_CONFIG: Array<Omit<ModeOption, 'title' | 'description' | 'duration' | 'features' | 'targetScore'>> = [
  {
    mode: 'extreme',
    icon: Zap,
    durationMinutes: { min: 60, max: 120 },
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500',
    coveragePercent: 30,
  },
  {
    mode: 'speed',
    icon: BookOpen,
    durationMinutes: { min: 120, max: 240 },
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500',
    coveragePercent: 60,
  },
  {
    mode: 'comprehensive',
    icon: Brain,
    durationMinutes: { min: 360, max: 720 },
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
    coveragePercent: 100,
  },
];

// ============================================================================
// Component
// ============================================================================

export function ModeSelectorDialog({
  open,
  onOpenChange,
  textbook,
  availableTime,
  examDate,
  initialMode,
  contextHint,
  onSelect,
}: ModeSelectorDialogProps) {
  const locale = useLocale();
  const tMode = useTranslations('learningMode.speedpass.modeSelector');
  const modeOptions = useMemo<ModeOption[]>(
    () =>
      MODE_OPTION_CONFIG.map((option) => ({
        ...option,
        title: tMode(`modes.${option.mode}.title`),
        description: tMode(`modes.${option.mode}.description`),
        duration: tMode(`modes.${option.mode}.duration`),
        features: ['primary', 'secondary', 'practice'].map((key) =>
          tMode(`modes.${option.mode}.features.${key}`)
        ),
        targetScore: tMode(`modes.${option.mode}.targetScore`),
      })),
    [tMode]
  );
  const initialInputTime = (availableTime ?? contextHint?.availableTimeMinutes)?.toString() || '';
  const [selectedModeOverride, setSelectedModeOverride] = useState<SpeedLearningMode | null>(null);
  const [inputTimeOverride, setInputTimeOverride] = useState<string | null>(null);
  const [freeTextInput, setFreeTextInput] = useState('');
  const inputTime = inputTimeOverride ?? initialInputTime;
  const resolvedExamDate = examDate ?? contextHint?.examDate;
  const resolvedTime = availableTime ?? contextHint?.availableTimeMinutes;

  // Calculate recommended mode using mode-router's intelligent detection
  const modeDetection = useMemo(() => {
    // If free text input provided, use NLP-based detection
    if (freeTextInput.trim()) {
      return detectSpeedLearningMode(freeTextInput, {
        availableTimeMinutes: inputTime ? parseInt(inputTime, 10) : resolvedTime,
        examDate: resolvedExamDate,
      });
    }

    // Otherwise use simple time-based detection
    const time = inputTime ? parseInt(inputTime, 10) : resolvedTime;
    if (!time) return null;

    return detectSpeedLearningMode(`I have ${time} minutes`, {
      availableTimeMinutes: time,
      examDate: resolvedExamDate,
    });
  }, [inputTime, resolvedTime, freeTextInput, resolvedExamDate]);

  const recommendedMode = modeDetection?.detected ? modeDetection.recommendedMode : null;

  // Score-based mode recommendation (passing = 60 target)
  const scoreBasedRecommendation = useMemo(() => {
    const time = inputTime ? parseInt(inputTime, 10) : resolvedTime;
    if (!time || time <= 0) return null;
    return getModeRecommendation(time, contextHint?.targetScore || 60);
  }, [inputTime, resolvedTime, contextHint?.targetScore]);

  const selectedMode =
    selectedModeOverride || initialMode || recommendedMode || scoreBasedRecommendation || null;

  // Calculate urgency based on exam date
  const urgencyLevel = useMemo(() => {
    if (!resolvedExamDate) return null;
    const now = new Date();
    const diffDays = Math.ceil((resolvedExamDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays <= 3) return 'soon';
    if (diffDays <= 7) return 'week';
    return 'plenty';
  }, [resolvedExamDate]);

  const handleDialogOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedModeOverride(null);
      setInputTimeOverride(null);
      setFreeTextInput('');
    }
    onOpenChange(nextOpen);
  }, [onOpenChange]);

  // Handle mode selection
  const handleSelect = useCallback(() => {
    if (selectedMode) {
      onSelect(selectedMode);
      handleDialogOpenChange(false);
    }
  }, [selectedMode, onSelect, handleDialogOpenChange]);

  // Get knowledge point count estimate
  const getKnowledgePointEstimate = (mode: SpeedLearningMode) => {
    if (!textbook) return null;
    const totalKPs = textbook.totalKnowledgePoints || 0;
    const coverage = modeOptions.find((m) => m.mode === mode)?.coveragePercent || 100;
    return Math.round((totalKPs * coverage) / 100);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {tMode('title')}
          </DialogTitle>
          <DialogDescription>
            {textbook
              ? tMode('descriptionWithTextbook', { textbookName: textbook.name })
              : tMode('description')}
          </DialogDescription>
        </DialogHeader>

        {/* Time Input */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="available-time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {tMode('availableTimeLabel')}
              </Label>
              <Input
                id="available-time"
                type="number"
                placeholder={tMode('availableTimePlaceholder')}
                value={inputTime}
                onChange={(e) => setInputTimeOverride(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="free-text" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {tMode('freeTextLabel')}
              </Label>
              <Input
                id="free-text"
                placeholder={tMode('freeTextPlaceholder')}
                value={freeTextInput}
                onChange={(e) => setFreeTextInput(e.target.value)}
              />
            </div>
          </div>
          {recommendedMode && modeDetection && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-amber-500" />
              {tMode('smartRecommendation')}:{' '}
              <span className="font-medium">
                {modeOptions.find((modeOption) => modeOption.mode === recommendedMode)?.title}
              </span>
              <span className="text-xs">
                ({locale.startsWith('zh') ? modeDetection.reasonZh : modeDetection.reason})
              </span>
              {scoreBasedRecommendation && scoreBasedRecommendation !== recommendedMode && (
                <span className="ml-2 text-xs text-muted-foreground">
                  · {tMode('scoreRecommendation')}:{' '}
                  {modeOptions.find((modeOption) => modeOption.mode === scoreBasedRecommendation)?.title}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Urgency Warning */}
        {urgencyLevel && (urgencyLevel === 'today' || urgencyLevel === 'tomorrow') && (
          <Alert className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <AlertTitle>
              {urgencyLevel === 'today' ? tMode('urgency.todayTitle') : tMode('urgency.tomorrowTitle')}
            </AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-400">
              {tMode('urgency.description')}
            </AlertDescription>
          </Alert>
        )}

        {/* Mode Options */}
        <RadioGroup
          value={selectedMode || ''}
          onValueChange={(value) => setSelectedModeOverride(value as SpeedLearningMode)}
          className="grid gap-3"
        >
          {modeOptions.map((option) => {
            const isRecommended = option.mode === recommendedMode;
            const kpEstimate = getKnowledgePointEstimate(option.mode);

            return (
              <div key={option.mode} className="relative">
                {isRecommended && (
                  <Badge
                    className="absolute -top-2 right-2 z-10 bg-amber-500 text-white"
                    variant="default"
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    {tMode('recommendedBadge')}
                  </Badge>
                )}
                <label
                  htmlFor={option.mode}
                  className={cn(
                    'flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-all hover:bg-muted/50',
                    selectedMode === option.mode
                      ? option.borderColor
                      : 'border-muted hover:border-muted-foreground/20',
                    isRecommended && selectedMode !== option.mode && 'border-amber-200'
                  )}
                >
                  <RadioGroupItem value={option.mode} id={option.mode} className="mt-1" />
                  <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg', option.bgColor)}>
                    <option.icon className={cn('h-6 w-6', option.color)} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{option.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{option.duration}</Badge>
                        <Badge variant="outline">{option.targetScore}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {option.features.map((feature) => (
                        <span
                          key={feature}
                          className="flex items-center gap-1 text-xs text-muted-foreground"
                        >
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {feature}
                        </span>
                      ))}
                    </div>
                    {kpEstimate !== null && kpEstimate > 0 && (
                      <p className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
                        <Target className="h-3 w-3" />
                        {tMode('knowledgeCoverage', {
                          count: kpEstimate,
                          coveragePercent: option.coveragePercent,
                        })}
                      </p>
                    )}
                  </div>
                </label>
              </div>
            );
          })}
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
            {tMode('cancel')}
          </Button>
          <Button onClick={handleSelect} disabled={!selectedMode}>
            {selectedMode
              ? tMode('startMode', { modeName: modeOptions.find((m) => m.mode === selectedMode)?.title || '' })
              : tMode('selectMode')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ModeSelectorDialog;
