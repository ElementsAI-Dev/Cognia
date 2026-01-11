'use client';

/**
 * KnowledgeMapPanel - Main panel for viewing and managing knowledge maps
 * Integrates PDF-to-markdown, mind map visualization, and annotation features
 */

import { useCallback, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText,
  Map,
  Brain,
  Upload,
  Download,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  MoreVertical,
  Copy,
  Check,
  BookOpen,
  Layers,
  GitBranch,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useKnowledgeMap } from '@/hooks/academic/use-knowledge-map';
import { MindMapCanvas } from './mind-map-canvas';
import type { MindMapNode } from '@/types/learning/knowledge-map';

interface KnowledgeMapPanelProps {
  className?: string;
  paperId?: string;
  pdfPath?: string;
  onClose?: () => void;
}

export function KnowledgeMapPanel({
  className,
  paperId,
  pdfPath,
  onClose,
}: KnowledgeMapPanelProps) {
  const t = useTranslations('academic.knowledgeMap');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    knowledgeMaps,
    activeKnowledgeMap,
    isGenerating,
    generationProgress,
    error,
    canNavigateBack,
    canNavigateForward,
    createKnowledgeMap,
    deleteKnowledgeMap,
    setActiveKnowledgeMap,
    convertPDFToKnowledgeMap,
    navigateBack,
    navigateForward,
    navigateToLocation,
    importFromFile,
    exportToFile,
    clearError,
  } = useKnowledgeMap();

  const [activeTab, setActiveTab] = useState<'list' | 'traces' | 'mindmap' | 'markdown'>('traces');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [newMapTitle, setNewMapTitle] = useState('');
  const [newMapMode, setNewMapMode] = useState<'FAST' | 'DETAILED' | 'COMPREHENSIVE'>('DETAILED');
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredMaps = knowledgeMaps.filter(map =>
    map.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    map.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateFromPDF = useCallback(async () => {
    if (!pdfPath) return;

    try {
      await convertPDFToKnowledgeMap(pdfPath);
      setShowCreateDialog(false);
    } catch (err) {
      console.error('Failed to create knowledge map from PDF:', err);
    }
  }, [pdfPath, convertPDFToKnowledgeMap]);

  const handleCreateManual = useCallback(async () => {
    if (!newMapTitle.trim()) return;

    try {
      await createKnowledgeMap({
        title: newMapTitle,
        mode: newMapMode,
        paperId,
        pdfPath,
      });
      setShowCreateDialog(false);
      setNewMapTitle('');
    } catch (err) {
      console.error('Failed to create knowledge map:', err);
    }
  }, [newMapTitle, newMapMode, paperId, pdfPath, createKnowledgeMap]);

  const handleImportFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importFromFile(file);
    } catch (err) {
      console.error('Failed to import knowledge map:', err);
    }

    event.target.value = '';
  }, [importFromFile]);

  const handleExport = useCallback(() => {
    exportToFile();
  }, [exportToFile]);

  const handleCopyMermaid = useCallback(async () => {
    if (!activeKnowledgeMap?.mermaidDiagram) return;

    try {
      await navigator.clipboard.writeText(activeKnowledgeMap.mermaidDiagram);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [activeKnowledgeMap]);

  const handleNodeClick = useCallback((node: MindMapNode) => {
    if (node.locationRef && activeKnowledgeMap) {
      const trace = activeKnowledgeMap.traces.find(t =>
        t.locations.some(l => l.id === node.locationRef)
      );
      if (trace) {
        navigateToLocation(activeKnowledgeMap.id, trace.id, node.locationRef);
        setSelectedTraceId(trace.id);
      }
    }
  }, [activeKnowledgeMap, navigateToLocation]);

  const handleDelete = useCallback((id: string) => {
    deleteKnowledgeMap(id);
    setShowDeleteConfirm(null);
  }, [deleteKnowledgeMap]);

  const selectedTrace = activeKnowledgeMap?.traces.find(t => t.id === selectedTraceId);

  return (
    <div className={cn('flex flex-col h-full bg-background', className)} data-testid="knowledge-map-panel">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Map className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">{t('title')}</h2>
          {activeKnowledgeMap && (
            <Badge variant="secondary" data-testid="active-map-badge">{activeKnowledgeMap.title}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!canNavigateBack}
                  onClick={navigateBack}
                  aria-label="Navigate back"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('navigateBack')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!canNavigateForward}
                  onClick={navigateForward}
                  aria-label="Navigate forward"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('navigateForward')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t('create')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('createDialog.title')}</DialogTitle>
                <DialogDescription>{t('createDialog.description')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('createDialog.mapTitle')}</Label>
                  <Input
                    id="title"
                    value={newMapTitle}
                    onChange={(e) => setNewMapTitle(e.target.value)}
                    placeholder={t('createDialog.titlePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mode">{t('createDialog.mode')}</Label>
                  <Select value={newMapMode} onValueChange={(v) => setNewMapMode(v as typeof newMapMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FAST">{t('modes.fast')}</SelectItem>
                      <SelectItem value="DETAILED">{t('modes.detailed')}</SelectItem>
                      <SelectItem value="COMPREHENSIVE">{t('modes.comprehensive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {pdfPath && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleCreateFromPDF}
                    disabled={isGenerating}
                  >
                    <FileText className="h-4 w-4" />
                    {t('createDialog.fromPDF')}
                  </Button>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  {t('cancel')}
                </Button>
                <Button onClick={handleCreateManual} disabled={!newMapTitle.trim() || isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('generating')}
                    </>
                  ) : (
                    t('create')
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <input
            ref={fileInputRef}
            type="file"
            accept=".codemap,.json"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {t('import')}
          </Button>

          {activeKnowledgeMap && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              {t('export')}
            </Button>
          )}

          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Generation Progress */}
      {isGenerating && (
        <div className="px-4 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm">{t('generatingProgress')}</span>
            <Progress value={generationProgress} className="flex-1 h-2" />
            <span className="text-sm text-muted-foreground">{generationProgress}%</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              {t('dismiss')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Knowledge Map List */}
        <div className="w-64 border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchMaps')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredMaps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Map className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('noMaps')}</p>
                </div>
              ) : (
                filteredMaps.map((map) => (
                  <Card
                    key={map.id}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-accent',
                      activeKnowledgeMap?.id === map.id && 'border-primary bg-accent'
                    )}
                    onClick={() => setActiveKnowledgeMap(map.id)}
                  >
                    <CardHeader className="p-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-medium line-clamp-1">
                          {map.title}
                        </CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportToFile()}>
                              <Download className="h-4 w-4 mr-2" />
                              {t('export')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setShowDeleteConfirm(map.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardDescription className="text-xs line-clamp-2">
                        {map.traces.length} {t('traces')} • {map.metadata.mode}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeKnowledgeMap ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
              <div className="border-b px-4">
                <TabsList className="h-10">
                  <TabsTrigger value="traces" className="gap-2">
                    <GitBranch className="h-4 w-4" />
                    {t('tabs.traces')}
                  </TabsTrigger>
                  <TabsTrigger value="mindmap" className="gap-2">
                    <Brain className="h-4 w-4" />
                    {t('tabs.mindMap')}
                  </TabsTrigger>
                  <TabsTrigger value="markdown" className="gap-2">
                    <FileText className="h-4 w-4" />
                    {t('tabs.markdown')}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="traces" className="flex-1 overflow-hidden m-0">
                <div className="flex h-full">
                  {/* Trace List */}
                  <div className="w-72 border-r flex flex-col">
                    <div className="p-3 border-b font-medium text-sm">
                      {t('traceList')} ({activeKnowledgeMap.traces.length})
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-2 space-y-1" data-testid="trace-list">
                        {activeKnowledgeMap.traces.map((trace, index) => (
                          <div
                            key={trace.id}
                            data-testid="trace-item"
                            className={cn(
                              'p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent',
                              selectedTraceId === trace.id && 'bg-accent border-primary border'
                            )}
                            onClick={() => setSelectedTraceId(trace.id)}
                          >
                            <div className="flex items-start gap-2">
                              <Badge variant="outline" className="shrink-0">
                                {index + 1}
                              </Badge>
                              <div className="min-w-0">
                                <p className="text-sm font-medium line-clamp-2">{trace.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {trace.locations.length} {t('locations')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Trace Detail */}
                  <div className="flex-1 flex flex-col overflow-hidden" data-testid="trace-detail">
                    {selectedTrace ? (
                      <>
                        <div className="p-4 border-b">
                          <h3 className="font-semibold">{selectedTrace.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedTrace.description}
                          </p>
                        </div>
                        <ScrollArea className="flex-1">
                          <div className="p-4 space-y-4">
                            {/* Trace Text Diagram */}
                            {selectedTrace.traceTextDiagram && (
                              <div>
                                <h4 className="font-medium text-sm mb-2">{t('traceDiagram')}</h4>
                                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono">
                                  {selectedTrace.traceTextDiagram}
                                </pre>
                              </div>
                            )}

                            {/* Locations */}
                            <div>
                              <h4 className="font-medium text-sm mb-2">{t('locations')}</h4>
                              <div className="space-y-2">
                                {selectedTrace.locations.map((location) => (
                                  <Card key={location.id} className="p-3">
                                    <div className="flex items-start gap-3">
                                      <Badge variant="secondary" className="shrink-0">
                                        {location.id}
                                      </Badge>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm">{location.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {location.description}
                                        </p>
                                        {location.pageNumber && (
                                          <Badge variant="outline" className="mt-2 text-xs">
                                            {t('page')} {location.pageNumber}
                                          </Badge>
                                        )}
                                        {location.lineContent && (
                                          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                                            {location.lineContent}
                                          </pre>
                                        )}
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>

                            {/* Trace Guide */}
                            {selectedTrace.traceGuide && (
                              <div>
                                <h4 className="font-medium text-sm mb-2">{t('traceGuide')}</h4>
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <pre className="whitespace-pre-wrap text-sm">
                                    {selectedTrace.traceGuide}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>{t('selectTrace')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mindmap" className="flex-1 overflow-hidden m-0">
                {activeKnowledgeMap.mindMapData ? (
                  <MindMapCanvas
                    data={activeKnowledgeMap.mindMapData}
                    onNodeClick={handleNodeClick}
                    className="h-full"
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t('noMindMap')}</p>
                      <Button variant="outline" className="mt-4">
                        {t('generateMindMap')}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="markdown" className="flex-1 overflow-hidden m-0">
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between p-3 border-b">
                    <span className="text-sm font-medium">{t('mermaidDiagram')}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={handleCopyMermaid}
                      disabled={!activeKnowledgeMap.mermaidDiagram}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          {t('copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          {t('copy')}
                        </>
                      )}
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    <pre className="p-4 text-sm font-mono">
                      {activeKnowledgeMap.mermaidDiagram || t('noMermaidDiagram')}
                    </pre>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium text-lg mb-2">{t('noMapSelected')}</h3>
                <p className="text-sm mb-4">{t('selectOrCreate')}</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('createFirst')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirm.title')}</DialogTitle>
            <DialogDescription>{t('deleteConfirm.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
            >
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default KnowledgeMapPanel;
