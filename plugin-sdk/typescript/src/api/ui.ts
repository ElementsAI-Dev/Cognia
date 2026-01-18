/**
 * UI API Types
 *
 * @description Type definitions for UI interactions in plugins.
 */

/**
 * UI API for user interface interactions
 *
 * @remarks
 * Provides methods for showing notifications, dialogs, and registering UI elements.
 *
 * @example
 * ```typescript
 * // Show a notification
 * context.ui.showNotification({
 *   title: 'Success',
 *   body: 'Operation completed',
 *   timeout: 5000,
 * });
 *
 * // Show a dialog
 * const result = await context.ui.showDialog({
 *   title: 'Confirm',
 *   content: <div>Are you sure?</div>,
 *   actions: [
 *     { label: 'Cancel', value: false },
 *     { label: 'OK', value: true },
 *   ],
 * });
 *
 * // Show input dialog
 * const input = await context.ui.showInputDialog({
 *   title: 'Enter value',
 *   placeholder: 'Type here...',
 * });
 *
 * // Register status bar item
 * const unregister = context.ui.registerStatusBarItem({
 *   id: 'my-status',
 *   text: 'Ready',
 *   icon: 'check',
 *   onClick: () => console.log('Clicked'),
 * });
 * ```
 */
export interface PluginUIAPI {
  showNotification: (options: PluginNotification) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  showDialog: (options: PluginDialog) => Promise<unknown>;
  showInputDialog: (options: PluginInputDialog) => Promise<string | null>;
  showConfirmDialog: (options: PluginConfirmDialog) => Promise<boolean>;
  registerStatusBarItem: (item: PluginStatusBarItem) => () => void;
  registerSidebarPanel: (panel: PluginSidebarPanel) => () => void;
}

/**
 * Notification options
 */
export interface PluginNotification {
  title: string;
  body: string;
  icon?: string;
  timeout?: number;
  actions?: Array<{ label: string; action: string }>;
}

/**
 * Dialog options
 */
export interface PluginDialog {
  title: string;
  content: unknown; // React.ReactNode
  actions?: Array<{ label: string; value: unknown; variant?: string }>;
}

/**
 * Input dialog options
 */
export interface PluginInputDialog {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  validate?: (value: string) => string | null;
}

/**
 * Confirm dialog options
 */
export interface PluginConfirmDialog {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

/**
 * Status bar item
 */
export interface PluginStatusBarItem {
  id: string;
  text: string;
  icon?: string;
  tooltip?: string;
  onClick?: () => void;
  priority?: number;
}

/**
 * Sidebar panel
 */
export interface PluginSidebarPanel {
  id: string;
  title: string;
  icon: string;
  component: unknown; // React.ComponentType
  position?: 'top' | 'bottom';
}

/**
 * Keyboard Shortcuts API
 *
 * @example
 * ```typescript
 * // Register a shortcut
 * const unregister = context.shortcuts.register('Ctrl+Shift+D', () => {
 *   console.log('Shortcut triggered!');
 * }, {
 *   when: 'editorFocus',
 *   description: 'Do something',
 * });
 *
 * // Register multiple
 * const unregisterAll = context.shortcuts.registerMany([
 *   { shortcut: 'Ctrl+K', callback: () => {} },
 *   { shortcut: 'Ctrl+L', callback: () => {} },
 * ]);
 *
 * // Check availability
 * const available = context.shortcuts.isAvailable('Ctrl+K');
 * ```
 */
export interface PluginShortcutsAPI {
  register: (shortcut: string, callback: () => void, options?: ShortcutOptions) => () => void;
  registerMany: (shortcuts: ShortcutRegistration[]) => () => void;
  isAvailable: (shortcut: string) => boolean;
  getRegistered: () => string[];
}

/**
 * Shortcut options
 */
export interface ShortcutOptions {
  when?: string;
  preventDefault?: boolean;
  description?: string;
}

/**
 * Shortcut registration
 */
export interface ShortcutRegistration {
  shortcut: string;
  callback: () => void;
  options?: ShortcutOptions;
}

/**
 * Context Menu API
 *
 * @example
 * ```typescript
 * // Register a menu item
 * const unregister = context.contextMenu.register({
 *   id: 'my-menu-item',
 *   label: 'Do Something',
 *   icon: 'zap',
 *   when: 'chat:message',
 *   onClick: (context) => {
 *     console.log('Context:', context);
 *   },
 * });
 *
 * // Register submenu
 * context.contextMenu.register({
 *   id: 'my-submenu',
 *   label: 'Actions',
 *   submenu: [
 *     { id: 'action1', label: 'Action 1', onClick: () => {} },
 *     { id: 'action2', label: 'Action 2', onClick: () => {} },
 *   ],
 * });
 * ```
 */
export interface PluginContextMenuAPI {
  register: (item: ContextMenuItem) => () => void;
  registerMany: (items: ContextMenuItem[]) => () => void;
}

/**
 * Context menu item
 */
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  when?: string | string[];
  onClick: (context: ContextMenuClickContext) => void;
  submenu?: ContextMenuItem[];
  separator?: boolean;
  disabled?: boolean | ((context: ContextMenuClickContext) => boolean);
}

/**
 * Context menu click context
 */
export interface ContextMenuClickContext {
  target: string; // ContextMenuContext
  selection?: string;
  messageId?: string;
  artifactId?: string;
  projectId?: string;
  sessionId?: string;
  position?: { x: number; y: number };
}

/**
 * Window API for window management
 *
 * @example
 * ```typescript
 * // Create a window
 * const window = await context.window.create({
 *   title: 'My Window',
 *   width: 800,
 *   height: 600,
 * });
 *
 * // Get main window
 * const main = context.window.getMain();
 *
 * // Focus window
 * context.window.focus(window.id);
 * ```
 */
export interface PluginWindowAPI {
  create: (options: WindowOptions) => Promise<PluginWindow>;
  getMain: () => PluginWindow;
  getAll: () => PluginWindow[];
  focus: (windowId: string) => void;
}

/**
 * Window options
 */
export interface WindowOptions {
  title: string;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  x?: number;
  y?: number;
  center?: boolean;
  resizable?: boolean;
  fullscreen?: boolean;
  alwaysOnTop?: boolean;
  decorations?: boolean;
  transparent?: boolean;
  url?: string;
  component?: unknown; // React.ComponentType
}

/**
 * Plugin window
 */
export interface PluginWindow {
  id: string;
  title: string;
  setTitle: (title: string) => void;
  close: () => void;
  minimize: () => void;
  maximize: () => void;
  unmaximize: () => void;
  isMaximized: () => boolean;
  setSize: (width: number, height: number) => void;
  getSize: () => { width: number; height: number };
  setPosition: (x: number, y: number) => void;
  getPosition: () => { x: number; y: number };
  center: () => void;
  setAlwaysOnTop: (flag: boolean) => void;
  show: () => void;
  hide: () => void;
  onClose: (callback: () => void) => () => void;
}

/**
 * Secrets API for secure storage
 *
 * @remarks
 * Provides secure storage for sensitive data like API keys and passwords.
 * Data is encrypted at rest.
 *
 * @example
 * ```typescript
 * // Store a secret
 * await context.secrets.store('apiKey', 'sk-...');
 *
 * // Retrieve a secret
 * const apiKey = await context.secrets.get('apiKey');
 *
 * // Check existence
 * const hasKey = await context.secrets.has('apiKey');
 *
 * // Delete a secret
 * await context.secrets.delete('apiKey');
 * ```
 */
export interface PluginSecretsAPI {
  store: (key: string, value: string) => Promise<void>;
  get: (key: string) => Promise<string | null>;
  delete: (key: string) => Promise<void>;
  has: (key: string) => Promise<boolean>;
}
