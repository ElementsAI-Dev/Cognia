/**
 * Plugin System index
 * Re-exports plugin system and built-in plugins
 */

export {
  type PluginCategory,
  type PluginHook,
  type PluginContext,
  type PluginResult,
  type PluginAction,
  type PluginPanel,
  type DesignerPlugin,
  type PluginSetting,
  type PluginRegistry,
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
} from './plugin-system';

export {
  type AccessibilityIssue,
  type AccessibilityReport,
  createAccessibilityPlugin,
} from './accessibility-plugin';

/**
 * Register all built-in plugins
 */
import { registerPlugin } from './plugin-system';
import { createAccessibilityPlugin } from './accessibility-plugin';

export function registerBuiltInPlugins(): void {
  registerPlugin(createAccessibilityPlugin());
}
