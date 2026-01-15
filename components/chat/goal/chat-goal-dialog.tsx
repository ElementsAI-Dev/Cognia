'use client';

/**
 * ChatGoalDialog - Dialog for setting or editing conversation goals
 * Provides input for goal content, multi-step support, and AI polish
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Target, Sparkles, Lightbulb, Wand2, Plus, X, GripVertical, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { polishGoal, type GoalPolishConfig } from '@/lib/ai/generation/goal-polish';
import { useSettingsStore } from '@/stores';
import { toast } from 'sonner';
import type { ChatGoal, CreateGoalInput } from '@/types';

interface ChatGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: CreateGoalInput) => void;
  existingGoal?: ChatGoal;
  sessionTitle?: string;
}

interface StepInput {
  id: string;
  content: string;
}

const GOAL_SUGGESTIONS = [
  { icon: '💻', text: 'Learn a new programming concept' },
  { icon: '📝', text: 'Write and refine a document' },
  { icon: '🔍', text: 'Research and analyze a topic' },
  { icon: '🐛', text: 'Debug and fix an issue' },
  { icon: '💡', text: 'Brainstorm ideas for a project' },
  { icon: '📊', text: 'Understand data and insights' },
];

export function ChatGoalDialog({
  open,
  onOpenChange,
  onSave,
  existingGoal,
  sessionTitle,
}: ChatGoalDialogProps) {
  const t = useTranslations('chatGoal');
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState<string | undefined>();
  const [trackProgress, setTrackProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [useMultiStep, setUseMultiStep] = useState(false);
  const [steps, setSteps] = useState<StepInput[]>([]);
  const [newStepContent, setNewStepContent] = useState('');

  const isEditing = !!existingGoal;

  // Get first available provider config for polish
  const getPolishConfig = useCallback((): GoalPolishConfig | null => {
    if (providerSettings?.openai?.apiKey) {
      return {
        provider: 'openai',
        model: providerSettings.openai.defaultModel || 'gpt-4o-mini',
        apiKey: providerSettings.openai.apiKey,
        baseUrl: providerSettings.openai.baseURL,
      };
    }
    if (providerSettings?.anthropic?.apiKey) {
      return {
        provider: 'anthropic',
        model: providerSettings.anthropic.defaultModel || 'claude-3-haiku-20240307',
        apiKey: providerSettings.anthropic.apiKey,
        baseUrl: providerSettings.anthropic.baseURL,
      };
    }
    return null;
  }, [providerSettings]);

  const canPolish = !!getPolishConfig();

  useEffect(() => {
    if (open) {
      if (existingGoal) {
        setContent(existingGoal.content);
        setOriginalContent(existingGoal.originalContent);
        setProgress(existingGoal.progress ?? 0);
        setTrackProgress((existingGoal.progress ?? 0) > 0 || !!existingGoal.steps?.length);
        setUseMultiStep(!!existingGoal.steps?.length);
        setSteps(existingGoal.steps?.map((s) => ({ id: s.id, content: s.content })) || []);
      } else {
        setContent('');
        setOriginalContent(undefined);
        setProgress(0);
        setTrackProgress(false);
        setUseMultiStep(false);
        setSteps([]);
      }
      setNewStepContent('');
    }
  }, [open, existingGoal]);

  const handlePolish = useCallback(async () => {
    if (!content.trim()) return;
    
    const config = getPolishConfig();
    if (!config) {
      toast.error(t('dialog.polishNoApi') || 'No AI provider configured');
      return;
    }

    setIsPolishing(true);
    try {
      const result = await polishGoal({ content: content.trim() }, config);
      
      // Save original content if not already saved
      if (!originalContent) {
        setOriginalContent(content.trim());
      }
      
      setContent(result.polishedContent);
      
      // If suggested steps are provided and user wants multi-step
      if (result.suggestedSteps && result.suggestedSteps.length > 0) {
        setUseMultiStep(true);
        setSteps(result.suggestedSteps.map((stepContent, index) => ({
          id: `step-${index}-${Date.now()}`,
          content: stepContent,
        })));
      }
      
      toast.success(t('dialog.polishSuccess') || 'Goal polished successfully');
    } catch (error) {
      console.error('Failed to polish goal:', error);
      toast.error(t('dialog.polishError') || 'Failed to polish goal');
    } finally {
      setIsPolishing(false);
    }
  }, [content, originalContent, getPolishConfig, t]);

  const handleAddStep = useCallback(() => {
    if (!newStepContent.trim()) return;
    setSteps((prev) => [
      ...prev,
      { id: `step-${Date.now()}`, content: newStepContent.trim() },
    ]);
    setNewStepContent('');
  }, [newStepContent]);

  const handleRemoveStep = useCallback((stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  }, []);

  const handleStepContentChange = useCallback((stepId: string, newContent: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, content: newContent } : s))
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!content.trim()) return;

    setIsSaving(true);
    try {
      onSave({
        content: content.trim(),
        progress: trackProgress ? progress : undefined,
        steps: useMultiStep && steps.length > 0
          ? steps.map((s) => ({ content: s.content }))
          : undefined,
        originalContent,
        isPolished: !!originalContent,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }, [content, trackProgress, progress, useMultiStep, steps, originalContent, onSave, onOpenChange]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setContent(suggestion);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  }, [handleSave]);

  const handleStepKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddStep();
    }
  }, [handleAddStep]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {isEditing ? t('dialog.editTitle') : t('dialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('dialog.description')}
            {sessionTitle && (
              <span className="block mt-1 text-foreground font-medium">
                {sessionTitle}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="goal-content" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {t('dialog.goalLabel')}
              </Label>
              {canPolish && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePolish}
                  disabled={!content.trim() || isPolishing}
                  className="h-7 text-xs gap-1.5"
                >
                  {isPolishing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  {t('dialog.polish') || 'Polish with AI'}
                </Button>
              )}
            </div>
            <Textarea
              id="goal-content"
              placeholder={t('dialog.goalPlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] resize-none"
              autoFocus
            />
            {originalContent && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                <span className="font-medium">{t('dialog.originalGoal') || 'Original'}:</span>{' '}
                {originalContent}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t('dialog.goalHint')}
            </p>
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Lightbulb className="h-4 w-4" />
                {t('dialog.suggestions')}
              </Label>
              <div className="flex flex-wrap gap-2">
                {GOAL_SUGGESTIONS.map((suggestion, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-colors py-1.5 px-2.5"
                    onClick={() => handleSuggestionClick(suggestion.text)}
                  >
                    <span className="mr-1.5">{suggestion.icon}</span>
                    {suggestion.text}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2 border-t">
            {/* Multi-step toggle */}
            <div className="flex items-center justify-between">
              <Label
                htmlFor="use-multi-step"
                className="flex items-center gap-2 cursor-pointer"
              >
                {t('dialog.useMultiStep') || 'Break into steps'}
              </Label>
              <Switch
                id="use-multi-step"
                checked={useMultiStep}
                onCheckedChange={setUseMultiStep}
              />
            </div>

            {/* Steps list */}
            {useMultiStep && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  {t('dialog.steps') || 'Steps'} ({steps.length})
                </Label>
                <ScrollArea className="max-h-[150px]">
                  <div className="space-y-2">
                    {steps.map((step, index) => (
                      <div
                        key={step.id}
                        className="flex items-center gap-2 bg-muted/50 rounded p-2"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
                        <span className="text-xs text-muted-foreground w-5 shrink-0">
                          {index + 1}.
                        </span>
                        <Input
                          value={step.content}
                          onChange={(e) => handleStepContentChange(step.id, e.target.value)}
                          className="h-7 text-sm flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleRemoveStep(step.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('dialog.addStepPlaceholder') || 'Add a step...'}
                    value={newStepContent}
                    onChange={(e) => setNewStepContent(e.target.value)}
                    onKeyDown={handleStepKeyDown}
                    className="h-8 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddStep}
                    disabled={!newStepContent.trim()}
                    className="h-8 px-2"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Progress tracking (only if not using multi-step) */}
            {!useMultiStep && (
              <>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="track-progress"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {t('dialog.trackProgress')}
                  </Label>
                  <Switch
                    id="track-progress"
                    checked={trackProgress}
                    onCheckedChange={setTrackProgress}
                  />
                </div>

                {trackProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">
                        {t('dialog.currentProgress')}
                      </Label>
                      <span className="text-sm font-medium">{progress}%</span>
                    </div>
                    <Slider
                      value={[progress]}
                      onValueChange={([value]) => setProgress(value)}
                      max={100}
                      step={5}
                      className="py-2"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('dialog.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!content.trim() || isSaving}
          >
            {isSaving ? t('dialog.saving') : isEditing ? t('dialog.update') : t('dialog.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ChatGoalDialog;
