import type { MarketplacePrompt, InstalledMarketplacePrompt } from '@/types/content/prompt-marketplace';
import type { PromptTemplate } from '@/types/content/prompt-template';
import * as marketplaceUtils from './marketplace-utils';

const buildTemplate = (overrides: Partial<PromptTemplate> = {}): PromptTemplate => ({
  id: 'template-1',
  name: 'Prompt One',
  description: 'Helpful prompt',
  content: 'Hello {{name}}',
  category: 'chat',
  tags: ['marketplace'],
  variables: [{ name: 'name', type: 'text', required: true }],
  targets: ['chat'],
  source: 'imported',
  meta: {
    marketplace: {
      marketplaceId: 'market-1',
      linkageType: 'installed',
      installedVersion: '1.0.0',
      latestVersion: '1.0.0',
      baseline: {
        version: '1.0.0',
        name: 'Prompt One',
        description: 'Helpful prompt',
        content: 'Hello {{name}}',
        category: 'chat',
        tags: ['marketplace'],
        variables: [{ name: 'name', type: 'text', required: true }],
        targets: ['chat'],
        capturedAt: '2026-03-14T00:00:00.000Z',
      },
    },
  } as PromptTemplate['meta'],
  usageCount: 0,
  createdAt: new Date('2026-03-14T00:00:00.000Z'),
  updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  ...overrides,
});

const buildMarketplacePrompt = (overrides: Partial<MarketplacePrompt> = {}): MarketplacePrompt => ({
  id: 'market-1',
  name: 'Prompt One',
  description: 'Helpful prompt',
  content: 'Hello {{name}}',
  category: 'chat',
  tags: ['marketplace', 'utility'],
  variables: [{ name: 'name', type: 'text', required: true }],
  targets: ['chat'],
  author: { id: 'author-1', name: 'Author One' },
  source: 'marketplace',
  qualityTier: 'community',
  version: '1.0.0',
  versions: [],
  stats: {
    downloads: 10,
    weeklyDownloads: 5,
    favorites: 1,
    shares: 0,
    views: 12,
  },
  rating: {
    average: 4.8,
    count: 10,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 8 },
  },
  reviewCount: 0,
  createdAt: new Date('2026-03-14T00:00:00.000Z'),
  updatedAt: new Date('2026-03-14T00:00:00.000Z'),
  ...overrides,
});

const buildInstallation = (
  overrides: Partial<InstalledMarketplacePrompt> = {}
): InstalledMarketplacePrompt => ({
  id: 'install-1',
  marketplaceId: 'market-1',
  localTemplateId: 'template-1',
  installedVersion: '1.0.0',
  latestVersion: '1.0.0',
  hasUpdate: false,
  autoUpdate: false,
  installedAt: new Date('2026-03-14T00:00:00.000Z'),
  ...overrides,
});

describe('prompt marketplace workflow helpers', () => {
  it('builds a linked local template input from a marketplace prompt', () => {
    const builder = (
      marketplaceUtils as unknown as {
        buildTemplateInputFromMarketplacePrompt?: (prompt: MarketplacePrompt) => Record<string, unknown>;
      }
    ).buildTemplateInputFromMarketplacePrompt;

    expect(typeof builder).toBe('function');

    const input = builder!(buildMarketplacePrompt({ version: '1.2.0' }));

    expect(input).toEqual(
      expect.objectContaining({
        name: 'Prompt One',
        source: 'imported',
        category: 'chat',
        tags: expect.arrayContaining(['marketplace', 'utility']),
        meta: expect.objectContaining({
          marketplace: expect.objectContaining({
            marketplaceId: 'market-1',
            linkageType: 'installed',
            installedVersion: '1.2.0',
            latestVersion: '1.2.0',
            baseline: expect.objectContaining({
              version: '1.2.0',
              content: 'Hello {{name}}',
            }),
          }),
        }),
      })
    );
  });

  it('derives a clean installed workflow state when the template still matches its baseline', () => {
    const deriveWorkflowState = (
      marketplaceUtils as unknown as {
        derivePromptWorkflowState?: (input: {
          template: PromptTemplate;
          installation?: InstalledMarketplacePrompt;
        }) => Record<string, unknown>;
      }
    ).derivePromptWorkflowState;

    expect(typeof deriveWorkflowState).toBe('function');

    const workflow = deriveWorkflowState!({
      template: buildTemplate(),
      installation: buildInstallation(),
    });

    expect(workflow).toEqual(
      expect.objectContaining({
        relation: 'installed',
        syncStatus: 'clean',
        hasDraftSession: false,
        continueEditingTemplateId: 'template-1',
      })
    );
  });

  it('flags marketplace conflicts when local edits exist alongside a newer upstream version', () => {
    const deriveWorkflowState = (
      marketplaceUtils as unknown as {
        derivePromptWorkflowState?: (input: {
          template: PromptTemplate;
          installation?: InstalledMarketplacePrompt;
        }) => Record<string, unknown>;
      }
    ).derivePromptWorkflowState;

    expect(typeof deriveWorkflowState).toBe('function');

    const workflow = deriveWorkflowState!({
      template: buildTemplate({ content: 'Locally edited content' }),
      installation: buildInstallation({
        latestVersion: '2.0.0',
        hasUpdate: true,
      }),
    });

    expect(workflow).toEqual(
      expect.objectContaining({
        relation: 'installed',
        syncStatus: 'conflict',
      })
    );
  });

  it('reports publish readiness and update resolution from the same workflow contract', () => {
    const derivePublishReadiness = (
      marketplaceUtils as unknown as {
        derivePromptPublishReadiness?: (input: {
          template: PromptTemplate;
          workflow: { syncStatus: string };
        }) => Record<string, unknown>;
      }
    ).derivePromptPublishReadiness;
    const resolveUpdateAction = (
      marketplaceUtils as unknown as {
        resolveMarketplaceUpdateAction?: (input: {
          template: PromptTemplate;
          installation: InstalledMarketplacePrompt;
        }) => Record<string, unknown>;
      }
    ).resolveMarketplaceUpdateAction;

    expect(typeof derivePublishReadiness).toBe('function');
    expect(typeof resolveUpdateAction).toBe('function');

    const readiness = derivePublishReadiness!({
      template: buildTemplate({ description: '' }),
      workflow: { syncStatus: 'conflict' },
    });
    const resolution = resolveUpdateAction!({
      template: buildTemplate({ content: 'Locally edited content' }),
      installation: buildInstallation({
        latestVersion: '2.0.0',
        hasUpdate: true,
      }),
    });

    expect(readiness).toEqual(
      expect.objectContaining({
        isReady: false,
        mode: 'blocked',
        reasons: expect.arrayContaining(['missing-description', 'unresolved-conflict']),
      })
    );
    expect(resolution).toEqual(
      expect.objectContaining({
        type: 'conflict',
        allowedActions: ['overwrite-local', 'keep-local-draft', 'fork-and-reinstall'],
      })
    );
  });
});
