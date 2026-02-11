'use client';

/**
 * ArenaDialog - Dialog for starting arena battles
 * Allows users to select models and start multi-model comparison
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Swords,
  Play,
  Loader2,
  Sparkles,
  Zap,
  Brain,
  DollarSign,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useArena } from '@/hooks/arena';

import { ARENA_MODEL_PRESETS } from '@/types/arena';
import type { ProviderName } from '@/types/provider';

interface ModelOption {
  provider: ProviderName;
  model: string;
  displayName: string;
}

interface ArenaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt?: string;
  sessionId?: string;
  systemPrompt?: string;
  onBattleStart?: () => void;
  onBattleComplete?: () => void;
}

export function ArenaDialog({
  open,
  onOpenChange,
  initialPrompt = '',
  sessionId,
  systemPrompt,
  onBattleStart,
  onBattleComplete,
}: ArenaDialogProps) {
  const t = useTranslations('arena');
  const tCommon = useTranslations('common');

  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedModels, setSelectedModels] = useState<ModelOption[]>([]);
  const [blindMode, setBlindMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'models' | 'presets'>('models');

  // Advanced options state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [multiTurn, setMultiTurn] = useState(false);
  const [maxTurns, setMaxTurns] = useState(5);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [taskCategory, setTaskCategory] = useState<string>('auto');

  const { isExecuting, error, startBattle, getAvailableModels } = useArena({
    onBattleComplete: () => {
      onBattleComplete?.();
    },
  });

  const availableModels = useMemo(() => getAvailableModels(), [getAvailableModels]);

  // Toggle model selection
  const toggleModel = useCallback((model: ModelOption) => {
    setSelectedModels((prev) => {
      const exists = prev.some((m) => m.provider === model.provider && m.model === model.model);
      if (exists) {
        return prev.filter((m) => !(m.provider === model.provider && m.model === model.model));
      }
      return [...prev, model];
    });
  }, []);

  // Check if model is selected
  const isSelected = useCallback(
    (model: ModelOption) => {
      return selectedModels.some((m) => m.provider === model.provider && m.model === model.model);
    },
    [selectedModels]
  );

  // Apply preset
  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = ARENA_MODEL_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;

      // Filter to only available models
      const available = preset.models.filter((pm) =>
        availableModels.some((am) => am.provider === pm.provider && am.model === pm.model)
      );

      setSelectedModels(
        available.map((m) => ({
          provider: m.provider,
          model: m.model,
          displayName:
            availableModels.find((am) => am.provider === m.provider && am.model === m.model)
              ?.displayName || m.model,
        }))
      );
    },
    [availableModels]
  );

  // Start the battle
  const handleStart = useCallback(async () => {
    if (selectedModels.length < 2 || !prompt.trim()) return;

    onBattleStart?.();

    await startBattle(prompt.trim(), selectedModels, {
      sessionId,
      systemPrompt,
      blindMode,
      conversationMode: multiTurn ? 'multi' : 'single',
      maxTurns: multiTurn ? maxTurns : undefined,
      temperature,
      maxTokens,
      taskCategory: taskCategory !== 'auto' ? taskCategory : undefined,
    });

    onOpenChange(false);
  }, [
    selectedModels,
    prompt,
    startBattle,
    sessionId,
    systemPrompt,
    blindMode,
    multiTurn,
    maxTurns,
    temperature,
    maxTokens,
    taskCategory,
    onBattleStart,
    onOpenChange,
  ]);

  // Get provider color
  const getProviderColor = (provider: ProviderName) => {
    const colors: Record<string, string> = {
      openai: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      anthropic: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      google: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      deepseek: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      groq: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      mistral: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      xai: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return colors[provider] || 'bg-gray-100 text-gray-700';
  };

  // Get preset icon
  const getPresetIcon = (presetId: string) => {
    switch (presetId) {
      case 'top-tier':
        return <Sparkles className="h-4 w-4" />;
      case 'fast-models':
        return <Zap className="h-4 w-4" />;
      case 'budget-friendly':
        return <DollarSign className="h-4 w-4" />;
      case 'reasoning':
        return <Brain className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prompt input */}
          <div className="space-y-2">
            <Label>{t('prompt')}</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('promptPlaceholder')}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Model selection */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'models' | 'presets')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="models">{t('selectModels')}</TabsTrigger>
              <TabsTrigger value="presets">{t('presets')}</TabsTrigger>
            </TabsList>

            <TabsContent value="models" className="mt-3">
              {availableModels.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">{t('noProviders')}</p>
                  <p className="text-xs mt-1">{t('configureProviders')}</p>
                </div>
              ) : (
                <ScrollArea className="h-[200px] rounded border p-2">
                  <div className="space-y-2">
                    {availableModels.map((model) => (
                      <div
                        key={`${model.provider}-${model.model}`}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                          isSelected(model)
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted/50'
                        )}
                        onClick={() => toggleModel(model)}
                      >
                        <Checkbox
                          checked={isSelected(model)}
                          onCheckedChange={() => toggleModel(model)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{model.displayName}</span>
                            <Badge
                              variant="outline"
                              className={cn('text-[10px]', getProviderColor(model.provider))}
                            >
                              {model.provider}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{model.model}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="presets" className="mt-3">
              <div className="grid grid-cols-2 gap-2">
                {ARENA_MODEL_PRESETS.map((preset) => {
                  const availableCount = preset.models.filter((pm) =>
                    availableModels.some(
                      (am) => am.provider === pm.provider && am.model === pm.model
                    )
                  ).length;

                  return (
                    <button
                      key={preset.id}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-colors',
                        'hover:bg-muted/50',
                        availableCount < 2 && 'opacity-50 cursor-not-allowed'
                      )}
                      onClick={() => applyPreset(preset.id)}
                      disabled={availableCount < 2}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getPresetIcon(preset.id)}
                        <span className="text-sm font-medium">{preset.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {preset.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {availableCount}/{preset.models.length} {t('available')}
                      </p>
                    </button>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          {/* Selected models count */}
          {selectedModels.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedModels.length} {t('modelsSelected')}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedModels([])}>
                {tCommon('clearAll')}
              </Button>
            </div>
          )}

          {/* Blind mode toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    {blindMode ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Label htmlFor="blind-mode" className="cursor-pointer">
                      {t('blindMode')}
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs">{t('blindModeDescription')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch id="blind-mode" checked={blindMode} onCheckedChange={setBlindMode} />
          </div>

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto rounded-lg bg-muted/30 border"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('advancedOptions')}</span>
                </div>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              {/* Multi-turn toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label htmlFor="multi-turn" className="cursor-pointer">
                    {t('enableMultiTurn')}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('enableMultiTurnDescription')}
                  </p>
                </div>
                <Switch id="multi-turn" checked={multiTurn} onCheckedChange={setMultiTurn} />
              </div>

              {/* Max turns (when multi-turn enabled) */}
              {multiTurn && (
                <div className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t('maxTurnsLabel')}</Label>
                    <span className="text-sm font-medium">{maxTurns}</span>
                  </div>
                  <Slider
                    value={[maxTurns]}
                    onValueChange={([v]) => setMaxTurns(v)}
                    min={2}
                    max={20}
                    step={1}
                  />
                </div>
              )}

              {/* Task Category */}
              <div className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('taskCategory')}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('taskCategoryDescription')}
                    </p>
                  </div>
                  <Select value={taskCategory} onValueChange={setTaskCategory}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{t('autoDetect')}</SelectItem>
                      <SelectItem value="coding">{t('leaderboard.categories.coding')}</SelectItem>
                      <SelectItem value="math">{t('leaderboard.categories.math')}</SelectItem>
                      <SelectItem value="analysis">
                        {t('leaderboard.categories.analysis')}
                      </SelectItem>
                      <SelectItem value="creative">
                        {t('leaderboard.categories.creative')}
                      </SelectItem>
                      <SelectItem value="research">
                        {t('leaderboard.categories.research')}
                      </SelectItem>
                      <SelectItem value="translation">
                        {t('leaderboard.categories.translation')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Model Parameters */}
              <div className="p-3 rounded-lg border space-y-3">
                <Label className="text-sm font-medium">{t('modelParameters')}</Label>

                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">{t('temperature')}</span>
                      <p className="text-xs text-muted-foreground">{t('temperatureDescription')}</p>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {temperature.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    value={[temperature]}
                    onValueChange={([v]) => setTemperature(v)}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">{t('maxTokens')}</span>
                      <p className="text-xs text-muted-foreground">{t('maxTokensDescription')}</p>
                    </div>
                    <span className="text-sm font-medium w-16 text-right">{maxTokens}</span>
                  </div>
                  <Slider
                    value={[maxTokens]}
                    onValueChange={([v]) => setMaxTokens(v)}
                    min={256}
                    max={8192}
                    step={256}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleStart}
            disabled={isExecuting || selectedModels.length < 2 || !prompt.trim()}
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('battling')}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {t('startBattle')} ({selectedModels.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ArenaDialog;
