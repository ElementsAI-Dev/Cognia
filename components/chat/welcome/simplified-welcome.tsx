'use client';

/**
 * SimplifiedWelcome - Clean, minimal welcome screen like ChatGPT/Claude
 * Features centered layout, simple greeting, suggestion pills, and mode switching
 * 
 * Key features:
 * - ChatGPT-like centered design with large greeting
 * - Time-based personalized greeting (Good morning/afternoon/evening)
 * - Custom user name support for personalized experience
 * - Custom icon/emoji/avatar display
 * - Custom suggestions from welcome settings
 * - Mode switcher pills for easy mode switching
 * - Model indicator showing current AI model
 * - Quick toggle to switch back to full mode
 * - Smooth animations and transitions
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Sparkles, 
  ArrowUp, 
  Bot, 
  Search, 
  GraduationCap,
  Maximize2,
  ChevronDown,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import { ProviderIcon } from '@/components/providers/ai/provider-icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Kbd } from '@/components/ui/kbd';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  getCurrentTimePeriod,
  DEFAULT_TIME_GREETINGS,
} from '@/types/settings/welcome';
import type { GreetingTimePeriod } from '@/types/settings/welcome';

interface SimplifiedWelcomeProps {
  mode: ChatMode;
  onSuggestionClick?: (suggestion: string) => void;
  onModeChange?: (mode: ChatMode) => void;
  modelName?: string;
  providerName?: string;
}

// Minimal suggestion prompts for each mode (defaults)
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

// Mode-specific greetings (default fallbacks)
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

/**
 * Build personalized greeting with time-based prefix and user name
 */
function buildPersonalizedGreeting(
  timePeriod: GreetingTimePeriod,
  timeBasedEnabled: boolean,
  timeGreetings: { morning: string; afternoon: string; evening: string; night: string },
  userName: string,
  customGreeting: string,
  modeGreeting: string,
  locale: string,
): string {
  // If custom greeting is set, use it directly (with optional name substitution)
  if (customGreeting) {
    const nameGreeting = userName ? customGreeting.replace('{name}', userName) : customGreeting;
    return nameGreeting;
  }

  // If time-based greeting is enabled, build a time-aware greeting
  if (timeBasedEnabled) {
    const customTimeGreeting = timeGreetings[timePeriod];
    const localeKey = locale === 'zh-CN' ? 'zh-CN' : 'en';
    const timePrefix = customTimeGreeting || DEFAULT_TIME_GREETINGS[timePeriod][localeKey];
    if (userName) {
      return `${timePrefix}, ${userName}`;
    }
    return timePrefix;
  }

  // If user name is set but no time-based or custom greeting, prepend name to mode greeting
  if (userName) {
    return `${modeGreeting}, ${userName}`;
  }

  return modeGreeting;
}

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
  const t = useTranslations('welcome');
  const simplifiedModeSettings = useSettingsStore((state) => state.simplifiedModeSettings);
  const welcomeSettings = useSettingsStore((state) => state.welcomeSettings);
  const language = useSettingsStore((state) => state.language);
  const setSimplifiedModePreset = useSettingsStore((state) => state.setSimplifiedModePreset);
  const hideSuggestionDescriptions = simplifiedModeSettings.hideSuggestionDescriptions;
  const hideModeSelector = simplifiedModeSettings.hideModeSelector;
  const currentPreset = simplifiedModeSettings.preset;

  const {
    userName,
    timeBasedGreeting,
    customGreeting,
    customDescription,
    iconConfig,
    useCustomSimplifiedSuggestions,
    simplifiedSuggestions,
  } = welcomeSettings;

  // Get current time period (updates on mount)
  const [timePeriod, setTimePeriod] = useState<GreetingTimePeriod>(getCurrentTimePeriod);
  useEffect(() => {
    // Update time period every minute
    const interval = setInterval(() => {
      setTimePeriod(getCurrentTimePeriod());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const defaultGreeting = MODE_GREETINGS[mode];

  // Build personalized greeting
  const displayGreeting = useMemo(() => {
    return buildPersonalizedGreeting(
      timePeriod,
      timeBasedGreeting.enabled,
      timeBasedGreeting,
      userName,
      customGreeting,
      defaultGreeting.title,
      language,
    );
  }, [timePeriod, timeBasedGreeting, userName, customGreeting, defaultGreeting.title, language]);

  const displayDescription = customDescription || defaultGreeting.subtitle;

  // Get suggestions: custom simplified suggestions or defaults
  const suggestions = useMemo(() => {
    if (useCustomSimplifiedSuggestions) {
      const custom = simplifiedSuggestions[mode];
      if (custom && custom.length > 0) return custom;
    }
    return SIMPLIFIED_SUGGESTIONS[mode];
  }, [mode, useCustomSimplifiedSuggestions, simplifiedSuggestions]);

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

  // Render welcome icon based on iconConfig
  const renderWelcomeIcon = useMemo(() => {
    switch (iconConfig.type) {
      case 'emoji':
        return (
          <div
            className={cn(
              'flex items-center justify-center w-16 h-16 rounded-2xl',
              'bg-gradient-to-br from-primary/20 to-primary/5',
              'animate-in fade-in-0 zoom-in-95 duration-500'
            )}
          >
            <span className="text-3xl">{iconConfig.emoji || '✨'}</span>
          </div>
        );
      case 'avatar':
        return (
          <Avatar
            className={cn(
              'w-16 h-16 border-2 border-primary/20',
              'animate-in fade-in-0 zoom-in-95 duration-500'
            )}
          >
            <AvatarImage src={iconConfig.avatarUrl} alt={userName || 'User'} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-lg">
              {userName ? userName.charAt(0).toUpperCase() : <User className="h-6 w-6" />}
            </AvatarFallback>
          </Avatar>
        );
      case 'text':
        return (
          <div
            className={cn(
              'flex items-center justify-center w-16 h-16 rounded-2xl',
              'bg-gradient-to-br from-primary/20 to-primary/5',
              'animate-in fade-in-0 zoom-in-95 duration-500'
            )}
          >
            <span className="text-xl font-bold text-primary">
              {iconConfig.text || (userName ? userName.charAt(0).toUpperCase() : 'C')}
            </span>
          </div>
        );
      default:
        return (
          <div
            className={cn(
              'flex items-center justify-center w-16 h-16 rounded-2xl',
              'bg-gradient-to-br from-primary/20 to-primary/5',
              'animate-in fade-in-0 zoom-in-95 duration-500'
            )}
          >
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
        );
    }
  }, [iconConfig, userName]);

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
                  className="text-xs font-normal px-2 py-0.5 bg-muted/50 hover:bg-muted cursor-default gap-1.5"
                >
                  {providerName && (
                    <ProviderIcon providerId={providerName} size={12} className="shrink-0" />
                  )}
                  {providerName && (
                    <span className="text-muted-foreground">{providerName} /</span>
                  )}
                  {modelName}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t('currentModel')}</p>
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
              <span className="text-xs hidden sm:inline">{t('fullMode')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{t('switchToFullInterface')}</p>
            <p className="text-xs text-muted-foreground">Ctrl+Shift+S</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="w-full max-w-2xl flex flex-col items-center space-y-8">
        {/* Welcome Icon/Emoji/Avatar */}
        {renderWelcomeIcon}

        {/* Greeting */}
        <div 
          className={cn(
            'text-center space-y-2',
            'animate-in fade-in-0 slide-in-from-bottom-4 duration-500'
          )}
          style={{ animationDelay: '100ms' }}
        >
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            {displayGreeting}
          </h1>
          {!hideSuggestionDescriptions && (
            <p className="text-muted-foreground text-sm sm:text-base">
              {displayDescription}
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
          <span>{t('typeMessage')}</span>
          <Kbd className="h-auto px-1.5 py-0.5 text-[10px]">
            <ArrowUp className="h-2.5 w-2.5" />
          </Kbd>
          <span>{t('toSend')}</span>
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
            {currentPreset === 'zen' ? t('zenMode') : t('focusedMode')} • {t('pressForFullInterface')}
          </p>
        )}
      </div>
    </div>
  );
}

export default SimplifiedWelcome;
