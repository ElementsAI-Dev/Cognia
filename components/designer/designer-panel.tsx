'use client';

/**
 * DesignerPanel - Main V0-style web page designer panel
 * Combines preview, element tree, style panel, and code editor
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useSettingsStore, useArtifactStore } from '@/stores';
import { executeDesignerAIEdit, getDesignerAIConfig } from '@/lib/designer';
import { Loader2, X, Sparkles, Send, AlertCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useDesignerStore } from '@/stores/designer-store';
import { DesignerToolbar } from './designer-toolbar';
import { DesignerPreview } from './designer-preview';
import { ElementTree } from './element-tree';
import { StylePanel } from './style-panel';
import { VersionHistoryPanel } from './version-history-panel';
import { DesignerDndProvider, SelectionOverlay } from './dnd';

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

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

  // Track if we've initialized to prevent re-initialization loops
  const initializedRef = useRef(false);
  // Ref for preview container (used by SelectionOverlay)
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Initialize code when panel opens
  useEffect(() => {
    if (initialCode && !initializedRef.current) {
      initializedRef.current = true;
      setCode(initialCode);
      parseCodeToElements(initialCode);
    }
  }, [initialCode, setCode, parseCodeToElements]);

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
      setCode(newCode);
      onCodeChange?.(newCode);
    },
    [setCode, onCodeChange]
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
      parseCodeToElements(newCode);
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
      >
        <SheetTitle className="sr-only">Designer Panel</SheetTitle>
        <DesignerDndProvider>
          {/* Toolbar */}
          <DesignerToolbar onAIEdit={handleAIEdit} onExport={handleExport} onOpenInCanvas={handleOpenInCanvas} />

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
          <div className="flex-1 overflow-hidden">
            {mode === 'code' ? (
              // Code-only view
              <MonacoEditor
                height="100%"
                language="typescript"
                theme="vs-dark"
                value={code}
                onChange={handleCodeChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  tabSize: 2,
                  padding: { top: 16, bottom: 16 },
                }}
              />
            ) : (
              // Design/Preview view with panels
              <ResizablePanelGroup direction="horizontal">
                {/* Element Tree Panel */}
                {showElementTree && (
                  <>
                    <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                      <div className="flex flex-col h-full border-r">
                        <div className="border-b px-3 py-2">
                          <h3 className="text-sm font-medium">{t('elements')}</h3>
                        </div>
                        <ElementTree className="flex-1" />
                      </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                  </>
                )}

                {/* Preview Panel */}
                <ResizablePanel defaultSize={showStylePanel ? 55 : 80}>
                  <div ref={previewContainerRef} className="relative h-full">
                    <DesignerPreview className="h-full" />
                    {/* Selection overlay for design mode */}
                    {mode === 'design' && selectedElementId && (
                      <SelectionOverlay previewContainerRef={previewContainerRef} />
                    )}
                  </div>
                </ResizablePanel>

                {/* Style Panel */}
                {showStylePanel && mode === 'design' && (
                  <>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
                      <div className="flex flex-col h-full border-l">
                        <div className="border-b px-3 py-2">
                          <h3 className="text-sm font-medium">{t('styles')}</h3>
                        </div>
                        <StylePanel className="flex-1" />
                      </div>
                    </ResizablePanel>
                  </>
                )}

                {/* Version History Panel */}
                {showHistoryPanel && (
                  <>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                      <VersionHistoryPanel className="h-full border-l" />
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
      </SheetContent>
    </Sheet>
  );
}

export default DesignerPanel;
