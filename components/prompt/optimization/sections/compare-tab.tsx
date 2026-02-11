'use client';

import { useTranslations } from 'next-intl';
import {
  Check,
  Copy,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { OptimizationComparison } from '@/lib/ai/prompts/prompt-self-optimizer';

interface Suggestion {
  id: string;
  description: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
}

interface CompareTabProps {
  templateContent: string;
  optimizedContent: string;
  comparison: OptimizationComparison[] | null;
  selectedSuggestions: Set<string>;
  allSuggestions: Suggestion[];
  showDiff: boolean;
  copied: boolean;
  onOptimizedContentChange: (value: string) => void;
  onShowDiffToggle: () => void;
  onCopy: () => void;
  onReset: () => void;
  onBack: () => void;
  onApply: () => void;
}

function renderComparisonMetric(comp: OptimizationComparison) {
  const isPositive = comp.improvement > 0;
  const isNegative = comp.improvement < 0;
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const color = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground';

  return (
    <div key={comp.metric} className="flex items-center justify-between py-2">
      <span className="text-sm capitalize">{comp.metric.replace(/([A-Z])/g, ' $1').trim()}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{comp.original}</span>
        <Icon className={cn('h-4 w-4', color)} />
        <span className={cn('text-sm font-medium', color)}>{comp.optimized}</span>
        {comp.improvementPercent !== 0 && (
          <Badge variant="outline" className={cn('text-xs', color)}>
            {comp.improvementPercent > 0 ? '+' : ''}{comp.improvementPercent}%
          </Badge>
        )}
      </div>
    </div>
  );
}

export function CompareTab({
  templateContent,
  optimizedContent,
  comparison,
  selectedSuggestions,
  allSuggestions,
  showDiff,
  copied,
  onOptimizedContentChange,
  onShowDiffToggle,
  onCopy,
  onReset,
  onBack,
  onApply,
}: CompareTabProps) {
  const t = useTranslations('promptSelfOptimizer');
  const tCommon = useTranslations('common');

  return (
    <>
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {/* Comparison Metrics */}
          {comparison && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {t('improvements')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {comparison.map(renderComparisonMetric)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Toggle View */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{t('optimizedPrompt')}</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onShowDiffToggle}
                className="gap-1"
              >
                {showDiff ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showDiff ? t('hideOriginal') : t('showOriginal')}
              </Button>
              <Button variant="ghost" size="sm" onClick={onCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Content Comparison */}
          <div className={cn('grid gap-4', showDiff && 'grid-cols-2')}>
            {showDiff && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t('original')}</Label>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap max-h-64 overflow-auto">
                  {templateContent}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {showDiff && <Label className="text-xs text-muted-foreground">{t('optimized')}</Label>}
              <Textarea
                value={optimizedContent}
                onChange={(e) => onOptimizedContentChange(e.target.value)}
                className="min-h-64 font-mono text-sm"
              />
            </div>
          </div>

          {/* Applied Suggestions */}
          {selectedSuggestions.size > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('appliedSuggestions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {allSuggestions
                    .filter(s => selectedSuggestions.has(s.id))
                    .map(s => (
                      <Badge key={s.id} variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {s.type}
                      </Badge>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <div className="mt-4 flex justify-between">
        <Button variant="outline" onClick={onReset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('startOver')}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            {tCommon('back')}
          </Button>
          <Button onClick={onApply} disabled={!optimizedContent} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            {t('apply')}
          </Button>
        </div>
      </div>
    </>
  );
}
