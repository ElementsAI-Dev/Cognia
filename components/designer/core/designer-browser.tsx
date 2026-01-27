'use client';

/**
 * Designer Browser Component
 * 
 * Main interface for browsing, managing, and selecting design templates
 * Modeled after SkillPanel for consistent UX
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Wand2,
  Plus,
  Search,
  Grid3X3,
  List,
  X,
  ChevronDown,
  Check,
  ArrowLeft,
  Layout,
  LayoutDashboard,
  CreditCard,
  Type,
  Box,
  Palette,
  ShoppingCart,
  FileText,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '@/components/ui/input-group';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/layout/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  DESIGNER_TEMPLATES,
  FRAMEWORK_OPTIONS,
  type DesignerTemplate,
  type FrameworkType,
} from '@/lib/designer';
import { DesignerCard } from './designer-card';

// Category options with icons
const CATEGORY_OPTIONS: Array<{ value: string; labelKey: string; icon: React.ReactNode }> = [
  { value: 'all', labelKey: 'allCategories', icon: <Wand2 className="h-4 w-4" /> },
  { value: 'Landing', labelKey: 'categoryLanding', icon: <Layout className="h-4 w-4" /> },
  { value: 'Dashboard', labelKey: 'categoryDashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { value: 'Form', labelKey: 'categoryForm', icon: <Type className="h-4 w-4" /> },
  { value: 'Pricing', labelKey: 'categoryPricing', icon: <CreditCard className="h-4 w-4" /> },
  { value: 'E-commerce', labelKey: 'categoryEcommerce', icon: <ShoppingCart className="h-4 w-4" /> },
  { value: 'Portfolio', labelKey: 'categoryPortfolio', icon: <Palette className="h-4 w-4" /> },
  { value: 'Blog', labelKey: 'categoryBlog', icon: <FileText className="h-4 w-4" /> },
  { value: 'Marketing', labelKey: 'categoryMarketing', icon: <Sparkles className="h-4 w-4" /> },
  { value: 'Blank', labelKey: 'categoryBlank', icon: <Box className="h-4 w-4" /> },
];

type ViewMode = 'grid' | 'list';

interface DesignerBrowserProps {
  className?: string;
  onSelectTemplate?: (template: DesignerTemplate) => void;
  onCreateNew?: () => void;
  showBackButton?: boolean;
}

export function DesignerBrowser({
  className,
  onSelectTemplate,
  onCreateNew,
  showBackButton = true,
}: DesignerBrowserProps) {
  const t = useTranslations('designer');

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [frameworkFilter, setFrameworkFilter] = useState<FrameworkType | 'all'>('all');

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    let result = [...DESIGNER_TEMPLATES];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter);
    }

    // Framework filter
    if (frameworkFilter !== 'all') {
      result = result.filter((t) => t.framework === frameworkFilter);
    }

    // Sort by name
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [searchQuery, categoryFilter, frameworkFilter]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: DESIGNER_TEMPLATES.length };
    for (const template of DESIGNER_TEMPLATES) {
      counts[template.category] = (counts[template.category] || 0) + 1;
    }
    return counts;
  }, []);

  // Handlers
  const handleSelectTemplate = useCallback(
    (template: DesignerTemplate) => {
      onSelectTemplate?.(template);
    },
    [onSelectTemplate]
  );

  const handleExportTemplate = useCallback((template: DesignerTemplate) => {
    const blob = new Blob([template.code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.id}.${template.framework === 'html' ? 'html' : 'jsx'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('all');
    setFrameworkFilter('all');
  }, []);

  const hasActiveFilters =
    searchQuery || categoryFilter !== 'all' || frameworkFilter !== 'all';

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col h-full', className)}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {showBackButton && (
              <Link href="/">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Wand2 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{t('templateLibrary')}</h2>
            <Badge variant="secondary" className="ml-2">
              {DESIGNER_TEMPLATES.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {onCreateNew && (
              <Button size="sm" onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-1" />
                {t('newDesign')}
              </Button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 p-4 border-b bg-muted/30">
          {/* Search and View Toggle */}
          <div className="flex items-center gap-2">
            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start">
                <Search className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t('searchTemplates')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>

            <div className="flex items-center border rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-9 w-9 rounded-r-none"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('gridView')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-9 w-9 rounded-l-none"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('listView')}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  {CATEGORY_OPTIONS.find((c) => c.value === categoryFilter)?.icon}
                  <span className="ml-1.5">
                    {categoryFilter === 'all' ? t('allCategories') : categoryFilter}
                  </span>
                  <ChevronDown className="ml-1.5 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setCategoryFilter(option.value)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {option.icon}
                      <span>{option.value === 'all' ? t('allCategories') : option.value}</span>
                    </div>
                    {categoryCounts[option.value] !== undefined && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {categoryCounts[option.value]}
                      </Badge>
                    )}
                    {categoryFilter === option.value && (
                      <Check className="h-4 w-4 ml-2" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Framework Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  {frameworkFilter === 'all' ? t('allFrameworks') : frameworkFilter}
                  <ChevronDown className="ml-1.5 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFrameworkFilter('all')}>
                  {t('allFrameworks')}
                  {frameworkFilter === 'all' && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                {FRAMEWORK_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setFrameworkFilter(option.value)}
                  >
                    {option.label}
                    {frameworkFilter === option.value && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                {t('clearFilters')}
              </Button>
            )}

            {/* Results count */}
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground">
              {filteredTemplates.length} {t('templatesFound')}
            </span>
          </div>
        </div>

        {/* Templates List */}
        <ScrollArea className="flex-1 min-h-0 overflow-hidden">
          <div className="p-4 overflow-hidden">
            {filteredTemplates.length === 0 ? (
              <EmptyState
                icon={Wand2}
                title={t('noTemplatesFound')}
                description={hasActiveFilters ? t('noTemplatesMatchFilters') : t('noTemplatesYet')}
                actions={
                  hasActiveFilters
                    ? [
                        {
                          label: t('clearFilters'),
                          onClick: clearFilters,
                          variant: 'outline',
                        },
                      ]
                    : onCreateNew
                    ? [
                        {
                          label: t('createFirstDesign'),
                          onClick: onCreateNew,
                          icon: Plus,
                        },
                      ]
                    : undefined
                }
              />
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <DesignerCard
                    key={template.id}
                    template={template}
                    variant="default"
                    onSelect={handleSelectTemplate}
                    onPreview={handleSelectTemplate}
                    onExport={handleExportTemplate}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2 overflow-hidden">
                {filteredTemplates.map((template) => (
                  <DesignerCard
                    key={template.id}
                    template={template}
                    variant="list"
                    onSelect={handleSelectTemplate}
                    onPreview={handleSelectTemplate}
                    onExport={handleExportTemplate}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}

export default DesignerBrowser;
