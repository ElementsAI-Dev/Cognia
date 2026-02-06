/**
 * @jest-environment jsdom
 */
import {
  useTitleBarRegistry,
  registerTitleBarItem,
  unregisterTitleBarItem,
} from './title-bar-registry';
import type { TitleBarItemDefinition } from './title-bar-registry';

describe('title-bar-registry', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useTitleBarRegistry.setState({ items: {} });
  });

  describe('useTitleBarRegistry store', () => {
    it('initializes with empty items', () => {
      const state = useTitleBarRegistry.getState();
      expect(state.items).toEqual({});
    });

    it('registerItem adds item to store', () => {
      const item: TitleBarItemDefinition = {
        id: 'test-item',
        label: 'Test Item',
        defaultArea: 'left',
        render: () => null,
      };

      useTitleBarRegistry.getState().registerItem(item);

      const state = useTitleBarRegistry.getState();
      expect(state.items['test-item']).toEqual(item);
    });

    it('registerItem overwrites existing item with same id', () => {
      const item1: TitleBarItemDefinition = {
        id: 'test-item',
        label: 'Test Item 1',
        defaultArea: 'left',
        render: () => null,
      };

      const item2: TitleBarItemDefinition = {
        id: 'test-item',
        label: 'Test Item 2',
        defaultArea: 'right',
        render: () => null,
      };

      useTitleBarRegistry.getState().registerItem(item1);
      useTitleBarRegistry.getState().registerItem(item2);

      const state = useTitleBarRegistry.getState();
      expect(state.items['test-item'].label).toBe('Test Item 2');
      expect(state.items['test-item'].defaultArea).toBe('right');
    });

    it('unregisterItem removes item from store', () => {
      const item: TitleBarItemDefinition = {
        id: 'test-item',
        label: 'Test Item',
        defaultArea: 'left',
        render: () => null,
      };

      useTitleBarRegistry.getState().registerItem(item);
      const result = useTitleBarRegistry.getState().unregisterItem('test-item');

      expect(result).toBe(true);
      const state = useTitleBarRegistry.getState();
      expect(state.items['test-item']).toBeUndefined();
    });

    it('unregisterItem returns false for non-existent item', () => {
      const result = useTitleBarRegistry.getState().unregisterItem('non-existent');
      expect(result).toBe(false);
    });

    it('can register multiple items', () => {
      const items: TitleBarItemDefinition[] = [
        { id: 'item-1', label: 'Item 1', defaultArea: 'left', render: () => null },
        { id: 'item-2', label: 'Item 2', defaultArea: 'center', render: () => null },
        { id: 'item-3', label: 'Item 3', defaultArea: 'right', render: () => null },
      ];

      items.forEach((item) => useTitleBarRegistry.getState().registerItem(item));

      const state = useTitleBarRegistry.getState();
      expect(Object.keys(state.items)).toHaveLength(3);
      expect(state.items['item-1']).toBeDefined();
      expect(state.items['item-2']).toBeDefined();
      expect(state.items['item-3']).toBeDefined();
    });
  });

  describe('registerTitleBarItem helper', () => {
    it('registers item via helper function', () => {
      const item: TitleBarItemDefinition = {
        id: 'helper-test',
        label: 'Helper Test',
        defaultArea: 'center',
        render: () => null,
      };

      registerTitleBarItem(item);

      const state = useTitleBarRegistry.getState();
      expect(state.items['helper-test']).toEqual(item);
    });
  });

  describe('unregisterTitleBarItem helper', () => {
    it('unregisters item via helper function', () => {
      const item: TitleBarItemDefinition = {
        id: 'helper-test',
        label: 'Helper Test',
        defaultArea: 'center',
        render: () => null,
      };

      registerTitleBarItem(item);
      const result = unregisterTitleBarItem('helper-test');

      expect(result).toBe(true);
      const state = useTitleBarRegistry.getState();
      expect(state.items['helper-test']).toBeUndefined();
    });

    it('returns false for non-existent item via helper', () => {
      const result = unregisterTitleBarItem('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('TitleBarItemDefinition', () => {
    it('supports optional labelKey', () => {
      const item: TitleBarItemDefinition = {
        id: 'with-label-key',
        label: 'With Label Key',
        labelKey: 'customKey',
        defaultArea: 'left',
        render: () => null,
      };

      registerTitleBarItem(item);

      const state = useTitleBarRegistry.getState();
      expect(state.items['with-label-key'].labelKey).toBe('customKey');
    });

    it('render function receives context', () => {
      const renderFn = jest.fn().mockReturnValue(null);
      const item: TitleBarItemDefinition = {
        id: 'render-test',
        label: 'Render Test',
        defaultArea: 'left',
        render: renderFn,
      };

      registerTitleBarItem(item);

      const state = useTitleBarRegistry.getState();
      const ctx = { isTauri: true, t: (key: string) => key };
      state.items['render-test'].render(ctx);

      expect(renderFn).toHaveBeenCalledWith(ctx);
    });
  });
});
