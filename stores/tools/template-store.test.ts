/**
 * Tests for Template Store
 */

import { act } from '@testing-library/react';
import { useTemplateStore } from './template-store';

describe('useTemplateStore', () => {
  beforeEach(() => {
    useTemplateStore.setState({
      templates: [],
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useTemplateStore.getState();
      expect(state.templates).toEqual([]);
    });
  });

  describe('createTemplate', () => {
    it('should create template with required fields', () => {
      let template;
      act(() => {
        template = useTemplateStore.getState().createTemplate({
          name: 'Test Template',
          description: 'A test template',
          category: 'coding',
          systemPrompt: 'You are a coding assistant',
        });
      });

      const state = useTemplateStore.getState();
      expect(state.templates).toHaveLength(1);
      expect(template!.name).toBe('Test Template');
      expect(template!.category).toBe('coding');
      expect(template!.isBuiltIn).toBe(false);
    });

    it('should create template with all options', () => {
      let template;
      act(() => {
        template = useTemplateStore.getState().createTemplate({
          name: 'Full Template',
          description: 'Complete template',
          icon: '🔧',
          category: 'writing',
          systemPrompt: 'You are a writer',
          initialMessage: 'Hello!',
          suggestedQuestions: ['Q1?', 'Q2?'],
          provider: 'anthropic',
          model: 'claude-3',
        });
      });

      expect(template!.icon).toBe('🔧');
      expect(template!.initialMessage).toBe('Hello!');
      expect(template!.suggestedQuestions).toEqual(['Q1?', 'Q2?']);
      expect(template!.provider).toBe('anthropic');
    });
  });

  describe('updateTemplate', () => {
    it('should update non-builtin template', () => {
      let template;
      act(() => {
        template = useTemplateStore.getState().createTemplate({
          name: 'Original',
          description: 'Desc',
          category: 'general',
          systemPrompt: 'Test',
        });
      });

      act(() => {
        useTemplateStore.getState().updateTemplate(template!.id, { name: 'Updated' });
      });

      expect(useTemplateStore.getState().templates[0].name).toBe('Updated');
    });

    it('should not update builtin template', () => {
      useTemplateStore.setState({
        templates: [
          {
            id: 'builtin-1',
            name: 'Built-in',
            description: 'Builtin template',
            icon: '📝',
            category: 'general',
            systemPrompt: 'Test',
            isBuiltIn: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      act(() => {
        useTemplateStore.getState().updateTemplate('builtin-1', { name: 'Changed' });
      });

      expect(useTemplateStore.getState().templates[0].name).toBe('Built-in');
    });
  });

  describe('deleteTemplate', () => {
    it('should delete non-builtin template', () => {
      let template;
      act(() => {
        template = useTemplateStore.getState().createTemplate({
          name: 'To Delete',
          description: 'Desc',
          category: 'general',
          systemPrompt: 'Test',
        });
      });

      act(() => {
        useTemplateStore.getState().deleteTemplate(template!.id);
      });

      expect(useTemplateStore.getState().templates).toHaveLength(0);
    });

    it('should not delete builtin template', () => {
      useTemplateStore.setState({
        templates: [
          {
            id: 'builtin-1',
            name: 'Built-in',
            description: 'Builtin template',
            icon: '📝',
            category: 'general',
            systemPrompt: 'Test',
            isBuiltIn: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      act(() => {
        useTemplateStore.getState().deleteTemplate('builtin-1');
      });

      expect(useTemplateStore.getState().templates).toHaveLength(1);
    });
  });

  describe('duplicateTemplate', () => {
    it('should duplicate template', () => {
      let original;
      act(() => {
        original = useTemplateStore.getState().createTemplate({
          name: 'Original',
          description: 'Test',
          category: 'coding',
          systemPrompt: 'Prompt',
        });
      });

      let duplicate;
      act(() => {
        duplicate = useTemplateStore.getState().duplicateTemplate(original!.id);
      });

      expect(duplicate).not.toBeNull();
      expect(duplicate!.name).toBe('Original (Copy)');
      expect(duplicate!.category).toBe('coding');
      expect(duplicate!.isBuiltIn).toBe(false);
    });

    it('should return null for non-existent template', () => {
      const duplicate = useTemplateStore.getState().duplicateTemplate('non-existent');
      expect(duplicate).toBeNull();
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      useTemplateStore.setState({
        templates: [
          {
            id: 'builtin-1',
            name: 'Built-in',
            description: 'Builtin',
            icon: '📝',
            category: 'general',
            systemPrompt: 'Test',
            isBuiltIn: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'custom-1',
            name: 'Custom Coding',
            description: 'Custom',
            icon: '💻',
            category: 'coding',
            systemPrompt: 'Code',
            isBuiltIn: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
    });

    it('should get template by id', () => {
      expect(useTemplateStore.getState().getTemplate('builtin-1')).toBeDefined();
      expect(useTemplateStore.getState().getTemplate('non-existent')).toBeUndefined();
    });

    it('should get templates by category', () => {
      const coding = useTemplateStore.getState().getTemplatesByCategory('coding');
      expect(coding).toHaveLength(1);
      expect(coding[0].category).toBe('coding');
    });

    it('should get builtin templates', () => {
      const builtins = useTemplateStore.getState().getBuiltInTemplates();
      expect(builtins).toHaveLength(1);
      expect(builtins[0].isBuiltIn).toBe(true);
    });

    it('should get custom templates', () => {
      const customs = useTemplateStore.getState().getCustomTemplates();
      expect(customs).toHaveLength(1);
      expect(customs[0].isBuiltIn).toBe(false);
    });

    it('should search templates', () => {
      const results = useTemplateStore.getState().searchTemplates('Coding');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Custom Coding');
    });
  });
});
