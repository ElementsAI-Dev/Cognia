'use client';

/**
 * ChatDesignerPanel - Integrated designer panel for chat interface
 * Shows live preview when in web-design agent mode
 */

import { useState, useCallback } from 'react';
import { X, Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ReactSandbox } from '@/components/designer';

interface ChatDesignerPanelProps {
  code: string;
  onCodeChange?: (code: string) => void;
  onClose?: () => void;
  className?: string;
}

export function ChatDesignerPanel({
  code,
  onCodeChange,
  onClose,
  className,
}: ChatDesignerPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleOpenInDesigner = useCallback(() => {
    // Open in standalone designer page with the current code
    const encodedCode = encodeURIComponent(code);
    window.open(`/designer?code=${encodedCode}`, '_blank');
  }, [code]);

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex flex-col border rounded-lg bg-background overflow-hidden transition-all duration-300',
          isExpanded ? 'h-[600px]' : 'h-[400px]',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Live Preview
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleOpenInDesigner}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open in Designer</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isExpanded ? 'Minimize' : 'Maximize'}</TooltipContent>
            </Tooltip>
            {onClose && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Sandbox */}
        <div className="flex-1 overflow-hidden">
          <ReactSandbox
            code={code}
            onCodeChange={onCodeChange}
            showFileExplorer={false}
            showConsole={false}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default ChatDesignerPanel;
