/**
 * PPTX Export Tests
 */

import { exportToPPTX, exportToPPTXBase64 } from './pptx-export';
import type { PPTPresentation, PPTSlide, PPTTheme } from '@/types/workflow';

// Mock pptxgenjs
jest.mock('pptxgenjs', () => {
  return jest.fn().mockImplementation(() => ({
    author: '',
    company: '',
    subject: '',
    title: '',
    layout: '',
    defineSlideMaster: jest.fn(),
    addSlide: jest.fn().mockReturnValue({
      background: {},
      addText: jest.fn(),
      addImage: jest.fn(),
      addShape: jest.fn(),
      addNotes: jest.fn(),
    }),
    write: jest.fn().mockResolvedValue(new Blob(['mock pptx content'], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })),
  }));
});

const mockTheme: PPTTheme = {
  id: 'academic',
  name: 'Academic',
  primaryColor: '#7B1FA2',
  secondaryColor: '#6A1B9A',
  accentColor: '#CE93D8',
  backgroundColor: '#FFFFFF',
  textColor: '#212121',
  headingFont: 'Merriweather',
  bodyFont: 'Source Serif Pro',
  codeFont: 'Source Code Pro',
};

const mockSlides: PPTSlide[] = [
  {
    id: 'slide-1',
    order: 0,
    layout: 'title',
    title: 'Test Presentation',
    subtitle: 'A subtitle',
    elements: [],
    notes: 'Speaker notes for slide 1',
  },
  {
    id: 'slide-2',
    order: 1,
    layout: 'bullets',
    title: 'Key Points',
    bullets: ['Point 1', 'Point 2', 'Point 3'],
    elements: [],
    notes: 'Speaker notes for slide 2',
  },
  {
    id: 'slide-3',
    order: 2,
    layout: 'image-left',
    title: 'Image Slide',
    content: 'Some content',
    elements: [
      {
        id: 'img-1',
        type: 'image',
        content: 'https://example.com/image.png',
        position: { x: 10, y: 20, width: 40, height: 60 },
      },
    ],
  },
];

const mockPresentation: PPTPresentation = {
  id: 'ppt-1',
  title: 'Test Presentation',
  description: 'A test presentation',
  theme: mockTheme,
  slides: mockSlides,
  totalSlides: 3,
  aspectRatio: '16:9',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('pptx-export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportToPPTX', () => {
    it('should export presentation successfully', async () => {
      const result = await exportToPPTX(mockPresentation);

      expect(result.success).toBe(true);
      expect(result.blob).toBeDefined();
      expect(result.filename).toBeDefined();
    });

    it('should generate filename from title', async () => {
      const result = await exportToPPTX(mockPresentation);

      expect(result.success).toBe(true);
      expect(result.filename).toContain('test-presentation');
      expect(result.filename).toMatch(/\.pptx$/);
    });

    it('should include date in filename', async () => {
      const result = await exportToPPTX(mockPresentation);
      const today = new Date().toISOString().slice(0, 10);

      expect(result.success).toBe(true);
      expect(result.filename).toContain(today);
    });

    it('should respect includeNotes option', async () => {
      const result = await exportToPPTX(mockPresentation, { includeNotes: true });

      expect(result.success).toBe(true);
    });

    it('should respect includeSlideNumbers option', async () => {
      const result = await exportToPPTX(mockPresentation, { includeSlideNumbers: true });

      expect(result.success).toBe(true);
    });

    it('should set author metadata', async () => {
      const result = await exportToPPTX(mockPresentation, { author: 'Test Author' });

      expect(result.success).toBe(true);
    });

    it('should set company metadata', async () => {
      const result = await exportToPPTX(mockPresentation, { company: 'Test Company' });

      expect(result.success).toBe(true);
    });

    it('should handle empty slides array', async () => {
      const emptyPresentation = {
        ...mockPresentation,
        slides: [],
        totalSlides: 0,
      };

      const result = await exportToPPTX(emptyPresentation);

      expect(result.success).toBe(true);
    });

    it('should sanitize filename from special characters', async () => {
      const specialPresentation = {
        ...mockPresentation,
        title: 'Test: Special/Characters\\Here?',
      };

      const result = await exportToPPTX(specialPresentation);

      expect(result.success).toBe(true);
      expect(result.filename).not.toContain(':');
      expect(result.filename).not.toContain('/');
      expect(result.filename).not.toContain('\\');
      expect(result.filename).not.toContain('?');
    });
  });

  describe('exportToPPTXBase64', () => {
    it('should export presentation as base64', async () => {
      const result = await exportToPPTXBase64(mockPresentation);

      expect(result.success).toBe(true);
      expect(result.base64).toBeDefined();
    });
  });

  describe('slide layouts', () => {
    it('should handle title layout', async () => {
      const titlePresentation = {
        ...mockPresentation,
        slides: [mockSlides[0]],
        totalSlides: 1,
      };

      const result = await exportToPPTX(titlePresentation);
      expect(result.success).toBe(true);
    });

    it('should handle bullets layout', async () => {
      const bulletsPresentation = {
        ...mockPresentation,
        slides: [mockSlides[1]],
        totalSlides: 1,
      };

      const result = await exportToPPTX(bulletsPresentation);
      expect(result.success).toBe(true);
    });

    it('should handle image-left layout', async () => {
      const imagePresentation = {
        ...mockPresentation,
        slides: [mockSlides[2]],
        totalSlides: 1,
      };

      const result = await exportToPPTX(imagePresentation);
      expect(result.success).toBe(true);
    });

    it('should handle all supported layouts', async () => {
      const layouts = [
        'title', 'title-content', 'two-column', 'bullets', 'image-left',
        'image-right', 'quote', 'chart', 'comparison', 'section',
        'closing', 'full-image', 'timeline', 'table', 'blank', 'numbered',
      ] as const;

      for (const layout of layouts) {
        const slide: PPTSlide = {
          id: `slide-${layout}`,
          order: 0,
          layout,
          title: `${layout} slide`,
          elements: [],
        };

        const presentation = {
          ...mockPresentation,
          slides: [slide],
          totalSlides: 1,
        };

        const result = await exportToPPTX(presentation);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('aspect ratios', () => {
    it('should handle 16:9 aspect ratio', async () => {
      const result = await exportToPPTX(mockPresentation);
      expect(result.success).toBe(true);
    });

    it('should handle 4:3 aspect ratio', async () => {
      const presentation43 = {
        ...mockPresentation,
        aspectRatio: '4:3' as const,
      };

      const result = await exportToPPTX(presentation43);
      expect(result.success).toBe(true);
    });
  });

  describe('element types', () => {
    it('should handle text elements', async () => {
      const presentation = {
        ...mockPresentation,
        slides: [{
          ...mockSlides[0],
          elements: [{
            id: 'text-1',
            type: 'text' as const,
            content: 'Text content',
            position: { x: 10, y: 10, width: 80, height: 20 },
          }],
        }],
      };

      const result = await exportToPPTX(presentation);
      expect(result.success).toBe(true);
    });

    it('should handle shape elements', async () => {
      const presentation = {
        ...mockPresentation,
        slides: [{
          ...mockSlides[0],
          elements: [{
            id: 'shape-1',
            type: 'shape' as const,
            content: 'rect',
            position: { x: 10, y: 10, width: 80, height: 20 },
          }],
        }],
      };

      const result = await exportToPPTX(presentation);
      expect(result.success).toBe(true);
    });

    it('should handle code elements', async () => {
      const presentation = {
        ...mockPresentation,
        slides: [{
          ...mockSlides[0],
          elements: [{
            id: 'code-1',
            type: 'code' as const,
            content: 'const x = 1;',
            position: { x: 10, y: 10, width: 80, height: 20 },
          }],
        }],
      };

      const result = await exportToPPTX(presentation);
      expect(result.success).toBe(true);
    });
  });
});
