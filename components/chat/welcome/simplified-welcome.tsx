'use client';

/**
 * SimplifiedWelcome - Clean, minimal welcome screen like ChatGPT/Claude
 * Features centered layout, simple greeting, suggestion cards with icons, and mode switching
 * 
 * Key features:
 * - ChatGPT/Claude-like design with content positioned near input area
 * - Time-based personalized greeting (Good morning/afternoon/evening)
 * - Custom user name support for personalized experience
 * - Custom icon/emoji/avatar display
 * - Suggestion cards with contextual icons per mode
 * - i18n support for suggestions (en/zh-CN)
 * - Mode switcher dropdown for easy mode switching
 * - Responsive design: single column mobile, 2-column desktop
 * - Smooth staggered animations
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Sparkles, 
  Bot, 
  Search, 
  GraduationCap,
  ChevronDown,
  User,
  MessageSquare,
  Pen,
  Lightbulb,
  Languages,
  Code,
  BarChart3,
  Globe,
  Bug,
  TrendingUp,
  BookOpen,
  History,
  Zap,
  Brain,
  Target,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  /** @deprecated Model info is now shown in ChatHeader */
  modelName?: string;
  /** @deprecated Provider info is now shown in ChatHeader */
  providerName?: string;
}

// Suggestion with icon for each mode
interface SuggestionItem {
  icon: React.ReactNode;
  textKey: string;
  fallback: string;
}

// Suggestion definitions with icons per mode
const SUGGESTION_ITEMS: Record<ChatMode, SuggestionItem[]> = {
  chat: [
    { icon: <MessageSquare className="h-4 w-4" />, textKey: 'simplifiedSuggestions.chat.0', fallback: 'Explain quantum computing in simple terms' },
    { icon: <Pen className="h-4 w-4" />, textKey: 'simplifiedSuggestions.chat.1', fallback: 'Write a poem about the ocean' },
    { icon: <Lightbulb className="h-4 w-4" />, textKey: 'simplifiedSuggestions.chat.2', fallback: 'Help me brainstorm ideas for a birthday party' },
    { icon: <Languages className="h-4 w-4" />, textKey: 'simplifiedSuggestions.chat.3', fallback: 'What are the best practices for productivity?' },
  ],
  agent: [
    { icon: <Code className="h-4 w-4" />, textKey: 'simplifiedSuggestions.agent.0', fallback: 'Create a Python script to organize my files' },
    { icon: <BarChart3 className="h-4 w-4" />, textKey: 'simplifiedSuggestions.agent.1', fallback: 'Analyze this CSV data and create a chart' },
    { icon: <Globe className="h-4 w-4" />, textKey: 'simplifiedSuggestions.agent.2', fallback: 'Build a simple web scraper for news articles' },
    { icon: <Bug className="h-4 w-4" />, textKey: 'simplifiedSuggestions.agent.3', fallback: 'Help me debug my JavaScript code' },
  ],
  research: [
    { icon: <Zap className="h-4 w-4" />, textKey: 'simplifiedSuggestions.research.0', fallback: 'What are the latest developments in AI?' },
    { icon: <TrendingUp className="h-4 w-4" />, textKey: 'simplifiedSuggestions.research.1', fallback: 'Compare different renewable energy sources' },
    { icon: <History className="h-4 w-4" />, textKey: 'simplifiedSuggestions.research.2', fallback: 'Explain the history of the internet' },
    { icon: <BookOpen className="h-4 w-4" />, textKey: 'simplifiedSuggestions.research.3', fallback: 'What are the economic trends for 2025?' },
  ],
  learning: [
    { icon: <Brain className="h-4 w-4" />, textKey: 'simplifiedSuggestions.learning.0', fallback: 'Teach me the basics of machine learning' },
    { icon: <Target className="h-4 w-4" />, textKey: 'simplifiedSuggestions.learning.1', fallback: 'Help me understand calculus step by step' },
    { icon: <HelpCircle className="h-4 w-4" />, textKey: 'simplifiedSuggestions.learning.2', fallback: 'Explain how blockchain technology works' },
    { icon: <BookOpen className="h-4 w-4" />, textKey: 'simplifiedSuggestions.learning.3', fallback: 'Guide me through learning a new language' },
  ],
};

// Mode-specific greetings (default fallbacks when i18n is unavailable)
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

function SuggestionCard({
  icon,
  text,
  onClick,
  index,
}: {
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
  index: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex items-start gap-3 px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-2xl',
        'border border-border/50 bg-card/40',
        'hover:bg-accent/60 hover:border-border hover:shadow-sm',
        'transition-all duration-200 text-left w-full',
        'animate-in fade-in-0 slide-in-from-bottom-3'
      )}
      style={{ 
        animationDelay: `${200 + index * 75}ms`, 
        animationFillMode: 'backwards' 
      }}
    >
      <div className={cn(
        'flex items-center justify-center shrink-0 mt-0.5',
        'h-7 w-7 rounded-lg',
        'bg-primary/10 text-primary',
        'group-hover:bg-primary group-hover:text-primary-foreground',
        'transition-colors duration-200'
      )}>
        {icon}
      </div>
      <span className="text-sm text-foreground/80 group-hover:text-foreground leading-snug line-clamp-2">
        {text}
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
}: SimplifiedWelcomeProps) {
  const t = useTranslations('welcome');
  const simplifiedModeSettings = useSettingsStore((state) => state.simplifiedModeSettings);
  const welcomeSettings = useSettingsStore((state) => state.welcomeSettings);
  const language = useSettingsStore((state) => state.language);
  const hideSuggestionDescriptions = simplifiedModeSettings.hideSuggestionDescriptions;
  const hideModeSelector = simplifiedModeSettings.hideModeSelector;

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

  // Get suggestion items with i18n support
  const suggestionItems = useMemo(() => {
    const items = SUGGESTION_ITEMS[mode];

    // If custom simplified suggestions are set, use them with default icons
    if (useCustomSimplifiedSuggestions) {
      const custom = simplifiedSuggestions[mode];
      if (custom && custom.length > 0) {
        return custom.slice(0, 4).map((text, i) => ({
          icon: items[i]?.icon || <Sparkles className="h-4 w-4" />,
          text,
        }));
      }
    }

    // Use i18n keys with fallback to hardcoded strings
    return items.slice(0, 4).map((item) => {
      let text: string;
      try {
        text = t(item.textKey);
        // next-intl returns the key itself if not found
        if (text === item.textKey) {
          text = item.fallback;
        }
      } catch {
        text = item.fallback;
      }
      return { icon: item.icon, text };
    });
  }, [mode, useCustomSimplifiedSuggestions, simplifiedSuggestions, t]);

  // Handle mode change
  const handleModeChange = useCallback((newMode: ChatMode) => {
    onModeChange?.(newMode);
  }, [onModeChange]);

  // Render welcome icon based on iconConfig
  const renderWelcomeIcon = useMemo(() => {
    const iconContainerClass = cn(
      'flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl',
      'bg-gradient-to-br from-primary/15 to-primary/5',
      'animate-in fade-in-0 zoom-in-95 duration-500'
    );

    switch (iconConfig.type) {
      case 'emoji':
        return (
          <div className={iconContainerClass}>
            <span className="text-2xl sm:text-3xl">{iconConfig.emoji || '✨'}</span>
          </div>
        );
      case 'avatar':
        return (
          <Avatar
            className={cn(
              'w-12 h-12 sm:w-14 sm:h-14 border-2 border-primary/20',
              'animate-in fade-in-0 zoom-in-95 duration-500'
            )}
          >
            <AvatarImage src={iconConfig.avatarUrl} alt={userName || 'User'} />
            <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary text-base sm:text-lg">
              {userName ? userName.charAt(0).toUpperCase() : <User className="h-5 w-5 sm:h-6 sm:w-6" />}
            </AvatarFallback>
          </Avatar>
        );
      case 'text':
        return (
          <div className={iconContainerClass}>
            <span className="text-lg sm:text-xl font-bold text-primary">
              {iconConfig.text || (userName ? userName.charAt(0).toUpperCase() : 'C')}
            </span>
          </div>
        );
      default:
        return (
          <div className={iconContainerClass}>
            <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          </div>
        );
    }
  }, [iconConfig, userName]);

  return (
    <div className="flex h-full flex-col items-center justify-end px-4 pb-4 sm:pb-6">
      <div className="w-full max-w-xl sm:max-w-2xl flex flex-col items-center space-y-4 sm:space-y-6">
        {/* Welcome Icon/Emoji/Avatar */}
        {renderWelcomeIcon}

        {/* Greeting */}
        <div 
          className={cn(
            'text-center space-y-1.5 sm:space-y-2',
            'animate-in fade-in-0 slide-in-from-bottom-4 duration-500'
          )}
          style={{ animationDelay: '100ms' }}
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            {displayGreeting}
          </h1>
          {!hideSuggestionDescriptions && (
            <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto">
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
                  className="gap-2 h-8 sm:h-9 px-3 sm:px-4 rounded-full border-border/50 bg-background/50 hover:bg-accent/60 text-sm"
                >
                  {MODE_ICONS[mode]}
                  <span className="font-medium">{MODE_LABELS[mode]}</span>
                  <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
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

        {/* Suggestion Cards - 2x2 grid with icons */}
        <div 
          className={cn(
            'w-full grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5',
            'animate-in fade-in-0 duration-500'
          )}
          style={{ animationDelay: '200ms' }}
        >
          {suggestionItems.map((item, index) => (
            <SuggestionCard
              key={`${mode}-${index}`}
              icon={item.icon}
              text={item.text}
              index={index}
              onClick={() => onSuggestionClick?.(item.text)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default SimplifiedWelcome;
