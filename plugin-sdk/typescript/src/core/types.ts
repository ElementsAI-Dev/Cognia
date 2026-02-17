/**
 * Core Plugin Types
 *
 * @description Fundamental type definitions for the Cognia Plugin SDK.
 * These types define the basic building blocks for plugin development.
 */

/**
 * Plugin type - determines the runtime environment
 *
 * @remarks
 * - `frontend`: JavaScript/TypeScript plugin running in the renderer process
 * - `python`: Python plugin running via PyO3 bridge
 * - `hybrid`: Combination of frontend and Python components
 *
 * @example
 * ```typescript
 * const manifest: PluginManifest = {
 *   type: 'frontend',
 *   // ...
 * };
 * ```
 */
export type PluginType =
  | 'frontend'    // JavaScript/TypeScript plugin running in renderer
  | 'python'      // Python plugin running via PyO3
  | 'hybrid';     // Combination of frontend and Python components

/**
 * Plugin capabilities - what features the plugin provides
 *
 * @remarks
 * Capabilities are declared in the manifest and determine which features
 * the plugin can use. Multiple capabilities can be specified.
 *
 * @example
 * ```typescript
 * const manifest: PluginManifest = {
 *   capabilities: ['tools', 'hooks', 'components'],
 *   // ...
 * };
 * ```
 */
export type PluginCapability =
  | 'tools'       // Provides Agent tools
  | 'components'  // Provides A2UI components
  | 'modes'       // Provides Agent modes
  | 'skills'      // Provides Skills
  | 'themes'      // Provides UI themes
  | 'commands'    // Provides slash commands
  | 'hooks'       // Provides lifecycle hooks
  | 'processors'  // Provides message processors
  | 'providers'   // Provides AI model providers
  | 'exporters'   // Provides export formats
  | 'importers'   // Provides import handlers
  | 'a2ui'        // A2UI integration
  | 'python'      // Python runtime capability
  | 'scheduler';  // Provides scheduled tasks

/**
 * Plugin status in the lifecycle
 *
 * @remarks
 * Tracks the current state of a plugin through its lifecycle from discovery
 * to activation and potential deactivation.
 */
export type PluginStatus =
  | 'discovered'  // Found but not loaded
  | 'installed'   // Downloaded/copied to plugins directory
  | 'loading'     // Currently loading
  | 'loaded'      // Loaded but not enabled
  | 'enabling'    // Currently enabling
  | 'enabled'     // Active and running
  | 'disabling'   // Currently disabling
  | 'disabled'    // Loaded but inactive
  | 'unloading'   // Currently unloading
  | 'error'       // Error state
  | 'updating';   // Being updated

/**
 * Plugin source - where the plugin came from
 *
 * @remarks
 * Indicates how the plugin was installed and whether it supports hot reload.
 */
export type PluginSource =
  | 'builtin'     // Bundled with the app
  | 'local'       // Installed from local directory
  | 'marketplace' // Downloaded from marketplace
  | 'git'         // Cloned from git repository
  | 'dev';        // Development mode (hot reload enabled)

/**
 * Permission types that plugins can request
 *
 * @remarks
 * Permissions control what sensitive operations a plugin can perform.
 * Required permissions are requested on install, optional permissions
 * can be requested at runtime.
 *
 * @see {@link PluginPermissionAPI} for requesting permissions at runtime
 */
export type PluginPermission =
  | 'filesystem:read'      // Read files
  | 'filesystem:write'     // Write files
  | 'network:fetch'        // Make HTTP requests
  | 'network:websocket'    // WebSocket connections
  | 'clipboard:read'       // Read clipboard
  | 'clipboard:write'      // Write clipboard
  | 'notification'         // Show notifications
  | 'shell:execute'        // Execute shell commands
  | 'process:spawn'        // Spawn processes
  | 'database:read'        // Read from database
  | 'database:write'       // Write to database
  | 'settings:read'        // Read settings
  | 'settings:write'       // Modify settings
  | 'session:read'         // Read chat sessions
  | 'session:write'        // Modify chat sessions
  | 'agent:control'        // Control agent execution
  | 'python:execute';      // Execute Python code

/**
 * Plugin API permission types for extended features
 */
export type PluginAPIPermission =
  | 'session:read'
  | 'session:write'
  | 'session:delete'
  | 'project:read'
  | 'project:write'
  | 'project:delete'
  | 'vector:read'
  | 'vector:write'
  | 'canvas:read'
  | 'canvas:write'
  | 'artifact:read'
  | 'artifact:write'
  | 'ai:chat'
  | 'ai:embed'
  | 'export:session'
  | 'export:project'
  | 'theme:read'
  | 'theme:write'
  | 'extension:ui'
  | 'notification:show';

// =============================================================================
// Backward Compatibility Aliases (Deprecated)
// =============================================================================

/**
 * @deprecated Use `PluginAPIPermission` instead
 */
export type ExtendedPluginPermission = PluginAPIPermission;

// =============================================================================
// Host Bridge v2
// =============================================================================

export type PluginApiErrorCode =
  | 'INVALID_REQUEST'
  | 'PERMISSION_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'NOT_SUPPORTED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TIMEOUT'
  | 'INTERNAL';

export interface PluginApiError {
  code: PluginApiErrorCode;
  message: string;
  details?: unknown;
}

export interface PluginHostCompatInfo {
  sdkVersion: string;
  minSupportedSdk: string;
  compatible: boolean;
}

export interface PluginHostInvokeResponse<T = unknown> {
  requestId: string;
  success: boolean;
  data?: T;
  error?: PluginApiError;
  runtimeVersion: string;
  compat: PluginHostCompatInfo;
}

export interface PluginHostInvokeOptions {
  timeoutMs?: number;
  context?: unknown;
}

export interface PluginHostTransport {
  invoke: <T = unknown>(
    api: string,
    payload: unknown,
    options?: PluginHostInvokeOptions
  ) => Promise<PluginHostInvokeResponse<T>>;
}
