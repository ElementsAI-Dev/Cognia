/**
 * Providers index - exports all provider components
 *
 * Provider Hierarchy (from outermost to innermost):
 * 1. ErrorBoundaryProvider - Catches React errors
 * 2. LoggerProvider - Centralized logging
 * 3. CacheProvider - Performance optimization
 * 4. AudioProvider - Voice/audio features
 * 5. ProviderProvider - Unified AI provider state
 * 6. WebSocketProvider - Real-time connections (optional)
 * 7. I18nProvider - Internationalization
 * 8. ThemeProvider - Theme management
 * 9. TooltipProvider - UI tooltips
 * 10. SkillProvider - Built-in skills
 * 11. NativeProvider - Desktop functionality
 * 12. OnboardingProvider - Setup wizard
 *
 * Folder Structure:
 * - core/         Essential infrastructure (error, logging, cache)
 * - ai/           AI provider state management
 * - media/        Audio/Speech features
 * - network/      Real-time communication (WebSocket)
 * - native/       Desktop/Tauri functionality
 * - ui/           Theme management
 * - initializers/ App startup initialization
 */

// ============================================================================
// Core Providers - Essential infrastructure
// ============================================================================
export {
  ErrorBoundaryProvider,
  type ErrorBoundaryProviderProps,
  type ErrorBoundaryState,
  useErrorBoundary,
  navigation,
} from './core';

export {
  LoggerProvider,
  useLogger,
  useLog,
  type LoggerConfig,
  type LogEntry,
  type LogTransport,
  type LogLevel,
} from './core';

export {
  CacheProvider,
  useCache,
  useCachedAsync,
  useCachedValue,
  type CacheConfig,
  type CacheStats,
} from './core';

// ============================================================================
// AI Providers - Provider state management
// ============================================================================
export {
  ProviderProvider,
  useProviderContext,
  useProvider,
  useAvailableProviders,
  useProviderModels,
  ProviderIcon,
  type ProviderContextValue,
  type EnhancedProvider,
  type ProviderMetadata,
  type ProviderHealth,
  type ProviderHealthStatus,
} from './ai';

// ============================================================================
// Media Providers - Audio/Speech features
// ============================================================================
export {
  AudioProvider,
  useAudio,
  useSpeechToText,
  useTextToSpeech,
  type RecordingState,
  type PlaybackState,
  type SpeechRecognitionResult,
  type RecordingOptions,
  // Type definitions
  type ISpeechRecognition,
  type ISpeechRecognitionErrorEvent,
  type ISpeechRecognitionEvent,
  type ISpeechRecognitionResult,
  type ISpeechRecognitionAlternative,
  type SpeechRecognitionResultList,
  // Type guards
  isSpeechRecognitionSupported,
  getSpeechRecognition,
  isSpeechSynthesisSupported,
} from './media';

// ============================================================================
// Network Providers - Real-time communication
// ============================================================================
export {
  WebSocketProvider,
  useWebSocket,
  useWebSocketMessage,
  useWebSocketState,
  type ConnectionState,
  type WebSocketConfig,
  type WebSocketMessage,
  type WebSocketEventHandler,
  type WebSocketEventType,
} from './network';

// ============================================================================
// Native Providers - Desktop/Tauri functionality
// ============================================================================
export { NativeProvider, type NativeProviderProps } from './native';

export {
  StrongholdProvider,
  useStrongholdContext,
  useStrongholdOptional,
} from './native';

// ============================================================================
// UI Providers - Theme management
// ============================================================================
export { ThemeProvider, useTheme, type Theme } from './ui';

// ============================================================================
// Initializers - App startup initialization
// ============================================================================
export { LocaleInitializer } from './initializers';

export { StoreInitializer } from './initializers';

export { SkillSyncInitializer } from './initializers';

export { ContextSyncInitializer } from './initializers';

export {
  SkillProvider,
  useInitializeSkills,
  initializeSkillsSync,
} from './initializers';
