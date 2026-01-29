/**
 * LaTeX Version Control
 * Provides version history, diff, and collaboration features for LaTeX documents
 */

import type {
  LaTeXVersionEntry,
  LaTeXDiff,
  LaTeXDiffChange,
  LaTeXCollaborator,
  LaTeXComment,
} from '@/types/latex';

// ============================================================================
// Types
// ============================================================================

export interface VersionControlConfig {
  maxVersions: number;
  autoSaveInterval: number; // milliseconds
  enableAutoSave: boolean;
  enableCollaboration: boolean;
}

export interface DocumentHistory {
  documentId: string;
  versions: LaTeXVersionEntry[];
  currentVersion: number;
  collaborators: LaTeXCollaborator[];
  comments: LaTeXComment[];
}

export interface MergeResult {
  success: boolean;
  content: string;
  conflicts: MergeConflict[];
}

export interface MergeConflict {
  startLine: number;
  endLine: number;
  baseContent: string;
  localContent: string;
  remoteContent: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_VERSION_CONFIG: VersionControlConfig = {
  maxVersions: 100,
  autoSaveInterval: 30000, // 30 seconds
  enableAutoSave: true,
  enableCollaboration: false,
};

// ============================================================================
// Version Control Service
// ============================================================================

/**
 * LaTeX document version control service
 */
export class LaTeXVersionControlService {
  private config: VersionControlConfig;
  private histories: Map<string, DocumentHistory>;
  private autoSaveTimers: Map<string, NodeJS.Timeout>;

  constructor(config: Partial<VersionControlConfig> = {}) {
    this.config = { ...DEFAULT_VERSION_CONFIG, ...config };
    this.histories = new Map();
    this.autoSaveTimers = new Map();
  }

  /**
   * Initialize version control for a document
   */
  initDocument(documentId: string, initialContent: string, author?: string): DocumentHistory {
    const history: DocumentHistory = {
      documentId,
      versions: [{
        id: generateVersionId(),
        version: 1,
        content: initialContent,
        author,
        timestamp: new Date(),
      }],
      currentVersion: 1,
      collaborators: [],
      comments: [],
    };

    this.histories.set(documentId, history);

    if (this.config.enableAutoSave) {
      this.startAutoSave(documentId);
    }

    return history;
  }

  /**
   * Create a new version
   */
  createVersion(
    documentId: string,
    content: string,
    message?: string,
    author?: string
  ): LaTeXVersionEntry | null {
    const history = this.histories.get(documentId);
    if (!history) return null;

    const previousVersion = history.versions[history.versions.length - 1];
    const diff = this.computeDiff(previousVersion.content, content);

    // Don't create version if no changes
    if (diff.additions === 0 && diff.deletions === 0) {
      return null;
    }

    const newVersion: LaTeXVersionEntry = {
      id: generateVersionId(),
      version: history.currentVersion + 1,
      content,
      message,
      author,
      timestamp: new Date(),
      parentId: previousVersion.id,
      diff,
    };

    history.versions.push(newVersion);
    history.currentVersion = newVersion.version;

    // Trim old versions if exceeding max
    if (history.versions.length > this.config.maxVersions) {
      history.versions.shift();
    }

    return newVersion;
  }

  /**
   * Get document history
   */
  getHistory(documentId: string): DocumentHistory | undefined {
    return this.histories.get(documentId);
  }

  /**
   * Get a specific version
   */
  getVersion(documentId: string, version: number): LaTeXVersionEntry | undefined {
    const history = this.histories.get(documentId);
    return history?.versions.find((v) => v.version === version);
  }

  /**
   * Restore to a specific version
   */
  restoreVersion(documentId: string, version: number, author?: string): LaTeXVersionEntry | null {
    const history = this.histories.get(documentId);
    if (!history) return null;

    const targetVersion = history.versions.find((v) => v.version === version);
    if (!targetVersion) return null;

    return this.createVersion(
      documentId,
      targetVersion.content,
      `Restored from version ${version}`,
      author
    );
  }

  /**
   * Compute diff between two contents
   */
  computeDiff(oldContent: string, newContent: string): LaTeXDiff {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const changes: LaTeXDiffChange[] = [];

    let additions = 0;
    let deletions = 0;

    // Simple line-by-line diff
    const maxLen = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === undefined && newLine !== undefined) {
        // Line added
        changes.push({
          type: 'add',
          startLine: i + 1,
          endLine: i + 1,
          newContent: newLine,
        });
        additions++;
      } else if (oldLine !== undefined && newLine === undefined) {
        // Line deleted
        changes.push({
          type: 'delete',
          startLine: i + 1,
          endLine: i + 1,
          oldContent: oldLine,
        });
        deletions++;
      } else if (oldLine !== newLine) {
        // Line modified
        changes.push({
          type: 'modify',
          startLine: i + 1,
          endLine: i + 1,
          oldContent: oldLine,
          newContent: newLine,
        });
        additions++;
        deletions++;
      }
    }

    return { additions, deletions, changes };
  }

  /**
   * Get diff between two versions
   */
  getDiffBetweenVersions(
    documentId: string,
    fromVersion: number,
    toVersion: number
  ): LaTeXDiff | null {
    const from = this.getVersion(documentId, fromVersion);
    const to = this.getVersion(documentId, toVersion);

    if (!from || !to) return null;

    return this.computeDiff(from.content, to.content);
  }

  /**
   * Start auto-save for a document
   */
  private startAutoSave(documentId: string): void {
    if (this.autoSaveTimers.has(documentId)) {
      clearInterval(this.autoSaveTimers.get(documentId)!);
    }

    const timer = setInterval(() => {
      // Auto-save logic would be implemented here
      // This would need access to the current editor content
    }, this.config.autoSaveInterval);

    this.autoSaveTimers.set(documentId, timer);
  }

  /**
   * Stop auto-save for a document
   */
  stopAutoSave(documentId: string): void {
    const timer = this.autoSaveTimers.get(documentId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(documentId);
    }
  }

  /**
   * Add a collaborator
   */
  addCollaborator(documentId: string, collaborator: LaTeXCollaborator): boolean {
    const history = this.histories.get(documentId);
    if (!history) return false;

    const existing = history.collaborators.find((c) => c.id === collaborator.id);
    if (existing) {
      Object.assign(existing, collaborator);
    } else {
      history.collaborators.push(collaborator);
    }

    return true;
  }

  /**
   * Remove a collaborator
   */
  removeCollaborator(documentId: string, collaboratorId: string): boolean {
    const history = this.histories.get(documentId);
    if (!history) return false;

    const index = history.collaborators.findIndex((c) => c.id === collaboratorId);
    if (index !== -1) {
      history.collaborators.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Update collaborator cursor position
   */
  updateCollaboratorCursor(
    documentId: string,
    collaboratorId: string,
    position: { line: number; column: number; offset: number }
  ): boolean {
    const history = this.histories.get(documentId);
    if (!history) return false;

    const collaborator = history.collaborators.find((c) => c.id === collaboratorId);
    if (collaborator) {
      collaborator.cursorPosition = position;
      return true;
    }

    return false;
  }

  /**
   * Add a comment
   */
  addComment(documentId: string, comment: LaTeXComment): boolean {
    const history = this.histories.get(documentId);
    if (!history) return false;

    history.comments.push(comment);
    return true;
  }

  /**
   * Remove a comment
   */
  removeComment(documentId: string, commentId: string): boolean {
    const history = this.histories.get(documentId);
    if (!history) return false;

    const index = history.comments.findIndex((c) => c.id === commentId);
    if (index !== -1) {
      history.comments.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Resolve a comment
   */
  resolveComment(documentId: string, commentId: string): boolean {
    const history = this.histories.get(documentId);
    if (!history) return false;

    const comment = history.comments.find((c) => c.id === commentId);
    if (comment) {
      comment.resolved = true;
      return true;
    }

    return false;
  }

  /**
   * Merge two versions (basic three-way merge)
   */
  mergeVersions(
    documentId: string,
    baseVersion: number,
    localVersion: number,
    remoteVersion: number
  ): MergeResult {
    const base = this.getVersion(documentId, baseVersion);
    const local = this.getVersion(documentId, localVersion);
    const remote = this.getVersion(documentId, remoteVersion);

    if (!base || !local || !remote) {
      return {
        success: false,
        content: '',
        conflicts: [],
      };
    }

    const baseLines = base.content.split('\n');
    const localLines = local.content.split('\n');
    const remoteLines = remote.content.split('\n');

    const mergedLines: string[] = [];
    const conflicts: MergeConflict[] = [];

    const maxLen = Math.max(baseLines.length, localLines.length, remoteLines.length);

    for (let i = 0; i < maxLen; i++) {
      const baseLine = baseLines[i] ?? '';
      const localLine = localLines[i] ?? '';
      const remoteLine = remoteLines[i] ?? '';

      if (localLine === remoteLine) {
        // Both made same change or no change
        mergedLines.push(localLine);
      } else if (localLine === baseLine) {
        // Only remote changed
        mergedLines.push(remoteLine);
      } else if (remoteLine === baseLine) {
        // Only local changed
        mergedLines.push(localLine);
      } else {
        // Conflict: both changed differently
        conflicts.push({
          startLine: i + 1,
          endLine: i + 1,
          baseContent: baseLine,
          localContent: localLine,
          remoteContent: remoteLine,
        });

        // Add conflict markers
        mergedLines.push('<<<<<<< LOCAL');
        mergedLines.push(localLine);
        mergedLines.push('=======');
        mergedLines.push(remoteLine);
        mergedLines.push('>>>>>>> REMOTE');
      }
    }

    return {
      success: conflicts.length === 0,
      content: mergedLines.join('\n'),
      conflicts,
    };
  }

  /**
   * Export history to JSON
   */
  exportHistory(documentId: string): string | null {
    const history = this.histories.get(documentId);
    if (!history) return null;

    return JSON.stringify(history, null, 2);
  }

  /**
   * Import history from JSON
   */
  importHistory(json: string): DocumentHistory | null {
    try {
      const history = JSON.parse(json) as DocumentHistory;

      // Validate structure
      if (!history.documentId || !history.versions || !Array.isArray(history.versions)) {
        return null;
      }

      // Convert date strings back to Date objects
      for (const version of history.versions) {
        version.timestamp = new Date(version.timestamp);
      }

      this.histories.set(history.documentId, history);
      return history;
    } catch {
      return null;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    for (const [documentId] of this.autoSaveTimers) {
      this.stopAutoSave(documentId);
    }
    this.histories.clear();
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate unique version ID
 */
function generateVersionId(): string {
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Generate unique collaborator color
 */
export function generateCollaboratorColor(index: number): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
  ];
  return colors[index % colors.length];
}

/**
 * Format diff for display
 */
export function formatDiff(diff: LaTeXDiff): string {
  const lines: string[] = [];

  lines.push(`+${diff.additions} additions, -${diff.deletions} deletions\n`);

  for (const change of diff.changes) {
    if (change.type === 'add') {
      lines.push(`+ Line ${change.startLine}: ${change.newContent}`);
    } else if (change.type === 'delete') {
      lines.push(`- Line ${change.startLine}: ${change.oldContent}`);
    } else {
      lines.push(`~ Line ${change.startLine}:`);
      lines.push(`  - ${change.oldContent}`);
      lines.push(`  + ${change.newContent}`);
    }
  }

  return lines.join('\n');
}

/**
 * Create version snapshot
 */
export function createVersionSnapshot(
  content: string,
  message?: string,
  author?: string,
  tags?: string[]
): Omit<LaTeXVersionEntry, 'id' | 'version' | 'parentId'> {
  return {
    content,
    message,
    author,
    timestamp: new Date(),
    tags,
  };
}

// ============================================================================
// Export
// ============================================================================

const versionControlApi = {
  LaTeXVersionControlService,
  DEFAULT_VERSION_CONFIG,
  generateCollaboratorColor,
  formatDiff,
  createVersionSnapshot,
};

export default versionControlApi;
