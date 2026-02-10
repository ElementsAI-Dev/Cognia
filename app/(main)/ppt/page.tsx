'use client';

/**
 * PPT Page - Standalone PPT/Presentation editor and generator
 * Full-featured presentation creator with AI generation, editing, and export
 */

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Loader2,
  FileText,
  Presentation,
  Sparkles,
  Search,
  MoreVertical,
  Trash2,
  Copy,
  Play,
  Eye,
  Download,
  Edit,
  SortAsc,
  Calendar,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PPTEditor,
  PPTGenerationDialog,
  PPTQuickAction,
  PPTPreview,
  SlideshowView,
  SlideContent,
} from '@/components/ppt';
import { usePPTGeneration, type PPTGenerationConfig } from '@/hooks/ppt';
import { useWorkflowStore, selectActivePresentation, usePPTEditorStore } from '@/stores';
import type { PPTPresentation } from '@/types/workflow';
import { cn } from '@/lib/utils';
import { executePPTExport } from '@/lib/ai/tools/ppt-tool';
import { downloadPPTX, exportToPPTXBase64 } from '@/lib/export/document/pptx-export';

type SortOption = 'newest' | 'oldest' | 'name' | 'slides';

function PPTPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('pptGenerator');
  
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const [selectedPresentationId, setSelectedPresentationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [presentationToDelete, setPresentationToDelete] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewPresentation, setPreviewPresentation] = useState<PPTPresentation | null>(null);
  const [slideshowMode, setSlideshowMode] = useState(false);
  const [slideshowPresentation, setSlideshowPresentation] = useState<PPTPresentation | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  
  // PPT generation hook
  const { generate, isGenerating } = usePPTGeneration();
  
  // Get presentations from workflow store
  const presentations = useWorkflowStore((state) => state.presentations);
  const setActivePresentation = useWorkflowStore((state) => state.setActivePresentation);
  const deletePresentation = useWorkflowStore((state) => state.deletePresentation);
  const activePresentation = useWorkflowStore(selectActivePresentation);
  
  // PPT editor store
  const loadPresentation = usePPTEditorStore((state) => state.loadPresentation);
  const clearPresentation = usePPTEditorStore((state) => state.clearPresentation);
  const presentation = usePPTEditorStore((state) => state.presentation);
  
  // Get presentation ID from URL
  const presentationIdFromUrl = searchParams.get('id');
  
  // Presentation list with search and sort
  const presentationList = useMemo(() => {
    let list = Object.values(presentations);
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.subtitle?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'newest':
        list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'oldest':
        list.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
        break;
      case 'name':
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'slides':
        list.sort((a, b) => b.slides.length - a.slides.length);
        break;
    }
    
    return list;
  }, [presentations, searchQuery, sortBy]);
  
  // Load presentation from URL or selected
  useEffect(() => {
    const id = presentationIdFromUrl || selectedPresentationId;
    if (id && presentations[id]) {
      loadPresentation(presentations[id]);
      setActivePresentation(id);
    }
  }, [presentationIdFromUrl, selectedPresentationId, presentations, loadPresentation, setActivePresentation]);

  // Use activePresentation from workflow store for synced metadata display
  const activeTitle = activePresentation?.title || presentation?.title;
  
  // Handle new presentation
  const handleNewPresentation = useCallback(() => {
    setShowGenerationDialog(true);
  }, []);
  
  // Handle select presentation
  const handleSelectPresentation = useCallback((id: string) => {
    setSelectedPresentationId(id);
    router.push(`/ppt?id=${id}`);
  }, [router]);
  
  // Handle generation complete
  const handleGenerationComplete = useCallback((id: string) => {
    setShowGenerationDialog(false);
    router.push(`/ppt?id=${id}`);
  }, [router]);
  
  // Handle generate from dialog
  const handleGenerate = useCallback(async (config: PPTGenerationConfig) => {
    const result = await generate(config);
    if (result) {
      setShowGenerationDialog(false);
      router.push(`/ppt?id=${result.id}`);
    }
  }, [generate, router]);
  
  // Handle delete presentation with confirmation
  const handleDeletePresentation = useCallback((id: string) => {
    setPresentationToDelete(id);
    setDeleteDialogOpen(true);
  }, []);
  
  const confirmDeletePresentation = useCallback(() => {
    if (presentationToDelete) {
      deletePresentation(presentationToDelete);
      if (selectedPresentationId === presentationToDelete) {
        setSelectedPresentationId(null);
        clearPresentation();
        router.push('/ppt');
      }
      setPresentationToDelete(null);
    }
    setDeleteDialogOpen(false);
  }, [deletePresentation, presentationToDelete, selectedPresentationId, router, clearPresentation]);
  
  // Handle duplicate presentation
  const handleDuplicatePresentation = useCallback((pres: PPTPresentation) => {
    const duplicated: PPTPresentation = {
      ...JSON.parse(JSON.stringify(pres)),
      id: `ppt-${Date.now()}`,
      title: `${pres.title} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    useWorkflowStore.getState().addPresentation(duplicated);
  }, []);
  
  // Handle preview presentation
  const handlePreviewPresentation = useCallback((pres: PPTPresentation) => {
    setPreviewPresentation(pres);
    setPreviewDialogOpen(true);
  }, []);
  
  // Handle start slideshow
  const handleStartSlideshow = useCallback((pres: PPTPresentation) => {
    setSlideshowPresentation(pres);
    setCurrentSlideIndex(0);
    setSlideshowMode(true);
  }, []);
  
  // Handle exit slideshow
  const handleExitSlideshow = useCallback(() => {
    setSlideshowMode(false);
    setSlideshowPresentation(null);
  }, []);
  
  // Handle save
  const handleSave = useCallback((saved: PPTPresentation) => {
    useWorkflowStore.getState().updatePresentation(saved.id, saved);
  }, []);
  
  // Handle export with actual implementation
  const handleExport = useCallback(async (format: string, pres?: PPTPresentation) => {
    const targetPresentation = pres || presentation;
    if (!targetPresentation) return;
    
    setIsExporting(true);
    try {
      // For PPTX format, use real pptxgenjs to generate native .pptx file
      if (format === 'pptx') {
        const pptxResult = await downloadPPTX(targetPresentation, {
          includeNotes: true,
          includeSlideNumbers: true,
          author: targetPresentation.author || 'Cognia',
          quality: 'high',
        });
        if (!pptxResult.success) {
          console.error('PPTX export failed:', pptxResult.error);
        }
        return;
      }

      const result = executePPTExport({
        presentation: targetPresentation,
        format: format as 'marp' | 'html' | 'reveal' | 'pdf',
        includeNotes: true,
        includeAnimations: false,
        quality: 'high',
      });
      
      if (!result.success || !result.data) {
        console.error('Export failed:', result.error);
        return;
      }
      
      const { content, filename } = result.data as { content: string; filename: string };
      
      // For PDF, open print-ready HTML in new window
      if (format === 'pdf') {
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      }
      
      // For other formats, direct download
      const mimeType = format === 'marp' ? 'text/markdown' : 'text/html';
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [presentation]);
  
  // Slideshow mode - fullscreen presentation
  if (slideshowMode && slideshowPresentation) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <SlideshowView
          presentation={slideshowPresentation}
          currentIndex={currentSlideIndex}
          onPrev={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
          onNext={() => setCurrentSlideIndex((prev) => Math.min(slideshowPresentation.slides.length - 1, prev + 1))}
          onGoToSlide={setCurrentSlideIndex}
          onExit={handleExitSlideshow}
        />
      </div>
    );
  }
  
  // If we have a presentation loaded, show the editor
  if (presentation) {
    return (
      <div className="flex flex-col h-screen">
        <header className="flex items-center gap-4 px-4 py-2 border-b bg-background">
          <Link href="/ppt" onClick={() => { clearPresentation(); setActivePresentation(null); }}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Presentation className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">{activeTitle || presentation.title}</h1>
          </div>
          <Badge variant="secondary" className="ml-2">
            {presentation.slides.length} {t('slides') || 'slides'}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const result = await exportToPPTXBase64(presentation);
                if (result.success && result.base64) {
                  await navigator.clipboard.writeText(result.base64);
                }
              }}
            >
              <Copy className="h-4 w-4 mr-1" />
              {t('copyBase64') || 'Copy Base64'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStartSlideshow(presentation)}
            >
              <Play className="h-4 w-4 mr-1" />
              {t('present') || 'Present'}
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          <PPTEditor
            presentation={presentation}
            onSave={handleSave}
            onExport={(format) => handleExport(format)}
            className="h-full"
          />
        </main>
      </div>
    );
  }
  
  // Otherwise show the presentation list / creation UI
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Presentation className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">{t('title') || 'Presentations'}</h1>
          </div>
          {presentationList.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {presentationList.length} {presentationList.length === 1 ? 'presentation' : 'presentations'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search') || 'Search presentations...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-36">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('sortNewest') || 'Newest'}
                </span>
              </SelectItem>
              <SelectItem value="oldest">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('sortOldest') || 'Oldest'}
                </span>
              </SelectItem>
              <SelectItem value="name">
                <span className="flex items-center gap-2">
                  <SortAsc className="h-4 w-4" />
                  {t('sortName') || 'Name'}
                </span>
              </SelectItem>
              <SelectItem value="slides">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('sortSlides') || 'Slides'}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <PPTQuickAction
            variant="button"
            onGenerationComplete={handleGenerationComplete}
          />
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">
            {presentationList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Presentation className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold mb-2">
                  {t('emptyState') || 'No presentations yet'}
                </h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-md">
                  {t('emptyStateDesc') || 'Create your first AI-powered presentation to get started.'}
                </p>
                <Button onClick={handleNewPresentation} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  {t('createNew') || 'Create New Presentation'}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* New presentation card */}
                <Card
                  className="cursor-pointer hover:border-primary/50 transition-colors border-dashed"
                  onClick={handleNewPresentation}
                >
                  <CardContent className="flex flex-col items-center justify-center h-48 gap-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{t('createNew') || 'Create New'}</span>
                  </CardContent>
                </Card>
                
                {/* Existing presentations */}
                {presentationList.map((pres) => (
                  <Card
                    key={pres.id}
                    className={cn(
                      'cursor-pointer hover:border-primary/50 transition-colors group relative',
                      selectedPresentationId === pres.id && 'border-primary'
                    )}
                  >
                    {/* Context menu */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleSelectPresentation(pres.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t('edit') || 'Edit'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePreviewPresentation(pres)}>
                            <Eye className="h-4 w-4 mr-2" />
                            {t('preview') || 'Preview'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStartSlideshow(pres)}>
                            <Play className="h-4 w-4 mr-2" />
                            {t('present') || 'Present'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDuplicatePresentation(pres)}>
                            <Copy className="h-4 w-4 mr-2" />
                            {t('duplicate') || 'Duplicate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="flex items-center w-full">
                                <Download className="h-4 w-4 mr-2" />
                                {t('export') || 'Export'}
                              </DropdownMenuTrigger>
                              <DropdownMenuContent side="right">
                                <DropdownMenuItem onClick={() => handleExport('pptx', pres)}>
                                  � PowerPoint (.pptx)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('pdf', pres)}>
                                  📄 PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('html', pres)}>
                                  🌐 HTML
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('reveal', pres)}>
                                  🎭 Reveal.js
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('marp', pres)}>
                                  � Marp
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeletePresentation(pres.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('delete') || 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div onClick={() => handleSelectPresentation(pres.id)}>
                      {/* First slide thumbnail preview */}
                      {pres.slides[0] && pres.theme && (
                        <div className="aspect-video bg-muted rounded-t-lg overflow-hidden border-b">
                          <SlideContent
                            slide={pres.slides[0]}
                            theme={pres.theme}
                            size="small"
                          />
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base truncate pr-8">{pres.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(pres.updatedAt).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>{pres.slides.length} {t('slides') || 'slides'}</span>
                        </div>
                        {pres.theme && (
                          <div className="flex items-center gap-2 mt-2">
                            <div
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: pres.theme.primaryColor }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {pres.theme.name}
                            </span>
                          </div>
                        )}
                        {/* Quick actions on hover */}
                        <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewPresentation(pres);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {t('preview') || 'Preview'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartSlideshow(pres);
                            }}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            {t('present') || 'Present'}
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </main>
      
      {/* Generation Dialog */}
      <PPTGenerationDialog
        open={showGenerationDialog}
        onOpenChange={setShowGenerationDialog}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle') || 'Delete Presentation?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmDesc') || 'This action cannot be undone. The presentation will be permanently deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePresentation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-5xl h-[85vh] p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{previewPresentation?.title || 'Preview'}</DialogTitle>
          </DialogHeader>
          {previewPresentation && (
            <PPTPreview
              presentation={previewPresentation}
              onEdit={(_slideIndex) => {
                setPreviewDialogOpen(false);
                handleSelectPresentation(previewPresentation.id);
              }}
              onOpenEditor={(pres) => {
                setPreviewDialogOpen(false);
                handleSelectPresentation(pres.id);
              }}
              onExport={(format) => handleExport(format, previewPresentation)}
              onThemeChange={() => {
                // Theme change in preview is read-only
              }}
              className="h-full"
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Export loading indicator */}
      {isExporting && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-background p-6 rounded-lg flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>{t('exporting') || 'Exporting...'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PPTPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <PPTPageContent />
    </Suspense>
  );
}
