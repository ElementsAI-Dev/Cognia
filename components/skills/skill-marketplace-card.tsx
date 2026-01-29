'use client';

/**
 * Skill Marketplace Card Component
 * Displays a single skill from the marketplace
 */

import { useTranslations } from 'next-intl';
import { Star, Download, CheckCircle, Loader2, ExternalLink, Heart, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SkillsMarketplaceItem, SkillInstallStatus } from '@/types/skill/skill-marketplace';
import { formatSkillsStarCount, formatSkillsRelativeTime } from '@/types/skill/skill-marketplace';

interface SkillMarketplaceCardProps {
  item: SkillsMarketplaceItem & {
    installStatus: SkillInstallStatus;
    isInstalled: boolean;
  };
  viewMode: 'grid' | 'list';
  onInstall: () => void;
  onClick: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
}

export function SkillMarketplaceCard({
  item,
  viewMode,
  onInstall,
  onClick,
  onToggleFavorite,
  isFavorite,
}: SkillMarketplaceCardProps) {
  const t = useTranslations('skills');

  const isInstalling = item.installStatus === 'installing';
  const isInstalled = item.isInstalled || item.installStatus === 'installed';
  const hasError = item.installStatus === 'error';

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50',
          isInstalled && 'border-green-500/50 bg-green-500/5'
        )}
        onClick={onClick}
      >
        {/* Icon */}
        <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          <Package className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{item.name}</h3>
            {isInstalled && (
              <Badge variant="default" className="bg-green-600 shrink-0">
                <CheckCircle className="h-3 w-3 mr-1" />
                {t('installed') || 'Installed'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{item.description || t('noDescription')}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {formatSkillsStarCount(item.stars)}
            </span>
            <span>{item.author}</span>
            <span>{formatSkillsRelativeTime(item.updatedAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
          >
            <Heart className={cn('h-4 w-4', isFavorite && 'fill-red-500 text-red-500')} />
          </Button>
          {!isInstalled && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onInstall();
              }}
              disabled={isInstalling}
            >
              {isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  {t('install') || 'Install'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isInstalled && 'border-green-500/50 bg-green-500/5'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              {item.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1 text-xs">
              <span>{item.author}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {formatSkillsStarCount(item.stars)}
              </span>
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
          >
            <Heart className={cn('h-4 w-4', isFavorite && 'fill-red-500 text-red-500')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {item.description || t('noDescription') || 'No description available'}
        </p>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{item.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            {item.repository && (
              <a
                href={`https://github.com/${item.repository}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                {t('viewSource') || 'Source'}
              </a>
            )}
            <span className="text-xs text-muted-foreground">{formatSkillsRelativeTime(item.updatedAt)}</span>
          </div>

          {isInstalled ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              {t('installed') || 'Installed'}
            </Badge>
          ) : (
            <Button
              size="sm"
              variant={hasError ? 'destructive' : 'outline'}
              onClick={(e) => {
                e.stopPropagation();
                onInstall();
              }}
              disabled={isInstalling}
            >
              {isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  {hasError ? t('retry') || 'Retry' : t('install') || 'Install'}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default SkillMarketplaceCard;
