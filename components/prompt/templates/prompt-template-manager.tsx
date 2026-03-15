"use client";

/**
 * PromptTemplateManager - Main template management component
 * Layout aligned with SkillSettings: Card wrapper, InputGroup search,
 * Select category filter, category grouping, skeleton loading, delete confirmation.
 */

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Upload,
  Download,
  Search,
  X,
  FileText,
  Grid3X3,
  List,
  Settings2,
  Zap,
  ArrowUpDown,
  Clock,
  SortAsc,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '@/components/ui/input-group';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import { derivePromptWorkflowState } from '@/lib/prompts/marketplace-utils';
import { cn } from '@/lib/utils';
import { usePromptTemplateStore } from '@/stores';
import { toast } from '@/components/ui/sonner';
import { PromptTemplateCard } from './prompt-template-card';
import { PromptTemplateCardSkeleton } from './prompt-template-card-skeleton';
import { PromptTemplateEditor } from './prompt-template-editor';
import { PromptTemplateAdvancedEditor } from './prompt-template-advanced-editor';
import type {
  CreatePromptTemplateInput,
  PromptTemplate,
  PromptTemplateImportStrategy,
} from '@/types/content/prompt-template';
import { NEW_PROMPT_TEMPLATE_DRAFT_SESSION_ID } from '@/types/content/prompt-template';

type ViewMode = 'grid' | 'list';
type SortMode = 'name' | 'updated' | 'usage';

export function PromptTemplateManager() {
  const t = useTranslations('promptTemplate.manager');
  const tCommon = useTranslations('common');
  const templates = usePromptTemplateStore((state) => state.templates);
  const categories = usePromptTemplateStore((state) => state.categories);
  const isInitialized = usePromptTemplateStore((state) => state.isInitialized);
  const createTemplate = usePromptTemplateStore((state) => state.createTemplate);
  const updateTemplate = usePromptTemplateStore((state) => state.updateTemplate);
  const deleteTemplate = usePromptTemplateStore((state) => state.deleteTemplate);
  const duplicateTemplate = usePromptTemplateStore((state) => state.duplicateTemplate);
  const searchTemplates = usePromptTemplateStore((state) => state.searchTemplates);
  const importTemplates = usePromptTemplateStore((state) => state.importTemplates);
  const exportTemplates = usePromptTemplateStore((state) => state.exportTemplates);
  const initializeDefaults = usePromptTemplateStore((state) => state.initializeDefaults);
  const operationStates = usePromptTemplateStore((state) => state.operationStates);
  const draftSessions = usePromptTemplateStore((state) => state.draftSessions);
  const saveDraftSession = usePromptTemplateStore((state) => state.saveDraftSession);
  const restoreDraftSession = usePromptTemplateStore((state) => state.restoreDraftSession);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPayload, setImportPayload] = useState('');
  const [importStrategy, setImportStrategy] = useState<PromptTemplateImportStrategy>('skip');
  const [useAdvancedEditor, setUseAdvancedEditor] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('updated');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if inside an input/textarea/contenteditable
    const target = e.target as HTMLElement;
    const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      setEditing(null);
      setIsEditorOpen(true);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      searchInputRef.current?.focus();
    } else if (e.key === 'Escape') {
      if (isEditorOpen) {
        setIsEditorOpen(false);
      } else if (isImportOpen) {
        setIsImportOpen(false);
      } else if (search && isEditable) {
        setSearch('');
        searchInputRef.current?.blur();
      }
    }
  }, [isEditorOpen, isImportOpen, search]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const filtered = useMemo(() => {
    const list = search ? searchTemplates(search) : templates;
    const byCategory = activeCategory === 'all' ? list : list.filter((tpl) => tpl.category === activeCategory);
    return [...byCategory].sort((a, b) => {
      switch (sortMode) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'usage':
          return b.usageCount - a.usageCount;
        case 'updated':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }, [search, searchTemplates, templates, activeCategory, sortMode]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length };
    templates.forEach((tpl) => {
      if (tpl.category) {
        counts[tpl.category] = (counts[tpl.category] || 0) + 1;
      }
    });
    return counts;
  }, [templates]);

  const groupedTemplates = useMemo(() =>
    filtered.reduce(
      (acc, tpl) => {
        const cat = tpl.category || 'custom';
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push(tpl);
        return acc;
      },
      {} as Record<string, PromptTemplate[]>
    ),
    [filtered]
  );

  const templateStats = useMemo(() => {
    const recentlyUsed = templates.filter((tpl) => tpl.lastUsedAt).length;
    return {
      total: templates.length,
      categories: Object.keys(categoryCounts).length - 1,
      recentlyUsed,
    };
  }, [templates, categoryCounts]);

  useEffect(() => {
    initializeDefaults();
  }, [initializeDefaults]);

  const templateWorkflows = useMemo(
    () =>
      Object.fromEntries(
        templates.map((template) => [
          template.id,
          derivePromptWorkflowState({
            template,
            draftSession: draftSessions[template.id],
          }),
        ])
      ),
    [draftSessions, templates]
  );

  const currentDraftSnapshot = useMemo(
    () => (editing ? draftSessions[editing.id]?.snapshot : draftSessions[NEW_PROMPT_TEMPLATE_DRAFT_SESSION_ID]?.snapshot),
    [draftSessions, editing]
  );

  const handleCreate = () => {
    restoreDraftSession(NEW_PROMPT_TEMPLATE_DRAFT_SESSION_ID);
    setEditing(null);
    setSubmitError(null);
    setIsEditorOpen(true);
  };

  const openEditor = useCallback((template: PromptTemplate) => {
    restoreDraftSession(template.id);
    setEditing(template);
    setSubmitError(null);
    setIsEditorOpen(true);
  }, [restoreDraftSession]);

  const handleSave = (input: Parameters<typeof createTemplate>[0]) => {
    setSubmitError(null);
    const result = editing ? updateTemplate(editing.id, input) : createTemplate(input);
    if (!result.ok) {
      const message = result.errors?.[0]?.message || result.message || t('saveFailed');
      setSubmitError(message);
      toast.error(message);
      return;
    }

    if (editing && result.code === 'SOURCE_GUARDED') {
      toast.success(t('sourceGuardedForked'));
    } else {
      toast.success(t('saveSuccess'));
    }
    setIsEditorOpen(false);
    setEditing(null);
  };

  const handleSaveDraft = useCallback((input: CreatePromptTemplateInput, origin: 'editor' | 'advanced-editor') => {
    const draftId = editing?.id ?? NEW_PROMPT_TEMPLATE_DRAFT_SESSION_ID;
    saveDraftSession(draftId, input, origin);
    toast.success('Draft saved');
  }, [editing?.id, saveDraftSession]);

  const handleImport = () => {
    const report = importTemplates(importPayload, { strategy: importStrategy });
    const successCount = report.imported + report.overwritten + report.duplicated;
    if (successCount > 0) {
      toast.success(
        t('importSummary', {
          success: successCount,
          skipped: report.skipped,
          failed: report.failed,
        })
      );
      setImportPayload('');
      setIsImportOpen(false);
    } else {
      const firstFailure = report.items.find((item) => item.status === 'failed');
      toast.error(firstFailure?.message || t('importFailed'));
    }
    return report;
  };

  const handleDeleteRequest = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      const result = deleteTemplate(deleteConfirmId);
      if (!result.ok) {
        toast.error(result.message || t('deleteFailed'));
      }
    }
    setDeleteConfirmId(null);
  }, [deleteConfirmId, deleteTemplate, t]);

  const handleDuplicate = useCallback((id: string) => {
    const result = duplicateTemplate(id);
    if (!result.ok) {
      toast.error(result.message || t('duplicateFailed'));
      return;
    }
    toast.success(t('duplicateSuccess'));
  }, [duplicateTemplate, t]);

  const isLoading = !isInitialized && templates.length === 0;
  const importIsRunning = operationStates.import?.status === 'running';
  const exportIsRunning = operationStates.export?.status === 'running';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                {t('title')}
              </CardTitle>
              <CardDescription className="mt-1.5">{t('subtitle')}</CardDescription>
            </div>
            {templates.length > 0 && (
              <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
                <span className="tabular-nums">{templateStats.total} {t('total')}</span>
                <Separator orientation="vertical" className="h-4" />
                <span className="tabular-nums">{templateStats.categories} {t('categoriesCount')}</span>
                <Separator orientation="vertical" className="h-4" />
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="tabular-nums">{templateStats.recentlyUsed}</span>
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Compact toolbar - single row */}
          <div className="flex items-center gap-2 flex-wrap">
            <InputGroup className="flex-1 min-w-[180px]">
              <InputGroupAddon align="inline-start">
                <Search className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                ref={searchInputRef}
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-sm"
              />
              {search && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton size="icon-xs" onClick={() => setSearch('')}>
                    <X className="h-3 w-3" />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>

            <Select
              value={activeCategory}
              onValueChange={setActiveCategory}
            >
              <SelectTrigger className="w-[140px] sm:w-[160px] h-9 text-sm">
                <SelectValue placeholder={t('allCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCategory')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs shrink-0">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {sortMode === 'name' ? 'A-Z' : sortMode === 'usage' ? t('sortUsage') : t('sortRecent')}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setSortMode('updated')} className="gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  {t('sortRecent')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode('name')} className="gap-2 text-xs">
                  <SortAsc className="h-3.5 w-3.5" />
                  A-Z
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode('usage')} className="gap-2 text-xs">
                  <Zap className="h-3.5 w-3.5" />
                  {t('sortUsage')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View toggle */}
            <div className="flex items-center border rounded-md shrink-0">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-r-none"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Actions */}
            <Button size="sm" className="h-9" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('newTemplate')}</span>
              <span className="sm:hidden">{t('create')}</span>
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => setIsImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('import')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              disabled={exportIsRunning}
              onClick={() => {
                const result = exportTemplates();
                if (!result.ok || !result.data) {
                  toast.error(result.message || t('exportFailed'));
                  return;
                }
                navigator.clipboard.writeText(result.data.json);
                toast.success(t('copyExportSuccess', { count: result.data.count }));
              }}
            >
              <Download className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('copyExport')}</span>
            </Button>
          </div>

          {/* Skeleton loading */}
          {isLoading ? (
            <div className={cn(
              viewMode === 'grid'
                ? 'grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'space-y-2',
            )}>
              {Array.from({ length: 6 }).map((_, i) => (
                <PromptTemplateCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t('noTemplates')}
              description={search || activeCategory !== 'all' ? t('noMatchingTemplates') : t('createFirstTemplate')}
              actions={
                search || activeCategory !== 'all'
                  ? [{ label: t('clearFilters'), onClick: () => { setSearch(''); setActiveCategory('all'); }, variant: 'outline' as const, icon: X }]
                  : [{ label: t('newTemplate'), onClick: handleCreate, icon: Plus }]
              }
            />
          ) : activeCategory !== 'all' ? (
            /* Single category flat grid */
            <div className={cn(
              'gap-3',
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col space-y-2',
            )}>
              {filtered.map((template) => (
                <PromptTemplateCard
                  key={template.id}
                  template={template}
                  workflowState={templateWorkflows[template.id]}
                  onEdit={openEditor}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </div>
          ) : (
            /* Grouped by category */
            <div className="space-y-5">
              {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <div key={category}>
                  {/* Category group header */}
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs font-medium">
                      {category}
                    </Badge>
                    <Badge variant="secondary" className="text-xs tabular-nums">
                      {categoryTemplates.length}
                    </Badge>
                    <Separator className="flex-1" />
                  </div>

                  {/* Templates grid/list */}
                  {viewMode === 'grid' ? (
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {categoryTemplates.map((template) => (
                        <PromptTemplateCard
                          key={template.id}
                          template={template}
                          workflowState={templateWorkflows[template.id]}
                          onEdit={openEditor}
                          onDuplicate={handleDuplicate}
                          onDelete={handleDeleteRequest}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categoryTemplates.map((template) => (
                        <PromptTemplateCard
                          key={template.id}
                          template={template}
                          workflowState={templateWorkflows[template.id]}
                          onEdit={openEditor}
                          onDuplicate={handleDuplicate}
                          onDelete={handleDeleteRequest}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{editing ? t('editTemplate') : t('createTemplate')}</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUseAdvancedEditor(!useAdvancedEditor)}
                className="gap-1.5"
              >
                <Settings2 className="h-4 w-4" />
                {useAdvancedEditor ? t('simpleEditor') : t('advancedEditor')}
              </Button>
            </div>
          </DialogHeader>
          {useAdvancedEditor ? (
            <PromptTemplateAdvancedEditor
              key={editing?.id ?? 'new-advanced'}
              template={editing ?? undefined}
              draftSnapshot={currentDraftSnapshot}
              categories={categories}
              submitError={submitError ?? undefined}
              onCancel={() => setIsEditorOpen(false)}
              onSaveDraft={(input) => handleSaveDraft(input, 'advanced-editor')}
              onSubmit={handleSave}
            />
          ) : (
            <PromptTemplateEditor
              key={editing?.id ?? 'new'}
              template={editing ?? undefined}
              draftSnapshot={currentDraftSnapshot}
              categories={categories}
              submitError={submitError ?? undefined}
              onCancel={() => setIsEditorOpen(false)}
              onSaveDraft={(input) => handleSaveDraft(input, 'editor')}
              onSubmit={handleSave}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('importTitle')}</DialogTitle>
          </DialogHeader>
          <Textarea
            className="min-h-[160px] font-mono"
            placeholder={t('importPlaceholder')}
            value={importPayload}
            onChange={(e) => setImportPayload(e.target.value)}
          />
          <Select value={importStrategy} onValueChange={(value) => setImportStrategy(value as PromptTemplateImportStrategy)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skip">{t('importStrategySkip')}</SelectItem>
              <SelectItem value="overwrite">{t('importStrategyOverwrite')}</SelectItem>
              <SelectItem value="duplicate">{t('importStrategyDuplicate')}</SelectItem>
            </SelectContent>
          </Select>
          {operationStates.import?.status === 'error' && (
            <p className="text-sm text-destructive">{operationStates.import.message || t('importFailed')}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsImportOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleImport} disabled={importIsRunning}>
              {importIsRunning ? t('importing') : t('import')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTemplate')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirmation')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{tCommon('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
