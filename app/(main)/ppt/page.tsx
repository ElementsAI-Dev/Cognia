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
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  PPTCreationHub,
  PPTPreview,
  SlideshowView,
  SlideContent,
  PPTTemplateGallery,
  PPTCreationForm,
} from '@/components/ppt';
import type { CreationMode } from '@/components/ppt';
import { usePPTGeneration } from '@/hooks/ppt';
import type { PPTGenerationConfig, PPTMaterialGenerationConfig } from '@/hooks/ppt/use-ppt-generation';
import type { WorkflowTemplate } from '@/types/workflow';
import { useWorkflowStore, selectActivePresentation, usePPTEditorStore } from '@/stores';
import type { PPTPresentation } from '@/types/workflow';
import { cn } from '@/lib/utils';
import { loggers } from '@/lib/logger';
import { exportToPPTXBase64 } from '@/lib/export/document/pptx-export';
import { exportPresentationClient, type PPTClientExportFormat } from '@/lib/ppt/ppt-export-client';
import { PPT_TEST_IDS } from '@/lib/ppt/test-selectors';
import { toast } from 'sonner';

type SortOption = 'newest' | 'oldest' | 'name' | 'slides';

function PPTPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('pptGenerator');
  
  const [showCreationHub, setShowCreationHub] = useState(false);
  const [creationMode, setCreationMode] = useState<CreationMode>('generate');
  const [creationInitialTopic, setCreationInitialTopic] = useState('');
  const [_viewMode, _setViewMode] = useState<'grid' | 'list'>('grid');
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
  const [exportError, setExportError] = useState<{
    message: string;
    format: PPTClientExportFormat;
    presentationId: string;
  } | null>(null);
  
  // PPT generation hook for inline creation flow
  const {
    generate: inlineGenerate,
    generateFromMaterials: inlineGenerateFromMaterials,
    isGenerating: inlineIsGenerating,
    progress: inlineProgress,
    error: inlineError,
    retry: inlineRetry,
    canRetry: inlineCanRetry,
  } = usePPTGeneration();

  // Inline creation state
  const [showInlineCreation, setShowInlineCreation] = useState(false);
  const [heroTopic, setHeroTopic] = useState('');
  
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
    if (!id) {
      return;
    }

    const targetPresentation = presentations[id];
    if (!targetPresentation) {
      return;
    }

    if (presentation?.id !== id) {
      loadPresentation(targetPresentation);
    }

    if (activePresentation?.id !== id) {
      setActivePresentation(id);
    }
  }, [
    presentationIdFromUrl,
    selectedPresentationId,
    presentations,
    presentation?.id,
    activePresentation?.id,
    loadPresentation,
    setActivePresentation,
  ]);

  // Use activePresentation from workflow store for synced metadata display
  const activeTitle = activePresentation?.title || presentation?.title;

  const openPresentation = useCallback((id: string) => {
    setSelectedPresentationId(id);
    setActivePresentation(id);
    router.push(`/ppt?id=${id}`);
  }, [setActivePresentation, router]);
  
  // Handle new presentation
  const handleNewPresentation = useCallback((mode: CreationMode = 'generate', initialTopic = '') => {
    setCreationMode(mode);
    setCreationInitialTopic(initialTopic);
    setShowCreationHub(true);
  }, []);
  
  // Handle select presentation
  const handleSelectPresentation = useCallback((id: string) => {
    openPresentation(id);
  }, [openPresentation]);
  
  // Handle generation complete
  const handleGenerationComplete = useCallback((id: string) => {
    setShowCreationHub(false);
    openPresentation(id);
  }, [openPresentation]);
  
  // Handle template selection
  const handleTemplateSelect = useCallback((template: WorkflowTemplate) => {
    const topic = typeof template.presetInputs?.topic === 'string'
      ? template.presetInputs.topic
      : template.name;
    handleNewPresentation('generate', topic);
  }, [handleNewPresentation]);

  // Quick suggestion chips
  const QUICK_SUGGESTIONS = useMemo(() => [
    t('quickSuggestion1'),
    t('quickSuggestion2'),
    t('quickSuggestion3'),
    t('quickSuggestion4'),
    t('quickSuggestion5'),
    t('quickSuggestion6'),
  ], [t]);

  // Inline generation handlers
  const handleInlineGenerate = useCallback(async (config: PPTGenerationConfig) => {
    const result = await inlineGenerate(config);
    if (result) {
      setShowInlineCreation(false);
      setHeroTopic('');
      openPresentation(result.id);
    }
  }, [inlineGenerate, openPresentation]);

  const handleInlineGenerateFromMaterials = useCallback(async (config: PPTMaterialGenerationConfig) => {
    const result = await inlineGenerateFromMaterials(config);
    if (result) {
      setShowInlineCreation(false);
      setHeroTopic('');
      openPresentation(result.id);
    }
  }, [inlineGenerateFromMaterials, openPresentation]);

  // Handle hero quick generate
  const handleHeroGenerate = useCallback(() => {
    if (!heroTopic.trim()) return;
    setShowInlineCreation(true);
  }, [heroTopic]);

  // Handle suggestion chip click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setHeroTopic(suggestion);
    setShowInlineCreation(true);
  }, []);
  
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
    if (!pres.slides || pres.slides.length === 0) {
      toast.error(t('invalidPresentationState'));
      return;
    }
    setPreviewPresentation(pres);
    setPreviewDialogOpen(true);
  }, [t]);
  
  // Handle start slideshow
  const handleStartSlideshow = useCallback((pres: PPTPresentation) => {
    if (!pres.slides || pres.slides.length === 0) {
      toast.error(t('invalidPresentationState'));
      return;
    }
    setSlideshowPresentation(pres);
    setCurrentSlideIndex(0);
    setSlideshowMode(true);
  }, [t]);
  
  // Handle exit slideshow
  const handleExitSlideshow = useCallback(() => {
    setSlideshowMode(false);
    setSlideshowPresentation(null);
  }, []);
  
  // Handle save
  const handleSave = useCallback((saved: PPTPresentation) => {
    useWorkflowStore.getState().updatePresentation(saved.id, saved);
    if (previewPresentation?.id === saved.id) {
      setPreviewPresentation(saved);
    }
  }, [previewPresentation]);
  
  // Handle export with unified client-side pipeline
  const handleExport = useCallback(async (format: string, pres?: PPTPresentation) => {
    const targetPresentation = pres || presentation;
    if (!targetPresentation) return;

    const normalizedFormat = format as PPTClientExportFormat;
    setIsExporting(true);
    setExportError(null);
    try {
      const result = await exportPresentationClient(targetPresentation, normalizedFormat, {
        includeNotes: true,
        includeAnimations: false,
        quality: 'high',
      });

      if (!result.success) {
        setExportError({
          message: result.error?.message || t('exportFailed'),
          format: normalizedFormat,
          presentationId: targetPresentation.id,
        });
        loggers.ui.error('Export failed:', undefined, { error: result.error });
      }
    } catch (error) {
      setExportError({
        message: error instanceof Error ? error.message : t('exportFailed'),
        format: normalizedFormat,
        presentationId: targetPresentation.id,
      });
      loggers.ui.error('Export error:', error instanceof Error ? error : undefined, { raw: error });
    } finally {
      setIsExporting(false);
    }
  }, [presentation, t]);
  
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
      <header className="flex items-center justify-between px-6 py-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Presentation className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">{t('title')}</h1>
          </div>
          {presentationList.length > 0 && (
            <Badge variant="outline">{presentationList.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {presentationList.length > 0 && (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('search')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-56" />
                {searchQuery && (
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-32">
                  <SortAsc className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest"><span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />{t('sortNewest')}</span></SelectItem>
                  <SelectItem value="oldest"><span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />{t('sortOldest')}</span></SelectItem>
                  <SelectItem value="name"><span className="flex items-center gap-2"><SortAsc className="h-3.5 w-3.5" />{t('sortName')}</span></SelectItem>
                  <SelectItem value="slides"><span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" />{t('sortSlides')}</span></SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          <Button
            onClick={() => handleNewPresentation()}
            className="gap-2"
            data-testid={PPT_TEST_IDS.page.newPresentationButton}
          >
            <Sparkles className="h-4 w-4" />
            {t('newPresentation')}
          </Button>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {presentationList.length === 0 ? (
            <div className="flex flex-col items-center">
              {/* Hero Section with gradient background */}
              <div className="relative w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 pointer-events-none" />
                <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--primary) / 0.15), transparent)' }} />
                <div className="relative flex flex-col items-center text-center px-6 pt-16 pb-10">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 animate-in fade-in-0 zoom-in-95 duration-500">
                    <Presentation className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
                    {t('heroTitle')}
                  </h2>
                  <p className="text-muted-foreground text-base sm:text-lg mt-3 max-w-lg animate-in fade-in-0 slide-in-from-bottom-3 duration-500" style={{ animationDelay: '75ms', animationFillMode: 'backwards' }}>
                    {t('heroSubtitle')}
                  </p>

                  {/* Hero prompt input */}
                  <div className="max-w-2xl w-full mt-8 animate-in fade-in-0 slide-in-from-bottom-3 duration-500" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
                    <div className="relative">
                      <Textarea
                        placeholder={t('heroPlaceholder')}
                        value={heroTopic}
                        onChange={(e) => setHeroTopic(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleHeroGenerate(); } }}
                        rows={2}
                        className="text-base pr-28 resize-none rounded-xl border-border/60 shadow-sm focus:shadow-md transition-shadow"
                      />
                      <Button
                        size="sm"
                        className="absolute right-2 bottom-2 gap-1.5 shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
                        onClick={handleHeroGenerate}
                        disabled={!heroTopic.trim()}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {t('generate')}
                      </Button>
                    </div>
                    {/* Quick suggestion chips */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                      <span className="text-xs text-muted-foreground">{t('orTryOne')}:</span>
                      {QUICK_SUGGESTIONS.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={cn(
                            'rounded-full border border-border/60 px-3 py-1 text-xs',
                            'hover:bg-accent/60 hover:border-border hover:shadow-sm',
                            'transition-all duration-200 cursor-pointer',
                            'animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
                          )}
                          style={{ animationDelay: `${250 + i * 50}ms`, animationFillMode: 'backwards' }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inline creation form (shown when user triggers generation) */}
              {showInlineCreation && (
                <div className="w-full max-w-2xl px-6 pb-8 animate-in fade-in-0 slide-in-from-bottom-3 duration-300">
                  <Card className="p-6">
                    <PPTCreationForm
                      initialMode="generate"
                      initialTopic={heroTopic}
                      isGenerating={inlineIsGenerating}
                      progress={inlineProgress}
                      error={inlineError}
                      canRetry={inlineCanRetry}
                      onRetry={inlineRetry}
                      onGenerate={handleInlineGenerate}
                      onGenerateFromMaterials={handleInlineGenerateFromMaterials}
                    />
                  </Card>
                </div>
              )}

              {/* Three-mode creation cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full px-6 mb-8 animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
                <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center" onClick={() => handleNewPresentation('generate')}>
                  <CardContent className="flex flex-col items-center gap-2 py-6">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{t('createFromTopic')}</span>
                    <span className="text-xs text-muted-foreground">{t('modeGenerateDesc')}</span>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center" onClick={() => handleNewPresentation('import')}>
                  <CardContent className="flex flex-col items-center gap-2 py-6">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/15 to-blue-500/5 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                    <span className="text-sm font-medium">{t('createFromImport')}</span>
                    <span className="text-xs text-muted-foreground">{t('modeImportDesc')}</span>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center" onClick={() => handleNewPresentation('paste')}>
                  <CardContent className="flex flex-col items-center gap-2 py-6">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500/15 to-green-500/5 flex items-center justify-center">
                      <Edit className="h-5 w-5 text-green-500" />
                    </div>
                    <span className="text-sm font-medium">{t('createFromPaste')}</span>
                    <span className="text-xs text-muted-foreground">{t('modePasteDesc')}</span>
                  </CardContent>
                </Card>
              </div>

              {/* Feature highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl w-full px-6 mb-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
                {[
                  { icon: <Sparkles className="h-5 w-5 text-primary" />, title: t('featureAI'), desc: t('featureAIDesc') },
                  { icon: <Download className="h-5 w-5 text-primary" />, title: t('featureExport'), desc: t('featureExportDesc') },
                  { icon: <Palette className="h-5 w-5 text-primary" />, title: t('featureThemes'), desc: t('featureThemesDesc') },
                  { icon: <Presentation className="h-5 w-5 text-primary" />, title: t('featurePresent'), desc: t('featurePresentDesc') },
                ].map((feat, i) => (
                  <div key={i} className="flex flex-col items-center p-4 rounded-lg bg-muted/30 text-center">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">{feat.icon}</div>
                    <span className="text-sm font-medium">{feat.title}</span>
                    <span className="text-xs text-muted-foreground mt-1">{feat.desc}</span>
                  </div>
                ))}
              </div>

              {/* Template gallery */}
              <div className="max-w-3xl w-full px-6 pb-12 text-left animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
                <h3 className="text-sm font-semibold mb-3">{t('fromTemplate')}</h3>
                <PPTTemplateGallery onSelect={handleTemplateSelect} />
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Featured card — latest presentation */}
              {presentationList[0] && (
                <Card
                  className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                  onClick={() => handleSelectPresentation(presentationList[0].id)}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-0">
                    {presentationList[0].slides[0] && presentationList[0].theme && (
                      <div className="aspect-video bg-muted overflow-hidden border-b sm:border-b-0 sm:border-r">
                        <SlideContent slide={presentationList[0].slides[0]} theme={presentationList[0].theme} size="medium" />
                      </div>
                    )}
                    <div className="p-5 flex flex-col justify-between">
                      <div>
                        <Badge variant="secondary" className="mb-2 text-xs">{t('recentlyEdited')}</Badge>
                        <CardTitle className="text-lg">{presentationList[0].title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {presentationList[0].slides.length} {t('slides')} &middot; {new Date(presentationList[0].updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSelectPresentation(presentationList[0].id); }}>
                          <Edit className="h-3.5 w-3.5 mr-1" /> {t('edit')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleStartSlideshow(presentationList[0]); }}>
                          <Play className="h-3.5 w-3.5 mr-1" /> {t('present')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Grid of remaining presentations */}
              {presentationList.length > 1 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">{t('allPresentations')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {presentationList.slice(1).map((pres, index) => (
                      <Card
                        key={pres.id}
                        className={cn(
                          'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative',
                          'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
                          selectedPresentationId === pres.id && 'border-primary'
                        )}
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                      >
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleSelectPresentation(pres.id)}>
                                <Edit className="h-4 w-4 mr-2" /> {t('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePreviewPresentation(pres)}>
                                <Eye className="h-4 w-4 mr-2" /> {t('preview')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStartSlideshow(pres)}>
                                <Play className="h-4 w-4 mr-2" /> {t('present')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDuplicatePresentation(pres)}>
                                <Copy className="h-4 w-4 mr-2" /> {t('duplicate')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExport('pptx', pres)}>
                                <Download className="h-4 w-4 mr-2" /> {t('export')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeletePresentation(pres.id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> {t('delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div onClick={() => handleSelectPresentation(pres.id)}>
                          {pres.slides[0] && pres.theme && (
                            <div className="aspect-video bg-muted rounded-t-lg overflow-hidden border-b">
                              <SlideContent slide={pres.slides[0]} theme={pres.theme} size="small" />
                            </div>
                          )}
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base truncate pr-8">{pres.title}</CardTitle>
                            <CardDescription className="text-xs">{new Date(pres.updatedAt).toLocaleDateString()}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              <span>{pres.slides.length} {t('slides')}</span>
                            </div>
                            {pres.theme && (
                              <div className="flex items-center gap-2 mt-2">
                                <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: pres.theme.primaryColor }} />
                                <span className="text-xs text-muted-foreground">{pres.theme.name}</span>
                              </div>
                            )}
                            <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handlePreviewPresentation(pres); }}>
                                <Eye className="h-3 w-3 mr-1" /> {t('preview')}
                              </Button>
                              <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleStartSlideshow(pres); }}>
                                <Play className="h-3 w-3 mr-1" /> {t('present')}
                              </Button>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </main>
      
      {/* Creation Hub Dialog */}
      <PPTCreationHub
        open={showCreationHub}
        onOpenChange={setShowCreationHub}
        initialMode={creationMode}
        initialTopic={creationInitialTopic}
        onCreated={handleGenerationComplete}
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
      {exportError && (
        <div className="fixed bottom-4 right-4 z-50 w-[340px] rounded-lg border bg-background p-3 shadow-lg">
          <div className="text-sm text-destructive">{exportError.message}</div>
          <div className="mt-2 flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const target = presentations[exportError.presentationId];
                if (target) {
                  void handleExport(exportError.format, target);
                }
              }}
            >
              {t('retry') || 'Retry'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExportError(null)}>
              {t('dismiss') || 'Dismiss'}
            </Button>
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
