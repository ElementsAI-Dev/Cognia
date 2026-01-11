'use client';

/**
 * PresetManagerDialog - Full preset management with create, edit, delete, and AI optimization
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Plus,
  Trash2,
  Copy,
  Wand2,
  Loader2,
  Save,
  X,
  Pencil,
  Globe,
  Brain,
  Sparkles,
  Zap,
} from 'lucide-react';
import { usePresetStore, useSettingsStore } from '@/stores';
import { toast } from '@/components/ui/sonner';
import {
  type Preset,
  type CreatePresetInput,
  type BuiltinPrompt,
  PRESET_COLORS,
  PRESET_ICONS,
} from '@/types/content/preset';
import { PROVIDERS } from '@/types/provider';
import type { ChatMode } from '@/types/core/session';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';

interface PresetManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPresetId?: string | null;
  onPresetSelect?: (preset: Preset) => void;
}

type TabType = 'list' | 'edit';

export function PresetManagerDialog({
  open,
  onOpenChange,
  editPresetId,
  onPresetSelect,
}: PresetManagerDialogProps) {
  const t = useTranslations('presetManager');
  const tPlaceholders = useTranslations('placeholders');
  const presets = usePresetStore((state) => state.presets);
  const createPreset = usePresetStore((state) => state.createPreset);
  const updatePreset = usePresetStore((state) => state.updatePreset);
  const deletePreset = usePresetStore((state) => state.deletePreset);
  const duplicatePreset = usePresetStore((state) => state.duplicatePreset);
  const getPreset = usePresetStore((state) => state.getPreset);
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [editingPreset, setEditingPreset] = useState<Partial<Preset> | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isGeneratingPreset, setIsGeneratingPreset] = useState(false);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');  
  const [aiDescription, setAiDescription] = useState('');

  // Initialize editing preset when editPresetId changes
  useEffect(() => {
    if (editPresetId && open) {
      const preset = getPreset(editPresetId);
      if (preset) {
        setEditingPreset({ ...preset });
        setActiveTab('edit');
      }
    }
  }, [editPresetId, open, getPreset]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setEditingPreset(null);
      setActiveTab('list');
      setSearchQuery('');
    }
  }, [open]);

  const filteredPresets = searchQuery
    ? presets.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : presets;

  const handleCreateNew = useCallback(() => {
    setEditingPreset({
      name: '',
      description: '',
      icon: '💬',
      color: PRESET_COLORS[0],
      provider: 'auto',
      model: 'gpt-4o',
      mode: 'chat',
      systemPrompt: '',
      builtinPrompts: [],
      temperature: 0.7,
      webSearchEnabled: false,
      thinkingEnabled: false,
    });
    setActiveTab('edit');
  }, []);

  const handleEdit = useCallback((preset: Preset) => {
    setEditingPreset({ ...preset });
    setActiveTab('edit');
  }, []);

  const handleDuplicate = useCallback((id: string) => {
    const newPreset = duplicatePreset(id);
    if (newPreset) {
      setEditingPreset({ ...newPreset });
      setActiveTab('edit');
    }
  }, [duplicatePreset]);

  const handleDelete = useCallback((id: string) => {
    deletePreset(id);
  }, [deletePreset]);

  const handleSave = useCallback(() => {
    if (!editingPreset?.name) return;

    if (editingPreset.id) {
      // Update existing
      updatePreset(editingPreset.id, editingPreset);
    } else {
      // Create new
      const newPreset = createPreset(editingPreset as CreatePresetInput);
      onPresetSelect?.(newPreset);
    }

    setEditingPreset(null);
    setActiveTab('list');
  }, [editingPreset, createPreset, updatePreset, onPresetSelect]);

  const handleOptimizePrompt = useCallback(async () => {
    if (!editingPreset?.systemPrompt) return;

    const currentProvider = editingPreset.provider === 'auto' ? 'openai' : editingPreset.provider;
    const settings = providerSettings[currentProvider as keyof typeof providerSettings];

    if (!settings?.apiKey) {
      toast.warning('Please configure API key for the selected provider first.');
      return;
    }

    setIsOptimizing(true);

    try {
      const response = await fetch('/api/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editingPreset.systemPrompt,
          provider: currentProvider,
          apiKey: settings.apiKey,
          baseURL: settings.baseURL,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEditingPreset((prev) => ({
          ...prev,
          systemPrompt: data.optimizedPrompt,
        }));
      }
    } catch (error) {
      console.error('Failed to optimize prompt:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [editingPreset, providerSettings]);

  const handleAddBuiltinPrompt = useCallback(() => {
    setEditingPreset((prev) => ({
      ...prev,
      builtinPrompts: [
        ...(prev?.builtinPrompts || []),
        {
          id: nanoid(),
          name: '',
          content: '',
          description: '',
        },
      ],
    }));
  }, []);

  // AI Generate Preset from description
  const handleAIGeneratePreset = useCallback(async () => {
    if (!aiDescription.trim()) return;

    const settings = providerSettings['openai'] || Object.values(providerSettings).find(s => s?.apiKey);
    if (!settings?.apiKey) {
      toast.warning('Please configure an API key first.');
      return;
    }

    setIsGeneratingPreset(true);

    try {
      const response = await fetch('/api/generate-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: aiDescription,
          provider: 'openai',
          apiKey: settings.apiKey,
          baseURL: settings.baseURL,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const generatedPreset = data.preset;
        
        setEditingPreset({
          name: generatedPreset.name,
          description: generatedPreset.description,
          icon: generatedPreset.icon,
          color: generatedPreset.color,
          provider: 'auto',
          model: 'gpt-4o',
          mode: generatedPreset.mode,
          systemPrompt: generatedPreset.systemPrompt,
          temperature: generatedPreset.temperature,
          webSearchEnabled: generatedPreset.webSearchEnabled,
          thinkingEnabled: generatedPreset.thinkingEnabled,
          builtinPrompts: generatedPreset.builtinPrompts?.map((p: { name: string; content: string; description?: string }) => ({
            id: nanoid(),
            ...p,
          })) || [],
        });
        setActiveTab('edit');
        setAiDescription('');
      }
    } catch (error) {
      console.error('Failed to generate preset:', error);
    } finally {
      setIsGeneratingPreset(false);
    }
  }, [aiDescription, providerSettings]);

  // AI Generate Built-in Prompts
  const handleAIGenerateBuiltinPrompts = useCallback(async () => {
    if (!editingPreset?.name) return;

    const currentProvider = editingPreset.provider === 'auto' ? 'openai' : editingPreset.provider;
    const settings = providerSettings[currentProvider as keyof typeof providerSettings] || providerSettings['openai'];

    if (!settings?.apiKey) {
      toast.warning('Please configure an API key first.');
      return;
    }

    setIsGeneratingPrompts(true);

    try {
      const response = await fetch('/api/enhance-builtin-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presetName: editingPreset.name,
          presetDescription: editingPreset.description,
          systemPrompt: editingPreset.systemPrompt,
          existingPrompts: editingPreset.builtinPrompts,
          action: editingPreset.builtinPrompts?.length ? 'enhance' : 'generate',
          count: 3,
          provider: currentProvider,
          apiKey: settings.apiKey,
          baseURL: settings.baseURL,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newPrompts = data.prompts.map((p: { name: string; content: string; description?: string }) => ({
          id: nanoid(),
          name: p.name,
          content: p.content,
          description: p.description || '',
        }));

        setEditingPreset((prev) => ({
          ...prev,
          builtinPrompts: [...(prev?.builtinPrompts || []), ...newPrompts],
        }));
      }
    } catch (error) {
      console.error('Failed to generate prompts:', error);
    } finally {
      setIsGeneratingPrompts(false);
    }
  }, [editingPreset, providerSettings]);

  const handleUpdateBuiltinPrompt = useCallback(
    (id: string, updates: Partial<BuiltinPrompt>) => {
      setEditingPreset((prev) => ({
        ...prev,
        builtinPrompts: prev?.builtinPrompts?.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      }));
    },
    []
  );

  const handleRemoveBuiltinPrompt = useCallback((id: string) => {
    setEditingPreset((prev) => ({
      ...prev,
      builtinPrompts: prev?.builtinPrompts?.filter((p) => p.id !== id),
    }));
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {activeTab === 'edit'
              ? editingPreset?.id
                ? t('editPreset')
                : t('createPreset')
              : t('managePresets')}
          </DialogTitle>
          <DialogDescription>
            {activeTab === 'edit'
              ? t('editDescription')
              : t('manageDescription')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">{t('allPresets')}</TabsTrigger>
            <TabsTrigger value="edit" disabled={!editingPreset}>
              {editingPreset?.id ? t('edit') : t('create')}
            </TabsTrigger>
          </TabsList>

          {/* List Tab */}
          <TabsContent value="list" className="flex-1 overflow-hidden flex flex-col">
            {/* AI Generate Section */}
            <div className="mb-4 p-3 rounded-lg border bg-gradient-to-r from-purple-500/5 to-blue-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">{t('aiGeneratePreset')}</span>
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
                >
                  {isGeneratingPreset ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Input
                placeholder={tPlaceholders('searchPresets')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                {t('new')}
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-4">
                {filteredPresets.map((preset) => (
                  <PresetListItem
                    key={preset.id}
                    preset={preset}
                    onEdit={() => handleEdit(preset)}
                    onDuplicate={() => handleDuplicate(preset.id)}
                    onDelete={() => handleDelete(preset.id)}
                    onSelect={() => {
                      onPresetSelect?.(preset);
                      onOpenChange(false);
                    }}
                  />
                ))}
                {filteredPresets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('noPresetsFound')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Edit Tab */}
          <TabsContent value="edit" className="flex-1 overflow-hidden">
            {editingPreset && (
              <ScrollArea className="h-full pr-4">
                <PresetEditForm
                  preset={editingPreset}
                  onChange={setEditingPreset}
                  onOptimizePrompt={handleOptimizePrompt}
                  isOptimizing={isOptimizing}
                  onAddBuiltinPrompt={handleAddBuiltinPrompt}
                  onUpdateBuiltinPrompt={handleUpdateBuiltinPrompt}
                  onRemoveBuiltinPrompt={handleRemoveBuiltinPrompt}
                  onAIGeneratePrompts={handleAIGenerateBuiltinPrompts}
                  isGeneratingPrompts={isGeneratingPrompts}
                />
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {activeTab === 'edit' && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingPreset(null);
                setActiveTab('list');
              }}
            >
              {t('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!editingPreset?.name}>
              <Save className="h-4 w-4 mr-2" />
              {t('savePreset')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PresetListItemProps {
  preset: Preset;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSelect: () => void;
}

function PresetListItem({
  preset,
  onEdit,
  onDuplicate,
  onDelete,
  onSelect,
}: PresetListItemProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
      onClick={onSelect}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
        style={{ backgroundColor: `${preset.color}20` }}
      >
        {preset.icon}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{preset.name}</span>
          {preset.isDefault && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              Default
            </span>
          )}
          {preset.webSearchEnabled && (
            <Globe className="h-3 w-3 text-muted-foreground" />
          )}
          {preset.thinkingEnabled && (
            <Brain className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        {preset.description && (
          <p className="text-sm text-muted-foreground truncate">
            {preset.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{preset.mode}</span>
          <span>•</span>
          <span>{preset.model}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface PresetEditFormProps {
  preset: Partial<Preset>;
  onChange: (preset: Partial<Preset>) => void;
  onOptimizePrompt: () => void;
  isOptimizing: boolean;
  onAddBuiltinPrompt: () => void;
  onUpdateBuiltinPrompt: (id: string, updates: Partial<BuiltinPrompt>) => void;
  onRemoveBuiltinPrompt: (id: string) => void;
  onAIGeneratePrompts: () => void;
  isGeneratingPrompts: boolean;
}

function PresetEditForm({
  preset,
  onChange,
  onOptimizePrompt,
  isOptimizing,
  onAddBuiltinPrompt,
  onUpdateBuiltinPrompt,
  onRemoveBuiltinPrompt,
  onAIGeneratePrompts,
  isGeneratingPrompts,
}: PresetEditFormProps) {
  const t = useTranslations('presetManager');
  const tPlaceholders = useTranslations('placeholders');
  const providers = Object.entries(PROVIDERS);

  return (
    <div className="space-y-6 pb-4">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">{t('basicInfo')}</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('name')}</Label>
            <Input
              id="name"
              value={preset.name || ''}
              onChange={(e) => onChange({ ...preset, name: e.target.value })}
              placeholder={tPlaceholders('enterPresetName')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('iconColor')}</Label>
            <div className="flex items-center gap-2">
              <Select
                value={preset.icon || '💬'}
                onValueChange={(v) => onChange({ ...preset, icon: v })}
              >
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="grid grid-cols-4 gap-1 p-1">
                    {PRESET_ICONS.map((icon) => (
                      <SelectItem key={icon} value={icon} className="cursor-pointer">
                        {icon}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>

              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.slice(0, 8).map((color) => (
                  <button
                    key={color}
                    className={cn(
                      'h-6 w-6 rounded-full border-2 transition-all',
                      preset.color === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => onChange({ ...preset, color })}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('description')}</Label>
          <Input
            id="description"
            value={preset.description || ''}
            onChange={(e) => onChange({ ...preset, description: e.target.value })}
            placeholder={tPlaceholders('enterPresetDescription')}
          />
        </div>
      </div>

      {/* Model Configuration */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">{t('modelConfig')}</h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t('provider')}</Label>
            <Select
              value={preset.provider || 'auto'}
              onValueChange={(v) => onChange({ ...preset, provider: v as Preset['provider'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t('auto')}</SelectItem>
                {providers.map(([id, provider]) => (
                  <SelectItem key={id} value={id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('model')}</Label>
            <Input
              value={preset.model || ''}
              onChange={(e) => onChange({ ...preset, model: e.target.value })}
              placeholder="gpt-4o"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('mode')}</Label>
            <Select
              value={preset.mode || 'chat'}
              onValueChange={(v) => onChange({ ...preset, mode: v as ChatMode })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chat">{t('modeChat')}</SelectItem>
                <SelectItem value="agent">{t('modeAgent')}</SelectItem>
                <SelectItem value="research">{t('modeResearch')}</SelectItem>
                <SelectItem value="learning">{t('modeLearning')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('temperature')}: {preset.temperature?.toFixed(1) || '0.7'}</Label>
          <Slider
            value={[preset.temperature ?? 0.7]}
            onValueChange={([v]) => onChange({ ...preset, temperature: v })}
            min={0}
            max={2}
            step={0.1}
          />
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">{t('features')}</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t('webSearch')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('webSearchDesc')}
            </p>
          </div>
          <Switch
            checked={preset.webSearchEnabled || false}
            onCheckedChange={(v) => onChange({ ...preset, webSearchEnabled: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              {t('thinkingMode')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('thinkingModeDesc')}
            </p>
          </div>
          <Switch
            checked={preset.thinkingEnabled || false}
            onCheckedChange={(v) => onChange({ ...preset, thinkingEnabled: v })}
          />
        </div>
      </div>

      {/* System Prompt */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{t('systemPrompt')}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onOptimizePrompt}
            disabled={!preset.systemPrompt || isOptimizing}
          >
            {isOptimizing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            {t('aiOptimize')}
          </Button>
        </div>

        <Textarea
          value={preset.systemPrompt || ''}
          onChange={(e) => onChange({ ...preset, systemPrompt: e.target.value })}
          placeholder={tPlaceholders('enterSystemPrompt')}
          className="min-h-[120px] resize-none"
        />
      </div>

      {/* Built-in Prompts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{t('builtinPrompts')}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onAIGeneratePrompts}
              disabled={!preset.name || isGeneratingPrompts}
            >
              {isGeneratingPrompts ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {t('aiGenerate')}
            </Button>
            <Button variant="outline" size="sm" onClick={onAddBuiltinPrompt}>
              <Plus className="h-4 w-4 mr-2" />
              {t('add')}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {preset.builtinPrompts?.map((prompt) => (
            <div
              key={prompt.id}
              className="p-3 rounded-lg border bg-muted/30 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={prompt.name}
                  onChange={(e) =>
                    onUpdateBuiltinPrompt(prompt.id, { name: e.target.value })
                  }
                  placeholder={tPlaceholders('promptName')}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => onRemoveBuiltinPrompt(prompt.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={prompt.content}
                onChange={(e) =>
                  onUpdateBuiltinPrompt(prompt.id, { content: e.target.value })
                }
                placeholder={tPlaceholders('promptContent')}
                className="min-h-[80px] resize-none"
              />
            </div>
          ))}

          {(!preset.builtinPrompts || preset.builtinPrompts.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('noBuiltinPrompts')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PresetManagerDialog;
