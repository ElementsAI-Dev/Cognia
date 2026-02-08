'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Lightbulb,
  Wifi,
  Clock,
  Shield,
  FileQuestion,
  Ban,
  Gauge,
  Code,
  ServerCrash,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  classifyMcpError,
  getUserFriendlyMessage,
  getRecoverySuggestions,
  isRetryable,
  McpErrorType,
} from '@/lib/mcp/error-handler';

export interface MCPErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
  className?: string;
}

const ERROR_TYPE_ICONS: Record<McpErrorType, React.ReactNode> = {
  [McpErrorType.Connection]: <Wifi className="h-4 w-4" />,
  [McpErrorType.Timeout]: <Clock className="h-4 w-4" />,
  [McpErrorType.Protocol]: <Code className="h-4 w-4" />,
  [McpErrorType.Server]: <ServerCrash className="h-4 w-4" />,
  [McpErrorType.ToolNotFound]: <FileQuestion className="h-4 w-4" />,
  [McpErrorType.InvalidArgs]: <Code className="h-4 w-4" />,
  [McpErrorType.Permission]: <Shield className="h-4 w-4" />,
  [McpErrorType.RateLimit]: <Gauge className="h-4 w-4" />,
  [McpErrorType.NotConnected]: <Ban className="h-4 w-4" />,
  [McpErrorType.Unknown]: <HelpCircle className="h-4 w-4" />,
};

export function MCPErrorDisplay({
  error,
  onRetry,
  onDismiss,
  compact = false,
  className,
}: MCPErrorDisplayProps) {
  const t = useTranslations('mcp');
  const [showDetails, setShowDetails] = useState(false);

  const classified = useMemo(() => {
    const type = classifyMcpError(error);
    return {
      type,
      userMessage: getUserFriendlyMessage(type),
      suggestions: getRecoverySuggestions(type),
      retryable: isRetryable(type),
    };
  }, [error]);

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm',
          className
        )}
      >
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <span className="text-destructive truncate">{classified.userMessage}</span>
        {classified.retryable && onRetry && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            onClick={onRetry}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
        {onDismiss && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            onClick={onDismiss}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-md border border-destructive/30 bg-destructive/5 p-4 space-y-3',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">{classified.userMessage}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs gap-1">
                {ERROR_TYPE_ICONS[classified.type]}
                {classified.type.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {classified.retryable && onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              {t('retryAction')}
            </Button>
          )}
          {onDismiss && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {classified.suggestions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" />
            {t('recoverySuggestions')}
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 pl-5 list-disc">
            {classified.suggestions.map((suggestion, i) => (
              <li key={i}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        {showDetails ? t('hideDetails') : t('showDetails')}
      </button>

      {showDetails && (
        <pre className="text-xs bg-muted/50 rounded p-2 whitespace-pre-wrap text-muted-foreground overflow-auto max-h-[200px]">
          {error}
        </pre>
      )}
    </div>
  );
}
