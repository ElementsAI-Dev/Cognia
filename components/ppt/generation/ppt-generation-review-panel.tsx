'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, FileText, ListChecks, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PPTOutlinePreview, type PPTOutline } from './ppt-outline-preview';
import type {
  PPTGenerationReviewSession,
  PPTOutlineData,
} from '@/hooks/ppt/use-ppt-generation';

export interface PPTGenerationReviewPanelProps {
  reviewSession: PPTGenerationReviewSession;
  isGenerating: boolean;
  error?: string | null;
  canRetry?: boolean;
  onRetry?: () => Promise<unknown>;
  onOutlineChange?: (outline: PPTOutlineData) => void;
  onRegenerateOutline?: () => Promise<unknown>;
  onStartGeneration: () => Promise<unknown> | unknown;
  onBack?: () => void;
  cancelLabel?: string;
  className?: string;
}

export function PPTGenerationReviewPanel({
  reviewSession,
  isGenerating,
  error,
  canRetry = false,
  onRetry,
  onOutlineChange,
  onRegenerateOutline,
  onStartGeneration,
  onBack,
  cancelLabel,
  className,
}: PPTGenerationReviewPanelProps) {
  const t = useTranslations('pptGenerator');

  const outlineForPreview = useMemo<PPTOutline>(
    () => ({
      title: reviewSession.outline.title || reviewSession.config.topic,
      subtitle: reviewSession.outline.subtitle || reviewSession.config.description,
      topic: reviewSession.config.topic,
      audience: reviewSession.config.audience,
      slideCount: reviewSession.outline.outline.length,
      theme: reviewSession.config.theme,
      outline: reviewSession.outline.outline,
    }),
    [reviewSession]
  );

  const sourceSummary = reviewSession.sourceSummary;

  return (
    <div className={className}>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('reviewGeneratedPlan')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{t('wizardStepOutline')}</Badge>
              <Badge variant="outline">
                {t('topic')}: {reviewSession.config.topic}
              </Badge>
              {reviewSession.config.audience ? (
                <Badge variant="outline">
                  {t('audience')}: {reviewSession.config.audience}
                </Badge>
              ) : null}
              <Badge variant="outline">
                {reviewSession.outline.outline.length} {t('slides')}
              </Badge>
              <Badge variant="outline">
                {t(
                  `mode${
                    reviewSession.sourceMode === 'import'
                      ? 'Import'
                      : reviewSession.sourceMode === 'paste'
                        ? 'Paste'
                        : 'Generate'
                  }`
                )}
              </Badge>
            </div>

            {sourceSummary ? (
              <>
                <Separator />
                <div className="space-y-3" data-testid="ppt-review-source-summary">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    {t('materialSummaryTitle')}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">{t('materialsAnalyzed')}</div>
                      <div className="mt-1 text-lg font-semibold">{sourceSummary.materialCount}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">{t('suggestedSlides')}</div>
                      <div className="mt-1 text-lg font-semibold">
                        {sourceSummary.suggestedSlideCount || reviewSession.outline.outline.length}
                      </div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">{t('topTopics')}</div>
                      <div className="mt-1 text-sm font-medium">
                        {sourceSummary.keyTopics.slice(0, 3).join(', ') || t('notAvailable')}
                      </div>
                    </div>
                  </div>

                  {sourceSummary.synthesizedSummary ? (
                    <div className="rounded-md border p-3 text-sm text-muted-foreground">
                      {sourceSummary.synthesizedSummary}
                    </div>
                  ) : null}

                  {sourceSummary.highlights.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ListChecks className="h-4 w-4" />
                        {t('materialHighlights')}
                      </div>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {sourceSummary.highlights.slice(0, 5).map((item, index) => (
                          <li key={`${item}-${index}`}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            {error ? (
              <div
                className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                data-testid="ppt-review-error"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-2">
                    <div>{error}</div>
                    {canRetry && onRetry ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => void onRetry()}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t('retry')}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <PPTOutlinePreview
          outline={outlineForPreview}
          isGenerating={isGenerating}
          onStartGeneration={() => void onStartGeneration()}
          onRegenerateOutline={onRegenerateOutline ? () => void onRegenerateOutline() : undefined}
          onOutlineChange={onOutlineChange ? (next) => onOutlineChange(next as PPTOutlineData) : undefined}
          onCancel={onBack}
          cancelLabel={cancelLabel}
        />
      </div>
    </div>
  );
}

export default PPTGenerationReviewPanel;
