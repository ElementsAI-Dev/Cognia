/**
 * Multi-VCS Types - Type definitions for version control system support
 *
 * Supports: Git, Jujutsu (jj), Mercurial (hg), Subversion (svn)
 * Per agent-trace.dev specification section 6.4
 */

/** Supported VCS types per agent-trace.dev spec */
export type VcsType = 'git' | 'jj' | 'hg' | 'svn';

/** VCS info for a repository */
export interface VcsInfo {
  vcsType: VcsType;
  revision: string;
  branch: string | null;
  remoteUrl: string | null;
  repoRoot: string;
}

/** VCS installation status */
export interface VcsStatus {
  vcsType: VcsType;
  installed: boolean;
  version: string | null;
}

/** VCS blame line info */
export interface VcsBlameLineInfo {
  lineNumber: number;
  revision: string;
  author: string;
  date: string;
  content: string;
}

/** VCS operation result */
export interface VcsOperationResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/** VCS detection result */
export interface VcsDetectionResult {
  detected: boolean;
  vcsType: VcsType | null;
  repoRoot: string | null;
}

/** VCS context for agent trace recording */
export interface VcsContext {
  vcs: { type: VcsType; revision: string };
  branch?: string;
  remoteUrl?: string;
  repoPath?: string;
}
