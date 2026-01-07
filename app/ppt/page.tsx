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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  PPTEditor,
  PPTGenerationDialog,
  PPTQuickAction,
} from '@/components/ppt';
import { usePPTGeneration, type PPTGenerationConfig } from '@/hooks/ppt';
import { useWorkflowStore, usePPTEditorStore } from '@/stores';
import type { PPTPresentation } from '@/types/workflow';
import { cn } from '@/lib/utils';

function PPTPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('pptGenerator');
  
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const [selectedPresentationId, setSelectedPresentationId] = useState<string | null>(null);
  
  // PPT generation hook
  const { generate, isGenerating } = usePPTGeneration();
  
  // Get presentations from workflow store
  const presentations = useWorkflowStore((state) => state.presentations);
  const setActivePresentation = useWorkflowStore((state) => state.setActivePresentation);
  const deletePresentation = useWorkflowStore((state) => state.deletePresentation);
  
  // PPT editor store
  const loadPresentation = usePPTEditorStore((state) => state.loadPresentation);
  const presentation = usePPTEditorStore((state) => state.presentation);
  
  // Get presentation ID from URL
  const presentationIdFromUrl = searchParams.get('id');
  
  // Presentation list as array
  const presentationList = useMemo(() => {
    return Object.values(presentations).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [presentations]);
  
  // Load presentation from URL or selected
  useEffect(() => {
    const id = presentationIdFromUrl || selectedPresentationId;
    if (id && presentations[id]) {
      loadPresentation(presentations[id]);
      setActivePresentation(id);
    }
  }, [presentationIdFromUrl, selectedPresentationId, presentations, loadPresentation, setActivePresentation]);
  
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
  
  // Handle delete presentation (reserved for context menu or delete button)
  const _handleDeletePresentation = useCallback((id: string) => {
    deletePresentation(id);
    if (selectedPresentationId === id) {
      setSelectedPresentationId(null);
      router.push('/ppt');
    }
  }, [deletePresentation, selectedPresentationId, router]);
  
  // Handle save
  const handleSave = useCallback((saved: PPTPresentation) => {
    useWorkflowStore.getState().updatePresentation(saved.id, saved);
  }, []);
  
  // Handle export
  const handleExport = useCallback((format: string) => {
    console.log('Exporting presentation as:', format);
    // Export is handled within PPTEditor component
  }, []);
  
  // If we have a presentation loaded, show the editor
  if (presentation) {
    return (
      <div className="flex flex-col h-screen">
        <header className="flex items-center gap-4 px-4 py-2 border-b bg-background">
          <Link href="/ppt">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Presentation className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">{presentation.title}</h1>
          </div>
          <Badge variant="secondary" className="ml-2">
            {presentation.slides.length} {t('slides') || 'slides'}
          </Badge>
        </header>
        <main className="flex-1 overflow-hidden">
          <PPTEditor
            presentation={presentation}
            onSave={handleSave}
            onExport={handleExport}
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
        </div>
        <div className="flex items-center gap-2">
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
                      'cursor-pointer hover:border-primary/50 transition-colors',
                      selectedPresentationId === pres.id && 'border-primary'
                    )}
                    onClick={() => handleSelectPresentation(pres.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base truncate">{pres.title}</CardTitle>
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
                    </CardContent>
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
