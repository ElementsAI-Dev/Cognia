/**
 * Tests for a2ui-bridge.ts
 * Plugin A2UI Bridge
 */

import { PluginA2UIBridge, createPluginA2UIBridge } from './a2ui-bridge';
import { useA2UIStore } from '@/stores/a2ui';
import * as catalog from '@/lib/a2ui/catalog';
import type { PluginRegistry } from './registry';
import type { PluginHooksManager } from './hooks';
import type { PluginA2UIComponent, A2UITemplateDef } from '@/types/plugin';

// Mock stores
jest.mock('@/stores/a2ui', () => ({
  useA2UIStore: {
    getState: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

// Mock catalog
jest.mock('@/lib/a2ui/catalog', () => ({
  registerComponent: jest.fn(),
  unregisterComponent: jest.fn(),
}));

const mockedUseA2UIStore = useA2UIStore as jest.Mocked<typeof useA2UIStore>;
const mockedCatalog = catalog as jest.Mocked<typeof catalog>;

// Mock registry
const createMockRegistry = (): jest.Mocked<PluginRegistry> => ({
  registerComponent: jest.fn(),
  unregisterComponent: jest.fn(),
  registerTemplate: jest.fn(),
  unregisterTemplate: jest.fn(),
  getTemplate: jest.fn(),
  getAllTemplates: jest.fn().mockReturnValue([]),
  getTemplatesByCategory: jest.fn().mockReturnValue([]),
} as unknown as jest.Mocked<PluginRegistry>);

// Mock hooks manager
const createMockHooksManager = (): jest.Mocked<PluginHooksManager> => ({
  dispatchOnA2UISurfaceCreate: jest.fn(),
  dispatchOnA2UISurfaceDestroy: jest.fn(),
} as unknown as jest.Mocked<PluginHooksManager>);

// Mock A2UI component
const createMockComponent = (type: string): PluginA2UIComponent => ({
  type,
  component: () => null,
  metadata: {
    description: `${type} component`,
    category: 'test',
    icon: 'test',
    props: {},
  },
});

// Mock template
const createMockTemplate = (id: string): A2UITemplateDef => ({
  id,
  name: `Template ${id}`,
  description: 'Test template',
  category: 'test',
  surfaceType: 'panel',
  components: [],
  dataModel: {},
});

describe('PluginA2UIBridge', () => {
  let bridge: PluginA2UIBridge;
  let mockRegistry: jest.Mocked<PluginRegistry>;
  let mockHooksManager: jest.Mocked<PluginHooksManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRegistry = createMockRegistry();
    mockHooksManager = createMockHooksManager();
    
    mockedUseA2UIStore.getState.mockReturnValue({
      surfaces: {},
      createSurface: jest.fn(),
      processMessage: jest.fn(),
    } as never);

    bridge = new PluginA2UIBridge({
      registry: mockRegistry,
      hooksManager: mockHooksManager,
    });
  });

  afterEach(() => {
    bridge.dispose();
  });

  describe('registerComponent', () => {
    it('should register a component with A2UI catalog', () => {
      const component = createMockComponent('custom-button');
      
      bridge.registerComponent('plugin-1', component);

      expect(mockedCatalog.registerComponent).toHaveBeenCalledWith(
        'custom-button',
        expect.any(Function),
        expect.objectContaining({ description: 'custom-button component' })
      );
    });

    it('should register component with plugin registry', () => {
      const component = createMockComponent('custom-input');
      
      bridge.registerComponent('plugin-1', component);

      expect(mockRegistry.registerComponent).toHaveBeenCalledWith('plugin-1', component);
    });

    it('should warn when overwriting existing component', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const component1 = createMockComponent('shared-type');
      const component2 = createMockComponent('shared-type');

      bridge.registerComponent('plugin-1', component1);
      bridge.registerComponent('plugin-2', component2);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already registered')
      );
      consoleSpy.mockRestore();
    });

    it('should track component registration by plugin', () => {
      const component = createMockComponent('test-type');
      
      bridge.registerComponent('plugin-1', component);

      expect(bridge.isPluginComponent('test-type')).toBe(true);
      expect(bridge.getComponentPluginId('test-type')).toBe('plugin-1');
    });
  });

  describe('unregisterComponent', () => {
    it('should unregister component from A2UI catalog', () => {
      const component = createMockComponent('to-remove');
      bridge.registerComponent('plugin-1', component);

      bridge.unregisterComponent('to-remove');

      expect(mockedCatalog.unregisterComponent).toHaveBeenCalledWith('to-remove');
    });

    it('should unregister from plugin registry', () => {
      const component = createMockComponent('to-remove');
      bridge.registerComponent('plugin-1', component);

      bridge.unregisterComponent('to-remove');

      expect(mockRegistry.unregisterComponent).toHaveBeenCalledWith('to-remove');
    });

    it('should do nothing for unknown component', () => {
      bridge.unregisterComponent('unknown-type');

      expect(mockedCatalog.unregisterComponent).not.toHaveBeenCalled();
    });

    it('should update tracking after unregister', () => {
      const component = createMockComponent('tracked');
      bridge.registerComponent('plugin-1', component);
      
      bridge.unregisterComponent('tracked');

      expect(bridge.isPluginComponent('tracked')).toBe(false);
    });
  });

  describe('unregisterPluginComponents', () => {
    it('should unregister all components from a plugin', () => {
      bridge.registerComponent('plugin-1', createMockComponent('type-1'));
      bridge.registerComponent('plugin-1', createMockComponent('type-2'));
      bridge.registerComponent('plugin-2', createMockComponent('type-3'));

      bridge.unregisterPluginComponents('plugin-1');

      expect(bridge.isPluginComponent('type-1')).toBe(false);
      expect(bridge.isPluginComponent('type-2')).toBe(false);
      expect(bridge.isPluginComponent('type-3')).toBe(true);
    });
  });

  describe('registerTemplate', () => {
    it('should register template with prefixed ID', () => {
      const template = createMockTemplate('my-template');

      bridge.registerTemplate('plugin-1', template);

      expect(mockRegistry.registerTemplate).toHaveBeenCalledWith(
        'plugin-1',
        expect.objectContaining({ id: 'plugin-1:my-template' })
      );
    });

    it('should warn when overwriting template', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const template = createMockTemplate('dup');

      bridge.registerTemplate('plugin-1', template);
      bridge.registerTemplate('plugin-1', template);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already registered')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('unregisterTemplate', () => {
    it('should unregister template from registry', () => {
      const template = createMockTemplate('to-remove');
      bridge.registerTemplate('plugin-1', template);

      bridge.unregisterTemplate('plugin-1:to-remove');

      expect(mockRegistry.unregisterTemplate).toHaveBeenCalledWith('plugin-1:to-remove');
    });

    it('should do nothing for unknown template', () => {
      bridge.unregisterTemplate('unknown:template');

      expect(mockRegistry.unregisterTemplate).not.toHaveBeenCalled();
    });
  });

  describe('unregisterPluginTemplates', () => {
    it('should unregister all templates from a plugin', () => {
      bridge.registerTemplate('plugin-1', createMockTemplate('t1'));
      bridge.registerTemplate('plugin-1', createMockTemplate('t2'));
      bridge.registerTemplate('plugin-2', createMockTemplate('t3'));

      bridge.unregisterPluginTemplates('plugin-1');

      // Should have unregistered plugin-1 templates
      expect(mockRegistry.unregisterTemplate).toHaveBeenCalledWith('plugin-1:t1');
      expect(mockRegistry.unregisterTemplate).toHaveBeenCalledWith('plugin-1:t2');
    });
  });

  describe('createSurfaceFromTemplate', () => {
    it('should create surface from template', () => {
      const template: A2UITemplateDef = {
        id: 'plugin-1:test',
        name: 'Test',
        description: 'Test',
        category: 'test',
        surfaceType: 'panel',
        components: [{ type: 'text', props: {} }],
        dataModel: { key: 'value' },
      };
      mockRegistry.getTemplate.mockReturnValue(template);

      const mockCreateSurface = jest.fn();
      const mockProcessMessage = jest.fn();
      mockedUseA2UIStore.getState.mockReturnValue({
        surfaces: {},
        createSurface: mockCreateSurface,
        processMessage: mockProcessMessage,
      } as never);

      bridge.createSurfaceFromTemplate('plugin-1:test', 'surface-1');

      expect(mockCreateSurface).toHaveBeenCalledWith('surface-1', 'panel', { title: 'Test' });
      expect(mockProcessMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'updateComponents', surfaceId: 'surface-1' })
      );
    });

    it('should throw for unknown template', () => {
      mockRegistry.getTemplate.mockReturnValue(undefined);

      expect(() => {
        bridge.createSurfaceFromTemplate('unknown:template', 'surface-1');
      }).toThrow('Template not found');
    });

    it('should apply data overrides', () => {
      const template: A2UITemplateDef = {
        id: 'plugin-1:test',
        name: 'Test',
        description: 'Test',
        category: 'test',
        surfaceType: 'panel',
        components: [],
        dataModel: { original: 'data' },
      };
      mockRegistry.getTemplate.mockReturnValue(template);

      const mockProcessMessage = jest.fn();
      mockedUseA2UIStore.getState.mockReturnValue({
        surfaces: {},
        createSurface: jest.fn(),
        processMessage: mockProcessMessage,
      } as never);

      bridge.createSurfaceFromTemplate('plugin-1:test', 'surface-1', { override: 'value' });

      expect(mockProcessMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'dataModelUpdate',
          data: expect.objectContaining({ original: 'data', override: 'value' }),
        })
      );
    });
  });

  describe('getRegisteredComponentTypes', () => {
    it('should return all registered component types', () => {
      bridge.registerComponent('p1', createMockComponent('type-a'));
      bridge.registerComponent('p2', createMockComponent('type-b'));

      const types = bridge.getRegisteredComponentTypes();

      expect(types).toContain('type-a');
      expect(types).toContain('type-b');
    });

    it('should return empty array when no components', () => {
      const types = bridge.getRegisteredComponentTypes();
      expect(types).toHaveLength(0);
    });
  });

  describe('getRegisteredTemplates', () => {
    it('should return all templates from registry', () => {
      const templates = [createMockTemplate('t1'), createMockTemplate('t2')];
      mockRegistry.getAllTemplates.mockReturnValue(templates);

      const result = bridge.getRegisteredTemplates();

      expect(result).toEqual(templates);
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return templates filtered by category', () => {
      const templates = [createMockTemplate('t1')];
      mockRegistry.getTemplatesByCategory.mockReturnValue(templates);

      const result = bridge.getTemplatesByCategory('forms');

      expect(mockRegistry.getTemplatesByCategory).toHaveBeenCalledWith('forms');
      expect(result).toEqual(templates);
    });
  });

  describe('dispose', () => {
    it('should unregister all components on dispose', () => {
      bridge.registerComponent('p1', createMockComponent('type-1'));
      bridge.registerComponent('p1', createMockComponent('type-2'));

      bridge.dispose();

      expect(mockedCatalog.unregisterComponent).toHaveBeenCalledWith('type-1');
      expect(mockedCatalog.unregisterComponent).toHaveBeenCalledWith('type-2');
    });

    it('should clear internal state', () => {
      bridge.registerComponent('p1', createMockComponent('type-1'));
      bridge.registerTemplate('p1', createMockTemplate('t1'));

      bridge.dispose();

      expect(bridge.getRegisteredComponentTypes()).toHaveLength(0);
    });
  });
});

describe('createPluginA2UIBridge', () => {
  it('should create a new PluginA2UIBridge instance', () => {
    const mockRegistry = createMockRegistry();
    const mockHooksManager = createMockHooksManager();

    mockedUseA2UIStore.getState.mockReturnValue({ surfaces: {} } as never);

    const bridge = createPluginA2UIBridge({
      registry: mockRegistry,
      hooksManager: mockHooksManager,
    });

    expect(bridge).toBeInstanceOf(PluginA2UIBridge);
    bridge.dispose();
  });
});
