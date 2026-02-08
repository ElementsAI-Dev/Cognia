'use client';

/**
 * LogDetailPanel
 *
 * Enhanced log detail view with JSON syntax highlighting,
 * parsed stack trace frames, related logs by traceId,
 * tag badges, and field-level copy.
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  Tag,
  Clock,
  Layers,
  Hash,
  FileCode,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { StructuredLogEntry, LogLevel } from '@/lib/logger';

export interface LogDetailPanelProps {
  log: StructuredLogEntry;
  relatedLogs?: StructuredLogEntry[];
  isBookmarked?: boolean;
  onClose?: () => void;
  onToggleBookmark?: (id: string) => void;
  onSelectRelated?: (log: StructuredLogEntry) => void;
  className?: string;
}

const LEVEL_BADGE_COLORS: Record<LogLevel, string> = {
  trace: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  debug: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  info: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  warn: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  fatal: 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200',
};

/**
 * Parse a stack trace string into individual frames.
 */
function parseStackTrace(
  stack: string
): { fn: string; file: string; line: string; col: string }[] {
  const frames: { fn: string; file: string; line: string; col: string }[] = [];
  const lines = stack.split('\n');

  for (const line of lines) {
    // Chrome/V8 style: "    at functionName (file:line:col)"
    const chromeMatch = line.match(/^\s*at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (chromeMatch) {
      frames.push({
        fn: chromeMatch[1],
        file: chromeMatch[2],
        line: chromeMatch[3],
        col: chromeMatch[4],
      });
      continue;
    }

    // Chrome/V8 anonymous: "    at file:line:col"
    const anonMatch = line.match(/^\s*at\s+(.+?):(\d+):(\d+)/);
    if (anonMatch) {
      frames.push({
        fn: '<anonymous>',
        file: anonMatch[1],
        line: anonMatch[2],
        col: anonMatch[3],
      });
      continue;
    }

    // Firefox style: "functionName@file:line:col"
    const ffMatch = line.match(/^(.+?)@(.+?):(\d+):(\d+)/);
    if (ffMatch) {
      frames.push({
        fn: ffMatch[1] || '<anonymous>',
        file: ffMatch[2],
        line: ffMatch[3],
        col: ffMatch[4],
      });
    }
  }

  return frames;
}

/**
 * Render JSON with syntax highlighting.
 */
function JsonHighlight({ data }: { data: unknown }) {
  const rendered = useMemo(() => {
    const json = JSON.stringify(data, null, 2);
    if (!json) return null;

    // Tokenize JSON for syntax highlighting
    return json.split('\n').map((line, i) => {
      const parts: React.ReactNode[] = [];
      let remaining = line;
      let keyIdx = 0;

      while (remaining.length > 0) {
        // Match key
        const keyMatch = remaining.match(/^(\s*)"([^"]+)"(\s*:\s*)/);
        if (keyMatch) {
          parts.push(
            <span key={`${i}-ws-${keyIdx}`}>{keyMatch[1]}</span>,
            <span key={`${i}-key-${keyIdx}`} className="text-purple-600 dark:text-purple-400">
              &quot;{keyMatch[2]}&quot;
            </span>,
            <span key={`${i}-col-${keyIdx}`}>{keyMatch[3]}</span>
          );
          remaining = remaining.slice(keyMatch[0].length);
          keyIdx++;
          continue;
        }

        // Match string value
        const strMatch = remaining.match(/^"([^"]*)"(,?\s*)/);
        if (strMatch) {
          parts.push(
            <span key={`${i}-str-${keyIdx}`} className="text-green-600 dark:text-green-400">
              &quot;{strMatch[1]}&quot;
            </span>,
            <span key={`${i}-punc-${keyIdx}`}>{strMatch[2]}</span>
          );
          remaining = remaining.slice(strMatch[0].length);
          keyIdx++;
          continue;
        }

        // Match number
        const numMatch = remaining.match(/^(-?\d+\.?\d*)(,?\s*)/);
        if (numMatch) {
          parts.push(
            <span key={`${i}-num-${keyIdx}`} className="text-blue-600 dark:text-blue-400">
              {numMatch[1]}
            </span>,
            <span key={`${i}-punc2-${keyIdx}`}>{numMatch[2]}</span>
          );
          remaining = remaining.slice(numMatch[0].length);
          keyIdx++;
          continue;
        }

        // Match boolean/null
        const boolMatch = remaining.match(/^(true|false|null)(,?\s*)/);
        if (boolMatch) {
          parts.push(
            <span key={`${i}-bool-${keyIdx}`} className="text-orange-600 dark:text-orange-400">
              {boolMatch[1]}
            </span>,
            <span key={`${i}-punc3-${keyIdx}`}>{boolMatch[2]}</span>
          );
          remaining = remaining.slice(boolMatch[0].length);
          keyIdx++;
          continue;
        }

        // Fallback: consume one character
        parts.push(
          <span key={`${i}-rest-${keyIdx}`}>{remaining[0]}</span>
        );
        remaining = remaining.slice(1);
        keyIdx++;
      }

      return (
        <div key={i} className="leading-5">
          {parts}
        </div>
      );
    });
  }, [data]);

  return (
    <pre className="text-xs font-mono overflow-x-auto p-3 rounded-md bg-muted/50">
      {rendered}
    </pre>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function LogDetailPanel({
  log,
  relatedLogs = [],
  isBookmarked = false,
  onClose,
  onToggleBookmark,
  onSelectRelated,
  className,
}: LogDetailPanelProps) {
  const t = useTranslations('logging');

  const timestamp = new Date(log.timestamp);
  const timeStr = timestamp.toLocaleString('en-US', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });

  const stackFrames = useMemo(() => {
    if (!log.stack) return [];
    return parseStackTrace(log.stack);
  }, [log.stack]);

  const filteredRelated = useMemo(() => {
    return relatedLogs.filter((r) => r.id !== log.id).slice(0, 20);
  }, [relatedLogs, log.id]);

  return (
    <div className={cn('flex flex-col border-l bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold truncate">{t('detail.title')}</h3>
          <Badge className={cn('text-xs shrink-0', LEVEL_BADGE_COLORS[log.level])}>
            {log.level.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onToggleBookmark && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onToggleBookmark(log.id)}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isBookmarked ? t('detail.removeBookmark') : t('detail.addBookmark')}
              </TooltipContent>
            </Tooltip>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t('detail.message')}
              </span>
              <CopyButton text={log.message} label={t('detail.copyMessage')} />
            </div>
            <p className="text-sm break-words">{log.message}</p>
          </div>

          <Separator />

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">{t('detail.timestamp')}</p>
                <p className="font-mono">{timeStr}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">{t('detail.module')}</p>
                <p className="font-mono">{log.module}</p>
              </div>
            </div>

            {log.traceId && (
              <div className="flex items-center gap-1.5 col-span-2">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground">{t('panel.traceId')}</p>
                  <div className="flex items-center gap-1">
                    <p className="font-mono truncate">{log.traceId}</p>
                    <CopyButton text={log.traceId} label={t('detail.copyTraceId')} />
                  </div>
                </div>
              </div>
            )}

            {log.sessionId && (
              <div className="flex items-center gap-1.5 col-span-2">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground">{t('detail.sessionId')}</p>
                  <p className="font-mono truncate">{log.sessionId}</p>
                </div>
              </div>
            )}

            {log.source && (
              <div className="flex items-center gap-1.5 col-span-2">
                <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">{t('panel.source')}</p>
                  <p className="font-mono">
                    {log.source.file}:{log.source.line}
                    {log.source.function && (
                      <span className="text-muted-foreground"> ({log.source.function})</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {log.tags && log.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('detail.tags')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {log.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Data (JSON highlighted) */}
          {log.data && (
            <>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('panel.data')}
                  </span>
                  <CopyButton
                    text={JSON.stringify(log.data, null, 2)}
                    label={t('detail.copyData')}
                  />
                </div>
                <JsonHighlight data={log.data} />
              </div>
            </>
          )}

          {/* Stack Trace (parsed frames) */}
          {log.stack && (
            <>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('panel.stackTrace')}
                  </span>
                  <CopyButton text={log.stack} label={t('detail.copyStack')} />
                </div>

                {stackFrames.length > 0 ? (
                  <div className="space-y-0.5">
                    {stackFrames.map((frame, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex items-start gap-2 px-2 py-1.5 rounded text-xs font-mono',
                          i === 0
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                            : 'bg-muted/30 text-muted-foreground'
                        )}
                      >
                        <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-semibold">{frame.fn}</span>
                          <div className="flex items-center gap-1 text-[11px] opacity-75">
                            <ExternalLink className="h-2.5 w-2.5" />
                            <span className="truncate">
                              {frame.file}:{frame.line}:{frame.col}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                    {log.stack}
                  </pre>
                )}
              </div>
            </>
          )}

          {/* Related Logs (same traceId) */}
          {filteredRelated.length > 0 && (
            <>
              <Separator />
              <div>
                <span className="text-xs font-medium text-muted-foreground mb-2 block">
                  {t('detail.relatedLogs')} ({filteredRelated.length})
                </span>
                <div className="space-y-1">
                  {filteredRelated.map((related) => {
                    const relTime = new Date(related.timestamp).toLocaleTimeString('en-US', {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });
                    return (
                      <button
                        key={related.id}
                        className={cn(
                          'flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-left',
                          'hover:bg-muted/50 transition-colors'
                        )}
                        onClick={() => onSelectRelated?.(related)}
                      >
                        <Badge
                          className={cn(
                            'text-[10px] shrink-0 px-1.5',
                            LEVEL_BADGE_COLORS[related.level]
                          )}
                        >
                          {related.level}
                        </Badge>
                        <span className="font-mono text-muted-foreground shrink-0">
                          {relTime}
                        </span>
                        <span className="truncate">{related.message}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default LogDetailPanel;
