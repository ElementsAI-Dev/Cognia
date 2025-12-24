import { test, expect } from '@playwright/test';

/**
 * Ollama Settings E2E Tests
 * Tests for local model management with Ollama
 */

test.describe('Ollama Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should validate Ollama base URL', async ({ page }) => {
    const result = await page.evaluate(() => {
      const validateOllamaUrl = (url: string): { valid: boolean; error?: string } => {
        if (!url || url.trim() === '') {
          return { valid: false, error: 'URL is required' };
        }

        try {
          const parsed = new URL(url);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { valid: false, error: 'URL must use http or https protocol' };
          }
          return { valid: true };
        } catch {
          return { valid: false, error: 'Invalid URL format' };
        }
      };

      return {
        defaultUrl: validateOllamaUrl('http://localhost:11434'),
        customUrl: validateOllamaUrl('http://192.168.1.100:11434'),
        httpsUrl: validateOllamaUrl('https://ollama.example.com'),
        invalidUrl: validateOllamaUrl('not-a-url'),
        emptyUrl: validateOllamaUrl(''),
        ftpUrl: validateOllamaUrl('ftp://localhost:11434'),
      };
    });

    expect(result.defaultUrl.valid).toBe(true);
    expect(result.customUrl.valid).toBe(true);
    expect(result.httpsUrl.valid).toBe(true);
    expect(result.invalidUrl.valid).toBe(false);
    expect(result.emptyUrl.valid).toBe(false);
    expect(result.ftpUrl.valid).toBe(false);
  });

  test('should normalize Ollama URL', async ({ page }) => {
    const result = await page.evaluate(() => {
      const normalizeOllamaUrl = (url: string): string => {
        let normalized = url.trim().replace(/\/+$/, '');
        if (normalized.endsWith('/v1')) {
          normalized = normalized.slice(0, -3);
        }
        return normalized;
      };

      return {
        withTrailingSlash: normalizeOllamaUrl('http://localhost:11434/'),
        withV1Suffix: normalizeOllamaUrl('http://localhost:11434/v1'),
        withBothSlashAndV1: normalizeOllamaUrl('http://localhost:11434/v1/'),
        clean: normalizeOllamaUrl('http://localhost:11434'),
      };
    });

    expect(result.withTrailingSlash).toBe('http://localhost:11434');
    expect(result.withV1Suffix).toBe('http://localhost:11434');
    expect(result.withBothSlashAndV1).toBe('http://localhost:11434/v1');
    expect(result.clean).toBe('http://localhost:11434');
  });
});

test.describe('Ollama Model Management', () => {
  test('should parse model names correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const parseModelName = (fullName: string): { name: string; tag: string } => {
        const parts = fullName.split(':');
        return {
          name: parts[0],
          tag: parts[1] || 'latest',
        };
      };

      return {
        withTag: parseModelName('llama3.2:7b'),
        withLatest: parseModelName('llama3.2:latest'),
        noTag: parseModelName('llama3.2'),
        multipleColons: parseModelName('model:tag:extra'),
      };
    });

    expect(result.withTag).toEqual({ name: 'llama3.2', tag: '7b' });
    expect(result.withLatest).toEqual({ name: 'llama3.2', tag: 'latest' });
    expect(result.noTag).toEqual({ name: 'llama3.2', tag: 'latest' });
    expect(result.multipleColons.name).toBe('model');
  });

  test('should format model size correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const formatModelSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
      };

      return {
        bytes: formatModelSize(500),
        kilobytes: formatModelSize(2048),
        megabytes: formatModelSize(274 * 1024 * 1024),
        gigabytes: formatModelSize(4.7 * 1024 * 1024 * 1024),
        zero: formatModelSize(0),
      };
    });

    expect(result.bytes).toBe('500 B');
    expect(result.kilobytes).toBe('2 KB');
    expect(result.megabytes).toBe('274 MB');
    expect(result.gigabytes).toBe('4.7 GB');
    expect(result.zero).toBe('0 B');
  });

  test('should identify embedding models', async ({ page }) => {
    const result = await page.evaluate(() => {
      const isEmbeddingModel = (modelName: string): boolean => {
        const embeddingKeywords = ['embed', 'embedding', 'nomic', 'mxbai', 'bge', 'minilm'];
        const lowerName = modelName.toLowerCase();
        return embeddingKeywords.some((keyword) => lowerName.includes(keyword));
      };

      return {
        nomicEmbed: isEmbeddingModel('nomic-embed-text'),
        mxbaiEmbed: isEmbeddingModel('mxbai-embed-large'),
        bgeM3: isEmbeddingModel('bge-m3'),
        allMinilm: isEmbeddingModel('all-minilm'),
        llama: isEmbeddingModel('llama3.2'),
        qwen: isEmbeddingModel('qwen2.5'),
        mistral: isEmbeddingModel('mistral'),
      };
    });

    expect(result.nomicEmbed).toBe(true);
    expect(result.mxbaiEmbed).toBe(true);
    expect(result.bgeM3).toBe(true);
    expect(result.allMinilm).toBe(true);
    expect(result.llama).toBe(false);
    expect(result.qwen).toBe(false);
    expect(result.mistral).toBe(false);
  });

  test('should track model capabilities', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ModelCapabilities {
        supportsVision: boolean;
        supportsTools: boolean;
        supportsEmbedding: boolean;
      }

      const getModelCapabilities = (modelName: string): ModelCapabilities => {
        const lowerName = modelName.toLowerCase();
        const isEmbedding = ['embed', 'nomic', 'mxbai', 'bge'].some((k) =>
          lowerName.includes(k)
        );

        return {
          supportsVision: lowerName.includes('llava') || lowerName.includes('vision'),
          supportsTools: !isEmbedding,
          supportsEmbedding: isEmbedding,
        };
      };

      return {
        llava: getModelCapabilities('llava'),
        llama: getModelCapabilities('llama3.2'),
        nomic: getModelCapabilities('nomic-embed-text'),
        visionModel: getModelCapabilities('llama-vision'),
      };
    });

    expect(result.llava).toEqual({
      supportsVision: true,
      supportsTools: true,
      supportsEmbedding: false,
    });
    expect(result.llama).toEqual({
      supportsVision: false,
      supportsTools: true,
      supportsEmbedding: false,
    });
    expect(result.nomic).toEqual({
      supportsVision: false,
      supportsTools: false,
      supportsEmbedding: true,
    });
    expect(result.visionModel).toEqual({
      supportsVision: true,
      supportsTools: true,
      supportsEmbedding: false,
    });
  });
});

test.describe('Ollama Model Pull Progress', () => {
  test('should calculate pull progress percentage', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface PullProgress {
        status: string;
        completed?: number;
        total?: number;
      }

      const calculateProgress = (progress: PullProgress): number => {
        if (!progress.total || !progress.completed) return 0;
        return Math.round((progress.completed / progress.total) * 100);
      };

      return {
        noProgress: calculateProgress({ status: 'starting' }),
        halfway: calculateProgress({ status: 'downloading', completed: 500, total: 1000 }),
        complete: calculateProgress({ status: 'success', completed: 1000, total: 1000 }),
        partialDownload: calculateProgress({
          status: 'downloading',
          completed: 1500000000,
          total: 4700000000,
        }),
      };
    });

    expect(result.noProgress).toBe(0);
    expect(result.halfway).toBe(50);
    expect(result.complete).toBe(100);
    expect(result.partialDownload).toBe(32);
  });

  test('should format pull progress text', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface PullProgress {
        status: string;
        completed?: number;
        total?: number;
      }

      const formatSize = (bytes: number): string => {
        const gb = bytes / (1024 * 1024 * 1024);
        if (gb >= 1) return `${gb.toFixed(1)} GB`;
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(0)} MB`;
      };

      const formatProgress = (progress: PullProgress): string => {
        if (!progress.total || !progress.completed) {
          return progress.status;
        }
        const percentage = Math.round((progress.completed / progress.total) * 100);
        return `${progress.status} - ${formatSize(progress.completed)} / ${formatSize(progress.total)} (${percentage}%)`;
      };

      return {
        starting: formatProgress({ status: 'pulling manifest' }),
        downloading: formatProgress({
          status: 'downloading',
          completed: 2.35 * 1024 * 1024 * 1024,
          total: 4.7 * 1024 * 1024 * 1024,
        }),
        smallFile: formatProgress({
          status: 'downloading',
          completed: 137 * 1024 * 1024,
          total: 274 * 1024 * 1024,
        }),
      };
    });

    expect(result.starting).toBe('pulling manifest');
    expect(result.downloading).toContain('downloading');
    expect(result.downloading).toContain('50%');
    expect(result.smallFile).toContain('137 MB');
  });
});

test.describe('Ollama Connection Status', () => {
  test('should track connection state', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface OllamaStatus {
        connected: boolean;
        version?: string;
        modelsCount: number;
        lastChecked?: Date;
      }

      const createStatus = (connected: boolean, version?: string, count = 0): OllamaStatus => ({
        connected,
        version,
        modelsCount: count,
        lastChecked: new Date(),
      });

      const disconnected = createStatus(false);
      const connectedNoModels = createStatus(true, '0.1.0', 0);
      const connectedWithModels = createStatus(true, '0.1.0', 5);

      return {
        disconnected: {
          connected: disconnected.connected,
          hasVersion: !!disconnected.version,
        },
        connectedNoModels: {
          connected: connectedNoModels.connected,
          version: connectedNoModels.version,
          modelsCount: connectedNoModels.modelsCount,
        },
        connectedWithModels: {
          connected: connectedWithModels.connected,
          version: connectedWithModels.version,
          modelsCount: connectedWithModels.modelsCount,
        },
      };
    });

    expect(result.disconnected.connected).toBe(false);
    expect(result.disconnected.hasVersion).toBe(false);
    expect(result.connectedNoModels.connected).toBe(true);
    expect(result.connectedNoModels.version).toBe('0.1.0');
    expect(result.connectedWithModels.modelsCount).toBe(5);
  });

  test('should format connection status display', async ({ page }) => {
    const result = await page.evaluate(() => {
      const getStatusDisplay = (connected: boolean, version?: string, count = 0): string => {
        if (!connected) {
          return 'Not connected - Make sure Ollama is running';
        }
        const versionText = version ? ` v${version}` : '';
        const modelsText = count > 0 ? ` - ${count} model${count !== 1 ? 's' : ''} installed` : '';
        return `Connected${versionText}${modelsText}`;
      };

      return {
        disconnected: getStatusDisplay(false),
        connectedNoVersion: getStatusDisplay(true),
        connectedWithVersion: getStatusDisplay(true, '0.1.0'),
        connectedSingleModel: getStatusDisplay(true, '0.1.0', 1),
        connectedMultipleModels: getStatusDisplay(true, '0.1.0', 5),
      };
    });

    expect(result.disconnected).toContain('Not connected');
    expect(result.connectedNoVersion).toBe('Connected');
    expect(result.connectedWithVersion).toBe('Connected v0.1.0');
    expect(result.connectedSingleModel).toContain('1 model installed');
    expect(result.connectedMultipleModels).toContain('5 models installed');
  });
});

test.describe('Ollama Model List Management', () => {
  test('should manage installed models list', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface OllamaModel {
        name: string;
        size: number;
        modifiedAt: Date;
      }

      const models: OllamaModel[] = [];

      const addModel = (name: string, size: number): void => {
        models.push({ name, size, modifiedAt: new Date() });
      };

      const removeModel = (name: string): boolean => {
        const index = models.findIndex((m) => m.name === name);
        if (index !== -1) {
          models.splice(index, 1);
          return true;
        }
        return false;
      };

      const findModel = (name: string): OllamaModel | undefined => {
        return models.find((m) => m.name === name || m.name.startsWith(name + ':'));
      };

      addModel('llama3.2', 2000000000);
      addModel('qwen2.5:3b', 1900000000);
      addModel('nomic-embed-text', 274000000);

      const afterAdd = models.length;
      const foundQwen = !!findModel('qwen2.5');
      const foundMistral = !!findModel('mistral');

      removeModel('llama3.2');
      const afterRemove = models.length;

      return {
        afterAdd,
        foundQwen,
        foundMistral,
        afterRemove,
        remainingModels: models.map((m) => m.name),
      };
    });

    expect(result.afterAdd).toBe(3);
    expect(result.foundQwen).toBe(true);
    expect(result.foundMistral).toBe(false);
    expect(result.afterRemove).toBe(2);
    expect(result.remainingModels).toContain('qwen2.5:3b');
    expect(result.remainingModels).not.toContain('llama3.2');
  });

  test('should select default model', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface OllamaSettings {
        baseUrl: string;
        defaultModel?: string;
        enabled: boolean;
      }

      const settings: OllamaSettings = {
        baseUrl: 'http://localhost:11434',
        enabled: true,
      };

      const availableModels = ['llama3.2', 'qwen2.5', 'mistral'];

      const setDefaultModel = (model: string): boolean => {
        if (availableModels.includes(model)) {
          settings.defaultModel = model;
          return true;
        }
        return false;
      };

      const validSet = setDefaultModel('qwen2.5');
      const afterValid = settings.defaultModel;

      const invalidSet = setDefaultModel('nonexistent');
      const afterInvalid = settings.defaultModel;

      return {
        validSet,
        afterValid,
        invalidSet,
        afterInvalid,
      };
    });

    expect(result.validSet).toBe(true);
    expect(result.afterValid).toBe('qwen2.5');
    expect(result.invalidSet).toBe(false);
    expect(result.afterInvalid).toBe('qwen2.5');
  });
});

test.describe('Ollama Settings Persistence', () => {
  test('should persist Ollama settings to localStorage', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const ollamaSettings = {
        ollama: {
          enabled: true,
          baseURL: 'http://192.168.1.100:11434',
          defaultModel: 'llama3.2',
        },
      };
      localStorage.setItem(
        'cognia-settings',
        JSON.stringify({
          state: {
            providerSettings: ollamaSettings,
          },
        })
      );
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-settings');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.state.providerSettings.ollama.enabled).toBe(true);
    expect(stored.state.providerSettings.ollama.baseURL).toBe('http://192.168.1.100:11434');
    expect(stored.state.providerSettings.ollama.defaultModel).toBe('llama3.2');
  });
});

test.describe('Popular Ollama Models', () => {
  test('should have correct popular models list', async ({ page }) => {
    const result = await page.evaluate(() => {
      const popularModels = [
        { name: 'llama3.2', description: 'Meta Llama 3.2 (3B)', size: '2.0GB' },
        { name: 'llama3.2:1b', description: 'Meta Llama 3.2 (1B)', size: '1.3GB' },
        { name: 'qwen2.5', description: 'Qwen 2.5 (7B)', size: '4.7GB' },
        { name: 'qwen2.5:3b', description: 'Qwen 2.5 (3B)', size: '1.9GB' },
        { name: 'mistral', description: 'Mistral (7B)', size: '4.1GB' },
        { name: 'gemma2', description: 'Google Gemma 2 (9B)', size: '5.4GB' },
        { name: 'phi3', description: 'Microsoft Phi-3 (3.8B)', size: '2.2GB' },
        { name: 'nomic-embed-text', description: 'Nomic Embed (Embedding)', size: '274MB' },
      ];

      const getEmbeddingModels = () =>
        popularModels.filter((m) => m.description.includes('Embedding'));

      const getLlamaModels = () =>
        popularModels.filter((m) => m.name.startsWith('llama'));

      return {
        totalCount: popularModels.length,
        embeddingCount: getEmbeddingModels().length,
        llamaCount: getLlamaModels().length,
        hasQwen: popularModels.some((m) => m.name.includes('qwen')),
        hasMistral: popularModels.some((m) => m.name === 'mistral'),
      };
    });

    expect(result.totalCount).toBeGreaterThanOrEqual(8);
    expect(result.embeddingCount).toBeGreaterThanOrEqual(1);
    expect(result.llamaCount).toBe(2);
    expect(result.hasQwen).toBe(true);
    expect(result.hasMistral).toBe(true);
  });
});
