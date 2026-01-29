'use client';

/**
 * Designer Page - Standalone V0-style web page designer
 * Full-featured designer with ElementTree, StylePanel, VersionHistory, and AI editing
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSettingsStore, useArtifactStore } from '@/stores';
import { useDesignerStore } from '@/stores/designer';
import { useDebouncedCallback } from '@/hooks/utils/use-debounce';
import {
  ReactSandbox,
  ElementTree,
  StylePanel,
  VersionHistoryPanel,
  DesignerDndProvider,
  DesignerCard,
} from '@/components/designer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ButtonGroup } from '@/components/ui/button-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CopyButton } from '@/components/chat/ui/copy-button';
import { Separator } from '@/components/ui/separator';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  FileCode,
  Eye,
  Pencil,
  Code2,
  PanelLeft,
  PanelRight,
  History,
  Monitor,
  Tablet,
  Smartphone,
  Maximize,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '@/components/ui/input-group';
import { Search, Grid3X3, List, ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
// Types now come from store, no need to import

export default function DesignerPage() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(DESIGNER_TEMPLATES[0].code);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [framework, setFramework] = useState<FrameworkType>('react');
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateViewMode, setTemplateViewMode] = useState<'grid' | 'list'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Panel visibility states - use store for persistence
  const showElementTree = useDesignerStore((state) => state.showElementTree);
  const showStylePanel = useDesignerStore((state) => state.showStylePanel);
  const showHistoryPanel = useDesignerStore((state) => state.showHistoryPanel);
  const toggleElementTree = useDesignerStore((state) => state.toggleElementTree);
  const toggleStylePanel = useDesignerStore((state) => state.toggleStylePanel);
  const toggleHistoryPanel = useDesignerStore((state) => state.toggleHistoryPanel);
  const designerMode = useDesignerStore((state) => state.mode);
  const setDesignerMode = useDesignerStore((state) => state.setMode);
  const viewport = useDesignerStore((state) => state.viewport);
  const setViewport = useDesignerStore((state) => state.setViewport);
  
  // History for undo/redo
  const [history, setHistory] = useState<string[]>([DESIGNER_TEMPLATES[0].code]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Designer store integration - sync code with store for ElementTree/StylePanel
  const parseCodeToElements = useDesignerStore((state) => state.parseCodeToElements);
  const setDesignerCode = useDesignerStore((state) => state.setCode);
  
  // Sync code with designer store when code changes
  useEffect(() => {
    setDesignerCode(code, false);
    parseCodeToElements(code);
  }, [code, setDesignerCode, parseCodeToElements]);

  // Filter templates by selected framework, search, and category
  const filteredTemplates = useMemo(() => {
    let result = DESIGNER_TEMPLATES.filter(t => t.framework === framework);
    
    // Search filter
    if (templateSearch.trim()) {
      const query = templateSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query)
      );
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter);
    }
    
    return result;
  }, [framework, templateSearch, categoryFilter]);
  
  // Category counts for current framework
  const categoryCounts = useMemo(() => {
    const frameworkTemplates = DESIGNER_TEMPLATES.filter(t => t.framework === framework);
    const counts: Record<string, number> = { all: frameworkTemplates.length };
    for (const template of frameworkTemplates) {
      counts[template.category] = (counts[template.category] || 0) + 1;
    }
    return counts;
  }, [framework]);

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

  // Debounced history update for manual edits (1 second delay)
  const debouncedAddToHistory = useDebouncedCallback((newCode: unknown) => {
    addToHistory(newCode as string);
  }, 1000);

  // Handle code change from editor
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    debouncedAddToHistory(newCode);
  }, [debouncedAddToHistory]);

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
    <div className="h-[calc(100vh-var(--titlebar-height,0px))] flex flex-col bg-background" data-page="designer">
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
          <ButtonGroup>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </ButtonGroup>

          {/* Copy/Download */}
          <ButtonGroup>
            <CopyButton
              content={code}
              iconOnly
              tooltip="Copy code"
              className="h-8 w-8"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </ButtonGroup>

          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)} data-tour="designer-templates">
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

          <Separator orientation="vertical" className="h-6" />

          {/* Panel toggles */}
          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showElementTree ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleElementTree}
                  >
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Element Tree</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showStylePanel ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleStylePanel}
                  >
                    <PanelRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Style Panel</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showHistoryPanel ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleHistoryPanel}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Version History</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6" />

          {/* Mode switcher */}
          <ButtonGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={designerMode === 'preview' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDesignerMode('preview')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preview</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={designerMode === 'design' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDesignerMode('design')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Design</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={designerMode === 'code' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDesignerMode('code')}
                >
                  <Code2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Code</TooltipContent>
            </Tooltip>
          </ButtonGroup>

          {/* Viewport controls */}
          <ButtonGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewport('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mobile</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewport === 'tablet' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewport('tablet')}
                >
                  <Tablet className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tablet</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewport('desktop')}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Desktop</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewport === 'full' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewport('full')}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Full Width</TooltipContent>
            </Tooltip>
          </ButtonGroup>
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
                <Alert variant="destructive" className="mt-2 py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{aiError}</AlertDescription>
                </Alert>
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
      <div className="flex-1 min-h-0 overflow-hidden">
        <DesignerDndProvider>
          <ResizablePanelGroup direction="horizontal" className="h-full min-h-0">
            {/* Element Tree Panel */}
            {showElementTree && (
              <>
                <ResizablePanel defaultSize={18} minSize={15} maxSize={25}>
                  <div className="flex flex-col h-full border-r bg-background">
                    <div className="border-b px-3 py-2 flex items-center justify-between">
                      <h3 className="text-sm font-medium">Elements</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={toggleElementTree}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <ElementTree className="flex-1 overflow-auto" />
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            {/* Main Preview/Editor Panel */}
            <ResizablePanel defaultSize={showElementTree || showStylePanel || showHistoryPanel ? 64 : 100} data-tour="designer-canvas">
              <ReactSandbox
                code={code}
                onCodeChange={handleCodeChange}
                showFileExplorer={false}
                showConsole={false}
                framework={framework}
                onAIEdit={() => setShowAIPanel(true)}
              />
            </ResizablePanel>

            {/* Style Panel */}
            {showStylePanel && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={22} minSize={18} maxSize={30}>
                  <div className="flex flex-col h-full border-l bg-background">
                    <div className="border-b px-3 py-2 flex items-center justify-between">
                      <h3 className="text-sm font-medium">Styles</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={toggleStylePanel}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <StylePanel className="flex-1 overflow-auto" />
                  </div>
                </ResizablePanel>
              </>
            )}

            {/* Version History Panel */}
            {showHistoryPanel && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={18} minSize={15} maxSize={25}>
                  <div className="flex flex-col h-full border-l bg-background">
                    <div className="border-b px-3 py-2 flex items-center justify-between">
                      <h3 className="text-sm font-medium">History</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={toggleHistoryPanel}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <VersionHistoryPanel className="flex-1 overflow-auto" />
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </DesignerDndProvider>
      </div>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Start with a pre-built template or create from scratch
            </DialogDescription>
          </DialogHeader>

          {/* Search and Filters Toolbar */}
          <div className="flex flex-col gap-3 pb-3 border-b">
            {/* Search and View Toggle */}
            <div className="flex items-center gap-2">
              <InputGroup className="flex-1">
                <InputGroupAddon align="inline-start">
                  <Search className="h-4 w-4" />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Search templates..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                />
                {templateSearch && (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      onClick={() => setTemplateSearch('')}
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </InputGroupButton>
                  </InputGroupAddon>
                )}
              </InputGroup>

              <div className="flex items-center border rounded-md">
                <Button
                  variant={templateViewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => setTemplateViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={templateViewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => setTemplateViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Framework and Category Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Framework selector */}
              {FRAMEWORK_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={framework === opt.value ? 'default' : 'outline'}
                  size="sm"
                  className="h-8"
                  onClick={() => setFramework(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}

              <Separator orientation="vertical" className="h-6 mx-1" />

              {/* Category Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    {categoryFilter === 'all' ? 'All Categories' : categoryFilter}
                    <ChevronDown className="ml-1.5 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setCategoryFilter('all')}>
                    <div className="flex items-center gap-2 flex-1">
                      <span>All Categories</span>
                    </div>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {categoryCounts.all}
                    </Badge>
                    {categoryFilter === 'all' && <Check className="h-4 w-4 ml-2" />}
                  </DropdownMenuItem>
                  {TEMPLATE_CATEGORIES.map((category) => (
                    <DropdownMenuItem
                      key={category}
                      onClick={() => setCategoryFilter(category)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span>{category}</span>
                      </div>
                      {categoryCounts[category] !== undefined && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {categoryCounts[category]}
                        </Badge>
                      )}
                      {categoryFilter === category && <Check className="h-4 w-4 ml-2" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear filters */}
              {(templateSearch || categoryFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setTemplateSearch('');
                    setCategoryFilter('all');
                  }}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              )}

              <div className="flex-1" />
              <span className="text-sm text-muted-foreground">
                {filteredTemplates.length} templates
              </span>
            </div>
          </div>

          {/* Templates Grid/List */}
          <ScrollArea className="flex-1 mt-4">
            <div className="px-1">
              {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Layers className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium text-lg mb-1">No templates found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try adjusting your search or filters
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTemplateSearch('');
                      setCategoryFilter('all');
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              ) : templateViewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <DesignerCard
                      key={template.id}
                      template={template}
                      variant="default"
                      onSelect={handleSelectTemplate}
                      showActions={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map((template) => (
                    <DesignerCard
                      key={template.id}
                      template={template}
                      variant="list"
                      onSelect={handleSelectTemplate}
                      showActions={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
