'use client';

/**
 * PresetsManager - full page/dialog for managing all presets
 */

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, RefreshCw, Trash2, Download, Upload, Sparkles, Search, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@/components/ui/empty';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PresetCard } from './preset-card';
import { CreatePresetDialog } from './create-preset-dialog';
import { usePresetStore, useSettingsStore } from '@/stores';
import { toast } from '@/components/ui/sonner';
import type { Preset, CreatePresetInput } from '@/types/content/preset';
import { nanoid } from 'nanoid';

interface PresetsManagerProps {
  onSelectPreset?: (preset: Preset) => void;
}

export function PresetsManager({ onSelectPreset }: PresetsManagerProps) {
  const t = useTranslations('presets');
  const tCommon = useTranslations('common');
  const tPlaceholders = useTranslations('placeholders');
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editPreset, setEditPreset] = useState<Preset | null>(null);
  const [deletePreset, setDeletePreset] = useState<Preset | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = usePresetStore((state) => state.presets);
  const selectedPresetId = usePresetStore((state) => state.selectedPresetId);
  const selectPreset = usePresetStore((state) => state.selectPreset);
  const applyPreset = usePresetStore((state) => state.usePreset);
  const deletePresetAction = usePresetStore((state) => state.deletePreset);
  const duplicatePreset = usePresetStore((state) => state.duplicatePreset);
  const setDefaultPreset = usePresetStore((state) => state.setDefaultPreset);
  const resetToDefaults = usePresetStore((state) => state.resetToDefaults);
  const searchPresets = usePresetStore((state) => state.searchPresets);
  const createPreset = usePresetStore((state) => state.createPreset);
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  const filteredPresets = search ? searchPresets(search) : presets;

  const handleSelect = (preset: Preset) => {
    selectPreset(preset.id);
    applyPreset(preset.id);
    onSelectPreset?.(preset);
  };

  const handleEdit = (preset: Preset) => {
    setEditPreset(preset);
    setCreateDialogOpen(true);
  };

  const handleDuplicate = (preset: Preset) => {
    duplicatePreset(preset.id);
  };

  const handleDelete = () => {
    if (deletePreset) {
      deletePresetAction(deletePreset.id);
      setDeletePreset(null);
    }
  };

  const handleReset = () => {
    resetToDefaults();
    setShowResetDialog(false);
  };

  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
    setEditPreset(null);
  };

  // Export presets to JSON file
  const handleExport = () => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      presets: presets.map(p => ({
        name: p.name,
        description: p.description,
        icon: p.icon,
        color: p.color,
        provider: p.provider,
        model: p.model,
        mode: p.mode,
        systemPrompt: p.systemPrompt,
        builtinPrompts: p.builtinPrompts,
        temperature: p.temperature,
        maxTokens: p.maxTokens,
        webSearchEnabled: p.webSearchEnabled,
        thinkingEnabled: p.thinkingEnabled,
        isFavorite: p.isFavorite,
        isDefault: p.isDefault,
        sortOrder: p.sortOrder,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognia-presets-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import presets from JSON file
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.presets && Array.isArray(data.presets)) {
          let imported = 0;
          data.presets.forEach((p: CreatePresetInput & { isFavorite?: boolean; isDefault?: boolean }) => {
            if (p.name && p.provider && p.model) {
              const newPreset = createPreset({
                name: p.name,
                description: p.description,
                icon: p.icon,
                color: p.color,
                provider: p.provider,
                model: p.model,
                mode: p.mode,
                systemPrompt: p.systemPrompt,
                builtinPrompts: p.builtinPrompts,
                temperature: p.temperature,
                maxTokens: p.maxTokens,
                webSearchEnabled: p.webSearchEnabled,
                thinkingEnabled: p.thinkingEnabled,
                isDefault: p.isDefault,
              });
              if (p.isFavorite && newPreset) {
                usePresetStore.getState().toggleFavorite(newPreset.id);
              }
              imported++;
            }
          });
          toast.success(t('importSuccess', { count: imported }));
        } else {
          toast.error(t('errors.invalidFileFormat'));
        }
      } catch {
        toast.error(t('errors.parseFileFailed'));
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // AI Generate preset
  const handleAIGenerate = async () => {
    if (!aiDescription.trim()) return;
    
    const settings = providerSettings['openai'] || Object.values(providerSettings).find(s => s?.apiKey);
    if (!settings?.apiKey) {
      toast.warning(t('errors.noApiKey'));
      return;
    }

    setIsGenerating(true);
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
        const preset = data.preset;
        
        createPreset({
          name: preset.name || 'AI Generated Preset',
          description: preset.description,
          icon: preset.icon || '✨',
          color: preset.color || '#6366f1',
          provider: 'auto',
          model: 'gpt-4o',
          mode: preset.mode || 'chat',
          systemPrompt: preset.systemPrompt,
          builtinPrompts: preset.builtinPrompts?.map((p: { name: string; content: string; description?: string }) => ({
            id: nanoid(),
            name: p.name,
            content: p.content,
            description: p.description || '',
          })),
          temperature: preset.temperature ?? 0.7,
          webSearchEnabled: preset.webSearchEnabled,
          thinkingEnabled: preset.thinkingEnabled,
        });
        setAiDescription('');
        toast.success(t('aiGenerateSuccess'));
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || t('errors.generateFailed'));
      }
    } catch (error) {
      console.error('Failed to generate preset:', error);
      toast.error(t('errors.generateFailedRetry'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Generate Section */}
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
            onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
          />
          <Button
            onClick={handleAIGenerate}
            disabled={!aiDescription.trim() || isGenerating}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <Search className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>
        <div className="flex gap-2">
          {/* Import/Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                {t('export')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                {t('import')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResetDialog(true)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('reset')}
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('newPreset')}
          </Button>
        </div>
      </div>

      {/* Presets Grid */}
      {filteredPresets.length === 0 ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Layers className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>
              {search ? t('noResults') : t('noPresets')}
            </EmptyTitle>
            <EmptyDescription>
              {search ? t('noResultsDesc') : t('noPresetsDesc')}
            </EmptyDescription>
          </EmptyHeader>
          {!search && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('createFirst')}
            </Button>
          )}
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPresets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isSelected={preset.id === selectedPresetId}
              onSelect={() => handleSelect(preset)}
              onEdit={() => handleEdit(preset)}
              onDuplicate={() => handleDuplicate(preset)}
              onDelete={() => setDeletePreset(preset)}
              onSetDefault={() => setDefaultPreset(preset.id)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CreatePresetDialog
        open={createDialogOpen}
        onOpenChange={handleCreateDialogClose}
        editPreset={editPreset}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletePreset}
        onOpenChange={(open) => !open && setDeletePreset(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deletePreset')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirm', { name: deletePreset?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('resetTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('resetConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('resetAll')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default PresetsManager;
