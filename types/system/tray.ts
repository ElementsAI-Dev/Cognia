/**
 * System Tray Types
 * Type definitions for system tray configuration and state management
 */

/**
 * Tray menu item category
 */
export type TrayMenuCategory =
  | 'window'
  | 'tools'
  | 'settings'
  | 'help'
  | 'exit';

/**
 * Individual tray menu item configuration
 */
export interface TrayMenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Display label */
  label: string;
  /** Emoji icon (optional) */
  icon?: string;
  /** Keyboard shortcut hint (optional) */
  shortcut?: string;
  /** Whether the item is enabled */
  enabled: boolean;
  /** Whether the item is visible */
  visible: boolean;
  /** Display order (lower = higher priority) */
  order: number;
  /** Category for grouping */
  category: TrayMenuCategory;
  /** Whether this is a submenu parent */
  isSubmenu?: boolean;
  /** Parent submenu ID (if this is a child item) */
  parentId?: string;
  /** Whether this is a checkbox item */
  isCheckbox?: boolean;
  /** Checkbox state (if isCheckbox) */
  checked?: boolean;
}

/**
 * Tray display mode
 */
export type TrayDisplayMode = 'full' | 'compact';

/**
 * Tray configuration stored in frontend
 */
export interface TrayConfig {
  /** Current display mode */
  displayMode: TrayDisplayMode;
  /** Visible item IDs in current mode */
  visibleItems: string[];
  /** Custom item order (item IDs in display order) */
  itemOrder: string[];
  /** Whether to show keyboard shortcuts in menu */
  showShortcuts: boolean;
  /** Whether to show emoji icons */
  showIcons: boolean;
  /** Custom compact mode items (override defaults) */
  compactModeItems?: string[];
}

/**
 * Default compact mode item IDs
 */
export const DEFAULT_COMPACT_ITEMS: string[] = [
  'toggle-chat-widget',
  'screenshot-region',
  'clipboard-history',
  'open-settings',
  'quit',
];

/**
 * All available tray menu items with default configuration
 */
export const DEFAULT_TRAY_ITEMS: TrayMenuItem[] = [
  // Window controls
  {
    id: 'show-window',
    label: '显示主窗口',
    icon: '📱',
    enabled: true,
    visible: true,
    order: 0,
    category: 'window',
  },
  {
    id: 'hide-window',
    label: '隐藏主窗口',
    icon: '🔽',
    enabled: true,
    visible: true,
    order: 1,
    category: 'window',
  },
  {
    id: 'toggle-chat-widget',
    label: 'AI 助手',
    icon: '🤖',
    shortcut: 'Ctrl+Shift+Space',
    enabled: true,
    visible: true,
    order: 2,
    category: 'window',
  },
  {
    id: 'bubble-show',
    label: '显示悬浮气泡',
    icon: '💬',
    enabled: true,
    visible: true,
    order: 3,
    category: 'window',
  },
  {
    id: 'bubble-hide',
    label: '隐藏悬浮气泡',
    icon: '🔽',
    enabled: true,
    visible: true,
    order: 4,
    category: 'window',
  },
  {
    id: 'bubble-toggle-minimize',
    label: '折叠/展开气泡',
    icon: '📌',
    shortcut: 'Alt+M',
    enabled: true,
    visible: true,
    order: 5,
    category: 'window',
  },

  // Screenshot tools
  {
    id: 'screenshot-menu',
    label: '截图工具',
    icon: '📸',
    enabled: true,
    visible: true,
    order: 10,
    category: 'tools',
    isSubmenu: true,
  },
  {
    id: 'screenshot-fullscreen',
    label: '全屏截图',
    icon: '🖼️',
    shortcut: 'Ctrl+Shift+S',
    enabled: true,
    visible: true,
    order: 11,
    category: 'tools',
    parentId: 'screenshot-menu',
  },
  {
    id: 'screenshot-region',
    label: '区域截图',
    icon: '✂️',
    shortcut: 'Ctrl+Shift+A',
    enabled: true,
    visible: true,
    order: 12,
    category: 'tools',
    parentId: 'screenshot-menu',
  },
  {
    id: 'screenshot-window',
    label: '窗口截图',
    icon: '🪟',
    enabled: true,
    visible: true,
    order: 13,
    category: 'tools',
    parentId: 'screenshot-menu',
  },
  {
    id: 'screenshot-ocr',
    label: '截图识字 (OCR)',
    icon: '📝',
    enabled: true,
    visible: true,
    order: 14,
    category: 'tools',
    parentId: 'screenshot-menu',
  },

  // Recording tools
  {
    id: 'recording-menu',
    label: '录屏工具',
    icon: '🎬',
    enabled: true,
    visible: true,
    order: 20,
    category: 'tools',
    isSubmenu: true,
  },
  {
    id: 'recording-start',
    label: '开始录屏',
    icon: '⏺️',
    shortcut: 'Ctrl+Shift+R',
    enabled: true,
    visible: true,
    order: 21,
    category: 'tools',
    parentId: 'recording-menu',
  },
  {
    id: 'recording-stop',
    label: '停止录屏',
    icon: '⏹️',
    enabled: true,
    visible: true,
    order: 22,
    category: 'tools',
    parentId: 'recording-menu',
  },
  {
    id: 'recording-pause',
    label: '暂停/继续',
    icon: '⏸️',
    enabled: true,
    visible: true,
    order: 23,
    category: 'tools',
    parentId: 'recording-menu',
  },

  // Selection tools
  {
    id: 'selection-menu',
    label: '划词工具',
    icon: '✨',
    enabled: true,
    visible: true,
    order: 30,
    category: 'tools',
    isSubmenu: true,
  },
  {
    id: 'selection-enabled',
    label: '启用划词工具',
    icon: '✅',
    enabled: true,
    visible: true,
    order: 31,
    category: 'tools',
    parentId: 'selection-menu',
    isCheckbox: true,
    checked: true,
  },
  {
    id: 'selection-trigger',
    label: '立即检测选中文本',
    icon: '🔍',
    enabled: true,
    visible: true,
    order: 32,
    category: 'tools',
    parentId: 'selection-menu',
  },
  {
    id: 'selection-hide-toolbar',
    label: '隐藏划词工具条',
    icon: '🙈',
    enabled: true,
    visible: true,
    order: 33,
    category: 'tools',
    parentId: 'selection-menu',
  },
  {
    id: 'selection-restart',
    label: '重启划词服务',
    icon: '🔄',
    enabled: true,
    visible: true,
    order: 34,
    category: 'tools',
    parentId: 'selection-menu',
  },

  // Clipboard
  {
    id: 'clipboard-menu',
    label: '剪贴板',
    icon: '📋',
    enabled: true,
    visible: true,
    order: 40,
    category: 'tools',
    isSubmenu: true,
  },
  {
    id: 'clipboard-history',
    label: '剪贴板历史',
    icon: '📋',
    shortcut: 'Ctrl+Shift+V',
    enabled: true,
    visible: true,
    order: 41,
    category: 'tools',
    parentId: 'clipboard-menu',
  },
  {
    id: 'clipboard-clear',
    label: '清空剪贴板历史',
    icon: '🗑️',
    enabled: true,
    visible: true,
    order: 42,
    category: 'tools',
    parentId: 'clipboard-menu',
  },

  // Settings
  {
    id: 'settings-menu',
    label: '设置',
    icon: '⚙️',
    enabled: true,
    visible: true,
    order: 50,
    category: 'settings',
    isSubmenu: true,
  },
  {
    id: 'autostart-enabled',
    label: '开机自动启动',
    icon: '🚀',
    enabled: true,
    visible: true,
    order: 51,
    category: 'settings',
    parentId: 'settings-menu',
    isCheckbox: true,
    checked: false,
  },
  {
    id: 'open-settings',
    label: '打开设置',
    icon: '⚙️',
    enabled: true,
    visible: true,
    order: 52,
    category: 'settings',
    parentId: 'settings-menu',
  },
  {
    id: 'open-logs',
    label: '查看日志',
    icon: '📄',
    enabled: true,
    visible: true,
    order: 53,
    category: 'settings',
    parentId: 'settings-menu',
  },

  // Help
  {
    id: 'check-update',
    label: '检查更新',
    icon: '🔄',
    enabled: true,
    visible: true,
    order: 60,
    category: 'help',
  },
  {
    id: 'open-help',
    label: '帮助文档',
    icon: '❓',
    enabled: true,
    visible: true,
    order: 61,
    category: 'help',
  },
  {
    id: 'about',
    label: '关于 Cognia',
    icon: 'ℹ️',
    enabled: true,
    visible: true,
    order: 62,
    category: 'help',
  },

  // Exit
  {
    id: 'quit',
    label: '退出 Cognia',
    icon: '🚪',
    enabled: true,
    visible: true,
    order: 100,
    category: 'exit',
  },
];

/**
 * Default tray configuration
 */
export const DEFAULT_TRAY_CONFIG: TrayConfig = {
  displayMode: 'full',
  visibleItems: DEFAULT_TRAY_ITEMS.map((item) => item.id),
  itemOrder: DEFAULT_TRAY_ITEMS.map((item) => item.id),
  showShortcuts: true,
  showIcons: true,
  compactModeItems: DEFAULT_COMPACT_ITEMS,
};

/**
 * Tray state from backend
 */
export interface TrayState {
  /** Whether the app is busy */
  isBusy: boolean;
  /** Whether recording is in progress */
  isRecording: boolean;
  /** Current status message */
  statusMessage: string;
}

/**
 * Tray icon state
 */
export type TrayIconState = 'normal' | 'recording' | 'busy' | 'notification';

/**
 * Tray event types
 */
export type TrayEventType =
  | 'config-changed'
  | 'mode-changed'
  | 'state-changed'
  | 'menu-refreshed';

/**
 * Tray event payload
 */
export interface TrayEvent {
  type: TrayEventType;
  payload?: unknown;
}
