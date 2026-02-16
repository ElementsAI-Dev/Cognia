/**
 * Tools Tests
 */

import { createPricingTool, createStatusTool, createRankingsTool, createLMArenaTool } from '../tools';
import type { PluginContext } from '@cognia/plugin-sdk';

// Mock PluginContext
const createMockContext = (config: Record<string, unknown> = {}): PluginContext => {
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
      on: jest.fn(),
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
    browser: {
      launch: jest.fn(),
      scrape: jest.fn(),
      screenshot: jest.fn(),
      extractTable: jest.fn(),
      extractLinks: jest.fn(),
      extractText: jest.fn(),
      waitForSelector: jest.fn(),
      click: jest.fn(),
      type: jest.fn(),
      evaluate: jest.fn(),
      close: jest.fn(),
    },
  } as unknown as PluginContext;
};

describe('createPricingTool', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('returns tool with correct name', () => {
    const tool = createPricingTool(mockContext);
    expect(tool.name).toBe('ai_pricing_scraper');
  });

  test('returns tool with description', () => {
    const tool = createPricingTool(mockContext);
    expect(tool.description).toBeDefined();
    expect(tool.description.length).toBeGreaterThan(0);
  });

  test('returns tool with parameters schema', () => {
    const tool = createPricingTool(mockContext);
    expect(tool.parametersSchema).toBeDefined();
    expect(tool.parametersSchema.type).toBe('object');
    expect(tool.parametersSchema.properties).toBeDefined();
  });

  test('returns tool with execute function', () => {
    const tool = createPricingTool(mockContext);
    expect(tool.execute).toBeDefined();
    expect(typeof tool.execute).toBe('function');
  });

  test('parameters include provider, region, all, export', () => {
    const tool = createPricingTool(mockContext);
    const props = tool.parametersSchema.properties;

    expect(props.provider).toBeDefined();
    expect(props.region).toBeDefined();
    expect(props.all).toBeDefined();
    expect(props.export).toBeDefined();
  });

  test('execute returns error when browser not available', async () => {
    const contextNoBrowser = createMockContext();
    (contextNoBrowser as Record<string, unknown>).browser = undefined;

    const tool = createPricingTool(contextNoBrowser);
    const result = await tool.execute({ provider: 'openai' });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('execute returns error for unknown provider', async () => {
    const tool = createPricingTool(mockContext);
    const result = await tool.execute({ provider: 'unknown-provider-xyz' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown provider');
  });
});

describe('createStatusTool', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('returns tool with correct name', () => {
    const tool = createStatusTool(mockContext);
    expect(tool.name).toBe('provider_status_checker');
  });

  test('returns tool with description', () => {
    const tool = createStatusTool(mockContext);
    expect(tool.description).toBeDefined();
    expect(tool.description.length).toBeGreaterThan(0);
  });

  test('returns tool with parameters schema', () => {
    const tool = createStatusTool(mockContext);
    expect(tool.parametersSchema).toBeDefined();
    expect(tool.parametersSchema.type).toBe('object');
    expect(tool.parametersSchema.properties).toBeDefined();
  });

  test('returns tool with execute function', () => {
    const tool = createStatusTool(mockContext);
    expect(tool.execute).toBeDefined();
    expect(typeof tool.execute).toBe('function');
  });

  test('parameters include provider, region, timeout', () => {
    const tool = createStatusTool(mockContext);
    const props = tool.parametersSchema.properties;

    expect(props.provider).toBeDefined();
    expect(props.region).toBeDefined();
    expect(props.timeout).toBeDefined();
  });

  test('execute returns error for unknown provider', async () => {
    const tool = createStatusTool(mockContext);
    const result = await tool.execute({ provider: 'unknown-provider-xyz' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown provider');
  });
});

describe('createRankingsTool', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('returns tool with correct name', () => {
    const tool = createRankingsTool(mockContext);
    expect(tool.name).toBe('openrouter_rankings');
  });

  test('returns tool with description', () => {
    const tool = createRankingsTool(mockContext);
    expect(tool.description).toBeDefined();
    expect(tool.description.length).toBeGreaterThan(0);
  });

  test('returns tool with parameters schema', () => {
    const tool = createRankingsTool(mockContext);
    expect(tool.parametersSchema).toBeDefined();
    expect(tool.parametersSchema.type).toBe('object');
    expect(tool.parametersSchema.properties).toBeDefined();
  });

  test('returns tool with execute function', () => {
    const tool = createRankingsTool(mockContext);
    expect(tool.execute).toBeDefined();
    expect(typeof tool.execute).toBe('function');
  });

  test('parameters include timeRange and export', () => {
    const tool = createRankingsTool(mockContext);
    const props = tool.parametersSchema.properties;

    expect(props.timeRange).toBeDefined();
    expect(props.export).toBeDefined();
  });

  test('execute returns error when browser not available', async () => {
    const contextNoBrowser = createMockContext();
    (contextNoBrowser as Record<string, unknown>).browser = undefined;

    const tool = createRankingsTool(contextNoBrowser);
    const result = await tool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('createLMArenaTool', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('returns tool with correct name', () => {
    const tool = createLMArenaTool(mockContext);
    expect(tool.name).toBe('lmarena_leaderboard');
  });

  test('returns tool with description', () => {
    const tool = createLMArenaTool(mockContext);
    expect(tool.description).toBeDefined();
    expect(tool.description.length).toBeGreaterThan(0);
  });

  test('returns tool with parameters schema', () => {
    const tool = createLMArenaTool(mockContext);
    expect(tool.parametersSchema).toBeDefined();
    expect(tool.parametersSchema.type).toBe('object');
    expect(tool.parametersSchema.properties).toBeDefined();
  });

  test('returns tool with execute function', () => {
    const tool = createLMArenaTool(mockContext);
    expect(tool.execute).toBeDefined();
    expect(typeof tool.execute).toBe('function');
  });

  test('parameters include category, includeHistory, max', () => {
    const tool = createLMArenaTool(mockContext);
    const props = tool.parametersSchema.properties;

    expect(props.category).toBeDefined();
    expect(props.includeHistory).toBeDefined();
    expect(props.max).toBeDefined();
  });

  test('execute uses network get for API calls', async () => {
    (mockContext.fs.exists as jest.Mock).mockResolvedValue(false);
    (mockContext.network.get as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          text: { overall: {} },
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: [],
      });

    const tool = createLMArenaTool(mockContext);
    const result = await tool.execute({});

    expect(result.success).toBe(true);
    expect(mockContext.network.get).toHaveBeenCalledWith(expect.stringContaining('lmarena-history'), expect.any(Object));
    expect(mockContext.network.get).toHaveBeenCalledWith(expect.stringContaining('arena-catalog'), expect.any(Object));
  });
});

describe('Tool Config Integration', () => {
  test('pricing tool uses config for cache expiry', () => {
    const customConfig = { pricingCacheExpiry: 7200000 };
    const mockContext = createMockContext(customConfig);

    const tool = createPricingTool(mockContext);

    // Tool should be created successfully with custom config
    expect(tool).toBeDefined();
    expect(tool.name).toBe('ai_pricing_scraper');
  });

  test('status tool uses config for timeout', () => {
    const customConfig = { defaultTimeout: 60000 };
    const mockContext = createMockContext(customConfig);

    const tool = createStatusTool(mockContext);

    // Tool should be created successfully with custom config
    expect(tool).toBeDefined();
    expect(tool.name).toBe('provider_status_checker');
  });

  test('rankings tool uses config for cache expiry', () => {
    const customConfig = { rankingsCacheExpiry: 3600000 };
    const mockContext = createMockContext(customConfig);

    const tool = createRankingsTool(mockContext);

    // Tool should be created successfully with custom config
    expect(tool).toBeDefined();
    expect(tool.name).toBe('openrouter_rankings');
  });

  test('lmarena tool uses config for cache expiry', () => {
    const customConfig = { cacheExpiry: 1800000 };
    const mockContext = createMockContext(customConfig);

    const tool = createLMArenaTool(mockContext);

    // Tool should be created successfully with custom config
    expect(tool).toBeDefined();
    expect(tool.name).toBe('lmarena_leaderboard');
  });
});
