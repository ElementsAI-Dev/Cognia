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
import { useTranslations } from 'next-intl';
import type { SpeedLearningMode, Textbook } from '@/types/learning/speedpass';
import { detectSpeedLearningMode, getModeDisplayInfo, getModeRecommendation } from '@/lib/learning/speedpass';
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

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'extreme',
    icon: Zap,
    title: '极速模式',
    description: '临考突击，快速过关',
    duration: '1-2小时',
    durationMinutes: { min: 60, max: 120 },
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500',
    features: ['核心公式速记', '高频考点精讲', '必考题型训练'],
    targetScore: '60-70分',
    coveragePercent: 30,
  },
  {
    mode: 'speed',
    icon: BookOpen,
    title: '速成模式',
    description: '重点突破，中等目标',
    duration: '2-4小时',
    durationMinutes: { min: 120, max: 240 },
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500',
    features: ['重点知识梳理', '典型例题详解', '中高频考点覆盖'],
    targetScore: '70-85分',
    coveragePercent: 60,
  },
  {
    mode: 'comprehensive',
    icon: Brain,
    title: '全面模式',
    description: '系统学习，追求高分',
    duration: '6-12小时',
    durationMinutes: { min: 360, max: 720 },
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
    features: ['全部知识点覆盖', '深度理解讲解', '拓展延伸训练'],
    targetScore: '85-100分',
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
  onSelect,
}: ModeSelectorDialogProps) {
  const _t = useTranslations('learningMode.speedpass');
  const [selectedMode, setSelectedMode] = useState<SpeedLearningMode | null>(null);
  const [inputTime, setInputTime] = useState<string>(availableTime?.toString() || '');
  const [freeTextInput, setFreeTextInput] = useState('');

  // Calculate recommended mode using mode-router's intelligent detection
  const modeDetection = useMemo(() => {
    // If free text input provided, use NLP-based detection
    if (freeTextInput.trim()) {
      return detectSpeedLearningMode(freeTextInput, {
        availableTimeMinutes: inputTime ? parseInt(inputTime, 10) : availableTime,
        examDate,
      });
    }

    // Otherwise use simple time-based detection
    const time = inputTime ? parseInt(inputTime, 10) : availableTime;
    if (!time) return null;

    return detectSpeedLearningMode(`我有${time}分钟`, {
      availableTimeMinutes: time,
      examDate,
    });
  }, [inputTime, availableTime, freeTextInput, examDate]);

  const recommendedMode = modeDetection?.detected ? modeDetection.recommendedMode : null;

  // Get display info for each mode from mode-router
  const modeDisplayInfoMap = useMemo(() => ({
    extreme: getModeDisplayInfo('extreme'),
    speed: getModeDisplayInfo('speed'),
    comprehensive: getModeDisplayInfo('comprehensive'),
  }), []);

  // Score-based mode recommendation (passing = 60 target)
  const scoreBasedRecommendation = useMemo(() => {
    const time = inputTime ? parseInt(inputTime, 10) : availableTime;
    if (!time || time <= 0) return null;
    return getModeRecommendation(time, 60);
  }, [inputTime, availableTime]);

  // Calculate urgency based on exam date
  const urgencyLevel = useMemo(() => {
    if (!examDate) return null;
    const now = new Date();
    const diffDays = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays <= 3) return 'soon';
    if (diffDays <= 7) return 'week';
    return 'plenty';
  }, [examDate]);

  // Handle mode selection
  const handleSelect = useCallback(() => {
    if (selectedMode) {
      onSelect(selectedMode);
      onOpenChange(false);
    }
  }, [selectedMode, onSelect, onOpenChange]);

  // Get knowledge point count estimate
  const getKnowledgePointEstimate = (mode: SpeedLearningMode) => {
    if (!textbook) return null;
    const totalKPs = textbook.totalKnowledgePoints || 0;
    const coverage = MODE_OPTIONS.find((m) => m.mode === mode)?.coveragePercent || 100;
    return Math.round((totalKPs * coverage) / 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            选择学习模式
          </DialogTitle>
          <DialogDescription>
            {textbook
              ? `为《${textbook.name}》选择合适的学习模式`
              : '根据你的可用时间和目标选择学习模式'}
          </DialogDescription>
        </DialogHeader>

        {/* Time Input */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="available-time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                可用时间（分钟）
              </Label>
              <Input
                id="available-time"
                type="number"
                placeholder="例如: 120"
                value={inputTime}
                onChange={(e) => setInputTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="free-text" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                或描述情况
              </Label>
              <Input
                id="free-text"
                placeholder="例如: 明天考试，只有2小时"
                value={freeTextInput}
                onChange={(e) => setFreeTextInput(e.target.value)}
              />
            </div>
          </div>
          {recommendedMode && modeDetection && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-amber-500" />
              智能推荐:{' '}
              <span className="font-medium">
                {modeDisplayInfoMap[recommendedMode].nameZh}
              </span>
              <span className="text-xs">
                ({modeDetection.reasonZh})
              </span>
              {scoreBasedRecommendation && scoreBasedRecommendation !== recommendedMode && (
                <span className="ml-2 text-xs text-muted-foreground">
                  · 及格目标推荐: {modeDisplayInfoMap[scoreBasedRecommendation].nameZh}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Urgency Warning */}
        {urgencyLevel && (urgencyLevel === 'today' || urgencyLevel === 'tomorrow') && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">
              {urgencyLevel === 'today' ? '考试就在今天！' : '明天就要考试了！'}
              建议选择极速模式快速复习核心内容。
            </p>
          </div>
        )}

        {/* Mode Options */}
        <RadioGroup
          value={selectedMode || ''}
          onValueChange={(value) => setSelectedMode(value as SpeedLearningMode)}
          className="grid gap-3"
        >
          {MODE_OPTIONS.map((option) => {
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
                    推荐
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
                        预计覆盖 {kpEstimate} 个知识点 ({option.coveragePercent}%)
                      </p>
                    )}
                  </div>
                </label>
              </div>
            );
          })}
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSelect} disabled={!selectedMode}>
            {selectedMode ? `开始${MODE_OPTIONS.find((m) => m.mode === selectedMode)?.title}` : '请选择模式'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ModeSelectorDialog;
