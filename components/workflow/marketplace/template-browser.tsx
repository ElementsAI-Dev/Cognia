/**
 * Template Browser Component
 * 
 * Displays a grid of workflow templates with filtering and search capabilities
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Search, Filter, Star, Download, GitBranch } from 'lucide-react';
import { useTemplateMarketStore } from '@/stores/workflow/template-market-store';
import type { WorkflowTemplate } from '@/types/workflow/template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  } = useTemplateMarketStore();

  const { loadFromTemplate } = useWorkflowEditorStore();

  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'usage' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);

  const templates = getFilteredTemplates();

  const handleSearch = (value: string) => {
    setSearchInput(value);
    setSearchQuery(value);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setFilters({ category: category === 'all' ? undefined : category });
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

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b p-4">
          <h2 className="text-2xl font-bold mb-4">{t('title')}</h2>

          {/* Search and Filters */}
          <div className="flex gap-2 mb-4">
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
              <SelectTrigger className="w-[180px]">
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
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Filter className="h-12 w-12 mb-4" />
              <p>{t('noTemplates')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onPreview={() => handlePreview(template)}
                  onUse={() => handleUseTemplate(template)}
                  onClone={() => handleCloneTemplate(template)}
                  t={t}
                />
              ))}
            </div>
          )}
        </ScrollArea>

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
              <TemplatePreview template={previewTemplate} />
            )}
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
  t: (key: string) => string;
}

function TemplateCard({ template, onPreview, onUse, onClone, t }: TemplateCardProps) {
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
          {template.metadata.source === 'git' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <GitBranch className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Git repository</TooltipContent>
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
        </div>
      </CardContent>
    </Card>
  );
}
