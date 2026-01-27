'use client';

/**
 * Designer Card Component
 * 
 * Card view for displaying template information with thumbnail preview
 * Modeled after SkillCard component
 */

import { memo, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  MoreVertical,
  Eye,
  Edit,
  Copy,
  Download,
  Trash2,
  Layout,
  LayoutDashboard,
  CreditCard,
  Type,
  Box,
  Palette,
  ShoppingCart,
  Users,
  FileText,
  Sparkles,
  Code,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { DesignerTemplate } from '@/lib/designer';

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Landing': <Layout className="h-4 w-4" />,
  'Dashboard': <LayoutDashboard className="h-4 w-4" />,
  'Form': <Type className="h-4 w-4" />,
  'Pricing': <CreditCard className="h-4 w-4" />,
  'E-commerce': <ShoppingCart className="h-4 w-4" />,
  'Portfolio': <Palette className="h-4 w-4" />,
  'Blog': <FileText className="h-4 w-4" />,
  'Contact': <Users className="h-4 w-4" />,
  'Blank': <Box className="h-4 w-4" />,
  'Marketing': <Sparkles className="h-4 w-4" />,
  'Code': <Code className="h-4 w-4" />,
};

// Category colors mapping
const CATEGORY_COLORS: Record<string, string> = {
  'Landing': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'Dashboard': 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  'Form': 'bg-green-500/10 text-green-600 dark:text-green-400',
  'Pricing': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'E-commerce': 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  'Portfolio': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  'Blog': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  'Contact': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  'Blank': 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  'Marketing': 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  'Code': 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

// Framework badge colors
const FRAMEWORK_COLORS: Record<string, string> = {
  'react': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  'vue': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  'html': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
};

export interface DesignerCardProps {
  template: DesignerTemplate;
  variant?: 'default' | 'compact' | 'list';
  selected?: boolean;
  onSelect?: (template: DesignerTemplate) => void;
  onPreview?: (template: DesignerTemplate) => void;
  onEdit?: (template: DesignerTemplate) => void;
  onDuplicate?: (template: DesignerTemplate) => void;
  onExport?: (template: DesignerTemplate) => void;
  onDelete?: (template: DesignerTemplate) => void;
  showActions?: boolean;
  className?: string;
}

export const DesignerCard = memo(function DesignerCard({
  template,
  variant = 'default',
  selected = false,
  onSelect,
  onPreview,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
  showActions = true,
  className,
}: DesignerCardProps) {
  const t = useTranslations('designer');

  const handleCardClick = useCallback(() => {
    if (onSelect) {
      onSelect(template);
    } else if (onPreview) {
      onPreview(template);
    }
  }, [template, onSelect, onPreview]);

  const categoryIcon = CATEGORY_ICONS[template.category] || <Box className="h-4 w-4" />;
  const categoryColor = CATEGORY_COLORS[template.category] || CATEGORY_COLORS['Blank'];
  const frameworkColor = FRAMEWORK_COLORS[template.framework] || FRAMEWORK_COLORS['react'];

  // Generate a simple visual preview from code
  const previewContent = useMemo(() => {
    // Extract key visual elements from code for preview
    const hasGradient = template.code.includes('gradient');
    const hasGrid = template.code.includes('grid');
    const hasForm = template.code.includes('input') || template.code.includes('form');
    const hasCard = template.code.includes('card') || template.code.includes('rounded');
    const hasButton = template.code.includes('button');
    const hasImage = template.code.includes('img') || template.code.includes('image');

    return { hasGradient, hasGrid, hasForm, hasCard, hasButton, hasImage };
  }, [template.code]);

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card
        className={cn(
          'group cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
          selected && 'ring-2 ring-primary border-primary',
          className
        )}
        onClick={handleCardClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div className={cn('p-1.5 rounded-md shrink-0', categoryColor)}>
              {categoryIcon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{template.name}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {template.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // List variant
  if (variant === 'list') {
    return (
      <div
        className={cn(
          'group flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/50 overflow-hidden',
          selected && 'ring-2 ring-primary border-primary bg-accent/30',
          className
        )}
        onClick={handleCardClick}
      >
        {/* Thumbnail */}
        <div className="w-20 h-14 rounded-md bg-gradient-to-br from-muted to-muted/50 shrink-0 overflow-hidden flex items-center justify-center relative">
          {template.thumbnail ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={template.thumbnail}
              alt={template.name}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <>
              <div className={cn('absolute inset-0 opacity-20', previewContent.hasGradient && 'bg-gradient-to-br from-primary/40 to-secondary/40')} />
              <div className={cn('p-2 rounded-md z-10', categoryColor)}>
                {categoryIcon}
              </div>
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{template.name}</h4>
            <Badge variant="outline" className={cn('text-xs shrink-0', frameworkColor)}>
              {template.framework}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {template.description}
          </p>
        </div>

        {showActions && (
          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onPreview?.(template)}>
                  <Eye className="h-4 w-4 mr-2" />
                  {t('preview')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(template)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate?.(template)}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('duplicate')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.(template)}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('export')}
                </DropdownMenuItem>
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(template)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    );
  }

  // Default variant - full card with thumbnail preview
  return (
    <TooltipProvider>
      <Card
      className={cn(
        'group cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
        selected && 'ring-2 ring-primary border-primary',
        className
      )}
      onClick={handleCardClick}
    >
      {/* Thumbnail Preview */}
      <div className="relative aspect-[16/10] bg-gradient-to-br from-muted to-muted/50 rounded-t-lg overflow-hidden">
        {/* Actual thumbnail image if available */}
        {template.thumbnail ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={template.thumbnail}
              alt={template.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            {/* Overlay gradient for better text contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </>
        ) : (
          /* Fallback: Visual preview elements */
          <div className="absolute inset-0 p-3">
            {/* Simulated preview layout */}
            <div className="h-full w-full flex flex-col gap-1.5">
              {/* Header bar */}
              <div className="flex items-center gap-2 h-3">
                <div className="w-3 h-3 rounded-sm bg-primary/20" />
                <div className="flex-1 h-2 rounded-sm bg-muted-foreground/10" />
                <div className="w-8 h-2 rounded-sm bg-primary/30" />
              </div>
              
              {/* Content area */}
              <div className="flex-1 flex gap-2">
                {previewContent.hasGrid ? (
                  <div className="flex-1 grid grid-cols-3 gap-1">
                    <div className="bg-muted-foreground/10 rounded-sm" />
                    <div className="bg-muted-foreground/10 rounded-sm" />
                    <div className="bg-muted-foreground/10 rounded-sm" />
                    <div className="bg-muted-foreground/10 rounded-sm" />
                    <div className="bg-muted-foreground/10 rounded-sm" />
                    <div className="bg-muted-foreground/10 rounded-sm" />
                  </div>
                ) : (
                  <>
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="h-3 w-3/4 rounded-sm bg-muted-foreground/15" />
                      <div className="h-2 w-full rounded-sm bg-muted-foreground/10" />
                      <div className="h-2 w-2/3 rounded-sm bg-muted-foreground/10" />
                      {previewContent.hasButton && (
                        <div className="h-3 w-12 rounded-sm bg-primary/30 mt-1" />
                      )}
                    </div>
                    {previewContent.hasImage && (
                      <div className="w-1/3 bg-muted-foreground/10 rounded-sm" />
                    )}
                  </>
                )}
              </div>

              {/* Form elements if applicable */}
              {previewContent.hasForm && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="h-2.5 w-full rounded-sm bg-background/50 border border-muted-foreground/10" />
                  <div className="h-2.5 w-full rounded-sm bg-background/50 border border-muted-foreground/10" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Gradient overlay for gradient templates (only for fallback preview) */}
        {!template.thumbnail && previewContent.hasGradient && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
        )}

        {/* Category icon overlay */}
        <div className="absolute bottom-2 right-2">
          <div className={cn('p-1.5 rounded-md backdrop-blur-sm', categoryColor)}>
            {categoryIcon}
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">
              {template.name}
            </CardTitle>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {template.category}
              </Badge>
              <Badge variant="outline" className={cn('text-xs', frameworkColor)}>
                {template.framework}
              </Badge>
            </div>
          </div>

          {showActions && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>{t('more')}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onPreview?.(template)}>
                  <Eye className="h-4 w-4 mr-2" />
                  {t('preview')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(template)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate?.(template)}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('duplicate')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.(template)}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('export')}
                </DropdownMenuItem>
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(template)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <CardDescription className="line-clamp-2 text-sm">
          {template.description}
        </CardDescription>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
});

export default DesignerCard;
