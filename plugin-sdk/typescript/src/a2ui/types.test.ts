/**
 * A2UI Types Tests
 *
 * @description Tests for A2UI integration type definitions.
 */

import type {
  A2UIPluginComponentDef,
  A2UITemplateDef,
  PluginA2UIComponent,
  A2UIPluginComponentProps,
  PluginA2UIAction,
  PluginA2UIDataChange,
  PluginA2UIAPI,
} from './types';

describe('A2UI Types', () => {
  describe('A2UIPluginComponentDef', () => {
    it('should create a valid component definition', () => {
      const componentDef: A2UIPluginComponentDef = {
        type: 'weather-card',
        name: 'Weather Card',
        description: 'Displays weather information',
        category: 'display',
        icon: 'cloud',
        propsSchema: {
          type: 'object',
          properties: {
            location: { type: 'string' },
            units: { type: 'string', enum: ['celsius', 'fahrenheit'] },
          },
        },
        supportsChildren: false,
        defaultProps: {
          units: 'celsius',
        },
      };

      expect(componentDef.type).toBe('weather-card');
      expect(componentDef.name).toBe('Weather Card');
      expect(componentDef.category).toBe('display');
      expect(componentDef.icon).toBe('cloud');
      expect(componentDef.supportsChildren).toBe(false);
    });

    it('should support all category types', () => {
      const categories: A2UIPluginComponentDef['category'][] = [
        'layout',
        'form',
        'display',
        'data',
        'custom',
      ];

      expect(categories).toContain('layout');
      expect(categories).toContain('form');
      expect(categories).toContain('display');
      expect(categories).toContain('data');
      expect(categories).toContain('custom');
      expect(categories).toHaveLength(5);
    });

    it('should create a minimal component definition', () => {
      const componentDef: A2UIPluginComponentDef = {
        type: 'simple-button',
        name: 'Simple Button',
      };

      expect(componentDef.type).toBe('simple-button');
      expect(componentDef.name).toBe('Simple Button');
      expect(componentDef.description).toBeUndefined();
      expect(componentDef.category).toBeUndefined();
    });

    it('should support components with children', () => {
      const componentDef: A2UIPluginComponentDef = {
        type: 'container',
        name: 'Container',
        supportsChildren: true,
      };

      expect(componentDef.supportsChildren).toBe(true);
    });
  });

  describe('A2UITemplateDef', () => {
    it('should create a valid template definition', () => {
      const template: A2UITemplateDef = {
        id: 'weather-dashboard',
        name: 'Weather Dashboard',
        description: 'A dashboard for weather information',
        category: 'dashboards',
        icon: 'layout-dashboard',
        surfaceType: 'panel',
        preview: 'preview.png',
        components: [
          { id: '1', type: 'weather-card', props: { location: 'NYC' } },
          { id: '2', type: 'weather-card', props: { location: 'LA' } },
        ],
        dataModel: {
          refreshInterval: 60000,
        },
        tags: ['weather', 'dashboard', 'cards'],
      };

      expect(template.id).toBe('weather-dashboard');
      expect(template.name).toBe('Weather Dashboard');
      expect(template.surfaceType).toBe('panel');
      expect(template.components).toHaveLength(2);
      expect(template.dataModel?.refreshInterval).toBe(60000);
      expect(template.tags).toContain('weather');
    });

    it('should create a minimal template definition', () => {
      const template: A2UITemplateDef = {
        id: 'simple-template',
        name: 'Simple Template',
        surfaceType: 'inline',
        components: [],
      };

      expect(template.id).toBe('simple-template');
      expect(template.surfaceType).toBe('inline');
      expect(template.components).toHaveLength(0);
    });
  });

  describe('PluginA2UIComponent', () => {
    it('should create a valid registered component', () => {
      const component: PluginA2UIComponent = {
        type: 'custom-chart',
        pluginId: 'com.example.charts',
        component: () => null, // Mock React component
        metadata: {
          type: 'custom-chart',
          name: 'Custom Chart',
          category: 'data',
        },
      };

      expect(component.type).toBe('custom-chart');
      expect(component.pluginId).toBe('com.example.charts');
      expect(component.metadata.type).toBe('custom-chart');
      expect(component.metadata.name).toBe('Custom Chart');
    });
  });

  describe('A2UIPluginComponentProps', () => {
    it('should define valid component props', () => {
      const mockPluginContext = {
        pluginId: 'test-plugin',
        pluginPath: '/plugins/test',
        config: {},
        logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        storage: {
          get: jest.fn(),
          set: jest.fn(),
          delete: jest.fn(),
          keys: jest.fn(),
          clear: jest.fn(),
        },
        events: { on: jest.fn(), off: jest.fn(), emit: jest.fn(), once: jest.fn() },
        ui: {} as any,
        a2ui: {} as any,
        agent: {} as any,
        settings: {} as any,
        network: {} as any,
        fs: {} as any,
        clipboard: {} as any,
        shell: {} as any,
        db: {} as any,
        shortcuts: {} as any,
        contextMenu: {} as any,
        window: {} as any,
        secrets: {} as any,
      };

      const props: A2UIPluginComponentProps = {
        component: { id: 'comp-1', type: 'button', props: {} },
        surfaceId: 'surface-1',
        dataModel: { count: 0 },
        onAction: jest.fn(),
        onDataChange: jest.fn(),
        renderChild: jest.fn(),
        pluginContext: mockPluginContext,
      };

      expect(props.surfaceId).toBe('surface-1');
      expect(props.dataModel.count).toBe(0);
      expect(typeof props.onAction).toBe('function');
      expect(typeof props.onDataChange).toBe('function');
      expect(typeof props.renderChild).toBe('function');
    });

    it('should handle action callback', () => {
      const onAction = jest.fn();
      const props: A2UIPluginComponentProps = {
        component: {},
        surfaceId: 'surface-1',
        dataModel: {},
        onAction,
        onDataChange: jest.fn(),
        renderChild: jest.fn(),
        pluginContext: {} as any,
      };

      props.onAction('click', { x: 100, y: 200 });
      expect(onAction).toHaveBeenCalledWith('click', { x: 100, y: 200 });
    });

    it('should handle data change callback', () => {
      const onDataChange = jest.fn();
      const props: A2UIPluginComponentProps = {
        component: {},
        surfaceId: 'surface-1',
        dataModel: {},
        onAction: jest.fn(),
        onDataChange,
        renderChild: jest.fn(),
        pluginContext: {} as any,
      };

      props.onDataChange('user.name', 'John');
      expect(onDataChange).toHaveBeenCalledWith('user.name', 'John');
    });
  });

  describe('PluginA2UIAction', () => {
    it('should create a valid action payload', () => {
      const action: PluginA2UIAction = {
        surfaceId: 'surface-1',
        action: 'submit',
        componentId: 'form-1',
        data: {
          formData: { name: 'Test', email: 'test@example.com' },
        },
      };

      expect(action.surfaceId).toBe('surface-1');
      expect(action.action).toBe('submit');
      expect(action.componentId).toBe('form-1');
      expect(action.data?.formData).toBeDefined();
    });

    it('should create an action without data', () => {
      const action: PluginA2UIAction = {
        surfaceId: 'surface-1',
        action: 'click',
        componentId: 'button-1',
      };

      expect(action.data).toBeUndefined();
    });
  });

  describe('PluginA2UIDataChange', () => {
    it('should create a valid data change payload', () => {
      const change: PluginA2UIDataChange = {
        surfaceId: 'surface-1',
        path: 'user.settings.theme',
        value: 'dark',
        previousValue: 'light',
      };

      expect(change.surfaceId).toBe('surface-1');
      expect(change.path).toBe('user.settings.theme');
      expect(change.value).toBe('dark');
      expect(change.previousValue).toBe('light');
    });

    it('should create a data change without previous value', () => {
      const change: PluginA2UIDataChange = {
        surfaceId: 'surface-1',
        path: 'newField',
        value: { nested: 'data' },
      };

      expect(change.previousValue).toBeUndefined();
      expect(change.value).toEqual({ nested: 'data' });
    });
  });

  describe('PluginA2UIAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginA2UIAPI = {
        createSurface: jest.fn(),
        deleteSurface: jest.fn(),
        updateComponents: jest.fn(),
        updateDataModel: jest.fn(),
        getSurface: jest.fn(),
        registerComponent: jest.fn(),
        registerTemplate: jest.fn(),
      };

      expect(mockAPI.createSurface).toBeDefined();
      expect(mockAPI.deleteSurface).toBeDefined();
      expect(mockAPI.updateComponents).toBeDefined();
      expect(mockAPI.updateDataModel).toBeDefined();
      expect(mockAPI.getSurface).toBeDefined();
      expect(mockAPI.registerComponent).toBeDefined();
      expect(mockAPI.registerTemplate).toBeDefined();
    });

    it('should call API methods with correct arguments', () => {
      const mockAPI: PluginA2UIAPI = {
        createSurface: jest.fn(),
        deleteSurface: jest.fn(),
        updateComponents: jest.fn(),
        updateDataModel: jest.fn(),
        getSurface: jest.fn(),
        registerComponent: jest.fn(),
        registerTemplate: jest.fn(),
      };

      mockAPI.createSurface('my-surface', 'panel', { title: 'My Panel' });
      expect(mockAPI.createSurface).toHaveBeenCalledWith('my-surface', 'panel', {
        title: 'My Panel',
      });

      mockAPI.updateDataModel('my-surface', { foo: 'bar' }, true);
      expect(mockAPI.updateDataModel).toHaveBeenCalledWith('my-surface', { foo: 'bar' }, true);

      mockAPI.deleteSurface('my-surface');
      expect(mockAPI.deleteSurface).toHaveBeenCalledWith('my-surface');
    });
  });
});
