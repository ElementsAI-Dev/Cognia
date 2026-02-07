/**
 * Template Browser Component
 * 
 * Displays a grid of workflow templates with filtering and search capabilities
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Search, Filter, Star, Download, GitBranch, AlertCircle, Upload, Globe, Eye, EyeOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isTauri } from '@/lib/utils';
import { GitIntegrationPanel } from './git-integration-panel';
import { useTemplateMarketStore } from '@/stores/workflow/template-market-store';
import type { WorkflowTemplate } from '@/types/workflow/template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { PageLoading } from '@/components/ui/loading-states';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TemplatePreview } from './template-preview';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { toast } from 'sonner';

export function TemplateBrowser() {
  const t = useTranslations('marketplace');

  const {
    getFilteredTemplates,
    setSearchQuery,
    setFilters,
    categories,
    cloneTemplate,
    incrementUsage,
    setSelectedTemplate,
    initialize,
    isInitialized,
    isLoading,
    error,
    getFeaturedTemplates,
    getPopularTemplates,
    getRecentTemplates,
  } = useTemplateMarketStore();

  const { loadFromTemplate } = useWorkflowEditorStore();

  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'usage' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);
  const [displayCount, setDisplayCount] = useState<number>(12);

  // Initialize store on mount
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      initialize();
    }
  }, [isInitialized, isLoading, initialize]);

  const allTemplates = getFilteredTemplates();
  const templates = allTemplates.slice(0, displayCount);
  const hasMoreTemplates = allTemplates.length > displayCount;

  const isDefaultView = !searchInput && selectedCategory === 'all' && selectedSource === 'all' && minRating === 0;
  const featuredTemplates = isDefaultView ? getFeaturedTemplates(4) : [];
  const popularTemplates = isDefaultView ? getPopularTemplates(4) : [];
  const recentTemplates = isDefaultView ? getRecentTemplates(4) : [];

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + 12);
  };

  const handleSearch = (value: string) => {
    setSearchInput(value);
    setSearchQuery(value);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setFilters({ category: category === 'all' ? undefined : category });
  };

  const handleSourceChange = (source: string) => {
    setSelectedSource(source);
    if (source === 'all') {
      setFilters({ source: undefined });
    } else {
      setFilters({ source: [source as 'built-in' | 'user' | 'git' | 'community' | 'github'] });
    }
  };

  const handleMinRatingChange = (rating: string) => {
    const ratingNum = Number(rating);
    setMinRating(ratingNum);
    setFilters({ minRating: ratingNum > 0 ? ratingNum : undefined });
  };

  const handleSortChange = (value: string) => {
    setSortBy(value as 'name' | 'rating' | 'usage' | 'date');
    setFilters({ sortBy: value as 'name' | 'rating' | 'usage' | 'date' });
  };

  const handleSortOrderToggle = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    setFilters({ sortOrder: newOrder });
  };

  const handlePreview = (template: WorkflowTemplate) => {
    setPreviewTemplate(template);
    setSelectedTemplate(template.id);
  };

  const handleUseTemplate = (template: WorkflowTemplate) => {
    incrementUsage(template.id);
    try {
      loadFromTemplate(template.workflow);
      toast.success(t('templateLoaded'), {
        description: template.name,
      });
    } catch (error) {
      toast.error(t('templateLoadError'), {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleCloneTemplate = (template: WorkflowTemplate) => {
    const cloned = cloneTemplate(template.id, `${template.name} (Copy)`);
    if (cloned) {
      toast.success(t('templateCloned'), {
        description: cloned.name,
      });
    }
  };

  const { exportTemplate, importTemplate, rateTemplate, publishTemplate, unpublishTemplate } = useTemplateMarketStore();

  const [ratingDialogTemplate, setRatingDialogTemplate] = useState<WorkflowTemplate | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(0);

  const handleRateTemplate = (template: WorkflowTemplate) => {
    setRatingDialogTemplate(template);
    setRatingValue(0);
  };

  const handleSubmitRating = () => {
    if (ratingDialogTemplate && ratingValue > 0) {
      rateTemplate(ratingDialogTemplate.id, ratingValue);
      toast.success(t('ratingSubmitted') || 'Rating submitted');
      setRatingDialogTemplate(null);
      setRatingValue(0);
    }
  };

  const handleTogglePublish = (template: WorkflowTemplate) => {
    if (template.metadata.source === 'community') {
      const success = unpublishTemplate(template.id);
      if (success) {
        toast.success(t('unpublished') || 'Unpublished');
      }
    } else if (template.metadata.source === 'user') {
      const success = publishTemplate(template.id);
      if (success) {
        toast.success(t('published') || 'Published');
      }
    }
  };

  const handleExportTemplate = (template: WorkflowTemplate) => {
    const json = exportTemplate(template.id, 'json', true);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportTemplate = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = importTemplate(text, 'json');
        if (imported) {
          toast.success(t('importSuccess'), { description: imported.name });
        } else {
          toast.error(t('importError'));
        }
      } catch (error) {
        toast.error(t('importError'), {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };
    input.click();
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{t('title')}</h2>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleImportTemplate}>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('importTemplate')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('importDescription')}</TooltipContent>
              </Tooltip>
            </div>
          </div>

        </div>

        {/* Main content with tabs */}
        <Tabs defaultValue="browse" className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-4">
            <TabsList>
              <TabsTrigger value="browse">
                <Search className="h-4 w-4 mr-2" />
                {t('title')}
              </TabsTrigger>
              {isTauri() && (
                <TabsTrigger value="git">
                  <GitBranch className="h-4 w-4 mr-2" />
                  {t('git.title')}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="browse" className="flex-1 flex flex-col overflow-hidden mt-0">
            {/* Search and Filters */}
            <div className="p-4 border-b">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchPlaceholder')}
                    value={searchInput}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={t('category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allCategories')}</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedSource} onValueChange={handleSourceChange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder={t('filterBySource')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allSources')}</SelectItem>
                    <SelectItem value="built-in">{t('sourceBuiltIn')}</SelectItem>
                    <SelectItem value="user">{t('sourceUser')}</SelectItem>
                    <SelectItem value="git">{t('sourceGit')}</SelectItem>
                    <SelectItem value="community">{t('sourceCommunity')}</SelectItem>
                    <SelectItem value="github">{t('sourceGitHub')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={String(minRating)} onValueChange={handleMinRatingChange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder={t('minRating')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t('anyRating')}</SelectItem>
                    <SelectItem value="3">3+ ⭐</SelectItem>
                    <SelectItem value="4">4+ ⭐</SelectItem>
                    <SelectItem value="4.5">4.5+ ⭐</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={t('sortBy')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">{t('sortName')}</SelectItem>
                    <SelectItem value="rating">{t('sortRating')}</SelectItem>
                    <SelectItem value="usage">{t('sortUsage')}</SelectItem>
                    <SelectItem value="date">{t('sortDate')}</SelectItem>
                  </SelectContent>
                </Select>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleSortOrderToggle}
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('toggleSortOrder')}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Templates Grid */}
            <ScrollArea className="flex-1 p-4">
              {/* Discovery Sections - shown in default view */}
              {isDefaultView && !isLoading && !error && (featuredTemplates.length > 0 || popularTemplates.length > 0 || recentTemplates.length > 0) && (
                <div className="space-y-6 mb-6">
                  {featuredTemplates.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">{t('featuredTemplates') || 'Featured'}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {featuredTemplates.map((template) => (
                          <TemplateCard
                            key={`featured-${template.id}`}
                            template={template}
                            onPreview={() => handlePreview(template)}
                            onUse={() => handleUseTemplate(template)}
                            onClone={() => handleCloneTemplate(template)}
                            onRate={() => handleRateTemplate(template)}
                            onTogglePublish={() => handleTogglePublish(template)}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {popularTemplates.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">{t('popularTemplates') || 'Popular'}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {popularTemplates.map((template) => (
                          <TemplateCard
                            key={`popular-${template.id}`}
                            template={template}
                            onPreview={() => handlePreview(template)}
                            onUse={() => handleUseTemplate(template)}
                            onClone={() => handleCloneTemplate(template)}
                            onRate={() => handleRateTemplate(template)}
                            onTogglePublish={() => handleTogglePublish(template)}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {recentTemplates.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">{t('recentTemplates') || 'Recent'}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {recentTemplates.map((template) => (
                          <TemplateCard
                            key={`recent-${template.id}`}
                            template={template}
                            onPreview={() => handlePreview(template)}
                            onUse={() => handleUseTemplate(template)}
                            onClone={() => handleCloneTemplate(template)}
                            onRate={() => handleRateTemplate(template)}
                            onTogglePublish={() => handleTogglePublish(template)}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isLoading ? (
                <PageLoading title={t('loadingTemplates')} />
              ) : error ? (
                <Empty className="h-full">
                  <EmptyHeader>
                    <EmptyMedia>
                      <AlertCircle className="h-12 w-12 text-destructive" />
                    </EmptyMedia>
                    <EmptyTitle>{t('loadError')}</EmptyTitle>
                    <EmptyDescription>{error}</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button variant="outline" onClick={() => initialize()}>
                      {t('retry')}
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : templates.length === 0 ? (
                <Empty className="h-full">
                  <EmptyHeader>
                    <EmptyMedia>
                      <Filter className="h-12 w-12" />
                    </EmptyMedia>
                    <EmptyTitle>{t('noTemplates')}</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {templates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onPreview={() => handlePreview(template)}
                        onUse={() => handleUseTemplate(template)}
                        onClone={() => handleCloneTemplate(template)}
                        onRate={() => handleRateTemplate(template)}
                        onTogglePublish={() => handleTogglePublish(template)}
                        t={t}
                      />
                    ))}
                  </div>
                  {hasMoreTemplates && (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <p className="text-sm text-muted-foreground">
                        {t('showingOf', { count: templates.length, total: allTemplates.length })}
                      </p>
                      <Button variant="outline" onClick={handleLoadMore}>
                        {t('loadMore')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {isTauri() && (
            <TabsContent value="git" className="flex-1 overflow-hidden mt-0">
              <GitIntegrationPanel />
            </TabsContent>
          )}
        </Tabs>

        {/* Template Preview Dialog */}
        <Dialog
          open={!!previewTemplate}
          onOpenChange={(open) => {
            if (!open) {
              setPreviewTemplate(null);
              setSelectedTemplate(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {previewTemplate?.name}
              </DialogTitle>
            </DialogHeader>
            {previewTemplate && (
              <TemplatePreview
                template={previewTemplate}
                onUse={(tmpl) => {
                  handleUseTemplate(tmpl);
                  setPreviewTemplate(null);
                }}
                onClone={(tmpl) => {
                  handleCloneTemplate(tmpl);
                  setPreviewTemplate(null);
                }}
                onExport={handleExportTemplate}
                onRate={handleRateTemplate}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Rating Dialog */}
        <Dialog
          open={!!ratingDialogTemplate}
          onOpenChange={(open) => {
            if (!open) {
              setRatingDialogTemplate(null);
              setRatingValue(0);
            }
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('rateTemplate')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                {t('rateTemplateDescription')}: <strong>{ratingDialogTemplate?.name}</strong>
              </p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    variant={ratingValue >= value ? 'default' : 'outline'}
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => setRatingValue(value)}
                  >
                    <Star className={`h-5 w-5 ${ratingValue >= value ? 'fill-current' : ''}`} />
                  </Button>
                ))}
              </div>
              {ratingValue > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {t('yourRating')}: {ratingValue}/5
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRatingDialogTemplate(null);
                  setRatingValue(0);
                }}
              >
                {t('cancelAction') || 'Cancel'}
              </Button>
              <Button onClick={handleSubmitRating} disabled={ratingValue === 0}>
                {t('submitRating')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

interface TemplateCardProps {
  template: WorkflowTemplate;
  onPreview: () => void;
  onUse: () => void;
  onClone: () => void;
  onRate: () => void;
  onTogglePublish: () => void;
  t: (key: string) => string;
}

function TemplateCard({ template, onPreview, onUse, onClone, onRate, onTogglePublish, t }: TemplateCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="aspect-video bg-muted flex items-center justify-center relative">
        {template.metadata.thumbnail ? (
          <Image
            src={template.metadata.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="text-4xl">{template.workflow.icon || '📦'}</div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">{template.name}</h3>
          {template.metadata.isOfficial && (
            <Badge variant="default">{t('official')}</Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {template.description}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4" />
            <span>{template.metadata.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            <span>{template.metadata.usageCount}</span>
          </div>
          {(template.metadata.source === 'git' || template.metadata.source === 'github') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <GitBranch className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Git repository</TooltipContent>
            </Tooltip>
          )}
          {template.metadata.source === 'community' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <Globe className="h-4 w-4 text-blue-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent>{t('sourceCommunity')}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{template.tags.length - 3} {t('more')}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onPreview} className="flex-1">
            {t('previewBtn')}
          </Button>
          <Button size="sm" onClick={onUse} className="flex-1">
            {t('useTemplate')}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onClone}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('cloneTemplate')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onRate}>
                <Star className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('rateTemplate')}</TooltipContent>
          </Tooltip>
          {(template.metadata.source === 'user' || template.metadata.source === 'community') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onTogglePublish}>
                  {template.metadata.source === 'community' ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {template.metadata.source === 'community' ? t('unpublished') : t('publishTemplate')}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
