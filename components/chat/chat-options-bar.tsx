'use client';

/**
 * ChatOptionsBar - Toggle bar for web search and thinking mode
 * Note: Tooltip temporarily disabled due to Radix UI infinite loop issues
 */

import { Globe, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatOptionsBarProps {
  webSearchEnabled: boolean;
  thinkingEnabled: boolean;
  onWebSearchChange: (enabled: boolean) => void;
  onThinkingChange: (enabled: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function ChatOptionsBar({
  webSearchEnabled,
  thinkingEnabled,
  onWebSearchChange,
  onThinkingChange,
  disabled = false,
  className,
}: ChatOptionsBarProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Web Search Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 gap-1.5 px-2 text-xs font-normal transition-colors',
          webSearchEnabled
            ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400'
            : 'text-muted-foreground hover:text-foreground'
        )}
        onClick={() => onWebSearchChange(!webSearchEnabled)}
        disabled={disabled}
        title={`${webSearchEnabled ? 'Disable' : 'Enable'} web search`}
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search</span>
      </Button>

      {/* Thinking Mode Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 gap-1.5 px-2 text-xs font-normal transition-colors',
          thinkingEnabled
            ? 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 dark:text-purple-400'
            : 'text-muted-foreground hover:text-foreground'
        )}
        onClick={() => onThinkingChange(!thinkingEnabled)}
        disabled={disabled}
        title={`${thinkingEnabled ? 'Disable' : 'Enable'} thinking mode`}
      >
        <Brain className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Think</span>
      </Button>
    </div>
  );
}

export default ChatOptionsBar;
