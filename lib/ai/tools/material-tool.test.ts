/**
 * Material Tool Tests
 */

import {
  executeMaterialExtract,
  executeMaterialSummarize,
  executeMaterialAnalyze,
  executeMaterialCombine,
  generateSummarizationPrompt,
  generateAnalysisPrompt,
} from './material-tool';

describe('Material Tool', () => {
  describe('executeMaterialExtract', () => {
    it('should extract plain text content', () => {
      const result = executeMaterialExtract({
        content: 'This is a simple text content for testing.',
        type: 'text',
        name: 'test-material',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const data = result.data as { material: { content: string; name: string } };
      expect(data.material.content).toBe('This is a simple text content for testing.');
      expect(data.material.name).toBe('test-material');
    });

    it('should strip HTML tags from content', () => {
      const result = executeMaterialExtract({
        content: '<h1>Title</h1><p>This is <strong>bold</strong> text.</p>',
        type: 'text',
        mimeType: 'text/html',
      });

      expect(result.success).toBe(true);
      const data = result.data as { material: { content: string } };
      expect(data.material.content).not.toContain('<h1>');
      expect(data.material.content).not.toContain('<strong>');
      expect(data.material.content).toContain('Title');
      expect(data.material.content).toContain('bold');
    });

    it('should clean markdown content', () => {
      const result = executeMaterialExtract({
        content: '# Heading\n\n**Bold** and *italic* text.\n\n- List item 1\n- List item 2',
        type: 'text',
        mimeType: 'text/markdown',
      });

      expect(result.success).toBe(true);
      const data = result.data as { material: { content: string } };
      expect(data.material.content).toContain('Heading');
      expect(data.material.content).toContain('Bold');
      expect(data.material.content).toContain('italic');
    });

    it('should detect language', () => {
      const result = executeMaterialExtract({
        content: '这是一段中文内容，用于测试语言检测功能。',
        type: 'text',
      });

      expect(result.success).toBe(true);
      const data = result.data as { stats: { language: string } };
      expect(data.stats.language).toBe('zh');
    });

    it('should count words', () => {
      const result = executeMaterialExtract({
        content: 'One two three four five',
        type: 'text',
      });

      expect(result.success).toBe(true);
      const data = result.data as { stats: { wordCount: number } };
      expect(data.stats.wordCount).toBe(5);
    });
  });

  describe('executeMaterialSummarize', () => {
    const longContent = `
      Artificial intelligence (AI) is transforming how we work and live.
      Machine learning, a subset of AI, enables computers to learn from data.
      Deep learning uses neural networks with many layers.
      Natural language processing allows machines to understand human language.
      Computer vision helps machines interpret visual information.
      AI is being applied in healthcare, finance, transportation, and many other fields.
      The future of AI holds both great promise and important challenges.
      Ethical considerations are crucial as AI becomes more prevalent.
    `;

    it('should generate summary from content', () => {
      const result = executeMaterialSummarize({
        content: longContent,
        depth: 'standard',
        targetLength: 200,
        language: 'en',
      });

      expect(result.success).toBe(true);
      const data = result.data as { summary: string; keyPoints: string[] };
      expect(data.summary).toBeDefined();
      expect(data.summary.length).toBeLessThanOrEqual(250);
    });

    it('should extract key points', () => {
      const result = executeMaterialSummarize({
        content: longContent,
        depth: 'standard',
        targetLength: 500,
        language: 'en',
      });

      expect(result.success).toBe(true);
      const data = result.data as { keyPoints: string[] };
      expect(data.keyPoints).toBeDefined();
      expect(data.keyPoints.length).toBeGreaterThan(0);
    });

    it('should extract key topics', () => {
      const result = executeMaterialSummarize({
        content: longContent,
        depth: 'standard',
        targetLength: 500,
        language: 'en',
      });

      expect(result.success).toBe(true);
      const data = result.data as { keyTopics: string[] };
      expect(data.keyTopics).toBeDefined();
      expect(data.keyTopics.length).toBeGreaterThan(0);
    });

    it('should respect depth parameter', () => {
      const briefResult = executeMaterialSummarize({
        content: longContent,
        depth: 'brief',
        targetLength: 300,
        language: 'en',
      });

      const detailedResult = executeMaterialSummarize({
        content: longContent,
        depth: 'detailed',
        targetLength: 800,
        language: 'en',
      });

      expect(briefResult.success).toBe(true);
      expect(detailedResult.success).toBe(true);
      
      const briefData = briefResult.data as { keyPoints: string[] };
      const detailedData = detailedResult.data as { keyPoints: string[] };
      
      expect(detailedData.keyPoints.length).toBeGreaterThanOrEqual(briefData.keyPoints.length);
    });
  });

  describe('executeMaterialAnalyze', () => {
    const testContent = `
      Apple Inc. announced their quarterly earnings on January 15, 2024.
      Revenue increased by 25% to $120 billion.
      The company launched 5 new products in the smartphone category.
      Tim Cook stated that innovation remains their core focus.
      Google and Microsoft are their main competitors.
    `;

    it('should analyze content structure', () => {
      const result = executeMaterialAnalyze({
        content: testContent,
        extractEntities: true,
        detectStructure: true,
        suggestSlides: true,
      });

      expect(result.success).toBe(true);
      const data = result.data as { analysis: { structure: { sections: unknown[] } } };
      expect(data.analysis.structure).toBeDefined();
    });

    it('should extract entities', () => {
      const result = executeMaterialAnalyze({
        content: testContent,
        extractEntities: true,
        detectStructure: false,
        suggestSlides: false,
      });

      expect(result.success).toBe(true);
      const data = result.data as { analysis: { entities: Array<{ name: string; type: string }> } };
      expect(data.analysis.entities).toBeDefined();
      expect(data.analysis.entities.length).toBeGreaterThan(0);
    });

    it('should detect numbers and dates', () => {
      const result = executeMaterialAnalyze({
        content: testContent,
        extractEntities: true,
        detectStructure: false,
        suggestSlides: false,
      });

      expect(result.success).toBe(true);
      const data = result.data as { analysis: { entities: Array<{ type: string }> } };
      const numberEntities = data.analysis.entities.filter(e => e.type === 'number');
      expect(numberEntities.length).toBeGreaterThan(0);
    });

    it('should suggest slide count', () => {
      const result = executeMaterialAnalyze({
        content: testContent,
        extractEntities: false,
        detectStructure: true,
        suggestSlides: true,
        targetSlideCount: 10,
      });

      expect(result.success).toBe(true);
      const data = result.data as { analysis: { structure: { suggestedSlideCount: number } } };
      expect(data.analysis.structure.suggestedSlideCount).toBe(10);
    });

    it('should determine complexity', () => {
      const result = executeMaterialAnalyze({
        content: testContent,
        extractEntities: false,
        detectStructure: false,
        suggestSlides: false,
      });

      expect(result.success).toBe(true);
      const data = result.data as { analysis: { complexity: string } };
      expect(['simple', 'moderate', 'complex']).toContain(data.analysis.complexity);
    });
  });

  describe('executeMaterialCombine', () => {
    const materials = [
      { id: 'mat-1', content: 'First material content about AI.', name: 'Material 1', weight: 1 },
      { id: 'mat-2', content: 'Second material content about machine learning.', name: 'Material 2', weight: 1 },
      { id: 'mat-3', content: 'Third material content about deep learning.', name: 'Material 3', weight: 1 },
    ];

    it('should merge materials', () => {
      const result = executeMaterialCombine({
        materials,
        strategy: 'merge',
      });

      expect(result.success).toBe(true);
      const data = result.data as { content: string; materialCount: number };
      expect(data.content).toContain('First material');
      expect(data.content).toContain('Second material');
      expect(data.content).toContain('Third material');
      expect(data.materialCount).toBe(3);
    });

    it('should prioritize materials by weight', () => {
      const result = executeMaterialCombine({
        materials: [
          { id: 'mat-1', content: 'Low priority', weight: 0.3 },
          { id: 'mat-2', content: 'High priority', weight: 0.9 },
          { id: 'mat-3', content: 'Medium priority', weight: 0.5 },
        ],
        strategy: 'prioritize',
      });

      expect(result.success).toBe(true);
      const data = result.data as { content: string };
      const highIndex = data.content.indexOf('High priority');
      const lowIndex = data.content.indexOf('Low priority');
      expect(highIndex).toBeLessThan(lowIndex);
    });

    it('should create sections', () => {
      const result = executeMaterialCombine({
        materials: materials,
        strategy: 'section',
      });

      expect(result.success).toBe(true);
      const data = result.data as { content: string };
      expect(data.content).toContain('## Material 1');
      expect(data.content).toContain('## Material 2');
      expect(data.content).toContain('## Material 3');
    });
  });

  describe('Prompt Generation', () => {
    it('should generate summarization prompt', () => {
      const prompt = generateSummarizationPrompt('Test content for summarization', {
        depth: 'standard',
        targetLength: 500,
        language: 'en',
      });

      expect(prompt).toContain('Test content');
      expect(prompt).toContain('500');
      expect(prompt).toContain('JSON');
    });

    it('should include focus areas in prompt', () => {
      const prompt = generateSummarizationPrompt('Test content', {
        depth: 'standard',
        targetLength: 500,
        focusAreas: ['technology', 'innovation'],
        language: 'en',
      });

      expect(prompt).toContain('technology');
      expect(prompt).toContain('innovation');
    });

    it('should generate analysis prompt', () => {
      const prompt = generateAnalysisPrompt('Test content for analysis', {
        targetSlideCount: 15,
        presentationStyle: 'creative',
      });

      expect(prompt).toContain('Test content');
      expect(prompt).toContain('15');
      expect(prompt).toContain('creative');
      expect(prompt).toContain('JSON');
    });
  });
});
