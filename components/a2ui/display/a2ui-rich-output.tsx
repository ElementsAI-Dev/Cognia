'use client';

import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArtifactPreview } from '@/components/artifacts/artifact-preview';
import { CodeBlock } from '@/components/chat/renderers/code-block';
import { cn } from '@/lib/utils';
import { loggers } from '@/lib/logger';
import { getValueByPath, resolveArrayOrPath, resolveNumberOrPath, resolveStringOrPath } from '@/lib/a2ui/data-model';
import { routeRichOutputProfile } from '@/lib/a2ui/output-profiles';
import type {
  A2UIComponentProps,
  A2UIRichOutputComponent,
  A2UIRichOutputChartData,
  A2UIRichOutputItem,
  A2UIRichOutputStep,
} from '@/types/artifact/a2ui';
import type { Artifact } from '@/types';

const ChartJsRichOutput = lazy(() =>
  import('../rich-output/chartjs-rich-output').then((mod) => ({ default: mod.ChartJsRichOutput }))
);
const CanvasSimulationRichOutput = lazy(() =>
  import('../rich-output/canvas-simulation-rich-output').then((mod) => ({
    default: mod.CanvasSimulationRichOutput,
  }))
);
const ThreeSceneRichOutput = lazy(() =>
  import('../rich-output/three-scene-rich-output').then((mod) => ({
    default: mod.ThreeSceneRichOutput,
  }))
);
const ToneSynthRichOutput = lazy(() =>
  import('../rich-output/tone-synth-rich-output').then((mod) => ({
    default: mod.ToneSynthRichOutput,
  }))
);
const D3ForceGraphRichOutput = lazy(() =>
  import('../rich-output/d3-force-graph-rich-output').then((mod) => ({
    default: mod.D3ForceGraphRichOutput,
  }))
);
const SvgPlotterRichOutput = lazy(() =>
  import('../rich-output/svg-plotter-rich-output').then((mod) => ({
    default: mod.SvgPlotterRichOutput,
  }))
);

function resolveObjectPath<T>(
  value: T | { path: string } | undefined,
  dataModel: Record<string, unknown>,
  defaultValue: T
): T {
  if (!value) {
    return defaultValue;
  }

  if (typeof value === 'object' && value !== null && 'path' in value) {
    const resolved = getValueByPath<T>(dataModel, value.path);
    return resolved ?? defaultValue;
  }

  return value as T;
}

function getAdvancedProfileFlag(component: A2UIRichOutputComponent): boolean {
  if (typeof component.allowAdvancedProfiles === 'boolean') {
    return component.allowAdvancedProfiles;
  }

  return process.env.NEXT_PUBLIC_ENABLE_ADVANCED_RICH_OUTPUT_PROFILES !== 'false';
}

function createPreviewArtifact(
  component: A2UIRichOutputComponent,
  profileId: string,
  title: string,
  content: string,
  artifactType: Artifact['type']
): Artifact {
  const timestamp = new Date();

  return {
    id: `${component.id}-${profileId}`,
    sessionId: component.id,
    messageId: component.id,
    type: artifactType,
    title,
    content,
    language:
      artifactType === 'code'
        ? component.codeLanguage
        : artifactType === 'html'
          ? 'html'
          : artifactType === 'svg'
            ? 'svg'
            : artifactType === 'mermaid'
              ? 'mermaid'
              : undefined,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    metadata: {
      outputProfileId: profileId,
      technology: artifactType === 'chart' ? 'chartjs' : artifactType,
      hostStrategy: artifactType === 'html' ? 'sandboxed-html' : 'artifact-preview',
      previewable: artifactType === 'html' || artifactType === 'svg',
      sandboxed: artifactType === 'html',
    },
  };
}

function NativeCardGrid({ items }: { items: A2UIRichOutputItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <Card key={item.id} className="border-border/60 bg-background/70">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">{item.title}</CardTitle>
              {item.badge ? <Badge variant="outline">{item.badge}</Badge> : null}
            </div>
            {item.description ? (
              <CardDescription className="text-xs">{item.description}</CardDescription>
            ) : null}
          </CardHeader>
          {item.value ? (
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold tracking-tight">{item.value}</div>
            </CardContent>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function NativeStepper({
  steps,
  currentStep,
  onPrevious,
  onNext,
}: {
  steps: A2UIRichOutputStep[];
  currentStep: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const t = useTranslations('a2ui.richOutput');
  const activeStep = steps[currentStep] ?? steps[0];

  return (
    <Card className="border-border/60 bg-background/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{activeStep?.title}</CardTitle>
        {activeStep?.description ? (
          <CardDescription>{activeStep.description}</CardDescription>
        ) : null}
      </CardHeader>
      {activeStep?.body ? (
        <CardContent className="pt-0 text-sm leading-6 text-muted-foreground">
          {activeStep.body}
        </CardContent>
      ) : null}
      <CardContent className="flex items-center justify-between pt-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={onPrevious}
          disabled={currentStep <= 0}
        >
          <ChevronLeft className="h-4 w-4" />
          {t('previous')}
        </Button>
        <div className="text-xs text-muted-foreground">
          {currentStep + 1}/{steps.length}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={onNext}
          disabled={currentStep >= steps.length - 1}
        >
          {t('next')}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function NativeSortableTable({
  columns,
  rows,
  sortKey,
  sortDirection,
  onSort,
}: {
  columns: NonNullable<A2UIRichOutputComponent['tableColumns']>;
  rows: Record<string, unknown>[];
  sortKey?: string;
  sortDirection?: string;
  onSort: (key: string) => void;
}) {
  const sortedRows = [...rows].sort((left, right) => {
    if (!sortKey) {
      return 0;
    }

    const leftValue = left[sortKey];
    const rightValue = right[sortKey];

    if (leftValue === rightValue) {
      return 0;
    }

    const comparison = String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    });

    return sortDirection === 'desc' ? comparison * -1 : comparison;
  });

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-background/70">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/40">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 text-left font-medium">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 py-0 font-medium"
                  onClick={() => onSort(column.key)}
                >
                  {column.label}
                </Button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, rowIndex) => (
            <tr key={String(row.id ?? rowIndex)} className="border-t border-border/50">
              {columns.map((column) => (
                <td
                  key={`${String(row.id ?? rowIndex)}-${column.key}`}
                  className={cn('px-3 py-2', column.numeric && 'text-right tabular-nums')}
                >
                  {String(row[column.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function A2UIRichOutput({
  component,
  dataModel,
  onAction,
  onDataChange,
}: A2UIComponentProps<A2UIRichOutputComponent>) {
  const t = useTranslations('a2ui.richOutput');
  const [localStep, setLocalStep] = useState(0);

  const requestedProfileId = resolveStringOrPath(component.profileId, dataModel, 'quick-factual-answer');
  const routedProfile = routeRichOutputProfile(
    requestedProfileId as Parameters<typeof routeRichOutputProfile>[0],
    {
      featureFlags: {
        enableAdvancedRichOutputProfiles: getAdvancedProfileFlag(component),
      },
    }
  );

  const title = resolveStringOrPath(component.title ?? component.profileId, dataModel, '');
  const description = resolveStringOrPath(component.description ?? '', dataModel, '');
  const content = resolveStringOrPath(component.content ?? '', dataModel, '');
  const fallbackContent = resolveStringOrPath(component.fallbackContent ?? '', dataModel, '');
  const items = resolveArrayOrPath(component.items ?? [], dataModel, []);
  const steps = resolveArrayOrPath(component.steps ?? [], dataModel, []);
  const tableRows = resolveArrayOrPath(component.tableRows ?? [], dataModel, []);
  const currentStep = component.currentStep
    ? resolveNumberOrPath(component.currentStep, dataModel, 0)
    : localStep;
  const sortKey = component.sortKeyPath
    ? getValueByPath<string>(dataModel, component.sortKeyPath)
    : undefined;
  const sortDirection = component.sortDirectionPath
    ? getValueByPath<string>(dataModel, component.sortDirectionPath)
    : undefined;

  const previewArtifact = useMemo(() => {
    if (!content.trim()) {
      return null;
    }

    switch (routedProfile.profile.outputType) {
      case 'svg':
        return createPreviewArtifact(component, routedProfile.profile.id, title, content, 'svg');
      case 'html':
        return createPreviewArtifact(component, routedProfile.profile.id, title, content, 'html');
      case 'mermaid':
        return createPreviewArtifact(component, routedProfile.profile.id, title, content, 'mermaid');
      default:
        return null;
    }
  }, [component, content, routedProfile.profile.id, routedProfile.profile.outputType, title]);

  const chartData = resolveObjectPath<A2UIRichOutputChartData | null>(
    component.chartData ?? null,
    dataModel,
    null
  );
  const simulationConfig = resolveObjectPath<Record<string, unknown> | null>(
    component.simulationConfig ?? null,
    dataModel,
    null
  );
  const scenePrompt = resolveStringOrPath(component.scenePrompt ?? '', dataModel, '');
  const audioPrompt = resolveStringOrPath(component.audioPrompt ?? '', dataModel, '');
  const networkNodes = resolveArrayOrPath(component.networkNodes ?? [], dataModel, []);
  const networkEdges = resolveArrayOrPath(component.networkEdges ?? [], dataModel, []);
  const plotPoints = resolveArrayOrPath(component.plotPoints ?? [], dataModel, []);

  const fallbackText = fallbackContent || t('richOutputFallback');
  const runtimeFallback = (
    <div className="rounded-lg border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
      Loading rich runtime...
    </div>
  );

  useEffect(() => {
    loggers.ui.info('Rich output profile initialized', {
      componentId: component.id,
      requestedProfileId,
      resolvedProfileId: routedProfile.profile.id,
      hostStrategy: routedProfile.profile.hostStrategy,
      technology: routedProfile.profile.technology,
      usedFallback: routedProfile.usedFallback,
    });
  }, [
    component.id,
    requestedProfileId,
    routedProfile.profile.hostStrategy,
    routedProfile.profile.id,
    routedProfile.profile.technology,
    routedProfile.usedFallback,
  ]);

  useEffect(() => {
    if (!routedProfile.usedFallback) {
      return;
    }

    loggers.ui.warn('Rich output profile fallback activated', {
      componentId: component.id,
      requestedProfileId,
      resolvedProfileId: routedProfile.profile.id,
      reason: routedProfile.reason,
    });
  }, [component.id, requestedProfileId, routedProfile.profile.id, routedProfile.reason, routedProfile.usedFallback]);

  const updateStep = (nextStep: number) => {
    if (component.currentStepPath) {
      onDataChange(component.currentStepPath, nextStep);
    } else {
      setLocalStep(nextStep);
    }

    if (component.stepChangeAction) {
      const nextStepDef = (steps as A2UIRichOutputStep[])[nextStep];
      onAction(component.stepChangeAction, {
        profileId: routedProfile.profile.id,
        stepIndex: nextStep,
        stepId: nextStepDef?.id,
      });
    }
  };

  const handleSort = (key: string) => {
    const nextDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';

    if (component.sortKeyPath) {
      onDataChange(component.sortKeyPath, key);
    }

    if (component.sortDirectionPath) {
      onDataChange(component.sortDirectionPath, nextDirection);
    }

    if (component.sortAction) {
      onAction(component.sortAction, {
        profileId: routedProfile.profile.id,
        key,
        direction: nextDirection,
      });
    }
  };

  const renderNativeContent = () => {
    if ((routedProfile.profile.id === 'kpis-metrics' || routedProfile.profile.id === 'choose-between-options') && items.length > 0) {
      return <NativeCardGrid items={items as A2UIRichOutputItem[]} />;
    }

    if (routedProfile.profile.id === 'cyclic-process' && steps.length > 0) {
      return (
        <NativeStepper
          steps={steps as A2UIRichOutputStep[]}
          currentStep={Math.max(0, Math.min(currentStep, steps.length - 1))}
          onPrevious={() => updateStep(Math.max(0, currentStep - 1))}
          onNext={() => updateStep(Math.min(steps.length - 1, currentStep + 1))}
        />
      );
    }

    if (
      routedProfile.profile.id === 'data-exploration'
      && component.tableColumns
      && component.tableColumns.length > 0
      && tableRows.length > 0
    ) {
      return (
        <NativeSortableTable
          columns={component.tableColumns}
          rows={tableRows as Record<string, unknown>[]}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      );
    }

    if (routedProfile.profile.outputType === 'code') {
      return <CodeBlock code={content} language={component.codeLanguage} />;
    }

    return (
      <div
        className={cn(
          'rounded-lg border border-border/60 bg-background/70 px-4 py-3 text-sm leading-6',
          routedProfile.profile.outputType === 'warm-text' && 'bg-amber-50/70 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100'
        )}
      >
        {content || fallbackText}
      </div>
    );
  };

  const renderBody = () => {
    if (
      ((routedProfile.profile.id === 'kpis-metrics' || routedProfile.profile.id === 'choose-between-options') && items.length > 0)
      || (routedProfile.profile.id === 'cyclic-process' && steps.length > 0)
      || (routedProfile.profile.id === 'data-exploration' && component.tableColumns && component.tableColumns.length > 0 && tableRows.length > 0)
      || routedProfile.profile.outputType === 'plain-text'
      || routedProfile.profile.outputType === 'warm-text'
      || routedProfile.profile.outputType === 'code'
    ) {
      return renderNativeContent();
    }

    if (routedProfile.usedFallback && fallbackContent.trim()) {
      return (
        <div className="rounded-lg border border-border/60 bg-background/70 px-4 py-3 text-sm leading-6">
          {fallbackText}
        </div>
      );
    }

    if (
      routedProfile.profile.technology === 'chartjs'
      && chartData
      && (
        routedProfile.profile.id === 'trends-over-time'
        || routedProfile.profile.id === 'category-comparison'
        || routedProfile.profile.id === 'part-of-whole'
      )
    ) {
      const chartType =
        routedProfile.profile.id === 'trends-over-time'
          ? 'line'
          : routedProfile.profile.id === 'part-of-whole'
            ? 'doughnut'
            : 'bar';

      return (
        <Suspense fallback={runtimeFallback}>
          <ChartJsRichOutput chartType={chartType} data={chartData} height={component.height} />
        </Suspense>
      );
    }

    if (routedProfile.profile.id === 'physics-math-simulation' && simulationConfig) {
      return (
        <Suspense fallback={runtimeFallback}>
          <CanvasSimulationRichOutput config={simulationConfig} height={component.height} />
        </Suspense>
      );
    }

    if (routedProfile.profile.id === '3d-visualization') {
      return (
        <Suspense fallback={runtimeFallback}>
          <ThreeSceneRichOutput prompt={scenePrompt} height={component.height} />
        </Suspense>
      );
    }

    if (routedProfile.profile.id === 'music-audio') {
      return (
        <Suspense fallback={runtimeFallback}>
          <ToneSynthRichOutput prompt={audioPrompt} />
        </Suspense>
      );
    }

    if (
      routedProfile.profile.id === 'network-graph'
      && networkNodes.length > 0
      && networkEdges.length > 0
    ) {
      return (
        <Suspense fallback={runtimeFallback}>
          <D3ForceGraphRichOutput
            nodes={networkNodes}
            edges={networkEdges}
            height={component.height}
          />
        </Suspense>
      );
    }

    if (routedProfile.profile.id === 'function-equation-plotter' && plotPoints.length > 0) {
      return (
        <Suspense fallback={runtimeFallback}>
          <SvgPlotterRichOutput points={plotPoints} height={component.height} />
        </Suspense>
      );
    }

    if (previewArtifact) {
      return <ArtifactPreview artifact={previewArtifact} className="min-h-[220px]" />;
    }

    if (routedProfile.profile.rolloutTier === 'advanced') {
      loggers.ui.warn('Rich output advanced adapter unavailable, using fallback text', {
        componentId: component.id,
        requestedProfileId,
        resolvedProfileId: routedProfile.profile.id,
      });

      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{fallbackText || t('richOutputUnavailable')}</AlertDescription>
        </Alert>
      );
    }
    return renderNativeContent();
  };

  return (
    <div className={cn('space-y-3', component.className)}>
      {title ? (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          {routedProfile.usedFallback ? (
            <Badge variant="outline" className="text-[11px]">
              {t('richOutputFallback')}
            </Badge>
          ) : null}
        </div>
      ) : null}
      {renderBody()}
    </div>
  );
}
