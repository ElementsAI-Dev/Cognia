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

  describe('expanded style categories', () => {
    it('should have default expanded categories', () => {
      const state = useDesignerStore.getState();
      expect(state.expandedStyleCategories).toEqual(['layout']);
    });

    it('should set expanded style categories', () => {
      act(() => {
        useDesignerStore.getState().setExpandedStyleCategories(['layout', 'typography', 'spacing']);
      });

      expect(useDesignerStore.getState().expandedStyleCategories).toEqual([
        'layout',
        'typography',
        'spacing',
      ]);
    });

    it('should toggle style category - add', () => {
      act(() => {
        useDesignerStore.getState().toggleStyleCategory('typography');
      });

      expect(useDesignerStore.getState().expandedStyleCategories).toContain('typography');
    });

    it('should toggle style category - remove', () => {
      act(() => {
        useDesignerStore.getState().setExpandedStyleCategories(['layout', 'typography']);
        useDesignerStore.getState().toggleStyleCategory('typography');
      });

      expect(useDesignerStore.getState().expandedStyleCategories).not.toContain('typography');
      expect(useDesignerStore.getState().expandedStyleCategories).toContain('layout');
    });
  });

  describe('panel layout', () => {
    it('should have default panel layout', () => {
      const state = useDesignerStore.getState();
      expect(state.panelLayout).toEqual({
        elementTreeSize: 20,
        previewSize: 55,
        stylePanelSize: 25,
        historyPanelSize: 20,
      });
    });

    it('should update panel layout partially', () => {
      act(() => {
        useDesignerStore.getState().setPanelLayout({ elementTreeSize: 25 });
      });

      const state = useDesignerStore.getState();
      expect(state.panelLayout.elementTreeSize).toBe(25);
      expect(state.panelLayout.previewSize).toBe(55); // unchanged
    });

    it('should reset panel layout to defaults', () => {
      act(() => {
        useDesignerStore.getState().setPanelLayout({ elementTreeSize: 30, previewSize: 40 });
        useDesignerStore.getState().resetPanelLayout();
      });

      const state = useDesignerStore.getState();
      expect(state.panelLayout).toEqual({
        elementTreeSize: 20,
        previewSize: 55,
        stylePanelSize: 25,
        historyPanelSize: 20,
      });
    });
  });

  describe('mobile layout', () => {
    it('should have default mobile layout state', () => {
      const state = useDesignerStore.getState();
      expect(state.isMobileLayout).toBe(false);
      expect(state.mobileActiveTab).toBe('preview');
    });

    it('should set mobile layout', () => {
      act(() => {
        useDesignerStore.getState().setMobileLayout(true);
      });

      expect(useDesignerStore.getState().isMobileLayout).toBe(true);
    });

    it('should set mobile active tab', () => {
      act(() => {
        useDesignerStore.getState().setMobileActiveTab('code');
      });

      expect(useDesignerStore.getState().mobileActiveTab).toBe('code');
    });

    it('should set mobile active tab to elements', () => {
      act(() => {
        useDesignerStore.getState().setMobileActiveTab('elements');
      });

      expect(useDesignerStore.getState().mobileActiveTab).toBe('elements');
    });

    it('should set mobile active tab to styles', () => {
      act(() => {
        useDesignerStore.getState().setMobileActiveTab('styles');
      });

      expect(useDesignerStore.getState().mobileActiveTab).toBe('styles');
    });
  });

  describe('AI panel', () => {
    it('should have default AI panel state', () => {
      const state = useDesignerStore.getState();
      expect(state.showAIPanel).toBe(false);
    });

    it('should toggle AI panel', () => {
      expect(useDesignerStore.getState().showAIPanel).toBe(false);

      act(() => {
        useDesignerStore.getState().toggleAIPanel();
      });

      expect(useDesignerStore.getState().showAIPanel).toBe(true);

      act(() => {
        useDesignerStore.getState().toggleAIPanel();
      });

      expect(useDesignerStore.getState().showAIPanel).toBe(false);
    });
  });

  describe('parseCodeToElements', () => {
    it('should generate deterministic element IDs (el-0, el-1, etc.)', () => {
      act(() => {
        useDesignerStore.getState().parseCodeToElements('<div><span>Hello</span><p>World</p></div>');
      });

      const state = useDesignerStore.getState();
      expect(state.elementTree).not.toBeNull();
      // Root element should be el-0
      expect(state.elementTree?.id).toBe('el-0');
      // First child should be el-1
      expect(state.elementTree?.children[0]?.id).toBe('el-1');
      // Second child should be el-2
      expect(state.elementTree?.children[1]?.id).toBe('el-2');
    });

    it('should reset ID counter for each parse to ensure consistency', () => {
      // First parse
      act(() => {
        useDesignerStore.getState().parseCodeToElements('<div><span>Test1</span></div>');
      });
      const firstTree = useDesignerStore.getState().elementTree;
      expect(firstTree?.id).toBe('el-0');
      expect(firstTree?.children[0]?.id).toBe('el-1');

      // Second parse - IDs should start from el-0 again
      act(() => {
        useDesignerStore.getState().parseCodeToElements('<section><article>Test2</article></section>');
      });
      const secondTree = useDesignerStore.getState().elementTree;
      expect(secondTree?.id).toBe('el-0');
      expect(secondTree?.children[0]?.id).toBe('el-1');
    });

    it('should build element map with deterministic IDs', () => {
      act(() => {
        useDesignerStore.getState().parseCodeToElements('<div class="container"><button>Click</button></div>');
      });

      const state = useDesignerStore.getState();
      expect(state.elementMap['el-0']).toBeDefined();
      expect(state.elementMap['el-0'].tagName).toBe('div');
      expect(state.elementMap['el-1']).toBeDefined();
      expect(state.elementMap['el-1'].tagName).toBe('button');
    });
  });
});
