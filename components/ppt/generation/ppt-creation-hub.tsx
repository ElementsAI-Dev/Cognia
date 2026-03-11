'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePPTGeneration } from '@/hooks/ppt';
import type { PPTGenerationConfig, PPTMaterialGenerationConfig } from '@/hooks/ppt/use-ppt-generation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PPTCreationForm } from './ppt-creation-form';
import { PPTGenerationReviewPanel } from './ppt-generation-review-panel';

export type CreationMode = 'generate' | 'import' | 'paste';

export interface PPTCreationHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: CreationMode;
  initialTopic?: string;
  onCreated?: (presentationId: string) => void;
}

export function PPTCreationHub({
  open,
  onOpenChange,
  initialMode = 'generate',
  initialTopic = '',
  onCreated,
}: PPTCreationHubProps) {
  const t = useTranslations('pptGenerator');
  const router = useRouter();
  const [showReview, setShowReview] = useState(false);

  const {
    reviewSession,
    isGenerating,
    progress,
    error,
    retry,
    canRetry,
    prepareReview,
    updateReviewOutline,
    regenerateReviewOutline,
    finalizeReview,
    clearReviewSession,
  } = usePPTGeneration();

  const handleGenerate = useCallback(async (config: PPTGenerationConfig) => {
    const session = await prepareReview(config, 'generate');
    if (session) {
      setShowReview(true);
    }
  }, [prepareReview]);

  const handleGenerateFromMaterials = useCallback(async (
    config: PPTMaterialGenerationConfig,
    sourceMode: CreationMode
  ) => {
    const session = await prepareReview(config, sourceMode);
    if (session) {
      setShowReview(true);
    }
  }, [prepareReview]);

  const handleFinalizeReview = useCallback(async () => {
    const result = await finalizeReview();
    if (result) {
      onOpenChange(false);
      onCreated?.(result.id);
      if (!onCreated) {
        router.push(`/ppt?id=${result.id}`);
      }
      setShowReview(false);
    }
  }, [finalizeReview, onOpenChange, onCreated, router]);

  const handleBackToInputs = useCallback(() => {
    setShowReview(false);
  }, []);

  const handleDiscardSession = useCallback(() => {
    clearReviewSession();
    setShowReview(false);
  }, [clearReviewSession]);

  const shouldShowReview = Boolean(reviewSession) && showReview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('creationHub')}
          </DialogTitle>
          <DialogDescription>{t('creationHubDesc')}</DialogDescription>
        </DialogHeader>

        {shouldShowReview && reviewSession ? (
          <PPTGenerationReviewPanel
            reviewSession={reviewSession}
            isGenerating={isGenerating}
            error={error}
            canRetry={canRetry}
            onRetry={retry}
            onOutlineChange={updateReviewOutline}
            onRegenerateOutline={regenerateReviewOutline}
            onStartGeneration={handleFinalizeReview}
            onBack={handleBackToInputs}
            cancelLabel={t('backToInputs')}
          />
        ) : (
          <div className="space-y-4">
            {reviewSession ? (
              <Card data-testid="ppt-review-session-resume">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('reviewSessionReady')}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowReview(true)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t('resumeReview')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDiscardSession}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('discardReview')}
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <PPTCreationForm
              initialMode={initialMode}
              initialTopic={initialTopic}
              isGenerating={isGenerating}
              progress={progress}
              error={error}
              canRetry={canRetry}
              onRetry={retry}
              onGenerate={handleGenerate}
              onGenerateFromMaterials={handleGenerateFromMaterials}
            />
          </div>
        )}

        {/* Cancel button outside the form */}
        <div className="flex justify-start pt-0">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
            disabled={isGenerating}
          >
            {t('cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PPTCreationHub;
