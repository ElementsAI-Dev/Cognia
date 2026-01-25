/**
 * Tests for Designer Store
 */

import { act } from '@testing-library/react';
import { useDesignerStore } from './designer-store';
import type { DesignerElement } from '@/types/designer';

// Helper to create a mock element
const createMockElement = (id: string, tagName = 'div'): DesignerElement => ({
  id,
  tagName,
  className: '',
  attributes: {},
  styles: {},
  children: [],
  parentId: null,
});

describe('useDesignerStore', () => {
  beforeEach(() => {
    act(() => {
      useDesignerStore.getState().reset();
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useDesignerStore.getState();
      expect(state.mode).toBe('preview');
      expect(state.selectedElementId).toBeNull();
      expect(state.hoveredElementId).toBeNull();
      expect(state.elementTree).toBeNull();
      expect(state.viewport).toBe('desktop');
      expect(state.zoom).toBe(100);
      expect(state.code).toBe('');
      expect(state.isDirty).toBe(false);
    });
  });

  describe('mode', () => {
    it('should set mode', () => {
      act(() => {
        useDesignerStore.getState().setMode('design');
      });

      expect(useDesignerStore.getState().mode).toBe('design');
    });
  });

  describe('selection', () => {
    it('should select element', () => {
      act(() => {
        useDesignerStore.getState().selectElement('element-1');
      });

      expect(useDesignerStore.getState().selectedElementId).toBe('element-1');
    });

    it('should hover element', () => {
      act(() => {
        useDesignerStore.getState().hoverElement('element-1');
      });

      expect(useDesignerStore.getState().hoveredElementId).toBe('element-1');
    });
  });

  describe('element tree', () => {
    it('should set element tree and build map', () => {
      const tree: DesignerElement = {
        ...createMockElement('root'),
        children: [createMockElement('child-1'), createMockElement('child-2')],
      };

      act(() => {
        useDesignerStore.getState().setElementTree(tree);
      });

      const state = useDesignerStore.getState();
      expect(state.elementTree?.id).toBe('root');
      expect(state.elementMap['root']).toBeDefined();
      expect(state.elementMap['child-1']).toBeDefined();
      expect(state.elementMap['child-2']).toBeDefined();
    });

    it('should update element', () => {
      const tree = createMockElement('root');

      act(() => {
        useDesignerStore.getState().setElementTree(tree);
        useDesignerStore.getState().updateElement('root', { className: 'updated' });
      });

      expect(useDesignerStore.getState().elementTree?.className).toBe('updated');
      expect(useDesignerStore.getState().isDirty).toBe(true);
    });

    it('should update element style', () => {
      const tree = createMockElement('root');

      act(() => {
        useDesignerStore.getState().setElementTree(tree);
        useDesignerStore.getState().updateElementStyle('root', { color: 'red', fontSize: '16px' });
      });

      expect(useDesignerStore.getState().elementTree?.styles).toEqual({
        color: 'red',
        fontSize: '16px',
      });
    });

    it('should update element attribute', () => {
      const tree = createMockElement('root');

      act(() => {
        useDesignerStore.getState().setElementTree(tree);
        useDesignerStore.getState().updateElementAttribute('root', 'data-test', 'value');
      });

      expect(useDesignerStore.getState().elementTree?.attributes['data-test']).toBe('value');
    });

    it('should update element text', () => {
      const tree = createMockElement('root');

      act(() => {
        useDesignerStore.getState().setElementTree(tree);
        useDesignerStore.getState().updateElementText('root', 'Hello World');
      });

      expect(useDesignerStore.getState().elementTree?.textContent).toBe('Hello World');
    });

    it('should delete element', () => {
      const tree: DesignerElement = {
        ...createMockElement('root'),
        children: [createMockElement('child-1')],
      };

      act(() => {
        useDesignerStore.getState().setElementTree(tree);
        useDesignerStore.getState().selectElement('child-1');
        useDesignerStore.getState().deleteElement('child-1');
      });

      const state = useDesignerStore.getState();
      expect(state.elementTree?.children).toHaveLength(0);
      expect(state.selectedElementId).toBeNull();
    });
  });

  describe('viewport', () => {
    it('should set viewport', () => {
      act(() => {
        useDesignerStore.getState().setViewport('mobile');
      });

      expect(useDesignerStore.getState().viewport).toBe('mobile');
    });

    it('should set zoom', () => {
      act(() => {
        useDesignerStore.getState().setZoom(150);
      });

      expect(useDesignerStore.getState().zoom).toBe(150);
    });

    it('should clamp zoom to valid range', () => {
      act(() => {
        useDesignerStore.getState().setZoom(10);
      });
      expect(useDesignerStore.getState().zoom).toBe(25);

      act(() => {
        useDesignerStore.getState().setZoom(300);
      });
      expect(useDesignerStore.getState().zoom).toBe(200);
    });
  });

  describe('code', () => {
    it('should set code and add history', () => {
      act(() => {
        useDesignerStore.getState().setCode('<div>Hello</div>');
      });

      const state = useDesignerStore.getState();
      expect(state.code).toBe('<div>Hello</div>');
      expect(state.history).toHaveLength(1);
    });

    it('should set code without adding history', () => {
      act(() => {
        useDesignerStore.getState().setCode('<div>First</div>');
        useDesignerStore.getState().setCode('<div>Second</div>', false);
      });

      expect(useDesignerStore.getState().history).toHaveLength(1);
    });
  });

  describe('history', () => {
    beforeEach(() => {
      act(() => {
        useDesignerStore.getState().setCode('<div>1</div>');
        useDesignerStore.getState().setCode('<div>2</div>');
        useDesignerStore.getState().setCode('<div>3</div>');
      });
    });

    it('should undo', () => {
      act(() => {
        useDesignerStore.getState().undo();
      });

      expect(useDesignerStore.getState().code).toBe('<div>2</div>');
    });

    it('should redo', () => {
      act(() => {
        useDesignerStore.getState().undo();
        useDesignerStore.getState().redo();
      });

      expect(useDesignerStore.getState().code).toBe('<div>3</div>');
    });
  });

  describe('AI editing', () => {
    it('should set AI editing state', () => {
      act(() => {
        useDesignerStore.getState().setAIEditing(true);
      });

      expect(useDesignerStore.getState().isAIEditing).toBe(true);
    });

    it('should set AI edit prompt', () => {
      act(() => {
        useDesignerStore.getState().setAIEditPrompt('Make it blue');
      });

      expect(useDesignerStore.getState().aiEditPrompt).toBe('Make it blue');
    });
  });

  describe('panel states', () => {
    it('should toggle element tree', () => {
      expect(useDesignerStore.getState().showElementTree).toBe(true);

      act(() => {
        useDesignerStore.getState().toggleElementTree();
      });

      expect(useDesignerStore.getState().showElementTree).toBe(false);
    });

    it('should toggle style panel', () => {
      expect(useDesignerStore.getState().showStylePanel).toBe(true);

      act(() => {
        useDesignerStore.getState().toggleStylePanel();
      });

      expect(useDesignerStore.getState().showStylePanel).toBe(false);
    });

    it('should set active style category', () => {
      act(() => {
        useDesignerStore.getState().setActiveStyleCategory('typography');
      });

      expect(useDesignerStore.getState().activeStyleCategory).toBe('typography');
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      act(() => {
        useDesignerStore.getState().setMode('design');
        useDesignerStore.getState().setCode('<div>Test</div>');
        useDesignerStore.getState().selectElement('element-1');
        useDesignerStore.getState().reset();
      });

      const state = useDesignerStore.getState();
      expect(state.mode).toBe('preview');
      expect(state.code).toBe('');
      expect(state.selectedElementId).toBeNull();
    });
  });
});
