'use client';

/**
 * Template Selector - Reusable component for selecting LaTeX templates
 * Used in both Template Dialog and Templates Tab to eliminate code duplication
 */

import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LaTeXTemplate } from '@/lib/latex/templates';

export interface TemplateSelectorProps {
  templates: LaTeXTemplate[];
  templateCategories: { category: string; count: number }[];
  onSelect: (templateId: string) => void;
  variant?: 'compact' | 'expanded';
  className?: string;
}

export function TemplateSelector({
  templates,
  templateCategories,
  onSelect,
  variant = 'compact',
  className,
}: TemplateSelectorProps) {

  const gridCols =
    variant === 'expanded'
      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-2';

  const padding = variant === 'expanded' ? 'p-4' : 'p-3';

  return (
    <div className={cn('space-y-6', className)}>
      {templateCategories.map(({ category, count }) => (
        <div key={category}>
          <h3 className="font-medium mb-3 capitalize flex items-center gap-2">
            {category}
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          </h3>
          <div className={cn('grid gap-3', gridCols)}>
            {templates
              .filter((template) => template.category === category)
              .map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onSelect(template.id)}
                  className={cn(
                    'text-left rounded-lg border transition-colors',
                    'hover:border-primary hover:bg-accent',
                    padding
                  )}
                >
                  <div className={cn('font-medium', variant === 'compact' ? 'text-sm' : '')}>
                    {template.name}
                  </div>
                  <div
                    className={cn(
                      'text-muted-foreground mt-1 line-clamp-2',
                      variant === 'compact' ? 'text-xs' : 'text-sm'
                    )}
                  >
                    {template.description}
                  </div>
                  {template.tags && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export interface TemplateDialogContentProps {
  templates: LaTeXTemplate[];
  templateCategories: { category: string; count: number }[];
  onSelect: (templateId: string) => void;
}

export function TemplateDialogContent({
  templates,
  templateCategories,
  onSelect,
}: TemplateDialogContentProps) {
  return (
    <ScrollArea className="h-[500px] pr-4">
      <TemplateSelector
        templates={templates}
        templateCategories={templateCategories}
        onSelect={onSelect}
        variant="compact"
      />
    </ScrollArea>
  );
}

export default TemplateSelector;
