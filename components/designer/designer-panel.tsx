'use client';

/**
 * DesignerPanel - Main V0-style web page designer panel
 * Combines preview, element tree, style panel, and code editor
 */

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, X, Sparkles, Send } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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
  const [aiPrompt, setAIPrompt] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showAIInput, setShowAIInput] = useState(false);

  const mode = useDesignerStore((state) => state.mode);
  const code = useDesignerStore((state) => state.code);
  const setCode = useDesignerStore((state) => state.setCode);
  const showElementTree = useDesignerStore((state) => state.showElementTree);
  const showStylePanel = useDesignerStore((state) => state.showStylePanel);
  const parseCodeToElements = useDesignerStore((state) => state.parseCodeToElements);

  // Initialize code when panel opens
  useState(() => {
    if (initialCode && !code) {
      setCode(initialCode);
      parseCodeToElements(initialCode);
    }
  });

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

  const handleAISubmit = useCallback(async () => {
    if (!aiPrompt.trim() || !onAIRequest) return;

    setIsAIProcessing(true);
    try {
      const newCode = await onAIRequest(aiPrompt, code);
      setCode(newCode);
      parseCodeToElements(newCode);
      onCodeChange?.(newCode);
      setAIPrompt('');
      setShowAIInput(false);
    } catch (error) {
      console.error('AI edit failed:', error);
    } finally {
      setIsAIProcessing(false);
    }
  }, [aiPrompt, code, onAIRequest, setCode, parseCodeToElements, onCodeChange]);

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
        {/* Toolbar */}
        <DesignerToolbar onAIEdit={handleAIEdit} onExport={handleExport} />

        {/* AI Input Bar */}
        {showAIInput && (
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <Input
              value={aiPrompt}
              onChange={(e) => setAIPrompt(e.target.value)}
              placeholder="Describe what you want to change..."
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
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => setShowAIInput(false)}
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
                        <h3 className="text-sm font-medium">Elements</h3>
                      </div>
                      <ElementTree className="flex-1" />
                    </div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              )}

              {/* Preview Panel */}
              <ResizablePanel defaultSize={showStylePanel ? 55 : 80}>
                <DesignerPreview className="h-full" />
              </ResizablePanel>

              {/* Style Panel */}
              {showStylePanel && mode === 'design' && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
                    <div className="flex flex-col h-full border-l">
                      <div className="border-b px-3 py-2">
                        <h3 className="text-sm font-medium">Styles</h3>
                      </div>
                      <StylePanel className="flex-1" />
                    </div>
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
      </SheetContent>
    </Sheet>
  );
}

export default DesignerPanel;
