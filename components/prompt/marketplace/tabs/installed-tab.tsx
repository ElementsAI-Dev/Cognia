'use client';

import { useTranslations } from 'next-intl';
import {
  Search,
  RefreshCw,
  Download,
  Package,
  ArrowUpCircle,
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
import { cn } from '@/lib/utils';
import type { MarketplacePrompt, InstalledMarketplacePrompt } from '@/types/content/prompt-marketplace';
import { PromptMarketplaceCard } from '../prompt-marketplace-card';
import { PromptImportExport } from '../prompt-import-export';
import { PromptPublishDialog } from '../prompt-publish-dialog';

interface InstalledTabProps {
  installedPrompts: InstalledMarketplacePrompt[];
  installedPromptsList: MarketplacePrompt[];
  promptsWithUpdates: string[];
  isCheckingUpdates: boolean;
  installedSearchQuery: string;
  installedSortBy: 'name' | 'date' | 'rating';
  gridClasses: string;
  viewMode: 'grid' | 'list';
  onSearchChange: (query: string) => void;
  onSortChange: (sort: 'name' | 'date' | 'rating') => void;
  onViewDetail: (prompt: MarketplacePrompt) => void;
  onCheckForUpdates: () => void;
  onUpdatePrompt: (marketplaceId: string) => void;
  onNavigateToBrowse: () => void;
}

export function InstalledTab({
  installedPrompts,
  installedPromptsList,
  promptsWithUpdates,
  isCheckingUpdates,
  installedSearchQuery,
  installedSortBy,
  gridClasses,
  viewMode,
  onSearchChange,
  onSortChange,
  onViewDetail,
  onCheckForUpdates,
  onUpdatePrompt,
  onNavigateToBrowse,
}: InstalledTabProps) {
  const t = useTranslations('promptMarketplace');

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-600 dark:text-green-500 shadow-sm">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg tracking-tight">
                {t('sections.installedPrompts')}
              </h3>
              <p className="text-xs text-muted-foreground">{t('sections.installedDesc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {promptsWithUpdates.length > 0 && (
              <Badge variant="default" className="gap-1 bg-blue-500">
                <ArrowUpCircle className="h-3 w-3" />
                {promptsWithUpdates.length} {t('updates.available')}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onCheckForUpdates}
              disabled={isCheckingUpdates || installedPromptsList.length === 0}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isCheckingUpdates && 'animate-spin')} />
              {isCheckingUpdates ? t('updates.checking') : t('updates.checkForUpdates')}
            </Button>
            <PromptPublishDialog />
            <PromptImportExport />
            <Badge variant="secondary" className="font-mono text-xs tabular-nums">
              {installedPromptsList.length}
            </Badge>
          </div>
        </div>
        {/* Search and Sort Bar */}
        {installedPrompts.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search.placeholder')}
                value={installedSearchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 bg-muted/30"
              />
            </div>
            <Select value={installedSortBy} onValueChange={(v) => onSortChange(v as 'name' | 'date' | 'rating')}>
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
      {installedPromptsList.length > 0 ? (
        <div className={gridClasses}>
          {installedPromptsList.map((prompt) => (
            <PromptMarketplaceCard
              key={prompt.id}
              prompt={prompt}
              onViewDetail={onViewDetail}
              compact={viewMode === 'list'}
              hasUpdate={promptsWithUpdates.includes(prompt.id)}
              onUpdate={() => onUpdatePrompt(prompt.id)}
            />
          ))}
        </div>
      ) : (
        <Empty className="py-10 sm:py-14 border-2 rounded-2xl bg-muted/20">
          <EmptyMedia variant="icon" className="bg-green-500/10">
            <Download className="h-10 w-10 text-green-500/50" />
          </EmptyMedia>
          <EmptyTitle>{t('empty.noInstalledTitle')}</EmptyTitle>
          <EmptyDescription>{t('empty.noInstalled')}</EmptyDescription>
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
