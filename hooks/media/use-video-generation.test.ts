/**
 * Tests for useVideoGeneration hook
 */

import { renderHook, act } from '@testing-library/react';
import { useVideoGeneration } from './use-video-generation';
import * as videoGeneration from '@/lib/ai/media/video-generation';
import type { VideoGenerationResult, GeneratedVideo } from '@/types/media/video';

// Mock the video generation module
jest.mock('@/lib/ai/media/video-generation', () => ({
  generateVideo: jest.fn(),
  checkVideoGenerationStatus: jest.fn(),
  cancelVideoGeneration: jest.fn(),
  getAvailableVideoModelsForUI: jest.fn(() => [
    { id: 'veo-3', name: 'Veo 3', provider: 'google-veo' },
    { id: 'veo-3.1', name: 'Veo 3.1', provider: 'google-veo' },
    { id: 'sora-1', name: 'Sora 1', provider: 'openai-sora' },
  ]),
  downloadVideoAsBlob: jest.fn(),
  saveVideoToFile: jest.fn(),
}));

// Mock the settings store
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      providerSettings: {
        google: { apiKey: 'test-google-api-key' },
        openai: { apiKey: 'test-openai-api-key' },
      },
    };
    return selector(state);
  }),
}));

describe('useVideoGeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useVideoGeneration());

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.jobs).toEqual([]);
      expect(result.current.completedVideos).toEqual([]);
    });

    it('should provide available models', () => {
      const { result } = renderHook(() => useVideoGeneration());

      expect(result.current.availableModels).toHaveLength(3);
      expect(result.current.availableModels[0].id).toBe('veo-3');
    });
  });

  describe('generate', () => {
    it('should generate video successfully', async () => {
      const mockResult: VideoGenerationResult = {
        success: true,
        jobId: 'job-123',
        status: 'processing',
        provider: 'google-veo',
        model: 'veo-3.1',
        prompt: 'Test prompt',
        progress: 0,
      };

      (videoGeneration.generateVideo as jest.Mock).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useVideoGeneration());

      let generateResult: VideoGenerationResult | null = null;
      await act(async () => {
        generateResult = await result.current.generate('Test prompt');
      });

      expect(generateResult).toEqual(mockResult);
      expect(result.current.jobs).toHaveLength(1);
      expect(result.current.jobs[0].prompt).toBe('Test prompt');
      expect(result.current.jobs[0].status).toBe('processing');
    });

    it('should handle generation error', async () => {
      const mockResult: VideoGenerationResult = {
        success: false,
        status: 'failed',
        provider: 'google-veo',
        model: 'veo-3.1',
        prompt: 'Test prompt',
        error: 'API error',
      };

      (videoGeneration.generateVideo as jest.Mock).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useVideoGeneration());

      await act(async () => {
        await result.current.generate('Test prompt');
      });

      expect(result.current.error).toBe('API error');
    });

    it('should use custom options', async () => {
      const mockResult: VideoGenerationResult = {
        success: true,
        jobId: 'job-456',
        status: 'processing',
        provider: 'openai-sora',
        model: 'sora-1',
        prompt: 'Custom prompt',
        progress: 0,
      };

      (videoGeneration.generateVideo as jest.Mock).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useVideoGeneration());

      await act(async () => {
        await result.current.generate('Custom prompt', {
          provider: 'openai-sora',
          model: 'sora-1',
          resolution: '4k',
        });
      });

      expect(videoGeneration.generateVideo).toHaveBeenCalledWith(
        'test-openai-api-key',
        expect.objectContaining({
          prompt: 'Custom prompt',
          provider: 'openai-sora',
          model: 'sora-1',
          resolution: '4k',
        })
      );
    });
  });

  describe('checkStatus', () => {
    it('should check job status', async () => {
      const mockVideo: GeneratedVideo = {
        id: 'video-123',
        url: 'https://example.com/video.mp4',
        width: 1920,
        height: 1080,
        durationSeconds: 10,
        fps: 24,
        mimeType: 'video/mp4',
        createdAt: new Date(),
      };

      const mockStatusResult: VideoGenerationResult = {
        success: true,
        jobId: 'job-123',
        status: 'completed',
        provider: 'google-veo',
        model: 'veo-3.1',
        prompt: 'Test prompt',
        progress: 100,
        video: mockVideo,
      };

      (videoGeneration.checkVideoGenerationStatus as jest.Mock).mockResolvedValue(mockStatusResult);

      const { result } = renderHook(() => useVideoGeneration());

      // First create a job
      const initialResult: VideoGenerationResult = {
        success: true,
        jobId: 'job-123',
        status: 'processing',
        provider: 'google-veo',
        model: 'veo-3.1',
        prompt: 'Test prompt',
        progress: 50,
      };
      (videoGeneration.generateVideo as jest.Mock).mockResolvedValue(initialResult);

      await act(async () => {
        await result.current.generate('Test prompt');
      });

      // Then check status
      await act(async () => {
        const statusResult = await result.current.checkStatus('job-123');
        expect(statusResult?.status).toBe('completed');
        expect(statusResult?.video).toBeDefined();
      });
    });
  });

  describe('cancelJob', () => {
    it('should cancel a job', async () => {
      (videoGeneration.cancelVideoGeneration as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useVideoGeneration());

      // Create a job first
      const initialResult: VideoGenerationResult = {
        success: true,
        jobId: 'job-123',
        status: 'processing',
        provider: 'google-veo',
        model: 'veo-3.1',
        prompt: 'Test prompt',
        progress: 50,
      };
      (videoGeneration.generateVideo as jest.Mock).mockResolvedValue(initialResult);

      await act(async () => {
        await result.current.generate('Test prompt');
      });

      let cancelResult: boolean = false;
      await act(async () => {
        cancelResult = await result.current.cancelJob('job-123');
      });

      expect(cancelResult).toBe(true);
      expect(videoGeneration.cancelVideoGeneration).toHaveBeenCalledWith(
        'test-google-api-key',
        'job-123',
        'google-veo'
      );
    });
  });

  describe('removeJob', () => {
    it('should remove a job from the list', async () => {
      const { result } = renderHook(() => useVideoGeneration());

      const initialResult: VideoGenerationResult = {
        success: true,
        jobId: 'job-123',
        status: 'processing',
        provider: 'google-veo',
        model: 'veo-3.1',
        prompt: 'Test prompt',
        progress: 50,
      };
      (videoGeneration.generateVideo as jest.Mock).mockResolvedValue(initialResult);

      await act(async () => {
        await result.current.generate('Test prompt');
      });

      expect(result.current.jobs).toHaveLength(1);

      act(() => {
        result.current.removeJob('job-123');
      });

      expect(result.current.jobs).toHaveLength(0);
    });
  });

  describe('downloadVideo', () => {
    it('should download video', async () => {
      const mockBlob = new Blob(['video content'], { type: 'video/mp4' });
      (videoGeneration.downloadVideoAsBlob as jest.Mock).mockResolvedValue(mockBlob);

      const { result } = renderHook(() => useVideoGeneration());

      const mockVideo: GeneratedVideo = {
        id: 'video-123',
        url: 'https://example.com/video.mp4',
        width: 1920,
        height: 1080,
        durationSeconds: 10,
        fps: 24,
        mimeType: 'video/mp4',
        createdAt: new Date(),
      };

      await act(async () => {
        await result.current.downloadVideo(mockVideo, 'test-video.mp4');
      });

      expect(videoGeneration.downloadVideoAsBlob).toHaveBeenCalledWith('https://example.com/video.mp4');
      expect(videoGeneration.saveVideoToFile).toHaveBeenCalledWith(mockBlob, 'test-video.mp4');
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      const { result } = renderHook(() => useVideoGeneration());

      const initialResult: VideoGenerationResult = {
        success: true,
        jobId: 'job-123',
        status: 'completed',
        provider: 'google-veo',
        model: 'veo-3.1',
        prompt: 'Test prompt',
        progress: 100,
        video: {
          id: 'video-123',
          url: 'https://example.com/video.mp4',
          width: 1920,
          height: 1080,
          durationSeconds: 10,
          fps: 24,
          mimeType: 'video/mp4',
          createdAt: new Date(),
        },
      };
      (videoGeneration.generateVideo as jest.Mock).mockResolvedValue(initialResult);

      await act(async () => {
        await result.current.generate('Test prompt');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.jobs).toHaveLength(0);
      expect(result.current.completedVideos).toHaveLength(0);
      expect(result.current.error).toBeNull();
      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('clearCompletedVideos', () => {
    it('should clear completed videos', async () => {
      const { result } = renderHook(() => useVideoGeneration());

      const initialResult: VideoGenerationResult = {
        success: true,
        jobId: 'job-123',
        status: 'completed',
        provider: 'google-veo',
        model: 'veo-3.1',
        prompt: 'Test prompt',
        progress: 100,
        video: {
          id: 'video-123',
          url: 'https://example.com/video.mp4',
          width: 1920,
          height: 1080,
          durationSeconds: 10,
          fps: 24,
          mimeType: 'video/mp4',
          createdAt: new Date(),
        },
      };
      (videoGeneration.generateVideo as jest.Mock).mockResolvedValue(initialResult);

      await act(async () => {
        await result.current.generate('Test prompt');
      });

      act(() => {
        result.current.clearCompletedVideos();
      });

      expect(result.current.completedVideos).toHaveLength(0);
    });
  });

  describe('clearJobs', () => {
    it('should clear all jobs', async () => {
      const { result } = renderHook(() => useVideoGeneration());

      const result1: VideoGenerationResult = {
        success: true,
        jobId: 'job-1',
        status: 'processing',
        provider: 'google-veo',
        model: 'veo-3.1',
        prompt: 'Prompt 1',
        progress: 50,
      };

      const result2: VideoGenerationResult = {
        success: true,
        jobId: 'job-2',
        status: 'processing',
        provider: 'google-veo',
        model: 'veo-3.1',
        prompt: 'Prompt 2',
        progress: 30,
      };

      (videoGeneration.generateVideo as jest.Mock)
        .mockResolvedValueOnce(result1)
        .mockResolvedValueOnce(result2);

      await act(async () => {
        await result.current.generate('Prompt 1');
        await result.current.generate('Prompt 2');
      });

      expect(result.current.jobs).toHaveLength(2);

      act(() => {
        result.current.clearJobs();
      });

      expect(result.current.jobs).toHaveLength(0);
    });
  });

  describe('default options', () => {
    it('should use custom default options', async () => {
      const mockResult: VideoGenerationResult = {
        success: true,
        jobId: 'job-123',
        status: 'processing',
        provider: 'openai-sora',
        model: 'sora-turbo',
        prompt: 'Test prompt',
        progress: 0,
      };

      (videoGeneration.generateVideo as jest.Mock).mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useVideoGeneration({
          defaultProvider: 'openai-sora',
          defaultModel: 'sora-turbo',
          defaultResolution: '4k',
          defaultAspectRatio: '21:9',
          defaultDuration: '30s',
          defaultStyle: 'documentary',
        })
      );

      await act(async () => {
        await result.current.generate('Test prompt');
      });

      expect(videoGeneration.generateVideo).toHaveBeenCalledWith(
        'test-openai-api-key',
        expect.objectContaining({
          provider: 'openai-sora',
          model: 'sora-turbo',
          resolution: '4k',
          aspectRatio: '21:9',
          duration: '30s',
          style: 'documentary',
        })
      );
    });
  });
});
