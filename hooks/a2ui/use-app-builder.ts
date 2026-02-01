/**
 * useA2UIAppBuilder Hook
 * Provides functionality for building and managing A2UI mini-apps
 */

import { useCallback, useMemo, useRef } from 'react';
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
import { loggers } from '@/lib/logger';

const log = loggers.app;

/**
 * App author information
 */
export interface A2UIAppAuthor {
  name?: string;
  email?: string;
  url?: string;
}

/**
 * App statistics for app store
 */
export interface A2UIAppStats {
  views?: number;
  uses?: number;
  rating?: number;
  ratingCount?: number;
}

/**
 * App instance metadata - Extended for app store support
 */
export interface A2UIAppInstance {
  // Core fields
  id: string;
  templateId: string;
  name: string;
  createdAt: number;
  lastModified: number;

  // Extended metadata
  description?: string;
  version?: string;

  // Author information
  author?: A2UIAppAuthor;

  // Classification
  category?: string;
  tags?: string[];

  // Thumbnail
  thumbnail?: string;
  thumbnailUpdatedAt?: number;

  // Statistics (for app store)
  stats?: A2UIAppStats;

  // App store metadata
  publishedAt?: number;
  isPublished?: boolean;
  storeId?: string;

  // Screenshots (for app store)
  screenshots?: string[];
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

  // Import/Export
  exportApp: (appId: string) => string | null;
  downloadApp: (appId: string, filename?: string) => boolean;
  importApp: (jsonData: string, customName?: string) => string | null;
  importAppFromFile: (file: File) => Promise<string | null>;
  exportAllApps: () => string;
  importAllApps: (jsonData: string) => number;

  // Share
  generateShareCode: (appId: string) => string | null;
  importFromShareCode: (shareCode: string) => string | null;
  generateShareUrl: (appId: string, baseUrl?: string) => string | null;
  copyAppToClipboard: (appId: string, format?: 'json' | 'code' | 'url') => Promise<boolean>;
  getShareData: (appId: string) => { title: string; text: string; url: string } | null;
  shareAppNative: (appId: string) => Promise<boolean>;
  getSocialShareUrls: (appId: string) => Record<string, string> | null;

  // Metadata management
  updateAppMetadata: (appId: string, metadata: Partial<A2UIAppInstance>) => void;

  // Thumbnail management
  setAppThumbnail: (appId: string, thumbnail: string) => void;
  clearAppThumbnail: (appId: string) => void;

  // Statistics
  incrementAppViews: (appId: string) => void;
  incrementAppUses: (appId: string) => void;

  // App store preparation
  prepareForPublish: (appId: string) => { valid: boolean; missing: string[] };

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
    log.error('A2UI AppBuilder: Failed to load app instances', error as Error);
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
    log.error('A2UI AppBuilder: Failed to save app instances', error as Error);
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
export function useA2UIAppBuilder(options: UseA2UIAppBuilderOptions = {}): UseA2UIAppBuilderReturn {
  const { onAction, onDataChange, onAppCreated, onAppDeleted } = options;

  const a2ui = useA2UI({ onAction, onDataChange });
  const surfaces = useA2UIStore((state) => state.surfaces);
  const deleteSurfaceStore = useA2UIStore((state) => state.deleteSurface);

  // Create app from template
  const createFromTemplate = useCallback(
    (templateId: string, customName?: string): string | null => {
      const template = getTemplateById(templateId);
      if (!template) {
        log.error(`A2UI AppBuilder: Template not found: ${templateId}`);
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
        log.error(`A2UI AppBuilder: App not found: ${appId}`);
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

  // ========== Helper Functions (defined before callbacks that use them) ==========

  // Timer interval management - using module-level Map to persist across renders
  const timerIntervalsRef = useRef(new Map<string, NodeJS.Timeout>());

  const formatTime = useCallback((totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const performCalculation = useCallback((a: number, b: number, operator: string): number => {
    switch (operator) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        return b !== 0 ? a / b : 0;
      case '%':
        return a % b;
      default:
        return b;
    }
  }, []);

  const performUnitConversion = useCallback(
    (value: number, fromUnit: string, toUnit: string, type: string): number => {
      if (fromUnit === toUnit) return value;

      const conversionRates: Record<string, Record<string, number>> = {
        length: { m: 1, cm: 0.01, ft: 0.3048, in: 0.0254 },
        weight: { kg: 1, g: 0.001, lb: 0.453592, oz: 0.0283495 },
        temperature: {},
        currency: { usd: 1, cny: 0.14, eur: 1.08, jpy: 0.0067 },
      };

      if (type === 'temperature') {
        let celsius: number;
        if (fromUnit === 'celsius') celsius = value;
        else if (fromUnit === 'fahrenheit') celsius = ((value - 32) * 5) / 9;
        else celsius = value - 273.15;

        if (toUnit === 'celsius') return celsius;
        if (toUnit === 'fahrenheit') return (celsius * 9) / 5 + 32;
        return celsius + 273.15;
      }

      const rates = conversionRates[type] || conversionRates.length;
      const baseValue = value * (rates[fromUnit] || 1);
      return baseValue / (rates[toUnit] || 1);
    },
    []
  );

  const stopTimerInterval = useCallback((surfaceId: string): void => {
    const interval = timerIntervalsRef.current.get(surfaceId);
    if (interval) {
      clearInterval(interval);
      timerIntervalsRef.current.delete(surfaceId);
    }
  }, []);

  const setTimerPreset = useCallback(
    (surfaceId: string, seconds: number): void => {
      a2ui.setDataValue(surfaceId, '/totalSeconds', seconds);
      a2ui.setDataValue(surfaceId, '/seconds', 0);
      a2ui.setDataValue(surfaceId, '/display', formatTime(seconds));
      a2ui.setDataValue(surfaceId, '/progress', 0);
      a2ui.setDataValue(surfaceId, '/isRunning', false);
      stopTimerInterval(surfaceId);
    },
    [a2ui, formatTime, stopTimerInterval]
  );

  const startTimerInterval = useCallback(
    (surfaceId: string): void => {
      stopTimerInterval(surfaceId);
      const interval = setInterval(() => {
        const surface = surfaces[surfaceId];
        if (!surface || !surface.dataModel.isRunning) {
          stopTimerInterval(surfaceId);
          return;
        }

        const seconds = (surface.dataModel.seconds as number) || 0;
        const totalSeconds = (surface.dataModel.totalSeconds as number) || 0;
        const mode = surface.dataModel.mode as string;

        if (mode === 'countdown' || mode === 'pomodoro' || mode === 'timer') {
          const remaining = totalSeconds - seconds;
          if (remaining <= 0) {
            a2ui.setDataValue(surfaceId, '/isRunning', false);
            a2ui.setDataValue(surfaceId, '/display', '00:00');
            a2ui.setDataValue(surfaceId, '/progress', 100);
            stopTimerInterval(surfaceId);
            return;
          }
          a2ui.setDataValue(surfaceId, '/seconds', seconds + 1);
          a2ui.setDataValue(surfaceId, '/display', formatTime(remaining - 1));
          a2ui.setDataValue(
            surfaceId,
            '/progress',
            Math.round(((seconds + 1) / totalSeconds) * 100)
          );
        } else {
          a2ui.setDataValue(surfaceId, '/seconds', seconds + 1);
          a2ui.setDataValue(surfaceId, '/display', formatTime(seconds + 1));
        }
      }, 1000);
      timerIntervalsRef.current.set(surfaceId, interval);
    },
    [a2ui, surfaces, formatTime, stopTimerInterval]
  );

  // Helper to update task stats
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

  // Helper to update habit stats
  const updateHabitStats = useCallback(
    (surfaceId: string, habits: unknown[]): void => {
      const completedToday = habits.filter((h) => (h as { completed: boolean }).completed).length;
      const maxStreak = Math.max(0, ...habits.map((h) => (h as { streak: number }).streak || 0));
      a2ui.setDataValue(surfaceId, '/stats', {
        streak: maxStreak,
        streakText: `${maxStreak} day streak`,
        todayCompleted: completedToday,
        todayText: `${completedToday} completed today`,
      });
    },
    [a2ui]
  );

  // Helper to update expense stats
  const updateExpenseStats = useCallback(
    (surfaceId: string, expenses: unknown[]): void => {
      const today = new Date().toDateString();
      let total = 0;
      let todayTotal = 0;

      for (const expense of expenses) {
        const exp = expense as { amount: number; date: string };
        total += exp.amount || 0;
        if (new Date(exp.date).toDateString() === today) {
          todayTotal += exp.amount || 0;
        }
      }

      a2ui.setDataValue(surfaceId, '/stats', {
        total,
        totalText: `$${total.toFixed(2)}`,
        today: todayTotal,
        todayText: `$${todayTotal.toFixed(2)}`,
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
        // ========== Todo App Actions ==========
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

        case 'filter_all':
        case 'filter_pending':
        case 'filter_done': {
          const filterValue = actionType.replace('filter_', '');
          setAppData(surfaceId, '/filter', filterValue);
          break;
        }

        // ========== Calculator Actions ==========
        case 'input_0':
        case 'input_1':
        case 'input_2':
        case 'input_3':
        case 'input_4':
        case 'input_5':
        case 'input_6':
        case 'input_7':
        case 'input_8':
        case 'input_9':
        case 'input_decimal':
        case 'num_0':
        case 'num_1':
        case 'num_2':
        case 'num_3':
        case 'num_4':
        case 'num_5':
        case 'num_6':
        case 'num_7':
        case 'num_8':
        case 'num_9': {
          const currentData = getAppData(surfaceId);
          if (currentData) {
            const digit = actionType.includes('decimal')
              ? '.'
              : actionType.replace(/input_|num_/, '');
            const currentDisplay = (currentData.display as string) || '0';
            const waitingForOperand = currentData.waitingForOperand as boolean;

            if (waitingForOperand) {
              setAppData(surfaceId, '/display', digit === '.' ? '0.' : digit);
              setAppData(surfaceId, '/waitingForOperand', false);
            } else {
              if (digit === '.' && currentDisplay.includes('.')) break;
              const newDisplay =
                currentDisplay === '0' && digit !== '.' ? digit : currentDisplay + digit;
              setAppData(surfaceId, '/display', newDisplay);
            }
          }
          break;
        }

        case 'op_add':
        case 'op_sub':
        case 'op_mul':
        case 'op_div':
        case 'op_subtract':
        case 'op_multiply':
        case 'op_divide':
        case 'op_percent': {
          const currentData = getAppData(surfaceId);
          if (currentData) {
            const opMap: Record<string, string> = {
              op_add: '+',
              op_sub: '-',
              op_mul: '*',
              op_div: '/',
              op_subtract: '-',
              op_multiply: '*',
              op_divide: '/',
              op_percent: '%',
            };
            const operator = opMap[actionType];
            const currentDisplay = parseFloat((currentData.display as string) || '0');
            const previousValue = currentData.previousValue as number | null;
            const prevOperator = currentData.operator as string | null;

            if (previousValue !== null && prevOperator && !currentData.waitingForOperand) {
              const result = performCalculation(previousValue, currentDisplay, prevOperator);
              setAppData(surfaceId, '/display', String(result));
              setAppData(surfaceId, '/previousValue', result);
            } else {
              setAppData(surfaceId, '/previousValue', currentDisplay);
            }
            setAppData(surfaceId, '/operator', operator);
            setAppData(surfaceId, '/waitingForOperand', true);
          }
          break;
        }

        case 'calculate': {
          const currentData = getAppData(surfaceId);
          if (currentData) {
            const currentDisplay = parseFloat((currentData.display as string) || '0');
            const previousValue = currentData.previousValue as number | null;
            const operator = currentData.operator as string | null;

            if (previousValue !== null && operator) {
              const result = performCalculation(previousValue, currentDisplay, operator);
              setAppData(surfaceId, '/display', String(result));
              setAppData(surfaceId, '/previousValue', null);
              setAppData(surfaceId, '/operator', null);
              setAppData(surfaceId, '/waitingForOperand', true);
            }
          }
          break;
        }

        case 'clear': {
          setAppData(surfaceId, '/display', '0');
          setAppData(surfaceId, '/previousValue', null);
          setAppData(surfaceId, '/operator', null);
          setAppData(surfaceId, '/waitingForOperand', false);
          break;
        }

        case 'backspace':
        case 'delete': {
          const currentData = getAppData(surfaceId);
          if (currentData) {
            const currentDisplay = (currentData.display as string) || '0';
            const newDisplay = currentDisplay.length > 1 ? currentDisplay.slice(0, -1) : '0';
            setAppData(surfaceId, '/display', newDisplay);
          }
          break;
        }

        // ========== Timer Actions ==========
        case 'start':
        case 'start_timer': {
          const currentData = getAppData(surfaceId);
          if (currentData && !currentData.isRunning) {
            setAppData(surfaceId, '/isRunning', true);
            startTimerInterval(surfaceId);
          }
          break;
        }

        case 'pause':
        case 'pause_timer': {
          setAppData(surfaceId, '/isRunning', false);
          stopTimerInterval(surfaceId);
          break;
        }

        case 'reset':
        case 'reset_timer': {
          const currentData = getAppData(surfaceId);
          if (currentData) {
            setAppData(surfaceId, '/isRunning', false);
            setAppData(surfaceId, '/seconds', 0);
            setAppData(
              surfaceId,
              '/display',
              formatTime((currentData.totalSeconds as number) || 0)
            );
            setAppData(surfaceId, '/progress', 0);
            stopTimerInterval(surfaceId);
          }
          break;
        }

        case 'set_1':
        case 'set_1min': {
          setTimerPreset(surfaceId, 60);
          break;
        }

        case 'set_5':
        case 'set_5min': {
          setTimerPreset(surfaceId, 300);
          break;
        }

        case 'set_10':
        case 'set_10min': {
          setTimerPreset(surfaceId, 600);
          break;
        }

        case 'set_15': {
          setTimerPreset(surfaceId, 900);
          break;
        }

        case 'set_25':
        case 'set_25min': {
          setTimerPreset(surfaceId, 1500);
          break;
        }

        // ========== Notes Actions ==========
        case 'save_note': {
          const currentData = getAppData(surfaceId);
          if (currentData) {
            const newNote = currentData.newNote as { title: string; content: string };
            if (newNote?.content?.trim() || newNote?.title?.trim()) {
              const notes = (currentData.notes as unknown[]) || [];
              const noteItem = {
                id: Date.now(),
                title: newNote.title || 'Untitled',
                content: newNote.content || '',
                createdAt: new Date().toISOString(),
              };
              setAppData(surfaceId, '/notes', [...notes, noteItem]);
              setAppData(surfaceId, '/newNote', { title: '', content: '' });
            }
          }
          break;
        }

        // ========== Unit Converter Actions ==========
        case 'convert': {
          const currentData = getAppData(surfaceId);
          if (currentData) {
            const inputValue = parseFloat(currentData.inputValue as string) || 0;
            const fromUnit = currentData.fromUnit as string;
            const toUnit = currentData.toUnit as string;
            const converterType = currentData.converterType as string;

            const result = performUnitConversion(inputValue, fromUnit, toUnit, converterType);
            setAppData(surfaceId, '/result', result.toFixed(4));
          }
          break;
        }

        // ========== Shopping List Actions ==========
        case 'add_item': {
          const currentData = getAppData(surfaceId);
          if (currentData) {
            const newItem = currentData.newItem as { name: string; quantity: number };
            if (newItem?.name?.trim()) {
              const items = (currentData.items as unknown[]) || [];
              const itemObj = {
                id: Date.now(),
                text: `${newItem.name} (${newItem.quantity || 1})`,
                name: newItem.name.trim(),
                quantity: newItem.quantity || 1,
                completed: false,
              };
              const updatedItems = [...items, itemObj];
              setAppData(surfaceId, '/items', updatedItems);
              setAppData(surfaceId, '/newItem', { name: '', quantity: 1 });
              setAppData(surfaceId, '/totalText', `${updatedItems.length} items`);
            }
          }
          break;
        }

        case 'toggle_item': {
          const currentData = getAppData(surfaceId);
          if (currentData && data?.index !== undefined) {
            const items = [...((currentData.items as unknown[]) || [])];
            const itemIndex = data.index as number;
            if (items[itemIndex]) {
              const item = items[itemIndex] as { completed: boolean };
              item.completed = !item.completed;
              setAppData(surfaceId, '/items', items);
            }
          }
          break;
        }

        case 'clear_list': {
          setAppData(surfaceId, '/items', []);
          setAppData(surfaceId, '/totalText', '0 items');
          break;
        }

        // ========== Habit Tracker Actions ==========
        case 'add_habit': {
          const currentData = getAppData(surfaceId);
          if (currentData) {
            const newHabit = currentData.newHabit as string;
            if (newHabit?.trim()) {
              const habits = (currentData.habits as unknown[]) || [];
              const habitObj = {
                id: Date.now(),
                text: newHabit.trim(),
                name: newHabit.trim(),
                completed: false,
                streak: 0,
              };
              const updatedHabits = [...habits, habitObj];
              setAppData(surfaceId, '/habits', updatedHabits);
              setAppData(surfaceId, '/newHabit', '');
              updateHabitStats(surfaceId, updatedHabits);
            }
          }
          break;
        }

        case 'toggle_habit': {
          const currentData = getAppData(surfaceId);
          if (currentData && data?.index !== undefined) {
            const habits = [...((currentData.habits as unknown[]) || [])];
            const habitIndex = data.index as number;
            if (habits[habitIndex]) {
              const habit = habits[habitIndex] as { completed: boolean; streak: number };
              habit.completed = !habit.completed;
              if (habit.completed) {
                habit.streak = (habit.streak || 0) + 1;
              }
              setAppData(surfaceId, '/habits', habits);
              updateHabitStats(surfaceId, habits);
            }
          }
          break;
        }

        // ========== Expense Tracker Actions ==========
        case 'add_expense': {
          const currentData = getAppData(surfaceId);
          if (currentData) {
            const newExpense = currentData.newExpense as {
              description: string;
              amount: string;
              category: string;
            };
            const amount = parseFloat(newExpense?.amount) || 0;
            if (newExpense?.description?.trim() && amount > 0) {
              const expenses = (currentData.expenses as unknown[]) || [];
              const expenseObj = {
                id: Date.now(),
                text: `${newExpense.description} - $${amount.toFixed(2)}`,
                description: newExpense.description.trim(),
                amount,
                category: newExpense.category || 'other',
                date: new Date().toISOString(),
              };
              const updatedExpenses = [...expenses, expenseObj];
              setAppData(surfaceId, '/expenses', updatedExpenses);
              setAppData(surfaceId, '/newExpense', {
                description: '',
                amount: '',
                category: 'food',
              });
              updateExpenseStats(surfaceId, updatedExpenses);
            }
          }
          break;
        }

        case 'clear_form': {
          resetAppData(surfaceId);
          break;
        }

        case 'refresh':
        case 'refresh_data': {
          log.debug(`A2UI AppBuilder: Refreshing data for: ${surfaceId}`);
          break;
        }

        default:
          // Pass to external handler
          onAction?.(action);
      }
    },
    [
      getAppData,
      setAppData,
      resetAppData,
      onAction,
      updateTaskStats,
      updateHabitStats,
      updateExpenseStats,
      performCalculation,
      startTimerInterval,
      stopTimerInterval,
      formatTime,
      setTimerPreset,
      performUnitConversion,
    ]
  );

  // Memoized templates
  const templates = useMemo(() => appTemplates, []);

  // ========== Import/Export Functions ==========

  /**
   * Export an app to JSON format for sharing or backup
   */
  const exportApp = useCallback(
    (appId: string): string | null => {
      const surface = surfaces[appId];
      const instance = getAppInstancesCache().get(appId);

      if (!surface || !instance) {
        log.error(`A2UI AppBuilder: Cannot export - app not found: ${appId}`);
        return null;
      }

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        app: {
          id: appId,
          name: instance.name,
          templateId: instance.templateId,
          components: Object.values(surface.components),
          dataModel: surface.dataModel,
          surfaceType: surface.type,
          title: surface.title,
        },
      };

      return JSON.stringify(exportData, null, 2);
    },
    [surfaces]
  );

  /**
   * Export an app and trigger download
   */
  const downloadApp = useCallback(
    (appId: string, filename?: string): boolean => {
      const jsonData = exportApp(appId);
      if (!jsonData) return false;

      const instance = getAppInstancesCache().get(appId);
      const safeName = (instance?.name || 'app').replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_');
      const finalFilename = filename || `${safeName}_${Date.now()}.json`;

      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    },
    [exportApp]
  );

  /**
   * Import an app from JSON data
   */
  const importApp = useCallback(
    (jsonData: string, customName?: string): string | null => {
      try {
        const parsed = JSON.parse(jsonData);

        // Validate structure
        if (!parsed.app || !parsed.app.components || !Array.isArray(parsed.app.components)) {
          log.error('A2UI AppBuilder: Invalid import format: missing app or components');
          return null;
        }

        const { app } = parsed;
        const newId = generateTemplateId('imported');
        const name = customName || app.name || 'Imported App';

        // Create the surface
        a2ui.createQuickSurface(newId, app.components, app.dataModel || {}, {
          type: app.surfaceType || 'inline',
          title: app.title || name,
        });

        // Store app instance
        const instance: A2UIAppInstance = {
          id: newId,
          templateId: app.templateId || 'imported',
          name,
          createdAt: Date.now(),
          lastModified: Date.now(),
        };

        const instances = getAppInstancesCache();
        instances.set(newId, instance);
        saveAppInstances(instances);

        onAppCreated?.(newId, 'imported');
        return newId;
      } catch (error) {
        log.error('A2UI AppBuilder: Import failed', error as Error);
        return null;
      }
    },
    [a2ui, onAppCreated]
  );

  /**
   * Import app from file input event
   */
  const importAppFromFile = useCallback(
    (file: File): Promise<string | null> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            const appId = importApp(content);
            resolve(appId);
          } else {
            resolve(null);
          }
        };
        reader.onerror = () => {
          log.error('A2UI AppBuilder: File read error');
          resolve(null);
        };
        reader.readAsText(file);
      });
    },
    [importApp]
  );

  /**
   * Export all apps as a single backup file
   */
  const exportAllApps = useCallback((): string => {
    const allApps = getAllApps();
    const exportedApps = allApps.map((instance) => {
      const surface = surfaces[instance.id];
      return {
        id: instance.id,
        name: instance.name,
        templateId: instance.templateId,
        components: surface ? Object.values(surface.components) : [],
        dataModel: surface?.dataModel || {},
        surfaceType: surface?.type || 'inline',
        title: surface?.title,
        createdAt: instance.createdAt,
        lastModified: instance.lastModified,
      };
    });

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appCount: exportedApps.length,
      apps: exportedApps,
    };

    return JSON.stringify(backupData, null, 2);
  }, [getAllApps, surfaces]);

  /**
   * Import multiple apps from backup
   */
  const importAllApps = useCallback(
    (jsonData: string): number => {
      try {
        const parsed = JSON.parse(jsonData);

        if (!parsed.apps || !Array.isArray(parsed.apps)) {
          log.error('A2UI AppBuilder: Invalid backup format');
          return 0;
        }

        let importedCount = 0;
        for (const app of parsed.apps) {
          const singleAppJson = JSON.stringify({ version: '1.0', app });
          if (importApp(singleAppJson)) {
            importedCount++;
          }
        }

        return importedCount;
      } catch (error) {
        log.error('A2UI AppBuilder: Backup import failed', error as Error);
        return 0;
      }
    },
    [importApp]
  );

  // ========== Share Functions ==========

  /**
   * Generate a compact share code for an app (Base64 encoded JSON)
   */
  const generateShareCode = useCallback(
    (appId: string): string | null => {
      const jsonData = exportApp(appId);
      if (!jsonData) return null;

      try {
        // Compress the data by removing unnecessary whitespace
        const compressed = JSON.stringify(JSON.parse(jsonData));
        // Encode to base64
        const base64 = btoa(encodeURIComponent(compressed));
        return base64;
      } catch (error) {
        log.error('A2UI AppBuilder: Share code generation failed', error as Error);
        return null;
      }
    },
    [exportApp]
  );

  /**
   * Import an app from a share code
   */
  const importFromShareCode = useCallback(
    (shareCode: string): string | null => {
      try {
        // Decode from base64
        const decoded = decodeURIComponent(atob(shareCode));
        return importApp(decoded);
      } catch (error) {
        log.error('A2UI AppBuilder: Share code import failed', error as Error);
        return null;
      }
    },
    [importApp]
  );

  /**
   * Generate a shareable URL for an app
   */
  const generateShareUrl = useCallback(
    (appId: string, baseUrl?: string): string | null => {
      const shareCode = generateShareCode(appId);
      if (!shareCode) return null;

      const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
      return `${base}/share/app?code=${encodeURIComponent(shareCode)}`;
    },
    [generateShareCode]
  );

  /**
   * Copy app data to clipboard
   */
  const copyAppToClipboard = useCallback(
    async (appId: string, format: 'json' | 'code' | 'url' = 'code'): Promise<boolean> => {
      let content: string | null = null;

      switch (format) {
        case 'json':
          content = exportApp(appId);
          break;
        case 'code':
          content = generateShareCode(appId);
          break;
        case 'url':
          content = generateShareUrl(appId);
          break;
      }

      if (!content) return false;

      try {
        await navigator.clipboard.writeText(content);
        return true;
      } catch (error) {
        log.error('A2UI AppBuilder: Clipboard write failed', error as Error);
        return false;
      }
    },
    [exportApp, generateShareCode, generateShareUrl]
  );

  /**
   * Generate share data for social platforms
   */
  const getShareData = useCallback(
    (appId: string): { title: string; text: string; url: string } | null => {
      const instance = getAppInstance(appId);
      if (!instance) return null;

      const shareUrl = generateShareUrl(appId);
      if (!shareUrl) return null;

      return {
        title: instance.name,
        text: `Check out my "${instance.name}" app built with A2UI!`,
        url: shareUrl,
      };
    },
    [getAppInstance, generateShareUrl]
  );

  /**
   * Share app using Web Share API (for mobile/supported browsers)
   */
  const shareAppNative = useCallback(
    async (appId: string): Promise<boolean> => {
      const shareData = getShareData(appId);
      if (!shareData) return false;

      // Check if Web Share API is supported
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share(shareData);
          return true;
        } catch (error) {
          // User cancelled or share failed
          if ((error as Error).name !== 'AbortError') {
            log.error('A2UI AppBuilder: Native share failed', error as Error);
          }
          return false;
        }
      }

      // Fallback: copy URL to clipboard
      return copyAppToClipboard(appId, 'url');
    },
    [getShareData, copyAppToClipboard]
  );

  /**
   * Generate social share URLs for various platforms
   */
  const getSocialShareUrls = useCallback(
    (appId: string): Record<string, string> | null => {
      const shareData = getShareData(appId);
      if (!shareData) return null;

      const encodedUrl = encodeURIComponent(shareData.url);
      const encodedTitle = encodeURIComponent(shareData.title);
      const encodedText = encodeURIComponent(shareData.text);

      return {
        twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
        whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
        email: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`,
        wechat: shareData.url, // WeChat requires QR code scanning
      };
    },
    [getShareData]
  );

  // ========== Metadata Management ==========

  /**
   * Update app metadata (description, tags, author, etc.)
   */
  const updateAppMetadata = useCallback(
    (appId: string, metadata: Partial<A2UIAppInstance>): void => {
      const instances = getAppInstancesCache();
      const instance = instances.get(appId);

      if (instance) {
        // Merge metadata, preserving core fields
        const updatedInstance: A2UIAppInstance = {
          ...instance,
          ...metadata,
          // Ensure core fields are not overwritten incorrectly
          id: instance.id,
          createdAt: instance.createdAt,
          lastModified: Date.now(),
        };

        instances.set(appId, updatedInstance);
        saveAppInstances(instances);
      }
    },
    []
  );

  // ========== Thumbnail Management ==========

  /**
   * Set app thumbnail
   */
  const setAppThumbnail = useCallback((appId: string, thumbnail: string): void => {
    const instances = getAppInstancesCache();
    const instance = instances.get(appId);

    if (instance) {
      instance.thumbnail = thumbnail;
      instance.thumbnailUpdatedAt = Date.now();
      instance.lastModified = Date.now();
      saveAppInstances(instances);
    }
  }, []);

  /**
   * Clear app thumbnail
   */
  const clearAppThumbnail = useCallback((appId: string): void => {
    const instances = getAppInstancesCache();
    const instance = instances.get(appId);

    if (instance) {
      delete instance.thumbnail;
      delete instance.thumbnailUpdatedAt;
      instance.lastModified = Date.now();
      saveAppInstances(instances);
    }
  }, []);

  // ========== Statistics ==========

  /**
   * Increment app view count
   */
  const incrementAppViews = useCallback((appId: string): void => {
    const instances = getAppInstancesCache();
    const instance = instances.get(appId);

    if (instance) {
      if (!instance.stats) {
        instance.stats = {};
      }
      instance.stats.views = (instance.stats.views || 0) + 1;
      saveAppInstances(instances);
    }
  }, []);

  /**
   * Increment app use count
   */
  const incrementAppUses = useCallback((appId: string): void => {
    const instances = getAppInstancesCache();
    const instance = instances.get(appId);

    if (instance) {
      if (!instance.stats) {
        instance.stats = {};
      }
      instance.stats.uses = (instance.stats.uses || 0) + 1;
      saveAppInstances(instances);
    }
  }, []);

  // ========== App Store Preparation ==========

  /**
   * Check if app is ready for publishing and list missing fields
   */
  const prepareForPublish = useCallback((appId: string): { valid: boolean; missing: string[] } => {
    const instance = getAppInstancesCache().get(appId);
    const missing: string[] = [];

    if (!instance) {
      return { valid: false, missing: ['App not found'] };
    }

    // Required fields for publishing
    if (!instance.name || instance.name.trim().length < 2) {
      missing.push('name (at least 2 characters)');
    }
    if (!instance.description || instance.description.trim().length < 10) {
      missing.push('description (at least 10 characters)');
    }
    if (!instance.thumbnail) {
      missing.push('thumbnail');
    }
    if (!instance.category) {
      missing.push('category');
    }
    if (!instance.version) {
      missing.push('version');
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }, []);

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

    // Import/Export
    exportApp,
    downloadApp,
    importApp,
    importAppFromFile,
    exportAllApps,
    importAllApps,

    // Share
    generateShareCode,
    importFromShareCode,
    generateShareUrl,
    copyAppToClipboard,
    getShareData,
    shareAppNative,
    getSocialShareUrls,

    // Metadata management
    updateAppMetadata,

    // Thumbnail management
    setAppThumbnail,
    clearAppThumbnail,

    // Statistics
    incrementAppViews,
    incrementAppUses,

    // App store preparation
    prepareForPublish,

    // Active app
    activeAppId: a2ui.activeSurfaceId,
    setActiveApp: a2ui.setActiveSurface,
  };
}

export type { A2UIAppTemplate };
