"use client";

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Upload, Download, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { usePromptTemplateStore } from '@/stores';
import { PromptTemplateCard } from './prompt-template-card';
import { PromptTemplateEditor } from './prompt-template-editor';
import { PromptTemplateAdvancedEditor } from './prompt-template-advanced-editor';
import type { PromptTemplate } from '@/types/content/prompt-template';

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

  const filtered = useMemo(() => {
    const list = search ? searchTemplates(search) : templates;
    if (activeCategory === 'all') return list;
    return list.filter((tpl) => tpl.category === activeCategory);
  }, [search, searchTemplates, templates, activeCategory]);

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-64"
          />
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList>
              <TabsTrigger value="all">{t('allCategory')}</TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat}>
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />
            {t('import')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(exportTemplates())}>
            <Download className="h-4 w-4 mr-1" />
            {t('copyExport')}
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            {t('newTemplate')}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
        {filtered.length === 0 && (
          <div className="rounded-md border border-dashed p-6 text-muted-foreground text-sm">
            {t('noTemplates')}
          </div>
        )}
      </div>

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
