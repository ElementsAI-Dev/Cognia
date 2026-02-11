"use client";

/**
 * PromptTemplateManager - Main template management component
 * Modern design with improved responsive layout and better space utilization
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
  Sparkles,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { usePromptTemplateStore } from '@/stores';
import { PromptTemplateCard } from './prompt-template-card';
import { PromptTemplateEditor } from './prompt-template-editor';
import { PromptTemplateAdvancedEditor } from './prompt-template-advanced-editor';
import type { PromptTemplate } from '@/types/content/prompt-template';

type ViewMode = 'grid' | 'list';

export function PromptTemplateManager() {
  const t = useTranslations('promptTemplate.manager');
  const templates = usePromptTemplateStore((state) => state.templates);
  const categories = usePromptTemplateStore((state) => state.categories);
  const createTemplate = usePromptTemplateStore((state) => state.createTemplate);
  const updateTemplate = usePromptTemplateStore((state) => state.updateTemplate);
  const deleteTemplate = usePromptTemplateStore((state) => state.deleteTemplate);
  const duplicateTemplate = usePromptTemplateStore((state) => state.duplicateTemplate);
  const searchTemplates = usePromptTemplateStore((state) => state.searchTemplates);
  const importTemplates = usePromptTemplateStore((state) => state.importTemplates);
  const exportTemplates = usePromptTemplateStore((state) => state.exportTemplates);
  const initializeDefaults = usePromptTemplateStore((state) => state.initializeDefaults);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPayload, setImportPayload] = useState('');
  const [useAdvancedEditor, setUseAdvancedEditor] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
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
    if (activeCategory === 'all') return list;
    return list.filter((tpl) => tpl.category === activeCategory);
  }, [search, searchTemplates, templates, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length };
    templates.forEach((tpl) => {
      if (tpl.category) {
        counts[tpl.category] = (counts[tpl.category] || 0) + 1;
      }
    });
    return counts;
  }, [templates]);

  useEffect(() => {
    initializeDefaults();
  }, [initializeDefaults]);

  const handleCreate = () => {
    setEditing(null);
    setIsEditorOpen(true);
  };

  const handleSave = (input: Parameters<typeof createTemplate>[0]) => {
    if (editing) {
      updateTemplate(editing.id, input);
    } else {
      createTemplate(input);
    }
    setIsEditorOpen(false);
  };

  const handleImport = () => {
    const added = importTemplates(importPayload);
    setImportPayload('');
    setIsImportOpen(false);
    return added;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header Section */}
      <div className="shrink-0 px-4 lg:px-6 py-4 border-b bg-background/80 backdrop-blur-sm space-y-4">
        {/* Title & Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
              <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
            </div>
            <Badge variant="secondary" className="ml-2 font-mono text-xs tabular-nums">
              {templates.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9"
              onClick={() => setIsImportOpen(true)}
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{t('import')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9"
              onClick={() => navigator.clipboard.writeText(exportTemplates())}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t('copyExport')}</span>
            </Button>
            <Button
              size="sm"
              className="gap-1.5 h-9 shadow-sm"
              onClick={handleCreate}
            >
              <Plus className="h-4 w-4" />
              {t('newTemplate')}
            </Button>
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pl-9 pr-9 h-10 bg-muted/30 border-muted-foreground/20 focus-visible:bg-background focus-visible:border-primary/40 transition-all"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Category Tabs */}
          <ScrollArea className="w-full sm:w-auto sm:flex-1">
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="bg-muted/50 p-1 h-auto inline-flex w-auto">
                <TabsTrigger
                  value="all"
                  className="gap-1.5 px-3 py-2 data-[state=active]:shadow-sm"
                >
                  {t('allCategory')}
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px] font-semibold">
                    {categoryCounts.all || 0}
                  </Badge>
                </TabsTrigger>
                {categories.map((cat) => (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    className="gap-1.5 px-3 py-2 data-[state=active]:shadow-sm"
                  >
                    <span className="truncate max-w-24">{cat}</span>
                    {categoryCounts[cat] && (
                      <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px] font-semibold">
                        {categoryCounts[cat]}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/30 shrink-0">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className={cn('h-8 w-8 transition-all', viewMode === 'grid' && 'shadow-sm')}
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className={cn('h-8 w-8 transition-all', viewMode === 'list' && 'shadow-sm')}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        {(search || activeCategory !== 'all') && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{t('activeFilters')}:</span>
            {search && (
              <Badge
                variant="secondary"
                className="gap-1.5 pl-2 pr-1 py-1 cursor-pointer hover:bg-secondary/80"
                onClick={() => setSearch('')}
              >
                &ldquo;{search}&rdquo;
                <X className="h-3 w-3" />
              </Badge>
            )}
            {activeCategory !== 'all' && (
              <Badge
                variant="secondary"
                className="gap-1.5 pl-2 pr-1 py-1 cursor-pointer hover:bg-secondary/80"
                onClick={() => setActiveCategory('all')}
              >
                {activeCategory}
                <X className="h-3 w-3" />
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => {
                setSearch('');
                setActiveCategory('all');
              }}
            >
              {t('clearAll')}
            </Button>
          </div>
        )}
      </div>

      {/* Content Section */}
      <ScrollArea className="flex-1">
        <div className="p-4 lg:p-6 xl:p-8">
          {filtered.length > 0 ? (
            <div
              className={cn(
                'gap-4',
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5'
                  : 'flex flex-col'
              )}
            >
              {filtered.map((template) => (
                <PromptTemplateCard
                  key={template.id}
                  template={template}
                  onEdit={(tpl) => {
                    setEditing(tpl);
                    setIsEditorOpen(true);
                  }}
                  onDuplicate={duplicateTemplate}
                  onDelete={deleteTemplate}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center border-2 border-dashed rounded-2xl bg-muted/20">
              <div className="p-4 rounded-2xl bg-indigo-500/10 mb-4 shadow-sm">
                <Sparkles className="h-10 w-10 text-indigo-500/50" />
              </div>
              <h3 className="font-semibold text-lg">{t('noTemplates')}</h3>
              <p className="text-muted-foreground mt-2 text-sm max-w-sm">
                {search || activeCategory !== 'all' ? t('noMatchingTemplates') : t('createFirstTemplate')}
              </p>
              {search || activeCategory !== 'all' ? (
                <Button
                  variant="outline"
                  className="mt-6 gap-2"
                  onClick={() => {
                    setSearch('');
                    setActiveCategory('all');
                  }}
                >
                  <X className="h-4 w-4" />
                  {t('clearFilters')}
                </Button>
              ) : (
                <Button className="mt-6 gap-2" onClick={handleCreate}>
                  <Plus className="h-4 w-4" />
                  {t('newTemplate')}
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

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
              categories={categories}
              onCancel={() => setIsEditorOpen(false)}
              onSubmit={handleSave}
            />
          ) : (
            <PromptTemplateEditor
              key={editing?.id ?? 'new'}
              template={editing ?? undefined}
              categories={categories}
              onCancel={() => setIsEditorOpen(false)}
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
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsImportOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleImport}>{t('import')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
