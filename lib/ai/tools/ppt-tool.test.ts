/**
 * PPT Tool Tests
 */

import {
  executePPTOutline,
  executePPTSlideContent,
  executePPTFinalize,
  executePPTExport,
  pptOutlineInputSchema,
  pptSlideContentInputSchema,
  type PPTToolResult,
} from './ppt-tool';
import type { PPTPresentation, PPTOutlineItem, PPTSlide } from '@/types/workflow';

interface OutlineResult extends PPTToolResult {
  data?: {
    outline: PPTOutlineItem[];
    topic: string;
    slideCount: number;
  };
}

interface SlideResult extends PPTToolResult {
  data?: {
    slides: PPTSlide[];
    slideCount: number;
  };
}

interface FinalizeResult extends PPTToolResult {
  data?: {
    presentation: PPTPresentation;
    marpContent: string;
  };
}

interface ExportResult extends PPTToolResult {
  data?: {
    format: string;
    content: string;
    filename: string;
  };
}

describe('PPT Tools', () => {
  describe('pptOutlineInputSchema', () => {
    it('should validate valid input', () => {
      const input = {
        topic: 'Introduction to AI',
        slideCount: 10,
        style: 'professional',
      };

      const result = pptOutlineInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should require topic', () => {
      const input = {
        slideCount: 10,
      };

      const result = pptOutlineInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should validate slideCount range', () => {
      const input = {
        topic: 'Test',
        slideCount: 100, // exceeds max of 50
      };

      const result = pptOutlineInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should use default values', () => {
      const input = {
        topic: 'Test Topic',
      };

      const result = pptOutlineInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slideCount).toBe(10);
        expect(result.data.style).toBe('professional');
        expect(result.data.language).toBe('en');
      }
    });
  });

  describe('executePPTOutline', () => {
    it('should generate outline with correct structure', () => {
      const result = executePPTOutline({
        topic: 'Introduction to Machine Learning',
        slideCount: 5,
        style: 'professional',
        language: 'en',
      }) as OutlineResult;

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.outline).toBeDefined();
      expect(Array.isArray(result.data?.outline)).toBe(true);
    });

    it('should include title and closing slides', () => {
      const result = executePPTOutline({
        topic: 'Test Presentation',
        slideCount: 5,
        style: 'minimal',
        language: 'en',
      }) as OutlineResult;

      expect(result.success).toBe(true);
      const outline = result.data?.outline as Array<{ suggestedLayout: string }>;
      
      // First slide should be title
      expect(outline[0].suggestedLayout).toBe('title');
      
      // Last slide should be closing
      expect(outline[outline.length - 1].suggestedLayout).toBe('closing');
    });

    it('should generate correct number of slides', () => {
      const slideCount = 8;
      const result = executePPTOutline({
        topic: 'Test',
        slideCount,
        style: 'professional',
        language: 'en',
      }) as OutlineResult;

      expect(result.success).toBe(true);
      expect(result.data?.slideCount).toBe(slideCount);
    });
  });

  describe('pptSlideContentInputSchema', () => {
    it('should validate valid input', () => {
      const input = {
        outline: [
          { id: 's1', title: 'Intro', suggestedLayout: 'title', order: 0 },
        ],
        style: 'professional',
      };

      const result = pptSlideContentInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('executePPTSlideContent', () => {
    it('should generate slides from outline', () => {
      const outline = [
        { id: 's1', title: 'Introduction', suggestedLayout: 'title', order: 0 },
        { id: 's2', title: 'Main Content', suggestedLayout: 'bullets', order: 1, keyPoints: ['Point 1', 'Point 2'] },
        { id: 's3', title: 'Conclusion', suggestedLayout: 'closing', order: 2 },
      ];

      const result = executePPTSlideContent({
        outline,
        style: 'professional',
        language: 'en',
      }) as SlideResult;

      expect(result.success).toBe(true);
      expect(result.data?.slides).toHaveLength(3);
    });

    it('should preserve outline structure in slides', () => {
      const outline = [
        { id: 'custom-id', title: 'Custom Title', suggestedLayout: 'two-column', order: 0 },
      ];

      const result = executePPTSlideContent({
        outline,
        language: 'en',
      }) as SlideResult;

      expect(result.success).toBe(true);
      const slides = result.data?.slides as Array<{ id: string; title: string; layout: string }>;
      expect(slides[0].id).toBe('custom-id');
      expect(slides[0].title).toBe('Custom Title');
      expect(slides[0].layout).toBe('two-column');
    });
  });

  describe('executePPTFinalize', () => {
    it('should create presentation object', () => {
      const result = executePPTFinalize({
        topic: 'Test Presentation',
        outline: [{ id: 's1', title: 'Intro', suggestedLayout: 'title', order: 0 }],
        designedSlides: [{ id: 's1', title: 'Intro', layout: 'title', order: 0, elements: [] }],
      }) as FinalizeResult;

      expect(result.success).toBe(true);
      expect(result.data?.presentation).toBeDefined();
    });

    it('should generate Marp content', () => {
      const result = executePPTFinalize({
        topic: 'Test Presentation',
        outline: [{ id: 's1', title: 'Test Title', suggestedLayout: 'title', order: 0 }],
        designedSlides: [{ id: 's1', title: 'Test Title', layout: 'title', order: 0, elements: [] }],
      }) as FinalizeResult;

      expect(result.success).toBe(true);
      expect(result.data?.marpContent).toBeDefined();
      expect(typeof result.data?.marpContent).toBe('string');
    });
  });

  describe('executePPTExport', () => {
    const mockPresentation: PPTPresentation = {
      id: 'test-ppt',
      title: 'Test Presentation',
      theme: {
        id: 'modern',
        name: 'Modern',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        accentColor: '#60A5FA',
        backgroundColor: '#FFFFFF',
        textColor: '#1E293B',
        headingFont: 'Inter',
        bodyFont: 'Inter',
        codeFont: 'JetBrains Mono',
      },
      slides: [
        {
          id: 's1',
          order: 0,
          layout: 'title',
          title: 'Test Title',
          subtitle: 'Test Subtitle',
          elements: [],
        },
        {
          id: 's2',
          order: 1,
          layout: 'bullets',
          title: 'Bullet Points',
          bullets: ['Point 1', 'Point 2', 'Point 3'],
          elements: [],
        },
      ],
      totalSlides: 2,
      aspectRatio: '16:9',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should export to Marp format', () => {
      const result = executePPTExport({
        presentation: mockPresentation,
        format: 'marp',
        includeNotes: true,
        includeAnimations: false,
        quality: 'medium',
      }) as ExportResult;

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('marp');
      expect(result.data?.content).toContain('marp: true');
      expect(result.data?.filename).toContain('.md');
    });

    it('should export to HTML format', () => {
      const result = executePPTExport({
        presentation: mockPresentation,
        format: 'html',
        includeNotes: true,
        includeAnimations: false,
        quality: 'medium',
      }) as ExportResult;

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('html');
      expect(result.data?.content).toContain('<!DOCTYPE html>');
      expect(result.data?.filename).toContain('.html');
    });

    it('should export to Reveal.js format', () => {
      const result = executePPTExport({
        presentation: mockPresentation,
        format: 'reveal',
        includeNotes: true,
        includeAnimations: false,
        quality: 'medium',
      }) as ExportResult;

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('reveal');
      expect(result.data?.content).toContain('reveal.js');
    });

    it('should export to PDF format', () => {
      const result = executePPTExport({
        presentation: mockPresentation,
        format: 'pdf',
        includeNotes: true,
        includeAnimations: false,
        quality: 'medium',
      }) as ExportResult;

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('pdf');
      expect(result.data?.content).toContain('<!DOCTYPE html>');
      expect(result.data?.content).toContain('Save as PDF');
      expect(result.data?.filename).toContain('.pdf');
    });

    it('should export to PPTX format', () => {
      const result = executePPTExport({
        presentation: mockPresentation,
        format: 'pptx',
        includeNotes: true,
        includeAnimations: false,
        quality: 'medium',
      }) as ExportResult;

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('pptx');
      expect(result.data?.content).toContain('pptxgenjs');
      expect(result.data?.filename).toContain('.pptx');
    });

    it('should include slide content in exported Marp', () => {
      const result = executePPTExport({
        presentation: mockPresentation,
        format: 'marp',
        includeNotes: true,
        includeAnimations: false,
        quality: 'medium',
      }) as ExportResult;

      expect(result.success).toBe(true);
      const content = result.data?.content as string;
      expect(content).toContain('Test Title');
      expect(content).toContain('Point 1');
      expect(content).toContain('Point 2');
    });
  });
});
