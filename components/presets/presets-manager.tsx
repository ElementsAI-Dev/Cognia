'use client';

/**
 * PresetsManager - full page/dialog for managing all presets
 */

import { useTranslations } from 'next-intl';
import { Plus, RefreshCw, Trash2, Download, Upload, Sparkles, Search, Layers, Filter } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { PresetCard } from './preset-card';
import { CreatePresetDialog } from './create-preset-dialog';
import { PRESET_CATEGORIES, type Preset } from '@/types/content/preset';
import { usePresetManager } from '@/hooks/presets/use-preset-manager';

interface PresetsManagerProps {
  onSelectPreset?: (preset: Preset) => void;
}

export function PresetsManager({ onSelectPreset }: PresetsManagerProps) {
  const t = useTranslations('presets');
  const tCommon = useTranslations('common');
  const tPlaceholders = useTranslations('placeholders');

  const {
    search,
    setSearch,
    createDialogOpen,
    setCreateDialogOpen,
    editPreset,
    deletePreset,
    setDeletePreset,
    showResetDialog,
    setShowResetDialog,
    aiDescription,
    setAiDescription,
    isGenerating,
    categoryFilter,
    setCategoryFilter,
    fileInputRef,
    selectedPresetId,
    filteredPresets,
    handleSelect,
    handleEdit,
    handleDuplicate,
    handleDelete,
    handleReset,
    handleCreateDialogClose,
    handleExport,
    handleImport,
    handleAIGenerate,
    setDefaultPreset,
  } = usePresetManager({ onSelectPreset, t });

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
        <div className="flex-1 flex items-center gap-2">
          <InputGroup className="flex-1">
            <InputGroupAddon align="inline-start">
              <Search className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
          {/* Category filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                <Filter className="h-4 w-4 mr-1" />
                {categoryFilter === 'all' ? t('allCategories') : t(`categories.${categoryFilter}`)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setCategoryFilter('all')}>
                {t('allCategories')}
                {categoryFilter === 'all' && <Badge variant="secondary" className="ml-auto text-xs">✓</Badge>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {PRESET_CATEGORIES.map((cat) => (
                <DropdownMenuItem key={cat} onClick={() => setCategoryFilter(cat)}>
                  {t(`categories.${cat}`)}
                  {categoryFilter === cat && <Badge variant="secondary" className="ml-auto text-xs">✓</Badge>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
