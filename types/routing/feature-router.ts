/**
 * Feature Router Types
 *
 * Type definitions for the intelligent feature routing system
 * that detects user intent and navigates to appropriate feature pages.
 */

/**
 * All available feature IDs in the application
 */
export type FeatureId =
  | 'chat'
  | 'video-studio'
  | 'image-studio'
  | 'designer'
  | 'ppt'
  | 'academic'
  | 'speedpass'
  | 'workflows'
  | 'skills'
  | 'projects'
  | 'settings'
  | 'native-tools'
  | 'git'
  | 'observability';

/**
 * Feature category for grouping related features
 */
export type FeatureCategory =
  | 'creation' // Video, Image, Designer, PPT
  | 'research' // Academic
  | 'automation' // Workflows
  | 'management' // Projects, Skills
  | 'system' // Settings, Native Tools
  | 'development' // Git, Observability
  | 'chat'; // Main chat

/**
 * Routing mode for intent detection
 */
export type FeatureRoutingMode = 'rule-based' | 'llm-based' | 'hybrid';

/**
 * Pattern configuration for a feature
 */
export interface FeaturePatterns {
  /** Chinese language patterns */
  chinese: RegExp[];
  /** English language patterns */
  english: RegExp[];
}

/**
 * Feature route configuration
 */
export interface FeatureRoute {
  /** Unique feature identifier */
  id: FeatureId;
  /** Display name in English */
  name: string;
  /** Display name in Chinese */
  nameZh: string;
  /** Navigation path */
  path: string;
  /** Icon name (lucide-react icon) */
  icon: string;
  /** Feature category */
  category: FeatureCategory;
  /** Description in English */
  description: string;
  /** Description in Chinese */
  descriptionZh: string;
  /** Regex patterns for intent detection */
  patterns: FeaturePatterns;
  /** Additional keywords for matching */
  keywords: {
    chinese: string[];
    english: string[];
  };
  /** Priority when multiple features match (higher = more priority) */
  priority: number;
  /** Whether this feature is enabled by default */
  enabled: boolean;
  /** Optional query parameters to include when navigating */
  defaultParams?: Record<string, string>;
  /** Whether to carry the original message as context */
  carryContext?: boolean;
}

/**
 * Result of feature intent detection
 */
export interface FeatureRouteResult {
  /** Whether a feature intent was detected */
  detected: boolean;
  /** The matched feature route (if any) */
  feature: FeatureRoute | null;
  /** Confidence score (0-1) */
  confidence: number;
  /** Matched patterns/keywords that triggered the detection */
  matchedPatterns: string[];
  /** Reason for the detection */
  reason: string;
  /** Reason in Chinese */
  reasonZh: string;
  /** Alternative features that also matched (lower confidence) */
  alternatives: Array<{
    feature: FeatureRoute;
    confidence: number;
  }>;
}

/**
 * LLM-based routing result
 */
export interface LLMRouteResult {
  /** Feature ID recommended by LLM */
  featureId: FeatureId;
  /** Confidence score */
  confidence: number;
  /** LLM's reasoning */
  reasoning: string;
  /** Whether the intent is clear */
  isAmbiguous: boolean;
}

/**
 * Feature routing settings stored in settings store
 */
export interface FeatureRoutingSettings {
  /** Whether feature routing is enabled */
  enabled: boolean;
  /** Routing mode: rule-based, llm-based, or hybrid */
  routingMode: FeatureRoutingMode;
  /** Minimum confidence threshold for showing navigation suggestion */
  confidenceThreshold: number;
  /** Auto-navigate without confirmation when confidence is above this threshold */
  autoNavigateThreshold: number;
  /** Whether to auto-navigate on high confidence */
  autoNavigateEnabled: boolean;
  /** Disabled feature routes (feature IDs) */
  disabledRoutes: FeatureId[];
  /** Maximum number of suggestions to show per session */
  maxSuggestionsPerSession: number;
  /** Remember user's routing preferences */
  rememberPreferences: boolean;
  /** User's routing preferences (featureId -> preference count) */
  routePreferences: Record<FeatureId, number>;
}

/**
 * Default feature routing settings
 */
export const DEFAULT_FEATURE_ROUTING_SETTINGS: FeatureRoutingSettings = {
  enabled: true,
  routingMode: 'rule-based',
  confidenceThreshold: 0.5,
  autoNavigateThreshold: 0.9,
  autoNavigateEnabled: false,
  disabledRoutes: [],
  maxSuggestionsPerSession: 3,
  rememberPreferences: true,
  routePreferences: {} as Record<FeatureId, number>,
};

/**
 * Navigation action for the confirmation dialog
 */
export type NavigationAction = 'navigate' | 'continue' | 'dismiss';

/**
 * Props for the feature navigation dialog
 */
export interface FeatureNavigationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** The detected feature route */
  feature: FeatureRoute;
  /** Detection confidence score */
  confidence: number;
  /** Original user message that triggered detection */
  originalMessage: string;
  /** Matched patterns for display */
  matchedPatterns: string[];
  /** Callback when user confirms navigation */
  onNavigate: () => void;
  /** Callback when user wants to continue in chat */
  onContinue: () => void;
  /** Callback when user dismisses (don't show again for this feature) */
  onDismiss: () => void;
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void;
}

/**
 * Context that can be carried to the feature page
 */
export interface FeatureNavigationContext {
  /** Original user message */
  message: string;
  /** Source page */
  from: string;
  /** Timestamp */
  timestamp: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
