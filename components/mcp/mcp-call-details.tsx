'use client';

/**
 * MCPCallDetails - Expandable detailed information panel for MCP tool calls
 * Shows complete parameters, result, metadata, and logs
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  FileJson,
  Clock,
  Server,
  Tag,
  Hash,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CodeBlock } from '@/components/ai-elements/code-block';

export interface MCPCallDetailsProps {
  /** Call ID */
  callId: string;
  /** Server ID */
  serverId: string;
  /** Server name */
  serverName?: string;
  /** Tool name */
  toolName: string;
  /** Tool description */
  toolDescription?: string;
  /** Input schema (from tool definition) */
  inputSchema?: Record<string, unknown>;
  /** Arguments passed to the tool */
  args: Record<string, unknown>;
  /** Result from the tool */
  result?: unknown;
  /** Error message if failed */
  error?: string;
  /** Start timestamp */
  startedAt?: Date;
  /** End timestamp */
  endedAt?: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Log entries */
  logs?: Array<{ level: string; message: string; timestamp?: Date }>;
  /** Maximum height for scrollable areas */
  maxHeight?: number;
  className?: string;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(1)}s`;
}

interface DetailSectionProps {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function DetailSection({ title, icon: Icon, defaultOpen = false, children }: DetailSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-3 py-2 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {title}
          </div>
          <ChevronDown className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MCPCallDetails({
  callId,
  serverId,
  serverName,
  toolName,
  toolDescription,
  inputSchema,
  args,
  result,
  error,
  startedAt,
  endedAt,
  metadata,
  logs,
  maxHeight = 400,
  className,
}: MCPCallDetailsProps) {
  const t = useTranslations('mcp');

  return (
    <div className={cn('rounded-lg border bg-card overflow-hidden', className)}>
      {/* Header with basic info */}
      <div className="p-4 border-b bg-muted/30">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('server')}:</span>
            <span className="font-mono">{serverName || serverId}</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('tool')}:</span>
            <span className="font-mono">{toolName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('callId')}:</span>
            <span className="font-mono text-xs truncate max-w-[150px]">{callId}</span>
          </div>
          {startedAt && endedAt && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('duration')}:</span>
              <span className="font-mono">{formatDuration(startedAt, endedAt)}</span>
            </div>
          )}
        </div>

        {toolDescription && (
          <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{toolDescription}</p>
          </div>
        )}

        {startedAt && (
          <div className="mt-2 text-xs text-muted-foreground">
            {t('started')}: {formatTimestamp(startedAt)}
            {endedAt && ` → ${t('ended')}: ${formatTimestamp(endedAt)}`}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <ScrollArea style={{ maxHeight }}>
        <div className="divide-y divide-border/50">
          {/* Input Schema */}
          {inputSchema && Object.keys(inputSchema).length > 0 && (
            <DetailSection title={t('inputSchema')} icon={FileJson}>
              <CodeBlock code={JSON.stringify(inputSchema, null, 2)} language="json" />
            </DetailSection>
          )}

          {/* Arguments */}
          <DetailSection title={t('arguments')} icon={FileJson} defaultOpen>
            <CodeBlock code={JSON.stringify(args, null, 2)} language="json" />
          </DetailSection>

          {/* Result */}
          {result !== undefined && (
            <DetailSection title={t('result')} icon={FileJson} defaultOpen>
              <CodeBlock 
                code={typeof result === 'string' ? result : JSON.stringify(result, null, 2)} 
                language="json" 
              />
            </DetailSection>
          )}

          {/* Error */}
          {error && (
            <DetailSection title={t('error')} icon={AlertCircle} defaultOpen>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">
                  {error}
                </pre>
              </div>
            </DetailSection>
          )}

          {/* Metadata */}
          {metadata && Object.keys(metadata).length > 0 && (
            <DetailSection title={t('metadata')} icon={Tag}>
              <div className="space-y-1">
                {Object.entries(metadata).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-mono">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Logs */}
          {logs && logs.length > 0 && (
            <DetailSection title={`${t('logs')} (${logs.length})`} icon={FileJson}>
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      'flex gap-2 p-1 rounded',
                      log.level === 'error' && 'bg-destructive/10 text-destructive',
                      log.level === 'warning' && 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
                      log.level === 'debug' && 'text-muted-foreground'
                    )}
                  >
                    {log.timestamp && (
                      <span className="text-muted-foreground shrink-0">
                        [{formatTimestamp(log.timestamp)}]
                      </span>
                    )}
                    <Badge variant="outline" className="text-[9px] px-1 h-4 shrink-0">
                      {log.level}
                    </Badge>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))}
              </div>
            </DetailSection>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
