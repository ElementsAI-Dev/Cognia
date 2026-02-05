'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  User,
  CheckCircle2,
  Download,
  Star,
  Package,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Empty, EmptyMedia, EmptyDescription } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import type { PromptAuthor, MarketplacePrompt } from '@/types/content/prompt-marketplace';
import { PromptMarketplaceCard } from './prompt-marketplace-card';

interface PromptAuthorProfileProps {
  author: PromptAuthor;
  prompts: MarketplacePrompt[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewPrompt?: (prompt: MarketplacePrompt) => void;
  onInstall?: (prompt: MarketplacePrompt) => void;
}

export function PromptAuthorProfile({
  author,
  prompts,
  open,
  onOpenChange,
  onViewPrompt,
  onInstall,
}: PromptAuthorProfileProps) {
  const t = useTranslations('promptMarketplace.author');
  const [sortBy, setSortBy] = useState<'downloads' | 'rating' | 'newest'>('downloads');

  const sortedPrompts = useMemo(() => {
    return [...prompts].sort((a, b) => {
      switch (sortBy) {
        case 'downloads':
          return b.stats.downloads - a.stats.downloads;
        case 'rating':
          return b.rating.average - a.rating.average;
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return 0;
      }
    });
  }, [prompts, sortBy]);

  const totalDownloads = useMemo(
    () => prompts.reduce((sum, p) => sum + p.stats.downloads, 0),
    [prompts]
  );

  const avgRating = useMemo(() => {
    if (prompts.length === 0) return 0;
    return prompts.reduce((sum, p) => sum + p.rating.average, 0) / prompts.length;
  }, [prompts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{author.name}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 space-y-6">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="gap-1.5 -ml-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('back')}
            </Button>

            {/* Author Header */}
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={author.avatar} alt={author.name} />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-primary/20 to-primary/5">
                  {author.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{author.name}</h2>
                  {author.verified && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t('verified')}
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-muted">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{prompts.length}</p>
                      <p className="text-xs text-muted-foreground">{t('prompts')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-muted">
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{totalDownloads.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{t('totalDownloads')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-muted">
                      <Star className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div>
                      <p className="font-semibold">{avgRating.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">{t('avgRating')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Prompts Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('promptsByAuthor')}</h3>
                <div className="flex items-center gap-2">
                  {(['downloads', 'rating', 'newest'] as const).map((sort) => (
                    <Button
                      key={sort}
                      variant={sortBy === sort ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setSortBy(sort)}
                      className={cn(
                        'h-8',
                        sortBy === sort && 'shadow-sm'
                      )}
                    >
                      {t(`sort.${sort}`)}
                    </Button>
                  ))}
                </div>
              </div>

              {prompts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedPrompts.map((prompt) => (
                    <PromptMarketplaceCard
                      key={prompt.id}
                      prompt={prompt}
                      onViewDetail={onViewPrompt}
                      onInstall={onInstall}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <Empty className="py-12 border-2 rounded-xl bg-muted/20">
                  <EmptyMedia>
                    <User className="h-10 w-10 text-muted-foreground/40" />
                  </EmptyMedia>
                  <EmptyDescription>{t('noPrompts')}</EmptyDescription>
                </Empty>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default PromptAuthorProfile;
