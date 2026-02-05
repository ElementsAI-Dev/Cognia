'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { Presentation } from 'lucide-react';
import { PPTGenerationDialog, type PPTGenerationConfig } from './ppt-generation-dialog';
import { PPTOutlinePreview, type PPTOutline } from './ppt-outline-preview';
import { usePPTGeneration, type PPTOutlineData } from '@/hooks/ppt';
import { useRouter } from 'next/navigation';

export interface PPTQuickActionProps {
  initialTopic?: string;
  variant?: 'icon' | 'button' | 'menu-item';
  /** Use two-stage flow (outline preview first) */
  useTwoStageFlow?: boolean;
  onGenerationStart?: () => void;
  onGenerationComplete?: (presentationId: string) => void;
  onGenerationError?: (error: string) => void;
  className?: string;
}

/**
 * PPTQuickAction - Quick action button/entry point for PPT generation
 * Can be used in chat input, toolbar, or sidebar
 * Supports both single-stage and two-stage (outline preview) flows
 */
export function PPTQuickAction({
  initialTopic = '',
  variant = 'icon',
  useTwoStageFlow = true,
  onGenerationStart,
  onGenerationComplete,
  onGenerationError,
  className,
}: PPTQuickActionProps) {
  const t = useTranslations('pptGenerator');
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [outlinePreviewOpen, setOutlinePreviewOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<PPTGenerationConfig | null>(null);
  const [currentOutline, setCurrentOutline] = useState<PPTOutlineData | null>(null);
  
  const {
    isGenerating,
    progress,
    generate,
    generateOutline,
    generateFromOutline,
    error,
  } = usePPTGeneration();

  // Single-stage generation (direct full generation)
  const handleDirectGenerate = useCallback(async (config: PPTGenerationConfig) => {
    onGenerationStart?.();
    setCurrentConfig(config);
    
    const result = await generate(config);
    
    if (result) {
      onGenerationComplete?.(result.id);
      setDialogOpen(false);
      router.push(`/ppt?id=${result.id}`);
    } else {
      onGenerationError?.(error || 'Generation failed');
    }
  }, [generate, error, onGenerationStart, onGenerationComplete, onGenerationError, router]);

  // Two-stage: Step 1 - Generate outline first
  const handleGenerateOutline = useCallback(async (config: PPTGenerationConfig) => {
    onGenerationStart?.();
    setCurrentConfig(config);
    
    const outlineData = await generateOutline(config);
    
    if (outlineData) {
      setCurrentOutline(outlineData);
      setDialogOpen(false);
      setOutlinePreviewOpen(true);
    } else {
      onGenerationError?.(error || 'Outline generation failed');
    }
  }, [generateOutline, error, onGenerationStart, onGenerationError]);

  // Two-stage: Step 2 - Generate full content from outline
  const handleStartFullGeneration = useCallback(async () => {
    if (!currentConfig || !currentOutline) return;
    
    const result = await generateFromOutline(currentConfig, currentOutline);
    
    if (result) {
      onGenerationComplete?.(result.id);
      setOutlinePreviewOpen(false);
      setCurrentOutline(null);
      setCurrentConfig(null);
      router.push(`/ppt?id=${result.id}`);
    } else {
      onGenerationError?.(error || 'Generation failed');
    }
  }, [currentConfig, currentOutline, generateFromOutline, error, onGenerationComplete, onGenerationError, router]);

  // Regenerate outline
  const handleRegenerateOutline = useCallback(async () => {
    if (!currentConfig) return;
    
    const outlineData = await generateOutline(currentConfig);
    
    if (outlineData) {
      setCurrentOutline(outlineData);
    }
  }, [currentConfig, generateOutline]);

  // Cancel and reset
  const handleCancel = useCallback(() => {
    setOutlinePreviewOpen(false);
    setCurrentOutline(null);
    setCurrentConfig(null);
  }, []);

  // Build outline for preview component
  const outlineForPreview: PPTOutline | null = currentOutline && currentConfig ? {
    title: currentOutline.title,
    subtitle: currentOutline.subtitle,
    topic: currentConfig.topic,
    audience: currentConfig.audience,
    slideCount: currentOutline.outline.length,
    theme: currentConfig.theme,
    outline: currentOutline.outline,
  } : null;

  const renderButton = () => {
    switch (variant) {
      case 'icon':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDialogOpen(true)}
                  disabled={isGenerating}
                  className={className}
                >
                  {isGenerating ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Presentation className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isGenerating ? progress.message : t('generatePPT')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      
      case 'button':
        return (
          <Button
            variant="outline"
            onClick={() => setDialogOpen(true)}
            disabled={isGenerating}
            className={className}
          >
            {isGenerating ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {progress.message}
              </>
            ) : (
              <>
                <Presentation className="mr-2 h-4 w-4" />
                {t('generatePPT')}
              </>
            )}
          </Button>
        );
      
      case 'menu-item':
        return (
          <button
            onClick={() => setDialogOpen(true)}
            disabled={isGenerating}
            className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none ${className || ''}`}
          >
            {isGenerating ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Presentation className="h-4 w-4" />
            )}
            <span>{isGenerating ? progress.message : t('generatePPT')}</span>
          </button>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      {renderButton()}
      
      {/* Configuration Dialog */}
      <PPTGenerationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onGenerate={useTwoStageFlow ? handleGenerateOutline : handleDirectGenerate}
        isGenerating={isGenerating && progress.stage === 'outline'}
        initialTopic={initialTopic}
      />

      {/* Outline Preview Dialog */}
      <Dialog open={outlinePreviewOpen} onOpenChange={setOutlinePreviewOpen}>
        <DialogContent className="sm:max-w-[700px] p-0">
          {outlineForPreview && (
            <PPTOutlinePreview
              outline={outlineForPreview}
              isGenerating={isGenerating && progress.stage === 'content'}
              onStartGeneration={handleStartFullGeneration}
              onRegenerateOutline={handleRegenerateOutline}
              onCancel={handleCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PPTQuickAction;
