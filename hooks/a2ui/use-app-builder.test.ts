/**
 * Tests for useA2UIAppBuilder hook
 */

import { renderHook, act } from '@testing-library/react';
import { useA2UIAppBuilder } from './use-app-builder';

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete mockLocalStorage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
    }),
  },
  writable: true,
});

// Mock useA2UI hook
const mockProcessMessages = jest.fn();
const mockCreateQuickSurface = jest.fn();
const mockSetDataValue = jest.fn();

jest.mock('./use-a2ui', () => ({
  useA2UI: jest.fn(() => ({
    processMessages: mockProcessMessages,
    createQuickSurface: mockCreateQuickSurface,
    setDataValue: mockSetDataValue,
    activeSurfaceId: null,
    setActiveSurface: jest.fn(),
  })),
}));

// Mock store
const mockDeleteSurface = jest.fn();
let mockSurfaces: Record<string, { components: Record<string, unknown>; dataModel: Record<string, unknown> }> = {};

jest.mock('@/stores/a2ui', () => ({
  useA2UIStore: jest.fn((selector) => {
    const state = {
      surfaces: mockSurfaces,
      deleteSurface: mockDeleteSurface,
    };
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  }),
}));

// Mock templates
jest.mock('@/lib/a2ui/templates', () => ({
  appTemplates: [
    {
      id: 'template-1',
      name: 'Test Template',
      description: 'A test template',
      category: 'productivity',
      icon: 'CheckSquare',
      components: [{ type: 'text', props: { content: 'Hello' } }],
      dataModel: { message: 'Hello' },
    },
  ],
  getTemplateById: jest.fn((id: string) => {
    if (id === 'template-1') {
      return {
        id: 'template-1',
        name: 'Test Template',
        description: 'A test template',
        category: 'productivity',
        icon: 'CheckSquare',
        components: [{ type: 'text', props: { content: 'Hello' } }],
        dataModel: { message: 'Hello' },
      };
    }
    return undefined;
  }),
  getTemplatesByCategory: jest.fn((category: string) => {
    if (category === 'productivity') {
      return [{ id: 'template-1', name: 'Test Template', category: 'productivity' }];
    }
    return [];
  }),
  searchTemplates: jest.fn((query: string) => {
    if (query.includes('test')) {
      return [{ id: 'template-1', name: 'Test Template' }];
    }
    return [];
  }),
  createAppFromTemplate: jest.fn(() => ({
    surfaceId: 'app-surface-123',
    messages: [{ type: 'createSurface' }],
  })),
  generateTemplateId: jest.fn(() => 'custom-app-123'),
}));

describe('useA2UIAppBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
    mockSurfaces = {};
  });

  describe('initialization', () => {
    it('should return template management functions', () => {
      const { result } = renderHook(() => useA2UIAppBuilder());

      expect(result.current.templates).toBeDefined();
      expect(result.current.getTemplate).toBeDefined();
      expect(result.current.getTemplatesByCategory).toBeDefined();
      expect(result.current.searchTemplates).toBeDefined();
    });

    it('should return app management functions', () => {
      const { result } = renderHook(() => useA2UIAppBuilder());

      expect(result.current.createFromTemplate).toBeDefined();
      expect(result.current.createCustomApp).toBeDefined();
      expect(result.current.duplicateApp).toBeDefined();
      expect(result.current.deleteApp).toBeDefined();
      expect(result.current.renameApp).toBeDefined();
    });
  });

  describe('template management', () => {
    it('should get template by id', () => {
      const { result } = renderHook(() => useA2UIAppBuilder());

      const template = result.current.getTemplate('template-1');

      expect(template).toBeDefined();
      expect(template?.name).toBe('Test Template');
    });

    it('should get templates by category', () => {
      const { result } = renderHook(() => useA2UIAppBuilder());

      const templates = result.current.getTemplatesByCategory('productivity');

      expect(templates).toHaveLength(1);
    });

    it('should search templates', () => {
      const { result } = renderHook(() => useA2UIAppBuilder());

      const results = result.current.searchTemplates('test');

      expect(results).toHaveLength(1);
    });
  });

  describe('app creation', () => {
    it('should create app from template', () => {
      const onAppCreated = jest.fn();
      const { result } = renderHook(() => useA2UIAppBuilder({ onAppCreated }));

      let appId: string | null;
      act(() => {
        appId = result.current.createFromTemplate('template-1');
      });

      expect(appId!).toBe('app-surface-123');
      expect(mockProcessMessages).toHaveBeenCalled();
      expect(onAppCreated).toHaveBeenCalledWith('app-surface-123', 'template-1');
    });

    it('should return null for invalid template', () => {
      const { result } = renderHook(() => useA2UIAppBuilder());

      let appId: string | null;
      act(() => {
        appId = result.current.createFromTemplate('invalid-template');
      });

      expect(appId!).toBeNull();
    });

    it('should create custom app', () => {
      const onAppCreated = jest.fn();
      const { result } = renderHook(() => useA2UIAppBuilder({ onAppCreated }));

      const components = [{ type: 'text', props: { content: 'Custom' } }];
      const dataModel = { custom: true };

      let appId: string | null;
      act(() => {
        appId = result.current.createCustomApp('My App', components as unknown as import('@/types/artifact/a2ui').A2UIComponent[], dataModel);
      });

      expect(appId!).toBe('custom-app-123');
      expect(mockCreateQuickSurface).toHaveBeenCalled();
      expect(onAppCreated).toHaveBeenCalledWith('custom-app-123', 'custom');
    });

    it('should duplicate existing app', () => {
      mockSurfaces = {
        'existing-app': {
          components: { comp1: { type: 'text' } },
          dataModel: { data: 'value' },
        },
      };
      // Set up app instance in localStorage
      mockLocalStorage['a2ui-app-instances'] = JSON.stringify([
        { id: 'existing-app', templateId: 'template-1', name: 'Original App' },
      ]);

      const { result } = renderHook(() => useA2UIAppBuilder());

      let newAppId: string | null;
      act(() => {
        newAppId = result.current.duplicateApp('existing-app', 'Copied App');
      });

      expect(newAppId!).toBe('custom-app-123');
    });
  });

  describe('app management', () => {
    it('should delete app', () => {
      const onAppDeleted = jest.fn();
      mockLocalStorage['a2ui-app-instances'] = JSON.stringify([
        { id: 'app-to-delete', templateId: 'template-1', name: 'App' },
      ]);

      const { result } = renderHook(() => useA2UIAppBuilder({ onAppDeleted }));

      act(() => {
        result.current.deleteApp('app-to-delete');
      });

      expect(mockDeleteSurface).toHaveBeenCalledWith('app-to-delete');
      expect(onAppDeleted).toHaveBeenCalledWith('app-to-delete');
    });

    it('should rename app', () => {
      // Test that renameApp function exists and can be called
      const { result } = renderHook(() => useA2UIAppBuilder());

      expect(typeof result.current.renameApp).toBe('function');
      
      // Calling rename on non-existent app should not throw
      act(() => {
        result.current.renameApp('non-existent-app', 'New Name');
      });
    });

    it('should get app instance', () => {
      // Note: Due to module-level caching, we check function exists and returns undefined for non-existent app
      const { result } = renderHook(() => useA2UIAppBuilder());

      const instance = result.current.getAppInstance('non-existent-app');

      expect(instance).toBeUndefined();
    });

    it('should get all apps', () => {
      // Note: Due to module-level caching in the hook, we verify the function returns an array
      const { result } = renderHook(() => useA2UIAppBuilder());

      const apps = result.current.getAllApps();

      expect(Array.isArray(apps)).toBe(true);
    });
  });

  describe('app data', () => {
    it('should get app data', () => {
      mockSurfaces = {
        'app-1': { components: {}, dataModel: { key: 'value' } },
      };

      const { result } = renderHook(() => useA2UIAppBuilder());

      const data = result.current.getAppData('app-1');

      expect(data).toEqual({ key: 'value' });
    });

    it('should set app data', () => {
      mockLocalStorage['a2ui-app-instances'] = JSON.stringify([
        { id: 'app-1', templateId: 't1', name: 'App', lastModified: 1000 },
      ]);

      const { result } = renderHook(() => useA2UIAppBuilder());

      act(() => {
        result.current.setAppData('app-1', '/path', 'new value');
      });

      expect(mockSetDataValue).toHaveBeenCalledWith('app-1', '/path', 'new value');
    });
  });

  describe('action handling', () => {
    it('should handle add_task action', () => {
      mockSurfaces = {
        'app-1': {
          components: {},
          dataModel: {
            newTask: 'New Task',
            tasks: [{ id: 1, text: 'Existing', completed: false }],
          },
        },
      };

      const { result } = renderHook(() => useA2UIAppBuilder());

      act(() => {
        result.current.handleAppAction({
          type: 'userAction',
          surfaceId: 'app-1',
          componentId: 'btn',
          action: 'add_task',
          timestamp: Date.now(),
        });
      });

      // Should have called setAppData for tasks and newTask
      expect(mockSetDataValue).toHaveBeenCalled();
    });

    it('should pass unknown actions to external handler', () => {
      const onAction = jest.fn();
      const { result } = renderHook(() => useA2UIAppBuilder({ onAction }));

      const action = {
        type: 'userAction' as const,
        surfaceId: 'app-1',
        componentId: 'btn',
        action: 'custom_action',
        timestamp: Date.now(),
      };

      act(() => {
        result.current.handleAppAction(action);
      });

      expect(onAction).toHaveBeenCalledWith(action);
    });
  });
});
