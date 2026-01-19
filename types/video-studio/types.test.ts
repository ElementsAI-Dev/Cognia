import type {
  StudioMode,
  VideoJob,
  AIGenerationSettings,
  ExportState,
} from './types';

describe('Video Studio Types', () => {
  describe('StudioMode', () => {
    it('should allow valid studio modes', () => {
      const recordingMode: StudioMode = 'recording';
      const aiGenerationMode: StudioMode = 'ai-generation';
      
      expect(recordingMode).toBe('recording');
      expect(aiGenerationMode).toBe('ai-generation');
    });
  });

  describe('VideoJob', () => {
    it('should have correct shape', () => {
      const mockJob: VideoJob = {
        id: 'test-id',
        prompt: 'Test prompt',
        provider: 'google-veo',
        model: 'veo-3',
        status: 'completed',
        progress: 100,
        createdAt: Date.now(),
        settings: {
          resolution: '1080p',
          aspectRatio: '16:9',
          duration: '10s',
          style: 'cinematic',
        },
      };

      expect(mockJob.id).toBeDefined();
      expect(mockJob.prompt).toBeDefined();
      expect(mockJob.provider).toBeDefined();
      expect(mockJob.model).toBeDefined();
      expect(mockJob.status).toBeDefined();
      expect(mockJob.progress).toBeDefined();
      expect(mockJob.createdAt).toBeDefined();
      expect(mockJob.settings).toBeDefined();
    });

    it('should allow optional properties', () => {
      const mockJob: VideoJob = {
        id: 'test-id',
        jobId: 'external-job-id',
        prompt: 'Test prompt',
        provider: 'openai-sora',
        model: 'sora-turbo',
        status: 'processing',
        progress: 50,
        videoUrl: 'https://example.com/video.mp4',
        videoBase64: 'base64data',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        error: undefined,
        createdAt: Date.now(),
        settings: {
          resolution: '720p',
          aspectRatio: '9:16',
          duration: '5s',
          style: 'animation',
          fps: 30,
        },
        isFavorite: true,
      };

      expect(mockJob.jobId).toBe('external-job-id');
      expect(mockJob.videoUrl).toBeDefined();
      expect(mockJob.isFavorite).toBe(true);
      expect(mockJob.settings.fps).toBe(30);
    });

    it('should support all status types', () => {
      const statuses: VideoJob['status'][] = ['pending', 'processing', 'completed', 'failed'];
      
      statuses.forEach((status) => {
        const job: VideoJob = {
          id: 'test',
          prompt: 'test',
          provider: 'google-veo',
          model: 'veo-3',
          status,
          progress: 0,
          createdAt: Date.now(),
          settings: {
            resolution: '1080p',
            aspectRatio: '16:9',
            duration: '10s',
            style: 'cinematic',
          },
        };
        expect(job.status).toBe(status);
      });
    });
  });

  describe('AIGenerationSettings', () => {
    it('should have correct shape', () => {
      const settings: AIGenerationSettings = {
        provider: 'google-veo',
        model: 'veo-3',
        resolution: '1080p',
        aspectRatio: '16:9',
        duration: '10s',
        style: 'cinematic',
        fps: 24,
        enhancePrompt: true,
        includeAudio: false,
        audioPrompt: '',
        seed: 12345,
      };

      expect(settings.provider).toBeDefined();
      expect(settings.model).toBe('veo-3');
      expect(settings.fps).toBe(24);
      expect(settings.enhancePrompt).toBe(true);
    });

    it('should allow optional seed', () => {
      const settings: AIGenerationSettings = {
        provider: 'google-veo',
        model: 'veo-3.1',
        resolution: '720p',
        aspectRatio: '1:1',
        duration: '5s',
        style: 'natural',
        fps: 30,
        enhancePrompt: false,
        includeAudio: true,
        audioPrompt: 'ambient music',
        seed: undefined,
      };

      expect(settings.seed).toBeUndefined();
      expect(settings.includeAudio).toBe(true);
    });
  });

  describe('ExportState', () => {
    it('should have correct shape', () => {
      const exportState: ExportState = {
        isExporting: true,
        progress: 50,
        message: 'Processing video...',
      };

      expect(exportState.isExporting).toBe(true);
      expect(exportState.progress).toBe(50);
      expect(exportState.message).toBe('Processing video...');
    });

    it('should represent idle state', () => {
      const idleState: ExportState = {
        isExporting: false,
        progress: 0,
        message: '',
      };

      expect(idleState.isExporting).toBe(false);
      expect(idleState.progress).toBe(0);
    });
  });
});
