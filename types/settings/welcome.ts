/**
 * Welcome Settings Types
 * Type definitions for welcome page customization
 */

import type { ChatMode } from '@/types/core';

/**
 * Time-based greeting period
 */
export type GreetingTimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Welcome page layout style
 */
export type WelcomeLayoutStyle = 'default' | 'centered' | 'minimal' | 'hero';

/**
 * Time-based greeting configuration
 */
export interface TimeBasedGreeting {
  enabled: boolean;
  /** Custom greeting for each time period (empty = use default) */
  morning: string;
  afternoon: string;
  evening: string;
  night: string;
}

/**
 * Custom emoji/icon configuration for welcome header
 */
export interface WelcomeIconConfig {
  /** Type of icon to display */
  type: 'default' | 'emoji' | 'avatar' | 'text';
  /** Emoji character when type is 'emoji' */
  emoji: string;
  /** Avatar URL when type is 'avatar' */
  avatarUrl: string;
  /** Text/initials when type is 'text' */
  text: string;
}

/**
 * Custom background gradient for welcome header
 */
export interface WelcomeGradientConfig {
  enabled: boolean;
  /** CSS gradient string (e.g., 'from-blue-500/10 to-purple-500/10') */
  customGradient: string;
}

/**
 * Icon type for custom suggestions
 */
export type SuggestionIconType =
  | 'MessageSquare'
  | 'Code'
  | 'FileText'
  | 'Globe'
  | 'Brain'
  | 'Wrench'
  | 'BookOpen'
  | 'TrendingUp'
  | 'Lightbulb'
  | 'Database'
  | 'Image'
  | 'Languages'
  | 'Search'
  | 'Zap'
  | 'HelpCircle'
  | 'Target'
  | 'Sparkles'
  | 'Bot'
  | 'GraduationCap'
  | 'Wand2'
  | 'FolderKanban'
  | 'Link2';

/**
 * Custom suggestion prompt for welcome page
 */
export interface CustomSuggestion {
  id: string;
  icon: SuggestionIconType;
  title: string;
  description: string;
  prompt: string;
  enabled: boolean;
}

/**
 * Quick access link configuration
 */
export interface QuickAccessLink {
  id: string;
  icon: SuggestionIconType;
  title: string;
  description: string;
  href: string;
  color: string;
  enabled: boolean;
}

/**
 * Section visibility toggles for welcome page
 */
export interface WelcomeSectionVisibility {
  /** Show the header with mode icon, title, and description */
  header: boolean;
  /** Show the feature badges */
  featureBadges: boolean;
  /** Show the mode switcher tabs */
  modeSwitcher: boolean;
  /** Show the template selector button */
  templateSelector: boolean;
  /** Show suggestion cards */
  suggestions: boolean;
  /** Show quick access links (Designer, Projects) */
  quickAccess: boolean;
  /** Show the A2UI interactive demo */
  a2uiDemo: boolean;
}

/**
 * Welcome page settings
 */
export interface WelcomeSettings {
  /** Whether welcome page customization is enabled */
  enabled: boolean;

  /** Custom greeting text (empty = use default) */
  customGreeting: string;

  /** Custom description text (empty = use default) */
  customDescription: string;

  /** Whether to show an avatar image */
  showAvatar: boolean;

  /** Custom avatar URL (empty = no avatar) */
  avatarUrl: string;

  /** Section visibility settings */
  sectionsVisibility: WelcomeSectionVisibility;

  /** Custom suggestions per mode (merged with defaults) */
  customSuggestions: Record<ChatMode, CustomSuggestion[]>;

  /** Whether to hide default suggestions when custom ones exist */
  hideDefaultSuggestions: boolean;

  /** Custom quick access links (replaces defaults if provided) */
  quickAccessLinks: QuickAccessLink[];

  /** Whether to use custom quick access links instead of defaults */
  useCustomQuickAccess: boolean;

  /** Default mode to show on welcome page */
  defaultMode: ChatMode;

  /** Maximum number of suggestions to display per mode */
  maxSuggestionsPerMode: number;

  /** User display name for personalized greeting */
  userName: string;

  /** Time-based greeting configuration */
  timeBasedGreeting: TimeBasedGreeting;

  /** Welcome page layout style */
  layoutStyle: WelcomeLayoutStyle;

  /** Custom icon/emoji/avatar for welcome header */
  iconConfig: WelcomeIconConfig;

  /** Custom background gradient for welcome header */
  gradientConfig: WelcomeGradientConfig;

  /** Custom suggestion prompts for simplified mode (per mode, strings only) */
  simplifiedSuggestions: Record<ChatMode, string[]>;

  /** Whether to use custom simplified suggestions instead of defaults */
  useCustomSimplifiedSuggestions: boolean;
}

/**
 * Default section visibility settings
 */
export const DEFAULT_SECTION_VISIBILITY: WelcomeSectionVisibility = {
  header: true,
  featureBadges: true,
  modeSwitcher: true,
  templateSelector: true,
  suggestions: true,
  quickAccess: true,
  a2uiDemo: true,
};

/**
 * Default time-based greeting settings
 */
export const DEFAULT_TIME_BASED_GREETING: TimeBasedGreeting = {
  enabled: false,
  morning: '',
  afternoon: '',
  evening: '',
  night: '',
};

/**
 * Default welcome icon config
 */
export const DEFAULT_WELCOME_ICON_CONFIG: WelcomeIconConfig = {
  type: 'default',
  emoji: '✨',
  avatarUrl: '',
  text: '',
};

/**
 * Default gradient config
 */
export const DEFAULT_WELCOME_GRADIENT_CONFIG: WelcomeGradientConfig = {
  enabled: false,
  customGradient: '',
};

/**
 * Default welcome page settings
 */
export const DEFAULT_WELCOME_SETTINGS: WelcomeSettings = {
  enabled: true,
  customGreeting: '',
  customDescription: '',
  showAvatar: false,
  avatarUrl: '',
  sectionsVisibility: { ...DEFAULT_SECTION_VISIBILITY },
  customSuggestions: {
    chat: [],
    agent: [],
    research: [],
    learning: [],
  },
  hideDefaultSuggestions: false,
  quickAccessLinks: [],
  useCustomQuickAccess: false,
  defaultMode: 'chat',
  maxSuggestionsPerMode: 4,
  userName: '',
  timeBasedGreeting: { ...DEFAULT_TIME_BASED_GREETING },
  layoutStyle: 'default',
  iconConfig: { ...DEFAULT_WELCOME_ICON_CONFIG },
  gradientConfig: { ...DEFAULT_WELCOME_GRADIENT_CONFIG },
  simplifiedSuggestions: {
    chat: [],
    agent: [],
    research: [],
    learning: [],
  },
  useCustomSimplifiedSuggestions: false,
};

/**
 * Get current time period based on hour
 */
export function getCurrentTimePeriod(): GreetingTimePeriod {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Default time-based greetings (used when custom ones are empty)
 */
export const DEFAULT_TIME_GREETINGS: Record<GreetingTimePeriod, { en: string; 'zh-CN': string }> = {
  morning: { en: 'Good morning', 'zh-CN': '早上好' },
  afternoon: { en: 'Good afternoon', 'zh-CN': '下午好' },
  evening: { en: 'Good evening', 'zh-CN': '晚上好' },
  night: { en: 'Good evening', 'zh-CN': '晚上好' },
};

/**
 * Default quick access links
 */
export const DEFAULT_QUICK_ACCESS_LINKS: QuickAccessLink[] = [
  {
    id: 'designer',
    icon: 'Wand2',
    title: 'Designer',
    description: 'Build UI components with AI',
    href: '/designer',
    color: 'purple',
    enabled: true,
  },
  {
    id: 'projects',
    icon: 'FolderKanban',
    title: 'Projects',
    description: 'Manage knowledge & contexts',
    href: '/projects',
    color: 'blue',
    enabled: true,
  },
];
