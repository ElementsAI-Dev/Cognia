'use client';

/**
 * SuggestionItem - Individual suggestion component with inline diff preview
 */

import { memo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Bug,
  Sparkles,
  MessageSquare,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CanvasSuggestion } from '@/types';

interface SuggestionItemProps {
  suggestion: CanvasSuggestion;
  onApply: (id: string) => void;
  onReject: (id: string) => void;
  className?: string;
}

const TYPE_ICONS = {
  fix: Bug,
  improve: Sparkles,
  comment: MessageSquare,
  edit: Edit3,
};

const TYPE_COLORS = {
  fix: 'text-red-500 bg-red-50 dark:bg-red-950/30',
  improve: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30',
  comment: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30',
  edit: 'text-green-500 bg-green-50 dark:bg-green-950/30',
};

export const SuggestionItem = memo(function SuggestionItem({
  suggestion,
  onApply,
  onReject,
  className,
}: SuggestionItemProps) {
  const t = useTranslations('canvas');
  const [expanded, setExpanded] = useState(false);

  const Icon = TYPE_ICONS[suggestion.type] || Edit3;
  const colorClass = TYPE_COLORS[suggestion.type] || TYPE_COLORS.edit;

  const hasCodeDiff = suggestion.originalText && suggestion.suggestedText;

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 space-y-2 transition-all',
        suggestion.status === 'accepted' && 'opacity-50',
        suggestion.status === 'rejected' && 'opacity-30 line-through',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className={cn('p-1.5 rounded-md shrink-0', colorClass)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px]">
              {suggestion.type}
            </Badge>
            {suggestion.range && (
              <span className="text-[10px] text-muted-foreground">
                {t('lines')} {suggestion.range.startLine}
                {suggestion.range.endLine !== suggestion.range.startLine &&
                  `-${suggestion.range.endLine}`}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed">{suggestion.explanation}</p>
        </div>
      </div>

      {/* Code diff preview */}
      {hasCodeDiff && (
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs w-full justify-between"
            onClick={() => setExpanded(!expanded)}
          >
            <span>{t('viewChanges')}</span>
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
          {expanded && (
            <div className="rounded-md border bg-muted/30 p-2 space-y-2 text-xs font-mono">
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground font-sans">
                  {t('original')}:
                </div>
                <pre className="p-2 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 whitespace-pre-wrap overflow-x-auto">
                  {suggestion.originalText}
                </pre>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground font-sans">
                  {t('suggested')}:
                </div>
                <pre className="p-2 rounded bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 whitespace-pre-wrap overflow-x-auto">
                  {suggestion.suggestedText}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {suggestion.status === 'pending' && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            className="h-7 flex-1"
            onClick={() => onApply(suggestion.id)}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {t('apply')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 flex-1"
            onClick={() => onReject(suggestion.id)}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            {t('dismiss')}
          </Button>
        </div>
      )}

      {/* Status badge for applied/rejected */}
      {suggestion.status !== 'pending' && (
        <div className="flex justify-center">
          <Badge
            variant={suggestion.status === 'accepted' ? 'default' : 'secondary'}
            className="text-[10px]"
          >
            {suggestion.status === 'accepted' ? t('applied') : t('dismissed')}
          </Badge>
        </div>
      )}
    </div>
  );
});

export default SuggestionItem;
