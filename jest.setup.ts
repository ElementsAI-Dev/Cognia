/**
 * Jest setup file
 * This file is executed before each test file
 */

import '@testing-library/jest-dom';
import React from 'react';

// Configure React 19 for testing - suppress act() warnings for async updates
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock TooltipProvider globally to avoid "must be used within TooltipProvider" errors
jest.mock('@/components/ui/tooltip', () => {
  const actual = jest.requireActual('@/components/ui/tooltip');
  return {
    ...actual,
    TooltipProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    Tooltip: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'tooltip' }, children),
    TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => 
      asChild ? children : React.createElement('button', { 'data-testid': 'tooltip-trigger' }, children),
    TooltipContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'tooltip-content' }, children),
  };
});

// Polyfill structuredClone for fake-indexeddb
if (typeof structuredClone === 'undefined') {
  global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
}

// Mock ResizeObserver for components using it (like Radix UI ScrollArea)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill ImageData for tests that use canvas image processing (e.g., progressive-loader)
if (typeof globalThis.ImageData === 'undefined') {
  class ImageDataPolyfill {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    colorSpace: string;
    constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
      if (dataOrWidth instanceof Uint8ClampedArray) {
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = height ?? (dataOrWidth.length / (widthOrHeight * 4));
      } else {
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      }
      this.colorSpace = 'srgb';
    }
  }
  globalThis.ImageData = ImageDataPolyfill as unknown as typeof ImageData;
}

// Mock HTMLCanvasElement.getContext for components using canvas (like mind-map-canvas)
HTMLCanvasElement.prototype.getContext = jest.fn(function (contextType: string) {
  if (contextType === '2d') {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4), width: 0, height: 0 })),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      arc: jest.fn(),
      arcTo: jest.fn(),
      ellipse: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      quadraticCurveTo: jest.fn(),
      bezierCurveTo: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      transform: jest.fn(),
      resetTransform: jest.fn(),
      measureText: jest.fn((text: string) => ({
        width: text.length * 8,
        actualBoundingBoxAscent: 10,
        actualBoundingBoxDescent: 2,
        fontBoundingBoxAscent: 12,
        fontBoundingBoxDescent: 3,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: text.length * 8,
      })),
      fillText: jest.fn(),
      strokeText: jest.fn(),
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
      createRadialGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
      createPattern: jest.fn(() => ({})),
      setLineDash: jest.fn(),
      getLineDash: jest.fn(() => []),
      isPointInPath: jest.fn(() => false),
      isPointInStroke: jest.fn(() => false),
      canvas: this,
      // Canvas state
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      lineDashOffset: 0,
      shadowBlur: 0,
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      direction: 'ltr',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'low',
    } as unknown as CanvasRenderingContext2D;
  }
  return null;
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Mock scrollIntoView for JSDOM (not supported by default)
Element.prototype.scrollIntoView = jest.fn();

// Mock window.matchMedia for components using media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Polyfill TransformStream for eventsource-parser
if (typeof TransformStream === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const polyfill = require('web-streams-polyfill');
  global.TransformStream = polyfill.TransformStream;
}

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    return React.createElement('img', props);
  },
}));

// Mock remark/rehype plugins (ESM modules that Jest can't transform)
jest.mock('remark-gfm', () => jest.fn());
jest.mock('remark-math', () => jest.fn());
jest.mock('rehype-raw', () => jest.fn());
jest.mock('rehype-katex', () => jest.fn());
jest.mock('rehype-sanitize', () => ({
  __esModule: true,
  default: jest.fn(),
  defaultSchema: { tagNames: [], attributes: {}, protocols: {} },
}));

// Mock react-markdown
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => React.createElement('div', { 'data-testid': 'markdown' }, children),
}));

// Note: next-intl is NOT mocked globally because many tests need specific translations.
// Each test file should mock next-intl as needed.

// Mock stores globally with comprehensive default implementations
// Note: Test files with local jest.mock('@/stores', ...) will override this
jest.mock('@/stores', () => {
  const mockSession = {
    id: 'session-1',
    title: 'Test Session',
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat',
    systemPrompt: 'You are a helpful assistant.',
    temperature: 0.7,
    webSearchEnabled: false,
    thinkingEnabled: false,
    activeBranchId: 'branch-1',
    projectId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockSelector = <T>(state: T) => {
    const store = ((selector?: (s: T) => unknown) =>
      selector ? selector(state) : state) as ((selector?: (s: T) => unknown) => unknown) & {
      getState: () => T;
    };
    store.getState = () => state;
    return store;
  };

  return {
    useSessionStore: createMockSelector({
      sessions: [mockSession],
      activeSessionId: 'session-1',
      updateSession: jest.fn(),
      getModeConfig: jest.fn((mode: string) => ({ name: mode, description: '', icon: '' })),
      getRecentModes: jest.fn(() => ['chat', 'agent']),
      setMode: jest.fn(),
      currentMode: 'chat',
      getActiveSession: jest.fn(() => mockSession),
      getSession: jest.fn(() => mockSession),
      createSession: jest.fn(() => mockSession),
      deleteSession: jest.fn(),
      setActiveSession: jest.fn(),
      clearAllSessions: jest.fn(),
    }),
    useSettingsStore: createMockSelector({
      providerSettings: { openai: { enabled: true, apiKey: 'test' }, tavily: { apiKey: 'tavily-key' } },
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
      defaultTemperature: 0.7,
      defaultMaxTokens: 4096,
      defaultTopP: 1,
      defaultFrequencyPenalty: 0,
      defaultPresencePenalty: 0,
      sourceVerificationSettings: {
        showVerificationBadges: true,
        autoVerifySources: false,
        verificationTimeout: 5000,
      },
    }),
    usePresetStore: createMockSelector({
      presets: [],
      selectedPresetId: null,
      selectPreset: jest.fn(),
      usePreset: jest.fn(),
    }),
    useArtifactStore: createMockSelector({
      artifacts: [],
      openPanel: jest.fn(),
      panelOpen: false,
      closePanel: jest.fn(),
      createCanvasDocument: jest.fn(() => 'canvas-doc-id'),
      setActiveCanvas: jest.fn(),
      autoCreateFromContent: jest.fn(),
      clearSessionData: jest.fn(),
    }),
    useChatStore: createMockSelector({
      messages: [],
      isLoading: false,
      isStreaming: false,
      error: null,
      clearMessages: jest.fn(),
    }),
    useProjectStore: createMockSelector({
      projects: [],
      activeProjectId: null,
      getProject: jest.fn(() => null),
    }),
    useAgentStore: createMockSelector({
      isRunning: false,
      isAgentRunning: false,
      currentStep: null,
      toolExecutions: [],
      progress: 0,
      addToolExecution: jest.fn(),
      completeToolExecution: jest.fn(),
      failToolExecution: jest.fn(),
    }),
    useCustomThemeStore: createMockSelector({
      customThemes: [],
      selectedCustomThemeId: null,
      addTheme: jest.fn(),
      updateTheme: jest.fn(),
      deleteTheme: jest.fn(),
    }),
    useMcpStore: createMockSelector({
      callTool: jest.fn(),
      servers: [],
      initialize: jest.fn(),
      isInitialized: true,
    }),
    useQuoteStore: createMockSelector({
      getFormattedQuotes: jest.fn(() => ''),
      clearQuotes: jest.fn(),
    }),
    useLearningStore: createMockSelector({
      getLearningSessionByChat: jest.fn(() => null),
      getAchievements: jest.fn(() => []),
      getCompletedSessions: jest.fn(() => []),
      globalStats: {
        totalSessionsCompleted: 0,
        totalTimeSpentMs: 0,
        totalQuestionsAnswered: 0,
        totalCorrectAnswers: 0,
        conceptsMastered: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
    }),
    useTemplateStore: createMockSelector({
      templates: [],
      searchTemplates: jest.fn(() => []),
    }),
    useWorkflowStore: createMockSelector({
      presentations: {},
      activePresentationId: null,
    }),
    // Additional agent stores
    useBackgroundAgentStore: createMockSelector({
      agents: [],
      queue: [],
      isPanelOpen: false,
      selectedAgentId: null,
    }),
    useSubAgentStore: createMockSelector({
      subAgents: [],
      groups: [],
      activeParentId: null,
    }),
    useSkillStore: createMockSelector({
      skills: {},
      activeSkillIds: [],
      isLoading: false,
      loading: false,
      error: null,
      usageStats: {},
      createSkill: jest.fn(() => ({ id: 'mock-skill-id' })),
      updateSkill: jest.fn(),
      deleteSkill: jest.fn(),
      enableSkill: jest.fn(),
      disableSkill: jest.fn(),
      activateSkill: jest.fn(),
      deactivateSkill: jest.fn(),
      clearActiveSkills: jest.fn(),
      searchSkills: jest.fn(() => ({ skills: [] })),
      getSkillsByCategory: jest.fn(() => []),
      getSkill: jest.fn(() => undefined),
      recordSkillUsage: jest.fn(),
      getActiveSkills: jest.fn(() => []),
    }),
    // Chat stores
    useSummaryStore: createMockSelector({
      summaries: {},
      autoSummaryConfig: { enabled: true },
      updateAutoSummaryConfig: jest.fn(),
    }),
    useChatWidgetStore: createMockSelector({
      isOpen: false,
      position: { x: 0, y: 0 },
    }),
    // Context stores
    useClipboardContextStore: createMockSelector({
      currentContent: null,
      currentAnalysis: null,
      templates: [],
      isMonitoring: false,
    }),
    useSelectionStore: createMockSelector({
      selectedText: '',
      selectionPosition: null,
    }),
    // Data stores
    useMemoryStore: createMockSelector({
      memories: [],
    }),
    useVectorStore: createMockSelector({
      collections: [],
    }),
    // Designer stores
    useDesignerStore: createMockSelector({
      components: [],
      selectedComponentId: null,
    }),
    useDesignerHistoryStore: createMockSelector({
      history: [],
      currentIndex: -1,
    }),
    // Document stores
    useDocumentStore: createMockSelector({
      documents: [],
      activeDocumentId: null,
    }),
    // MCP stores
    useMcpMarketplaceStore: createMockSelector({
      packages: [],
      installedPackages: [],
    }),
    // Media stores
    useMediaStore: createMockSelector({
      images: [],
      videos: [],
    }),
    useImageStudioStore: createMockSelector({
      studioImages: [],
      selectedImage: null,
      isEditing: false,
      hasUnsavedChanges: false,
    }),
    useScreenRecordingStore: createMockSelector({
      isRecording: false,
      recordingStatus: 'idle',
    }),
    // Project stores
    useProjectActivityStore: createMockSelector({
      activities: [],
    }),
    // System stores
    useUIStore: createMockSelector({
      sidebarOpen: true,
      activeModal: null,
      commandPaletteOpen: false,
    }),
    useUsageStore: createMockSelector({
      usage: {},
    }),
    useRecentFilesStore: createMockSelector({
      recentFiles: [],
    }),
    useNativeStore: createMockSelector({
      isNative: false,
    }),
    useEnvironmentStore: createMockSelector({
      platform: 'web',
      tools: {},
      refreshing: false,
      installing: false,
    }),
    useProxyStore: createMockSelector({
      config: null,
      status: 'disconnected',
      mode: 'direct',
      enabled: false,
      detectedProxies: [],
      detecting: false,
      testing: false,
    }),
    useWindowStore: createMockSelector({
      windowState: {},
      windowPreferences: {},
      windowSize: { width: 1200, height: 800 },
      windowPosition: { x: 0, y: 0 },
      windowConstraints: {},
      isMaximized: false,
      isFullscreen: false,
      isAlwaysOnTop: false,
    }),
    useVirtualEnvStore: createMockSelector({
      envs: [],
      activeEnv: null,
    }),
    useBackupStore: createMockSelector({
      lastBackupDate: null,
      backupReminderDays: 7,
      isReminderDismissed: false,
      dismissedAt: null,
      totalBackupCount: 0,
      shouldShowReminder: jest.fn(() => false),
      daysSinceLastBackup: jest.fn(() => null),
      markBackupComplete: jest.fn(),
      dismissReminder: jest.fn(),
      setReminderInterval: jest.fn(),
      resetBackupHistory: jest.fn(),
    }),
    // Tools stores
    useJupyterStore: createMockSelector({
      sessions: [],
      activeSession: null,
      activeKernel: null,
      executionState: 'idle',
    }),
    usePPTEditorStore: createMockSelector({
      slides: [],
      activeSlideId: null,
    }),
    // Workflow stores
    useWorkflowEditorStore: createMockSelector({
      nodes: [],
      edges: [],
    }),
  };
});

// Mock skill store separately (different import path)
jest.mock('@/stores/skills/skill-store', () => ({
  useSkillStore: (selector?: (state: unknown) => unknown) => {
    const state = {
      skills: {},
      activeSkillIds: [],
      isLoading: false,
      error: null,
      usageStats: {},
      createSkill: jest.fn(() => ({ id: 'mock-skill-id' })),
      updateSkill: jest.fn(),
      deleteSkill: jest.fn(),
      enableSkill: jest.fn(),
      disableSkill: jest.fn(),
      activateSkill: jest.fn(),
      deactivateSkill: jest.fn(),
      clearActiveSkills: jest.fn(),
      searchSkills: jest.fn(() => ({ skills: [] })),
      getSkillsByCategory: jest.fn(() => []),
      getSkill: jest.fn(() => undefined),
      recordSkillUsage: jest.fn(),
      getActiveSkills: jest.fn(() => []),
    };
    return selector ? selector(state) : state;
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Clean up after each test to prevent memory leaks
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear all timers
  jest.clearAllTimers();
  
  // Force garbage collection hint (if available)
  if (global.gc) {
    global.gc();
  }
});

// Increase test timeout for slower machines
jest.setTimeout(30000);

// Suppress console errors in tests (optional)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };

