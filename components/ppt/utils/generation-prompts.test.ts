/**
 * Generation Prompts Tests
 */

import {
  buildSystemPrompt,
  buildOutlinePrompt,
  buildSlideContentPrompt,
  buildImprovementPrompt,
  buildImagePrompt,
  suggestLayoutFromContent,
  generateSpeakerNotesPrompt,
  type GenerationContext,
} from './generation-prompts';
import type { PPTTheme } from '@/types/workflow';

const mockTheme: PPTTheme = {
  id: 'test-theme',
  name: 'Test Theme',
  primaryColor: '#2563EB',
  secondaryColor: '#1D4ED8',
  accentColor: '#3B82F6',
  backgroundColor: '#FFFFFF',
  textColor: '#1E293B',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  codeFont: 'JetBrains Mono',
};

describe('Generation Prompts', () => {
  describe('buildSystemPrompt', () => {
    it('should include base expertise and design principles', () => {
      const context: GenerationContext = {
        topic: 'Test Topic',
      };
      
      const result = buildSystemPrompt(context);
      
      expect(result).toContain('expert presentation designer');
      expect(result).toContain('Design Principles');
      expect(result).toContain('One idea per slide');
      expect(result).toContain('6x6 Rule');
    });

    it('should include audience guidance when provided', () => {
      const context: GenerationContext = {
        topic: 'Test Topic',
        audience: 'Software Engineers',
      };
      
      const result = buildSystemPrompt(context);
      
      expect(result).toContain('Target Audience: Software Engineers');
      expect(result).toContain('complexity');
    });

    it('should include purpose-specific guidance', () => {
      const purposes: GenerationContext['purpose'][] = [
        'informative',
        'persuasive',
        'educational',
        'pitch',
        'report',
      ];
      
      purposes.forEach(purpose => {
        const result = buildSystemPrompt({ topic: 'Test', purpose });
        expect(result).toContain(`Presentation Purpose: ${purpose}`);
      });
    });

    it('should include informative purpose guidance', () => {
      const result = buildSystemPrompt({ topic: 'Test', purpose: 'informative' });
      expect(result).toContain('clear explanations');
    });

    it('should include persuasive purpose guidance', () => {
      const result = buildSystemPrompt({ topic: 'Test', purpose: 'persuasive' });
      expect(result).toContain('compelling argument');
    });

    it('should include educational purpose guidance', () => {
      const result = buildSystemPrompt({ topic: 'Test', purpose: 'educational' });
      expect(result).toContain('learning');
    });

    it('should include pitch purpose guidance', () => {
      const result = buildSystemPrompt({ topic: 'Test', purpose: 'pitch' });
      expect(result).toContain('value propositions');
    });

    it('should include report purpose guidance', () => {
      const result = buildSystemPrompt({ topic: 'Test', purpose: 'report' });
      expect(result).toContain('data clearly');
    });

    it('should include tone-specific guidance', () => {
      const tones: GenerationContext['tone'][] = [
        'formal',
        'casual',
        'professional',
        'creative',
      ];
      
      tones.forEach(tone => {
        const result = buildSystemPrompt({ topic: 'Test', tone });
        expect(result).toContain(`Communication Tone: ${tone}`);
      });
    });

    it('should include formal tone guidance', () => {
      const result = buildSystemPrompt({ topic: 'Test', tone: 'formal' });
      expect(result).toContain('professional language');
    });

    it('should include casual tone guidance', () => {
      const result = buildSystemPrompt({ topic: 'Test', tone: 'casual' });
      expect(result).toContain('conversational');
    });
  });

  describe('buildOutlinePrompt', () => {
    it('should include the topic', () => {
      const context: GenerationContext = {
        topic: 'Machine Learning Basics',
      };
      
      const result = buildOutlinePrompt(context);
      
      expect(result).toContain('Machine Learning Basics');
    });

    it('should specify slide count', () => {
      const context: GenerationContext = {
        topic: 'Test',
        slideCount: 15,
      };
      
      const result = buildOutlinePrompt(context);
      
      expect(result).toContain('exactly 15 slides');
    });

    it('should default to 10 slides', () => {
      const context: GenerationContext = {
        topic: 'Test',
      };
      
      const result = buildOutlinePrompt(context);
      
      expect(result).toContain('exactly 10 slides');
    });

    it('should include JSON output format', () => {
      const result = buildOutlinePrompt({ topic: 'Test' });
      
      expect(result).toContain('Output Format (JSON)');
      expect(result).toContain('"title"');
      expect(result).toContain('"outline"');
      expect(result).toContain('"slideNumber"');
      expect(result).toContain('"layout"');
    });

    it('should include language instruction for non-English', () => {
      const result = buildOutlinePrompt({ topic: 'Test', language: 'zh-CN' });
      expect(result).toContain('Generate all content in zh-CN');
    });

    it('should not include language instruction for English', () => {
      const result = buildOutlinePrompt({ topic: 'Test', language: 'en' });
      expect(result).not.toContain('Generate all content in');
    });
  });

  describe('buildSlideContentPrompt', () => {
    it('should include slide information', () => {
      const result = buildSlideContentPrompt(
        { title: 'Introduction', layout: 'title-content' },
        { topic: 'AI' }
      );
      
      expect(result).toContain('Title: Introduction');
      expect(result).toContain('Layout: title-content');
    });

    it('should include key points when provided', () => {
      const result = buildSlideContentPrompt(
        { 
          title: 'Key Features',
          layout: 'bullets',
          keyPoints: ['Speed', 'Accuracy', 'Ease of use'],
        },
        { topic: 'Product' }
      );
      
      expect(result).toContain('Speed');
      expect(result).toContain('Accuracy');
      expect(result).toContain('Ease of use');
    });

    it('should include previous slide context', () => {
      const result = buildSlideContentPrompt(
        { title: 'Benefits', layout: 'bullets' },
        { topic: 'Product' },
        { title: 'Features', content: 'Key features' }
      );
      
      expect(result).toContain('Previous Slide: "Features"');
    });

    it('should include presentation context', () => {
      const result = buildSlideContentPrompt(
        { title: 'Overview', layout: 'title-content' },
        { topic: 'Data Science', audience: 'Executives', tone: 'professional' }
      );
      
      expect(result).toContain('Topic: Data Science');
      expect(result).toContain('Audience: Executives');
      expect(result).toContain('Tone: professional');
    });

    it('should include output format', () => {
      const result = buildSlideContentPrompt(
        { title: 'Test', layout: 'bullets' },
        { topic: 'Test' }
      );
      
      expect(result).toContain('Output Format (JSON)');
      expect(result).toContain('"bullets"');
      expect(result).toContain('"notes"');
    });
  });

  describe('buildImprovementPrompt', () => {
    const mockContent = {
      title: 'Original Title',
      subtitle: 'Original Subtitle',
      content: 'Some content here',
      bullets: ['Point 1', 'Point 2'],
    };

    it('should include current content', () => {
      const result = buildImprovementPrompt(mockContent, 'concise');
      
      expect(result).toContain('Original Title');
      expect(result).toContain('Original Subtitle');
      expect(result).toContain('Some content here');
      expect(result).toContain('Point 1');
      expect(result).toContain('Point 2');
    });

    it('should include concise improvement guidance', () => {
      const result = buildImprovementPrompt(mockContent, 'concise');
      expect(result).toContain('more concise');
      expect(result).toContain('Remove unnecessary words');
    });

    it('should include detailed improvement guidance', () => {
      const result = buildImprovementPrompt(mockContent, 'detailed');
      expect(result).toContain('Add more detail');
    });

    it('should include engaging improvement guidance', () => {
      const result = buildImprovementPrompt(mockContent, 'engaging');
      expect(result).toContain('more engaging');
      expect(result).toContain('hooks');
    });

    it('should include professional improvement guidance', () => {
      const result = buildImprovementPrompt(mockContent, 'professional');
      expect(result).toContain('professional business audience');
    });

    it('should include simplified improvement guidance', () => {
      const result = buildImprovementPrompt(mockContent, 'simplified');
      expect(result).toContain('Simplify');
      expect(result).toContain('clearer language');
    });

    it('should handle partial content', () => {
      const partialContent = { title: 'Only Title' };
      const result = buildImprovementPrompt(partialContent, 'concise');
      
      expect(result).toContain('Only Title');
      expect(result).not.toContain('Subtitle:');
      expect(result).not.toContain('Bullets:');
    });
  });

  describe('buildImagePrompt', () => {
    const slideContext = {
      title: 'Data Growth',
      content: 'Exponential increase in data',
      theme: mockTheme,
    };

    it('should include slide context', () => {
      const result = buildImagePrompt(slideContext);
      
      expect(result).toContain('Data Growth');
      expect(result).toContain('Exponential increase');
    });

    it('should include theme colors', () => {
      const result = buildImagePrompt(slideContext);
      
      expect(result).toContain(mockTheme.primaryColor);
      expect(result).toContain(mockTheme.accentColor);
      expect(result).toContain(mockTheme.backgroundColor);
    });

    it('should use illustration style by default', () => {
      const result = buildImagePrompt(slideContext);
      expect(result).toContain('illustration');
    });

    it('should handle photo style', () => {
      const result = buildImagePrompt(slideContext, 'photo');
      expect(result).toContain('photography');
      expect(result).toContain('realistic');
    });

    it('should handle icon style', () => {
      const result = buildImagePrompt(slideContext, 'icon');
      expect(result).toContain('simple icon');
      expect(result).toContain('minimal');
    });

    it('should handle diagram style', () => {
      const result = buildImagePrompt(slideContext, 'diagram');
      expect(result).toContain('clear diagram');
      expect(result).toContain('labeled');
    });

    it('should handle abstract style', () => {
      const result = buildImagePrompt(slideContext, 'abstract');
      expect(result).toContain('abstract art');
      expect(result).toContain('conceptual');
    });

    it('should include professional requirements', () => {
      const result = buildImagePrompt(slideContext);
      
      expect(result).toContain('Professional');
      expect(result).toContain('No text in the image');
      expect(result).toContain('business/educational presentation');
    });
  });

  describe('suggestLayoutFromContent', () => {
    it('should suggest comparison for vs/versus content', () => {
      expect(suggestLayoutFromContent('Feature A vs Feature B')).toBe('comparison');
      expect(suggestLayoutFromContent('Old versus New approach')).toBe('comparison');
      expect(suggestLayoutFromContent('Compare these options')).toBe('comparison');
    });

    it('should suggest timeline for process content', () => {
      expect(suggestLayoutFromContent('Step 1: Planning')).toBe('timeline');
      expect(suggestLayoutFromContent('The process involves')).toBe('timeline');
      expect(suggestLayoutFromContent('Project timeline')).toBe('timeline');
      expect(suggestLayoutFromContent('Phase one begins')).toBe('timeline');
    });

    it('should suggest chart for data content', () => {
      expect(suggestLayoutFromContent('The data shows')).toBe('chart');
      expect(suggestLayoutFromContent('Chart of revenues')).toBe('chart');
      expect(suggestLayoutFromContent('Graph visualization')).toBe('chart');
      expect(suggestLayoutFromContent('Statistics indicate')).toBe('chart');
      expect(suggestLayoutFromContent('Growth of 50%')).toBe('chart');
    });

    it('should suggest quote for quotation content', () => {
      expect(suggestLayoutFromContent('"Innovation is key"')).toBe('quote');
      expect(suggestLayoutFromContent('Famous quote from')).toBe('quote');
      expect(suggestLayoutFromContent('Einstein said something')).toBe('quote');
      expect(suggestLayoutFromContent('According to experts')).toBe('quote');
    });

    it('should suggest image-right for image content', () => {
      expect(suggestLayoutFromContent('Add an image here')).toBe('image-right');
      expect(suggestLayoutFromContent('Photo of the team')).toBe('image-right');
      expect(suggestLayoutFromContent('Picture showing')).toBe('image-right');
      expect(suggestLayoutFromContent('Visual representation')).toBe('image-right');
    });

    it('should suggest numbered for numbered list content', () => {
      const numberedContent = '1. First item\n2. Second item\n3. Third item';
      expect(suggestLayoutFromContent(numberedContent)).toBe('numbered');
    });

    it('should suggest bullets for bullet list content', () => {
      const bulletContent = '- First point\n- Second point\n- Third point';
      expect(suggestLayoutFromContent(bulletContent)).toBe('bullets');
    });

    it('should suggest two-column for long content', () => {
      const longContent = 'A '.repeat(300); // Over 500 characters
      expect(suggestLayoutFromContent(longContent)).toBe('two-column');
    });

    it('should default to title-content', () => {
      expect(suggestLayoutFromContent('Simple content')).toBe('title-content');
    });
  });

  describe('generateSpeakerNotesPrompt', () => {
    it('should include slide title', () => {
      const result = generateSpeakerNotesPrompt({ title: 'Introduction' });
      expect(result).toContain('Title: Introduction');
    });

    it('should include content when provided', () => {
      const result = generateSpeakerNotesPrompt({
        title: 'Overview',
        content: 'Main content here',
      });
      expect(result).toContain('Main Content: Main content here');
    });

    it('should include bullets when provided', () => {
      const result = generateSpeakerNotesPrompt({
        title: 'Key Points',
        bullets: ['First', 'Second', 'Third'],
      });
      
      expect(result).toContain('Bullet Points:');
      expect(result).toContain('- First');
      expect(result).toContain('- Second');
      expect(result).toContain('- Third');
    });

    it('should include requirements', () => {
      const result = generateSpeakerNotesPrompt({ title: 'Test' });
      
      expect(result).toContain('talking points');
      expect(result).toContain('transition phrases');
      expect(result).toContain('timing recommendations');
      expect(result).toContain('Q&A');
    });
  });
});
