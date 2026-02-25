'use client';

/**
 * LaTeX Editor Page - Full-featured LaTeX editing with preview, templates, and AI assistance
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
import { Separator } from '@/components/ui/separator';
import {
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
  PenTool,
  Mic,
} from 'lucide-react';
import {
  LaTeXEditor,
  LatexEquationDialog,
  TemplateDialogContent,
  TemplateSelector,
  LatexSketchDialog,
  LatexVoiceDialog,
  LatexAIFab,
  LatexAISidebar,
  type LaTeXEditorHandle,
} from '@/components/academic/latex-editor';
import { LatexSettingsDialog } from '@/components/academic/latex-editor/settings-dialog';
import { VersionPanel } from '@/components/academic/latex-editor/version-panel';
import { LaTeXExportDialog } from '@/components/latex';
import { useLatexAI } from '@/hooks/latex';
import { useLatex } from '@/hooks/latex';
import { useLatexStore } from '@/stores/latex';
import { cn } from '@/lib/utils';
import type { LatexAITextAction } from '@/hooks/latex/use-latex-ai';
import type { LaTeXEditorConfig } from '@/types/latex';

type LaTeXTab = 'editor' | 'templates' | 'history';

export default function LaTeXPage() {
  const t = useTranslations('latex');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LaTeXTab>('editor');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [equationDialogOpen, setEquationDialogOpen] = useState(false);
  const [sketchDialogOpen, setSketchDialogOpen] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
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
  } = useLatex();

  const {
    documentHistory,
    currentDocumentId,
    saveDocument,
    loadDocument,
    renameDocument,
    duplicateDocument,
    deleteDocument,
    settings,
    initVersionControl,
    createVersion,
    restoreVersion,
    getVersionHistory,
    documents,
  } = useLatexStore();

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Initialize version control when current document changes
  useEffect(() => {
    if (currentDocumentId) {
      initVersionControl(currentDocumentId);
    }
  }, [currentDocumentId, initVersionControl]);

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
    },
    [setContent]
  );

  const handleSave = useCallback(() => {
    saveDocument(content);
    setLastSavedAt(new Date());
  }, [content, saveDocument]);

  // Auto-save timer — use ref so the interval doesn't reset on every keystroke
  const contentRef = useRef(content);
  useEffect(() => { contentRef.current = content; }, [content]);

  useEffect(() => {
    if (!settings.autoSave) return;
    const timer = setInterval(() => {
      if (contentRef.current) {
        saveDocument(contentRef.current);
        setLastSavedAt(new Date());
      }
    }, settings.autoSaveIntervalMs);
    return () => clearInterval(timer);
  }, [settings.autoSave, settings.autoSaveIntervalMs, saveDocument]);

  // Convert store settings to editor config (memoized to avoid CM6 editor recreation)
  const editorConfig = useMemo<Partial<LaTeXEditorConfig>>(() => ({
    theme: settings.theme,
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    tabSize: settings.tabSize,
    lineNumbers: settings.lineNumbers,
    wordWrap: settings.wordWrap,
    spellCheck: settings.spellCheck,
  }), [settings.theme, settings.fontFamily, settings.fontSize, settings.tabSize, settings.lineNumbers, settings.wordWrap, settings.spellCheck]);


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
        setAiPanelOpen(true);
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
              <TemplateDialogContent
                templates={templates}
                templateCategories={templateCategories}
                onSelect={handleTemplateSelect}
              />
            </DialogContent>
          </Dialog>

          {/* Export Button */}
          <LaTeXExportDialog
            content={content}
            trigger={
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                {t('export', { defaultValue: 'Export' })}
              </Button>
            }
          />

          {/* Sketch Input */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setSketchDialogOpen(true)}
          >
            <PenTool className="h-4 w-4" />
            {t('sketch', { defaultValue: 'Sketch' })}
          </Button>

          {/* Voice Input */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setVoiceDialogOpen(true)}
          >
            <Mic className="h-4 w-4" />
            {t('voice', { defaultValue: 'Voice' })}
          </Button>

          {/* Settings */}
          <LatexSettingsDialog />

          <Separator orientation="vertical" className="h-6" />

          {/* Auto-save indicator */}
          {lastSavedAt && (
            <span className="text-xs text-muted-foreground">
              {t('autoSave.lastSaved', { defaultValue: 'Saved' })}{' '}
              {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

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

        <TabsContent value="editor" className="flex-1 mt-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
          <LaTeXEditor
            ref={editorRef}
            initialContent={content}
            config={editorConfig}
            onChange={handleContentChange}
            onSave={handleSave}
            onOpenAIChat={() => setAiPanelOpen(true)}
            onOpenEquationDialog={() => setEquationDialogOpen(true)}
            onOpenAISettings={() => router.push('/settings')}
            onAITextAction={(action) => void handleToolbarAITextAction(action)}
            showAIPanel={aiPanelOpen}
            onAIPanelToggle={setAiPanelOpen}
            className="flex-1"
          />
        </TabsContent>

        <TabsContent value="templates" className="flex-1 mt-0 overflow-auto p-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold mb-4">
              {t('templateLibrary', { defaultValue: 'Template Library' })}
            </h2>
            <TemplateSelector
              templates={templates}
              templateCategories={templateCategories}
              onSelect={handleTemplateSelect}
              variant="expanded"
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="flex-1 mt-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
          {/* Version Control Panel */}
          <div className="border-b">
            <VersionPanel
              versions={getVersionHistory()}
              onCreateVersion={(msg) => createVersion(msg)}
              onRestoreVersion={(id) => {
                const success = restoreVersion(id);
                if (success && currentDocumentId) {
                  const doc = documents[currentDocumentId];
                  if (doc) setContent(doc.content);
                }
              }}
              className="max-h-[40vh]"
            />
          </div>

          {/* Document History */}
          <div className="flex-1 overflow-auto p-4">
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

      {/* Sketch to LaTeX Dialog */}
      <LatexSketchDialog
        open={sketchDialogOpen}
        onOpenChange={setSketchDialogOpen}
        onInsert={(latex) => {
          editorRef.current?.insertText(latex);
        }}
      />

      {/* Voice to LaTeX Dialog */}
      <LatexVoiceDialog
        open={voiceDialogOpen}
        onOpenChange={setVoiceDialogOpen}
        onInsert={(latex) => {
          editorRef.current?.insertText(latex);
        }}
      />

      {/* AI Floating Action Button - shown when AI panel is closed */}
      {!aiPanelOpen && !aiSidebarOpen && (
        <LatexAIFab onClick={() => setAiSidebarOpen(true)} />
      )}

      {/* AI Sidebar - floating chat overlay */}
      <LatexAISidebar
        open={aiSidebarOpen}
        onClose={() => setAiSidebarOpen(false)}
      />
    </div>
  );
}
