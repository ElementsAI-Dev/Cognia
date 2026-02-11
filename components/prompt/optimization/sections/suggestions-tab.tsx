'use client';

import { useTranslations } from 'next-intl';
import {
  Wand2,
  Lightbulb,
  Zap,
  Brain,
  BarChart3,
  GitCompare,
  AlertTriangle,
  ListChecks,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Loader } from '@/components/ai-elements/loader';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  structure: <ListChecks className="h-3.5 w-3.5" />,
  clarity: <Eye className="h-3.5 w-3.5" />,
  specificity: <Zap className="h-3.5 w-3.5" />,
  context: <Brain className="h-3.5 w-3.5" />,
  formatting: <BarChart3 className="h-3.5 w-3.5" />,
  variables: <GitCompare className="h-3.5 w-3.5" />,
  examples: <Lightbulb className="h-3.5 w-3.5" />,
  constraints: <AlertTriangle className="h-3.5 w-3.5" />,
};

interface Suggestion {
  id: string;
  description: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  confidence?: number;
  suggestedText?: string;
}

interface SuggestionsTabProps {
  allSuggestions: Suggestion[];
  selectedSuggestions: Set<string>;
  isOptimizing: boolean;
  onToggleSuggestion: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onOptimize: () => void;
  onBack: () => void;
}

export function SuggestionsTab({
  allSuggestions,
  selectedSuggestions,
  isOptimizing,
  onToggleSuggestion,
  onSelectAll,
  onDeselectAll,
  onOptimize,
  onBack,
}: SuggestionsTabProps) {
  const t = useTranslations('promptSelfOptimizer');
  const tCommon = useTranslations('common');

  return (
    <>
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onSelectAll}>
                {t('selectAll')}
              </Button>
              <Button variant="outline" size="sm" onClick={onDeselectAll}>
                {t('deselectAll')}
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">
              {selectedSuggestions.size} / {allSuggestions.length} {t('selected')}
            </span>
          </div>

          <Separator />

          {/* Suggestions List */}
          <div className="space-y-2">
            {allSuggestions.map((suggestion) => (
              <Card
                key={suggestion.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/50',
                  selectedSuggestions.has(suggestion.id) && 'border-primary bg-primary/5'
                )}
                onClick={() => onToggleSuggestion(suggestion.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedSuggestions.has(suggestion.id)}
                      onCheckedChange={() => onToggleSuggestion(suggestion.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-xs', PRIORITY_COLORS[suggestion.priority])}>
                          {suggestion.priority}
                        </Badge>
                        <Badge variant="secondary" className="text-xs gap-1">
                          {TYPE_ICONS[suggestion.type]}
                          {suggestion.type}
                        </Badge>
                        {suggestion.confidence && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(suggestion.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{suggestion.description}</p>
                      {suggestion.suggestedText && (
                        <div className="mt-2 rounded bg-muted/50 p-2 text-xs font-mono">
                          {suggestion.suggestedText}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {allSuggestions.length === 0 && (
              <Empty className="py-8">
                <EmptyMedia variant="icon">
                  <Lightbulb className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>{t('noSuggestions')}</EmptyTitle>
                <EmptyDescription>{t('runAnalysisFirst')}</EmptyDescription>
              </Empty>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onBack}>
          {tCommon('back')}
        </Button>
        <Button
          onClick={onOptimize}
          disabled={isOptimizing || selectedSuggestions.size === 0}
          className="gap-2"
        >
          {isOptimizing ? (
            <>
              <Loader size={16} />
              {t('optimizing')}
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              {t('optimize')}
            </>
          )}
        </Button>
      </div>
    </>
  );
}
