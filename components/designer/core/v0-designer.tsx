'use client';

/**
 * V0Designer - Complete V0-style web page designer
 * Combines React sandbox, AI editing, and visual design tools
 * Refactored to use shared modules from lib/designer
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSettingsStore, useArtifactStore } from '@/stores';
import {
  DESIGNER_TEMPLATES,
  TEMPLATE_CATEGORIES,
  AI_SUGGESTIONS,
  executeDesignerAIEdit,
  getDesignerAIConfig,
  type DesignerTemplate,
} from '@/lib/designer';
import {
  X,
  Sparkles,
  Send,
  Loader2,
  Wand2,
  Palette,
  Layout,
  Type,
  Box,
  Layers,
  Undo2,
  Redo2,
  Save,
  LayoutDashboard,
  CreditCard,
  FileCode,
  Copy,
  Download,
  Check,
  MessageSquare,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReactSandbox } from '../editor';
import { DesignerDndProvider } from '../dnd';
import { AIChatPanel } from '../ai';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

// Template icon mapping
const TEMPLATE_ICON_MAP: Record<string, React.ReactNode> = {
  blank: <Box className="h-8 w-8" />,
  landing: <Layout className="h-8 w-8" />,
  dashboard: <LayoutDashboard className="h-8 w-8" />,
  form: <Type className="h-8 w-8" />,
  pricing: <CreditCard className="h-8 w-8" />,
};

interface V0DesignerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  onSave?: (code: string) => void;
  onAIRequest?: (prompt: string, code: string) => Promise<string>;
}

export function V0Designer({
  open,
  onOpenChange,
  initialCode,
  onCodeChange,
  onSave,
  onAIRequest,
}: V0DesignerProps) {
  const t = useTranslations('v0Designer');
  const [code, setCode] = useState(initialCode || DESIGNER_TEMPLATES[0].code);
  const [aiPrompt, setAIPrompt] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(!initialCode);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showAIChatPanel, setShowAIChatPanel] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [aiError, setAIError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Copy code handler
  const handleCopyCode = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  // Download code handler
  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'component.jsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code]);

  // Settings for AI
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);

  // Canvas integration
  const createCanvasDocument = useArtifactStore((state) => state.createCanvasDocument);
  const setActiveCanvas = useArtifactStore((state) => state.setActiveCanvas);
  const openPanel = useArtifactStore((state) => state.openPanel);

  // Open current code in Canvas for detailed editing
  const handleOpenInCanvas = useCallback(() => {
    const docId = createCanvasDocument({
      title: 'Designer Code',
      content: code,
      language: 'jsx',
      type: 'code',
    });
    setActiveCanvas(docId);
    openPanel('canvas');
    onOpenChange(false); // Close designer when opening canvas
  }, [code, createCanvasDocument, setActiveCanvas, openPanel, onOpenChange]);

  // Built-in AI request handler using shared module
  const builtInAIRequest = useCallback(async (prompt: string, currentCode: string): Promise<string> => {
    const config = getDesignerAIConfig(defaultProvider, providerSettings);
    const result = await executeDesignerAIEdit(prompt, currentCode, config);
    
    if (result.success && result.code) {
      return result.code;
    }
    throw new Error(result.error || 'AI edit failed');
  }, [defaultProvider, providerSettings]);

  // Initialize with code
  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      setShowTemplates(false);
    }
  }, [initialCode]);

  // Add to history
  const addToHistory = useCallback((newCode: string) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newCode);
      return newHistory.slice(-50); // Keep last 50 entries
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Handle code change
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    onCodeChange?.(newCode);
  }, [onCodeChange]);

  // Handle template selection
  const handleSelectTemplate = useCallback((template: DesignerTemplate) => {
    setCode(template.code);
    addToHistory(template.code);
    setShowTemplates(false);
    onCodeChange?.(template.code);
  }, [addToHistory, onCodeChange]);

  // Handle AI edit - uses provided handler or built-in
  const handleAIEdit = useCallback(async () => {
    if (!aiPrompt.trim()) return;

    setIsAIProcessing(true);
    setAIError(null);
    try {
      const aiHandler = onAIRequest || builtInAIRequest;
      const newCode = await aiHandler(aiPrompt, code);
      setCode(newCode);
      addToHistory(newCode);
      onCodeChange?.(newCode);
      setAIPrompt('');
    } catch (error) {
      console.error('AI edit failed:', error);
      setAIError(error instanceof Error ? error.message : 'AI edit failed');
    } finally {
      setIsAIProcessing(false);
    }
  }, [aiPrompt, code, onAIRequest, builtInAIRequest, addToHistory, onCodeChange]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCode(history[newIndex]);
      onCodeChange?.(history[newIndex]);
    }
  }, [history, historyIndex, onCodeChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCode(history[newIndex]);
      onCodeChange?.(history[newIndex]);
    }
  }, [history, historyIndex, onCodeChange]);

  // Handle save
  const handleSave = useCallback(() => {
    onSave?.(code);
  }, [code, onSave]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[95vw] sm:max-w-[1600px] p-0 flex flex-col"
        showCloseButton={false}
      >
        <SheetTitle className="sr-only">{t('v0DesignerTitle')}</SheetTitle>
        <TooltipProvider>
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                  <Wand2 className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="font-medium text-sm">Designer</span>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Undo/Redo */}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleUndo}
                      disabled={historyIndex <= 0}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('undo')}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleRedo}
                      disabled={historyIndex >= history.length - 1}
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('redo')}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Copy/Download group */}
              <div className="flex items-center border rounded-md">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-r-none"
                      onClick={handleCopyCode}
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copied ? t('copied') : t('copyCode')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-l-none border-l"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('downloadCode')}</TooltipContent>
                </Tooltip>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Templates button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplates(true)}
              >
                <Layers className="h-4 w-4 mr-2" />
                {t('templates')}
              </Button>

              {/* Canvas button - Edit in Monaco */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenInCanvas}
                  >
                    <FileCode className="h-4 w-4 mr-2" />
                    {t('editCode')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('openInCanvas')}</TooltipContent>
              </Tooltip>

              {/* AI button */}
              <Button
                variant={showAIPanel ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowAIPanel(!showAIPanel)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {t('aiEdit')}
              </Button>

              {/* AI Chat button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showAIChatPanel ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setShowAIChatPanel(!showAIChatPanel)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {t('aiChat')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('aiChatTooltip')}</TooltipContent>
              </Tooltip>

              {/* Save button */}
              {onSave && (
                <Button variant="default" size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('save')}
                </Button>
              )}

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* AI Panel */}
          {showAIPanel && (
            <div className="border-b bg-muted/30 p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAIPrompt(e.target.value)}
                      placeholder={t('aiPlaceholder')}
                      className="min-h-[80px] resize-none"
                      disabled={isAIProcessing}
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {AI_SUGGESTIONS.slice(0, 4).map((suggestion) => (
                        <Badge
                          key={suggestion}
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80"
                          onClick={() => setAIPrompt(suggestion)}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                    {aiError && (
                      <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
                        <span>{aiError}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleAIEdit}
                    disabled={!aiPrompt.trim() || isAIProcessing}
                    className="h-10"
                  >
                    {isAIProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {t('generate')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 overflow-hidden">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Main sandbox area */}
              <ResizablePanel defaultSize={showAIChatPanel ? 70 : 100} minSize={50}>
                <DesignerDndProvider>
                  <ReactSandbox
                    code={code}
                    onCodeChange={handleCodeChange}
                    showFileExplorer={false}
                    showConsole={false}
                    onAIEdit={() => setShowAIPanel(true)}
                  />
                </DesignerDndProvider>
              </ResizablePanel>

              {/* AI Chat Panel */}
              {showAIChatPanel && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
                    <AIChatPanel
                      code={code}
                      onCodeChange={(newCode) => {
                        setCode(newCode);
                        addToHistory(newCode);
                        onCodeChange?.(newCode);
                      }}
                      isOpen={showAIChatPanel}
                      onClose={() => setShowAIChatPanel(false)}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        </TooltipProvider>

        {/* Templates Dialog */}
        <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{t('chooseTemplate')}</DialogTitle>
              <DialogDescription>
                {t('chooseTemplateDesc')}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="all" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="all">{t('all')}</TabsTrigger>
                {TEMPLATE_CATEGORIES.map((category) => (
                  <TabsTrigger key={category} value={category}>
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="all" className="mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                    {DESIGNER_TEMPLATES.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={handleSelectTemplate}
                      />
                    ))}
                  </div>
                </TabsContent>

                {TEMPLATE_CATEGORIES.map((category) => (
                  <TabsContent key={category} value={category} className="mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                      {DESIGNER_TEMPLATES.filter((t) => t.category === category).map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onSelect={handleSelectTemplate}
                        />
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </ScrollArea>
            </Tabs>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

// Template card component
function TemplateCard({
  template,
  onSelect,
}: {
  template: DesignerTemplate;
  onSelect: (template: DesignerTemplate) => void;
}) {
  const icon = TEMPLATE_ICON_MAP[template.id] || <Palette className="h-8 w-8" />;
  
  return (
    <button
      onClick={() => onSelect(template)}
      className="group text-left rounded-lg border bg-card p-4 hover:border-primary hover:shadow-md transition-all"
    >
      <div className="aspect-video bg-muted rounded-md mb-3 flex items-center justify-center overflow-hidden">
        <div className="text-4xl opacity-50">
          {icon}
        </div>
      </div>
      <h3 className="font-medium group-hover:text-primary transition-colors">
        {template.name}
      </h3>
      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
      <Badge variant="secondary" className="mt-2">
        {template.category}
      </Badge>
    </button>
  );
}

export default V0Designer;
