/**
 * Shared store mocks for testing
 * Import this in test files to get consistent mock implementations
 */

import type { ChatMode } from '@/types/core/session';

// Mock session data
export const mockSessions = [
  {
    id: 'session-1',
    title: 'Test Session',
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat' as ChatMode,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mode configurations - matches ChatMode = 'chat' | 'agent' | 'research' | 'learning'
const MODE_CONFIGS: Record<ChatMode, { name: string; description: string; icon: string }> = {
  chat: { name: 'Chat', description: 'Regular conversation', icon: 'MessageSquare' },
  agent: { name: 'Agent', description: 'Autonomous agent mode', icon: 'Bot' },
  research: { name: 'Research', description: 'In-depth analysis', icon: 'Search' },
  learning: { name: 'Learning', description: 'Learning mode', icon: 'BookOpen' },
};

// Mock functions
export const mockUpdateSession = jest.fn();
export const mockSelectPreset = jest.fn();
export const mockClearMessages = jest.fn();
export const mockOpenPanel = jest.fn();
export const mockClosePanel = jest.fn();
export const mockGetProject = jest.fn(() => null);
export const mockGetModeConfig = jest.fn((mode: ChatMode) => MODE_CONFIGS[mode] || MODE_CONFIGS.chat);
export const mockGetRecentModes = jest.fn((count: number) => ['chat', 'agent'].slice(0, count));
export const mockSetMode = jest.fn();
export const mockGetActiveSession = jest.fn(() => mockSessions[0]);
export const mockCreateSession = jest.fn(() => 'new-session-id');
export const mockDeleteSession = jest.fn();
export const mockSetActiveSession = jest.fn();

// Session store state
export const createSessionStoreState = (overrides = {}) => ({
  sessions: mockSessions,
  activeSessionId: 'session-1',
  updateSession: mockUpdateSession,
  getModeConfig: mockGetModeConfig,
  getRecentModes: mockGetRecentModes,
  setMode: mockSetMode,
  currentMode: 'chat' as ChatMode,
  getActiveSession: mockGetActiveSession,
  createSession: mockCreateSession,
  deleteSession: mockDeleteSession,
  setActiveSession: mockSetActiveSession,
  ...overrides,
});

// Settings store state
export const createSettingsStoreState = (overrides = {}) => ({
  providerSettings: { openai: { enabled: true, apiKey: 'test' } },
  theme: 'dark',
  language: 'en',
  agentTraceSettings: {
    enabled: true,
    maxRecords: 1000,
    autoCleanupDays: 30,
    traceShellCommands: true,
    traceCodeEdits: true,
    traceFailedCalls: false,
  },
  simplifiedModeSettings: { 
    enabled: false, 
    preset: 'off',
    hideModelSelector: false,
    hideModeSelector: false,
    hideSessionActions: false,
    hideAdvancedInputControls: false,
    hideAttachmentButton: false,
    hideWebSearchToggle: false,
    hideThinkingToggle: false,
    hidePresetSelector: false,
    hideContextIndicator: false,
    hideFeatureBadges: false,
    hideSuggestionDescriptions: false,
    hideQuickAccessLinks: false,
    autoHideSidebar: false,
    hideMessageActions: false,
    hideMessageTimestamps: false,
    hideTokenCount: false,
    toggleShortcut: 'ctrl+shift+s',
  },
  autoRouterSettings: { showRoutingIndicator: false },
  addAlwaysAllowedTool: jest.fn(),
  backgroundSettings: {
    mode: 'single' as const,
    layers: [
      {
        id: 'layer-1',
        enabled: true,
        source: 'preset' as const,
        imageUrl: '',
        localAssetId: null,
        presetId: 'gradient-blue',
        fit: 'cover' as const,
        position: 'center' as const,
        opacity: 100,
        blur: 0,
        overlayColor: '#000000',
        overlayOpacity: 0,
        brightness: 100,
        saturation: 100,
        attachment: 'fixed' as const,
        animation: 'none' as const,
        animationSpeed: 5,
        contrast: 100,
        grayscale: 0,
      },
    ],
    slideshow: {
      slides: [],
      intervalMs: 15000,
      transitionMs: 1000,
      shuffle: false,
    },
    enabled: false,
    source: 'preset' as const,
    imageUrl: '',
    localAssetId: null,
    presetId: 'gradient-blue',
    fit: 'cover' as const,
    position: 'center' as const,
    opacity: 100,
    blur: 0,
    overlayColor: '#000000',
    overlayOpacity: 0,
    brightness: 100,
    saturation: 100,
    attachment: 'fixed' as const,
    animation: 'none' as const,
    animationSpeed: 5,
    contrast: 100,
    grayscale: 0,
  },
  setBackgroundSettings: jest.fn(),
  setBackgroundEnabled: jest.fn(),
  setBackgroundSource: jest.fn(),
  setBackgroundImageUrl: jest.fn(),
  setBackgroundPreset: jest.fn(),
  setBackgroundFit: jest.fn(),
  setBackgroundPosition: jest.fn(),
  setBackgroundOpacity: jest.fn(),
  setBackgroundBlur: jest.fn(),
  setBackgroundOverlay: jest.fn(),
  setBackgroundBrightness: jest.fn(),
  setBackgroundSaturation: jest.fn(),
  resetBackgroundSettings: jest.fn(),
  ...overrides,
});

// Preset store state
export const createPresetStoreState = (overrides = {}) => ({
  presets: [],
  selectedPresetId: null,
  selectPreset: mockSelectPreset,
  ...overrides,
});

// Artifact store state
export const createArtifactStoreState = (overrides = {}) => ({
  artifacts: [],
  openPanel: mockOpenPanel,
  panelOpen: false,
  closePanel: mockClosePanel,
  ...overrides,
});

// Chat store state
export const createChatStoreState = (overrides = {}) => ({
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  clearMessages: mockClearMessages,
  ...overrides,
});

// Project store state
export const createProjectStoreState = (overrides = {}) => ({
  projects: [],
  activeProjectId: null,
  getProject: mockGetProject,
  ...overrides,
});

// Agent store state
export const createAgentStoreState = (overrides = {}) => ({
  isRunning: false,
  currentStep: null,
  toolExecutions: [],
  progress: 0,
  ...overrides,
});

// Custom theme store state
export const createCustomThemeStoreState = (overrides = {}) => ({
  customThemes: [],
  selectedCustomThemeId: null,
  addTheme: jest.fn(),
  updateTheme: jest.fn(),
  deleteTheme: jest.fn(),
  ...overrides,
});

/**
 * Create a mock store selector function
 */
export function createMockSelector<T>(state: T) {
  return (selector: (s: T) => unknown) => selector(state);
}

/**
 * Reset all mock functions
 */
export function resetAllMocks() {
  mockUpdateSession.mockClear();
  mockSelectPreset.mockClear();
  mockClearMessages.mockClear();
  mockOpenPanel.mockClear();
  mockClosePanel.mockClear();
  mockGetProject.mockClear();
  mockGetModeConfig.mockClear();
  mockGetRecentModes.mockClear();
  mockSetMode.mockClear();
  mockGetActiveSession.mockClear();
  mockCreateSession.mockClear();
  mockDeleteSession.mockClear();
  mockSetActiveSession.mockClear();
}

/**
 * Create complete stores mock for jest.mock('@/stores', ...)
 */
export function createStoresMock(overrides: {
  sessionStore?: Partial<ReturnType<typeof createSessionStoreState>>;
  settingsStore?: Partial<ReturnType<typeof createSettingsStoreState>>;
  presetStore?: Partial<ReturnType<typeof createPresetStoreState>>;
  artifactStore?: Partial<ReturnType<typeof createArtifactStoreState>>;
  chatStore?: Partial<ReturnType<typeof createChatStoreState>>;
  projectStore?: Partial<ReturnType<typeof createProjectStoreState>>;
  agentStore?: Partial<ReturnType<typeof createAgentStoreState>>;
} = {}) {
  return {
    useSessionStore: createMockSelector(createSessionStoreState(overrides.sessionStore)),
    useSettingsStore: createMockSelector(createSettingsStoreState(overrides.settingsStore)),
    usePresetStore: createMockSelector(createPresetStoreState(overrides.presetStore)),
    useArtifactStore: createMockSelector(createArtifactStoreState(overrides.artifactStore)),
    useChatStore: createMockSelector(createChatStoreState(overrides.chatStore)),
    useProjectStore: createMockSelector(createProjectStoreState(overrides.projectStore)),
    useAgentStore: createMockSelector(createAgentStoreState(overrides.agentStore)),
    useCustomThemeStore: createMockSelector(createCustomThemeStoreState()),
  };
}

export default createStoresMock;
