/**
 * Plugin Index Tests
 */

import plugin, { getConfig } from '../index';
import { DEFAULT_CONFIG } from '../types/config';
import type { PluginContext } from '@cognia/plugin-sdk';

// Mock dependencies
jest.mock('../tools', () => ({
  createPricingTool: jest.fn(() => ({
    name: 'ai_pricing_scraper',
    description: 'Mock pricing tool',
    parametersSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  })),
  createStatusTool: jest.fn(() => ({
    name: 'provider_status_checker',
    description: 'Mock status tool',
    parametersSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  })),
  createRankingsTool: jest.fn(() => ({
    name: 'openrouter_rankings',
    description: 'Mock rankings tool',
    parametersSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  })),
  createLMArenaTool: jest.fn(() => ({
    name: 'lmarena_leaderboard',
    description: 'Mock lmarena tool',
    parametersSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  })),
}));

jest.mock('../commands', () => ({
  createCommands: jest.fn(() => [
    { id: 'ai-tools.scrape-pricing', name: 'Scrape Pricing', execute: jest.fn() },
    { id: 'ai-tools.check-status', name: 'Check Status', execute: jest.fn() },
  ]),
}));

jest.mock('../utils/output', () => ({
  clearCache: jest.fn(),
}));

// Create mock context
const createMockContext = (config: Record<string, unknown> = {}): PluginContext => {
  const eventHandlers = new Map<string, ((...args: unknown[]) => void)[]>();

  return {
    pluginId: 'cognia-ai-tools',
    pluginPath: '/plugins/ai-tools',
    config,
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    storage: {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      keys: jest.fn(),
      clear: jest.fn(),
    },
    events: {
      on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
        const handlers = eventHandlers.get(event) || [];
        handlers.push(handler);
        eventHandlers.set(event, handlers);
        return () => {
          const idx = handlers.indexOf(handler);
          if (idx >= 0) handlers.splice(idx, 1);
        };
      }),
      off: jest.fn(),
      emit: jest.fn(),
      once: jest.fn(),
    },
    ui: {
      showNotification: jest.fn(),
      showToast: jest.fn(),
      showDialog: jest.fn(),
      showInputDialog: jest.fn(),
      showConfirmDialog: jest.fn(),
      registerStatusBarItem: jest.fn(() => jest.fn()),
      registerSidebarPanel: jest.fn(() => jest.fn()),
    },
    a2ui: {
      createSurface: jest.fn(),
      deleteSurface: jest.fn(),
      updateComponents: jest.fn(),
      updateDataModel: jest.fn(),
      getSurface: jest.fn(),
      registerComponent: jest.fn(),
      registerTemplate: jest.fn(),
    },
    agent: {
      registerTool: jest.fn(),
      unregisterTool: jest.fn(),
      registerMode: jest.fn(),
      unregisterMode: jest.fn(),
      executeAgent: jest.fn(),
      cancelAgent: jest.fn(),
    },
    settings: {
      get: jest.fn(),
      set: jest.fn(),
      onChange: jest.fn(() => jest.fn()),
    },
    network: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      fetch: jest.fn(),
      download: jest.fn(),
      upload: jest.fn(),
    },
    fs: {
      readText: jest.fn(),
      readBinary: jest.fn(),
      readJson: jest.fn(),
      writeText: jest.fn(),
      writeBinary: jest.fn(),
      writeJson: jest.fn(),
      appendText: jest.fn(),
      exists: jest.fn(),
      mkdir: jest.fn(),
      remove: jest.fn(),
      copy: jest.fn(),
      move: jest.fn(),
      readDir: jest.fn(),
      stat: jest.fn(),
      watch: jest.fn(() => jest.fn()),
      getDataDir: jest.fn(() => '/data/ai-tools'),
      getCacheDir: jest.fn(() => '/cache/ai-tools'),
      getTempDir: jest.fn(() => '/tmp'),
    },
    clipboard: {
      readText: jest.fn(),
      writeText: jest.fn(),
      readImage: jest.fn(),
      writeImage: jest.fn(),
      hasText: jest.fn(),
      hasImage: jest.fn(),
      clear: jest.fn(),
    },
    shell: {
      execute: jest.fn(),
      spawn: jest.fn(),
      open: jest.fn(),
      showInFolder: jest.fn(),
    },
    db: {
      query: jest.fn(),
      execute: jest.fn(),
      transaction: jest.fn(),
      createTable: jest.fn(),
      dropTable: jest.fn(),
      tableExists: jest.fn(),
    },
    shortcuts: {
      register: jest.fn(() => jest.fn()),
      registerMany: jest.fn(() => jest.fn()),
      isAvailable: jest.fn(() => true),
      getRegistered: jest.fn(() => []),
    },
    contextMenu: {
      register: jest.fn(() => jest.fn()),
      registerMany: jest.fn(() => jest.fn()),
    },
    window: {
      create: jest.fn(),
      getMain: jest.fn(),
      getAll: jest.fn(() => []),
      focus: jest.fn(),
    },
    secrets: {
      store: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      has: jest.fn(),
    },
  } as unknown as PluginContext;
};

describe('Plugin Definition', () => {
  test('has activate method', () => {
    expect(plugin.activate).toBeDefined();
    expect(typeof plugin.activate).toBe('function');
  });

  test('has deactivate method', () => {
    expect(plugin.deactivate).toBeDefined();
    expect(typeof plugin.deactivate).toBe('function');
  });
});

describe('Plugin Activation', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('logs activation message', () => {
    plugin.activate(mockContext);

    expect(mockContext.logger.info).toHaveBeenCalledWith('AI Tools plugin activated');
  });

  test('registers 4 tools', () => {
    plugin.activate(mockContext);

    expect(mockContext.agent.registerTool).toHaveBeenCalledTimes(4);
  });

  test('registers tools with correct names', () => {
    plugin.activate(mockContext);

    const calls = (mockContext.agent.registerTool as jest.Mock).mock.calls;
    const toolNames = calls.map((call) => call[0].name);

    expect(toolNames).toContain('ai_pricing_scraper');
    expect(toolNames).toContain('provider_status_checker');
    expect(toolNames).toContain('openrouter_rankings');
    expect(toolNames).toContain('lmarena_leaderboard');
  });

  test('registers tools with plugin ID', () => {
    plugin.activate(mockContext);

    const calls = (mockContext.agent.registerTool as jest.Mock).mock.calls;

    for (const call of calls) {
      expect(call[0].pluginId).toBe('cognia-ai-tools');
    }
  });

  test('registers event listeners', () => {
    plugin.activate(mockContext);

    expect(mockContext.events.on).toHaveBeenCalledWith('ai-tools:scrape-pricing', expect.any(Function));
    expect(mockContext.events.on).toHaveBeenCalledWith('ai-tools:check-status', expect.any(Function));
    expect(mockContext.events.on).toHaveBeenCalledWith('ai-tools:view-rankings', expect.any(Function));
    expect(mockContext.events.on).toHaveBeenCalledWith('ai-tools:view-leaderboard', expect.any(Function));
    expect(mockContext.events.on).toHaveBeenCalledWith('ai-tools:clear-cache', expect.any(Function));
  });

  test('returns hooks object', () => {
    const hooks = plugin.activate(mockContext);

    expect(hooks).toBeDefined();
    expect(hooks).toHaveProperty('onEnable');
    expect(hooks).toHaveProperty('onDisable');
    expect(hooks).toHaveProperty('onConfigChange');
    expect(hooks).toHaveProperty('onCommand');
  });
});

describe('Plugin Config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('parses config from context on activation', () => {
    const customConfig = {
      defaultTimeout: 60000,
      headlessMode: false,
    };
    const mockContext = createMockContext(customConfig);

    plugin.activate(mockContext);
    const config = getConfig();

    expect(config.defaultTimeout).toBe(60000);
    expect(config.headlessMode).toBe(false);
    // Other values should be defaults
    expect(config.defaultOutputDir).toBe(DEFAULT_CONFIG.defaultOutputDir);
  });

  test('uses default config when context config is empty', () => {
    const mockContext = createMockContext({});

    plugin.activate(mockContext);
    const config = getConfig();

    expect(config).toEqual(DEFAULT_CONFIG);
  });

  test('getConfig returns current config', () => {
    const mockContext = createMockContext({ cacheExpiry: 7200000 });

    plugin.activate(mockContext);
    const config = getConfig();

    expect(config.cacheExpiry).toBe(7200000);
  });
});

describe('Plugin Hooks', () => {
  let mockContext: PluginContext;
  let hooks: ReturnType<typeof plugin.activate>;

  beforeEach(() => {
    mockContext = createMockContext();
    hooks = plugin.activate(mockContext);
    jest.clearAllMocks();
  });

  test('onEnable logs message', async () => {
    await hooks!.onEnable!();

    expect(mockContext.logger.info).toHaveBeenCalledWith('AI Tools plugin enabled');
  });

  test('onDisable logs message', async () => {
    await hooks!.onDisable!();

    expect(mockContext.logger.info).toHaveBeenCalledWith('AI Tools plugin disabled');
  });

  test('onConfigChange updates config', () => {
    const newConfig = { defaultTimeout: 90000, preferredRegion: 'CN' };

    hooks!.onConfigChange!(newConfig);

    const config = getConfig();
    expect(config.defaultTimeout).toBe(90000);
    expect(config.preferredRegion).toBe('CN');
  });

  test('onCommand returns true for known command', () => {
    const result = hooks!.onCommand!('ai-tools.scrape-pricing');

    expect(result).toBe(true);
  });

  test('onCommand returns false for unknown command', () => {
    const result = hooks!.onCommand!('unknown-command');

    expect(result).toBe(false);
  });
});

describe('Plugin Deactivation', () => {
  test('deactivate does not throw', () => {
    expect(() => plugin.deactivate!()).not.toThrow();
  });
});
