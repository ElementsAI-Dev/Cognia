"use client";

import { useEffect, useMemo, useState } from 'react';
import { Plus, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { usePromptTemplateStore } from '@/stores';
import { PromptTemplateCard } from './prompt-template-card';
import { PromptTemplateEditor } from './prompt-template-editor';
import type { PromptTemplate } from '@/types/content/prompt-template';

export function PromptTemplateManager() {
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
            placeholder="Search templates"
            className="w-64"
          />
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
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
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(exportTemplates())}>
            <Download className="h-4 w-4 mr-1" />
            Copy export
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            New template
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
            No templates found. Create one to get started.
          </div>
        )}
      </div>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit template' : 'Create template'}</DialogTitle>
          </DialogHeader>
          <PromptTemplateEditor
            key={editing?.id ?? 'new'}
            template={editing ?? undefined}
            categories={categories}
            onCancel={() => setIsEditorOpen(false)}
            onSubmit={handleSave}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import templates (JSON)</DialogTitle>
          </DialogHeader>
          <Textarea
            className="min-h-[160px] font-mono"
            placeholder="Paste template JSON here"
            value={importPayload}
            onChange={(e) => setImportPayload(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport}>Import</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
