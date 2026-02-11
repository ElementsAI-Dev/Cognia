'use client';

import { useTranslations } from 'next-intl';
import {
  Search,
  Heart,
  Package,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import type { MarketplacePrompt } from '@/types/content/prompt-marketplace';
import { PromptMarketplaceCard } from '../prompt-marketplace-card';

interface FavoritesTabProps {
  favoriteIds: string[];
  favoritePrompts: MarketplacePrompt[];
  favoritesSearchQuery: string;
  favoritesSortBy: 'name' | 'date' | 'rating';
  gridClasses: string;
  viewMode: 'grid' | 'list';
  onSearchChange: (query: string) => void;
  onSortChange: (sort: 'name' | 'date' | 'rating') => void;
  onViewDetail: (prompt: MarketplacePrompt) => void;
  onInstall?: (prompt: MarketplacePrompt) => void;
  onNavigateToBrowse: () => void;
}

export function FavoritesTab({
  favoriteIds,
  favoritePrompts,
  favoritesSearchQuery,
  favoritesSortBy,
  gridClasses,
  viewMode,
  onSearchChange,
  onSortChange,
  onViewDetail,
  onInstall,
  onNavigateToBrowse,
}: FavoritesTabProps) {
  const t = useTranslations('promptMarketplace');

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 text-red-600 dark:text-red-500 shadow-sm">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg tracking-tight">
                {t('sections.favoritePrompts')}
              </h3>
              <p className="text-xs text-muted-foreground">{t('sections.favoritesDesc')}</p>
            </div>
          </div>
          <Badge variant="secondary" className="font-mono text-xs tabular-nums">
            {favoritePrompts.length}
          </Badge>
        </div>
        {/* Search and Sort Bar */}
        {favoriteIds.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search.placeholder')}
                value={favoritesSearchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 bg-muted/30"
              />
            </div>
            <Select value={favoritesSortBy} onValueChange={(v) => onSortChange(v as 'name' | 'date' | 'rating')}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">{t('sort.newest')}</SelectItem>
                <SelectItem value="name">{t('sort.name')}</SelectItem>
                <SelectItem value="rating">{t('sort.rating')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {favoritePrompts.length > 0 ? (
        <div className={gridClasses}>
          {favoritePrompts.map((prompt) => (
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
          <EmptyMedia variant="icon" className="bg-red-500/10">
            <Heart className="h-10 w-10 text-red-500/50" />
          </EmptyMedia>
          <EmptyTitle>{t('empty.noFavoritesTitle')}</EmptyTitle>
          <EmptyDescription>{t('empty.noFavorites')}</EmptyDescription>
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
