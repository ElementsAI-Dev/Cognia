/**
 * Tests for Video Generation Tool
 */

import {
  videoGenerateInputSchema,
  videoStatusInputSchema,
  executeVideoGenerate,
  executeVideoStatus,
  executeGetVideoModels,
  videoGenerateTool,
  videoStatusTool,
  videoTools,
  registerVideoTools,
  type VideoGenerateInput,
  type VideoStatusInput,
} from './video-tool';

// Mock the video generation module
jest.mock('../media/video-generation', () => ({
  generateVideo: jest.fn(),
  checkVideoGenerationStatus: jest.fn(),
  getAvailableVideoModelsForUI: jest.fn(),
}));

import {
  generateVideo,
  checkVideoGenerationStatus,
  getAvailableVideoModelsForUI,
} from '../media/video-generation';

const mockGenerateVideo = generateVideo as jest.MockedFunction<typeof generateVideo>;
const mockCheckVideoStatus = checkVideoGenerationStatus as jest.MockedFunction<typeof checkVideoGenerationStatus>;
const mockGetAvailableVideoModels = getAvailableVideoModelsForUI as jest.MockedFunction<typeof getAvailableVideoModelsForUI>;

describe('Video Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('videoGenerateInputSchema', () => {
    it('validates valid input', () => {
      const input = {
        prompt: 'A sunset timelapse over the ocean',
        provider: 'google-veo',
        model: 'veo-3',
        resolution: '1080p',
        aspectRatio: '16:9',
        duration: '10s',
        style: 'cinematic',
      };
      const result = videoGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('requires prompt', () => {
      const input = { provider: 'google-veo' };
      const result = videoGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates prompt min length', () => {
      const input = { prompt: '' };
      const result = videoGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates provider enum', () => {
      const input = { prompt: 'test', provider: 'invalid' };
      const result = videoGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates model enum', () => {
      const input = { prompt: 'test', model: 'invalid-model' };
      const result = videoGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates resolution enum', () => {
      const input = { prompt: 'test', resolution: '8k' };
      const result = videoGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates aspectRatio enum', () => {
      const input = { prompt: 'test', aspectRatio: '2:1' };
      const result = videoGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates duration enum', () => {
      const input = { prompt: 'test', duration: '120s' };
      const result = videoGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates style enum', () => {
      const input = { prompt: 'test', style: 'invalid-style' };
      const result = videoGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates fps range', () => {
      const input = { prompt: 'test', fps: 120 };
      const result = videoGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('allows optional fields', () => {
      const input = { prompt: 'A simple test prompt' };
      const result = videoGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates referenceImageUrl format', () => {
      const input = { prompt: 'test', referenceImageUrl: 'not-a-url' };
      const result = videoGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('accepts valid referenceImageUrl', () => {
      const input = { prompt: 'test', referenceImageUrl: 'https://example.com/image.png' };
      const result = videoGenerateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('videoStatusInputSchema', () => {
    it('validates valid input', () => {
      const input = {
        jobId: 'job-123',
        provider: 'google-veo',
      };
      const result = videoStatusInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('requires jobId', () => {
      const input = { provider: 'google-veo' };
      const result = videoStatusInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('requires provider', () => {
      const input = { jobId: 'job-123' };
      const result = videoStatusInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates provider enum', () => {
      const input = { jobId: 'job-123', provider: 'invalid' };
      const result = videoStatusInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('executeVideoGenerate', () => {
    it('generates video successfully', async () => {
      const mockResult = {
        success: true,
        jobId: 'job-123',
        status: 'processing' as const,
        progress: 0,
        provider: 'google-veo' as const,
        model: 'veo-3' as const,
      };
      mockGenerateVideo.mockResolvedValue(mockResult as never);

      const input: VideoGenerateInput = {
        prompt: 'A beautiful sunset timelapse',
        provider: 'google-veo',
        model: 'veo-3',
      };

      const result = await executeVideoGenerate(input, 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.data?.jobId).toBe('job-123');
      expect(result.data?.status).toBe('processing');
      expect(result.data?.provider).toBe('google-veo');
      expect(result.data?.model).toBe('veo-3');
    });

    it('handles completed video generation', async () => {
      const mockResult = {
        success: true,
        jobId: 'job-123',
        status: 'completed' as const,
        progress: 100,
        provider: 'google-veo' as const,
        model: 'veo-3' as const,
        video: {
          url: 'https://example.com/video.mp4',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          durationSeconds: 10,
          width: 1920,
          height: 1080,
          revisedPrompt: 'Enhanced prompt',
        },
        usage: {
          estimatedCost: 0.50,
        },
      };
      mockGenerateVideo.mockResolvedValue(mockResult as never);

      const input: VideoGenerateInput = {
        prompt: 'Test video',
      };

      const result = await executeVideoGenerate(input, 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.data?.videoUrl).toBe('https://example.com/video.mp4');
      expect(result.data?.thumbnailUrl).toBe('https://example.com/thumb.jpg');
      expect(result.data?.durationSeconds).toBe(10);
      expect(result.data?.width).toBe(1920);
      expect(result.data?.height).toBe(1080);
      expect(result.data?.estimatedCost).toBe(0.50);
    });

    it('handles generation failure', async () => {
      const mockResult = {
        success: false,
        jobId: 'job-123',
        status: 'failed' as const,
        progress: 0,
        provider: 'google-veo' as const,
        model: 'veo-3' as const,
        error: 'Content policy violation',
      };
      mockGenerateVideo.mockResolvedValue(mockResult as never);

      const input: VideoGenerateInput = { prompt: 'Test' };
      const result = await executeVideoGenerate(input, 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Content policy violation');
    });

    it('handles generation error', async () => {
      mockGenerateVideo.mockRejectedValue(new Error('API rate limit exceeded'));

      const input: VideoGenerateInput = { prompt: 'Test' };
      const result = await executeVideoGenerate(input, 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
    });

    it('handles non-Error exceptions', async () => {
      mockGenerateVideo.mockRejectedValue('Unknown error');

      const input: VideoGenerateInput = { prompt: 'Test' };
      const result = await executeVideoGenerate(input, 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate video');
    });
  });

  describe('executeVideoStatus', () => {
    it('checks status successfully', async () => {
      const mockResult = {
        success: true,
        jobId: 'job-123',
        status: 'processing' as const,
        progress: 50,
        provider: 'google-veo' as const,
        model: 'veo-3' as const,
      };
      mockCheckVideoStatus.mockResolvedValue(mockResult as never);

      const input: VideoStatusInput = {
        jobId: 'job-123',
        provider: 'google-veo',
      };

      const result = await executeVideoStatus(input, 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.data?.jobId).toBe('job-123');
      expect(result.data?.status).toBe('processing');
      expect(result.data?.progress).toBe(50);
    });

    it('handles completed status with video', async () => {
      const mockResult = {
        success: true,
        jobId: 'job-123',
        status: 'completed' as const,
        progress: 100,
        provider: 'google-veo' as const,
        model: 'veo-3' as const,
        video: {
          url: 'https://example.com/video.mp4',
          durationSeconds: 10,
          width: 1920,
          height: 1080,
        },
      };
      mockCheckVideoStatus.mockResolvedValue(mockResult as never);

      const input: VideoStatusInput = {
        jobId: 'job-123',
        provider: 'google-veo',
      };

      const result = await executeVideoStatus(input, 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.data?.videoUrl).toBe('https://example.com/video.mp4');
      expect(result.data?.progress).toBe(100);
    });

    it('handles status check error', async () => {
      mockCheckVideoStatus.mockRejectedValue(new Error('Job not found'));

      const input: VideoStatusInput = {
        jobId: 'invalid-job',
        provider: 'google-veo',
      };

      const result = await executeVideoStatus(input, 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Job not found');
    });

    it('handles non-Error exceptions', async () => {
      mockCheckVideoStatus.mockRejectedValue(null);

      const input: VideoStatusInput = {
        jobId: 'job-123',
        provider: 'google-veo',
      };

      const result = await executeVideoStatus(input, 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check video status');
    });
  });

  describe('executeGetVideoModels', () => {
    it('returns available models', () => {
      const mockModels = [
        {
          id: 'veo-3',
          name: 'Veo 3',
          provider: 'google-veo',
          providerName: 'Google',
          maxDuration: 60,
          supportedResolutions: ['1080p', '4k'],
          supportedAspectRatios: ['16:9', '9:16'],
          supportsImageToVideo: true,
          supportsAudio: false,
        },
        {
          id: 'sora-1',
          name: 'Sora',
          provider: 'openai-sora',
          providerName: 'OpenAI',
          maxDuration: 60,
          supportedResolutions: ['1080p'],
          supportedAspectRatios: ['16:9'],
          supportsImageToVideo: true,
          supportsAudio: false,
        },
      ];
      mockGetAvailableVideoModels.mockReturnValue(mockModels as never);

      const result = executeGetVideoModels();

      expect(result.success).toBe(true);
      expect((result.data as { models: unknown[] })?.models).toHaveLength(2);
    });

    it('handles error', () => {
      mockGetAvailableVideoModels.mockImplementation(() => {
        throw new Error('Failed to fetch models');
      });

      const result = executeGetVideoModels();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch models');
    });

    it('handles non-Error exceptions', () => {
      mockGetAvailableVideoModels.mockImplementation(() => {
        throw 'Unknown';
      });

      const result = executeGetVideoModels();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get video models');
    });
  });

  describe('Tool Definitions', () => {
    describe('videoGenerateTool', () => {
      it('has correct properties', () => {
        expect(videoGenerateTool.name).toBe('video_generate');
        expect(videoGenerateTool.description).toContain('Generate a video');
        expect(videoGenerateTool.requiresApproval).toBe(false);
        expect(videoGenerateTool.category).toBe('custom');
        expect(videoGenerateTool.parameters).toBe(videoGenerateInputSchema);
      });

      it('creates executable function', () => {
        const fn = videoGenerateTool.create({ apiKey: 'test-key' });
        expect(typeof fn).toBe('function');
      });
    });

    describe('videoStatusTool', () => {
      it('has correct properties', () => {
        expect(videoStatusTool.name).toBe('video_status');
        expect(videoStatusTool.description).toContain('Check the status');
        expect(videoStatusTool.requiresApproval).toBe(false);
        expect(videoStatusTool.category).toBe('custom');
        expect(videoStatusTool.parameters).toBe(videoStatusInputSchema);
      });

      it('creates executable function', () => {
        const fn = videoStatusTool.create({ apiKey: 'test-key' });
        expect(typeof fn).toBe('function');
      });
    });
  });

  describe('videoTools collection', () => {
    it('contains all video tools', () => {
      expect(videoTools.video_generate).toBe(videoGenerateTool);
      expect(videoTools.video_status).toBe(videoStatusTool);
    });
  });

  describe('registerVideoTools', () => {
    it('registers all tools to registry', () => {
      const mockRegistry = {
        register: jest.fn(),
      };

      registerVideoTools(mockRegistry);

      expect(mockRegistry.register).toHaveBeenCalledTimes(2);
      expect(mockRegistry.register).toHaveBeenCalledWith(videoGenerateTool);
      expect(mockRegistry.register).toHaveBeenCalledWith(videoStatusTool);
    });
  });
});
