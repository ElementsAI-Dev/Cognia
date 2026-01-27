'use client';

import { useTranslations } from 'next-intl';
import {
  FolderOpen,
  Star,
  Download,
  ChevronRight,
  Sparkles,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { PromptCollection, MarketplacePrompt } from '@/types/content/prompt-marketplace';

interface PromptCollectionCardProps {
  collection: PromptCollection;
  prompts: MarketplacePrompt[];
  onViewCollection?: (collection: PromptCollection) => void;
  featured?: boolean;
}

export function PromptCollectionCard({
  collection,
  prompts,
  onViewCollection,
  featured = false,
}: PromptCollectionCardProps) {
  const t = useTranslations('promptMarketplace.collections');

  const previewPrompts = prompts.slice(0, 4);
  const totalDownloads = prompts.reduce((sum, p) => sum + p.stats.downloads, 0);
  const avgRating = prompts.length > 0
    ? prompts.reduce((sum, p) => sum + p.rating.average, 0) / prompts.length
    : 0;

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/30',
        featured && 'border-primary/50 bg-gradient-to-br from-primary/5 to-transparent'
      )}
      onClick={() => onViewCollection?.(collection)}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className={cn(
              'p-3 rounded-xl transition-transform duration-300 group-hover:scale-110',
              featured
                ? 'bg-gradient-to-br from-primary/20 to-primary/5 text-primary'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <FolderOpen className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                {collection.name}
              </h3>
              {featured && (
                <Badge variant="default" className="gap-1 shrink-0">
                  <Sparkles className="h-3 w-3" />
                  {t('featured')}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {collection.description}
            </p>
          </div>
        </div>

        {/* Prompts Preview */}
        <div className="space-y-2 mb-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('promptsInCollection', { count: prompts.length })}
          </div>
          <div className="flex flex-wrap gap-2">
            {previewPrompts.map((prompt) => (
              <Badge
                key={prompt.id}
                variant="secondary"
                className="text-xs truncate max-w-[120px]"
              >
                {prompt.name}
              </Badge>
            ))}
            {prompts.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{prompts.length - 4} {t('more')}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span>{avgRating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Download className="h-4 w-4" />
            <span>{totalDownloads.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{collection.followers?.toLocaleString() || 0}</span>
          </div>
        </div>

        {/* Curator */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={collection.author?.avatar} />
              <AvatarFallback className="text-xs">
                {collection.author?.name?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              {t('curatedBy')} <span className="font-medium text-foreground">{collection.author?.name || 'Unknown'}</span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {t('viewCollection')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default PromptCollectionCard;
