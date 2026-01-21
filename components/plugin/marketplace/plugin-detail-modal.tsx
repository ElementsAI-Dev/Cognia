'use client';

/**
 * Plugin Detail Modal - Full plugin details with screenshots, reviews, changelog
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Star,
  Download,
  Tag,
  CheckCircle,
  ExternalLink,
  Heart,
  MessageSquare,
  Loader2,
  Github,
  Globe,
  FileText,
  AlertTriangle,
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
import { cn } from '@/lib/utils';
import type { MarketplacePlugin } from './plugin-marketplace';

// =============================================================================
// Types
// =============================================================================

interface PluginDetailModalProps {
  plugin: MarketplacePlugin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall?: (pluginId: string) => Promise<void>;
  variant?: 'dialog' | 'sheet';
}

interface Review {
  id: string;
  author: string;
  avatar?: string;
  rating: number;
  date: string;
  content: string;
  helpful: number;
}

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  breaking?: boolean;
}

// =============================================================================
// Mock Data
// =============================================================================

const MOCK_REVIEWS: Review[] = [
  {
    id: '1',
    author: 'John Developer',
    rating: 5,
    date: '2024-01-18',
    content: 'Excellent plugin! Really improved my workflow. The AI features are incredibly accurate and helpful.',
    helpful: 24,
  },
  {
    id: '2',
    author: 'Sarah Designer',
    rating: 4,
    date: '2024-01-15',
    content: 'Great functionality, but could use some UI improvements. Overall very useful for daily tasks.',
    helpful: 12,
  },
  {
    id: '3',
    author: 'Mike Engineer',
    rating: 5,
    date: '2024-01-10',
    content: 'This is exactly what I needed. Integration was seamless and it just works. Highly recommended!',
    helpful: 18,
  },
];

const MOCK_CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.1.0',
    date: '2024-01-15',
    changes: [
      'Added new AI-powered suggestions',
      'Improved performance by 40%',
      'Fixed bug with large files',
      'Updated UI components',
    ],
  },
  {
    version: '2.0.0',
    date: '2024-01-01',
    changes: [
      'Complete redesign of the interface',
      'New configuration system',
      'Breaking: Changed API endpoints',
    ],
    breaking: true,
  },
  {
    version: '1.5.2',
    date: '2023-12-15',
    changes: [
      'Fixed memory leak issue',
      'Added support for dark mode',
      'Minor bug fixes',
    ],
  },
];

// =============================================================================
// Sub Components
// =============================================================================

function RatingStars({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
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
              : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

function RatingBreakdown({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  const breakdown = [
    { stars: 5, percentage: 70 },
    { stars: 4, percentage: 20 },
    { stars: 3, percentage: 7 },
    { stars: 2, percentage: 2 },
    { stars: 1, percentage: 1 },
  ];

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
          {breakdown.map(({ stars, percentage }) => (
            <div key={stars} className="flex items-center gap-2 text-xs">
              <span className="w-3">{stars}</span>
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <Progress value={percentage} className="h-1.5 flex-1" />
              <span className="w-8 text-muted-foreground">{percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
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
        <Button variant="ghost" size="sm" className="h-6 text-xs">
          Helpful ({review.helpful})
        </Button>
      </div>
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
            <span className="text-primary">•</span>
            <span>{change}</span>
          </li>
        ))}
      </ul>
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
  variant = 'sheet',
}: PluginDetailModalProps) {
  const t = useTranslations('pluginDetail');
  const [isInstalling, setIsInstalling] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const handleInstall = async () => {
    if (onInstall && plugin) {
      setIsInstalling(true);
      try {
        await onInstall(plugin.id);
      } finally {
        setIsInstalling(false);
      }
    }
  };

  if (!plugin) return null;

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
              <span>{plugin.author.name}</span>
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
                <span>{(plugin.downloadCount / 1000).toFixed(0)}k</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            className="flex-1 sm:flex-none"
            onClick={handleInstall}
            disabled={isInstalling || plugin.installed}
          >
            {isInstalling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : plugin.installed ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isInstalling ? t('installing') : plugin.installed ? t('installed') : t('install')}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFavorite(!isFavorite)}
          >
            <Heart className={cn('h-4 w-4', isFavorite && 'fill-red-500 text-red-500')} />
          </Button>
          <Button variant="outline" size="icon">
            <ExternalLink className="h-4 w-4" />
          </Button>
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
                <div className="text-sm">MIT</div>
              </div>
            </div>

            <Separator />

            {/* Links */}
            <div>
              <h3 className="font-semibold mb-3">{t('overview.links')}</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  <Github className="h-4 w-4 mr-2" />
                  GitHub
                </Button>
                <Button variant="outline" size="sm">
                  <Globe className="h-4 w-4 mr-2" />
                  Website
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Documentation
                </Button>
              </div>
            </div>

            {/* Requirements */}
            <div>
              <h3 className="font-semibold mb-2">{t('overview.requirements')}</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Cognia v1.0.0 or higher
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
            <RatingBreakdown rating={plugin.rating} reviewCount={plugin.reviewCount} />
            
            <Separator />

            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t('reviews.title')}</h3>
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                {t('reviews.writeReview')}
              </Button>
            </div>

            <div className="space-y-3">
              {MOCK_REVIEWS.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </TabsContent>

          {/* Changelog Tab */}
          <TabsContent value="changelog" className="m-0 p-4 sm:p-6 space-y-4">
            <h3 className="font-semibold">{t('changelog.title')}</h3>
            <div className="space-y-3">
              {MOCK_CHANGELOG.map((entry) => (
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
      <Dialog open={open} onOpenChange={onOpenChange}>
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
    <Sheet open={open} onOpenChange={onOpenChange}>
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
