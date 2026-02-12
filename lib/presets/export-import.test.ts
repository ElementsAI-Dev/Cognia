/**
 * @jest-environment jsdom
 */

/**
 * Tests for lib/presets/export-import
 */

import { exportPresetsToFile, parsePresetImportFile } from './export-import';
import type { Preset } from '@/types/content/preset';

// Helper to create a minimal Preset
function makePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: 'p1',
    name: 'Test Preset',
    description: 'A description',
    icon: '💬',
    color: '#6366f1',
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat',
    systemPrompt: 'You are helpful.',
    temperature: 0.7,
    maxTokens: undefined,
    webSearchEnabled: false,
    thinkingEnabled: false,
    isFavorite: false,
    isDefault: false,
    usageCount: 0,
    sortOrder: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as Preset;
}

// --- exportPresetsToFile ---

describe('exportPresetsToFile', () => {
  let mockCreateObjectURL: jest.Mock;
  let mockRevokeObjectURL: jest.Mock;
  let mockClick: jest.Mock;

  beforeEach(() => {
    mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
    mockRevokeObjectURL = jest.fn();
    mockClick = jest.fn();

    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    jest.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: mockClick,
    } as unknown as HTMLAnchorElement);

    jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    jest.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a Blob and triggers download', () => {
    const presets = [makePreset()];
    exportPresetsToFile(presets);

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    expect(mockClick).toHaveBeenCalledTimes(1);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('serialises preset fields correctly', () => {
    const presets = [makePreset({ name: 'My Preset', isFavorite: true })];
    exportPresetsToFile(presets);

    const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('application/json');
  });
});

// --- parsePresetImportFile ---

describe('parsePresetImportFile', () => {
  function makeFile(content: string): File {
    return new File([content], 'presets.json', { type: 'application/json' });
  }

  it('parses valid preset entries', async () => {
    const data = {
      presets: [
        { name: 'Preset 1', provider: 'openai', model: 'gpt-4o', mode: 'chat' },
        { name: 'Preset 2', provider: 'anthropic', model: 'claude-3', mode: 'agent' },
      ],
    };
    const file = makeFile(JSON.stringify(data));
    const result = await parsePresetImportFile(file);

    expect(result.entries).toHaveLength(2);
    expect(result.skipped).toBe(0);
    expect(result.entries[0].name).toBe('Preset 1');
    expect(result.entries[1].mode).toBe('agent');
  });

  it('skips entries missing required fields', async () => {
    const data = {
      presets: [
        { name: 'Valid', provider: 'openai', model: 'gpt-4o' },
        { description: 'No name' }, // missing name
        { name: 'No provider', model: 'gpt-4o' }, // missing provider
        { name: 'No model', provider: 'openai' }, // missing model
      ],
    };
    const file = makeFile(JSON.stringify(data));
    const result = await parsePresetImportFile(file);

    expect(result.entries).toHaveLength(1);
    expect(result.skipped).toBe(3);
  });

  it('applies default mode for invalid mode values', async () => {
    const data = {
      presets: [
        { name: 'Test', provider: 'openai', model: 'gpt-4o', mode: 'invalid' },
      ],
    };
    const file = makeFile(JSON.stringify(data));
    const result = await parsePresetImportFile(file);

    expect(result.entries[0].mode).toBe('chat');
  });

  it('clamps temperature between 0 and 2', async () => {
    const data = {
      presets: [
        { name: 'Hot', provider: 'openai', model: 'gpt-4o', temperature: 5 },
        { name: 'Cold', provider: 'openai', model: 'gpt-4o', temperature: -1 },
      ],
    };
    const file = makeFile(JSON.stringify(data));
    const result = await parsePresetImportFile(file);

    expect(result.entries[0].temperature).toBe(2);
    expect(result.entries[1].temperature).toBe(0);
  });

  it('truncates long names to 100 chars', async () => {
    const longName = 'A'.repeat(200);
    const data = {
      presets: [{ name: longName, provider: 'openai', model: 'gpt-4o' }],
    };
    const file = makeFile(JSON.stringify(data));
    const result = await parsePresetImportFile(file);

    expect(result.entries[0].name).toHaveLength(100);
  });

  it('rejects files without presets array', async () => {
    const file = makeFile(JSON.stringify({ version: 1 }));
    await expect(parsePresetImportFile(file)).rejects.toThrow('invalidFileFormat');
  });

  it('rejects files with invalid JSON', async () => {
    const file = makeFile('not json');
    await expect(parsePresetImportFile(file)).rejects.toThrow('parseFileFailed');
  });

  it('preserves isFavorite flag', async () => {
    const data = {
      presets: [
        { name: 'Fav', provider: 'openai', model: 'gpt-4o', isFavorite: true },
      ],
    };
    const file = makeFile(JSON.stringify(data));
    const result = await parsePresetImportFile(file);

    expect(result.entries[0].isFavorite).toBe(true);
  });
});
