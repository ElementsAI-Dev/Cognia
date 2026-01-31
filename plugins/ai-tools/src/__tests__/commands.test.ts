/**
 * Commands Tests
 */

import { createCommands } from '../commands';
import type { PluginContext } from '@cognia/plugin-sdk';

// Mock PluginContext
const createMockContext = (): PluginContext => {
  const eventHandlers = new Map<string, ((...args: unknown[]) => void)[]>();

  return {
    pluginId: 'cognia-ai-tools',
    pluginPath: '/plugins/ai-tools',
    config: {},
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
      showDialog: jest.fn().mockResolvedValue(null),
      showInputDialog: jest.fn().mockResolvedValue(null),
      showConfirmDialog: jest.fn().mockResolvedValue(false),
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

describe('createCommands', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('returns array of 5 commands', () => {
    const commands = createCommands(mockContext);

    expect(commands).toHaveLength(5);
  });

  test('all commands have required properties', () => {
    const commands = createCommands(mockContext);

    for (const command of commands) {
      expect(command.id).toBeDefined();
      expect(command.name).toBeDefined();
      expect(command.execute).toBeDefined();
      expect(typeof command.execute).toBe('function');
    }
  });

  test('commands have correct IDs', () => {
    const commands = createCommands(mockContext);
    const ids = commands.map((c) => c.id);

    expect(ids).toContain('ai-tools.scrape-pricing');
    expect(ids).toContain('ai-tools.check-status');
    expect(ids).toContain('ai-tools.view-rankings');
    expect(ids).toContain('ai-tools.view-leaderboard');
    expect(ids).toContain('ai-tools.clear-cache');
  });

  test('commands have icons', () => {
    const commands = createCommands(mockContext);

    for (const command of commands) {
      expect(command.icon).toBeDefined();
    }
  });

  test('commands have descriptions', () => {
    const commands = createCommands(mockContext);

    for (const command of commands) {
      expect(command.description).toBeDefined();
      expect(command.description!.length).toBeGreaterThan(0);
    }
  });
});

describe('Scrape Pricing Command', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('shows input dialog when executed', async () => {
    const commands = createCommands(mockContext);
    const command = commands.find((c) => c.id === 'ai-tools.scrape-pricing');

    expect(command).toBeDefined();

    // Execute command (will show dialog)
    await command!.execute();

    expect(mockContext.ui.showInputDialog).toHaveBeenCalledWith({
      title: 'Scrape AI Pricing',
      message: 'Select provider or leave empty for all providers',
      placeholder: expect.stringContaining('Provider ID'),
    });
  });

  test('emits event when user confirms', async () => {
    (mockContext.ui.showInputDialog as jest.Mock).mockResolvedValue('openai');

    const commands = createCommands(mockContext);
    const command = commands.find((c) => c.id === 'ai-tools.scrape-pricing');

    await command!.execute();

    expect(mockContext.events.emit).toHaveBeenCalledWith('ai-tools:scrape-pricing', {
      provider: 'openai',
    });
    expect(mockContext.ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('Scraping openai'),
      'info'
    );
  });

  test('emits event for all providers when empty input', async () => {
    (mockContext.ui.showInputDialog as jest.Mock).mockResolvedValue('');

    const commands = createCommands(mockContext);
    const command = commands.find((c) => c.id === 'ai-tools.scrape-pricing');

    await command!.execute();

    expect(mockContext.events.emit).toHaveBeenCalledWith('ai-tools:scrape-pricing', {
      provider: undefined,
    });
    expect(mockContext.ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('all providers'),
      'info'
    );
  });

  test('does not emit event when user cancels', async () => {
    (mockContext.ui.showInputDialog as jest.Mock).mockResolvedValue(null);

    const commands = createCommands(mockContext);
    const command = commands.find((c) => c.id === 'ai-tools.scrape-pricing');

    await command!.execute();

    expect(mockContext.events.emit).not.toHaveBeenCalled();
  });
});

describe('Check Status Command', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('shows input dialog when executed', async () => {
    const commands = createCommands(mockContext);
    const command = commands.find((c) => c.id === 'ai-tools.check-status');

    await command!.execute();

    expect(mockContext.ui.showInputDialog).toHaveBeenCalledWith({
      title: 'Check Provider Status',
      message: 'Select provider or leave empty for all providers',
      placeholder: expect.stringContaining('Provider ID'),
    });
  });

  test('emits event when user confirms', async () => {
    (mockContext.ui.showInputDialog as jest.Mock).mockResolvedValue('anthropic');

    const commands = createCommands(mockContext);
    const command = commands.find((c) => c.id === 'ai-tools.check-status');

    await command!.execute();

    expect(mockContext.events.emit).toHaveBeenCalledWith('ai-tools:check-status', {
      provider: 'anthropic',
    });
  });
});

describe('View Rankings Command', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('shows dialog with time range options', async () => {
    const commands = createCommands(mockContext);
    const command = commands.find((c) => c.id === 'ai-tools.view-rankings');

    await command!.execute();

    expect(mockContext.ui.showDialog).toHaveBeenCalledWith({
      title: 'OpenRouter Rankings',
      content: 'Select time range for rankings',
      actions: expect.arrayContaining([
        expect.objectContaining({ label: 'This Week', value: 'week' }),
        expect.objectContaining({ label: 'This Month', value: 'month' }),
        expect.objectContaining({ label: 'All Time', value: 'all' }),
      ]),
    });
  });

  test('emits event with selected time range', async () => {
    (mockContext.ui.showDialog as jest.Mock).mockResolvedValue('month');

    const commands = createCommands(mockContext);
    const command = commands.find((c) => c.id === 'ai-tools.view-rankings');

    await command!.execute();

    expect(mockContext.events.emit).toHaveBeenCalledWith('ai-tools:view-rankings', {
      timeRange: 'month',
    });
  });
});

describe('View Leaderboard Command', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('shows dialog with category options', async () => {
    const commands = createCommands(mockContext);
    const command = commands.find((c) => c.id === 'ai-tools.view-leaderboard');

    await command!.execute();

    expect(mockContext.ui.showDialog).toHaveBeenCalledWith({
      title: 'LMArena Leaderboard',
      content: 'Select category',
      actions: expect.arrayContaining([
        expect.objectContaining({ label: 'Overall', value: 'overall' }),
        expect.objectContaining({ label: 'Coding', value: 'coding' }),
        expect.objectContaining({ label: 'Math', value: 'math' }),
      ]),
    });
  });

  test('emits event with undefined category for "all"', async () => {
    (mockContext.ui.showDialog as jest.Mock).mockResolvedValue('all');

    const commands = createCommands(mockContext);
    const command = commands.find((c) => c.id === 'ai-tools.view-leaderboard');

    await command!.execute();

    expect(mockContext.events.emit).toHaveBeenCalledWith('ai-tools:view-leaderboard', {
      category: undefined,
    });
  });

  test('emits event with specific category', async () => {
    (mockContext.ui.showDialog as jest.Mock).mockResolvedValue('coding');

    const commands = createCommands(mockContext);
    const command = commands.find((c) => c.id === 'ai-tools.view-leaderboard');

    await command!.execute();

    expect(mockContext.events.emit).toHaveBeenCalledWith('ai-tools:view-leaderboard', {
      category: 'coding',
    });
  });
});

describe('Clear Cache Command', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('shows confirm dialog when executed', async () => {
    const commands = createCommands(mockContext);
    const command = commands.find((c) => c.id === 'ai-tools.clear-cache');

    await command!.execute();

    expect(mockContext.ui.showConfirmDialog).toHaveBeenCalledWith({
      title: 'Clear Cache',
      message: 'Are you sure you want to clear all cached AI tools data?',
      confirmLabel: 'Clear',
      cancelLabel: 'Cancel',
    });
  });

  test('emits event and shows success toast when confirmed', async () => {
    (mockContext.ui.showConfirmDialog as jest.Mock).mockResolvedValue(true);

    const commands = createCommands(mockContext);
    const command = commands.find((c) => c.id === 'ai-tools.clear-cache');

    await command!.execute();

    expect(mockContext.events.emit).toHaveBeenCalledWith('ai-tools:clear-cache', {});
    expect(mockContext.ui.showToast).toHaveBeenCalledWith(
      'AI Tools cache has been cleared',
      'success'
    );
  });

  test('does not emit event when cancelled', async () => {
    (mockContext.ui.showConfirmDialog as jest.Mock).mockResolvedValue(false);

    const commands = createCommands(mockContext);
    const command = commands.find((c) => c.id === 'ai-tools.clear-cache');

    await command!.execute();

    expect(mockContext.events.emit).not.toHaveBeenCalled();
    expect(mockContext.ui.showToast).not.toHaveBeenCalled();
  });
});
