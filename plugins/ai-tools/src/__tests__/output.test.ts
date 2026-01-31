/**
 * Output Utilities Tests
 */

import {
  savePricingData,
  loadPricingData,
  saveAllPricing,
  loadAllPricing,
  countModels,
  saveStatusReport,
  loadStatusReport,
  saveRankingsData,
  loadRankingsData,
  saveLeaderboardData,
  loadLeaderboardData,
  countUniqueModels,
  isCacheValid,
  clearCache,
} from '../utils/output';
import type { PluginContext } from '@cognia/plugin-sdk';
import type {
  PricingCategory,
  ProviderPricing,
  AllPricing,
  StatusReport,
  RankingsData,
  AllLeaderboardsData,
  LeaderboardData,
  LeaderboardEntry,
} from '../types';

// Mock PluginContext
const createMockContext = (): PluginContext => {
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
  } as unknown as PluginContext;
};

// Helper to create mock leaderboard entry
const createEntry = (rank: number, modelId: string, modelName: string, score: number): LeaderboardEntry => ({
  rank,
  modelId,
  modelName,
  score,
});

// Helper to create mock leaderboard data
const createLeaderboardData = (
  category: string,
  entries: LeaderboardEntry[]
): LeaderboardData => ({
  scrapedAt: new Date().toISOString(),
  source: 'test',
  category: category as LeaderboardData['category'],
  arenaType: 'text',
  entries,
  totalModels: entries.length,
});

describe('countModels', () => {
  test('returns 0 for empty array', () => {
    const result = countModels([]);
    expect(result).toBe(0);
  });

  test('counts models across categories', () => {
    const categories: PricingCategory[] = [
      {
        category: 'GPT Models',
        models: [
          { model: 'gpt-4o', input: '$5', output: '$15', unit: '/1M tokens' },
          { model: 'gpt-4o-mini', input: '$0.15', output: '$0.60', unit: '/1M tokens' },
        ],
      },
      {
        category: 'Claude Models',
        models: [
          { model: 'claude-3.5-sonnet', input: '$3', output: '$15', unit: '/1M tokens' },
        ],
      },
    ];

    const result = countModels(categories);
    expect(result).toBe(3);
  });

  test('handles categories with no models', () => {
    const categories: PricingCategory[] = [
      { category: 'Empty', models: [] },
      { category: 'Also Empty', models: [] },
    ];

    const result = countModels(categories);
    expect(result).toBe(0);
  });
});

describe('countUniqueModels', () => {
  test('returns 0 for empty leaderboard', () => {
    const data: AllLeaderboardsData = {
      scrapedAt: new Date().toISOString(),
      sources: ['test'],
      text: {},
      vision: undefined,
    };

    const result = countUniqueModels(data);
    expect(result).toBe(0);
  });

  test('counts unique models across categories', () => {
    const overallData = createLeaderboardData('overall', [
      createEntry(1, 'gpt-4o', 'GPT-4o', 1250),
      createEntry(2, 'claude-3.5-sonnet', 'Claude 3.5 Sonnet', 1240),
    ]);

    const codingData = createLeaderboardData('coding', [
      createEntry(1, 'claude-3.5-sonnet', 'Claude 3.5 Sonnet', 1260),
      createEntry(2, 'gpt-4o', 'GPT-4o', 1255),
      createEntry(3, 'deepseek-v3', 'DeepSeek V3', 1245),
    ]);

    const data: AllLeaderboardsData = {
      scrapedAt: new Date().toISOString(),
      sources: ['test'],
      text: {
        overall: overallData,
        coding: codingData,
      },
    };

    const result = countUniqueModels(data);
    // gpt-4o, claude-3.5-sonnet, deepseek-v3 = 3 unique
    expect(result).toBe(3);
  });

  test('counts vision models separately', () => {
    const textData = createLeaderboardData('overall', [
      createEntry(1, 'gpt-4o', 'GPT-4o', 1250),
    ]);

    const visionData = createLeaderboardData('overall', [
      createEntry(1, 'gpt-4o', 'GPT-4o', 1260),
      createEntry(2, 'gemini-pro-vision', 'Gemini Pro Vision', 1240),
    ]);

    const data: AllLeaderboardsData = {
      scrapedAt: new Date().toISOString(),
      sources: ['test'],
      text: { overall: textData },
      vision: { overall: visionData },
    };

    const result = countUniqueModels(data);
    // gpt-4o (counted once), gemini-pro-vision = 2 unique
    expect(result).toBe(2);
  });
});

describe('isCacheValid', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('returns false if file does not exist', async () => {
    (mockContext.fs.exists as jest.Mock).mockResolvedValue(false);

    const result = await isCacheValid(mockContext, '/path/to/cache.json', 3600000);

    expect(result).toBe(false);
    expect(mockContext.fs.stat).not.toHaveBeenCalled();
  });

  test('returns false if file has no modified date', async () => {
    (mockContext.fs.exists as jest.Mock).mockResolvedValue(true);
    (mockContext.fs.stat as jest.Mock).mockResolvedValue({
      size: 1024,
      isFile: true,
      isDirectory: false,
      isSymlink: false,
      modified: undefined,
    });

    const result = await isCacheValid(mockContext, '/path/to/cache.json', 3600000);

    expect(result).toBe(false);
  });

  test('returns true if cache is fresh', async () => {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    (mockContext.fs.exists as jest.Mock).mockResolvedValue(true);
    (mockContext.fs.stat as jest.Mock).mockResolvedValue({
      size: 1024,
      isFile: true,
      isDirectory: false,
      isSymlink: false,
      modified: tenMinutesAgo,
    });

    // Cache expiry is 1 hour (3600000ms)
    const result = await isCacheValid(mockContext, '/path/to/cache.json', 3600000);

    expect(result).toBe(true);
  });

  test('returns false if cache is expired', async () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    (mockContext.fs.exists as jest.Mock).mockResolvedValue(true);
    (mockContext.fs.stat as jest.Mock).mockResolvedValue({
      size: 1024,
      isFile: true,
      isDirectory: false,
      isSymlink: false,
      modified: twoHoursAgo,
    });

    // Cache expiry is 1 hour (3600000ms)
    const result = await isCacheValid(mockContext, '/path/to/cache.json', 3600000);

    expect(result).toBe(false);
  });

  test('handles edge case at exact expiry time', async () => {
    const now = new Date();
    const exactlyOneHourAgo = new Date(now.getTime() - 3600000);

    (mockContext.fs.exists as jest.Mock).mockResolvedValue(true);
    (mockContext.fs.stat as jest.Mock).mockResolvedValue({
      size: 1024,
      isFile: true,
      isDirectory: false,
      isSymlink: false,
      modified: exactlyOneHourAgo,
    });

    // Should be invalid at exactly expiry time
    const result = await isCacheValid(mockContext, '/path/to/cache.json', 3600000);

    expect(result).toBe(false);
  });
});

describe('savePricingData', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('saves pricing data to correct path', async () => {
    const pricingData: ProviderPricing = {
      scraped_at: new Date().toISOString(),
      source: 'https://openai.com/pricing',
      categories: [
        {
          category: 'GPT-4',
          models: [{ model: 'gpt-4o', input: '$5', output: '$15', unit: '/1M tokens' }],
        },
      ],
    };

    const filepath = await savePricingData(mockContext, 'openai', pricingData);

    expect(mockContext.fs.mkdir).toHaveBeenCalledWith('/data/ai-tools', true);
    expect(mockContext.fs.writeJson).toHaveBeenCalledWith(
      '/data/ai-tools/pricing-openai.json',
      pricingData,
      true
    );
    expect(filepath).toBe('/data/ai-tools/pricing-openai.json');
  });
});

describe('loadPricingData', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('returns null if file does not exist', async () => {
    (mockContext.fs.exists as jest.Mock).mockResolvedValue(false);

    const result = await loadPricingData(mockContext, 'openai');

    expect(result).toBeNull();
  });

  test('returns data if file exists', async () => {
    const pricingData: ProviderPricing = {
      scraped_at: new Date().toISOString(),
      source: 'https://openai.com/pricing',
      categories: [],
    };

    (mockContext.fs.exists as jest.Mock).mockResolvedValue(true);
    (mockContext.fs.readJson as jest.Mock).mockResolvedValue(pricingData);

    const result = await loadPricingData(mockContext, 'openai');

    expect(result).toEqual(pricingData);
  });
});

describe('saveAllPricing', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('saves all pricing data to correct path', async () => {
    const allPricing: AllPricing = {
      generated_at: new Date().toISOString(),
      total_models: 10,
      providers: [],
    };

    const filepath = await saveAllPricing(mockContext, allPricing);

    expect(mockContext.fs.mkdir).toHaveBeenCalledWith('/data/ai-tools', true);
    expect(mockContext.fs.writeJson).toHaveBeenCalledWith(
      '/data/ai-tools/all-pricing.json',
      allPricing,
      true
    );
    expect(filepath).toBe('/data/ai-tools/all-pricing.json');
  });
});

describe('loadAllPricing', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('returns null if file does not exist', async () => {
    (mockContext.fs.exists as jest.Mock).mockResolvedValue(false);

    const result = await loadAllPricing(mockContext);

    expect(result).toBeNull();
  });

  test('returns data if file exists', async () => {
    const allPricing: AllPricing = {
      generated_at: new Date().toISOString(),
      total_models: 10,
      providers: [],
    };

    (mockContext.fs.exists as jest.Mock).mockResolvedValue(true);
    (mockContext.fs.readJson as jest.Mock).mockResolvedValue(allPricing);

    const result = await loadAllPricing(mockContext);

    expect(result).toEqual(allPricing);
  });
});

describe('saveStatusReport', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('saves status report to correct path', async () => {
    const statusReport: StatusReport = {
      generated_at: new Date().toISOString(),
      total_providers: 6,
      summary: {
        operational: 5,
        degraded: 1,
        down: 0,
        unknown: 0,
      },
      providers: [],
    };

    const filepath = await saveStatusReport(mockContext, statusReport);

    expect(mockContext.fs.mkdir).toHaveBeenCalledWith('/data/ai-tools', true);
    expect(mockContext.fs.writeJson).toHaveBeenCalledWith(
      '/data/ai-tools/status-report.json',
      statusReport,
      true
    );
    expect(filepath).toBe('/data/ai-tools/status-report.json');
  });
});

describe('loadStatusReport', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('returns null if file does not exist', async () => {
    (mockContext.fs.exists as jest.Mock).mockResolvedValue(false);

    const result = await loadStatusReport(mockContext);

    expect(result).toBeNull();
  });

  test('returns data if file exists', async () => {
    const statusReport: StatusReport = {
      generated_at: new Date().toISOString(),
      total_providers: 6,
      summary: { operational: 5, degraded: 1, down: 0, unknown: 0 },
      providers: [],
    };

    (mockContext.fs.exists as jest.Mock).mockResolvedValue(true);
    (mockContext.fs.readJson as jest.Mock).mockResolvedValue(statusReport);

    const result = await loadStatusReport(mockContext);

    expect(result).toEqual(statusReport);
  });
});

describe('saveRankingsData', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('saves rankings data with time range in filename', async () => {
    const rankingsData: RankingsData = {
      scraped_at: new Date().toISOString(),
      source: 'openrouter',
      timeRange: 'week',
      leaderboard: [],
      marketShare: [],
      topApps: [],
    };

    const filepath = await saveRankingsData(mockContext, rankingsData);

    expect(mockContext.fs.mkdir).toHaveBeenCalledWith('/data/ai-tools', true);
    expect(mockContext.fs.writeJson).toHaveBeenCalledWith(
      '/data/ai-tools/rankings-week.json',
      rankingsData,
      true
    );
    expect(filepath).toBe('/data/ai-tools/rankings-week.json');
  });
});

describe('loadRankingsData', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('returns null if file does not exist', async () => {
    (mockContext.fs.exists as jest.Mock).mockResolvedValue(false);

    const result = await loadRankingsData(mockContext, 'week');

    expect(result).toBeNull();
  });

  test('returns data if file exists', async () => {
    const rankingsData: RankingsData = {
      scraped_at: new Date().toISOString(),
      source: 'openrouter',
      timeRange: 'month',
      leaderboard: [],
      marketShare: [],
      topApps: [],
    };

    (mockContext.fs.exists as jest.Mock).mockResolvedValue(true);
    (mockContext.fs.readJson as jest.Mock).mockResolvedValue(rankingsData);

    const result = await loadRankingsData(mockContext, 'month');

    expect(result).toEqual(rankingsData);
  });
});

describe('saveLeaderboardData', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('saves leaderboard data to correct path', async () => {
    const leaderboardData: AllLeaderboardsData = {
      scrapedAt: new Date().toISOString(),
      sources: ['lmarena'],
      text: {},
    };

    const filepath = await saveLeaderboardData(mockContext, leaderboardData);

    expect(mockContext.fs.mkdir).toHaveBeenCalledWith('/data/ai-tools', true);
    expect(mockContext.fs.writeJson).toHaveBeenCalledWith(
      '/data/ai-tools/lmarena-leaderboard.json',
      leaderboardData,
      true
    );
    expect(filepath).toBe('/data/ai-tools/lmarena-leaderboard.json');
  });
});

describe('loadLeaderboardData', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('returns null if file does not exist', async () => {
    (mockContext.fs.exists as jest.Mock).mockResolvedValue(false);

    const result = await loadLeaderboardData(mockContext);

    expect(result).toBeNull();
  });

  test('returns data if file exists', async () => {
    const leaderboardData: AllLeaderboardsData = {
      scrapedAt: new Date().toISOString(),
      sources: ['lmarena'],
      text: {},
    };

    (mockContext.fs.exists as jest.Mock).mockResolvedValue(true);
    (mockContext.fs.readJson as jest.Mock).mockResolvedValue(leaderboardData);

    const result = await loadLeaderboardData(mockContext);

    expect(result).toEqual(leaderboardData);
  });
});

describe('clearCache', () => {
  let mockContext: PluginContext;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  test('does nothing if output dir does not exist', async () => {
    (mockContext.fs.exists as jest.Mock).mockResolvedValue(false);

    await clearCache(mockContext);

    expect(mockContext.fs.readDir).not.toHaveBeenCalled();
    expect(mockContext.fs.remove).not.toHaveBeenCalled();
  });

  test('removes only JSON files from output dir', async () => {
    (mockContext.fs.exists as jest.Mock).mockResolvedValue(true);
    (mockContext.fs.readDir as jest.Mock).mockResolvedValue([
      { name: 'pricing-openai.json', path: '/data/ai-tools/pricing-openai.json', isFile: true },
      { name: 'status-report.json', path: '/data/ai-tools/status-report.json', isFile: true },
      { name: 'readme.txt', path: '/data/ai-tools/readme.txt', isFile: true },
      { name: 'subdir', path: '/data/ai-tools/subdir', isFile: false, isDirectory: true },
    ]);

    await clearCache(mockContext);

    expect(mockContext.fs.remove).toHaveBeenCalledTimes(2);
    expect(mockContext.fs.remove).toHaveBeenCalledWith('/data/ai-tools/pricing-openai.json');
    expect(mockContext.fs.remove).toHaveBeenCalledWith('/data/ai-tools/status-report.json');
    // Should not remove txt files or directories
    expect(mockContext.fs.remove).not.toHaveBeenCalledWith('/data/ai-tools/readme.txt');
    expect(mockContext.fs.remove).not.toHaveBeenCalledWith('/data/ai-tools/subdir');
  });

  test('handles empty output dir', async () => {
    (mockContext.fs.exists as jest.Mock).mockResolvedValue(true);
    (mockContext.fs.readDir as jest.Mock).mockResolvedValue([]);

    await clearCache(mockContext);

    expect(mockContext.fs.remove).not.toHaveBeenCalled();
  });
});
