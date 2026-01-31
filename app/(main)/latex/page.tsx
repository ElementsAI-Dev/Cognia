'use client';

/**
 * LaTeX Editor Page - Full-featured LaTeX editing with preview, templates, and AI assistance
 */

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Download,
  FileCode,
  History,
  BookOpen,
  Save,
  Copy,
  Check,
  MoreHorizontal,
  Pencil,
  Copy as CopyIcon,
  Trash2,
} from 'lucide-react';
import {
  LaTeXEditor,
  LatexAISidebar,
  LatexAIFab,
  LatexEquationDialog,
  type LaTeXEditorHandle,
} from '@/components/academic/latex-editor';
import { useLatexAI } from '@/hooks/latex';
import { useLatex } from '@/hooks/latex';
import { useLatexStore } from '@/stores/latex';
import { cn } from '@/lib/utils';
import type { LatexAITextAction } from '@/hooks/latex/use-latex-ai';

type LaTeXTab = 'editor' | 'templates' | 'history';

export default function LaTeXPage() {
  const t = useTranslations('latex');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LaTeXTab>('editor');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [equationDialogOpen, setEquationDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDocId, setRenameDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const editorRef = useRef<LaTeXEditorHandle | null>(null);

  const { generateEquation, runTextAction, isLoading: aiLoading } = useLatexAI();

  const {
    content,
    setContent,
    templates,
    templateCategories,
    getTemplateById,
    exportToFormat,
    isExporting,
  } = useLatex();

  const {
    documentHistory,
    currentDocumentId,
    saveDocument,
    loadDocument,
    renameDocument,
    duplicateDocument,
    deleteDocument,
  } = useLatexStore();

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
    },
    [setContent]
  );

  const handleSave = useCallback(() => {
    saveDocument(content);
  }, [content, saveDocument]);

  const handleExport = useCallback(
    async (format: 'html' | 'markdown' | 'plaintext') => {
      const result = await exportToFormat(content, format);
      if (result) {
        const blob = new Blob([result], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document.${format === 'plaintext' ? 'txt' : format === 'markdown' ? 'md' : 'html'}`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setExportDialogOpen(false);
    },
    [content, exportToFormat]
  );

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      const template = getTemplateById(templateId);
      if (template) {
        setContent(template.content);
        setTemplateDialogOpen(false);
        setActiveTab('editor');
      }
    },
    [getTemplateById, setContent]
  );

  const handleCopyContent = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const openRename = useCallback((docId: string, currentName: string) => {
    setRenameDocId(docId);
    setRenameValue(currentName);
    setRenameOpen(true);
  }, []);

  const submitRename = useCallback(() => {
    if (!renameDocId) return;
    const next = renameValue.trim();
    if (!next) return;
    renameDocument(renameDocId, next);
    setRenameOpen(false);
    setRenameDocId(null);
  }, [renameDocId, renameDocument, renameValue]);

  const handleToolbarAITextAction = useCallback(
    async (action: LatexAITextAction) => {
      const selection = editorRef.current?.getSelectedText()?.trim() || '';
      if (!selection) {
        setAiSidebarOpen(true);
        return;
      }

      const result = await runTextAction({
        action,
        text: selection,
        targetLanguage: action === 'translate' ? 'Chinese (Simplified)' : undefined,
      });

      if (result) {
        editorRef.current?.replaceSelection(result);
      }
    },
    [runTextAction]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileCode className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-semibold">{t('title', { defaultValue: 'LaTeX Editor' })}</h1>
            <p className="text-xs text-muted-foreground">
              {t('description', { defaultValue: 'Write and preview LaTeX documents with AI assistance' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Template Button */}
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <BookOpen className="h-4 w-4" />
                {t('templates', { defaultValue: 'Templates' })}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>{t('selectTemplate', { defaultValue: 'Select Template' })}</DialogTitle>
                <DialogDescription>
                  {t('templateDescription', { defaultValue: 'Choose a template to start your document' })}
                </DialogDescription>
              </DialogHeader>
              <Separator />
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {templateCategories.map(({ category, count }) => (
                    <div key={category}>
                      <h3 className="font-medium mb-3 capitalize flex items-center gap-2">
                        {category}
                        <Badge variant="secondary" className="text-xs">
                          {count}
                        </Badge>
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {templates
                          .filter((t) => t.category === category)
                          .map((template) => (
                            <button
                              key={template.id}
                              onClick={() => handleTemplateSelect(template.id)}
                              className="text-left p-3 rounded-lg border hover:border-primary hover:bg-accent transition-colors"
                            >
                              <div className="font-medium text-sm">{template.name}</div>
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {template.description}
                              </div>
                              {template.tags && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  {template.tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Export Button */}
          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                {t('export', { defaultValue: 'Export' })}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('exportDocument', { defaultValue: 'Export Document' })}</DialogTitle>
                <DialogDescription>
                  {t('exportDescription', { defaultValue: 'Choose export format' })}
                </DialogDescription>
              </DialogHeader>
              <Separator />
              <div className="grid gap-3 py-4">
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3"
                  onClick={() => handleExport('html')}
                  disabled={isExporting}
                >
                  <FileText className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">HTML</div>
                    <div className="text-xs text-muted-foreground">
                      Export as HTML with MathJax rendering
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3"
                  onClick={() => handleExport('markdown')}
                  disabled={isExporting}
                >
                  <FileCode className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Markdown</div>
                    <div className="text-xs text-muted-foreground">
                      Export as Markdown with LaTeX math blocks
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3"
                  onClick={() => handleExport('plaintext')}
                  disabled={isExporting}
                >
                  <FileText className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Plain Text</div>
                    <div className="text-xs text-muted-foreground">
                      Export as plain text without formatting
                    </div>
                  </div>
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Separator orientation="vertical" className="h-6" />

          {/* Copy Button */}
          <Button variant="ghost" size="sm" onClick={handleCopyContent} className="gap-2">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>

          {/* Save Button */}
          <Button size="sm" onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            {t('save', { defaultValue: 'Save' })}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as LaTeXTab)}
        className="flex-1 flex flex-col"
      >
        <div className="border-b px-4">
          <TabsList className="h-11">
            <TabsTrigger value="editor" className="gap-2 text-sm">
              <FileCode className="h-4 w-4" />
              {t('tabs.editor', { defaultValue: 'Editor' })}
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2 text-sm">
              <BookOpen className="h-4 w-4" />
              {t('tabs.templates', { defaultValue: 'Templates' })}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 text-sm">
              <History className="h-4 w-4" />
              {t('tabs.history', { defaultValue: 'History' })}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="editor" className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          <LaTeXEditor
            ref={editorRef}
            initialContent={content}
            onChange={handleContentChange}
            onSave={handleSave}
            onOpenAIChat={() => setAiSidebarOpen(true)}
            onOpenEquationDialog={() => setEquationDialogOpen(true)}
            onOpenAISettings={() => router.push('/settings')}
            onAITextAction={(action) => void handleToolbarAITextAction(action)}
            className="flex-1"
          />
        </TabsContent>

        <TabsContent value="templates" className="flex-1 mt-0 overflow-auto p-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold mb-4">
              {t('templateLibrary', { defaultValue: 'Template Library' })}
            </h2>
            <div className="space-y-6">
              {templateCategories.map(({ category, count }) => (
                <div key={category}>
                  <h3 className="font-medium mb-3 capitalize flex items-center gap-2">
                    {category}
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templates
                      .filter((t) => t.category === category)
                      .map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateSelect(template.id)}
                          className="text-left p-4 rounded-lg border hover:border-primary hover:bg-accent transition-colors"
                        >
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {template.description}
                          </div>
                          {template.tags && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {template.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="flex-1 mt-0 overflow-auto p-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-lg font-semibold mb-4">
              {t('documentHistory', { defaultValue: 'Document History' })}
            </h2>
            {documentHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('noHistory', { defaultValue: 'No document history yet' })}</p>
                <p className="text-sm mt-1">
                  {t('startEditing', { defaultValue: 'Start editing to create history' })}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documentHistory.map((doc) => (
                  <div
                    key={doc.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => loadDocument(doc.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        loadDocument(doc.id);
                      }
                    }}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-lg border transition-colors',
                      'hover:border-primary/60 hover:bg-muted/20',
                      currentDocumentId === doc.id && 'border-primary'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium truncate">{doc.name || t('untitledDocument')}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </span>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openRename(doc.id, doc.name || t('untitledDocument'));
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              {t('historyActions.rename')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateDocument(doc.id);
                              }}
                            >
                              <CopyIcon className="h-4 w-4" />
                              {t('historyActions.duplicate')}
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {t('historyActions.delete')}
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('historyActions.deleteDialog.title')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('historyActions.deleteDialog.description')}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('historyActions.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      deleteDocument(doc.id);
                                    }}
                                  >
                                    {t('historyActions.delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {doc.content.slice(0, 100)}...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('historyActions.renameDialog.title')}</DialogTitle>
            <DialogDescription>{t('historyActions.renameDialog.description')}</DialogDescription>
          </DialogHeader>
          <Separator />
          <div className="space-y-3">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder={t('historyActions.renameDialog.placeholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitRename();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
                {t('historyActions.cancel')}
              </Button>
              <Button type="button" onClick={submitRename} disabled={!renameValue.trim()}>
                {t('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LatexAISidebar open={aiSidebarOpen} onClose={() => setAiSidebarOpen(false)} />

      <LatexAIFab onClick={() => setAiSidebarOpen(true)} />

      <LatexEquationDialog
        open={equationDialogOpen}
        onOpenChange={setEquationDialogOpen}
        onGenerate={generateEquation}
        isLoading={aiLoading}
        onInsert={(latex) => {
          editorRef.current?.insertText(latex);
          setEquationDialogOpen(false);
        }}
      />
    </div>
  );
}
