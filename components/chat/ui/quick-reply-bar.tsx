'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Suggestions, Suggestion, type SuggestionCategory } from '@/components/ai-elements/suggestion';
import { cn } from '@/lib/utils';
import type { UIMessage } from '@/types';

interface QuickReplySuggestion {
  id: string;
  textKey: string; // i18n key
  type: 'followup' | 'action' | 'clarify';
}

interface QuickReplyBarProps {
  messages: UIMessage[];
  onSelect: (text: string) => void;
  className?: string;
  disabled?: boolean;
}

// Suggestion keys for i18n - actual text will be fetched from translations
const defaultSuggestionKeys: QuickReplySuggestion[] = [
  { id: '1', textKey: 'suggestions.tellMeMore', type: 'followup' },
  { id: '2', textKey: 'suggestions.explainSimpler', type: 'clarify' },
  { id: '3', textKey: 'suggestions.alternatives', type: 'followup' },
  { id: '4', textKey: 'suggestions.showExample', type: 'action' },
];

export function QuickReplyBar({
  messages,
  onSelect,
  className,
  disabled = false,
}: QuickReplyBarProps) {
  const t = useTranslations('chat');
  const [suggestions, setSuggestions] = useState<QuickReplySuggestion[]>(defaultSuggestionKeys);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quickRepliesEnabled] = useState(true);

  // Helper to get translated text for a suggestion
  const getSuggestionText = (textKey: string): string => {
    return t(textKey);
  };

  // Generate context-aware suggestions based on last messages
  const generateSuggestions = useCallback(async () => {
    if (messages.length === 0) {
      setSuggestions(defaultSuggestionKeys);
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
        { id: 'code1', textKey: 'suggestions.optimizeCode', type: 'action' },
        { id: 'code2', textKey: 'suggestions.addErrorHandling', type: 'action' },
        { id: 'code3', textKey: 'suggestions.explainHowWorks', type: 'clarify' }
      );
    }

    // Question-related suggestions
    if (content.includes('?')) {
      contextSuggestions.push(
        { id: 'q1', textKey: 'suggestions.yesContinue', type: 'followup' },
        { id: 'q2', textKey: 'suggestions.noLetMeClarify', type: 'clarify' },
        { id: 'q3', textKey: 'suggestions.canYouRephrase', type: 'clarify' }
      );
    }

    // List-related suggestions
    if (content.includes('1.') || content.includes('- ') || content.includes('• ')) {
      contextSuggestions.push(
        { id: 'list1', textKey: 'suggestions.expandPoint1', type: 'followup' },
        { id: 'list2', textKey: 'suggestions.whichRecommend', type: 'clarify' },
        { id: 'list3', textKey: 'suggestions.compareOptions', type: 'action' }
      );
    }

    // Default fallback
    if (contextSuggestions.length === 0) {
      contextSuggestions.push(...defaultSuggestionKeys);
    }

    // Simulate a small delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 300));

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

  // Map internal types to ai-elements SuggestionCategory
  const typeToCategory: Record<QuickReplySuggestion['type'], SuggestionCategory> = {
    followup: 'follow-up',
    action: 'quick',
    clarify: 'explore',
  };

  return (
    <div className={cn('relative mx-auto max-w-5xl px-4 py-2', className)}>
      {/* Header with refresh button */}
      <div className="flex items-center gap-2 mb-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-auto rounded-full hover:bg-muted"
          onClick={handleRefresh}
          disabled={isGenerating || disabled}
          title={t('suggestions.refresh') || 'Refresh suggestions'}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isGenerating && 'animate-spin')} />
        </Button>
      </div>

      {/* Suggestions using ai-elements */}
      <Suggestions 
        variant="horizontal" 
        title={t('quickReplies')} 
        showTitle
      >
        {suggestions.map((suggestion) => {
          const text = getSuggestionText(suggestion.textKey);
          return (
            <Suggestion
              key={suggestion.id}
              suggestion={text}
              category={typeToCategory[suggestion.type]}
              onClick={() => !disabled && onSelect(text)}
              disabled={disabled}
            />
          );
        })}
      </Suggestions>
    </div>
  );
}

export default QuickReplyBar;
