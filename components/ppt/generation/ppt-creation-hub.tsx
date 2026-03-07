'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
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
import { PPTCreationForm } from './ppt-creation-form';

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

  const {
    generate,
    generateFromMaterials,
    isGenerating,
    progress,
    error,
    retry,
    canRetry,
  } = usePPTGeneration();

  const handleGenerate = useCallback(async (config: PPTGenerationConfig) => {
    const result = await generate(config);
    if (result) {
      onOpenChange(false);
      onCreated?.(result.id);
      if (!onCreated) {
        router.push(`/ppt?id=${result.id}`);
      }
    }
  }, [generate, onOpenChange, onCreated, router]);

  const handleGenerateFromMaterials = useCallback(async (config: PPTMaterialGenerationConfig) => {
    const result = await generateFromMaterials(config);
    if (result) {
      onOpenChange(false);
      onCreated?.(result.id);
      if (!onCreated) {
        router.push(`/ppt?id=${result.id}`);
      }
    }
  }, [generateFromMaterials, onOpenChange, onCreated, router]);

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

        {/* Cancel button outside the form */}
        <div className="flex justify-start pt-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
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
