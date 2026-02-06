'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, ExternalLink, Clock, Zap, Hash } from 'lucide-react';
import type { TraceData, SpanData } from './observability-dashboard';

interface TraceViewerProps {
  trace: TraceData;
}

interface SpanTreeProps {
  span: SpanData;
  depth?: number;
  t: ReturnType<typeof useTranslations>;
}

function SpanTree({ span, depth = 0, t }: SpanTreeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = span.children && span.children.length > 0;

  const getSpanTypeColor = (type: SpanData['type']) => {
    switch (type) {
      case 'generation':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'tool':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'agent':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: SpanData['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  return (
    <div className="ml-4 first:ml-0">
      <div
        className={`flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer ${
          depth > 0 ? 'border-l-2 border-muted' : ''
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {hasChildren && (
          <Button variant="ghost" size="icon" className="h-5 w-5">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}
        {!hasChildren && <div className="w-5" />}

        <Badge variant="outline" className={getSpanTypeColor(span.type)}>
          {span.type}
        </Badge>

        <span className="font-medium text-sm truncate flex-1">{span.name}</span>

        <span className={`text-xs ${getStatusColor(span.status)}`}>{span.status}</span>

        {span.duration && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {span.duration}ms
          </span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="ml-4">
          {span.children?.map((child) => (
            <SpanTree key={child.id} span={child} depth={depth + 1} t={t} />
          ))}
        </div>
      )}

      {isExpanded && !hasChildren && (span.input !== undefined || span.output !== undefined) && (
        <div className="ml-9 mt-2 space-y-2 text-xs">
          {span.input !== undefined && (
            <div className="p-2 bg-muted rounded">
              <div className="font-medium text-muted-foreground mb-1">{t('input')}</div>
              <pre className="whitespace-pre-wrap overflow-x-auto">
                {String(
                  typeof span.input === 'string' ? span.input : JSON.stringify(span.input, null, 2)
                )}
              </pre>
            </div>
          )}
          {span.output !== undefined && (
            <div className="p-2 bg-muted rounded">
              <div className="font-medium text-muted-foreground mb-1">{t('output')}</div>
              <pre className="whitespace-pre-wrap overflow-x-auto">
                {String(
                  typeof span.output === 'string'
                    ? span.output
                    : JSON.stringify(span.output, null, 2)
                )}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TraceViewer({ trace }: TraceViewerProps) {
  const t = useTranslations('observability.traceViewer');

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{trace.name}</CardTitle>
          <Badge
            variant="outline"
            className={
              trace.status === 'success'
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : trace.status === 'error'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
            }
          >
            {trace.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('traceId')}</span>
            <code className="text-xs bg-muted px-1 py-0.5 rounded truncate">{trace.id}</code>
          </div>

          {trace.sessionId && (
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('sessionId')}</span>
              <code className="text-xs bg-muted px-1 py-0.5 rounded truncate">
                {trace.sessionId}
              </code>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('started')}</span>
            <span>{formatDate(trace.startTime)}</span>
          </div>

          {trace.duration && (
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('duration')}</span>
              <span>{trace.duration}ms</span>
            </div>
          )}

          {trace.provider && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t('provider')}</span>
              <Badge variant="secondary">{trace.provider}</Badge>
            </div>
          )}

          {trace.model && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t('model')}</span>
              <Badge variant="secondary">{trace.model}</Badge>
            </div>
          )}
        </div>

        {trace.tokenUsage && (
          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground">{t('tokenUsage.prompt')}</span>{' '}
              <span className="font-medium">{trace.tokenUsage.prompt}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('tokenUsage.completion')}</span>{' '}
              <span className="font-medium">{trace.tokenUsage.completion}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('tokenUsage.total')}</span>{' '}
              <span className="font-medium">{trace.tokenUsage.total}</span>
            </div>
            {trace.cost && (
              <div>
                <span className="text-muted-foreground">{t('tokenUsage.cost')}</span>{' '}
                <span className="font-medium">${trace.cost.toFixed(4)}</span>
              </div>
            )}
          </div>
        )}

        <div>
          <h4 className="font-medium mb-2">{t('spanTree')}</h4>
          <ScrollArea className="border rounded-lg p-2 max-h-64">
            {trace.spans.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">{t('noSpans')}</div>
            ) : (
              trace.spans.map((span) => <SpanTree key={span.id} span={span} t={t} />)
            )}
          </ScrollArea>
        </div>

        {trace.metadata && Object.keys(trace.metadata).length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>svg]:rotate-90" />
                {t('metadata')}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="text-xs bg-muted p-2 rounded-lg overflow-x-auto mt-2">
                {JSON.stringify(trace.metadata, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            {t('openInLangfuse')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
