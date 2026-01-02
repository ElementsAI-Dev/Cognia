'use client';

/**
 * MessageReactions - Emoji reactions for messages
 * Enhanced with animations, statistics, custom emoji support, and user attribution
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { SmilePlus, Users, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { EmojiReaction } from '@/types/message';

interface ReactionUser {
  id: string;
  name: string;
  avatar?: string;
}

interface ExtendedEmojiReaction extends EmojiReaction {
  users?: ReactionUser[];
  lastReactedAt?: Date;
}

interface MessageReactionsProps {
  reactions: ExtendedEmojiReaction[];
  onReact: (emoji: string) => void;
  onRemoveReaction?: (emoji: string) => void;
  showStats?: boolean;
  allowCustomEmoji?: boolean;
  className?: string;
}

// Organized emoji categories
const EMOJI_CATEGORIES = {
  quick: ['👍', '👎', '❤️', '😂', '🎉', '🤔', '👀', '🔥'],
  faces: ['😀', '😊', '🥰', '😎', '🤩', '😢', '😮', '😡'],
  gestures: ['👏', '🙌', '💪', '🤝', '✌️', '🤞', '👋', '🫡'],
  objects: ['💡', '⭐', '💯', '🎯', '🚀', '💎', '🏆', '📌'],
};

const QUICK_REACTIONS = EMOJI_CATEGORIES.quick;

export function MessageReactions({ 
  reactions, 
  onReact,
  onRemoveReaction,
  showStats = false,
  allowCustomEmoji = true,
  className 
}: MessageReactionsProps) {
  const t = useTranslations('reactions');
  const [open, setOpen] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');
  const [activeTab, setActiveTab] = useState('quick');
  const [animatingEmoji, setAnimatingEmoji] = useState<string | null>(null);

  const handleReact = useCallback((emoji: string) => {
    // Trigger animation
    setAnimatingEmoji(emoji);
    setTimeout(() => setAnimatingEmoji(null), 300);
    
    onReact(emoji);
    setOpen(false);
    setCustomEmoji('');
  }, [onReact]);

  const handleRemoveReaction = useCallback((emoji: string) => {
    if (onRemoveReaction) {
      onRemoveReaction(emoji);
    } else {
      // Toggle behavior - if already reacted, remove it
      onReact(emoji);
    }
  }, [onReact, onRemoveReaction]);

  const handleCustomEmoji = useCallback(() => {
    if (customEmoji.trim()) {
      // Validate it's actually an emoji (basic check)
      const emojiRegex = /\p{Emoji}/u;
      if (emojiRegex.test(customEmoji.trim())) {
        handleReact(customEmoji.trim());
      }
    }
  }, [customEmoji, handleReact]);

  // Calculate statistics
  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
  const topReaction = reactions.length > 0 
    ? reactions.reduce((a, b) => a.count > b.count ? a : b) 
    : null;

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {/* Existing reactions with enhanced display */}
      {reactions.map((reaction) => (
        <Tooltip key={reaction.emoji}>
          <TooltipTrigger asChild>
            <button
              onClick={() => reaction.reacted ? handleRemoveReaction(reaction.emoji) : handleReact(reaction.emoji)}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all duration-200',
                'hover:scale-105 active:scale-95',
                reaction.reacted
                  ? 'bg-primary/20 border border-primary/30 text-primary shadow-sm'
                  : 'bg-muted hover:bg-muted/80 border border-transparent hover:border-border/50',
                animatingEmoji === reaction.emoji && 'animate-bounce'
              )}
            >
              <span className={cn(
                'transition-transform duration-200',
                animatingEmoji === reaction.emoji && 'scale-125'
              )}>
                {reaction.emoji}
              </span>
              <span className="font-medium tabular-nums">{reaction.count}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-xs">
              {reaction.users && reaction.users.length > 0 ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 font-medium">
                    <Users className="h-3 w-3" />
                    {reaction.users.slice(0, 3).map(u => u.name).join(', ')}
                    {reaction.users.length > 3 && ` +${reaction.users.length - 3}`}
                  </div>
                </div>
              ) : (
                <span>{reaction.count} {reaction.count === 1 ? t('reaction') : t('reactions')}</span>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      ))}

      {/* Statistics badge */}
      {showStats && totalReactions > 0 && (
        <Badge variant="secondary" className="text-[10px] gap-1 h-5">
          <TrendingUp className="h-2.5 w-2.5" />
          {totalReactions}
        </Badge>
      )}

      {/* Add reaction button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full h-8 mb-2">
              <TabsTrigger value="quick" className="text-xs flex-1">
                <Sparkles className="h-3 w-3 mr-1" />
                {t('quick')}
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs flex-1">
                {t('all')}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="quick" className="mt-0">
              <div className="grid grid-cols-8 gap-0.5">
                {QUICK_REACTIONS.map((emoji, index) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className={cn(
                      'p-1.5 rounded hover:bg-muted transition-all text-lg',
                      'hover:scale-110 active:scale-95',
                      'animate-in fade-in-0 zoom-in-50'
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="all" className="mt-0 space-y-2">
              {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                <div key={category}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    {t(`category.${category}`)}
                  </p>
                  <div className="grid grid-cols-8 gap-0.5">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReact(emoji)}
                        className="p-1 rounded hover:bg-muted transition-all text-base hover:scale-110 active:scale-95"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
          
          {/* Custom emoji input */}
          {allowCustomEmoji && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex gap-1">
                <Input
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value)}
                  placeholder={t('customPlaceholder')}
                  className="h-7 text-xs"
                  maxLength={2}
                />
                <Button 
                  size="sm" 
                  className="h-7 px-2"
                  onClick={handleCustomEmoji}
                  disabled={!customEmoji.trim()}
                >
                  {t('add')}
                </Button>
              </div>
            </div>
          )}

          {/* Top reaction indicator */}
          {topReaction && totalReactions > 3 && (
            <div className="mt-2 pt-2 border-t flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>{t('topReaction')}: {topReaction.emoji} ({topReaction.count})</span>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default MessageReactions;
