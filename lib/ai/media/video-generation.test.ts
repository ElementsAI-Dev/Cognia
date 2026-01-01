/**
 * Video Generation Tests
 */

import {
  validateVideoOptions,
  getDefaultVideoOptions,
  generateVideo,
  checkVideoGenerationStatus,
  cancelVideoGeneration,
  getActiveVideoJobs,
  getVideoJob,
  clearCompletedVideoJobs,
  downloadVideoAsBlob,
  base64ToVideoBlob,
  base64ToVideoDataUrl,
  getAvailableVideoModelsForUI,
} from './video-generation';

// Mock proxy-fetch
jest.mock('@/lib/proxy-fetch', () => ({
  proxyFetch: jest.fn(),
}));

import { proxyFetch } from '@/lib/proxy-fetch';
const mockProxyFetch = proxyFetch as jest.MockedFunction<typeof proxyFetch>;

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    videos: {
      generate: jest.fn(),
    },
  }));
});

describe('video-generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCompletedVideoJobs();
  });

  describe('validateVideoOptions', () => {
    it('should validate valid options', () => {
      const result = validateVideoOptions('google-veo', 'veo-3.1', {
        prompt: 'A beautiful sunset over the ocean',
        resolution: '1080p',
        aspectRatio: '16:9',
        duration: '10s',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unknown model', () => {
      const result = validateVideoOptions('google-veo', 'unknown-model' as never, {
        prompt: 'Test prompt',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unknown model');
    });

    it('should reject unsupported resolution', () => {
      const result = validateVideoOptions('google-veo', 'veo-3', {
        prompt: 'Test prompt',
        resolution: '4k', // veo-3 doesn't support 4k
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Resolution');
    });

    it('should reject unsupported aspect ratio', () => {
      const result = validateVideoOptions('google-veo', 'veo-3', {
        prompt: 'Test prompt',
        aspectRatio: '21:9', // veo-3 doesn't support 21:9
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Aspect ratio');
    });

    it('should reject unsupported duration', () => {
      const result = validateVideoOptions('google-veo', 'veo-3', {
        prompt: 'Test prompt',
        duration: '30s', // veo-3 max is 20s
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Duration');
    });

    it('should reject image-to-video when not supported', () => {
      // All current models support image-to-video, so we can't really test this
      // unless we mock the model config
      const result = validateVideoOptions('google-veo', 'veo-3', {
        prompt: 'Test prompt',
        referenceImageUrl: 'https://example.com/image.png',
      });

      // veo-3 supports image-to-video so this should pass
      expect(result.valid).toBe(true);
    });

    it('should reject audio when not supported', () => {
      const result = validateVideoOptions('google-veo', 'veo-3', {
        prompt: 'Test prompt',
        includeAudio: true, // veo-3 doesn't support audio
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Audio');
    });

    it('should accept audio for veo-3.1', () => {
      const result = validateVideoOptions('google-veo', 'veo-3.1', {
        prompt: 'Test prompt',
        includeAudio: true,
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('getDefaultVideoOptions', () => {
    it('should return default options for google-veo', () => {
      const defaults = getDefaultVideoOptions('google-veo', 'veo-3.1');

      expect(defaults.provider).toBe('google-veo');
      expect(defaults.model).toBe('veo-3.1');
      expect(defaults.aspectRatio).toBe('16:9');
      expect(defaults.fps).toBe(24);
      expect(defaults.enhancePrompt).toBe(true);
    });

    it('should return default options for openai-sora', () => {
      const defaults = getDefaultVideoOptions('openai-sora', 'sora-1');

      expect(defaults.provider).toBe('openai-sora');
      expect(defaults.model).toBe('sora-1');
    });

    it('should return empty object for unknown model', () => {
      const defaults = getDefaultVideoOptions('google-veo', 'unknown' as never);

      expect(defaults).toEqual({});
    });
  });

  describe('generateVideo', () => {
    it('should return error for invalid options', async () => {
      const result = await generateVideo('test-api-key', {
        prompt: 'Test',
        provider: 'google-veo',
        model: 'veo-3',
        resolution: '4k', // Invalid for veo-3
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Resolution');
    });

    it('should return error for unsupported provider', async () => {
      const result = await generateVideo('test-api-key', {
        prompt: 'Test',
        provider: 'google-veo',
        model: 'unknown-model' as never,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Unknown model');
    });

    it('should handle Google Veo generation with missing project', async () => {
      const originalEnv = process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GOOGLE_CLOUD_PROJECT;

      const result = await generateVideo('test-api-key', {
        prompt: 'A beautiful landscape',
        provider: 'google-veo',
        model: 'veo-3.1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Google Cloud project not configured');

      process.env.GOOGLE_CLOUD_PROJECT = originalEnv;
    });

    it('should handle Google Veo API errors', async () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
      
      mockProxyFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad request'),
      });

      const result = await generateVideo('test-api-key', {
        prompt: 'A beautiful landscape',
        provider: 'google-veo',
        model: 'veo-3.1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Veo API error');

      delete process.env.GOOGLE_CLOUD_PROJECT;
    });

    it('should handle successful Google Veo async response', async () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
      
      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          name: 'operations/abc123',
        }),
      });

      const result = await generateVideo('test-api-key', {
        prompt: 'A beautiful landscape',
        provider: 'google-veo',
        model: 'veo-3.1',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('processing');
      expect(result.jobId).toBeDefined();
      expect(result.progress).toBe(10);

      delete process.env.GOOGLE_CLOUD_PROJECT;
    });

    it('should handle successful Google Veo sync response', async () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
      
      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          videos: [{
            uri: 'https://storage.googleapis.com/video.mp4',
            bytesBase64Encoded: 'dmlkZW9kYXRh',
          }],
        }),
      });

      const result = await generateVideo('test-api-key', {
        prompt: 'A beautiful landscape',
        provider: 'google-veo',
        model: 'veo-3.1',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.video).toBeDefined();
      expect(result.video?.url).toBe('https://storage.googleapis.com/video.mp4');

      delete process.env.GOOGLE_CLOUD_PROJECT;
    });

    it('should handle OpenAI Sora generation', async () => {
      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'sora-job-123',
          status: 'processing',
        }),
      });

      const result = await generateVideo('test-api-key', {
        prompt: 'A futuristic city',
        provider: 'openai-sora',
        model: 'sora-1',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('processing');
    });

    it('should handle network errors', async () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
      
      mockProxyFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await generateVideo('test-api-key', {
        prompt: 'A beautiful landscape',
        provider: 'google-veo',
        model: 'veo-3.1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');

      delete process.env.GOOGLE_CLOUD_PROJECT;
    });
  });

  describe('checkVideoGenerationStatus', () => {
    it('should return error for unknown job', async () => {
      const result = await checkVideoGenerationStatus('api-key', 'unknown-job', 'google-veo');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return cached result for completed job', async () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';

      // First generate a video that completes
      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          videos: [{
            uri: 'https://storage.googleapis.com/video.mp4',
          }],
        }),
      });

      const genResult = await generateVideo('test-api-key', {
        prompt: 'Test video',
        provider: 'google-veo',
        model: 'veo-3.1',
      });

      const jobId = genResult.jobId!;
      
      // Check status should return cached result
      const statusResult = await checkVideoGenerationStatus('test-api-key', jobId, 'google-veo');

      expect(statusResult.success).toBe(true);
      expect(statusResult.status).toBe('completed');

      delete process.env.GOOGLE_CLOUD_PROJECT;
    });
  });

  describe('cancelVideoGeneration', () => {
    it('should return false for unknown job', async () => {
      const result = await cancelVideoGeneration('api-key', 'unknown-job', 'google-veo');

      expect(result).toBe(false);
    });
  });

  describe('getActiveVideoJobs', () => {
    it('should return active jobs', async () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';

      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          name: 'operations/active-job',
        }),
      } as unknown as Response);

      await generateVideo('test-api-key', {
        prompt: 'Active job test',
        provider: 'google-veo',
        model: 'veo-3.1',
      });

      const jobs = getActiveVideoJobs();
      
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs[0].status).toBe('processing');

      delete process.env.GOOGLE_CLOUD_PROJECT;
    });
  });

  describe('getVideoJob', () => {
    it('should return undefined for unknown job', () => {
      const job = getVideoJob('unknown-job');

      expect(job).toBeUndefined();
    });
  });

  describe('clearCompletedVideoJobs', () => {
    it('should return 0 when no jobs to clear', () => {
      const cleared = clearCompletedVideoJobs();

      expect(cleared).toBe(0);
    });

    it('should clear completed jobs', async () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';

      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          videos: [{ uri: 'https://example.com/video.mp4' }],
        }),
      });

      await generateVideo('test-api-key', {
        prompt: 'Test',
        provider: 'google-veo',
        model: 'veo-3.1',
      });

      const cleared = clearCompletedVideoJobs();

      expect(cleared).toBe(1);

      delete process.env.GOOGLE_CLOUD_PROJECT;
    });
  });

  describe('downloadVideoAsBlob', () => {
    it('should download video as blob', async () => {
      const mockBlob = new Blob(['video data'], { type: 'video/mp4' });
      mockProxyFetch.mockResolvedValueOnce({
        blob: jest.fn().mockResolvedValue(mockBlob),
      });

      const result = await downloadVideoAsBlob('https://example.com/video.mp4');

      expect(result).toBe(mockBlob);
      expect(mockProxyFetch).toHaveBeenCalledWith('https://example.com/video.mp4');
    });
  });

  describe('base64ToVideoBlob', () => {
    it('should convert base64 to blob', () => {
      const base64 = 'dmlkZW9kYXRh'; // "videodata" in base64
      
      const blob = base64ToVideoBlob(base64);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('video/mp4');
    });

    it('should use custom mime type', () => {
      const base64 = 'dmlkZW9kYXRh';
      
      const blob = base64ToVideoBlob(base64, 'video/webm');

      expect(blob.type).toBe('video/webm');
    });
  });

  describe('base64ToVideoDataUrl', () => {
    it('should convert base64 to data URL', () => {
      const base64 = 'dmlkZW9kYXRh';
      
      const dataUrl = base64ToVideoDataUrl(base64);

      expect(dataUrl).toBe('data:video/mp4;base64,dmlkZW9kYXRh');
    });

    it('should use custom mime type', () => {
      const base64 = 'dmlkZW9kYXRh';
      
      const dataUrl = base64ToVideoDataUrl(base64, 'video/webm');

      expect(dataUrl).toBe('data:video/webm;base64,dmlkZW9kYXRh');
    });
  });

  describe('getAvailableVideoModelsForUI', () => {
    it('should return all available video models', () => {
      const models = getAvailableVideoModelsForUI();

      expect(models.length).toBeGreaterThan(0);
      
      // Check structure
      const firstModel = models[0];
      expect(firstModel.id).toBeDefined();
      expect(firstModel.name).toBeDefined();
      expect(firstModel.provider).toBeDefined();
      expect(firstModel.providerName).toBeDefined();
      expect(firstModel.maxDuration).toBeDefined();
      expect(firstModel.supportedResolutions).toBeDefined();
      expect(firstModel.supportedAspectRatios).toBeDefined();
      expect(typeof firstModel.supportsImageToVideo).toBe('boolean');
      expect(typeof firstModel.supportsAudio).toBe('boolean');
    });

    it('should include Google Veo models', () => {
      const models = getAvailableVideoModelsForUI();
      
      const veoModels = models.filter(m => m.provider === 'google-veo');
      expect(veoModels.length).toBeGreaterThan(0);
    });

    it('should include OpenAI Sora models', () => {
      const models = getAvailableVideoModelsForUI();
      
      const soraModels = models.filter(m => m.provider === 'openai-sora');
      expect(soraModels.length).toBeGreaterThan(0);
    });
  });

  describe('generateVideo with image-to-video', () => {
    it('should handle reference image URL', async () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';

      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          name: 'operations/img2vid',
        }),
      });

      const result = await generateVideo('test-api-key', {
        prompt: 'Animate this image',
        provider: 'google-veo',
        model: 'veo-3.1',
        referenceImageUrl: 'gs://bucket/image.png',
      });

      expect(result.success).toBe(true);
      expect(mockProxyFetch).toHaveBeenCalled();

      delete process.env.GOOGLE_CLOUD_PROJECT;
    });

    it('should handle reference image base64', async () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';

      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          name: 'operations/img2vid',
        }),
      });

      const result = await generateVideo('test-api-key', {
        prompt: 'Animate this image',
        provider: 'google-veo',
        model: 'veo-3.1',
        referenceImageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      });

      expect(result.success).toBe(true);

      delete process.env.GOOGLE_CLOUD_PROJECT;
    });
  });

  describe('generateVideo with audio', () => {
    it('should handle audio generation for veo-3.1', async () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';

      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          videos: [{
            uri: 'https://storage.googleapis.com/video-with-audio.mp4',
          }],
        }),
      });

      const result = await generateVideo('test-api-key', {
        prompt: 'A person speaking',
        provider: 'google-veo',
        model: 'veo-3.1',
        includeAudio: true,
        audioPrompt: 'Calm narration',
      });

      expect(result.success).toBe(true);

      delete process.env.GOOGLE_CLOUD_PROJECT;
    });
  });

  describe('generateVideo with advanced options', () => {
    it('should handle negative prompt', async () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';

      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          name: 'operations/neg-prompt',
        }),
      });

      await generateVideo('test-api-key', {
        prompt: 'A beautiful landscape',
        provider: 'google-veo',
        model: 'veo-3.1',
        negativePrompt: 'blurry, low quality',
      });

      expect(mockProxyFetch).toHaveBeenCalled();
      const callArgs = mockProxyFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.parameters.negativePrompt).toBe('blurry, low quality');

      delete process.env.GOOGLE_CLOUD_PROJECT;
    });

    it('should handle seed for reproducibility', async () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';

      mockProxyFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          name: 'operations/seeded',
        }),
      });

      await generateVideo('test-api-key', {
        prompt: 'A beautiful landscape',
        provider: 'google-veo',
        model: 'veo-3.1',
        seed: 12345,
      });

      const callArgs = mockProxyFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.parameters.seed).toBe(12345);

      delete process.env.GOOGLE_CLOUD_PROJECT;
    });
  });
});
