/**
 * Academic PPT Tool Tests
 */

import {
  executePaperToPPTOutline,
  executePaperToPPT,
  buildAcademicPPTPrompt,
  paperToPPTInputSchema,
} from './academic-ppt-tool';
import type { PaperToPPTInput } from './academic-ppt-tool';

// Mock paper data
const mockPaper = {
  id: 'paper-1',
  title: 'Attention Is All You Need',
  abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.',
  authors: [
    { name: 'Ashish Vaswani', affiliation: 'Google Brain' },
    { name: 'Noam Shazeer', affiliation: 'Google Brain' },
  ],
  year: 2017,
  venue: 'NeurIPS',
};

const mockInput: PaperToPPTInput = {
  papers: [mockPaper],
  style: 'academic',
  slideCount: 10,
  audienceLevel: 'graduate',
  language: 'en',
  generateImages: true,
  imageStyle: 'diagram',
  includeNotes: true,
  includeCitations: true,
  includeReferences: true,
};

describe('academic-ppt-tool', () => {
  describe('paperToPPTInputSchema', () => {
    it('should validate correct input', () => {
      const result = paperToPPTInputSchema.safeParse(mockInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty papers array', () => {
      const invalidInput = { ...mockInput, papers: [] };
      const result = paperToPPTInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should use default values for optional fields', () => {
      const minimalInput = {
        papers: [mockPaper],
      };
      const result = paperToPPTInputSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.style).toBe('academic');
        expect(result.data.slideCount).toBe(15);
        expect(result.data.audienceLevel).toBe('graduate');
      }
    });

    it('should validate all style options', () => {
      const styles = ['academic', 'conference', 'seminar', 'thesis-defense', 'journal-club'];
      for (const style of styles) {
        const input = { ...mockInput, style };
        const result = paperToPPTInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    it('should validate all audience levels', () => {
      const levels = ['expert', 'graduate', 'undergraduate', 'general'];
      for (const audienceLevel of levels) {
        const input = { ...mockInput, audienceLevel };
        const result = paperToPPTInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('executePaperToPPTOutline', () => {
    it('should generate outline successfully', async () => {
      const result = await executePaperToPPTOutline(mockInput);
      
      expect(result.success).toBe(true);
      expect(result.outline).toBeDefined();
      expect(Array.isArray(result.outline)).toBe(true);
    });

    it('should include default academic sections', async () => {
      const result = await executePaperToPPTOutline(mockInput);
      
      expect(result.success).toBe(true);
      expect(result.outline).toBeDefined();
      
      const sections = result.outline!.map(item => item.section);
      expect(sections).toContain('title');
      expect(sections).toContain('introduction');
      expect(sections).toContain('methodology');
      expect(sections).toContain('conclusion');
    });

    it('should include speaker notes when enabled', async () => {
      const result = await executePaperToPPTOutline(mockInput);
      
      expect(result.success).toBe(true);
      const itemsWithNotes = result.outline!.filter(item => item.speakerNotes);
      expect(itemsWithNotes.length).toBeGreaterThan(0);
    });

    it('should mark image needs for appropriate sections', async () => {
      const result = await executePaperToPPTOutline(mockInput);
      
      expect(result.success).toBe(true);
      const itemsWithImages = result.outline!.filter(item => item.imageNeeded);
      expect(itemsWithImages.length).toBeGreaterThan(0);
    });

    it('should use custom sections when provided', async () => {
      const customInput = {
        ...mockInput,
        includeSections: ['title', 'abstract', 'conclusion', 'qa'] as ('title' | 'abstract' | 'conclusion' | 'qa')[],
      };
      const result = await executePaperToPPTOutline(customInput);
      
      expect(result.success).toBe(true);
      expect(result.outline).toHaveLength(4);
    });

    it('should use paper title for title slide', async () => {
      const result = await executePaperToPPTOutline(mockInput);
      
      expect(result.success).toBe(true);
      const titleSlide = result.outline!.find(item => item.section === 'title');
      expect(titleSlide?.title).toBe(mockPaper.title);
    });
  });

  describe('executePaperToPPT', () => {
    it('should generate full presentation successfully', async () => {
      const result = await executePaperToPPT(mockInput);
      
      expect(result.success).toBe(true);
      expect(result.presentation).toBeDefined();
      expect(result.outline).toBeDefined();
    });

    it('should create presentation with correct metadata', async () => {
      const result = await executePaperToPPT(mockInput);
      
      expect(result.success).toBe(true);
      expect(result.presentation?.title).toBe(mockPaper.title);
      expect(result.presentation?.aspectRatio).toBe('16:9');
      expect(result.presentation?.metadata?.source).toBe('academic-paper');
    });

    it('should create slides matching outline', async () => {
      const result = await executePaperToPPT(mockInput);
      
      expect(result.success).toBe(true);
      expect(result.presentation?.slides.length).toBe(result.outline?.length);
    });

    it('should apply academic theme', async () => {
      const result = await executePaperToPPT(mockInput);
      
      expect(result.success).toBe(true);
      expect(result.presentation?.theme.id).toBe('academic');
    });

    it('should include speaker notes in slides', async () => {
      const result = await executePaperToPPT(mockInput);
      
      expect(result.success).toBe(true);
      const slidesWithNotes = result.presentation?.slides.filter(s => s.notes);
      expect(slidesWithNotes?.length).toBeGreaterThan(0);
    });
  });

  describe('buildAcademicPPTPrompt', () => {
    it('should build prompt with paper information', () => {
      const prompt = buildAcademicPPTPrompt(mockInput);
      
      expect(prompt).toContain(mockPaper.title);
      expect(prompt).toContain('Ashish Vaswani');
      expect(prompt).toContain('2017');
      expect(prompt).toContain('NeurIPS');
    });

    it('should include style description', () => {
      const prompt = buildAcademicPPTPrompt(mockInput);
      
      expect(prompt).toContain('academic presentation');
    });

    it('should include audience level', () => {
      const prompt = buildAcademicPPTPrompt(mockInput);
      
      expect(prompt).toContain('graduate');
    });

    it('should include slide count', () => {
      const prompt = buildAcademicPPTPrompt(mockInput);
      
      expect(prompt).toContain('10');
    });

    it('should include custom instructions when provided', () => {
      const inputWithInstructions = {
        ...mockInput,
        customInstructions: 'Focus on the attention mechanism',
      };
      const prompt = buildAcademicPPTPrompt(inputWithInstructions);
      
      expect(prompt).toContain('Focus on the attention mechanism');
    });
  });

  describe('different presentation styles', () => {
    it('should generate conference style presentation', async () => {
      const input = { ...mockInput, style: 'conference' as const };
      const result = await executePaperToPPTOutline(input);
      
      expect(result.success).toBe(true);
      const sections = result.outline!.map(item => item.section);
      expect(sections).toContain('experiments');
    });

    it('should generate thesis-defense style presentation', async () => {
      const input = { ...mockInput, style: 'thesis-defense' as const };
      const result = await executePaperToPPTOutline(input);
      
      expect(result.success).toBe(true);
      const sections = result.outline!.map(item => item.section);
      expect(sections).toContain('related-work');
      expect(sections).toContain('limitations');
      expect(sections).toContain('future-work');
    });

    it('should generate journal-club style presentation', async () => {
      const input = { ...mockInput, style: 'journal-club' as const };
      const result = await executePaperToPPTOutline(input);
      
      expect(result.success).toBe(true);
      const sections = result.outline!.map(item => item.section);
      expect(sections).toContain('limitations');
    });
  });

  describe('language support', () => {
    it('should generate Chinese titles when language is zh', async () => {
      const input = { ...mockInput, language: 'zh' };
      const result = await executePaperToPPTOutline(input);
      
      expect(result.success).toBe(true);
      // Title slide should still use paper title
      const introSlide = result.outline!.find(item => item.section === 'introduction');
      expect(introSlide?.title).toBe('引言');
    });
  });
});
