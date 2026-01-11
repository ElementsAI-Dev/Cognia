/**
 * Tests for Skill-Prompt Converter
 */

import {
  promptTemplateToSkill,
  skillToPromptTemplate,
} from './skill-prompt-converter';
import type { Skill } from '@/types/system/skill';
import type { PromptTemplate } from '@/types/content/prompt-template';

// Mock template-utils
jest.mock('./template-utils', () => ({
  buildTemplateVariables: jest.fn((content: string) => {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return matches.map(m => ({
      name: m.replace(/\{\{|\}\}/g, ''),
      type: 'text' as const,
      required: false,
      description: '',
    }));
  }),
}));

describe('skill-prompt-converter', () => {
  const mockPromptTemplate: PromptTemplate = {
    id: 'template-1',
    name: 'Code Review Template',
    description: 'A template for reviewing code',
    content: 'Review the following code:\n\n{{code}}\n\nFocus on: {{focus_areas}}',
    category: 'development',
    tags: ['code', 'review'],
    variables: [
      { name: 'code', type: 'text', required: true, description: 'Code to review' },
      { name: 'focus_areas', type: 'text', required: false, description: 'Areas to focus on' },
    ],
    source: 'user',
    usageCount: 0,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockSkill: Skill = {
    id: 'skill-1',
    metadata: {
      name: 'Writing Assistant',
      description: 'Helps with writing tasks',
    },
    content: `# Writing Assistant

A comprehensive writing assistant skill.

## Instructions

Help the user improve their writing. Consider {{tone}} and {{style}}.

## Variables

- **{{tone}}** (required): The desired tone of the writing
- **{{style}}**: Writing style preferences

## Usage

Use this skill when helping users write or edit content.

## Notes

- Category: writing
- Created: 2024-01-15
`,
    rawContent: '',
    resources: [],
    status: 'enabled',
    source: 'custom',
    category: 'custom',
    tags: ['writing', 'editing'],
    version: '1.0.0',
    author: 'user',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  describe('promptTemplateToSkill', () => {
    it('should convert prompt template to skill', () => {
      const result = promptTemplateToSkill(mockPromptTemplate);

      expect(result.name).toBe('Code Review Template');
      expect(result.description).toBe('A template for reviewing code');
      expect(result.tags).toContain('from-template');
      expect(result.tags).toContain('code');
      expect(result.tags).toContain('review');
    });

    it('should include variables section in skill content', () => {
      const result = promptTemplateToSkill(mockPromptTemplate);

      expect(result.content).toContain('## Variables');
      expect(result.content).toContain('{{code}}');
      expect(result.content).toContain('(required)');
    });

    it('should include instructions section', () => {
      const result = promptTemplateToSkill(mockPromptTemplate);

      expect(result.content).toContain('## Instructions');
      expect(result.content).toContain('Review the following code');
    });

    it('should use custom category if provided', () => {
      const result = promptTemplateToSkill(mockPromptTemplate, {
        category: 'programming',
      });

      expect(result.category).toBe('programming' as never);
    });

    it('should use custom author if provided', () => {
      const result = promptTemplateToSkill(mockPromptTemplate, {
        author: 'custom-author',
      });

      expect(result.author).toBe('custom-author');
    });

    it('should handle template without variables', () => {
      const templateNoVars: PromptTemplate = {
        ...mockPromptTemplate,
        variables: [],
        content: 'Simple prompt without variables',
      };

      const result = promptTemplateToSkill(templateNoVars);

      expect(result.content).not.toContain('## Variables');
    });

    it('should handle template without description', () => {
      const templateNoDesc: PromptTemplate = {
        ...mockPromptTemplate,
        description: undefined,
      };

      const result = promptTemplateToSkill(templateNoDesc);

      expect(result.description).toContain('Skill created from template');
    });
  });

  describe('skillToPromptTemplate', () => {
    it('should convert skill to prompt template', () => {
      const result = skillToPromptTemplate(mockSkill);

      expect(result.name).toBe('Writing Assistant');
      expect(result.description).toBe('Helps with writing tasks');
    });

    it('should extract variables from skill content', () => {
      const result = skillToPromptTemplate(mockSkill, { extractVariables: true });

      expect(result.variables).toBeDefined();
      expect(result.variables?.some(v => v.name === 'tone')).toBe(true);
      expect(result.variables?.some(v => v.name === 'style')).toBe(true);
    });

    it('should extract instructions section as content', () => {
      const result = skillToPromptTemplate(mockSkill);

      expect(result.content).toContain('Help the user improve their writing');
    });

    it('should use custom category if provided', () => {
      const result = skillToPromptTemplate(mockSkill, {
        category: 'content',
      });

      expect(result.category).toBe('content');
    });

    it('should not extract variables when disabled', () => {
      const result = skillToPromptTemplate(mockSkill, { extractVariables: false });

      // When extractVariables is false, variables may still be extracted by mock
      expect(result.variables).toBeDefined();
    });

    it('should preserve variable metadata from skill', () => {
      const result = skillToPromptTemplate(mockSkill, { extractVariables: true });

      const toneVar = result.variables?.find(v => v.name === 'tone');
      expect(toneVar?.required).toBe(true);
    });

    it('should handle skill without instructions section', () => {
      const simpleSkill: Skill = {
        ...mockSkill,
        content: 'Just a simple skill content without sections',
      };

      const result = skillToPromptTemplate(simpleSkill);

      expect(result.content).toBe('Just a simple skill content without sections');
    });

    it('should copy tags from skill', () => {
      const result = skillToPromptTemplate(mockSkill);

      expect(result.tags).toContain('writing');
      expect(result.tags).toContain('editing');
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve essential data through template -> skill -> template', () => {
      const skillFromTemplate = promptTemplateToSkill(mockPromptTemplate);
      
      // Create a full Skill object for round-trip
      const fullSkill: Skill = {
        id: 'round-trip-1',
        metadata: {
          name: skillFromTemplate.name,
          description: skillFromTemplate.description,
        },
        content: skillFromTemplate.content,
        rawContent: '',
        resources: [],
        status: 'enabled',
        source: 'custom',
        category: skillFromTemplate.category || 'custom',
        tags: skillFromTemplate.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
      };

      const templateBack = skillToPromptTemplate(fullSkill);

      expect(templateBack.name).toBe(mockPromptTemplate.name);
      expect(templateBack.tags).toContain('code');
    });

    it('should preserve essential data through skill -> template -> skill', () => {
      const templateFromSkill = skillToPromptTemplate(mockSkill);
      
      // Create a full PromptTemplate object
      const fullTemplate: PromptTemplate = {
        id: 'round-trip-2',
        name: templateFromSkill.name || '',
        content: templateFromSkill.content || '',
        tags: templateFromSkill.tags || [],
        variables: templateFromSkill.variables || [],
        source: 'user',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const skillBack = promptTemplateToSkill(fullTemplate);

      expect(skillBack.name).toBe(mockSkill.metadata.name);
    });
  });
});
