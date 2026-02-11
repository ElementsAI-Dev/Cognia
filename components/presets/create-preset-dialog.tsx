'use client';

/**
 * CreatePresetDialog - dialog for creating or editing presets with AI features
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Wand2,
  Loader2,
  Plus,
  X,
  Sparkles,
  Globe,
  Brain,
  Zap,
} from 'lucide-react';
import { usePresetStore, useSettingsStore, usePromptTemplateStore } from '@/stores';
import { toast } from '@/components/ui/sonner';
import { PRESET_COLORS, PRESET_ICONS, PRESET_CATEGORIES, type Preset, type BuiltinPrompt, type PresetCategory } from '@/types/content/preset';
import { PROVIDERS, type ProviderName } from '@/types/provider';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import { COLOR_BG_CLASS, COLOR_TINT_CLASS, getPresetAIConfig } from '@/lib/presets';
import { PromptTemplateSelector } from '@/components/prompt';
import { generatePresetFromDescription, optimizePresetPrompt, generateBuiltinPrompts as generateBuiltinPromptsAI } from '@/lib/ai/presets';
import { loggers } from '@/lib/logger';

interface CreatePresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPreset?: Preset | null;
  onSuccess?: (preset: Preset) => void;
}

export function CreatePresetDialog({
  open,
  onOpenChange,
  editPreset,
  onSuccess,
}: CreatePresetDialogProps) {
  const t = useTranslations('presets');
  const tCommon = useTranslations('common');
  const tChat = useTranslations('chat');
  const tPlaceholders = useTranslations('placeholders');
  const createPreset = usePresetStore((state) => state.createPreset);
  const updatePreset = usePresetStore((state) => state.updatePreset);
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const initializePromptTemplates = usePromptTemplateStore((state) => state.initializeDefaults);
  const recordTemplateUsage = usePromptTemplateStore((state) => state.recordUsage);

  // Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('💬');
  const [color, setColor] = useState('#6366f1');
  
  // Model config
  const [provider, setProvider] = useState<ProviderName | 'auto'>('auto');
  const [model, setModel] = useState('gpt-4o');
  const [mode, setMode] = useState<'chat' | 'agent' | 'research' | 'learning'>('chat');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState<number | undefined>(undefined);
  
  // Feature toggles
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  
  // Category
  const [category, setCategory] = useState<PresetCategory | undefined>(undefined);
  
  // Built-in prompts
  const [builtinPrompts, setBuiltinPrompts] = useState<BuiltinPrompt[]>([]);
  
  // AI generation states
  const [aiDescription, setAiDescription] = useState('');
  const [isGeneratingPreset, setIsGeneratingPreset] = useState(false);
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [isTemplateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  // Populate form when editing
  useEffect(() => {
    queueMicrotask(() => {
      if (editPreset) {
        setName(editPreset.name);
        setDescription(editPreset.description || '');
        setIcon(editPreset.icon || '💬');
        setColor(editPreset.color || '#6366f1');
        setProvider(editPreset.provider);
        setModel(editPreset.model);
        setMode(editPreset.mode);
        setSystemPrompt(editPreset.systemPrompt || '');
        setTemperature(editPreset.temperature ?? 0.7);
        setMaxTokens(editPreset.maxTokens);
        setWebSearchEnabled(editPreset.webSearchEnabled || false);
        setThinkingEnabled(editPreset.thinkingEnabled || false);
        setBuiltinPrompts(editPreset.builtinPrompts || []);
        setCategory(editPreset.category);
      } else {
        // Reset form for new preset
        setName('');
        setDescription('');
        setIcon('💬');
        setColor('#6366f1');
        setProvider('auto');
        setModel('gpt-4o');
        setMode('chat');
        setSystemPrompt('');
        setTemperature(0.7);
        setMaxTokens(undefined);
        setWebSearchEnabled(false);
        setThinkingEnabled(false);
        setBuiltinPrompts([]);
        setAiDescription('');
        setCategory(undefined);
      }
    });
  }, [editPreset, open]);

  useEffect(() => {
    initializePromptTemplates();
  }, [initializePromptTemplates]);

  // Get AI config for AI features
  const getAIConfig = useCallback(() => {
    return getPresetAIConfig(providerSettings, provider);
  }, [provider, providerSettings]);

  // AI Generate preset from description
  const handleAIGeneratePreset = useCallback(async () => {
    if (!aiDescription.trim()) return;
    
    const aiConfig = getAIConfig();
    if (!aiConfig) {
      toast.warning(t('errors.noApiKey'));
      return;
    }

    setIsGeneratingPreset(true);
    try {
      const result = await generatePresetFromDescription(aiDescription, aiConfig);

      if (result.success && result.preset) {
        const preset = result.preset;
        setName(preset.name || '');
        setDescription(preset.description || '');
        setIcon(preset.icon || '💬');
        setColor(preset.color || '#6366f1');
        setMode(preset.mode || 'chat');
        setSystemPrompt(preset.systemPrompt || '');
        setTemperature(preset.temperature ?? 0.7);
        setWebSearchEnabled(preset.webSearchEnabled || false);
        setThinkingEnabled(preset.thinkingEnabled || false);
        setCategory(preset.category as PresetCategory | undefined);
        
        if (preset.builtinPrompts?.length) {
          setBuiltinPrompts(preset.builtinPrompts.map((p) => ({
            id: nanoid(),
            name: p.name,
            content: p.content,
            description: p.description || '',
          })));
        }
        setAiDescription('');
        toast.success(t('aiGenerateSuccess'));
      } else {
        toast.error(result.error || t('errors.generateFailed'));
      }
    } catch (error) {
      loggers.ui.error('Failed to generate preset:', error);
      toast.error(t('errors.generateFailedRetry'));
    } finally {
      setIsGeneratingPreset(false);
    }
  }, [aiDescription, getAIConfig, t]);

  // AI Optimize system prompt
  const handleOptimizePrompt = useCallback(async () => {
    if (!systemPrompt.trim()) return;
    
    const aiConfig = getAIConfig();
    if (!aiConfig) {
      toast.warning(t('errors.noApiKey'));
      return;
    }

    setIsOptimizingPrompt(true);
    try {
      const result = await optimizePresetPrompt(systemPrompt, aiConfig);

      if (result.success && result.optimizedPrompt) {
        setSystemPrompt(result.optimizedPrompt);
        toast.success(t('optimizeSuccess'));
      } else {
        toast.error(result.error || t('errors.optimizeFailed'));
      }
    } catch (error) {
      loggers.ui.error('Failed to optimize prompt:', error);
      toast.error(t('errors.optimizeFailedRetry'));
    } finally {
      setIsOptimizingPrompt(false);
    }
  }, [systemPrompt, getAIConfig, t]);

  // AI Generate builtin prompts
  const handleGenerateBuiltinPrompts = useCallback(async () => {
    if (!name.trim()) return;
    
    const aiConfig = getAIConfig();
    if (!aiConfig) {
      toast.warning(t('errors.noApiKey'));
      return;
    }

    setIsGeneratingPrompts(true);
    try {
      const result = await generateBuiltinPromptsAI(
        name,
        description || undefined,
        systemPrompt || undefined,
        builtinPrompts.map(p => ({ name: p.name, content: p.content })),
        aiConfig,
        3
      );

      if (result.success && result.prompts) {
        const newPrompts = result.prompts.map((p) => ({
          id: nanoid(),
          name: p.name,
          content: p.content,
          description: p.description || '',
        }));
        setBuiltinPrompts(prev => [...prev, ...newPrompts]);
        toast.success(t('generatePromptsSuccess'));
      } else {
        toast.error(result.error || t('errors.generatePromptsFailed'));
      }
    } catch (error) {
      loggers.ui.error('Failed to generate prompts:', error);
      toast.error(t('errors.generatePromptsFailedRetry'));
    } finally {
      setIsGeneratingPrompts(false);
    }
  }, [name, description, systemPrompt, builtinPrompts, getAIConfig, t]);

  const handleApplyTemplate = useCallback((template: import('@/types/content/prompt-template').PromptTemplate) => {
    setSystemPrompt(template.content);
    recordTemplateUsage(template.id);
    setTemplateSelectorOpen(false);
  }, [recordTemplateUsage]);

  // Add manual builtin prompt
  const handleAddBuiltinPrompt = useCallback(() => {
    setBuiltinPrompts(prev => [...prev, {
      id: nanoid(),
      name: '',
      content: '',
      description: '',
    }]);
  }, []);

  // Update builtin prompt
  const handleUpdateBuiltinPrompt = useCallback((id: string, updates: Partial<BuiltinPrompt>) => {
    setBuiltinPrompts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  // Remove builtin prompt
  const handleRemoveBuiltinPrompt = useCallback((id: string) => {
    setBuiltinPrompts(prev => prev.filter(p => p.id !== id));
  }, []);

  // Get available models for selected provider
  const availableModels =
    provider === 'auto'
      ? Object.values(PROVIDERS).flatMap((p) => p.models)
      : PROVIDERS[provider as ProviderName]?.models || [];

  // Get enabled providers
  const enabledProviders = Object.entries(providerSettings)
    .filter(([, settings]) => settings.enabled)
    .map(([name]) => name as ProviderName);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(t('errors.nameRequired'));
      return;
    }
    if (!model.trim()) {
      toast.error(t('errors.modelRequired'));
      return;
    }

    if (editPreset) {
      updatePreset(editPreset.id, {
        name,
        description: description || undefined,
        icon,
        color,
        provider,
        model,
        mode,
        systemPrompt: systemPrompt || undefined,
        builtinPrompts: builtinPrompts.length > 0 ? builtinPrompts : undefined,
        temperature,
        maxTokens,
        webSearchEnabled,
        thinkingEnabled,
        category,
      });
      onSuccess?.({ 
        ...editPreset, 
        name, 
        description, 
        icon, 
        color, 
        provider, 
        model, 
        mode, 
        systemPrompt, 
        builtinPrompts,
        temperature, 
        maxTokens,
        webSearchEnabled,
        thinkingEnabled,
        category,
      } as Preset);
    } else {
      const newPreset = createPreset({
        name,
        description: description || undefined,
        icon,
        color,
        provider,
        model,
        mode,
        systemPrompt: systemPrompt || undefined,
        builtinPrompts: builtinPrompts.length > 0 ? builtinPrompts : undefined,
        temperature,
        maxTokens,
        webSearchEnabled,
        thinkingEnabled,
        category,
      });
      onSuccess?.(newPreset);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editPreset ? t('editPreset') : t('createPreset')}
          </DialogTitle>
          <DialogDescription>
            {editPreset
              ? t('editPresetDesc')
              : t('createPresetDesc')}
          </DialogDescription>
        </DialogHeader>

        {/* AI Generate Section - only show when creating new */}
        {!editPreset && (
          <div className="p-3 rounded-lg border bg-gradient-to-r from-purple-500/5 to-blue-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">{t('aiGenerate')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder={tPlaceholders('describePreset')}
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAIGeneratePreset()}
              />
              <Button
                onClick={handleAIGeneratePreset}
                disabled={!aiDescription.trim() || isGeneratingPreset}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                  aria-label={t('aiGenerate')}
              >
                {isGeneratingPreset ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 pr-2">
          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">{t('tabBasic')}</TabsTrigger>
              <TabsTrigger value="model">{t('tabModel')}</TabsTrigger>
              <TabsTrigger value="prompt">{t('tabPrompt')}</TabsTrigger>
              <TabsTrigger value="quick">{t('tabQuickPrompts')}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('presetName')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={tPlaceholders('enterPresetName')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={tPlaceholders('enterPresetDescription')}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('category')}</Label>
                <Select value={category || ''} onValueChange={(v) => setCategory(v as PresetCategory || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {t(`categories.${cat}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('icon')}</Label>
                  <div className="flex flex-wrap gap-1 p-2 border rounded-md max-h-24 overflow-y-auto">
                    {PRESET_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={cn(
                          'p-1.5 rounded hover:bg-accent transition-colors',
                          icon === emoji && 'bg-accent ring-2 ring-primary'
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('color')}</Label>
                  <div className="flex flex-wrap gap-1 p-2 border rounded-md max-h-24 overflow-y-auto">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          'w-6 h-6 rounded-full transition-transform',
                          color === c && 'ring-2 ring-primary ring-offset-2 scale-110',
                          COLOR_BG_CLASS[c] ?? ''
                        )}
                        aria-label={`Select color ${c}`}
                        title={`Select color ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="model" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{t('mode')}</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as 'chat' | 'agent' | 'research' | 'learning')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chat">{tChat('modeChat')}</SelectItem>
                    <SelectItem value="agent">{tChat('modeAgent')}</SelectItem>
                    <SelectItem value="research">{tChat('modeResearch')}</SelectItem>
                    <SelectItem value="learning">{tChat('modeLearning')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('provider')}</Label>
                  <Select value={provider} onValueChange={(v) => setProvider(v as ProviderName | 'auto')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{tChat('autoMode')}</SelectItem>
                      {enabledProviders.map((p) => (
                        <SelectItem key={p} value={p}>
                          {PROVIDERS[p]?.name || p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('model')}</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('temperature')}: {temperature.toFixed(1)}</Label>
                <Slider
                  value={[temperature]}
                  onValueChange={([v]) => setTemperature(v)}
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {t('temperatureHint')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTokens">{t('maxTokensOptional')}</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={maxTokens || ''}
                  onChange={(e) =>
                    setMaxTokens(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder={t('maxTokensPlaceholder')}
                />
              </div>

              {/* Feature toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {t('webSearch')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('webSearchHint')}
                    </p>
                  </div>
                  <Switch
                    checked={webSearchEnabled}
                    onCheckedChange={setWebSearchEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      {t('thinkingMode')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('thinkingModeHint')}
                    </p>
                  </div>
                  <Switch
                    checked={thinkingEnabled}
                    onCheckedChange={setThinkingEnabled}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="prompt" className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="systemPrompt">{t('systemPrompt')}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTemplateSelectorOpen(true)}
                    >
                      {t('insertTemplate')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOptimizePrompt}
                      disabled={!systemPrompt.trim() || isOptimizingPrompt}
                    >
                      {isOptimizingPrompt ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-2" />
                      )}
                      {t('optimizePrompt')}
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="systemPrompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder={tPlaceholders('enterSystemPrompt')}
                  className="min-h-[200px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {t('systemPromptHint')}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="quick" className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">{t('builtinPrompts')}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('builtinPromptsHint')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateBuiltinPrompts}
                    disabled={!name.trim() || isGeneratingPrompts}
                  >
                    {isGeneratingPrompts ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {t('generatePrompts')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleAddBuiltinPrompt}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('addPrompt')}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {builtinPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="p-3 rounded-lg border bg-muted/30 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={prompt.name}
                        onChange={(e) =>
                          handleUpdateBuiltinPrompt(prompt.id, { name: e.target.value })
                        }
                        placeholder={tPlaceholders('promptName')}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleRemoveBuiltinPrompt(prompt.id)}
                        aria-label={t('removePrompt')}
                        title={t('removePrompt')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={prompt.content}
                      onChange={(e) =>
                        handleUpdateBuiltinPrompt(prompt.id, { content: e.target.value })
                      }
                      placeholder={tPlaceholders('promptContent')}
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                ))}

                {builtinPrompts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t('noQuickPrompts')}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <PromptTemplateSelector
          open={isTemplateSelectorOpen}
          onOpenChange={setTemplateSelectorOpen}
          onSelect={handleApplyTemplate}
        />

        {/* Preview */}
        <div className="mt-4 p-3 border rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground mb-2">{t('preview')}</p>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg text-lg',
                COLOR_TINT_CLASS[color] ?? 'bg-muted'
              )}
            >
              {icon}
            </span>
            <div className="flex-1">
              <p className="font-medium text-sm">{name || 'Preset Name'}</p>
              <p className="text-xs text-muted-foreground">
                {provider === 'auto' ? 'Auto' : provider} • {mode} • T:{temperature.toFixed(1)}
                {webSearchEnabled && ' • Web'}
                {thinkingEnabled && ' • Thinking'}
                {builtinPrompts.length > 0 && ` • ${builtinPrompts.length} prompts`}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {editPreset ? tCommon('save') : t('createPreset')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePresetDialog;
