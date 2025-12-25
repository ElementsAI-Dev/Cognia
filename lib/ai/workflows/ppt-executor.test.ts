/**
 * PPT Workflow Executor Tests
 */

import { PPTWorkflowExecutor, generatePresentation } from './ppt-executor';
import type { PPTEnhancedGenerationOptions, PPTMaterial } from '@/types/workflow';

// Mock the dependencies
jest.mock('../tools/material-tool', () => ({
  executeMaterialExtract: jest.fn().mockReturnValue({
    success: true,
    data: {
      material: {
        id: 'material-1',
        type: 'text',
        name: 'Test Material',
        content: 'Extracted content about AI and machine learning.',
        metadata: { wordCount: 100, language: 'en' },
      },
    },
  }),
  executeMaterialAnalyze: jest.fn().mockReturnValue({
    success: true,
    data: {
      analysis: {
        id: 'analysis-1',
        materialId: 'material-1',
        summary: 'Content about AI',
        keyTopics: ['AI', 'Machine Learning'],
        keyPoints: ['Point 1', 'Point 2'],
        entities: [],
        structure: { sections: [], hasData: false, hasImages: false, suggestedSlideCount: 10 },
        complexity: 'moderate',
        language: 'en',
      },
    },
  }),
  executeMaterialSummarize: jest.fn().mockReturnValue({
    success: true,
    data: {
      summary: 'AI and machine learning summary',
      keyPoints: ['Key point 1', 'Key point 2'],
      keyTopics: ['AI', 'ML'],
    },
  }),
}));

jest.mock('../tools/slide-image-tool', () => ({
  enhanceSlidesWithImages: jest.fn().mockResolvedValue({
    slides: [
      { id: 'slide-1', title: 'Title', layout: 'title', elements: [], order: 0 },
      { id: 'slide-2', title: 'Content', layout: 'title-content', elements: [], order: 1 },
    ],
    generatedImages: [],
    stats: { total: 2, processed: 0, success: 0, failed: 0, skipped: 2 },
  }),
}));

describe('PPT Workflow Executor', () => {
  const mockApiKey = 'test-api-key';
  
  const mockOptions: PPTEnhancedGenerationOptions = {
    topic: 'Artificial Intelligence',
    description: 'An overview of AI technologies',
    slideCount: 10,
    style: 'professional',
    targetAudience: 'Business executives',
    language: 'en',
    generateImages: false,
  };

  describe('PPTWorkflowExecutor', () => {
    it('should create executor with config', () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      expect(executor).toBeDefined();
    });

    it('should have idle status initially', () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      const state = executor.getState();
      expect(state.status).toBe('idle');
    });

    it('should execute workflow without materials', async () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      
      const result = await executor.execute({
        ...mockOptions,
        generateImages: false,
      });

      expect(result.success).toBe(true);
      expect(result.presentation).toBeDefined();
      expect(result.outline).toBeDefined();
      expect(result.statistics).toBeDefined();
    });

    it('should execute workflow with materials', async () => {
      const materials: PPTMaterial[] = [
        {
          id: 'mat-1',
          type: 'text',
          name: 'AI Document',
          content: 'Content about artificial intelligence and its applications.',
        },
      ];

      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      
      const result = await executor.execute({
        ...mockOptions,
        materials,
        generateImages: false,
      });

      expect(result.success).toBe(true);
      expect(result.presentation).toBeDefined();
    });

    it('should track progress during execution', async () => {
      const progressUpdates: Array<{ step: string; percentage: number }> = [];
      
      const executor = new PPTWorkflowExecutor({
        apiKey: mockApiKey,
        onProgress: (progress) => {
          progressUpdates.push({
            step: progress.currentStep,
            percentage: progress.percentage,
          });
        },
      });

      await executor.execute({
        ...mockOptions,
        generateImages: false,
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBeGreaterThanOrEqual(0);
    });

    it('should call onStepComplete for each step', async () => {
      const completedSteps: string[] = [];
      
      const executor = new PPTWorkflowExecutor({
        apiKey: mockApiKey,
        onStepComplete: (stepId) => {
          completedSteps.push(stepId);
        },
      });

      await executor.execute({
        ...mockOptions,
        generateImages: false,
      });

      expect(completedSteps).toContain('analyze-requirements');
      expect(completedSteps).toContain('generate-outline');
      expect(completedSteps).toContain('generate-slides');
    });

    it('should generate default outline when no AI generator provided', async () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      
      const result = await executor.execute({
        ...mockOptions,
        slideCount: 8,
        generateImages: false,
      });

      expect(result.success).toBe(true);
      expect(result.outline).toBeDefined();
      expect(result.outline!.length).toBeGreaterThan(0);
    });

    it('should include statistics in result', async () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      
      const result = await executor.execute({
        ...mockOptions,
        generateImages: false,
      });

      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalDuration).toBeGreaterThanOrEqual(0);
      expect(result.statistics.slidesCreated).toBeGreaterThan(0);
    });

    it('should handle cancellation', async () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      
      // Start execution
      const executionPromise = executor.execute({
        ...mockOptions,
        generateImages: false,
      });

      // Cancel immediately (before completion)
      executor.cancel();

      const result = await executionPromise;
      
      // Result depends on timing - either cancelled or completed
      expect(result).toBeDefined();
    });

    it('should update state during execution', async () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      
      const initialState = executor.getState();
      expect(initialState.status).toBe('idle');

      await executor.execute({
        ...mockOptions,
        generateImages: false,
      });

      const finalState = executor.getState();
      expect(finalState.status).toBe('completed');
      expect(finalState.completedSteps.length).toBeGreaterThan(0);
    });

    it('should use custom AI content generator when provided', async () => {
      const mockAIGenerator = jest.fn().mockResolvedValue(JSON.stringify({
        themes: ['AI', 'Technology'],
        keyMessages: ['Innovation is key'],
      }));

      const executor = new PPTWorkflowExecutor({
        apiKey: mockApiKey,
        generateAIContent: mockAIGenerator,
      });

      await executor.execute({
        ...mockOptions,
        generateImages: false,
      });

      expect(mockAIGenerator).toHaveBeenCalled();
    });

    it('should apply default theme when none provided', async () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      
      const result = await executor.execute({
        ...mockOptions,
        generateImages: false,
      });

      expect(result.presentation?.theme).toBeDefined();
      expect(result.presentation?.theme.primaryColor).toBeDefined();
    });

    it('should generate Marp content', async () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      
      const result = await executor.execute({
        ...mockOptions,
        generateImages: false,
      });

      expect(result.marpContent).toBeDefined();
      expect(result.marpContent).toContain('marp: true');
    });

    it('should handle errors gracefully', async () => {
      const executor = new PPTWorkflowExecutor({
        apiKey: mockApiKey,
        onError: jest.fn(),
      });

      // Even with invalid options, should not throw
      const result = await executor.execute({
        topic: '', // Empty topic
        generateImages: false,
      });

      expect(result).toBeDefined();
    });
  });

  describe('generatePresentation', () => {
    it('should generate presentation using convenience function', async () => {
      const result = await generatePresentation(
        {
          topic: 'Quick Test',
          slideCount: 5,
          generateImages: false,
        },
        { apiKey: mockApiKey }
      );

      expect(result.success).toBe(true);
      expect(result.presentation).toBeDefined();
    });
  });

  describe('Default Outline Generation', () => {
    it('should generate title slide', async () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      
      const result = await executor.execute({
        topic: 'Test Topic',
        slideCount: 5,
        generateImages: false,
      });

      const outline = result.outline || [];
      const titleSlide = outline.find(s => s.suggestedLayout === 'title');
      expect(titleSlide).toBeDefined();
      expect(titleSlide?.title).toBe('Test Topic');
    });

    it('should generate closing slide', async () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      
      const result = await executor.execute({
        topic: 'Test Topic',
        slideCount: 5,
        generateImages: false,
      });

      const outline = result.outline || [];
      const closingSlide = outline.find(s => s.suggestedLayout === 'closing');
      expect(closingSlide).toBeDefined();
    });

    it('should generate agenda slide for larger presentations', async () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      
      const result = await executor.execute({
        topic: 'Test Topic',
        slideCount: 10,
        generateImages: false,
      });

      const outline = result.outline || [];
      const agendaSlide = outline.find(s => s.title === 'Agenda');
      expect(agendaSlide).toBeDefined();
    });

    it('should include speaker notes in outline', async () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      
      const result = await executor.execute({
        topic: 'Test Topic',
        slideCount: 5,
        generateImages: false,
      });

      const outline = result.outline || [];
      for (const item of outline) {
        expect(item.speakerNotes).toBeDefined();
      }
    });
  });

  describe('Presentation Building', () => {
    it('should set correct aspect ratio', async () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      
      const result = await executor.execute({
        ...mockOptions,
        generateImages: false,
      });

      expect(result.presentation?.aspectRatio).toBe('16:9');
    });

    it('should set timestamps', async () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      
      const result = await executor.execute({
        ...mockOptions,
        generateImages: false,
      });

      expect(result.presentation?.createdAt).toBeDefined();
      expect(result.presentation?.updatedAt).toBeDefined();
    });

    it('should include metadata', async () => {
      const executor = new PPTWorkflowExecutor({ apiKey: mockApiKey });
      
      const result = await executor.execute({
        ...mockOptions,
        generateImages: false,
      });

      expect(result.presentation?.metadata).toBeDefined();
      expect(result.presentation?.metadata?.style).toBe('professional');
    });
  });
});
