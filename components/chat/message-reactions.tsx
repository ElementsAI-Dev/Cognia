'use client';

/**
 * MessageReactions - Emoji reactions for messages
 */

import { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onReact: (emoji: string) => void;
  className?: string;
}

const QUICK_REACTIONS = ['👍', '👎', '❤️', '😂', '🎉', '🤔', '👀', '🔥'];

export function MessageReactions({ reactions, onReact, className }: MessageReactionsProps) {
  const [open, setOpen] = useState(false);

  const handleReact = (emoji: string) => {
    onReact(emoji);
    setOpen(false);
  };

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {/* Existing reactions */}
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onReact(reaction.emoji)}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors',
            reaction.reacted
              ? 'bg-primary/20 border border-primary/30 text-primary'
              : 'bg-muted hover:bg-muted/80 border border-transparent'
          )}
        >
          <span>{reaction.emoji}</span>
          <span className="font-medium">{reaction.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="p-1.5 rounded hover:bg-muted transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default MessageReactions;
