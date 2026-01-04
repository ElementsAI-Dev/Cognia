'use client';

/**
 * ToolResultDisplay - Component for displaying MCP tool execution results in chat
 * 
 * Renders tool results with appropriate formatting and styling
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  Wrench,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ToolCallResult, ContentItem } from '@/types/mcp';
import { A2UIToolOutput, hasA2UIToolOutput } from '@/components/a2ui';

interface ToolResultDisplayProps {
  /** Server ID */
  serverId: string;
  /** Tool name */
  toolName: string;
  /** Tool result */
  result: ToolCallResult;
  /** Whether the tool is currently executing */
  isExecuting?: boolean;
  /** Additional class names */
  className?: string;
}

export function ToolResultDisplay({
  serverId,
  toolName,
  result,
  isExecuting = false,
  className,
}: ToolResultDisplayProps) {
  const t = useTranslations('toolResultDisplay');
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = formatResultAsText(result);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        result.isError
          ? 'border-destructive/50 bg-destructive/5'
          : 'border-primary/30 bg-primary/5',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 cursor-pointer',
          result.isError ? 'bg-destructive/10' : 'bg-primary/10'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          <span className="font-medium text-sm">
            @{serverId}:{toolName}
          </span>
          {result.isError ? (
            <XCircle className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {isExecuting && (
            <span className="text-xs text-muted-foreground animate-pulse">
              {t('executing')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 py-2 text-sm">
          {/* Check if result contains A2UI content and render accordingly */}
          {hasA2UIToolOutput(result) ? (
            <A2UIToolOutput
              toolId={`${serverId}-${toolName}`}
              toolName={toolName}
              output={result}
            />
          ) : (
            result.content.map((item, index) => (
              <ContentItemDisplay key={index} item={item} t={t} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export interface ContentItemDisplayProps {
  item: ContentItem;
  t?: ReturnType<typeof useTranslations>;
}

export function ContentItemDisplay({ item, t }: ContentItemDisplayProps) {
  if (item.type === 'text') {
    return (
      <pre className="whitespace-pre-wrap font-mono text-xs bg-muted/50 rounded p-2 overflow-x-auto">
        {item.text}
      </pre>
    );
  }

  if (item.type === 'image') {
    return (
      <div className="my-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:${item.mimeType};base64,${item.data}`}
          alt="Tool result"
          className="max-w-full rounded-md"
        />
      </div>
    );
  }

  if (item.type === 'resource') {
    return (
      <div className="my-2 p-2 bg-muted/50 rounded">
        <div className="text-xs text-muted-foreground mb-1">
          {t ? t('resource') : 'Resource'}: {item.resource.uri}
        </div>
        {item.resource.text && (
          <pre className="whitespace-pre-wrap font-mono text-xs overflow-x-auto">
            {item.resource.text}
          </pre>
        )}
      </div>
    );
  }

  return <div className="text-muted-foreground text-xs">{t ? t('unknownType') : 'Unknown type'}</div>;
}

function formatResultAsText(result: ToolCallResult): string {
  return result.content
    .map((item) => {
      if (item.type === 'text') return item.text;
      if (item.type === 'image') return `[Image: ${item.mimeType}]`;
      if (item.type === 'resource') {
        return item.resource.text || `[Resource: ${item.resource.uri}]`;
      }
      return '[Unknown]';
    })
    .join('\n');
}

/**
 * ToolMentionInline - Inline display of a tool mention in text
 */
interface ToolMentionInlineProps {
  serverId: string;
  toolName: string;
  onClick?: () => void;
}

export function ToolMentionInline({ serverId, toolName, onClick }: ToolMentionInlineProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
        'bg-primary/10 text-primary hover:bg-primary/20 transition-colors',
        onClick && 'cursor-pointer'
      )}
    >
      <Wrench className="h-3 w-3" />
      <span>@{serverId}:{toolName}</span>
    </button>
  );
}

/**
 * ToolExecutionStatus - Shows the status of tool execution
 */
interface ToolExecutionStatusProps {
  status: 'pending' | 'executing' | 'success' | 'error';
  toolName: string;
  serverId: string;
  errorMessage?: string;
}

export function ToolExecutionStatus({
  status,
  toolName,
  serverId,
  errorMessage,
}: ToolExecutionStatusProps) {
  const t = useTranslations('toolResultDisplay');
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
        status === 'pending' && 'bg-muted text-muted-foreground',
        status === 'executing' && 'bg-primary/10 text-primary',
        status === 'success' && 'bg-green-500/10 text-green-600',
        status === 'error' && 'bg-destructive/10 text-destructive'
      )}
    >
      {status === 'pending' && (
        <>
          <Wrench className="h-4 w-4" />
          <span>{t('pending')}: @{serverId}:{toolName}</span>
        </>
      )}
      {status === 'executing' && (
        <>
          <Wrench className="h-4 w-4 animate-spin" />
          <span>{t('executingStatus')}: @{serverId}:{toolName}</span>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle2 className="h-4 w-4" />
          <span>{t('completed')}: @{serverId}:{toolName}</span>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="h-4 w-4" />
          <span>{t('failed')}: @{serverId}:{toolName}</span>
          {errorMessage && (
            <span className="text-xs opacity-75">- {errorMessage}</span>
          )}
        </>
      )}
    </div>
  );
}

export default ToolResultDisplay;
