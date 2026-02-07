/**
 * Storage Management Types
 * Centralized type definitions for storage management
 */

/**
 * Storage type enumeration
 */
export type StorageType = 'localStorage' | 'sessionStorage' | 'indexedDB' | 'cache';

/**
 * Storage key metadata
 */
export interface StorageKeyInfo {
  key: string;
  type: StorageType;
  size: number;
  lastModified?: number;
  category?: StorageCategory;
}

/**
 * Storage category for grouping related data
 */
export type StorageCategory =
  | 'settings'
  | 'session'
  | 'chat'
  | 'artifact'
  | 'agent'
  | 'media'
  | 'learning'
  | 'workflow'
  | 'plugin'
  | 'cache'
  | 'vector'
  | 'document'
  | 'project'
  | 'system'
  | 'other';

/**
 * Storage category metadata
 */
export interface StorageCategoryInfo {
  category: StorageCategory;
  displayName: string;
  description: string;
  icon: string;
  keys: string[];
  totalSize: number;
  itemCount: number;
}

/**
 * Storage usage statistics
 */
export interface StorageStats {
  localStorage: {
    used: number;
    quota: number;
    itemCount: number;
  };
  sessionStorage: {
    used: number;
    quota: number;
    itemCount: number;
  };
  indexedDB: {
    used: number;
    quota: number;
    databases: DatabaseInfo[];
  };
  total: {
    used: number;
    quota: number;
    usagePercent: number;
  };
  byCategory: StorageCategoryInfo[];
  lastUpdated: number;
}

/**
 * IndexedDB database info
 */
export interface DatabaseInfo {
  name: string;
  size: number;
  tableCount: number;
  tables: TableInfo[];
}

/**
 * IndexedDB table info
 */
export interface TableInfo {
  name: string;
  recordCount: number;
  estimatedSize: number;
}

/**
 * Storage cleanup options
 */
export interface CleanupOptions {
  /** Target storage types to clean */
  storageTypes?: StorageType[];
  /** Target categories to clean */
  categories?: StorageCategory[];
  /** Only clean data older than this (ms) */
  olderThan?: number;
  /** Dry run - don't actually delete */
  dryRun?: boolean;
  /** Maximum items to delete per category */
  maxItemsPerCategory?: number;
  /** Preserve pinned/favorite items */
  preservePinned?: boolean;
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  success: boolean;
  freedSpace: number;
  deletedItems: number;
  errors: CleanupError[];
  details: CleanupDetail[];
}

/**
 * Cleanup detail per category
 */
export interface CleanupDetail {
  category: StorageCategory;
  storageType: StorageType;
  deletedItems: number;
  freedSpace: number;
  skippedItems: number;
}

/**
 * Cleanup error
 */
export interface CleanupError {
  key: string;
  storageType: StorageType;
  error: string;
}

/**
 * Storage health status
 */
export interface StorageHealth {
  status: 'healthy' | 'warning' | 'critical';
  usagePercent: number;
  issues: StorageIssue[];
  recommendations: StorageRecommendation[];
}

/**
 * Storage issue
 */
export interface StorageIssue {
  type: 'quota_warning' | 'quota_critical' | 'stale_data' | 'orphan_data' | 'large_item';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedKeys?: string[];
  suggestedAction?: string;
}

/**
 * Storage recommendation
 */
export interface StorageRecommendation {
  action: string;
  description: string;
  estimatedSavings: number;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Storage event types
 */
export type StorageEventType =
  | 'set'
  | 'get'
  | 'delete'
  | 'clear'
  | 'cleanup'
  | 'quota_warning'
  | 'quota_exceeded'
  | 'error';

/**
 * Storage event
 */
export interface StorageEvent {
  type: StorageEventType;
  storageType: StorageType;
  key?: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

/**
 * Storage event listener
 */
export type StorageEventListener = (event: StorageEvent) => void;

/**
 * Storage manager configuration
 */
export interface StorageManagerConfig {
  /** Warning threshold (0-1) */
  warningThreshold: number;
  /** Critical threshold (0-1) */
  criticalThreshold: number;
  /** Auto cleanup enabled */
  autoCleanup: boolean;
  /** Auto cleanup interval (ms) */
  cleanupInterval: number;
  /** Max age for stale data (ms) */
  staleDataAge: number;
  /** Enable event logging */
  enableEventLogging: boolean;
  /** Max event log size */
  maxEventLogSize: number;
}

/**
 * Default storage manager configuration
 */
export const DEFAULT_STORAGE_MANAGER_CONFIG: StorageManagerConfig = {
  warningThreshold: 0.7,
  criticalThreshold: 0.9,
  autoCleanup: false,
  cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
  staleDataAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  enableEventLogging: false,
  maxEventLogSize: 100,
};

/**
 * Cognia storage key prefixes and their categories
 */
export const STORAGE_KEY_CATEGORIES: Record<string, StorageCategory> = {
  'cognia-settings': 'settings',
  'cognia-sessions': 'session',
  'cognia-chat': 'chat',
  'cognia-artifacts': 'artifact',
  'cognia-agents': 'agent',
  'cognia-background-agents': 'agent',
  'cognia-sub-agents': 'agent',
  'cognia-skills': 'agent',
  'cognia-media': 'media',
  'cognia-image-studio': 'media',
  'cognia-screen-recording': 'media',
  'cognia-batch-edit': 'media',
  'cognia-learning': 'learning',
  'cognia-speedpass': 'learning',
  'cognia-workflows': 'workflow',
  'cognia-workflow-editor': 'workflow',
  'cognia-plugins': 'plugin',
  'cognia-vector': 'vector',
  'cognia-documents': 'document',
  'cognia-projects': 'project',
  'cognia-project-activities': 'project',
  'cognia-usage': 'system',
  'cognia-window-store': 'system',
  'cognia-recent-files': 'system',
  'cognia-tray-config': 'system',
  'cognia-presets': 'settings',
  'cognia-custom-themes': 'settings',
  'cognia-completion-settings': 'settings',
  'cognia-settings-profiles': 'settings',
  'cognia-prompt-templates': 'chat',
  'cognia-prompt-marketplace': 'chat',
  'cognia-memories': 'chat',
  'cognia-tool-history': 'system',
  'cognia-sandbox': 'system',
  'cognia-git': 'project',
  'cognia-latex': 'document',
  'cognia-input-completion': 'system',
  'cognia-skill-seekers': 'agent',
  'cognia-skills-storage': 'agent',
  'cognia-skill-marketplace-storage': 'agent',
  'cognia-sync': 'system',
  'cognia-backup': 'system',
  'cognia-arena': 'chat',
  'cognia-arena-leaderboard': 'chat',
  'cognia-a2ui': 'system',
  'cognia-academic': 'learning',
  'cognia-knowledge-map': 'learning',
  'cognia-chunked-document': 'document',
  'cognia-keybindings': 'system',
  'cognia-comments': 'document',
  'cognia-canvas-settings': 'document',
  'cognia-designer': 'system',
  'cognia-designer-history': 'system',
  'cognia-custom-modes': 'agent',
  'cognia-external-agents': 'agent',
  'cognia-process-store': 'system',
  'cognia-agent-teams': 'agent',
  'cognia-scheduler': 'system',
  'cognia-screenshot-editor': 'media',
  'cognia-recording-toolbar': 'media',
  'cognia-video-editor': 'media',
  'cognia-plugin-marketplace': 'plugin',
  'cognia-sandbox-store': 'system',
  'cognia-templates': 'system',
  'cognia-ppt-editor': 'system',
  'cognia-tool-history-storage': 'system',
  'cognia-context': 'system',
  'cognia-chat-widget': 'chat',
  'selection-toolbar-storage': 'system',
  'app-cache': 'cache',
};

/**
 * Category display information
 */
export const CATEGORY_INFO: Record<StorageCategory, { displayName: string; description: string; icon: string }> = {
  settings: {
    displayName: 'Settings',
    description: 'User preferences and configuration',
    icon: 'Settings',
  },
  session: {
    displayName: 'Sessions',
    description: 'Chat sessions and conversation history',
    icon: 'MessageSquare',
  },
  chat: {
    displayName: 'Chat Data',
    description: 'Chat-related data and templates',
    icon: 'MessageCircle',
  },
  artifact: {
    displayName: 'Artifacts',
    description: 'Generated code and content artifacts',
    icon: 'FileCode',
  },
  agent: {
    displayName: 'Agents',
    description: 'AI agents and skills configuration',
    icon: 'Bot',
  },
  media: {
    displayName: 'Media',
    description: 'Images, videos, and media files',
    icon: 'Image',
  },
  learning: {
    displayName: 'Learning',
    description: 'Learning sessions and progress',
    icon: 'GraduationCap',
  },
  workflow: {
    displayName: 'Workflows',
    description: 'Workflow definitions and executions',
    icon: 'Workflow',
  },
  plugin: {
    displayName: 'Plugins',
    description: 'Installed plugins and extensions',
    icon: 'Puzzle',
  },
  cache: {
    displayName: 'Cache',
    description: 'Temporary cached data',
    icon: 'Database',
  },
  vector: {
    displayName: 'Vector Store',
    description: 'Embeddings and vector data',
    icon: 'Layers',
  },
  document: {
    displayName: 'Documents',
    description: 'Stored documents and files',
    icon: 'FileText',
  },
  project: {
    displayName: 'Projects',
    description: 'Project data and activities',
    icon: 'Folder',
  },
  system: {
    displayName: 'System',
    description: 'System and utility data',
    icon: 'Cog',
  },
  other: {
    displayName: 'Other',
    description: 'Uncategorized storage data',
    icon: 'MoreHorizontal',
  },
};

/**
 * IndexedDB database names used by Cognia
 */
export const INDEXED_DB_NAMES = {
  COGNIA_DB: 'CogniaDB',
  RAG_STORAGE: 'cognia-rag-storage',
} as const;
