'use client';

import { useTranslations } from 'next-intl';
import { History, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import type { MarketplacePrompt } from '@/types/content/prompt-marketplace';
import { PromptMarketplaceCard } from '../prompt-marketplace-card';

interface RecentTabProps {
  recentlyViewed: MarketplacePrompt[];
  gridClasses: string;
  viewMode: 'grid' | 'list';
  onViewDetail: (prompt: MarketplacePrompt) => void;
  onInstall?: (prompt: MarketplacePrompt) => void;
  onNavigateToBrowse: () => void;
}

export function RecentTab({
  recentlyViewed,
  gridClasses,
  viewMode,
  onViewDetail,
  onInstall,
  onNavigateToBrowse,
}: RecentTabProps) {
  const t = useTranslations('promptMarketplace');

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 text-purple-600 dark:text-purple-500 shadow-sm">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg tracking-tight">
              {t('sections.recentlyViewed')}
            </h3>
            <p className="text-xs text-muted-foreground">{t('sections.recentDesc')}</p>
          </div>
        </div>
        <Badge variant="secondary" className="font-mono text-xs tabular-nums">
          {recentlyViewed.length}
        </Badge>
      </div>
      {recentlyViewed.length > 0 ? (
        <div className={gridClasses}>
          {recentlyViewed.map((prompt) => (
            <PromptMarketplaceCard
              key={prompt.id}
              prompt={prompt}
              onViewDetail={onViewDetail}
              onInstall={onInstall}
              compact={viewMode === 'list'}
            />
          ))}
        </div>
      ) : (
        <Empty className="py-10 sm:py-14 border-2 rounded-2xl bg-muted/20">
          <EmptyMedia variant="icon" className="bg-purple-500/10">
            <History className="h-10 w-10 text-purple-500/50" />
          </EmptyMedia>
          <EmptyTitle>{t('empty.noRecentTitle')}</EmptyTitle>
          <EmptyDescription>{t('empty.noRecent')}</EmptyDescription>
          <EmptyContent>
            <Button variant="outline" className="gap-2" onClick={onNavigateToBrowse}>
              <Package className="h-4 w-4" />
              {t('empty.browseMarketplace')}
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </section>
  );
}
