'use client';

/**
 * DesignerPanel - Main V0-style web page designer panel
 * Combines preview, element tree, style panel, and code editor
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSettingsStore, useArtifactStore } from '@/stores';
import { executeDesignerAIEdit, getDesignerAIConfig } from '@/lib/designer';
import { Loader2, X, Sparkles, Send, AlertCircle, Layers, Package } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useDesignerStore } from '@/stores/designer';
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
import { useDesignerCollaboration } from '@/hooks/designer';

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

interface DesignerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  onAIRequest?: (prompt: string, code: string) => Promise<string>;
}

export function DesignerPanel({
  open,
  onOpenChange,
  initialCode = '',
  onCodeChange,
  onAIRequest,
}: DesignerPanelProps) {
  const t = useTranslations('designerPanel');
  const [aiPrompt, setAIPrompt] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showAIInput, setShowAIInput] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [showAIChatPanel, setShowAIChatPanel] = useState(false);
  const [leftPanelTab, setLeftPanelTab] = useState<'elements' | 'components'>('elements');
  const [showGridOverlay, setShowGridOverlay] = useState(false);
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);
  const [collabDocumentId] = useState(() => `designer-${Date.now()}`);

  // Collaboration hook for real-time editing
  const {
    remoteCursors,
    isConnected: isCollabConnected,
    updateCode: updateCollabCode,
  } = useDesignerCollaboration();

  // Settings for built-in AI
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);

  // Canvas integration
  const createCanvasDocument = useArtifactStore((state) => state.createCanvasDocument);
  const setActiveCanvas = useArtifactStore((state) => state.setActiveCanvas);
  const openArtifactPanel = useArtifactStore((state) => state.openPanel);

  // Built-in AI request handler using shared module
  const builtInAIRequest = useCallback(async (prompt: string, currentCode: string): Promise<string> => {
    const config = getDesignerAIConfig(defaultProvider, providerSettings);
    const result = await executeDesignerAIEdit(prompt, currentCode, config);
    
    if (result.success && result.code) {
      return result.code;
    }
    throw new Error(result.error || 'AI edit failed');
  }, [defaultProvider, providerSettings]);

  const mode = useDesignerStore((state) => state.mode);
  const code = useDesignerStore((state) => state.code);
  const setCode = useDesignerStore((state) => state.setCode);
  const showElementTree = useDesignerStore((state) => state.showElementTree);
  const showStylePanel = useDesignerStore((state) => state.showStylePanel);
  const showHistoryPanel = useDesignerStore((state) => state.showHistoryPanel);
  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const parseCodeToElements = useDesignerStore((state) => state.parseCodeToElements);
  const undo = useDesignerStore((state) => state.undo);
  const redo = useDesignerStore((state) => state.redo);
  const history = useDesignerStore((state) => state.history);
  const historyIndex = useDesignerStore((state) => state.historyIndex);
  const previousCodeRef = useRef(code);

  // Track if we've initialized to prevent re-initialization loops
  const initializedRef = useRef(false);
  // Ref for preview container (used by SelectionOverlay)
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Initialize code when panel opens
  useEffect(() => {
    if (initialCode && !initializedRef.current) {
      initializedRef.current = true;
      setCode(initialCode);
      void parseCodeToElements(initialCode);
    }
  }, [initialCode, setCode, parseCodeToElements]);

  useEffect(() => {
    previousCodeRef.current = code;
  }, [code]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    if (!open) return;

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
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, undo, redo, history.length, historyIndex]);

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const newCode = value || '';
      const previousCode = previousCodeRef.current;
      setCode(newCode);
      onCodeChange?.(newCode);
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
    [setCode, onCodeChange, isCollabConnected, updateCollabCode]
  );

  const handleAIEdit = useCallback(() => {
    setShowAIInput(true);
  }, []);

  // Open code in Canvas for detailed editing
  const handleOpenInCanvas = useCallback(() => {
    const docId = createCanvasDocument({
      title: 'Designer Code',
      content: code,
      language: 'jsx',
      type: 'code',
    });
    setActiveCanvas(docId);
    openArtifactPanel('canvas');
    onOpenChange(false);
  }, [code, createCanvasDocument, setActiveCanvas, openArtifactPanel, onOpenChange]);

  const handleAISubmit = useCallback(async () => {
    if (!aiPrompt.trim()) return;

    setIsAIProcessing(true);
    setAIError(null);
    try {
      const aiHandler = onAIRequest || builtInAIRequest;
      const newCode = await aiHandler(aiPrompt, code);
      setCode(newCode);
      await parseCodeToElements(newCode);
      onCodeChange?.(newCode);
      setAIPrompt('');
      setShowAIInput(false);
    } catch (error) {
      console.error('AI edit failed:', error);
      setAIError(error instanceof Error ? error.message : 'AI edit failed');
    } finally {
      setIsAIProcessing(false);
    }
  }, [aiPrompt, code, onAIRequest, builtInAIRequest, setCode, parseCodeToElements, onCodeChange]);

  const handleExport = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'component.tsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[90vw] sm:max-w-[1400px] p-0 flex flex-col"
        showCloseButton={false}
      >
        <SheetTitle className="sr-only">{t('panelTitle')}</SheetTitle>
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
            />
            {/* Collaboration toolbar */}
            <CollabToolbar
              className="px-2 py-1.5"
              documentId={collabDocumentId}
              initialCode={code}
              onCodeUpdate={(newCode) => {
                setCode(newCode);
                void parseCodeToElements(newCode);
                onCodeChange?.(newCode);
              }}
            />
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
                onKeyDown={(e) => e.key === 'Enter' && handleAISubmit()}
                disabled={isAIProcessing}
                autoFocus
              />
              <Button
                size="sm"
                className="h-8"
                onClick={handleAISubmit}
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
                onClick={() => { setShowAIInput(false); setAIError(null); }}
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
                framework="react"
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
                      framework="react"
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
                          setCode(newCode);
                          void parseCodeToElements(newCode);
                          onCodeChange?.(newCode);
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
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
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
                  setCode(template.code);
                  void parseCodeToElements(template.code);
                  onCodeChange?.(template.code);
                  setShowTemplateBrowser(false);
                }}
                onCreateNew={() => {
                  setCode('');
                  void parseCodeToElements('');
                  setShowTemplateBrowser(false);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

export default DesignerPanel;
