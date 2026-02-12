'use client';

/**
 * CreatePresetDialog - dialog for creating or editing presets with AI features
 */

import { useCallback } from 'react';
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
import { useSettingsStore } from '@/stores';
import { toast } from '@/components/ui/sonner';
import { PRESET_COLORS, PRESET_ICONS, PRESET_CATEGORIES, type Preset, type PresetCategory } from '@/types/content/preset';
import { cn } from '@/lib/utils';
import { COLOR_BG_CLASS, COLOR_TINT_CLASS } from '@/lib/presets';
import { getAvailableModels, getEnabledProviders } from '@/lib/presets';
import { PromptTemplateSelector } from '@/components/prompt';
import { usePresetForm } from '@/hooks/presets/use-preset-form';
import { usePresetAI } from '@/hooks/presets/use-preset-ai';
import type { ProviderName } from '@/types/provider';
import { PROVIDERS } from '@/types/provider';

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
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // Form state (extracted to hook)
  const {
    form,
    updateField,
    aiDescription,
    setAiDescription,
    isTemplateSelectorOpen,
    setTemplateSelectorOpen,
    applyGeneratedPreset,
    applyOptimizedPrompt,
    applyGeneratedBuiltinPrompts,
    handleApplyTemplate,
    addBuiltinPrompt,
    updateBuiltinPrompt,
    removeBuiltinPrompt,
    handleSubmit: submitForm,
  } = usePresetForm({
    editPreset,
    open,
    onSuccess,
    onClose: () => onOpenChange(false),
  });

  // AI operations (extracted to hook)
  const {
    isGeneratingPreset,
    isOptimizingPrompt,
    isGeneratingPrompts,
    handleGeneratePreset,
    handleOptimizePrompt: aiOptimizePrompt,
    handleGenerateBuiltinPrompts: aiGenerateBuiltinPrompts,
  } = usePresetAI({
    onGenerateSuccess: (preset) => {
      applyGeneratedPreset(preset);
      toast.success(t('aiGenerateSuccess'));
    },
    onOptimizeSuccess: (optimizedPrompt) => {
      applyOptimizedPrompt(optimizedPrompt);
      toast.success(t('optimizeSuccess'));
    },
    onGeneratePromptsSuccess: (prompts) => {
      applyGeneratedBuiltinPrompts(prompts);
      toast.success(t('generatePromptsSuccess'));
    },
    onError: (error) => {
      if (error === 'noApiKey') {
        toast.warning(t('errors.noApiKey'));
      } else {
        toast.error(error);
      }
    },
  });

  // Derived data from lib utilities
  const availableModels = getAvailableModels(form.provider);
  const enabledProviders = getEnabledProviders(providerSettings);

  // AI action wrappers
  const handleAIGeneratePreset = useCallback(async () => {
    if (!aiDescription.trim()) return;
    await handleGeneratePreset(aiDescription, form.provider);
  }, [aiDescription, handleGeneratePreset, form.provider]);

  const handleOptimizePrompt = useCallback(async () => {
    if (!form.systemPrompt.trim()) return;
    await aiOptimizePrompt(form.systemPrompt, form.provider);
  }, [form.systemPrompt, form.provider, aiOptimizePrompt]);

  const handleGenerateBuiltinPrompts = useCallback(async () => {
    if (!form.name.trim()) return;
    await aiGenerateBuiltinPrompts(
      form.name,
      form.description || undefined,
      form.systemPrompt || undefined,
      form.builtinPrompts.map(p => ({ name: p.name, content: p.content })),
      form.provider,
      3,
    );
  }, [form, aiGenerateBuiltinPrompts]);

  const handleSubmit = () => {
    const result = submitForm();
    if (!result.valid && result.error) {
      toast.error(t(`errors.${result.error}`));
    }
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
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder={tPlaceholders('enterPresetName')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder={tPlaceholders('enterPresetDescription')}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('category')}</Label>
                <Select value={form.category || ''} onValueChange={(v) => updateField('category', v as PresetCategory || undefined)}>
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
                        onClick={() => updateField('icon', emoji)}
                        className={cn(
                          'p-1.5 rounded hover:bg-accent transition-colors',
                          form.icon === emoji && 'bg-accent ring-2 ring-primary'
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
                        onClick={() => updateField('color', c)}
                        className={cn(
                          'w-6 h-6 rounded-full transition-transform',
                          form.color === c && 'ring-2 ring-primary ring-offset-2 scale-110',
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
                <Select value={form.mode} onValueChange={(v) => updateField('mode', v as 'chat' | 'agent' | 'research' | 'learning')}>
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
                  <Select value={form.provider} onValueChange={(v) => updateField('provider', v as ProviderName | 'auto')}>
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
                  <Select value={form.model} onValueChange={(v) => updateField('model', v)}>
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
                <Label>{t('temperature')}: {form.temperature.toFixed(1)}</Label>
                <Slider
                  value={[form.temperature]}
                  onValueChange={([v]) => updateField('temperature', v)}
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
                  value={form.maxTokens || ''}
                  onChange={(e) =>
                    updateField('maxTokens', e.target.value ? parseInt(e.target.value) : undefined)
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
                    checked={form.webSearchEnabled}
                    onCheckedChange={(v) => updateField('webSearchEnabled', v)}
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
                    checked={form.thinkingEnabled}
                    onCheckedChange={(v) => updateField('thinkingEnabled', v)}
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
                      disabled={!form.systemPrompt.trim() || isOptimizingPrompt}
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
                  value={form.systemPrompt}
                  onChange={(e) => updateField('systemPrompt', e.target.value)}
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
                    disabled={!form.name.trim() || isGeneratingPrompts}
                  >
                    {isGeneratingPrompts ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {t('generatePrompts')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={addBuiltinPrompt}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('addPrompt')}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {form.builtinPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="p-3 rounded-lg border bg-muted/30 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={prompt.name}
                        onChange={(e) =>
                          updateBuiltinPrompt(prompt.id, { name: e.target.value })
                        }
                        placeholder={tPlaceholders('promptName')}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeBuiltinPrompt(prompt.id)}
                        aria-label={t('removePrompt')}
                        title={t('removePrompt')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={prompt.content}
                      onChange={(e) =>
                        updateBuiltinPrompt(prompt.id, { content: e.target.value })
                      }
                      placeholder={tPlaceholders('promptContent')}
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                ))}

                {form.builtinPrompts.length === 0 && (
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
                COLOR_TINT_CLASS[form.color] ?? 'bg-muted'
              )}
            >
              {form.icon}
            </span>
            <div className="flex-1">
              <p className="font-medium text-sm">{form.name || 'Preset Name'}</p>
              <p className="text-xs text-muted-foreground">
                {form.provider === 'auto' ? 'Auto' : form.provider} • {form.mode} • T:{form.temperature.toFixed(1)}
                {form.webSearchEnabled && ' • Web'}
                {form.thinkingEnabled && ' • Thinking'}
                {form.builtinPrompts.length > 0 && ` • ${form.builtinPrompts.length} prompts`}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim()}>
            {editPreset ? tCommon('save') : t('createPreset')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePresetDialog;
