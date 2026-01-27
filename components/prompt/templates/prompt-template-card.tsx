"use client";

/**
 * PromptTemplateCard - Card component for displaying a prompt template
 * Modern design with glassmorphism, smooth animations, and responsive layout
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  MoreHorizontal,
  Pencil,
  Copy,
  MessageSquare,
  Trash2,
  Zap,
  Clock,
  Target,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PromptTemplate } from '@/types/content/prompt-template';
import { PromptFeedbackCollector } from './prompt-feedback-collector';

interface PromptTemplateCardProps {
  template: PromptTemplate;
  onEdit: (template: PromptTemplate) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onFeedback?: (template: PromptTemplate) => void;
  onUse?: (template: PromptTemplate) => void;
}

export function PromptTemplateCard({
  template,
  onEdit,
  onDuplicate,
  onDelete,
  onFeedback,
  onUse,
}: PromptTemplateCardProps) {
  const t = useTranslations('promptTemplate.card');
  const [showFeedback, setShowFeedback] = useState(false);

  const iconColor = template.meta?.color || '#6366f1';

  return (
    <Card
      className={cn(
        'group relative h-full overflow-hidden transition-all duration-300',
        'border-border/50 bg-card/60 backdrop-blur-sm',
        'hover:bg-card hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5',
        'hover:-translate-y-1'
      )}
    >
      {/* Corner Accent */}
      <div
        className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40"
        style={{ backgroundColor: iconColor }}
      />

      {/* View Detail Arrow */}
      <div className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-4px] group-hover:translate-x-0">
        <div className="p-1.5 rounded-full bg-primary/10 text-primary">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </div>

      <CardContent className="p-5 space-y-4 relative z-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl text-xl shrink-0 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:rotate-3"
              style={{
                backgroundColor: `${iconColor}15`,
                color: iconColor,
              }}
            >
              {template.meta?.icon ?? '📝'}
            </div>

            {/* Title & Category */}
            <div className="flex-1 min-w-0 py-0.5">
              <h3 className="font-semibold text-base leading-tight truncate group-hover:text-primary transition-colors">
                {template.name}
              </h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {template.category && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-2 py-0 h-5 font-medium bg-secondary/60"
                  >
                    {template.category}
                  </Badge>
                )}
                {template.source === 'builtin' && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5 font-medium border-blue-200 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-400"
                  >
                    {t('builtIn')}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="template-actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit?.(template)} className="gap-2">
                <Pencil className="h-4 w-4" /> {t('edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate?.(template.id)} className="gap-2">
                <Copy className="h-4 w-4" /> {t('duplicate')}
              </DropdownMenuItem>
              {onFeedback && (
                <DropdownMenuItem onClick={() => onFeedback?.(template)} className="gap-2">
                  <MessageSquare className="h-4 w-4" /> {t('feedback')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                onClick={() => onDelete?.(template.id)}
              >
                <Trash2 className="h-4 w-4" /> {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {template.description}
          </p>
        )}

        {/* Content Preview */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
          <p className="text-xs text-muted-foreground line-clamp-2 font-mono">
            {template.content || t('noContent')}
          </p>
        </div>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {template.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-secondary/50 text-secondary-foreground border border-transparent group-hover:border-border/50 transition-all"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 4 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] text-muted-foreground bg-muted/50">
                +{template.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-4 pt-2 border-t border-border/40 text-xs text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                <span>{template.targets?.join(', ') || 'chat'}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{t('targetTooltip')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                <span className="font-medium">{template.usageCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{t('usedCount', { count: template.usageCount })}</TooltipContent>
          </Tooltip>

          {template.updatedAt && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 ml-auto">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {new Date(template.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{t('lastUpdated')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>

      {/* Footer with Use Button */}
      {onUse && (
        <CardFooter className="p-4 pt-0">
          <Button
            size="sm"
            className={cn(
              'w-full gap-2 font-medium shadow-sm transition-all duration-300',
              'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
            )}
            onClick={() => onUse?.(template)}
          >
            <Zap className="h-4 w-4" />
            {t('useTemplate')}
          </Button>
        </CardFooter>
      )}

      {/* Feedback Section */}
      {showFeedback && (
        <div className="px-5 pb-5 pt-0">
          <div className="pt-3 border-t">
            <PromptFeedbackCollector
              templateId={template.id}
              templateName={template.name}
              variant="compact"
              onFeedbackSubmitted={() => setShowFeedback(false)}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
