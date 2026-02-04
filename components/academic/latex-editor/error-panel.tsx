'use client';

/**
 * Error Panel Component
 * Displays LaTeX parsing errors with details
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { LaTeXError } from '@/types/latex';

interface ErrorPanelProps {
  errors: LaTeXError[];
  onErrorClick?: (error: LaTeXError) => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorPanel({
  errors,
  onErrorClick,
  onDismiss,
  className,
}: ErrorPanelProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  if (errors.length === 0) return null;

  const errorCount = errors.filter((e) => e.severity === 'error').length;
  const warningCount = errors.filter((e) => e.severity === 'warning').length;
  const infoCount = errors.filter((e) => e.severity === 'info').length;

  const getSeverityIcon = (severity: LaTeXError['severity']) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityBadgeVariant = (severity: LaTeXError['severity']) => {
    switch (severity) {
      case 'error':
        return 'destructive' as const;
      case 'warning':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn('border-t', className)}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">Problems</span>
            <div className="flex items-center gap-1">
              {errorCount > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {errorCount}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {warningCount}
                </Badge>
              )}
              {infoCount > 0 && (
                <Badge variant="outline" className="h-5 px-1.5 text-xs">
                  {infoCount}
                </Badge>
              )}
            </div>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="max-h-32 overflow-auto">
          {errors.map((error) => (
            <div
              key={error.id}
              className={cn(
                'flex items-start gap-2 px-3 py-1.5 text-sm border-b last:border-b-0',
                'hover:bg-muted/30 cursor-pointer transition-colors'
              )}
              onClick={() => onErrorClick?.(error)}
            >
              {getSeverityIcon(error.severity)}
              <div className="flex-1 min-w-0">
                <p className="truncate">{error.message}</p>
                {error.suggestion && (
                  <p className="text-xs text-muted-foreground truncate">
                    💡 {error.suggestion}
                  </p>
                )}
              </div>
              <Badge variant={getSeverityBadgeVariant(error.severity)} className="text-xs shrink-0">
                Ln {error.line}, Col {error.column}
              </Badge>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default ErrorPanel;
