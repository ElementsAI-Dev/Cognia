'use client';

/**
 * ModeSwitchConfirmDialog - Confirmation dialog when switching chat modes
 * 
 * Features:
 * - Warns user that switching will create a new chat session
 * - Option to summarize current chat and carry context to new session
 * - Shows current and target mode information
 * - Supports all chat modes: chat, agent, research, learning
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  Bot,
  Search,
  GraduationCap,
  ArrowRight,
  FileText,
  Loader2,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import type { ChatMode } from '@/types';

export interface ModeSwitchConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMode: ChatMode;
  targetMode: ChatMode;
  messageCount: number;
  sessionTitle?: string;
  onConfirm: (options: { carryContext: boolean; summary?: string }) => void;
  onCancel: () => void;
  isGeneratingSummary?: boolean;
  summaryProgress?: number;
  onGenerateSummary?: () => Promise<string | null>;
}

const MODE_ICONS: Record<ChatMode, React.ReactNode> = {
  chat: <Sparkles className="h-5 w-5" />,
  agent: <Bot className="h-5 w-5" />,
  research: <Search className="h-5 w-5" />,
  learning: <GraduationCap className="h-5 w-5" />,
};

const MODE_COLORS: Record<ChatMode, string> = {
  chat: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  agent: 'bg-green-500/10 text-green-600 border-green-500/20',
  research: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  learning: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
};

export function ModeSwitchConfirmDialog({
  open,
  onOpenChange,
  currentMode,
  targetMode,
  messageCount,
  sessionTitle,
  onConfirm,
  onCancel,
  isGeneratingSummary = false,
  summaryProgress = 0,
  onGenerateSummary,
}: ModeSwitchConfirmDialogProps) {
  const t = useTranslations('modeSwitch');
  const tChat = useTranslations('chat');
  const tCommon = useTranslations('common');

  const [carryContext, setCarryContext] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);

  const modeNames: Record<ChatMode, string> = useMemo(() => ({
    chat: tChat('modeChat'),
    agent: tChat('modeAgent'),
    research: tChat('modeResearch'),
    learning: tChat('modeLearning'),
  }), [tChat]);

  const handleCarryContextChange = useCallback(async (checked: boolean) => {
    setCarryContext(checked);
    
    if (checked && !generatedSummary && onGenerateSummary) {
      setIsGenerating(true);
      setLocalProgress(10);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setLocalProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      try {
        const summary = await onGenerateSummary();
        setGeneratedSummary(summary);
        setLocalProgress(100);
      } catch (error) {
        console.error('Failed to generate summary:', error);
        setCarryContext(false);
      } finally {
        clearInterval(progressInterval);
        setIsGenerating(false);
      }
    }
  }, [generatedSummary, onGenerateSummary]);

  const handleConfirm = useCallback(() => {
    onConfirm({
      carryContext,
      summary: carryContext ? generatedSummary || undefined : undefined,
    });
    // Reset state
    setCarryContext(false);
    setGeneratedSummary(null);
  }, [carryContext, generatedSummary, onConfirm]);

  const handleCancel = useCallback(() => {
    onCancel();
    // Reset state
    setCarryContext(false);
    setGeneratedSummary(null);
  }, [onCancel]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      handleCancel();
    }
    onOpenChange(newOpen);
  }, [handleCancel, onOpenChange]);

  const actualIsGenerating = isGeneratingSummary || isGenerating;
  const actualProgress = summaryProgress || localProgress;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Transition Visual */}
        <div className="flex items-center justify-center gap-3 py-4">
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border',
            MODE_COLORS[currentMode]
          )}>
            {MODE_ICONS[currentMode]}
            <span className="font-medium">{modeNames[currentMode]}</span>
          </div>
          
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border',
            MODE_COLORS[targetMode]
          )}>
            {MODE_ICONS[targetMode]}
            <span className="font-medium">{modeNames[targetMode]}</span>
          </div>
        </div>

        {/* Warning Message */}
        <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <MessageSquare className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {t('warningTitle')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('warningMessage', { count: messageCount })}
            </p>
            {sessionTitle && (
              <Badge variant="outline" className="mt-1">
                {sessionTitle}
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Carry Context Option */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="carry-context"
              checked={carryContext}
              onCheckedChange={(checked) => handleCarryContextChange(checked === true)}
              disabled={actualIsGenerating}
            />
            <div className="space-y-1">
              <Label
                htmlFor="carry-context"
                className="text-sm font-medium cursor-pointer"
              >
                {t('carryContextLabel')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('carryContextDescription')}
              </p>
            </div>
          </div>

          {/* Summary Generation Progress */}
          {actualIsGenerating && (
            <div className="space-y-2 pl-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('generatingSummary')}</span>
              </div>
              <Progress value={actualProgress} className="h-1.5" />
            </div>
          )}

          {/* Generated Summary Preview */}
          {generatedSummary && carryContext && !actualIsGenerating && (
            <div className="pl-6 space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <FileText className="h-4 w-4" />
                <span>{t('summaryReady')}</span>
              </div>
              <div className="p-2 bg-muted/50 rounded-md text-xs text-muted-foreground max-h-20 overflow-y-auto">
                {generatedSummary.slice(0, 200)}
                {generatedSummary.length > 200 && '...'}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={actualIsGenerating}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={actualIsGenerating}
            className={cn(
              'gap-2',
              MODE_COLORS[targetMode].replace('bg-', 'hover:bg-').replace('/10', '/20')
            )}
          >
            {actualIsGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('generatingSummary')}
              </>
            ) : (
              <>
                {MODE_ICONS[targetMode]}
                {carryContext ? t('switchWithContext') : t('switchMode')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ModeSwitchConfirmDialog;
