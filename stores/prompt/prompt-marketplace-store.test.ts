/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import type {
  InstalledMarketplacePrompt,
  MarketplacePrompt,
  MarketplaceUserActivity,
  PromptReview,
} from '@/types/content/prompt-marketplace';
import type { PromptMarketplaceCatalog } from '@/lib/prompts/marketplace';
import type {
  PromptMarketplaceExchangeParseResult,
  PromptMarketplaceImportReport,
} from '@/lib/prompts/marketplace-utils';
import { usePromptMarketplaceStore } from './prompt-marketplace-store';

const mockGetCatalog = jest.fn();
const mockGetFallbackCatalog = jest.fn();
const mockGetPromptById = jest.fn();
const mockGetPromptReviews = jest.fn();
const mockPublishPrompt = jest.fn();
const mockSubmitReview = jest.fn();
const mockMarkReviewHelpful = jest.fn();
const mockCheckForUpdates = jest.fn();
const mockValidateImportPayload = jest.fn();

const mockCreateTemplate = jest.fn();
const mockDeleteTemplate = jest.fn();
const mockUpdateTemplate = jest.fn();
const mockGetTemplate = jest.fn();

jest.mock('@/lib/prompts/marketplace', () => ({
  promptMarketplaceRepository: {
    getCatalog: (...args: unknown[]) => mockGetCatalog(...args),
    getFallbackCatalog: (...args: unknown[]) => mockGetFallbackCatalog(...args),
    getPromptById: (...args: unknown[]) => mockGetPromptById(...args),
    getPromptReviews: (...args: unknown[]) => mockGetPromptReviews(...args),
    publishPrompt: (...args: unknown[]) => mockPublishPrompt(...args),
    submitReview: (...args: unknown[]) => mockSubmitReview(...args),
    markReviewHelpful: (...args: unknown[]) => mockMarkReviewHelpful(...args),
    checkForUpdates: (...args: unknown[]) => mockCheckForUpdates(...args),
    validateImportPayload: (...args: unknown[]) => mockValidateImportPayload(...args),
  },
}));

jest.mock('./prompt-template-store', () => ({
  usePromptTemplateStore: {
    getState: () => ({
      createTemplate: mockCreateTemplate,
      deleteTemplate: mockDeleteTemplate,
      updateTemplate: mockUpdateTemplate,
      getTemplate: mockGetTemplate,
    }),
  },
}));

const initialUserActivity: MarketplaceUserActivity = {
  userId: '',
  favorites: [],
  installed: [],
  reviewed: [],
  published: [],
  collections: [],
  recentlyViewed: [],
};

const createMockPrompt = (
  id: string,
  overrides: Partial<MarketplacePrompt> = {}
): MarketplacePrompt => ({
  id,
  name: `Prompt ${id}`,
  description: 'Prompt description',
  content: 'Hello {{name}}',
  category: 'chat',
  subcategory: undefined,
  tags: ['utility'],
  variables: [{ name: 'name', type: 'text', required: true, description: 'Name' }],
  targets: ['chat'],
  author: { id: 'author-1', name: 'Author One' },
  source: 'marketplace',
  qualityTier: 'community',
  version: '1.0.0',
  versions: [],
  stats: {
    downloads: 10,
    weeklyDownloads: 3,
    favorites: 1,
    shares: 0,
    views: 5,
  },
  rating: {
    average: 4.5,
    count: 2,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
  },
  reviewCount: 0,
  icon: '🧪',
  color: '#22c55e',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

const createMockReview = (promptId: string): PromptReview => ({
  id: `${promptId}-review-1`,
  authorId: 'user-1',
  authorName: 'Test User',
  rating: 5,
  content: 'Great prompt',
  helpful: 0,
  createdAt: new Date(),
});

const fallbackPrompt = createMockPrompt('fallback-1');
const fallbackCatalog: PromptMarketplaceCatalog = {
  prompts: { [fallbackPrompt.id]: fallbackPrompt },
  collections: {},
  featuredIds: [fallbackPrompt.id],
  trendingIds: [fallbackPrompt.id],
  sourceState: 'fallback',
};

function resetStoreState(): void {
  usePromptMarketplaceStore.setState({
    prompts: {},
    collections: {},
    featuredIds: [],
    trendingIds: [],
    reviews: {},
    userActivity: initialUserActivity,
    isLoading: false,
    error: null,
    lastSyncedAt: null,
    sourceState: 'unknown',
    sourceWarning: null,
    remoteFirstEnabled: false,
    operationStates: {},
  });
}

describe('usePromptMarketplaceStore (contract)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStoreState();

    mockCreateTemplate.mockReturnValue({ id: 'template-1' });
    mockDeleteTemplate.mockReturnValue(undefined);
    mockUpdateTemplate.mockReturnValue(undefined);
    mockGetTemplate.mockReturnValue({
      id: 'template-1',
      name: 'Template One',
      description: 'Template desc',
      content: 'Template content',
      category: 'chat',
      tags: ['template'],
      variables: [{ name: 'name', type: 'text', required: true, description: 'Name' }],
      targets: ['chat'],
    });

    mockGetCatalog.mockResolvedValue(fallbackCatalog);
    mockGetFallbackCatalog.mockReturnValue(fallbackCatalog);
    mockGetPromptById.mockResolvedValue(null);
    mockGetPromptReviews.mockResolvedValue([]);
    mockPublishPrompt.mockResolvedValue(createMockPrompt('published-1', { source: 'user' }));
    mockSubmitReview.mockResolvedValue(createMockReview('fallback-1'));
    mockMarkReviewHelpful.mockResolvedValue(undefined);
    mockCheckForUpdates.mockResolvedValue([]);
    mockValidateImportPayload.mockReturnValue({
      ok: true,
      payload: {
        version: '1.1',
        exportedAt: new Date().toISOString(),
        prompts: [],
      },
      errors: [],
    } satisfies PromptMarketplaceExchangeParseResult);
  });

  it('refreshes catalog from remote source when available', async () => {
    const remotePrompt = createMockPrompt('remote-1');
    const remoteCatalog: PromptMarketplaceCatalog = {
      prompts: { [remotePrompt.id]: remotePrompt },
      collections: {},
      featuredIds: [remotePrompt.id],
      trendingIds: [remotePrompt.id],
      sourceState: 'remote',
    };
    mockGetCatalog.mockResolvedValue(remoteCatalog);

    const { result } = renderHook(() => usePromptMarketplaceStore());

    await act(async () => {
      result.current.setRemoteFirstEnabled(true);
      await result.current.refreshCatalog();
    });

    expect(mockGetCatalog).toHaveBeenCalledWith({ preferRemote: true });
    expect(result.current.sourceState).toBe('remote');
    expect(result.current.sourceWarning).toBeNull();
    expect(result.current.prompts[remotePrompt.id]).toBeDefined();
  });

  it('falls back with recoverable warning when remote catalog fails', async () => {
    mockGetCatalog.mockRejectedValue(new Error('network unavailable'));
    const { result } = renderHook(() => usePromptMarketplaceStore());

    await act(async () => {
      result.current.setRemoteFirstEnabled(true);
      await result.current.refreshCatalog();
    });

    expect(result.current.sourceState).toBe('fallback');
    expect(result.current.sourceWarning).toContain('network unavailable');
    expect(result.current.prompts[fallbackPrompt.id]).toBeDefined();
  });

  it('tracks install operation state and installation metadata', async () => {
    const prompt = createMockPrompt('install-1', {
      stats: { downloads: 0, weeklyDownloads: 0, favorites: 0, shares: 0, views: 0 },
    });
    const { result } = renderHook(() => usePromptMarketplaceStore());

    act(() => {
      usePromptMarketplaceStore.setState({
        prompts: { [prompt.id]: prompt },
      });
    });

    let templateId = '';
    await act(async () => {
      templateId = await result.current.installPrompt(prompt);
    });

    expect(templateId).toBe('template-1');
    expect(result.current.userActivity.installed).toHaveLength(1);
    expect(result.current.userActivity.installed[0].marketplaceId).toBe('install-1');
    expect(result.current.prompts['install-1'].stats.downloads).toBe(1);
    expect(result.current.operationStates['install:install-1']?.status).toBe('success');
  });

  it('keeps install linkage when uninstall fails and exposes operation error', () => {
    const installed: InstalledMarketplacePrompt = {
      id: 'inst-1',
      marketplaceId: 'prompt-1',
      localTemplateId: 'template-1',
      installedVersion: '1.0.0',
      latestVersion: '1.0.0',
      hasUpdate: false,
      autoUpdate: false,
      installedAt: new Date(),
    };
    mockDeleteTemplate.mockImplementation(() => {
      throw new Error('template delete failed');
    });

    const { result } = renderHook(() => usePromptMarketplaceStore());
    act(() => {
      usePromptMarketplaceStore.setState({
        userActivity: {
          ...initialUserActivity,
          installed: [installed],
        },
      });
    });

    expect(() =>
      act(() => {
        result.current.uninstallPrompt('prompt-1');
      })
    ).toThrow('template delete failed');
    expect(usePromptMarketplaceStore.getState().userActivity.installed).toHaveLength(1);
    expect(
      usePromptMarketplaceStore.getState().operationStates['uninstall:prompt-1']?.status
    ).toBe('error');
  });

  it('updates installed prompts via repository update check', async () => {
    const prompt = createMockPrompt('update-1', { version: '2.0.0' });
    const { result } = renderHook(() => usePromptMarketplaceStore());
    act(() => {
      usePromptMarketplaceStore.setState({
        prompts: { [prompt.id]: prompt },
        userActivity: {
          ...initialUserActivity,
          installed: [
            {
              id: 'inst-1',
              marketplaceId: 'update-1',
              localTemplateId: 'template-1',
              installedVersion: '1.0.0',
              latestVersion: '1.0.0',
              hasUpdate: false,
              autoUpdate: false,
              installedAt: new Date(),
            },
          ],
        },
      });
    });

    mockCheckForUpdates.mockResolvedValue([
      { marketplaceId: 'update-1', latestVersion: '2.0.0' },
    ]);

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(result.current.userActivity.installed[0].hasUpdate).toBe(true);
    expect(result.current.userActivity.installed[0].latestVersion).toBe('2.0.0');
    expect(result.current.operationStates['check-updates']?.status).toBe('success');
  });

  it('blocks duplicate reviews and records operation error', async () => {
    const prompt = createMockPrompt('review-1');
    const { result } = renderHook(() => usePromptMarketplaceStore());

    act(() => {
      usePromptMarketplaceStore.setState({
        prompts: { [prompt.id]: prompt },
        userActivity: {
          ...initialUserActivity,
          reviewed: ['review-1'],
        },
      });
    });

    await act(async () => {
      await expect(
        result.current.submitReview('review-1', 5, 'already reviewed')
      ).rejects.toThrow('You already reviewed this prompt.');
    });
    expect(usePromptMarketplaceStore.getState().operationStates['review:review-1']?.status).toBe(
      'error'
    );
  });

  it('imports prompts with skip strategy and emits per-item report', async () => {
    const installedPrompt = createMockPrompt('import-1');
    const { result } = renderHook(() => usePromptMarketplaceStore());

    act(() => {
      usePromptMarketplaceStore.setState({
        prompts: { [installedPrompt.id]: installedPrompt },
        userActivity: {
          ...initialUserActivity,
          installed: [
            createInstallationRecord('import-1', 'template-1', '1.0.0'),
          ],
        },
      });
    });

    mockValidateImportPayload.mockReturnValue({
      ok: true,
      payload: {
        version: '1.1',
        exportedAt: new Date().toISOString(),
        prompts: [
          {
            id: 'import-1',
            name: 'Import 1',
            content: 'Imported content',
            description: 'desc',
            category: 'chat',
            tags: ['a'],
            variables: [],
            targets: ['chat'],
          },
        ],
      },
      errors: [],
    } satisfies PromptMarketplaceExchangeParseResult);

    let report: PromptMarketplaceImportReport | null = null;
    await act(async () => {
      report = await result.current.importPrompts('{}', 'skip');
    });

    expect(report).not.toBeNull();
    expect(report!.skipped).toBe(1);
    expect(report!.imported).toBe(0);
    expect(report!.items[0].status).toBe('skipped');
  });

  it('imports duplicates with duplicate strategy as new installed prompts', async () => {
    const installedPrompt = createMockPrompt('dup-1');
    const { result } = renderHook(() => usePromptMarketplaceStore());

    act(() => {
      usePromptMarketplaceStore.setState({
        prompts: { [installedPrompt.id]: installedPrompt },
        userActivity: {
          ...initialUserActivity,
          installed: [createInstallationRecord('dup-1', 'template-1', '1.0.0')],
        },
      });
    });

    mockValidateImportPayload.mockReturnValue({
      ok: true,
      payload: {
        version: '1.1',
        exportedAt: new Date().toISOString(),
        prompts: [
          {
            id: 'dup-1',
            name: 'Duplicate Prompt',
            content: 'Imported content',
            description: 'desc',
            category: 'chat',
            tags: ['a'],
            variables: [],
            targets: ['chat'],
          },
        ],
      },
      errors: [],
    } satisfies PromptMarketplaceExchangeParseResult);

    await act(async () => {
      await result.current.importPrompts('{}', 'duplicate');
    });

    expect(result.current.userActivity.installed).toHaveLength(2);
    expect(result.current.userActivity.installed[1].marketplaceId).not.toBe('dup-1');
  });

  it('exports installed prompts with versioned schema payload', () => {
    const exportPrompt = createMockPrompt('export-1');
    const { result } = renderHook(() => usePromptMarketplaceStore());

    act(() => {
      usePromptMarketplaceStore.setState({
        prompts: { [exportPrompt.id]: exportPrompt },
        userActivity: {
          ...initialUserActivity,
          installed: [createInstallationRecord('export-1', 'template-1', '1.0.0')],
        },
      });
    });

    let payload: ReturnType<typeof result.current.exportInstalledPrompts> | undefined;
    act(() => {
      payload = result.current.exportInstalledPrompts();
    });
    expect(payload).toBeDefined();
    expect(payload!.version).toBe('1.1');
    expect(payload!.prompts).toHaveLength(1);
    expect(payload!.prompts[0].id).toBe('export-1');
    expect(usePromptMarketplaceStore.getState().operationStates.export?.status).toBe('success');
  });
});

function createInstallationRecord(
  marketplaceId: string,
  localTemplateId: string,
  version: string
): InstalledMarketplacePrompt {
  return {
    id: `inst-${marketplaceId}`,
    marketplaceId,
    localTemplateId,
    installedVersion: version,
    latestVersion: version,
    hasUpdate: false,
    autoUpdate: false,
    installedAt: new Date(),
  };
}
