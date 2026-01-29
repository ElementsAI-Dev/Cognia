/**
 * Version Management API
 *
 * @description Plugin version management, update checking, and rollback support.
 */

/**
 * Semantic version object
 */
export interface SemanticVersion {
  /** Major version */
  major: number;
  /** Minor version */
  minor: number;
  /** Patch version */
  patch: number;
  /** Pre-release tag (e.g., 'alpha', 'beta', 'rc.1') */
  prerelease?: string;
  /** Build metadata */
  build?: string;
}

/**
 * Update information
 */
export interface UpdateInfo {
  /** Current version */
  currentVersion: string;
  /** Latest available version */
  latestVersion: string;
  /** Whether an update is available */
  updateAvailable: boolean;
  /** Whether update is critical/required */
  critical: boolean;
  /** Release notes */
  releaseNotes?: string;
  /** Release date */
  releaseDate?: Date;
  /** Download URL */
  downloadUrl?: string;
  /** Changelog URL */
  changelogUrl?: string;
  /** Minimum SDK version required */
  minSdkVersion?: string;
  /** Breaking changes warning */
  breakingChanges?: string[];
}

/**
 * Version history entry
 */
export interface VersionHistoryEntry {
  /** Version string */
  version: string;
  /** Installation date */
  installedAt: Date;
  /** Uninstallation/update date */
  removedAt?: Date;
  /** Whether this version was auto-updated */
  autoUpdated: boolean;
  /** Reason for update/removal */
  reason?: string;
}

/**
 * Rollback options
 */
export interface RollbackOptions {
  /** Target version to rollback to */
  targetVersion: string;
  /** Keep current configuration */
  keepConfig?: boolean;
  /** Keep current data */
  keepData?: boolean;
}

/**
 * Update options
 */
export interface UpdateOptions {
  /** Skip confirmation dialog */
  silent?: boolean;
  /** Restart after update */
  restart?: boolean;
  /** Backup before update */
  backup?: boolean;
}

/**
 * Version constraint
 */
export type VersionConstraint =
  | string           // Exact version: '1.0.0'
  | `^${string}`     // Compatible: '^1.0.0'
  | `~${string}`     // Approximately: '~1.0.0'
  | `>=${string}`    // Greater or equal: '>=1.0.0'
  | `<=${string}`    // Less or equal: '<=1.0.0'
  | `>${string}`     // Greater: '>1.0.0'
  | `<${string}`;    // Less: '<1.0.0'

/**
 * Version Management API
 */
export interface PluginVersionAPI {
  /**
   * Get current plugin version
   */
  getVersion(): string;

  /**
   * Get parsed semantic version
   */
  getSemanticVersion(): SemanticVersion;

  /**
   * Check for available updates
   */
  checkForUpdates(): Promise<UpdateInfo | null>;

  /**
   * Download and apply update
   */
  update(options?: UpdateOptions): Promise<void>;

  /**
   * Rollback to a previous version
   */
  rollback(options: RollbackOptions): Promise<void>;

  /**
   * Get version history
   */
  getHistory(): VersionHistoryEntry[];

  /**
   * Check if a version satisfies a constraint
   */
  satisfies(version: string, constraint: VersionConstraint): boolean;

  /**
   * Compare two versions
   */
  compare(v1: string, v2: string): -1 | 0 | 1;

  /**
   * Parse a version string
   */
  parse(version: string): SemanticVersion | null;

  /**
   * Format a semantic version to string
   */
  format(version: SemanticVersion): string;

  /**
   * Validate a version string
   */
  isValid(version: string): boolean;

  /**
   * Get available versions
   */
  getAvailableVersions(): Promise<string[]>;

  /**
   * Listen for update events
   */
  onUpdateAvailable(handler: (info: UpdateInfo) => void): () => void;
}
