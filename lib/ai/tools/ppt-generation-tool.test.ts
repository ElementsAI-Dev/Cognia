/**
 * Tests for PPT Generation Tool
 */

import {
  pptGenerationInputSchema,
  createPPTGenerationTool,
  detectPPTGenerationIntent,
  buildPPTSuggestionResponse,
  type PPTGenerationResult,
} from './ppt-generation-tool';

describe('pptGenerationInputSchema', () => {
  it('validates valid input', () => {
    const input = {
      topic: 'Artificial Intelligence',
      description: 'An introduction to AI',
      audience: 'Students',
      purpose: 'educational',
      tone: 'professional',
      slideCount: 10,
      language: 'en',
      includeImages: true,
      includeCharts: false,
    };

    const result = pptGenerationInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('requires topic', () => {
    const input = {
      description: 'Description only',
    };

    const result = pptGenerationInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('has correct defaults', () => {
    const input = {
      topic: 'Test Topic',
    };

    const result = pptGenerationInputSchema.parse(input);
    expect(result.audience).toBe('General Public');
    expect(result.purpose).toBe('informative');
    expect(result.tone).toBe('professional');
    expect(result.slideCount).toBe(10);
    expect(result.language).toBe('zh-CN');
    expect(result.includeImages).toBe(true);
    expect(result.includeCharts).toBe(false);
  });

  it('validates purpose enum', () => {
    const validPurposes = ['informative', 'persuasive', 'educational', 'pitch', 'report'];

    for (const purpose of validPurposes) {
      const result = pptGenerationInputSchema.safeParse({
        topic: 'Test',
        purpose,
      });
      expect(result.success).toBe(true);
    }

    const invalidResult = pptGenerationInputSchema.safeParse({
      topic: 'Test',
      purpose: 'invalid',
    });
    expect(invalidResult.success).toBe(false);
  });

  it('validates tone enum', () => {
    const validTones = ['formal', 'casual', 'professional', 'creative'];

    for (const tone of validTones) {
      const result = pptGenerationInputSchema.safeParse({
        topic: 'Test',
        tone,
      });
      expect(result.success).toBe(true);
    }
  });

  it('validates slideCount range', () => {
    expect(pptGenerationInputSchema.safeParse({ topic: 'Test', slideCount: 2 }).success).toBe(false);
    expect(pptGenerationInputSchema.safeParse({ topic: 'Test', slideCount: 3 }).success).toBe(true);
    expect(pptGenerationInputSchema.safeParse({ topic: 'Test', slideCount: 50 }).success).toBe(true);
    expect(pptGenerationInputSchema.safeParse({ topic: 'Test', slideCount: 51 }).success).toBe(false);
  });
});

describe('createPPTGenerationTool', () => {
  it('creates a valid agent tool', () => {
    const mockCallback = jest.fn();
    const tool = createPPTGenerationTool(mockCallback);

    expect(tool.name).toBe('generate_ppt');
    expect(tool.description).toContain('PowerPoint');
    expect(tool.parameters).toBe(pptGenerationInputSchema);
    expect(tool.requiresApproval).toBe(false);
    expect(typeof tool.execute).toBe('function');
  });

  it('returns success message on successful generation', async () => {
    const mockCallback = jest.fn().mockResolvedValue({
      success: true,
      presentationId: 'ppt-123',
      title: 'Test Presentation',
      slideCount: 10,
      message: 'Generation complete',
    } as PPTGenerationResult);

    const tool = createPPTGenerationTool(mockCallback);
    const result = await tool.execute({ topic: 'Test Topic' });

    expect(result).toContain('✅');
    expect(result).toContain('Test Presentation');
    expect(result).toContain('10');
    expect(result).toContain('ppt-123');
  });

  it('returns error message on failed generation', async () => {
    const mockCallback = jest.fn().mockResolvedValue({
      success: false,
      error: 'Generation failed',
      message: 'Something went wrong',
    } as PPTGenerationResult);

    const tool = createPPTGenerationTool(mockCallback);
    const result = await tool.execute({ topic: 'Test Topic' });

    expect(result).toContain('❌');
    expect(result).toContain('Generation failed');
  });

  it('handles exceptions gracefully', async () => {
    const mockCallback = jest.fn().mockRejectedValue(new Error('Network error'));

    const tool = createPPTGenerationTool(mockCallback);
    const result = await tool.execute({ topic: 'Test Topic' });

    expect(result).toContain('❌');
    expect(result).toContain('Network error');
  });

  it('passes correct input to callback', async () => {
    const mockCallback = jest.fn().mockResolvedValue({
      success: true,
      presentationId: 'ppt-123',
      title: 'Test',
      slideCount: 5,
      message: 'Done',
    });

    const tool = createPPTGenerationTool(mockCallback);
    const input = {
      topic: 'AI',
      description: 'About AI',
      slideCount: 15,
    };

    await tool.execute(input);

    expect(mockCallback).toHaveBeenCalledWith(input);
  });
});

describe('detectPPTGenerationIntent', () => {
  describe('Chinese patterns', () => {
    it('detects "帮我做一个PPT"', () => {
      const result = detectPPTGenerationIntent('帮我做一个关于人工智能的PPT');
      expect(result.hasPPTIntent).toBe(true);
      expect(result.topic).toBe('人工智能');
    });

    it('detects "生成演示文稿"', () => {
      const result = detectPPTGenerationIntent('请生成一份关于气候变化的演示文稿');
      expect(result.hasPPTIntent).toBe(true);
    });

    it('detects "创建幻灯片"', () => {
      const result = detectPPTGenerationIntent('创建一个幻灯片');
      expect(result.hasPPTIntent).toBe(true);
    });
  });

  describe('English patterns', () => {
    it('detects "create a presentation"', () => {
      const result = detectPPTGenerationIntent('create a presentation about climate change');
      expect(result.hasPPTIntent).toBe(true);
      expect(result.topic).toContain('climate change');
    });

    it('detects "make a PPT"', () => {
      const result = detectPPTGenerationIntent('make a PPT for my business pitch');
      expect(result.hasPPTIntent).toBe(true);
    });

    it('detects "generate slides"', () => {
      const result = detectPPTGenerationIntent('generate slides about AI');
      expect(result.hasPPTIntent).toBe(true);
    });

    it('detects "build a deck"', () => {
      const result = detectPPTGenerationIntent('build a deck on machine learning');
      expect(result.hasPPTIntent).toBe(true);
    });
  });

  describe('slide count extraction', () => {
    it('extracts slide count from Chinese', () => {
      const result = detectPPTGenerationIntent('帮我做一个15张的PPT');
      expect(result.slideCount).toBe(15);
    });

    it('extracts slide count from English', () => {
      const result = detectPPTGenerationIntent('create a 20 slide presentation');
      expect(result.slideCount).toBe(20);
    });
  });

  it('returns false for unrelated messages', () => {
    const result = detectPPTGenerationIntent('What is the weather today?');
    expect(result.hasPPTIntent).toBe(false);
  });
});

describe('buildPPTSuggestionResponse', () => {
  it('builds response with topic', () => {
    const response = buildPPTSuggestionResponse('人工智能');
    
    expect(response).toContain('人工智能');
    expect(response).toContain('演示文稿');
  });

  it('builds response without topic', () => {
    const response = buildPPTSuggestionResponse();
    
    expect(response).toContain('主题');
    expect(response).toContain('演示文稿');
  });
});
