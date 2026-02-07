'use client';

/**
 * PreviewConsole - Console output panel for the designer preview
 * Captures and displays console.log/warn/error/info from the preview iframe
 */

import { useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Terminal,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDesignerStore, type PreviewConsoleEntry } from '@/stores/designer';

interface PreviewConsoleProps {
  className?: string;
  maxHeight?: number;
}

const LEVEL_CONFIG: Record<
  PreviewConsoleEntry['level'],
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  log: {
    icon: <Terminal className="h-3.5 w-3.5" />,
    color: 'text-foreground',
    bgColor: '',
  },
  info: {
    icon: <Info className="h-3.5 w-3.5" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/5',
  },
  warn: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/5',
  },
  error: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: 'text-destructive',
    bgColor: 'bg-destructive/5',
  },
};

export function PreviewConsole({ className, maxHeight = 200 }: PreviewConsoleProps) {
  const t = useTranslations('designer');
  const scrollRef = useRef<HTMLDivElement>(null);

  const consoleLogs = useDesignerStore((state) => state.consoleLogs);
  const clearConsoleLogs = useDesignerStore((state) => state.clearConsoleLogs);
  const showConsole = useDesignerStore((state) => state.showConsole);
  const toggleConsole = useDesignerStore((state) => state.toggleConsole);

  const errorCount = consoleLogs.filter((l) => l.level === 'error').length;
  const warnCount = consoleLogs.filter((l) => l.level === 'warn').length;

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current && showConsole) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consoleLogs.length, showConsole]);

  const formatTimestamp = useCallback((ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  }, []);

  return (
    <TooltipProvider>
      <div className={cn('border-t bg-background', className)}>
        {/* Console header */}
        <div
          className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={toggleConsole}
        >
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">
              {t('console') || 'Console'}
            </span>
            {errorCount > 0 && (
              <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                {errorCount}
              </Badge>
            )}
            {warnCount > 0 && (
              <Badge variant="outline" className="h-4 px-1 text-[10px] text-yellow-500 border-yellow-500/30">
                {warnCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {showConsole && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearConsoleLogs();
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('clearConsole') || 'Clear Console'}</TooltipContent>
              </Tooltip>
            )}
            {showConsole ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Console output */}
        {showConsole && (
          <div
            ref={scrollRef}
            className="overflow-auto font-mono text-xs"
            style={{ maxHeight }}
          >
            {consoleLogs.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <span>{t('noConsoleLogs') || 'No console output'}</span>
              </div>
            ) : (
              consoleLogs.map((entry) => {
                const config = LEVEL_CONFIG[entry.level];
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-start gap-2 px-3 py-1 border-b border-border/50 hover:bg-muted/30',
                      config.bgColor
                    )}
                  >
                    <span className={cn('mt-0.5 shrink-0', config.color)}>
                      {config.icon}
                    </span>
                    <span className={cn('flex-1 break-all whitespace-pre-wrap', config.color)}>
                      {entry.message}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {entry.count > 1 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                          {entry.count}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default PreviewConsole;
