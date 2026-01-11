'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { UIMessage } from '@/types';

interface QuickReplySuggestion {
  id: string;
  text: string;
  type: 'followup' | 'action' | 'clarify';
}

interface QuickReplyBarProps {
  messages: UIMessage[];
  onSelect: (text: string) => void;
  className?: string;
  disabled?: boolean;
}

const defaultSuggestions: QuickReplySuggestion[] = [
  { id: '1', text: 'Tell me more about this', type: 'followup' },
  { id: '2', text: 'Can you explain in simpler terms?', type: 'clarify' },
  { id: '3', text: 'What are the alternatives?', type: 'followup' },
  { id: '4', text: 'Show me an example', type: 'action' },
];

export function QuickReplyBar({
  messages,
  onSelect,
  className,
  disabled = false,
}: QuickReplyBarProps) {
  const t = useTranslations('chat');
  const [suggestions, setSuggestions] = useState<QuickReplySuggestion[]>(defaultSuggestions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quickRepliesEnabled] = useState(true);

  // Generate context-aware suggestions based on last messages
  const generateSuggestions = useCallback(async () => {
    if (messages.length === 0) {
      setSuggestions(defaultSuggestions);
      return;
    }

    setIsGenerating(true);
    
    // Simple heuristic-based suggestions based on last message
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage?.content?.toLowerCase() || '';

    const contextSuggestions: QuickReplySuggestion[] = [];

    // Code-related suggestions
    if (content.includes('code') || content.includes('function') || content.includes('```')) {
      contextSuggestions.push(
        { id: 'code1', text: 'Can you optimize this code?', type: 'action' },
        { id: 'code2', text: 'Add error handling', type: 'action' },
        { id: 'code3', text: 'Explain how this works', type: 'clarify' }
      );
    }

    // Question-related suggestions
    if (content.includes('?')) {
      contextSuggestions.push(
        { id: 'q1', text: 'Yes, please continue', type: 'followup' },
        { id: 'q2', text: 'No, let me clarify', type: 'clarify' },
        { id: 'q3', text: 'Can you rephrase?', type: 'clarify' }
      );
    }

    // List-related suggestions
    if (content.includes('1.') || content.includes('- ') || content.includes('• ')) {
      contextSuggestions.push(
        { id: 'list1', text: 'Expand on point 1', type: 'followup' },
        { id: 'list2', text: 'Which one do you recommend?', type: 'clarify' },
        { id: 'list3', text: 'Compare these options', type: 'action' }
      );
    }

    // Default fallback
    if (contextSuggestions.length === 0) {
      contextSuggestions.push(...defaultSuggestions);
    }

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setSuggestions(contextSuggestions.slice(0, 5));
    setIsGenerating(false);
  }, [messages]);

  // Generate suggestions on mount and when message count changes
  useEffect(() => {
    if (quickRepliesEnabled && messages.length > 0) {
      // Use timeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        generateSuggestions();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [messages.length, quickRepliesEnabled, generateSuggestions]);

  if (!quickRepliesEnabled) return null;

  const handleRefresh = () => {
    generateSuggestions();
  };

  const typeStyles: Record<QuickReplySuggestion['type'], string> = {
    followup: 'border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/10',
    action: 'border-green-500/30 hover:border-green-500/50 hover:bg-green-500/10',
    clarify: 'border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/10',
  };

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">
          {t('quickReplies')}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 ml-auto"
          onClick={handleRefresh}
          disabled={isGenerating || disabled}
        >
          <RefreshCw className={cn('h-3 w-3', isGenerating && 'animate-spin')} />
        </Button>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.id}
              variant="outline"
              size="sm"
              className={cn(
                'shrink-0 text-xs h-8 px-3 transition-all',
                typeStyles[suggestion.type],
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !disabled && onSelect(suggestion.text)}
              disabled={disabled}
            >
              {suggestion.text}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  );
}

export default QuickReplyBar;
