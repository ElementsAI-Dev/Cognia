/**
 * Plugin System - Extensible plugin architecture for the designer
 * Enables modular functionality through standardized plugin interfaces
 */

import type { DesignerElement } from '@/types/designer';

export type PluginCategory = 'analysis' | 'export' | 'enhancement' | 'integration';
export type PluginHook = 'beforeEdit' | 'afterEdit' | 'beforeExport' | 'afterExport' | 'onSelect' | 'onRender';

export interface PluginContext {
  code: string;
  elementTree: DesignerElement | null;
  selectedElementId: string | null;
  getElement: (id: string) => DesignerElement | null;
  updateCode: (code: string) => void;
  showNotification: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export interface PluginResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  modifications?: {
    code?: string;
    elementUpdates?: Array<{ id: string; updates: Partial<DesignerElement> }>;
  };
}

export interface PluginAction {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  execute: (context: PluginContext) => Promise<PluginResult>;
}

export interface PluginPanel {
  id: string;
  title: string;
  icon?: string;
  position: 'left' | 'right' | 'bottom';
  component: React.ComponentType<{ context: PluginContext }>;
}

export interface DesignerPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  category: PluginCategory;
  enabled: boolean;
  hooks?: Partial<Record<PluginHook, (context: PluginContext) => Promise<PluginResult>>>;
  actions?: PluginAction[];
  panels?: PluginPanel[];
  settings?: PluginSetting[];
  initialize?: (context: PluginContext) => Promise<void>;
  destroy?: () => Promise<void>;
}

export interface PluginSetting {
  id: string;
  label: string;
  type: 'boolean' | 'string' | 'number' | 'select';
  default: unknown;
  options?: Array<{ label: string; value: unknown }>;
}

export interface PluginRegistry {
  plugins: Map<string, DesignerPlugin>;
  enabledPlugins: Set<string>;
  settings: Map<string, Record<string, unknown>>;
}

const STORAGE_KEY = 'cognia-designer-plugins';

let registry: PluginRegistry = {
  plugins: new Map(),
  enabledPlugins: new Set(),
  settings: new Map(),
};

/**
 * Load plugin settings from storage
 */
function loadPluginSettings(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      registry.enabledPlugins = new Set(data.enabled || []);
      registry.settings = new Map(Object.entries(data.settings || {}));
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Save plugin settings to storage
 */
function savePluginSettings(): void {
  if (typeof window === 'undefined') return;
  
  const data = {
    enabled: Array.from(registry.enabledPlugins),
    settings: Object.fromEntries(registry.settings),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Register a plugin
 */
export function registerPlugin(plugin: DesignerPlugin): void {
  registry.plugins.set(plugin.id, plugin);
  
  // Initialize default settings
  if (plugin.settings && !registry.settings.has(plugin.id)) {
    const defaults: Record<string, unknown> = {};
    plugin.settings.forEach((s) => {
      defaults[s.id] = s.default;
    });
    registry.settings.set(plugin.id, defaults);
  }
  
  // Load saved settings
  loadPluginSettings();
  
  // Check if plugin should be enabled
  if (registry.enabledPlugins.has(plugin.id)) {
    plugin.enabled = true;
  }
}

/**
 * Unregister a plugin
 */
export function unregisterPlugin(pluginId: string): boolean {
  const plugin = registry.plugins.get(pluginId);
  if (!plugin) return false;
  
  // Destroy plugin if it has a cleanup function
  if (plugin.destroy) {
    plugin.destroy();
  }
  
  registry.plugins.delete(pluginId);
  registry.enabledPlugins.delete(pluginId);
  savePluginSettings();
  
  return true;
}

/**
 * Enable a plugin
 */
export async function enablePlugin(pluginId: string, context: PluginContext): Promise<boolean> {
  const plugin = registry.plugins.get(pluginId);
  if (!plugin) return false;
  
  plugin.enabled = true;
  registry.enabledPlugins.add(pluginId);
  savePluginSettings();
  
  // Initialize plugin
  if (plugin.initialize) {
    await plugin.initialize(context);
  }
  
  return true;
}

/**
 * Disable a plugin
 */
export async function disablePlugin(pluginId: string): Promise<boolean> {
  const plugin = registry.plugins.get(pluginId);
  if (!plugin) return false;
  
  plugin.enabled = false;
  registry.enabledPlugins.delete(pluginId);
  savePluginSettings();
  
  // Destroy plugin
  if (plugin.destroy) {
    await plugin.destroy();
  }
  
  return true;
}

/**
 * Get a plugin by ID
 */
export function getPlugin(pluginId: string): DesignerPlugin | undefined {
  return registry.plugins.get(pluginId);
}

/**
 * Get all registered plugins
 */
export function getAllPlugins(): DesignerPlugin[] {
  return Array.from(registry.plugins.values());
}

/**
 * Get enabled plugins
 */
export function getEnabledPlugins(): DesignerPlugin[] {
  return getAllPlugins().filter((p) => p.enabled);
}

/**
 * Get plugins by category
 */
export function getPluginsByCategory(category: PluginCategory): DesignerPlugin[] {
  return getAllPlugins().filter((p) => p.category === category);
}

/**
 * Execute a plugin hook
 */
export async function executeHook(
  hook: PluginHook,
  context: PluginContext
): Promise<PluginResult[]> {
  const results: PluginResult[] = [];
  
  for (const plugin of getEnabledPlugins()) {
    if (plugin.hooks?.[hook]) {
      try {
        const result = await plugin.hooks[hook]!(context);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Hook execution failed',
        });
      }
    }
  }
  
  return results;
}

/**
 * Execute a plugin action
 */
export async function executePluginAction(
  pluginId: string,
  actionId: string,
  context: PluginContext
): Promise<PluginResult> {
  const plugin = registry.plugins.get(pluginId);
  if (!plugin || !plugin.enabled) {
    return { success: false, error: 'Plugin not found or disabled' };
  }
  
  const action = plugin.actions?.find((a) => a.id === actionId);
  if (!action) {
    return { success: false, error: 'Action not found' };
  }
  
  try {
    return await action.execute(context);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Action execution failed',
    };
  }
}

/**
 * Get plugin settings
 */
export function getPluginSettings(pluginId: string): Record<string, unknown> {
  return registry.settings.get(pluginId) || {};
}

/**
 * Update plugin settings
 */
export function updatePluginSettings(
  pluginId: string,
  settings: Record<string, unknown>
): void {
  const current = registry.settings.get(pluginId) || {};
  registry.settings.set(pluginId, { ...current, ...settings });
  savePluginSettings();
}

/**
 * Get all plugin actions
 */
export function getAllPluginActions(): Array<PluginAction & { pluginId: string }> {
  const actions: Array<PluginAction & { pluginId: string }> = [];
  
  for (const plugin of getEnabledPlugins()) {
    if (plugin.actions) {
      plugin.actions.forEach((action) => {
        actions.push({ ...action, pluginId: plugin.id });
      });
    }
  }
  
  return actions;
}

/**
 * Get all plugin panels
 */
export function getAllPluginPanels(): Array<PluginPanel & { pluginId: string }> {
  const panels: Array<PluginPanel & { pluginId: string }> = [];
  
  for (const plugin of getEnabledPlugins()) {
    if (plugin.panels) {
      plugin.panels.forEach((panel) => {
        panels.push({ ...panel, pluginId: plugin.id });
      });
    }
  }
  
  return panels;
}

/**
 * Reset plugin registry (for testing)
 */
export function resetPluginRegistry(): void {
  registry = {
    plugins: new Map(),
    enabledPlugins: new Set(),
    settings: new Map(),
  };
}

const pluginSystemAPI = {
  registerPlugin,
  unregisterPlugin,
  enablePlugin,
  disablePlugin,
  getPlugin,
  getAllPlugins,
  getEnabledPlugins,
  getPluginsByCategory,
  executeHook,
  executePluginAction,
  getPluginSettings,
  updatePluginSettings,
  getAllPluginActions,
  getAllPluginPanels,
  resetPluginRegistry,
};

export default pluginSystemAPI;
