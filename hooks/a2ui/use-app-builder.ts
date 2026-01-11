/**
 * useA2UIAppBuilder Hook
 * Provides functionality for building and managing A2UI mini-apps
 */

import { useCallback, useMemo } from 'react';
import { useA2UI } from './use-a2ui';
import { useA2UIStore } from '@/stores/a2ui';
import {
  appTemplates,
  getTemplateById,
  getTemplatesByCategory,
  searchTemplates,
  createAppFromTemplate,
  generateTemplateId,
  type A2UIAppTemplate,
} from '@/lib/a2ui/templates';
import type {
  A2UIComponent,
  A2UIUserAction,
  A2UIDataModelChange,
  A2UISurfaceType,
} from '@/types/artifact/a2ui';

/**
 * App instance metadata
 */
export interface A2UIAppInstance {
  id: string;
  templateId: string;
  name: string;
  createdAt: number;
  lastModified: number;
}

/**
 * App builder options
 */
interface UseA2UIAppBuilderOptions {
  onAction?: (action: A2UIUserAction) => void;
  onDataChange?: (change: A2UIDataModelChange) => void;
  onAppCreated?: (appId: string, templateId: string) => void;
  onAppDeleted?: (appId: string) => void;
}

/**
 * App builder return type
 */
interface UseA2UIAppBuilderReturn {
  // Template management
  templates: A2UIAppTemplate[];
  getTemplate: (id: string) => A2UIAppTemplate | undefined;
  getTemplatesByCategory: (category: A2UIAppTemplate['category']) => A2UIAppTemplate[];
  searchTemplates: (query: string) => A2UIAppTemplate[];

  // App creation
  createFromTemplate: (templateId: string, customName?: string) => string | null;
  createCustomApp: (
    name: string,
    components: A2UIComponent[],
    dataModel?: Record<string, unknown>
  ) => string | null;
  duplicateApp: (appId: string, newName?: string) => string | null;

  // App management
  deleteApp: (appId: string) => void;
  renameApp: (appId: string, newName: string) => void;
  getAppInstance: (appId: string) => A2UIAppInstance | undefined;
  getAllApps: () => A2UIAppInstance[];

  // App data
  getAppData: (appId: string) => Record<string, unknown> | undefined;
  setAppData: (appId: string, path: string, value: unknown) => void;
  resetAppData: (appId: string) => void;

  // App actions
  handleAppAction: (action: A2UIUserAction) => void;

  // Active app
  activeAppId: string | null;
  setActiveApp: (appId: string | null) => void;
}

// Local storage key for app instances
const APP_INSTANCES_KEY = 'a2ui-app-instances';

/**
 * Load app instances from local storage
 */
function loadAppInstances(): Map<string, A2UIAppInstance> {
  if (typeof window === 'undefined') return new Map();

  try {
    const stored = localStorage.getItem(APP_INSTANCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as A2UIAppInstance[];
      return new Map(parsed.map((app) => [app.id, app]));
    }
  } catch (error) {
    console.error('[A2UI AppBuilder] Failed to load app instances:', error);
  }
  return new Map();
}

/**
 * Save app instances to local storage
 */
function saveAppInstances(instances: Map<string, A2UIAppInstance>): void {
  if (typeof window === 'undefined') return;

  try {
    const data = Array.from(instances.values());
    localStorage.setItem(APP_INSTANCES_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[A2UI AppBuilder] Failed to save app instances:', error);
  }
}

// In-memory app instances cache
let appInstancesCache: Map<string, A2UIAppInstance> | null = null;

function getAppInstancesCache(): Map<string, A2UIAppInstance> {
  if (!appInstancesCache) {
    appInstancesCache = loadAppInstances();
  }
  return appInstancesCache;
}

/**
 * useA2UIAppBuilder Hook
 */
export function useA2UIAppBuilder(
  options: UseA2UIAppBuilderOptions = {}
): UseA2UIAppBuilderReturn {
  const { onAction, onDataChange, onAppCreated, onAppDeleted } = options;

  const a2ui = useA2UI({ onAction, onDataChange });
  const surfaces = useA2UIStore((state) => state.surfaces);
  const deleteSurfaceStore = useA2UIStore((state) => state.deleteSurface);

  // Create app from template
  const createFromTemplate = useCallback(
    (templateId: string, customName?: string): string | null => {
      const template = getTemplateById(templateId);
      if (!template) {
        console.error(`[A2UI AppBuilder] Template not found: ${templateId}`);
        return null;
      }

      const { surfaceId, messages } = createAppFromTemplate(template);
      a2ui.processMessages(messages);

      // Store app instance
      const instance: A2UIAppInstance = {
        id: surfaceId,
        templateId,
        name: customName || template.name,
        createdAt: Date.now(),
        lastModified: Date.now(),
      };

      const instances = getAppInstancesCache();
      instances.set(surfaceId, instance);
      saveAppInstances(instances);

      onAppCreated?.(surfaceId, templateId);
      return surfaceId;
    },
    [a2ui, onAppCreated]
  );

  // Create custom app
  const createCustomApp = useCallback(
    (
      name: string,
      components: A2UIComponent[],
      dataModel: Record<string, unknown> = {}
    ): string | null => {
      const surfaceId = generateTemplateId('custom');

      a2ui.createQuickSurface(surfaceId, components, dataModel, {
        type: 'inline' as A2UISurfaceType,
        title: name,
      });

      // Store app instance
      const instance: A2UIAppInstance = {
        id: surfaceId,
        templateId: 'custom',
        name,
        createdAt: Date.now(),
        lastModified: Date.now(),
      };

      const instances = getAppInstancesCache();
      instances.set(surfaceId, instance);
      saveAppInstances(instances);

      onAppCreated?.(surfaceId, 'custom');
      return surfaceId;
    },
    [a2ui, onAppCreated]
  );

  // Duplicate app
  const duplicateApp = useCallback(
    (appId: string, newName?: string): string | null => {
      const surface = surfaces[appId];
      const instance = getAppInstancesCache().get(appId);

      if (!surface) {
        console.error(`[A2UI AppBuilder] App not found: ${appId}`);
        return null;
      }

      const components = Object.values(surface.components);
      const name = newName || `${instance?.name || 'App'} (Copy)`;

      return createCustomApp(name, components, surface.dataModel);
    },
    [surfaces, createCustomApp]
  );

  // Delete app
  const deleteApp = useCallback(
    (appId: string): void => {
      deleteSurfaceStore(appId);

      const instances = getAppInstancesCache();
      instances.delete(appId);
      saveAppInstances(instances);

      onAppDeleted?.(appId);
    },
    [deleteSurfaceStore, onAppDeleted]
  );

  // Rename app
  const renameApp = useCallback((appId: string, newName: string): void => {
    const instances = getAppInstancesCache();
    const instance = instances.get(appId);

    if (instance) {
      instance.name = newName;
      instance.lastModified = Date.now();
      saveAppInstances(instances);
    }
  }, []);

  // Get app instance
  const getAppInstance = useCallback((appId: string): A2UIAppInstance | undefined => {
    return getAppInstancesCache().get(appId);
  }, []);

  // Get all apps
  const getAllApps = useCallback((): A2UIAppInstance[] => {
    const instances = getAppInstancesCache();
    const validApps: A2UIAppInstance[] = [];

    for (const [id, instance] of instances) {
      if (surfaces[id]) {
        validApps.push(instance);
      }
    }

    return validApps.sort((a, b) => b.lastModified - a.lastModified);
  }, [surfaces]);

  // Get app data
  const getAppData = useCallback(
    (appId: string): Record<string, unknown> | undefined => {
      return surfaces[appId]?.dataModel;
    },
    [surfaces]
  );

  // Set app data
  const setAppData = useCallback(
    (appId: string, path: string, value: unknown): void => {
      a2ui.setDataValue(appId, path, value);

      // Update last modified
      const instances = getAppInstancesCache();
      const instance = instances.get(appId);
      if (instance) {
        instance.lastModified = Date.now();
        saveAppInstances(instances);
      }
    },
    [a2ui]
  );

  // Reset app data
  const resetAppData = useCallback(
    (appId: string): void => {
      const instance = getAppInstancesCache().get(appId);
      if (!instance) return;

      const template = getTemplateById(instance.templateId);
      if (template) {
        a2ui.processMessages([
          {
            type: 'dataModelUpdate',
            surfaceId: appId,
            data: template.dataModel,
            merge: false,
          },
        ]);
      }
    },
    [a2ui]
  );

  // Helper to update task stats (defined before handleAppAction to avoid reference error)
  const updateTaskStats = useCallback(
    (surfaceId: string, tasks: unknown[]): void => {
      const completed = tasks.filter((t) => (t as { completed: boolean }).completed).length;
      const pending = tasks.length - completed;
      a2ui.setDataValue(surfaceId, '/stats', {
        completed,
        pending,
        completedText: `${completed} completed`,
        pendingText: `${pending} pending`,
      });
    },
    [a2ui]
  );

  // Handle app action - provides default action handlers
  const handleAppAction = useCallback(
    (action: A2UIUserAction): void => {
      const { surfaceId, action: actionType, data } = action;

      // Update last modified
      const instances = getAppInstancesCache();
      const instance = instances.get(surfaceId);
      if (instance) {
        instance.lastModified = Date.now();
        saveAppInstances(instances);
      }

      // Default action handlers for common patterns
      switch (actionType) {
        case 'add_task': {
          const currentData = getAppData(surfaceId);
          if (currentData) {
            const newTask = currentData.newTask as string;
            if (newTask?.trim()) {
              const tasks = (currentData.tasks as unknown[]) || [];
              const newTaskItem = {
                id: Date.now(),
                text: newTask.trim(),
                completed: false,
              };
              setAppData(surfaceId, '/tasks', [...tasks, newTaskItem]);
              setAppData(surfaceId, '/newTask', '');
              updateTaskStats(surfaceId, [...tasks, newTaskItem]);
            }
          }
          break;
        }

        case 'toggle_task': {
          const currentData = getAppData(surfaceId);
          if (currentData && data?.index !== undefined) {
            const tasks = [...((currentData.tasks as unknown[]) || [])];
            const taskIndex = data.index as number;
            if (tasks[taskIndex]) {
              const task = tasks[taskIndex] as { completed: boolean };
              task.completed = !task.completed;
              setAppData(surfaceId, '/tasks', tasks);
              updateTaskStats(surfaceId, tasks);
            }
          }
          break;
        }

        case 'clear_form': {
          resetAppData(surfaceId);
          break;
        }

        case 'refresh_data': {
          // Simulate data refresh
          console.log('[A2UI AppBuilder] Refreshing data for:', surfaceId);
          break;
        }

        default:
          // Pass to external handler
          onAction?.(action);
      }
    },
    [getAppData, setAppData, resetAppData, onAction, updateTaskStats]
  );

  // Memoized templates
  const templates = useMemo(() => appTemplates, []);

  return {
    // Template management
    templates,
    getTemplate: getTemplateById,
    getTemplatesByCategory,
    searchTemplates,

    // App creation
    createFromTemplate,
    createCustomApp,
    duplicateApp,

    // App management
    deleteApp,
    renameApp,
    getAppInstance,
    getAllApps,

    // App data
    getAppData,
    setAppData,
    resetAppData,

    // App actions
    handleAppAction,

    // Active app
    activeAppId: a2ui.activeSurfaceId,
    setActiveApp: a2ui.setActiveSurface,
  };
}

export type { A2UIAppTemplate };
