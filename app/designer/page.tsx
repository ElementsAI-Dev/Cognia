'use client';

/**
 * Designer Page - Standalone V0-style web page designer
 */

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSettingsStore, useArtifactStore } from '@/stores';
import { ReactSandbox } from '@/components/designer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DESIGNER_TEMPLATES,
  AI_SUGGESTIONS,
  TEMPLATE_CATEGORIES,
  FRAMEWORK_OPTIONS,
  executeDesignerAIEdit,
  getDesignerAIConfig,
  type FrameworkType,
} from '@/lib/designer';
import {
  Sparkles,
  Send,
  Loader2,
  ArrowLeft,
  Wand2,
  AlertCircle,
  Layers,
  X,
  Undo2,
  Redo2,
  Download,
  Copy,
  Check,
  FileCode,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

export default function DesignerPage() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(DESIGNER_TEMPLATES[0].code);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [framework, setFramework] = useState<FrameworkType>('react');
  
  // History for undo/redo
  const [history, setHistory] = useState<string[]>([DESIGNER_TEMPLATES[0].code]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Filter templates by selected framework
  const filteredTemplates = DESIGNER_TEMPLATES.filter(t => t.framework === framework);

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);

  // Canvas integration
  const createCanvasDocument = useArtifactStore((state) => state.createCanvasDocument);
  const setActiveCanvas = useArtifactStore((state) => state.setActiveCanvas);
  const openPanel = useArtifactStore((state) => state.openPanel);

  // Open current code in Canvas for detailed editing
  const handleOpenInCanvas = useCallback(() => {
    const language = framework === 'vue' ? 'jsx' : (framework === 'html' ? 'html' : 'jsx');
    const docId = createCanvasDocument({
      title: 'Designer Code',
      content: code,
      language: language as 'jsx' | 'html',
      type: 'code',
    });
    setActiveCanvas(docId);
    openPanel('canvas');
  }, [code, framework, createCanvasDocument, setActiveCanvas, openPanel]);

  // Add to history helper
  const addToHistory = useCallback((newCode: string) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newCode);
      return newHistory.slice(-50); // Keep last 50 entries
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Undo handler
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCode(history[newIndex]);
    }
  }, [history, historyIndex]);

  // Redo handler
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCode(history[newIndex]);
    }
  }, [history, historyIndex]);

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

  // Load code from sessionStorage if key parameter is present
  useEffect(() => {
    const key = searchParams.get('key');
    if (key) {
      const storedCode = sessionStorage.getItem(key);
      if (storedCode) {
        setCode(storedCode);
        setShowTemplates(false);
        // Clean up after reading
        sessionStorage.removeItem(key);
      }
    }
  }, [searchParams]);

  const handleSelectTemplate = useCallback((template: typeof DESIGNER_TEMPLATES[0]) => {
    addToHistory(template.code);
    setCode(template.code);
    setShowTemplates(false);
  }, [addToHistory]);

  // Handle code change from editor
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    // Debounce history updates for manual edits
  }, []);

  const handleAIEdit = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    
    setIsAIProcessing(true);
    setAIError(null);

    try {
      const config = getDesignerAIConfig(defaultProvider, providerSettings);
      const result = await executeDesignerAIEdit(aiPrompt, code, config);

      if (result.success && result.code) {
        addToHistory(result.code);
        setCode(result.code);
        setAIPrompt('');
      } else {
        setAIError(result.error || 'AI edit failed');
      }
    } catch (error) {
      setAIError(error instanceof Error ? error.message : 'AI edit failed');
    } finally {
      setIsAIProcessing(false);
    }
  }, [aiPrompt, code, defaultProvider, providerSettings, addToHistory]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <Wand2 className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-medium text-sm">Designer</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-l-none border-l"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Copy/Download */}
          <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={handleCopyCode}
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-l-none border-l"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
            <Layers className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleOpenInCanvas}
            title="Open in Canvas for detailed code editing with Monaco Editor"
          >
            <FileCode className="h-4 w-4 mr-2" />
            Edit Code
          </Button>
          <Button
            variant={showAIPanel ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAIPanel(!showAIPanel)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Edit
          </Button>
        </div>
      </header>

      {/* AI Panel */}
      {showAIPanel && (
        <div className="border-b p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAIPrompt(e.target.value)}
                placeholder="Describe what you want to change..."
                className="min-h-[60px] resize-none text-sm"
                disabled={isAIProcessing}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {AI_SUGGESTIONS.slice(0, 4).map((suggestion) => (
                  <Badge
                    key={suggestion}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted text-xs"
                    onClick={() => setAIPrompt(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
              {aiError && (
                <div className="flex items-center gap-2 mt-2 text-destructive text-xs">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{aiError}</span>
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={handleAIEdit}
                disabled={!aiPrompt.trim() || isAIProcessing}
              >
                {isAIProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Generate
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowAIPanel(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ReactSandbox
          code={code}
          onCodeChange={handleCodeChange}
          showFileExplorer={false}
          showConsole={false}
          framework={framework}
        />
      </div>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Start with a pre-built template or create from scratch
            </DialogDescription>
          </DialogHeader>

          {/* Framework selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {FRAMEWORK_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={framework === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFramework(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <Tabs defaultValue="all" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="all">All</TabsTrigger>
              {TEMPLATE_CATEGORIES.map((category) => (
                <TabsTrigger key={category} value={category}>
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              <TabsContent value="all" className="mt-0 px-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="group text-left rounded-lg border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all duration-200"
                    >
                      <div className="aspect-video bg-muted rounded-md mb-3 flex items-center justify-center overflow-hidden">
                        <Layers className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                      <h3 className="font-medium group-hover:text-primary transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>
                      <Badge variant="secondary" className="mt-3">
                        {template.category}
                      </Badge>
                    </button>
                  ))}
                </div>
              </TabsContent>

              {TEMPLATE_CATEGORIES.map((category) => (
                <TabsContent key={category} value={category} className="mt-0 px-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.filter((t) => t.category === category).map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="group text-left rounded-lg border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all duration-200"
                      >
                        <div className="aspect-video bg-muted rounded-md mb-3 flex items-center justify-center overflow-hidden">
                          <Layers className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                        <h3 className="font-medium group-hover:text-primary transition-colors">
                          {template.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </p>
                        <Badge variant="secondary" className="mt-3">
                          {template.category}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
