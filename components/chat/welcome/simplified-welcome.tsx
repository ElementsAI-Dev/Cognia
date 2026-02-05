'use client';

/**
 * SimplifiedWelcome - Clean, minimal welcome screen like ChatGPT/Claude
 * Features centered layout, simple greeting, suggestion pills, and mode switching
 * 
 * Key features:
 * - ChatGPT-like centered design with large greeting
 * - Mode switcher pills for easy mode switching
 * - Model indicator showing current AI model
 * - Quick toggle to switch back to full mode
 * - Smooth animations and transitions
 */

import { useMemo, useCallback } from 'react';
import { 
  Sparkles, 
  ArrowUp, 
  Bot, 
  Search, 
  GraduationCap,
  Maximize2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Kbd } from '@/components/ui/kbd';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ChatMode } from '@/types';

interface SimplifiedWelcomeProps {
  mode: ChatMode;
  onSuggestionClick?: (suggestion: string) => void;
  onModeChange?: (mode: ChatMode) => void;
  modelName?: string;
  providerName?: string;
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

// Mode icons for the switcher
const MODE_ICONS: Record<ChatMode, React.ReactNode> = {
  chat: <Sparkles className="h-4 w-4" />,
  agent: <Bot className="h-4 w-4" />,
  research: <Search className="h-4 w-4" />,
  learning: <GraduationCap className="h-4 w-4" />,
};

// Mode labels
const MODE_LABELS: Record<ChatMode, string> = {
  chat: 'Chat',
  agent: 'Agent',
  research: 'Research',
  learning: 'Learning',
};

export function SimplifiedWelcome({
  mode,
  onSuggestionClick,
  onModeChange,
  modelName,
  providerName,
}: SimplifiedWelcomeProps) {
  const simplifiedModeSettings = useSettingsStore((state) => state.simplifiedModeSettings);
  const setSimplifiedModePreset = useSettingsStore((state) => state.setSimplifiedModePreset);
  const hideSuggestionDescriptions = simplifiedModeSettings.hideSuggestionDescriptions;
  const hideModeSelector = simplifiedModeSettings.hideModeSelector;
  const currentPreset = simplifiedModeSettings.preset;

  const greeting = MODE_GREETINGS[mode];
  const suggestions = SIMPLIFIED_SUGGESTIONS[mode];

  // Only show 4 suggestions in simplified mode
  const visibleSuggestions = useMemo(() => {
    return suggestions.slice(0, 4);
  }, [suggestions]);

  // Handle switching to full mode
  const handleSwitchToFullMode = useCallback(() => {
    setSimplifiedModePreset('off');
  }, [setSimplifiedModePreset]);

  // Handle mode change
  const handleModeChange = useCallback((newMode: ChatMode) => {
    onModeChange?.(newMode);
  }, [onModeChange]);

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8 relative">
      {/* Top bar with model indicator and full mode toggle */}
      <div 
        className={cn(
          'absolute top-4 left-0 right-0 flex items-center justify-between px-4',
          'animate-in fade-in-0 duration-500'
        )}
      >
        {/* Model indicator */}
        <div className="flex items-center gap-2">
          {modelName && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="secondary" 
                  className="text-xs font-normal px-2 py-0.5 bg-muted/50 hover:bg-muted cursor-default"
                >
                  {providerName && (
                    <span className="text-muted-foreground mr-1">{providerName} /</span>
                  )}
                  {modelName}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Current AI model</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Full mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSwitchToFullMode}
              className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Maximize2 className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">Full Mode</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Switch to full interface</p>
            <p className="text-xs text-muted-foreground">Ctrl+Shift+S</p>
          </TooltipContent>
        </Tooltip>
      </div>

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

        {/* Mode Switcher - ChatGPT style dropdown */}
        {!hideModeSelector && onModeChange && (
          <div 
            className={cn(
              'animate-in fade-in-0 slide-in-from-bottom-2 duration-500'
            )}
            style={{ animationDelay: '150ms' }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-9 px-4 rounded-full border-border/60 bg-background/50 hover:bg-accent/80"
                >
                  {MODE_ICONS[mode]}
                  <span className="font-medium">{MODE_LABELS[mode]}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-40">
                {(Object.keys(MODE_LABELS) as ChatMode[]).map((m) => (
                  <DropdownMenuItem
                    key={m}
                    onClick={() => handleModeChange(m)}
                    className={cn(
                      'gap-2 cursor-pointer',
                      mode === m && 'bg-accent'
                    )}
                  >
                    {MODE_ICONS[m]}
                    <span>{MODE_LABELS[m]}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

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
          <Kbd className="h-auto px-1.5 py-0.5 text-[10px]">
            <ArrowUp className="h-2.5 w-2.5" />
          </Kbd>
          <span>to send</span>
        </p>

        {/* Simplified mode indicator */}
        {currentPreset !== 'off' && (
          <p 
            className={cn(
              'text-[10px] text-muted-foreground/40',
              'animate-in fade-in-0 duration-500'
            )}
            style={{ animationDelay: '500ms' }}
          >
            {currentPreset === 'zen' ? 'Zen Mode' : 'Focused Mode'} • Press Ctrl+Shift+S for full interface
          </p>
        )}
      </div>
    </div>
  );
}

export default SimplifiedWelcome;
