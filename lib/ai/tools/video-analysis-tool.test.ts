/**
 * Tests for Video Analysis Tool
 */

import {
  videoSubtitleInputSchema,
  videoAnalysisInputSchema,
  subtitleParseInputSchema,
  executeSubtitleParse,
  formatVideoAnalysisForAI,
  videoSubtitleTool,
  videoAnalysisTool,
  subtitleParseTool,
  videoAnalysisTools,
  registerVideoAnalysisTools,
} from './video-analysis-tool';

// Mock the media modules
jest.mock('@/lib/media/video-subtitle', () => ({
  getVideoSubtitleInfo: jest.fn(),
  getVideoSubtitles: jest.fn(),
  analyzeVideoContent: jest.fn(),
}));

jest.mock('@/lib/media/subtitle-parser', () => ({
  parseSubtitle: jest.fn(),
  cuesToPlainText: jest.fn(),
}));

describe('Video Analysis Tool Schemas', () => {
  describe('videoSubtitleInputSchema', () => {
    it('validates valid input', () => {
      const input = {
        videoPath: '/path/to/video.mp4',
        language: 'en',
        transcribeIfMissing: true,
      };
      
      const result = videoSubtitleInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('requires videoPath', () => {
      const input = {
        language: 'en',
      };
      
      const result = videoSubtitleInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('has correct defaults', () => {
      const input = {
        videoPath: '/path/to/video.mp4',
      };
      
      const result = videoSubtitleInputSchema.parse(input);
      expect(result.transcribeIfMissing).toBe(true);
    });
  });

  describe('videoAnalysisInputSchema', () => {
    it('validates valid input', () => {
      const input = {
        videoPath: '/path/to/video.mp4',
        analysisType: 'summary',
      };
      
      const result = videoAnalysisInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates all analysis types', () => {
      const types = ['summary', 'transcript', 'key-moments', 'qa', 'full'];
      
      for (const type of types) {
        const result = videoAnalysisInputSchema.safeParse({
          videoPath: '/path/to/video.mp4',
          analysisType: type,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid analysis type', () => {
      const result = videoAnalysisInputSchema.safeParse({
        videoPath: '/path/to/video.mp4',
        analysisType: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('has correct defaults', () => {
      const result = videoAnalysisInputSchema.parse({
        videoPath: '/path/to/video.mp4',
      });
      
      expect(result.analysisType).toBe('summary');
      expect(result.useSubtitles).toBe(true);
      expect(result.transcribeIfNeeded).toBe(true);
    });
  });

  describe('subtitleParseInputSchema', () => {
    it('validates valid input', () => {
      const input = {
        content: '1\n00:00:00,000 --> 00:00:02,000\nHello World',
        language: 'en',
      };
      
      const result = subtitleParseInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('requires content', () => {
      const result = subtitleParseInputSchema.safeParse({
        language: 'en',
      });
      expect(result.success).toBe(false);
    });

    it('has default language', () => {
      const result = subtitleParseInputSchema.parse({
        content: 'subtitle content',
      });
      expect(result.language).toBe('en');
    });
  });
});

describe('executeSubtitleParse', () => {
  const { parseSubtitle, cuesToPlainText } = jest.requireMock('@/lib/media/subtitle-parser');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns success for valid SRT content', () => {
    parseSubtitle.mockReturnValue({
      format: 'srt',
      tracks: [{
        cues: [
          { start: 0, end: 2000, text: 'Hello' },
          { start: 2000, end: 4000, text: 'World' },
        ],
        duration: 4000,
        language: 'en',
      }],
      errors: [],
    });
    cuesToPlainText.mockReturnValue('Hello World');

    const result = executeSubtitleParse({
      content: '1\n00:00:00,000 --> 00:00:02,000\nHello',
      language: 'en',
    });

    expect(result.success).toBe(true);
    expect(result.data?.format).toBe('srt');
    expect(result.data?.cueCount).toBe(2);
    expect(result.data?.transcript).toBe('Hello World');
  });

  it('returns error for parse failures', () => {
    parseSubtitle.mockReturnValue({
      format: 'unknown',
      tracks: [],
      errors: [{ type: 'error', message: 'Invalid format' }],
    });

    const result = executeSubtitleParse({
      content: 'invalid content',
      language: 'en',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid format');
  });

  it('returns error when no tracks found', () => {
    parseSubtitle.mockReturnValue({
      format: 'srt',
      tracks: [],
      errors: [],
    });

    const result = executeSubtitleParse({
      content: 'empty',
      language: 'en',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('No subtitle track found in content');
  });
});

describe('formatVideoAnalysisForAI', () => {
  it('formats failed result', () => {
    const result = formatVideoAnalysisForAI({
      success: false,
      error: 'Test error',
    });

    expect(result).toBe('Video analysis failed: Test error');
  });

  it('formats successful result with all data', () => {
    const result = formatVideoAnalysisForAI({
      success: true,
      data: {
        subtitleSource: 'embedded',
        duration: 120000,
        cueCount: 50,
        language: 'en',
        summary: 'This is a test video summary.',
        keyMoments: [
          { timestamp: 10000, formattedTime: '0:10', title: 'Introduction', description: 'Start' },
        ],
        topics: ['AI', 'Technology'],
        transcript: 'This is the transcript text...',
      },
    });

    expect(result).toContain('## Video Analysis Result');
    expect(result).toContain('**Subtitle Source:** embedded');
    expect(result).toContain('**Duration:** 2:00');
    expect(result).toContain('**Subtitle Cues:** 50');
    expect(result).toContain('**Language:** en');
    expect(result).toContain('### Summary');
    expect(result).toContain('This is a test video summary.');
    expect(result).toContain('### Key Moments');
    expect(result).toContain('[0:10]');
    expect(result).toContain('### Topics');
    expect(result).toContain('- AI');
    expect(result).toContain('### Transcript Preview');
  });
});

describe('Tool Definitions', () => {
  describe('videoSubtitleTool', () => {
    it('has correct name and description', () => {
      expect(videoSubtitleTool.name).toBe('video_subtitles');
      expect(videoSubtitleTool.description).toContain('Extract subtitles');
    });

    it('has correct parameters', () => {
      expect(videoSubtitleTool.parameters).toBe(videoSubtitleInputSchema);
    });

    it('does not require approval', () => {
      expect(videoSubtitleTool.requiresApproval).toBe(false);
    });

    it('creates executable function', () => {
      const fn = videoSubtitleTool.create({ apiKey: 'test-key' });
      expect(typeof fn).toBe('function');
    });
  });

  describe('videoAnalysisTool', () => {
    it('has correct name and description', () => {
      expect(videoAnalysisTool.name).toBe('video_analyze');
      expect(videoAnalysisTool.description).toContain('Analyze video content');
    });

    it('has correct parameters', () => {
      expect(videoAnalysisTool.parameters).toBe(videoAnalysisInputSchema);
    });
  });

  describe('subtitleParseTool', () => {
    it('has correct name and description', () => {
      expect(subtitleParseTool.name).toBe('subtitle_parse');
      expect(subtitleParseTool.description).toContain('Parse subtitle');
    });

    it('has correct parameters', () => {
      expect(subtitleParseTool.parameters).toBe(subtitleParseInputSchema);
    });
  });
});

describe('videoAnalysisTools collection', () => {
  it('contains all three tools', () => {
    expect(videoAnalysisTools).toHaveProperty('video_subtitles');
    expect(videoAnalysisTools).toHaveProperty('video_analyze');
    expect(videoAnalysisTools).toHaveProperty('subtitle_parse');
  });
});

describe('registerVideoAnalysisTools', () => {
  it('registers all tools to registry', () => {
    const mockRegistry = {
      register: jest.fn(),
    };

    registerVideoAnalysisTools(mockRegistry);

    expect(mockRegistry.register).toHaveBeenCalledTimes(3);
    expect(mockRegistry.register).toHaveBeenCalledWith(videoSubtitleTool);
    expect(mockRegistry.register).toHaveBeenCalledWith(videoAnalysisTool);
    expect(mockRegistry.register).toHaveBeenCalledWith(subtitleParseTool);
  });
});
