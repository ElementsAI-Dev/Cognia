'use client';

/**
 * SimplifiedWelcome - Clean, minimal welcome screen like ChatGPT/Claude
 * Features centered layout, simple greeting, and suggestion pills
 */

import { useMemo } from 'react';
import { Sparkles, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import type { ChatMode } from '@/types';

interface SimplifiedWelcomeProps {
  mode: ChatMode;
  onSuggestionClick?: (suggestion: string) => void;
}

// Minimal suggestion prompts for each mode
const SIMPLIFIED_SUGGESTIONS: Record<ChatMode, string[]> = {
  chat: [
    'Explain quantum computing in simple terms',
    'Write a poem about the ocean',
    'Help me brainstorm ideas for a birthday party',
    'What are the best practices for productivity?',
  ],
  agent: [
    'Create a Python script to organize my files',
    'Analyze this CSV data and create a chart',
    'Build a simple web scraper for news articles',
    'Help me debug my JavaScript code',
  ],
  research: [
    'What are the latest developments in AI?',
    'Compare different renewable energy sources',
    'Explain the history of the internet',
    'What are the economic trends for 2024?',
  ],
  learning: [
    'Teach me the basics of machine learning',
    'Help me understand calculus step by step',
    'Explain how blockchain technology works',
    'Guide me through learning a new language',
  ],
};

// Mode-specific greetings
const MODE_GREETINGS: Record<ChatMode, { title: string; subtitle: string }> = {
  chat: {
    title: 'How can I help you today?',
    subtitle: 'Ask me anything or choose a suggestion below',
  },
  agent: {
    title: 'What would you like me to do?',
    subtitle: 'I can help with code, data, and complex tasks',
  },
  research: {
    title: 'What should we explore?',
    subtitle: 'I\'ll search and analyze information for you',
  },
  learning: {
    title: 'What would you like to learn?',
    subtitle: 'I\'ll guide you through any topic step by step',
  },
};

function SuggestionPill({
  suggestion,
  onClick,
  index,
}: {
  suggestion: string;
  onClick: () => void;
  index: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group px-4 py-2.5 rounded-xl border border-border/60 bg-card/50',
        'hover:bg-accent/80 hover:border-accent-foreground/20 hover:shadow-sm',
        'transition-all duration-200 text-left',
        'animate-in fade-in-0 slide-in-from-bottom-2'
      )}
      style={{ 
        animationDelay: `${index * 50}ms`, 
        animationFillMode: 'backwards' 
      }}
    >
      <span className="text-sm text-foreground/90 group-hover:text-foreground line-clamp-1">
        {suggestion}
      </span>
    </button>
  );
}

export function SimplifiedWelcome({
  mode,
  onSuggestionClick,
}: SimplifiedWelcomeProps) {
  const simplifiedModeSettings = useSettingsStore((state) => state.simplifiedModeSettings);
  const hideSuggestionDescriptions = simplifiedModeSettings.hideSuggestionDescriptions;

  const greeting = MODE_GREETINGS[mode];
  const suggestions = SIMPLIFIED_SUGGESTIONS[mode];

  // Only show 4 suggestions in simplified mode
  const visibleSuggestions = useMemo(() => {
    return suggestions.slice(0, 4);
  }, [suggestions]);

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl flex flex-col items-center space-y-8">
        {/* Logo/Icon */}
        <div 
          className={cn(
            'flex items-center justify-center w-16 h-16 rounded-2xl',
            'bg-gradient-to-br from-primary/20 to-primary/5',
            'animate-in fade-in-0 zoom-in-95 duration-500'
          )}
        >
          <Sparkles className="h-8 w-8 text-primary" />
        </div>

        {/* Greeting */}
        <div 
          className={cn(
            'text-center space-y-2',
            'animate-in fade-in-0 slide-in-from-bottom-4 duration-500'
          )}
          style={{ animationDelay: '100ms' }}
        >
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            {greeting.title}
          </h1>
          {!hideSuggestionDescriptions && (
            <p className="text-muted-foreground text-sm sm:text-base">
              {greeting.subtitle}
            </p>
          )}
        </div>

        {/* Suggestion Pills - 2x2 grid */}
        <div 
          className={cn(
            'w-full grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3',
            'animate-in fade-in-0 duration-500'
          )}
          style={{ animationDelay: '200ms' }}
        >
          {visibleSuggestions.map((suggestion, index) => (
            <SuggestionPill
              key={index}
              suggestion={suggestion}
              index={index}
              onClick={() => onSuggestionClick?.(suggestion)}
            />
          ))}
        </div>

        {/* Subtle hint */}
        <p 
          className={cn(
            'text-xs text-muted-foreground/60 flex items-center gap-1.5',
            'animate-in fade-in-0 duration-500'
          )}
          style={{ animationDelay: '400ms' }}
        >
          <span>Type a message or press</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 text-[10px] font-medium">
            <ArrowUp className="h-2.5 w-2.5 inline" />
          </kbd>
          <span>to send</span>
        </p>
      </div>
    </div>
  );
}

export default SimplifiedWelcome;
