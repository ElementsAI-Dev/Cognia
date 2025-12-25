/**
 * PPT Workflow Tests
 * Tests for PPT generation workflow, Marp generation, and parsing functions
 */

import {
  PPT_GENERATION_WORKFLOW,
  PPT_WORKFLOW_TEMPLATES,
  registerPPTWorkflow,
  parseOutlineResponse,
  parseSlidesResponse,
  buildPresentation,
  generateMarpMarkdown,
} from './ppt-workflow';
import { getGlobalWorkflowRegistry, resetGlobalWorkflowRegistry } from './registry';
import type { PPTOutlineItem, PPTSlide, PPTPresentation } from '@/types/workflow';

describe('PPT Workflow', () => {
  beforeEach(() => {
    resetGlobalWorkflowRegistry();
  });

  describe('PPT_GENERATION_WORKFLOW', () => {
    it('should have correct workflow structure', () => {
      expect(PPT_GENERATION_WORKFLOW.id).toBe('ppt-generation');
      expect(PPT_GENERATION_WORKFLOW.name).toBe('PPT Generation');
      expect(PPT_GENERATION_WORKFLOW.type).toBe('ppt-generation');
    });

    it('should have required inputs defined', () => {
      expect(PPT_GENERATION_WORKFLOW.inputs.topic).toBeDefined();
      expect(PPT_GENERATION_WORKFLOW.inputs.topic.required).toBe(true);
    });

    it('should have required outputs defined', () => {
      expect(PPT_GENERATION_WORKFLOW.outputs.presentation).toBeDefined();
      expect(PPT_GENERATION_WORKFLOW.outputs.outline).toBeDefined();
      expect(PPT_GENERATION_WORKFLOW.outputs.marpContent).toBeDefined();
    });

    it('should have all 6 steps defined', () => {
      expect(PPT_GENERATION_WORKFLOW.steps).toHaveLength(6);
      
      const stepIds = PPT_GENERATION_WORKFLOW.steps.map(s => s.id);
      expect(stepIds).toContain('analyze-requirements');
      expect(stepIds).toContain('generate-outline');
      expect(stepIds).toContain('generate-slides');
      expect(stepIds).toContain('apply-design');
      expect(stepIds).toContain('generate-marp');
      expect(stepIds).toContain('finalize');
    });

    it('should have correct step dependencies', () => {
      const outlineStep = PPT_GENERATION_WORKFLOW.steps.find(s => s.id === 'generate-outline');
      expect(outlineStep?.dependencies).toContain('analyze-requirements');

      const slidesStep = PPT_GENERATION_WORKFLOW.steps.find(s => s.id === 'generate-slides');
      expect(slidesStep?.dependencies).toContain('generate-outline');

      const finalizeStep = PPT_GENERATION_WORKFLOW.steps.find(s => s.id === 'finalize');
      expect(finalizeStep?.dependencies).toContain('generate-marp');
    });

    it('should have AI prompts for AI steps', () => {
      const aiSteps = PPT_GENERATION_WORKFLOW.steps.filter(s => s.type === 'ai');
      
      for (const step of aiSteps) {
        expect(step.aiPrompt).toBeDefined();
        expect(step.aiPrompt?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('PPT_WORKFLOW_TEMPLATES', () => {
    it('should have 5 templates', () => {
      expect(PPT_WORKFLOW_TEMPLATES).toHaveLength(5);
    });

    it('should have business-pitch template', () => {
      const template = PPT_WORKFLOW_TEMPLATES.find(t => t.id === 'business-pitch');
      expect(template).toBeDefined();
      expect(template?.presetInputs.style).toBe('professional');
      expect(template?.presetInputs.slideCount).toBe(12);
    });

    it('should have product-launch template', () => {
      const template = PPT_WORKFLOW_TEMPLATES.find(t => t.id === 'product-launch');
      expect(template).toBeDefined();
      expect(template?.presetInputs.style).toBe('creative');
      expect(template?.presetInputs.slideCount).toBe(15);
    });

    it('should have educational template', () => {
      const template = PPT_WORKFLOW_TEMPLATES.find(t => t.id === 'educational');
      expect(template).toBeDefined();
      expect(template?.presetInputs.style).toBe('academic');
      expect(template?.presetInputs.slideCount).toBe(20);
    });

    it('should have project-update template', () => {
      const template = PPT_WORKFLOW_TEMPLATES.find(t => t.id === 'project-update');
      expect(template).toBeDefined();
      expect(template?.presetInputs.style).toBe('minimal');
    });

    it('should have quick-presentation template', () => {
      const template = PPT_WORKFLOW_TEMPLATES.find(t => t.id === 'quick-presentation');
      expect(template).toBeDefined();
      expect(template?.presetInputs.slideCount).toBe(5);
    });

    it('all templates should reference ppt-generation workflow', () => {
      for (const template of PPT_WORKFLOW_TEMPLATES) {
        expect(template.workflowId).toBe('ppt-generation');
      }
    });
  });

  describe('registerPPTWorkflow', () => {
    it('should register workflow with global registry', () => {
      registerPPTWorkflow();
      
      const registry = getGlobalWorkflowRegistry();
      const workflow = registry.get('ppt-generation');
      
      expect(workflow).toBeDefined();
      expect(workflow?.id).toBe('ppt-generation');
    });

    it('should register all templates', () => {
      registerPPTWorkflow();
      
      const registry = getGlobalWorkflowRegistry();
      const templates = registry.getAllTemplates();
      
      expect(templates.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('parseOutlineResponse', () => {
    it('should parse valid JSON array', () => {
      const response = JSON.stringify([
        { id: 's1', title: 'Introduction', suggestedLayout: 'title', order: 0 },
        { id: 's2', title: 'Content', suggestedLayout: 'bullets', order: 1 },
      ]);

      const result = parseOutlineResponse(response);
      
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Introduction');
      expect(result[1].title).toBe('Content');
    });

    it('should extract JSON from text with surrounding content', () => {
      const response = `Here is the outline:
      [
        {"id": "s1", "title": "Intro", "suggestedLayout": "title", "order": 0}
      ]
      That's the outline.`;

      const result = parseOutlineResponse(response);
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Intro');
    });

    it('should provide default values for missing fields', () => {
      const response = JSON.stringify([
        { title: 'Only Title' },
      ]);

      const result = parseOutlineResponse(response);
      
      expect(result[0].id).toBe('outline-0');
      expect(result[0].suggestedLayout).toBe('title-content');
      expect(result[0].order).toBe(0);
    });

    it('should return empty array for invalid JSON', () => {
      const result = parseOutlineResponse('not valid json');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      const result = parseOutlineResponse('');
      expect(result).toEqual([]);
    });

    it('should handle keyPoints array', () => {
      const response = JSON.stringify([
        { 
          id: 's1', 
          title: 'Points', 
          keyPoints: ['Point 1', 'Point 2', 'Point 3'],
          suggestedLayout: 'bullets',
          order: 0 
        },
      ]);

      const result = parseOutlineResponse(response);
      
      expect(result[0].keyPoints).toHaveLength(3);
      expect(result[0].keyPoints?.[0]).toBe('Point 1');
    });
  });

  describe('parseSlidesResponse', () => {
    it('should parse valid JSON array', () => {
      const response = JSON.stringify([
        { id: 's1', title: 'Slide 1', layout: 'title', order: 0 },
        { id: 's2', title: 'Slide 2', layout: 'bullets', order: 1, bullets: ['a', 'b'] },
      ]);

      const result = parseSlidesResponse(response);
      
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Slide 1');
      expect(result[1].bullets).toEqual(['a', 'b']);
    });

    it('should provide default values for missing fields', () => {
      const response = JSON.stringify([
        { title: 'Minimal Slide' },
      ]);

      const result = parseSlidesResponse(response);
      
      expect(result[0].id).toBe('slide-0');
      expect(result[0].layout).toBe('title-content');
      expect(result[0].order).toBe(0);
      expect(result[0].elements).toEqual([]);
    });

    it('should return empty array for invalid JSON', () => {
      const result = parseSlidesResponse('invalid');
      expect(result).toEqual([]);
    });

    it('should handle all slide properties', () => {
      const response = JSON.stringify([
        { 
          id: 's1', 
          title: 'Full Slide',
          subtitle: 'Subtitle',
          content: 'Content text',
          bullets: ['B1', 'B2'],
          notes: 'Speaker notes',
          layout: 'two-column',
          order: 0,
          backgroundColor: '#000000',
          backgroundImage: 'url(image.jpg)',
          elements: [{ id: 'e1', type: 'text', content: 'Element' }]
        },
      ]);

      const result = parseSlidesResponse(response);
      
      expect(result[0].subtitle).toBe('Subtitle');
      expect(result[0].content).toBe('Content text');
      expect(result[0].notes).toBe('Speaker notes');
      expect(result[0].backgroundColor).toBe('#000000');
      expect(result[0].backgroundImage).toBe('url(image.jpg)');
    });
  });

  describe('buildPresentation', () => {
    const mockOutline: PPTOutlineItem[] = [
      { id: 's1', title: 'Intro', suggestedLayout: 'title', order: 0 },
      { id: 's2', title: 'Content', suggestedLayout: 'bullets', order: 1 },
    ];

    const mockSlides: PPTSlide[] = [
      { id: 's1', title: 'Intro', layout: 'title', order: 0, elements: [] },
      { id: 's2', title: 'Content', layout: 'bullets', order: 1, bullets: ['A', 'B'], elements: [] },
    ];

    it('should build presentation with correct structure', () => {
      const result = buildPresentation(
        { topic: 'Test Topic', description: 'Test Desc' },
        mockOutline,
        mockSlides
      );

      expect(result.title).toBe('Test Topic');
      expect(result.description).toBe('Test Desc');
      expect(result.slides).toHaveLength(2);
      expect(result.outline).toEqual(mockOutline);
    });

    it('should generate unique ID', () => {
      const result1 = buildPresentation({ topic: 'T1' }, mockOutline, mockSlides);
      const result2 = buildPresentation({ topic: 'T2' }, mockOutline, mockSlides);

      expect(result1.id).not.toBe(result2.id);
    });

    it('should apply default theme when none provided', () => {
      const result = buildPresentation({ topic: 'Test' }, mockOutline, mockSlides);

      expect(result.theme.id).toBe('custom');
      expect(result.theme.primaryColor).toBe('#3B82F6');
      expect(result.theme.headingFont).toBe('Inter');
    });

    it('should apply custom theme when provided', () => {
      const result = buildPresentation(
        { topic: 'Test' },
        mockOutline,
        mockSlides,
        { primaryColor: '#FF0000', headingFont: 'Arial' }
      );

      expect(result.theme.primaryColor).toBe('#FF0000');
      expect(result.theme.headingFont).toBe('Arial');
    });

    it('should set correct metadata', () => {
      const result = buildPresentation(
        { 
          topic: 'Test', 
          targetAudience: 'Developers',
          style: 'professional',
          language: 'en'
        },
        mockOutline,
        mockSlides
      );

      expect(result.metadata?.targetAudience).toBe('Developers');
      expect(result.metadata?.style).toBe('professional');
      expect(result.metadata?.language).toBe('en');
    });

    it('should set timestamps', () => {
      const before = new Date();
      const result = buildPresentation({ topic: 'Test' }, mockOutline, mockSlides);
      const after = new Date();

      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(result.updatedAt.getTime()).toBe(result.createdAt.getTime());
    });

    it('should set default aspect ratio', () => {
      const result = buildPresentation({ topic: 'Test' }, mockOutline, mockSlides);
      expect(result.aspectRatio).toBe('16:9');
    });
  });

  describe('generateMarpMarkdown', () => {
    const mockPresentation: PPTPresentation = {
      id: 'test',
      title: 'Test Presentation',
      theme: {
        id: 'custom',
        name: 'Custom',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        accentColor: '#60A5FA',
        backgroundColor: '#FFFFFF',
        textColor: '#1E293B',
        headingFont: 'Inter',
        bodyFont: 'Roboto',
        codeFont: 'Mono',
      },
      slides: [
        { id: 's1', title: 'Title Slide', layout: 'title', order: 0, elements: [] },
        { 
          id: 's2', 
          title: 'Content Slide', 
          subtitle: 'Subtitle',
          content: 'Some content',
          bullets: ['Point 1', 'Point 2'],
          notes: 'Speaker notes',
          layout: 'title-content', 
          order: 1, 
          elements: [] 
        },
      ],
      totalSlides: 2,
      aspectRatio: '16:9',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should generate valid Marp frontmatter', () => {
      const result = generateMarpMarkdown(mockPresentation);

      expect(result).toContain('---');
      expect(result).toContain('marp: true');
      expect(result).toContain('paginate: true');
    });

    it('should include theme colors in frontmatter', () => {
      const result = generateMarpMarkdown(mockPresentation);

      expect(result).toContain('backgroundColor: #FFFFFF');
      expect(result).toContain('color: #1E293B');
    });

    it('should include custom fonts in style', () => {
      const result = generateMarpMarkdown(mockPresentation);

      expect(result).toContain('font-family: Roboto');
      expect(result).toContain('font-family: Inter');
    });

    it('should generate slide separators', () => {
      const result = generateMarpMarkdown(mockPresentation);
      
      // Count slide separators (should be n-1 for n slides)
      const separatorCount = (result.match(/^---$/gm) || []).length;
      // First --- is frontmatter end, subsequent are slide separators
      expect(separatorCount).toBeGreaterThanOrEqual(2);
    });

    it('should use h1 for title layout', () => {
      const result = generateMarpMarkdown(mockPresentation);
      expect(result).toContain('# Title Slide');
    });

    it('should use h2 for content slides', () => {
      const result = generateMarpMarkdown(mockPresentation);
      expect(result).toContain('## Content Slide');
    });

    it('should include subtitles as h3', () => {
      const result = generateMarpMarkdown(mockPresentation);
      expect(result).toContain('### Subtitle');
    });

    it('should include bullet points', () => {
      const result = generateMarpMarkdown(mockPresentation);
      expect(result).toContain('- Point 1');
      expect(result).toContain('- Point 2');
    });

    it('should include speaker notes as HTML comments', () => {
      const result = generateMarpMarkdown(mockPresentation);
      expect(result).toContain('<!--');
      expect(result).toContain('Speaker notes');
      expect(result).toContain('-->');
    });

    it('should handle slide with section layout', () => {
      const presentation: PPTPresentation = {
        ...mockPresentation,
        slides: [
          { id: 's1', title: 'Section Title', layout: 'section', order: 0, elements: [] },
        ],
      };

      const result = generateMarpMarkdown(presentation);
      expect(result).toContain('# Section Title');
    });

    it('should handle slide without optional fields', () => {
      const presentation: PPTPresentation = {
        ...mockPresentation,
        slides: [
          { id: 's1', layout: 'blank', order: 0, elements: [] },
        ],
      };

      // Should not throw
      expect(() => generateMarpMarkdown(presentation)).not.toThrow();
    });

    it('should handle empty slides array', () => {
      const presentation: PPTPresentation = {
        ...mockPresentation,
        slides: [],
      };

      const result = generateMarpMarkdown(presentation);
      // Should still have frontmatter
      expect(result).toContain('marp: true');
    });
  });
});
