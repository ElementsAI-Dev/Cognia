/**
 * Welcome Settings Types
 * Type definitions for welcome page customization
 */

import type { ChatMode } from '@/types/core';

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
