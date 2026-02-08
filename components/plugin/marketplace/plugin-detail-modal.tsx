'use client';

/**
 * Plugin Detail Modal - Full plugin details with screenshots, reviews, changelog
 */

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Star,
  Download,
  Tag,
  CheckCircle,
  Heart,
  MessageSquare,
  Loader2,
  Github,
  Globe,
  FileText,
  AlertTriangle,
  ThumbsUp,
  Send,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { usePluginMarketplaceStore } from '@/stores/plugin/plugin-marketplace-store';
import type { MarketplacePlugin, PluginReview, ChangelogEntry, InstallProgressInfo } from './components/marketplace-types';
import { MOCK_REVIEWS, MOCK_CHANGELOG } from './components/marketplace-constants';
import { ScreenshotGallery } from './components/screenshot-gallery';

// =============================================================================
// Types
// =============================================================================

interface PluginDetailModalProps {
  plugin: MarketplacePlugin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall?: (pluginId: string) => Promise<void>;
  installProgress?: InstallProgressInfo;
  variant?: 'dialog' | 'sheet';
}

// =============================================================================
// Sub Components
// =============================================================================

function RatingStars({ rating, size = 'md', interactive, onRate }: {
  rating: number;
  size?: 'sm' | 'md';
  interactive?: boolean;
  onRate?: (rating: number) => void;
}) {
  const sizeClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClass,
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground/30',
            interactive && 'cursor-pointer hover:text-yellow-400 hover:fill-yellow-400 transition-colors'
          )}
          onClick={interactive ? () => onRate?.(star) : undefined}
        />
      ))}
    </div>
  );
}

function RatingBreakdown({ rating, reviewCount, breakdown }: {
  rating: number;
  reviewCount: number;
  breakdown?: Record<number, number>;
}) {
  const defaultBreakdown = breakdown || { 5: 70, 4: 20, 3: 7, 2: 2, 1: 1 };
  const total = Object.values(defaultBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-4xl font-bold">{rating}</div>
          <RatingStars rating={Math.round(rating)} />
          <div className="text-xs text-muted-foreground mt-1">
            {reviewCount} reviews
          </div>
        </div>
        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((stars) => {
            const pct = total > 0 ? Math.round(((defaultBreakdown[stars] || 0) / total) * 100) : 0;
            return (
              <div key={stars} className="flex items-center gap-2 text-xs">
                <span className="w-3">{stars}</span>
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <Progress value={pct} className="h-1.5 flex-1" />
                <span className="w-8 text-muted-foreground">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: PluginReview }) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpful);
  const [hasVoted, setHasVoted] = useState(false);

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={review.avatar} />
            <AvatarFallback>{review.author[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-sm">{review.author}</div>
            <div className="flex items-center gap-2">
              <RatingStars rating={review.rating} size="sm" />
              <span className="text-xs text-muted-foreground">{review.date}</span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{review.content}</p>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-6 text-xs gap-1', hasVoted && 'text-primary')}
          onClick={() => {
            if (!hasVoted) {
              setHelpfulCount((c) => c + 1);
              setHasVoted(true);
            }
          }}
          disabled={hasVoted}
        >
          <ThumbsUp className="h-3 w-3" />
          Helpful ({helpfulCount})
        </Button>
      </div>
    </div>
  );
}

function ReviewForm({ onSubmit }: { onSubmit: (rating: number, content: string) => void }) {
  const t = useTranslations('pluginDetail');
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (rating === 0 || !content.trim()) return;
    setIsSubmitting(true);
    try {
      onSubmit(rating, content);
      setRating(0);
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
      <h4 className="text-sm font-medium">{t('reviews.writeReview')}</h4>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('reviews.yourRating')}:</span>
        <RatingStars rating={rating} size="md" interactive onRate={setRating} />
      </div>
      <Textarea
        placeholder={t('reviews.reviewPlaceholder')}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[80px] text-sm"
      />
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={isSubmitting || rating === 0 || !content.trim()}
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        {t('reviews.submitReview')}
      </Button>
    </div>
  );
}

function ChangelogCard({ entry }: { entry: ChangelogEntry }) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={entry.breaking ? 'destructive' : 'secondary'}>
            v{entry.version}
          </Badge>
          {entry.breaking && (
            <Badge variant="outline" className="text-orange-500 border-orange-500/50">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Breaking
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{entry.date}</span>
      </div>
      <ul className="space-y-1">
        {entry.changes.map((change, idx) => (
          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>{change}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InstallProgressBar({ progress }: { progress: InstallProgressInfo }) {
  const stageColors: Record<string, string> = {
    downloading: 'text-blue-500',
    extracting: 'text-amber-500',
    installing: 'text-purple-500',
    configuring: 'text-cyan-500',
    complete: 'text-green-500',
    error: 'text-destructive',
  };

  return (
    <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
      <div className="flex items-center justify-between text-sm">
        <span className={cn('font-medium capitalize', stageColors[progress.stage] || '')}>
          {progress.stage}
        </span>
        <span className="text-muted-foreground">{progress.progress}%</span>
      </div>
      <Progress value={progress.progress} className="h-2" />
      <p className="text-xs text-muted-foreground">{progress.message}</p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PluginDetailModal({
  plugin,
  open,
  onOpenChange,
  onInstall,
  installProgress,
  variant = 'sheet',
}: PluginDetailModalProps) {
  const t = useTranslations('pluginDetail');
  const { toggleFavorite, isFavorite, submitReview, getUserReview, addRecentlyViewed } = usePluginMarketplaceStore();
  const [isInstalling, setIsInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showReviewForm, setShowReviewForm] = useState(false);

  const handleOpen = useCallback((isOpen: boolean) => {
    if (isOpen && plugin) {
      addRecentlyViewed(plugin.id);
    }
    onOpenChange(isOpen);
  }, [plugin, addRecentlyViewed, onOpenChange]);

  const handleInstall = useCallback(async () => {
    if (onInstall && plugin) {
      setIsInstalling(true);
      try {
        await onInstall(plugin.id);
      } finally {
        setIsInstalling(false);
      }
    }
  }, [onInstall, plugin]);

  const handleReviewSubmit = useCallback((rating: number, content: string) => {
    if (plugin) {
      submitReview(plugin.id, rating, content);
      setShowReviewForm(false);
    }
  }, [plugin, submitReview]);

  const openUrl = useCallback((url?: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  if (!plugin) return null;

  // Use plugin data or fall back to shared mock data
  const reviews = plugin.reviews || MOCK_REVIEWS || [];
  const changelog = plugin.changelog || MOCK_CHANGELOG || [];
  const userReview = getUserReview(plugin.id);
  const pluginIsFavorite = isFavorite(plugin.id);
  const isCurrentlyInstalling = isInstalling || (installProgress != null && !['idle', 'complete', 'error'].includes(installProgress.stage));
  const hasLinks = plugin.repository || plugin.homepage || plugin.documentation;

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            <Tag className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold truncate">{plugin.name}</h2>
              {plugin.verified && (
                <CheckCircle className="h-5 w-5 text-blue-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              {plugin.author.url ? (
                <button
                  className="hover:text-primary hover:underline transition-colors"
                  onClick={() => openUrl(plugin.author.url)}
                >
                  {plugin.author.name}
                </button>
              ) : (
                <span>{plugin.author.name}</span>
              )}
              {plugin.author.verified && (
                <Badge variant="secondary" className="text-[10px]">Verified</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <RatingStars rating={Math.round(plugin.rating)} size="sm" />
                <span className="text-sm font-medium">{plugin.rating}</span>
                <span className="text-xs text-muted-foreground">({plugin.reviewCount})</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Download className="h-4 w-4" />
                <span>{plugin.downloadCount >= 1000 ? `${(plugin.downloadCount / 1000).toFixed(0)}k` : plugin.downloadCount}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Install Progress */}
        {installProgress && installProgress.stage !== 'idle' && (
          <div className="mt-4">
            <InstallProgressBar progress={installProgress} />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            className="flex-1 sm:flex-none"
            onClick={handleInstall}
            disabled={!!isCurrentlyInstalling || plugin.installed}
          >
            {isCurrentlyInstalling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : plugin.installed ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isCurrentlyInstalling ? t('installing') : plugin.installed ? t('installed') : t('install')}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => toggleFavorite(plugin.id)}
          >
            <Heart className={cn('h-4 w-4', pluginIsFavorite && 'fill-red-500 text-red-500')} />
          </Button>
          {plugin.homepage && (
            <Button variant="outline" size="icon" onClick={() => openUrl(plugin.homepage)}>
              <Globe className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-4 sm:px-6">
          <TabsList className="h-10">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              {t('tabs.overview')}
            </TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs sm:text-sm">
              {t('tabs.reviews')}
            </TabsTrigger>
            <TabsTrigger value="changelog" className="text-xs sm:text-sm">
              {t('tabs.changelog')}
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* Overview Tab */}
          <TabsContent value="overview" className="m-0 p-4 sm:p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">{t('overview.description')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {plugin.description}
              </p>
            </div>

            {/* Screenshots */}
            {plugin.screenshots && plugin.screenshots.length > 0 && (
              <>
                <ScreenshotGallery screenshots={plugin.screenshots} pluginName={plugin.name} />
                <Separator />
              </>
            )}

            {/* Capabilities */}
            <div>
              <h3 className="font-semibold mb-2">{t('overview.capabilities')}</h3>
              <div className="flex flex-wrap gap-2">
                {plugin.capabilities.map((cap) => (
                  <Badge key={cap} variant="secondary">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="font-semibold mb-2">{t('overview.tags')}</h3>
              <div className="flex flex-wrap gap-2">
                {plugin.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{t('overview.version')}</div>
                <div className="font-mono text-sm">{plugin.version}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{t('overview.type')}</div>
                <div className="text-sm capitalize">{plugin.type}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{t('overview.lastUpdated')}</div>
                <div className="text-sm">{plugin.lastUpdated}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{t('overview.license')}</div>
                <div className="text-sm">{plugin.license || 'MIT'}</div>
              </div>
            </div>

            {/* Links */}
            {hasLinks && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">{t('overview.links')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {plugin.repository && (
                      <Button variant="outline" size="sm" onClick={() => openUrl(plugin.repository)}>
                        <Github className="h-4 w-4 mr-2" />
                        GitHub
                      </Button>
                    )}
                    {plugin.homepage && (
                      <Button variant="outline" size="sm" onClick={() => openUrl(plugin.homepage)}>
                        <Globe className="h-4 w-4 mr-2" />
                        Website
                      </Button>
                    )}
                    {plugin.documentation && (
                      <Button variant="outline" size="sm" onClick={() => openUrl(plugin.documentation)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Documentation
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Requirements */}
            <div>
              <h3 className="font-semibold mb-2">{t('overview.requirements')}</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Cognia {plugin.minAppVersion || 'v1.0.0'} or higher
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {plugin.type === 'python' ? 'Python 3.9+' : 'Node.js 18+'}
                </li>
              </ul>
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="m-0 p-4 sm:p-6 space-y-6">
            <RatingBreakdown
              rating={plugin.rating}
              reviewCount={plugin.reviewCount}
              breakdown={plugin.ratingBreakdown}
            />
            
            <Separator />

            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t('reviews.title')}</h3>
              {!showReviewForm && !userReview && (
                <Button variant="outline" size="sm" onClick={() => setShowReviewForm(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t('reviews.writeReview')}
                </Button>
              )}
            </div>

            {/* User's existing review */}
            {userReview && (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <div className="text-xs font-medium text-primary mb-1">{t('reviews.yourReview')}</div>
                <div className="flex items-center gap-2 mb-1">
                  <RatingStars rating={userReview.rating} size="sm" />
                  <span className="text-xs text-muted-foreground">{userReview.date}</span>
                </div>
                <p className="text-sm text-muted-foreground">{userReview.content}</p>
              </div>
            )}

            {/* Review form */}
            {showReviewForm && !userReview && (
              <ReviewForm onSubmit={handleReviewSubmit} />
            )}

            {/* Reviews list */}
            <div className="space-y-3">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </TabsContent>

          {/* Changelog Tab */}
          <TabsContent value="changelog" className="m-0 p-4 sm:p-6 space-y-4">
            <h3 className="font-semibold">{t('changelog.title')}</h3>
            <div className="space-y-3">
              {changelog.map((entry) => (
                <ChangelogCard key={entry.version} entry={entry} />
              ))}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );

  if (variant === 'dialog') {
    return (
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{plugin.name}</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>{plugin.name}</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}

export default PluginDetailModal;
