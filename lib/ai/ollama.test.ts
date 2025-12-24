/**
 * Ollama API client tests
 */

import {
  getOllamaStatus,
  listOllamaModels,
  showOllamaModel,
  deleteOllamaModel,
  listRunningModels,
  copyOllamaModel,
  generateOllamaEmbedding,
  stopOllamaModel,
  isOllamaEmbeddingModel,
  getOllamaModelCapabilities,
  DEFAULT_OLLAMA_URL,
} from './ollama';

// Mock Tauri
const mockInvoke = jest.fn();
const mockListen = jest.fn();

jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

// Mock window.__TAURI__ for Tauri environment detection
const originalWindow = global.window;

describe('Ollama API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to non-Tauri environment for most tests
    // @ts-expect-error - Mocking window for tests
    delete global.window.__TAURI__;
  });

  afterAll(() => {
    global.window = originalWindow;
  });

  describe('DEFAULT_OLLAMA_URL', () => {
    it('should have correct default URL', () => {
      expect(DEFAULT_OLLAMA_URL).toBe('http://localhost:11434');
    });
  });

  describe('getOllamaStatus', () => {
    it('should return connected status when server responds', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ version: '0.1.0' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ models: [{}, {}, {}] }),
        });

      const status = await getOllamaStatus();

      expect(status.connected).toBe(true);
      expect(status.version).toBe('0.1.0');
      expect(status.models_count).toBe(3);
    });

    it('should return disconnected status when server fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const status = await getOllamaStatus();

      expect(status.connected).toBe(false);
      expect(status.models_count).toBe(0);
    });

    it('should use Tauri invoke in Tauri environment', async () => {
      // @ts-expect-error - Mocking window for tests
      global.window.__TAURI__ = {};
      mockInvoke.mockResolvedValue({
        connected: true,
        version: '0.2.0',
        models_count: 5,
      });

      const status = await getOllamaStatus();

      expect(mockInvoke).toHaveBeenCalledWith('ollama_get_status', {
        baseUrl: DEFAULT_OLLAMA_URL,
      });
      expect(status.connected).toBe(true);
      expect(status.version).toBe('0.2.0');
    });
  });

  describe('listOllamaModels', () => {
    it('should return list of models', async () => {
      const mockModels = [
        { name: 'llama3.2', model: 'llama3.2', size: 2000000000 },
        { name: 'qwen2.5', model: 'qwen2.5', size: 4000000000 },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: mockModels }),
      });

      const models = await listOllamaModels();

      expect(models).toEqual(mockModels);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags'
      );
    });

    it('should throw error when request fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(listOllamaModels()).rejects.toThrow('Failed to list models');
    });

    it('should use custom base URL', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      await listOllamaModels('http://custom:8080');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://custom:8080/api/tags'
      );
    });

    it('should normalize URL with /v1 suffix', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      await listOllamaModels('http://localhost:11434/v1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags'
      );
    });
  });

  describe('showOllamaModel', () => {
    it('should return model info', async () => {
      const mockInfo = {
        modelfile: 'FROM llama3.2',
        parameters: 'temperature 0.7',
        template: '{{ .Prompt }}',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockInfo),
      });

      const info = await showOllamaModel(DEFAULT_OLLAMA_URL, 'llama3.2');

      expect(info).toEqual(mockInfo);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/show',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'llama3.2' }),
        })
      );
    });
  });

  describe('deleteOllamaModel', () => {
    it('should delete model successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      const result = await deleteOllamaModel(DEFAULT_OLLAMA_URL, 'old-model');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/delete',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ name: 'old-model' }),
        })
      );
    });

    it('should throw error when delete fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(
        deleteOllamaModel(DEFAULT_OLLAMA_URL, 'nonexistent')
      ).rejects.toThrow('Failed to delete model');
    });
  });

  describe('listRunningModels', () => {
    it('should return running models', async () => {
      const mockRunning = [
        { name: 'llama3.2', model: 'llama3.2', size: 2000000000 },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: mockRunning }),
      });

      const models = await listRunningModels();

      expect(models).toEqual(mockRunning);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/ps'
      );
    });
  });

  describe('copyOllamaModel', () => {
    it('should copy model successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      const result = await copyOllamaModel(
        DEFAULT_OLLAMA_URL,
        'llama3.2',
        'my-llama'
      );

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/copy',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ source: 'llama3.2', destination: 'my-llama' }),
        })
      );
    });
  });

  describe('generateOllamaEmbedding', () => {
    it('should generate embeddings', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ embeddings: [mockEmbedding] }),
      });

      const embedding = await generateOllamaEmbedding(
        DEFAULT_OLLAMA_URL,
        'nomic-embed-text',
        'Hello world'
      );

      expect(embedding).toEqual(mockEmbedding);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/embed',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            model: 'nomic-embed-text',
            input: 'Hello world',
          }),
        })
      );
    });

    it('should throw error when embedding fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Model not found'),
      });

      await expect(
        generateOllamaEmbedding(DEFAULT_OLLAMA_URL, 'invalid', 'text')
      ).rejects.toThrow('Failed to generate embedding');
    });
  });

  describe('stopOllamaModel', () => {
    it('should stop model successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      const result = await stopOllamaModel(DEFAULT_OLLAMA_URL, 'llama3.2');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ model: 'llama3.2', keep_alive: 0 }),
        })
      );
    });
  });

  describe('isOllamaEmbeddingModel', () => {
    it('should identify embedding models', () => {
      expect(isOllamaEmbeddingModel('nomic-embed-text')).toBe(true);
      expect(isOllamaEmbeddingModel('mxbai-embed-large')).toBe(true);
      expect(isOllamaEmbeddingModel('bge-m3')).toBe(true);
      expect(isOllamaEmbeddingModel('all-minilm')).toBe(true);
    });

    it('should not identify non-embedding models', () => {
      expect(isOllamaEmbeddingModel('llama3.2')).toBe(false);
      expect(isOllamaEmbeddingModel('qwen2.5')).toBe(false);
      expect(isOllamaEmbeddingModel('mistral')).toBe(false);
    });
  });

  describe('getOllamaModelCapabilities', () => {
    it('should return correct capabilities for vision models', () => {
      const caps = getOllamaModelCapabilities('llava');
      expect(caps.supportsVision).toBe(true);
      expect(caps.supportsTools).toBe(true);
      expect(caps.supportsEmbedding).toBe(false);
    });

    it('should return correct capabilities for embedding models', () => {
      const caps = getOllamaModelCapabilities('nomic-embed-text');
      expect(caps.supportsVision).toBe(false);
      expect(caps.supportsTools).toBe(false);
      expect(caps.supportsEmbedding).toBe(true);
    });

    it('should return correct capabilities for regular models', () => {
      const caps = getOllamaModelCapabilities('llama3.2');
      expect(caps.supportsVision).toBe(false);
      expect(caps.supportsTools).toBe(true);
      expect(caps.supportsEmbedding).toBe(false);
    });
  });
});
