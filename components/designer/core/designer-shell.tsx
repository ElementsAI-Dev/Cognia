'use client';

/**
 * DesignerShell - unified core implementation for all Designer entry points.
 * It powers both modal panel usage and standalone page usage.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { FrameworkType } from '@/lib/designer';
import { Loader2, X, Sparkles, Send, AlertCircle, Layers, Package, Save } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useDesignerStore } from '@/stores/designer';
import { useArtifactStore } from '@/stores';
import { DesignerToolbar } from '../toolbar/designer-toolbar';
import { DesignerMainWorkspace } from '../workspace/designer-main-workspace';
import { ElementTree } from '../panels/element-tree';
import { StylePanel } from '../panels/style-panel';
import { VersionHistoryPanel } from '../panels/version-history-panel';
import { ComponentLibrary } from '../panels/component-library';
import { DesignTokensPanel } from '../panels/design-tokens-panel';
import { LayoutGridOverlay } from '../preview/layout-grid-overlay';
import { BreadcrumbNav } from '../preview/breadcrumb-nav';
import { DesignerBrowser } from './designer-browser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DesignerDndProvider, SelectionOverlay } from '../dnd';
import { AIChatPanel } from '../ai/ai-chat-panel';
import { CollabToolbar, RemoteCursors } from '../collab';
import { useDesignerCollaboration, useDesignerSession } from '@/hooks/designer';

function getTextDiff(prev: string, next: string): {
  position: number;
  deleted: string;
  inserted: string;
} | null {
  if (prev === next) return null;

  let start = 0;
  const prevLength = prev.length;
  const nextLength = next.length;
  const minLength = Math.min(prevLength, nextLength);

  while (start < minLength && prev[start] === next[start]) {
    start += 1;
  }

  let prevEnd = prevLength - 1;
  let nextEnd = nextLength - 1;

  while (prevEnd >= start && nextEnd >= start && prev[prevEnd] === next[nextEnd]) {
    prevEnd -= 1;
    nextEnd -= 1;
  }

  const deleted = prev.slice(start, prevEnd + 1);
  const inserted = next.slice(start, nextEnd + 1);

  if (!deleted && !inserted) return null;

  return {
    position: start,
    deleted,
    inserted,
  };
}

export interface DesignerShellProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  standalone?: boolean;
  className?: string;
  initialCode?: string;
  framework?: FrameworkType;
  sharedSessionSerialized?: string;
  onCodeChange?: (code: string) => void;
  onAIRequest?: (prompt: string, code: string) => Promise<string>;
  onSave?: (code: string) => void;
}

export function DesignerShell({
  open = true,
  onOpenChange,
  standalone = false,
  className,
  initialCode = '',
  framework: frameworkProp,
  sharedSessionSerialized,
  onCodeChange,
  onAIRequest,
  onSave,
}: DesignerShellProps) {
  const t = useTranslations('designerPanel');
  const tDesigner = useTranslations('designer');
  const [aiPrompt, setAIPrompt] = useState('');
  const [showAIInput, setShowAIInput] = useState(false);
  const [showAIChatPanel, setShowAIChatPanel] = useState(false);
  const [leftPanelTab, setLeftPanelTab] = useState<'elements' | 'components'>('elements');
  const [showGridOverlay, setShowGridOverlay] = useState(false);
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(() => !initialCode);
  const [collabDocumentId] = useState(() => `designer-${Date.now()}`);
  const effectiveOpen = standalone ? true : open;
  const handleOpenChange = onOpenChange ?? (() => {});

  const {
    code,
    framework,
    history,
    historyIndex,
    isAIProcessing,
    aiError,
    updateCode,
    applyTemplate,
    executeAIEdit,
    clearAIError,
    undo,
    redo,
  } = useDesignerSession({
    initialCode,
    framework: frameworkProp,
    onCodeChange,
    onAIRequest,
  });

  // Collaboration hook for real-time editing
  const {
    remoteCursors,
    isConnected: isCollabConnected,
    updateCode: updateCollabCode,
  } = useDesignerCollaboration({
    onRemoteCodeChange: (newCode) => {
      updateCode(newCode, { addToHistory: true, parseMode: 'immediate' });
    },
  });

  // Canvas integration
  const createCanvasDocument = useArtifactStore((state) => state.createCanvasDocument);
  const setActiveCanvas = useArtifactStore((state) => state.setActiveCanvas);
  const openArtifactPanel = useArtifactStore((state) => state.openPanel);

  const mode = useDesignerStore((state) => state.mode);
  const showElementTree = useDesignerStore((state) => state.showElementTree);
  const showStylePanel = useDesignerStore((state) => state.showStylePanel);
  const showHistoryPanel = useDesignerStore((state) => state.showHistoryPanel);
  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const previousCodeRef = useRef(code);

  // Ref for preview container (used by SelectionOverlay)
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    previousCodeRef.current = code;
  }, [code]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    if (!effectiveOpen) return;

    const canUndo = historyIndex >= 0;
    const canRedo = historyIndex < history.length - 1;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input/textarea (except Monaco which handles its own undo)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault();
          undo();
        }
        return;
      }

      // Ctrl+Y or Cmd+Y or Ctrl+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        if (canRedo) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveOpen, undo, redo, history.length, historyIndex]);

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const newCode = value || '';
      const previousCode = previousCodeRef.current;
      updateCode(newCode, { addToHistory: false, parseMode: 'debounced' });
      // Sync to collaboration session if connected
      if (isCollabConnected) {
        const diff = getTextDiff(previousCode, newCode);
        if (diff) {
          if (diff.deleted) {
            updateCollabCode(diff.position, diff.deleted, 'delete', diff.deleted.length);
          }
          if (diff.inserted) {
            updateCollabCode(diff.position, diff.inserted, 'insert');
          }
        }
      }
      previousCodeRef.current = newCode;
    },
    [updateCode, isCollabConnected, updateCollabCode]
  );

  const handleAIEdit = useCallback(() => {
    setShowAIInput(true);
  }, []);

  const handleSave = useCallback(() => {
    onSave?.(code);
  }, [onSave, code]);

  // Open code in Canvas for detailed editing
  const handleOpenInCanvas = useCallback(() => {
    const language = framework === 'html' ? 'html' : 'jsx';
    const docId = createCanvasDocument({
      title: 'Designer Code',
      content: code,
      language,
      type: 'code',
    });
    setActiveCanvas(docId);
    openArtifactPanel('canvas');
    onOpenChange?.(false);
  }, [code, framework, createCanvasDocument, setActiveCanvas, openArtifactPanel, onOpenChange]);

  const handleAISubmit = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    const resultCode = await executeAIEdit(aiPrompt);
    if (resultCode) {
      setAIPrompt('');
      setShowAIInput(false);
    }
  }, [aiPrompt, executeAIEdit]);

  const handleExport = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `component.${framework === 'html' ? 'html' : 'tsx'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code, framework]);

  const content = (
    <>
      {!standalone && <SheetTitle className="sr-only">{t('panelTitle')}</SheetTitle>}
      <DesignerDndProvider>
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b">
          <DesignerToolbar
            onAIEdit={handleAIEdit}
            onExport={handleExport}
            onOpenInCanvas={handleOpenInCanvas}
            showAIChatPanel={showAIChatPanel}
            onToggleAIChat={() => setShowAIChatPanel(!showAIChatPanel)}
            showGridOverlay={showGridOverlay}
            onToggleGridOverlay={() => setShowGridOverlay(!showGridOverlay)}
            onOpenTemplates={() => setShowTemplateBrowser(true)}
            className="border-b-0"
            onCodeChange={(newCode) => updateCode(newCode, { addToHistory: true, parseMode: 'immediate' })}
          />
          <div className="flex items-center gap-2 px-2 py-1.5">
            {onSave && (
              <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={handleSave}>
                <Save className="h-3.5 w-3.5" />
                <span className="text-xs">{tDesigner('save')}</span>
              </Button>
            )}
            {/* Collaboration toolbar */}
            <CollabToolbar
              className="px-0 py-0"
              documentId={collabDocumentId}
              initialCode={code}
              sharedSessionSerialized={sharedSessionSerialized}
              onRemoteCodeChange={(newCode) => {
                updateCode(newCode, { addToHistory: true, parseMode: 'immediate' });
              }}
            />
          </div>
        </div>

        {/* AI Input Bar */}
        {showAIInput && (
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <Input
              value={aiPrompt}
              onChange={(e) => setAIPrompt(e.target.value)}
              placeholder={t('aiPlaceholder')}
              className="flex-1 h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && void handleAISubmit()}
              disabled={isAIProcessing}
              autoFocus
            />
            <Button
              size="sm"
              className="h-8"
              onClick={() => void handleAISubmit()}
              disabled={!aiPrompt.trim() || isAIProcessing}
            >
              {isAIProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            {aiError && (
              <div className="flex items-center gap-1 text-destructive text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="max-w-[200px] truncate">{aiError}</span>
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => {
                setShowAIInput(false);
                clearAIError();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {mode === 'code' ? (
            <DesignerMainWorkspace
              mode={mode}
              framework={framework}
              onCodeChange={handleCodeChange}
              onRequestAIEdit={handleAIEdit}
              className="h-full"
            />
          ) : (
            // Design/Preview view with panels
            <ResizablePanelGroup direction="horizontal" className="h-full min-h-0">
              {/* Left Panel - Element Tree or Component Library */}
              {showElementTree && (
                <>
                  <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                    <div className="flex flex-col h-full min-h-0 border-r">
                      {/* Tab switcher */}
                      <div className="border-b px-2 py-1.5 flex items-center gap-1">
                        <Button
                          variant={leftPanelTab === 'elements' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 text-xs gap-1.5 flex-1"
                          onClick={() => setLeftPanelTab('elements')}
                        >
                          <Layers className="h-3.5 w-3.5" />
                          {t('elements')}
                        </Button>
                        <Button
                          variant={leftPanelTab === 'components' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 text-xs gap-1.5 flex-1"
                          onClick={() => setLeftPanelTab('components')}
                        >
                          <Package className="h-3.5 w-3.5" />
                          {t('components')}
                        </Button>
                      </div>
                      {/* Panel content */}
                      {leftPanelTab === 'elements' ? (
                        <ElementTree className="flex-1 min-h-0 overflow-auto" />
                      ) : (
                        <ComponentLibrary className="flex-1 min-h-0 overflow-auto" />
                      )}
                    </div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              )}

              {/* Preview Panel */}
              <ResizablePanel defaultSize={showStylePanel ? 55 : 80}>
                <div ref={previewContainerRef} className="relative h-full min-h-0">
                  {/* Breadcrumb navigation */}
                  {mode === 'design' && selectedElementId && (
                    <BreadcrumbNav className="absolute top-2 left-2 z-20" />
                  )}
                  <DesignerMainWorkspace
                    mode={mode}
                    framework={framework}
                    onCodeChange={handleCodeChange}
                    onRequestAIEdit={handleAIEdit}
                    className="h-full"
                  />
                  {/* Grid overlay */}
                  {showGridOverlay && (
                    <LayoutGridOverlay className="absolute inset-0 pointer-events-none z-10" />
                  )}
                  {/* Remote cursors overlay for collaboration */}
                  {isCollabConnected && remoteCursors.length > 0 && (
                    <RemoteCursors
                      cursors={remoteCursors}
                      className="absolute inset-0 z-15"
                    />
                  )}
                  {/* Selection overlay for design mode */}
                  {mode === 'design' && selectedElementId && (
                    <SelectionOverlay previewContainerRef={previewContainerRef} />
                  )}
                </div>
              </ResizablePanel>

              {/* Style Panel with Design Tokens */}
              {showStylePanel && mode === 'design' && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
                    <div className="flex flex-col h-full border-l">
                      <Tabs defaultValue="styles" className="flex flex-col h-full">
                        <TabsList className="mx-2 mt-2 grid w-auto grid-cols-2">
                          <TabsTrigger value="styles" className="text-xs">
                            {t('styles')}
                          </TabsTrigger>
                          <TabsTrigger value="tokens" className="text-xs">
                            {t('tokens')}
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="styles" className="flex-1 min-h-0 mt-0 overflow-auto">
                          <StylePanel className="h-full min-h-0" />
                        </TabsContent>
                        <TabsContent value="tokens" className="flex-1 min-h-0 mt-0 overflow-auto">
                          <DesignTokensPanel className="h-full min-h-0" />
                        </TabsContent>
                      </Tabs>
                    </div>
                  </ResizablePanel>
                </>
              )}

              {/* Version History Panel */}
              {showHistoryPanel && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                    <VersionHistoryPanel className="h-full min-h-0 border-l" />
                  </ResizablePanel>
                </>
              )}

              {/* AI Chat Panel */}
              {showAIChatPanel && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                    <AIChatPanel
                      code={code}
                      onCodeChange={(newCode) => {
                        updateCode(newCode, { addToHistory: true, parseMode: 'immediate' });
                      }}
                      isOpen={showAIChatPanel}
                      onClose={() => setShowAIChatPanel(false)}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          )}
        </div>

        {/* Close button */}
        {!standalone && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10"
            onClick={() => handleOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </DesignerDndProvider>

      {/* Template Browser Dialog */}
      <Dialog open={showTemplateBrowser} onOpenChange={setShowTemplateBrowser}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>{t('selectTemplate')}</DialogTitle>
            <DialogDescription>
              {t('selectTemplateDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="h-[60vh] overflow-auto">
            <DesignerBrowser
              showBackButton={false}
              onSelectTemplate={(template) => {
                applyTemplate(template);
                setShowTemplateBrowser(false);
              }}
              onCreateNew={() => {
                updateCode('', { addToHistory: true, parseMode: 'immediate' });
                setShowTemplateBrowser(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  if (standalone) {
    return (
      <div className={cn('h-full w-full flex flex-col bg-background', className)}>
        {content}
      </div>
    );
  }

  return (
    <Sheet open={effectiveOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className={cn('w-full sm:w-[90vw] sm:max-w-[1400px] p-0 flex flex-col', className)}
        showCloseButton={false}
      >
        {content}
      </SheetContent>
    </Sheet>
  );
}

export default DesignerShell;
