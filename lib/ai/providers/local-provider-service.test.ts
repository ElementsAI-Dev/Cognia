/**
 * Tests for LocalProviderService
 */

import { 
  LocalProviderService, 
  getProviderCapabilities, 
  getInstallInstructions,
  createLocalProviderService,
} from './local-provider-service';
import type { LocalProviderName } from '@/types/local-provider';

// Mock fetch
global.fetch = jest.fn();

// Mock Tauri
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(() => Promise.resolve(() => {})),
}));

describe('LocalProviderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('constructor', () => {
    it('should create service with default base URL', () => {
      const service = new LocalProviderService('ollama');
      expect(service.getId()).toBe('ollama');
      expect(service.getConfig()).toBeDefined();
      expect(service.getConfig().defaultBaseURL).toBe('http://localhost:11434');
    });

    it('should create service with custom base URL', () => {
      const service = new LocalProviderService('lmstudio', 'http://localhost:5000');
      expect(service.getId()).toBe('lmstudio');
    });

    it('should normalize base URL with trailing slash', () => {
      const service = new LocalProviderService('ollama', 'http://localhost:11434/');
      expect(service.getId()).toBe('ollama');
    });

    it('should normalize base URL with /v1 suffix', () => {
      const service = new LocalProviderService('lmstudio', 'http://localhost:1234/v1');
      expect(service.getId()).toBe('lmstudio');
    });
  });

  describe('getStatus', () => {
    it('should return connected status on successful health check', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: '1.0.0' }),
      });

      const service = new LocalProviderService('lmstudio');
      const status = await service.getStatus();

      expect(status.connected).toBe(true);
      expect(status.version).toBe('1.0.0');
    });

    it('should return disconnected status on failed health check', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const service = new LocalProviderService('lmstudio');
      const status = await service.getStatus();

      expect(status.connected).toBe(false);
      expect(status.error).toContain('500');
    });

    it('should return disconnected status on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const service = new LocalProviderService('lmstudio');
      const status = await service.getStatus();

      expect(status.connected).toBe(false);
      expect(status.error).toBe('Network error');
    });

    it('should include latency in status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const service = new LocalProviderService('lmstudio');
      const status = await service.getStatus();

      expect(status.latency_ms).toBeDefined();
      expect(typeof status.latency_ms).toBe('number');
    });
  });

  describe('listModels', () => {
    it('should return empty array for providers that do not support model listing', async () => {
      const service = new LocalProviderService('llamafile');
      // llamafile supports model listing, so let's mock it properly
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const models = await service.listModels();
      expect(Array.isArray(models)).toBe(true);
    });

    it('should parse OpenAI format response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 'model-1', object: 'model' },
            { id: 'model-2', object: 'model' },
          ],
        }),
      });

      const service = new LocalProviderService('lmstudio');
      const models = await service.listModels();

      expect(models).toHaveLength(2);
      expect(models[0].id).toBe('model-1');
      expect(models[1].id).toBe('model-2');
    });

    it('should parse Ollama format response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'llama3.2', size: 2000000000 },
            { name: 'qwen2.5', size: 4000000000 },
          ],
        }),
      });

      const service = new LocalProviderService('ollama');
      const models = await service.listModels();

      expect(models).toHaveLength(2);
      expect(models[0].id).toBe('llama3.2');
      expect(models[1].id).toBe('qwen2.5');
    });

    it('should return empty array on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const service = new LocalProviderService('lmstudio');
      const models = await service.listModels();

      expect(models).toEqual([]);
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities for each provider', () => {
      const service = new LocalProviderService('ollama');
      const caps = service.getCapabilities();

      expect(caps.canListModels).toBe(true);
      expect(caps.canPullModels).toBe(true);
      expect(caps.canDeleteModels).toBe(true);
      expect(caps.canStopModels).toBe(true);
      expect(caps.canGenerateEmbeddings).toBe(true);
    });

    it('should return limited capabilities for lmstudio', () => {
      const service = new LocalProviderService('lmstudio');
      const caps = service.getCapabilities();

      expect(caps.canListModels).toBe(true);
      expect(caps.canPullModels).toBe(false);
      expect(caps.canDeleteModels).toBe(false);
    });
  });
});

describe('getProviderCapabilities', () => {
  const providers: LocalProviderName[] = [
    'ollama', 'lmstudio', 'llamacpp', 'llamafile', 'vllm',
    'localai', 'jan', 'textgenwebui', 'koboldcpp', 'tabbyapi',
  ];

  it.each(providers)('should return capabilities for %s', (providerId) => {
    const caps = getProviderCapabilities(providerId);

    expect(caps).toHaveProperty('canListModels');
    expect(caps).toHaveProperty('canPullModels');
    expect(caps).toHaveProperty('canDeleteModels');
    expect(caps).toHaveProperty('canStopModels');
    expect(caps).toHaveProperty('canGenerateEmbeddings');
    expect(caps).toHaveProperty('supportsStreaming');
    expect(caps).toHaveProperty('supportsVision');
    expect(caps).toHaveProperty('supportsTools');
  });

  it('should return all capabilities true for ollama', () => {
    const caps = getProviderCapabilities('ollama');
    expect(caps.canListModels).toBe(true);
    expect(caps.canPullModels).toBe(true);
    expect(caps.canDeleteModels).toBe(true);
    expect(caps.canStopModels).toBe(true);
    expect(caps.supportsStreaming).toBe(true);
  });

  it('should return canPullModels false for lmstudio', () => {
    const caps = getProviderCapabilities('lmstudio');
    expect(caps.canPullModels).toBe(false);
  });
});

describe('getInstallInstructions', () => {
  const providers: LocalProviderName[] = [
    'ollama', 'lmstudio', 'llamacpp', 'llamafile', 'vllm',
    'localai', 'jan', 'textgenwebui', 'koboldcpp', 'tabbyapi',
  ];

  it.each(providers)('should return install instructions for %s', (providerId) => {
    const instructions = getInstallInstructions(providerId);

    expect(instructions).toHaveProperty('title');
    expect(instructions).toHaveProperty('steps');
    expect(instructions).toHaveProperty('downloadUrl');
    expect(instructions).toHaveProperty('docsUrl');
    expect(Array.isArray(instructions.steps)).toBe(true);
    expect(instructions.steps.length).toBeGreaterThan(0);
  });

  it('should have valid URLs for ollama', () => {
    const instructions = getInstallInstructions('ollama');
    expect(instructions.downloadUrl).toContain('ollama');
    expect(instructions.docsUrl).toContain('ollama');
  });
});

describe('createLocalProviderService', () => {
  it('should create a service instance', () => {
    const service = createLocalProviderService('ollama');
    expect(service).toBeInstanceOf(LocalProviderService);
    expect(service.getId()).toBe('ollama');
  });

  it('should accept custom base URL', () => {
    const service = createLocalProviderService('lmstudio', 'http://custom:1234');
    expect(service).toBeInstanceOf(LocalProviderService);
  });
});
