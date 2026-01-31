/**
 * Plugin Hooks - React hooks for plugin system
 */

export { usePlugin, usePlugins, usePluginEvents } from './use-plugin';
export { usePluginTools, usePluginToolsFromPlugin } from './use-plugin-tools';
export { usePluginModes, usePluginModesFromPlugin } from './use-plugin-modes';
export {
  usePluginComponents,
  usePluginComponentsFromPlugin,
  usePluginComponent,
} from './use-plugin-components';

// IPC & Events
export {
  usePluginIPC,
  usePluginEvents as usePluginEventBus,
  useEventSubscription,
  type UsePluginIPCOptions,
  type UsePluginIPCResult,
  type UsePluginEventsOptions,
  type UsePluginEventsResult,
} from './use-plugin-ipc';

// Permissions
export {
  usePluginPermissions,
  usePermissionCheck,
  usePermissionRequest,
  type UsePluginPermissionsOptions,
  type UsePluginPermissionsResult,
  type UsePermissionRequestResult,
} from './use-plugin-permissions';

// Marketplace
export { useMarketplace } from './use-marketplace';

// Python Runtime
export {
  usePythonRuntime,
  getPythonRuntimeInfo,
  listPythonPlugins,
  isPythonAvailable,
  type PythonRuntimeInfo,
  type PythonPluginInfo,
} from './use-python-runtime';
