import { WorkflowSelector } from './workflow-selector';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Inline helper for creating mock selectors
function createMockSelector<T>(state: T) {
  return (selector: (s: T) => unknown) => selector(state);
}

// Mock all stores with useSettingsStore
jest.mock('@/stores', () => ({
  useWorkflowStore: () => ({
    workflows: [],
    getWorkflow: jest.fn(),
    createWorkflow: jest.fn(),
    updateWorkflow: jest.fn(),
    deleteWorkflow: jest.fn(),
    openWorkflowPanel: jest.fn(),
    setSelectedWorkflowType: jest.fn(),
  }),
  useSessionStore: createMockSelector({
    sessions: [],
    activeSessionId: null,
    updateSession: jest.fn(),
    currentMode: 'chat',
    getModeConfig: jest.fn(() => ({ name: 'Chat', description: '', icon: 'MessageSquare' })),
  }),
  useSettingsStore: createMockSelector({
    defaultProvider: 'openai',
    providerSettings: {
      openai: { enabled: true, apiKey: 'test', defaultModel: 'gpt-4o' },
    },
    theme: 'dark',
    language: 'en',
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
      presetId: 'gradient-blue',
      fit: 'cover' as const,
      position: 'center' as const,
      opacity: 100,
      blur: 0,
      overlayColor: '#000000',
      overlayOpacity: 0,
      brightness: 100,
      saturation: 100,
      localAssetId: null,
      attachment: 'fixed' as const,
      animation: 'none' as const,
      animationSpeed: 5,
      contrast: 100,
      grayscale: 0,
    },
  }),
  useAgentStore: createMockSelector({
    isRunning: false,
    currentStep: null,
    toolExecutions: [],
    progress: 0,
  }),
}));

// Mock useWorkflow hook
jest.mock('@/hooks/designer/use-workflow', () => ({
  useWorkflow: () => ({
    executeWorkflow: jest.fn(),
    isExecuting: false,
    progress: 0,
    currentStepId: null,
    result: null,
    error: null,
    stopExecution: jest.fn(),
    getWorkflows: jest.fn(() => []),
    logs: [],
    run: jest.fn(),
    runPPT: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    cancel: jest.fn(),
    reset: jest.fn(),
    status: 'idle',
    output: null,
    execution: null,
    isRunning: false,
  }),
}));

describe('WorkflowSelector', () => {
  it('exports a WorkflowSelector component', () => {
    expect(typeof WorkflowSelector).toBe('function');
  });

  it('has the correct display name', () => {
    expect(WorkflowSelector.name).toBe('WorkflowSelector');
  });
});
