'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Check, Database } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EmbeddingProvider } from '@/lib/vector/embedding';
import type { VectorDBProvider } from '@/stores/data';

export function VectorSetupGuideModal({
  open,
  onOpenChange,
  provider,
  embeddingProvider,
  hasEmbeddingKey,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: VectorDBProvider;
  embeddingProvider: EmbeddingProvider;
  hasEmbeddingKey: boolean;
  onComplete: () => void;
}) {
  const t = useTranslations('vectorSetupGuide');

  const providerLabel = useMemo(() => {
    if (provider === 'native') return 'Native';
    if (provider === 'chroma') return 'Chroma';
    if (provider === 'pinecone') return 'Pinecone';
    if (provider === 'weaviate') return 'Weaviate';
    if (provider === 'qdrant') return 'Qdrant';
    if (provider === 'milvus') return 'Milvus';
    return provider;
  }, [provider]);

  const embeddingLabel = useMemo(() => {
    if (embeddingProvider === 'openai') return 'OpenAI';
    if (embeddingProvider === 'google') return 'Google';
    if (embeddingProvider === 'cohere') return 'Cohere';
    if (embeddingProvider === 'mistral') return 'Mistral';
    return embeddingProvider;
  }, [embeddingProvider]);

  const step1Done = !!provider;
  const step2Done = hasEmbeddingKey;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <DialogTitle>{t('title')}</DialogTitle>
              <DialogDescription>{t('subtitle')}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 space-y-3 pb-5">
          <div
            className={cn(
              'rounded-xl border p-4 flex items-start gap-3',
              step1Done ? 'border-green-500/50 bg-green-500/5' : 'bg-muted/20'
            )}
          >
            <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold', step1Done ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground')}>
              1
            </div>
            <div className="flex-1">
              <div className={cn('text-sm font-semibold', step1Done ? 'text-green-700 dark:text-green-400' : '')}>
                {t('step1Title')}
              </div>
              <div className={cn('text-xs mt-1', step1Done ? 'text-green-700/80 dark:text-green-400/80' : 'text-muted-foreground')}>
                {t('step1Desc')} ({providerLabel})
              </div>
            </div>
            {step1Done && <Check className="h-4 w-4 text-green-600" />}
          </div>

          <div
            className={cn(
              'rounded-xl border p-4 flex items-start gap-3',
              step2Done ? 'border-blue-500/50 bg-blue-500/5' : 'bg-muted/20'
            )}
          >
            <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold', step2Done ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground')}>
              2
            </div>
            <div className="flex-1">
              <div className={cn('text-sm font-semibold', step2Done ? 'text-blue-700 dark:text-blue-400' : '')}>
                {t('step2Title')}
              </div>
              <div className={cn('text-xs mt-1', step2Done ? 'text-blue-700/80 dark:text-blue-400/80' : 'text-muted-foreground')}>
                {t('step2Desc')} ({embeddingLabel})
              </div>
            </div>
            {!step2Done ? <ArrowRight className="h-4 w-4 text-blue-600" /> : <Check className="h-4 w-4 text-blue-600" />}
          </div>

          <div className="rounded-xl border p-4 flex items-start gap-3 bg-muted/10">
            <div className="h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold">
              3
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{t('step3Title')}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('step3Desc')}</div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-1">{t('hint')}</div>
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onComplete();
              onOpenChange(false);
            }}
          >
            {t('skip')}
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onComplete();
              onOpenChange(false);
            }}
          >
            {t('continue')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
