'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  Heart,
  RefreshCw,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { MarketplacePrompt, PromptAuthor } from '@/types/content/prompt-marketplace';
import type { PromptMarketplaceErrorCategory } from '@/lib/prompts/marketplace-utils';
import { getPromptMarketplaceErrorMessageKey } from '@/lib/prompts/marketplace-error-adapter';
import { usePromptMarketplaceStore } from '@/stores/prompt/prompt-marketplace-store';

interface PromptMarketplaceInspectorProps {
  prompt: MarketplacePrompt | null;
  retryContext?: {
    message: string;
    category: PromptMarketplaceErrorCategory;
    attemptCount: number;
    updatedAt: Date;
  };
  className?: string;
  onOpenDetail: () => void;
  onViewAuthor?: (author: PromptAuthor) => void;
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return `${value}`;
}

export function PromptMarketplaceInspector({
  prompt,
  retryContext,
  className,
  onOpenDetail,
  onViewAuthor,
}: PromptMarketplaceInspectorProps) {
  const t = useTranslations('promptMarketplace');

  const isInstalled = usePromptMarketplaceStore((state) =>
    prompt ? state.isPromptInstalled(prompt.id) : false
  );
  const isFavorite = usePromptMarketplaceStore((state) =>
    prompt ? state.isFavorite(prompt.id) : false
  );
  const installOperation = usePromptMarketplaceStore((state) =>
    prompt ? state.operationStates[`install:${prompt.id}`] : undefined
  );
  const addToFavorites = usePromptMarketplaceStore((state) => state.addToFavorites);
  const removeFromFavorites = usePromptMarketplaceStore((state) => state.removeFromFavorites);
  const installPrompt = usePromptMarketplaceStore((state) => state.installPrompt);

  const handleInstall = useCallback(async () => {
    if (!prompt || isInstalled || installOperation?.status === 'loading') {
      return;
    }
    await installPrompt(prompt);
  }, [installOperation?.status, installPrompt, isInstalled, prompt]);

  const handleFavoriteToggle = useCallback(() => {
    if (!prompt) {
      return;
    }
    if (isFavorite) {
      removeFromFavorites(prompt.id);
      return;
    }
    addToFavorites(prompt.id);
  }, [addToFavorites, isFavorite, prompt, removeFromFavorites]);

  if (!prompt) {
    return (
      <Card className={cn('min-w-0 border-dashed bg-muted/20', className)}>
        <CardHeader>
          <CardTitle className="text-base">{t('inspector.title')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t('inspector.empty')}
        </CardContent>
      </Card>
    );
  }

  const operationMessageKey = getPromptMarketplaceErrorMessageKey(installOperation?.category);

  return (
    <Card className={cn('min-w-0 overflow-hidden border-border/60 bg-card/90', className)}>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl"
            style={{
              backgroundColor: `${prompt.color || '#6366f1'}20`,
              color: prompt.color || '#6366f1',
            }}
          >
            {prompt.icon || '📝'}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="line-clamp-2 text-base">{prompt.name}</CardTitle>
            <button
              type="button"
              className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onViewAuthor?.(prompt.author)}
            >
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{prompt.author.name}</span>
            </button>
          </div>
        </div>
        <p className="line-clamp-3 text-xs text-muted-foreground">{prompt.description}</p>
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{prompt.category}</Badge>
          {prompt.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[11px]">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md border bg-muted/25 px-2 py-1.5">
            <p className="font-semibold">{prompt.rating.average.toFixed(1)}</p>
            <p className="text-muted-foreground">{t('detail.ratings')}</p>
          </div>
          <div className="rounded-md border bg-muted/25 px-2 py-1.5">
            <p className="font-semibold">{formatNumber(prompt.stats.downloads)}</p>
            <p className="text-muted-foreground">{t('detail.downloads')}</p>
          </div>
          <div className="rounded-md border bg-muted/25 px-2 py-1.5">
            <p className="font-semibold">{formatNumber(prompt.stats.views)}</p>
            <p className="text-muted-foreground">{t('detail.views')}</p>
          </div>
        </div>

        {(installOperation?.status === 'error' || retryContext) && (
          <div className="rounded-md border border-amber-300/60 bg-amber-50/90 p-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t(operationMessageKey)}</p>
                <p className="truncate">{installOperation?.error || retryContext?.message}</p>
              </div>
            </div>
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={isFavorite ? 'secondary' : 'outline'}
            className="gap-2"
            onClick={handleFavoriteToggle}
          >
            <Heart className={cn('h-4 w-4', isFavorite && 'fill-current text-red-500')} />
            {isFavorite ? t('detail.removeFromFavorites') : t('detail.addToFavorites')}
          </Button>
          {isInstalled ? (
            <Button variant="secondary" className="gap-2" disabled>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {t('card.installed')}
            </Button>
          ) : (
            <Button
              className="gap-2"
              onClick={handleInstall}
              disabled={installOperation?.status === 'loading'}
            >
              {installOperation?.status === 'loading' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {installOperation?.status === 'loading' ? t('card.installing') : t('card.install')}
            </Button>
          )}
        </div>

        <Button variant="ghost" className="w-full gap-2" onClick={onOpenDetail}>
          <Eye className="h-4 w-4" />
          {t('inspector.openDetail')}
        </Button>
      </CardContent>
    </Card>
  );
}

export default PromptMarketplaceInspector;
