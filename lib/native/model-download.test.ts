/**
 * Model Download Tests
 *
 * Tests for model download API functions.
 */

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  listAvailableModels,
  listInstalledModels,
  getDownloadConfig,
  setDownloadConfig,
  downloadModel,
  deleteModel,
  getModelSources,
  detectProxy,
  testProxy,
  onDownloadProgress,
  getSourceDisplayName,
  getCategoryDisplayName,
  formatFileSize,
  formatSpeed,
  formatEta,
  getDefaultDownloadConfig,
  type ModelDefinition,
  type DownloadConfig,
  type DownloadProgress,
  type DownloadResult,
  type ModelSource,
  type ModelCategory,
} from './model-download';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockListen = listen as jest.MockedFunction<typeof listen>;

describe('Model Download - API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listAvailableModels', () => {
    it('should call invoke with correct command', async () => {
      const mockModels: ModelDefinition[] = [
        {
          id: 'ocr-model',
          name: 'OCR Model',
          category: 'ocr',
          description: 'Text recognition model',
          size: 100000000,
          sources: { hugging_face: 'hf/model', model_scope: 'ms/model' } as Record<ModelSource, string>,
          default_source: 'hugging_face',
          filename: 'model.onnx',
          required: true,
        },
      ];
      mockInvoke.mockResolvedValue(mockModels);

      const result = await listAvailableModels();
      expect(mockInvoke).toHaveBeenCalledWith('model_list_available');
      expect(result).toEqual(mockModels);
    });
  });

  describe('listInstalledModels', () => {
    it('should call invoke with correct command', async () => {
      const mockIds = ['model-1', 'model-2'];
      mockInvoke.mockResolvedValue(mockIds);

      const result = await listInstalledModels();
      expect(mockInvoke).toHaveBeenCalledWith('model_list_installed');
      expect(result).toEqual(mockIds);
    });
  });

  describe('getDownloadConfig', () => {
    it('should call invoke with correct command', async () => {
      const mockConfig: DownloadConfig = {
        preferred_sources: ['hugging_face', 'model_scope'],
        use_system_proxy: true,
        timeout_secs: 300,
        max_retries: 3,
        custom_mirrors: {},
      };
      mockInvoke.mockResolvedValue(mockConfig);

      const result = await getDownloadConfig();
      expect(mockInvoke).toHaveBeenCalledWith('model_get_download_config');
      expect(result).toEqual(mockConfig);
    });
  });

  describe('setDownloadConfig', () => {
    it('should call invoke with config', async () => {
      const config: DownloadConfig = {
        preferred_sources: ['model_scope'],
        use_system_proxy: false,
        timeout_secs: 600,
        max_retries: 5,
        custom_mirrors: {},
      };
      mockInvoke.mockResolvedValue(undefined);

      await setDownloadConfig(config);
      expect(mockInvoke).toHaveBeenCalledWith('model_set_download_config', { config });
    });
  });

  describe('downloadModel', () => {
    it('should call invoke with model id', async () => {
      const mockResult: DownloadResult = {
        model_id: 'test-model',
        success: true,
        path: '/path/to/model',
        source_used: 'hugging_face',
        download_time_secs: 60,
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await downloadModel('test-model');
      expect(mockInvoke).toHaveBeenCalledWith('model_download', {
        modelId: 'test-model',
        source: undefined,
        config: undefined,
      });
      expect(result).toEqual(mockResult);
    });

    it('should call invoke with source and config', async () => {
      const config: DownloadConfig = getDefaultDownloadConfig();
      mockInvoke.mockResolvedValue({ success: true } as DownloadResult);

      await downloadModel('test-model', 'model_scope', config);
      expect(mockInvoke).toHaveBeenCalledWith('model_download', {
        modelId: 'test-model',
        source: 'model_scope',
        config,
      });
    });
  });

  describe('deleteModel', () => {
    it('should call invoke with model id', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await deleteModel('test-model');
      expect(mockInvoke).toHaveBeenCalledWith('model_delete', { modelId: 'test-model' });
      expect(result).toBe(true);
    });
  });

  describe('getModelSources', () => {
    it('should call invoke with correct command', async () => {
      const mockSources: [ModelSource, string][] = [
        ['hugging_face', 'https://huggingface.co'],
        ['model_scope', 'https://modelscope.cn'],
      ];
      mockInvoke.mockResolvedValue(mockSources);

      const result = await getModelSources();
      expect(mockInvoke).toHaveBeenCalledWith('model_get_sources');
      expect(result).toEqual(mockSources);
    });
  });

  describe('detectProxy', () => {
    it('should call invoke with correct command', async () => {
      mockInvoke.mockResolvedValue('http://127.0.0.1:7890');

      const result = await detectProxy();
      expect(mockInvoke).toHaveBeenCalledWith('model_detect_proxy');
      expect(result).toBe('http://127.0.0.1:7890');
    });

    it('should return null when no proxy detected', async () => {
      mockInvoke.mockResolvedValue(null);

      const result = await detectProxy();
      expect(result).toBeNull();
    });
  });

  describe('testProxy', () => {
    it('should call invoke with proxy URL', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await testProxy('http://127.0.0.1:7890');
      expect(mockInvoke).toHaveBeenCalledWith('model_test_proxy', { proxyUrl: 'http://127.0.0.1:7890' });
      expect(result).toBe(true);
    });
  });

  describe('onDownloadProgress', () => {
    it('should set up event listener', async () => {
      const mockUnlisten = jest.fn();
      mockListen.mockResolvedValue(mockUnlisten);
      const callback = jest.fn();

      await onDownloadProgress(callback);
      expect(mockListen).toHaveBeenCalledWith('model-download-progress', expect.any(Function));
    });

    it('should call callback with progress', async () => {
      let capturedHandler: ((event: { payload: DownloadProgress }) => void) | null = null;
      mockListen.mockImplementation((_, handler) => {
        capturedHandler = handler as (event: { payload: DownloadProgress }) => void;
        return Promise.resolve(jest.fn());
      });
      const callback = jest.fn();

      await onDownloadProgress(callback);

      const mockProgress: DownloadProgress = {
        model_id: 'test-model',
        status: 'downloading',
        source: 'hugging_face',
        total_bytes: 1000000,
        downloaded_bytes: 500000,
        percent: 50,
        speed_bps: 100000,
        eta_secs: 5,
      };

      capturedHandler!({ payload: mockProgress });
      expect(callback).toHaveBeenCalledWith(mockProgress);
    });
  });
});

describe('Model Download - Helper Functions', () => {
  describe('getSourceDisplayName', () => {
    it('should return correct display names', () => {
      expect(getSourceDisplayName('hugging_face')).toBe('HuggingFace');
      expect(getSourceDisplayName('model_scope')).toBe('ModelScope (CN)');
      expect(getSourceDisplayName('git_hub')).toBe('GitHub');
      expect(getSourceDisplayName('ollama')).toBe('Ollama');
      expect(getSourceDisplayName('custom')).toBe('Custom URL');
    });

    it('should return source name for unknown sources', () => {
      expect(getSourceDisplayName('unknown' as ModelSource)).toBe('unknown');
    });
  });

  describe('getCategoryDisplayName', () => {
    it('should return correct display names', () => {
      expect(getCategoryDisplayName('ocr')).toBe('OCR');
      expect(getCategoryDisplayName('llm')).toBe('Language Model');
      expect(getCategoryDisplayName('embedding')).toBe('Embedding');
      expect(getCategoryDisplayName('vision')).toBe('Vision');
      expect(getCategoryDisplayName('speech')).toBe('Speech');
      expect(getCategoryDisplayName('other')).toBe('Other');
    });

    it('should return category name for unknown categories', () => {
      expect(getCategoryDisplayName('unknown' as ModelCategory)).toBe('unknown');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(1073741824)).toBe('1.00 GB');
      expect(formatFileSize(1610612736)).toBe('1.50 GB');
    });
  });

  describe('formatSpeed', () => {
    it('should format speed correctly', () => {
      expect(formatSpeed(1024)).toBe('1.0 KB/s');
      expect(formatSpeed(1048576)).toBe('1.0 MB/s');
      expect(formatSpeed(10485760)).toBe('10.0 MB/s');
    });
  });

  describe('formatEta', () => {
    it('should format seconds correctly', () => {
      expect(formatEta(30)).toBe('30s');
      expect(formatEta(60)).toBe('1m 0s');
      expect(formatEta(90)).toBe('1m 30s');
      expect(formatEta(3600)).toBe('1h 0m');
      expect(formatEta(3720)).toBe('1h 2m');
      expect(formatEta(7380)).toBe('2h 3m');
    });
  });

  describe('getDefaultDownloadConfig', () => {
    it('should return correct default config', () => {
      const config = getDefaultDownloadConfig();

      expect(config.preferred_sources).toContain('hugging_face');
      expect(config.preferred_sources).toContain('model_scope');
      expect(config.use_system_proxy).toBe(true);
      expect(config.timeout_secs).toBe(300);
      expect(config.max_retries).toBe(3);
      expect(config.custom_mirrors).toEqual({});
    });
  });
});

describe('Model Download Types', () => {
  it('should have correct DownloadStatus values', () => {
    const statuses = ['pending', 'connecting', 'downloading', 'verifying', 'completed', 'failed', 'cancelled'];
    statuses.forEach((status) => {
      const progress: DownloadProgress = {
        model_id: 'test',
        status: status as DownloadProgress['status'],
        source: 'hugging_face',
        total_bytes: 1000,
        downloaded_bytes: 500,
        percent: 50,
        speed_bps: 100,
      };
      expect(progress.status).toBe(status);
    });
  });

  it('should have correct ModelSource values', () => {
    const sources: ModelSource[] = ['hugging_face', 'model_scope', 'git_hub', 'ollama', 'custom'];
    sources.forEach((source) => {
      expect(getSourceDisplayName(source)).toBeDefined();
    });
  });

  it('should have correct ModelCategory values', () => {
    const categories: ModelCategory[] = ['ocr', 'llm', 'embedding', 'vision', 'speech', 'other'];
    categories.forEach((category) => {
      expect(getCategoryDisplayName(category)).toBeDefined();
    });
  });
});
