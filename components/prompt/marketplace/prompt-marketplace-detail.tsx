'use client';

/**
 * PromptMarketplaceDetail - Detailed view of a marketplace prompt
 */

import { useState, useCallback } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import {
  Star,
  Download,
  Heart,
  Check,
  Copy,
  Share2,
  User,
  Calendar,
  Tag,
  Code,
  Eye,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  Sparkles,
  History,
  Shield,
  Trash2,
  Play,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { MarketplacePrompt, PromptReview, PromptAuthor } from '@/types/content/prompt-marketplace';
import { QUALITY_TIER_INFO } from '@/types/content/prompt-marketplace';
import { usePromptMarketplaceStore } from '@/stores/prompt/prompt-marketplace-store';
import { PromptPreviewDialog } from './prompt-preview-dialog';
import { toast } from '@/components/ui/sonner';

interface PromptMarketplaceDetailProps {
  prompt: MarketplacePrompt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewAuthor?: (author: PromptAuthor) => void;
}

export function PromptMarketplaceDetail({
  prompt,
  open,
  onOpenChange,
  onViewAuthor,
}: PromptMarketplaceDetailProps) {
  const t = useTranslations('promptMarketplace.detail');
  const format = useFormatter();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [reviews, setReviews] = useState<PromptReview[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const isInstalled = usePromptMarketplaceStore(state => 
    prompt ? state.isPromptInstalled(prompt.id) : false
  );
  const isFavorite = usePromptMarketplaceStore(state => 
    prompt ? state.isFavorite(prompt.id) : false
  );
  const addToFavorites = usePromptMarketplaceStore(state => state.addToFavorites);
  const removeFromFavorites = usePromptMarketplaceStore(state => state.removeFromFavorites);
  const installPrompt = usePromptMarketplaceStore(state => state.installPrompt);
  const uninstallPrompt = usePromptMarketplaceStore(state => state.uninstallPrompt);
  const fetchPromptReviews = usePromptMarketplaceStore(state => state.fetchPromptReviews);
  const submitReviewAction = usePromptMarketplaceStore(state => state.submitReview);
  const markReviewHelpful = usePromptMarketplaceStore(state => state.markReviewHelpful);
  const hasReviewed = usePromptMarketplaceStore(state => 
    prompt ? state.userActivity.reviewed.includes(prompt.id) : false
  );

  const handleInstall = useCallback(async () => {
    if (!prompt) return;
    setIsInstalling(true);
    try {
      await installPrompt(prompt);
      toast.success(t('installSuccess'));
    } catch (error) {
      toast.error(t('installFailed'));
      console.error(error);
    } finally {
      setIsInstalling(false);
    }
  }, [prompt, installPrompt, t]);

  const handleUninstall = useCallback(async () => {
    if (!prompt) return;
    setIsUninstalling(true);
    try {
      uninstallPrompt(prompt.id);
      toast.success(t('uninstallSuccess'));
      setShowUninstallConfirm(false);
    } catch (error) {
      toast.error(t('uninstallFailed'));
      console.error(error);
    } finally {
      setIsUninstalling(false);
    }
  }, [prompt, uninstallPrompt, t]);

  const handleFavoriteToggle = useCallback(() => {
    if (!prompt) return;
    if (isFavorite) {
      removeFromFavorites(prompt.id);
    } else {
      addToFavorites(prompt.id);
    }
  }, [prompt, isFavorite, addToFavorites, removeFromFavorites]);

  const handleCopyContent = useCallback(async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(t('copiedToClipboard'));
  }, [prompt, t]);

  const handleShare = useCallback(async () => {
    if (!prompt) return;
    const shareUrl = `${window.location.origin}/marketplace/prompt/${prompt.id}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success(t('shareLinkCopied'));
  }, [prompt, t]);

  const loadReviews = useCallback(async () => {
    if (!prompt) return;
    const reviewsList = await fetchPromptReviews(prompt.id);
    setReviews(reviewsList);
  }, [prompt, fetchPromptReviews]);

  const handleSubmitReview = useCallback(async () => {
    if (!prompt || userRating === 0) return;
    setIsSubmittingReview(true);
    try {
      await submitReviewAction(prompt.id, userRating, userReview);
      toast.success(t('reviewSubmitted'));
      setUserRating(0);
      setUserReview('');
      loadReviews();
    } catch (error) {
      toast.error(t('reviewFailed'));
      console.error(error);
    } finally {
      setIsSubmittingReview(false);
    }
  }, [prompt, userRating, userReview, submitReviewAction, t, loadReviews]);

  const handleMarkHelpful = useCallback(async (reviewId: string) => {
    await markReviewHelpful(reviewId);
    loadReviews();
  }, [markReviewHelpful, loadReviews]);

  if (!prompt) return null;

  const tierInfo = QUALITY_TIER_INFO[prompt.qualityTier];

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (date: Date): string => {
    return format.dateTime(new Date(date), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className="flex items-center justify-center w-14 h-14 rounded-xl text-2xl shrink-0"
              style={{ backgroundColor: `${prompt.color || '#6366f1'}20` }}
            >
              {prompt.icon || '📝'}
            </div>

            {/* Title & Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl">{prompt.name}</DialogTitle>
                <Badge
                  variant="secondary"
                  className="text-xs"
                  style={{ backgroundColor: `${tierInfo.color}20`, color: tierInfo.color }}
                >
                  {tierInfo.icon} {tierInfo.name}
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <button
                  className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  onClick={() => onViewAuthor?.(prompt.author)}
                >
                  <User className="h-3.5 w-3.5" />
                  <span className="hover:underline">{prompt.author.name}</span>
                  {prompt.author.verified && (
                    <Shield className="h-3.5 w-3.5 text-blue-500" />
                  )}
                </button>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(prompt.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <History className="h-3.5 w-3.5" />
                  <span>v{prompt.version}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="text-center p-2">
                <div className="flex items-center gap-1 justify-center">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-lg font-semibold">{prompt.rating.average.toFixed(1)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{prompt.rating.count} {t('ratings')}</div>
              </div>
              <div className="text-center p-2">
                <div className="flex items-center gap-1 justify-center">
                  <Download className="h-4 w-4" />
                  <span className="text-lg font-semibold">{formatNumber(prompt.stats.downloads)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{t('downloads')}</div>
              </div>
              <div className="text-center p-2">
                <div className="flex items-center gap-1 justify-center">
                  <Heart className="h-4 w-4" />
                  <span className="text-lg font-semibold">{formatNumber(prompt.stats.favorites)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{t('favorites')}</div>
              </div>
              <div className="text-center p-2">
                <div className="flex items-center gap-1 justify-center">
                  <Eye className="h-4 w-4" />
                  <span className="text-lg font-semibold">{formatNumber(prompt.stats.views)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{t('views')}</div>
              </div>
              {prompt.stats.successRate && (
                <div className="text-center p-2 col-span-2 sm:col-span-4">
                  <div className="flex items-center gap-1 justify-center">
                    <Sparkles className="h-4 w-4 text-green-500" />
                    <span className="text-lg font-semibold">{Math.round(prompt.stats.successRate * 100)}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{t('successRate')}</div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h4 className="font-medium mb-2">{t('description')}</h4>
              <p className="text-sm text-muted-foreground">{prompt.description}</p>
            </div>

            {/* Tags */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {t('tags')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {prompt.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tabs for Content, Variables, Reviews */}
            <Tabs defaultValue="content" onValueChange={(v) => v === 'reviews' && loadReviews()}>
              <TabsList className="w-full">
                <TabsTrigger value="content" className="flex-1">
                  <Code className="h-4 w-4 mr-1.5" />
                  {t('content')}
                </TabsTrigger>
                <TabsTrigger value="variables" className="flex-1">
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  {t('variables')} ({prompt.variables.length})
                </TabsTrigger>
                <TabsTrigger value="reviews" className="flex-1">
                  <ThumbsUp className="h-4 w-4 mr-1.5" />
                  {t('reviews')} ({prompt.reviewCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="mt-4">
                <div className="relative">
                  <pre
                    className={cn(
                      'p-4 bg-muted rounded-lg text-sm overflow-x-auto whitespace-pre-wrap',
                      !showFullContent && 'max-h-[200px] overflow-hidden'
                    )}
                  >
                    {prompt.content}
                  </pre>
                  {prompt.content.length > 500 && (
                    <div
                      className={cn(
                        'absolute bottom-0 left-0 right-0 flex justify-center pb-2',
                        !showFullContent && 'bg-gradient-to-t from-muted to-transparent pt-8'
                      )}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowFullContent(!showFullContent)}
                      >
                        {showFullContent ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            {t('showLess')}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            {t('showMore')}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="variables" className="mt-4">
                {prompt.variables.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('noVariables')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {prompt.variables.map((variable) => (
                      <div
                        key={variable.name}
                        className="p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                            {`{{${variable.name}}}`}
                          </code>
                          {variable.required && (
                            <Badge variant="destructive" className="text-xs">{t('required')}</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{variable.type || 'text'}</Badge>
                        </div>
                        {variable.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {variable.description}
                          </p>
                        )}
                        {variable.defaultValue && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('default')}: <code>{variable.defaultValue}</code>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reviews" className="mt-4">
                <div className="space-y-4">
                  {/* Rating Distribution */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold">{prompt.rating.average.toFixed(1)}</div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                'h-4 w-4',
                                star <= Math.round(prompt.rating.average)
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-muted-foreground'
                              )}
                            />
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {prompt.rating.count} ratings
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = prompt.rating.distribution[star as keyof typeof prompt.rating.distribution];
                          const percentage = prompt.rating.count > 0
                            ? (count / prompt.rating.count) * 100
                            : 0;
                          return (
                            <div key={star} className="flex items-center gap-2">
                              <span className="text-xs w-3">{star}</span>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-yellow-500 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Write Review */}
                  {!hasReviewed ? (
                    <div className="p-4 border rounded-lg space-y-3">
                      <h5 className="font-medium">{t('writeReview')}</h5>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setUserRating(star)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={cn(
                                'h-6 w-6 transition-colors',
                                star <= userRating
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-muted-foreground hover:text-yellow-400'
                              )}
                            />
                          </button>
                        ))}
                      </div>
                      <Textarea
                        placeholder={t('reviewPlaceholder')}
                        value={userReview}
                        onChange={(e) => setUserReview(e.target.value)}
                        rows={3}
                      />
                      <Button 
                        disabled={userRating === 0 || isSubmittingReview}
                        onClick={handleSubmitReview}
                      >
                        {isSubmittingReview ? t('submitting') : t('submitReview')}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 border rounded-lg bg-green-500/5 border-green-500/20">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" />
                        <span className="text-sm font-medium">{t('alreadyReviewed')}</span>
                      </div>
                    </div>
                  )}

                  {/* Reviews List */}
                  {reviews.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="font-medium">{t('userReviews')} ({reviews.length})</h5>
                      {reviews.map((review) => (
                        <div key={review.id} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{review.authorName}</span>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={cn(
                                      'h-3 w-3',
                                      star <= review.rating
                                        ? 'text-yellow-500 fill-yellow-500'
                                        : 'text-muted-foreground'
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format.relativeTime(new Date(review.createdAt))}
                            </span>
                          </div>
                          {review.content && (
                            <p className="text-sm text-muted-foreground">{review.content}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-muted-foreground"
                              onClick={() => handleMarkHelpful(review.id)}
                            >
                              <ThumbsUp className="h-3 w-3" />
                              {t('helpful')} ({review.helpful})
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Action Footer */}
        <div className="shrink-0 pt-4 border-t flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleFavoriteToggle}>
                <Heart
                  className={cn(
                    'h-4 w-4',
                    isFavorite && 'text-red-500 fill-red-500'
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isFavorite ? t('removeFromFavorites') : t('addToFavorites')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleCopyContent}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('copyPromptContent')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('sharePrompt')}</TooltipContent>
          </Tooltip>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowPreview(true)}
          >
            <Play className="h-4 w-4" />
            {t('tryPrompt')}
          </Button>

          <div className="flex-1" />

          {isInstalled ? (
            <>
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowUninstallConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                {t('uninstall')}
              </Button>
              <Button variant="secondary" className="gap-2">
                <Check className="h-4 w-4 text-green-500" />
                {t('installed')}
              </Button>
            </>
          ) : (
            <Button onClick={handleInstall} disabled={isInstalling} className="gap-2">
              <Download className="h-4 w-4" />
              {isInstalling ? t('installing') : t('installPrompt')}
            </Button>
          )}
        </div>
      </DialogContent>

      {/* Uninstall Confirmation Dialog */}
      <AlertDialog open={showUninstallConfirm} onOpenChange={setShowUninstallConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('uninstallConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('uninstallConfirmDesc', { name: prompt.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUninstall}
              disabled={isUninstalling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUninstalling ? t('uninstalling') : t('uninstall')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prompt Preview Dialog */}
      <PromptPreviewDialog
        prompt={prompt}
        open={showPreview}
        onOpenChange={setShowPreview}
      />
    </Dialog>
  );
}

export default PromptMarketplaceDetail;
