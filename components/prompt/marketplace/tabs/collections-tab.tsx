'use client';

import { useTranslations } from 'next-intl';
import { FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import type { MarketplacePrompt, PromptCollection } from '@/types/content/prompt-marketplace';
import { PromptCollectionCard } from '../prompt-collection-card';

interface CollectionsTabProps {
  collections: PromptCollection[];
  getPromptById: (id: string) => MarketplacePrompt | undefined;
}

export function CollectionsTab({
  collections,
  getPromptById,
}: CollectionsTabProps) {
  const t = useTranslations('promptMarketplace');

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-500 shadow-sm">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg tracking-tight">
              {t('collections.title')}
            </h3>
            <p className="text-xs text-muted-foreground">{t('collections.exploreCollections')}</p>
          </div>
        </div>
        <Badge variant="secondary" className="font-mono text-xs tabular-nums">
          {collections.length}
        </Badge>
      </div>
      {collections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => {
            const collectionPrompts = collection.promptIds
              .map((id) => getPromptById(id))
              .filter((p): p is MarketplacePrompt => p !== undefined);
            return (
              <PromptCollectionCard
                key={collection.id}
                collection={collection}
                prompts={collectionPrompts}
                featured={collection.isFeatured}
              />
            );
          })}
        </div>
      ) : (
        <Empty className="py-10 sm:py-14 border-2 rounded-2xl bg-muted/20">
          <EmptyMedia variant="icon" className="bg-amber-500/10">
            <FolderOpen className="h-10 w-10 text-amber-500/50" />
          </EmptyMedia>
          <EmptyTitle>{t('empty.noCollections')}</EmptyTitle>
          <EmptyDescription>{t('collections.exploreCollections')}</EmptyDescription>
        </Empty>
      )}
    </section>
  );
}
