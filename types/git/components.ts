/**
 * Git Component Props Types
 *
 * Centralized prop interfaces for all Git UI components.
 */

import type {
  GitDiffInfo,
  GitFileStatus,
  GitBranchInfo,
  GitCommitInfo,
  GitGraphCommit,
  GitRepoStats,
  GitCheckpoint,
  GitTagInfo,
  GitRemoteInfo,
  GitStashEntry,
} from '@/types/system/git';

// ==================== GitPanel ====================

/** Imperative handle exposed by GitPanel via forwardRef */
export interface GitPanelRef {
  stageAll: () => Promise<void>;
  commit: () => void;
  push: () => Promise<void>;
  pull: () => Promise<void>;
}

export interface GitPanelProps {
  repoPath?: string;
  projectId?: string;
  className?: string;
}

// ==================== GitStatusPanel ====================

export interface GitStatusPanelProps {
  repoPath?: string;
  projectId?: string;
  showInstallation?: boolean;
  showRepoStatus?: boolean;
  compact?: boolean;
}

// ==================== GitBranchManager ====================

export interface GitBranchManagerProps {
  branches: GitBranchInfo[];
  currentBranch?: string;
  isLoading?: boolean;
  onCheckout: (branch: string, createNew?: boolean) => Promise<boolean>;
  onCreateBranch: (name: string, startPoint?: string) => Promise<boolean>;
  onDeleteBranch: (name: string, force?: boolean) => Promise<boolean>;
  onMergeBranch?: (branch: string) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  className?: string;
}

// ==================== GitCommitHistory ====================

export interface GitCommitHistoryProps {
  commits: GitCommitInfo[];
  currentBranch?: string;
  isLoading?: boolean;
  onRefresh: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
  onViewDiff?: (commit: GitCommitInfo) => Promise<GitDiffInfo[]>;
  onCheckout?: (commitHash: string) => Promise<boolean>;
  onRevert?: (commitHash: string) => Promise<boolean>;
  className?: string;
}

// ==================== GitDiffViewer ====================

export interface GitDiffViewerProps {
  diffs: GitDiffInfo[];
  fileStatus?: GitFileStatus[];
  onStageFile?: (path: string) => void;
  onUnstageFile?: (path: string) => void;
  onDiscardFile?: (path: string) => void;
  className?: string;
}

// ==================== GitFileTree ====================

export interface GitFileTreeProps {
  files: GitFileStatus[];
  isLoading?: boolean;
  onStageFiles: (files: string[]) => Promise<boolean>;
  onUnstageFiles: (files: string[]) => Promise<boolean>;
  onDiscardFiles: (files: string[]) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  className?: string;
}

// ==================== GitStashPanel ====================

export interface GitStashPanelProps {
  stashes: GitStashEntry[];
  isLoading?: boolean;
  onStashSave: (message?: string, includeUntracked?: boolean) => Promise<boolean>;
  onStashPop: (index?: number) => Promise<boolean>;
  onStashApply: (index?: number) => Promise<boolean>;
  onStashDrop: (index?: number) => Promise<boolean>;
  onStashClear: () => Promise<boolean>;
  onRefresh: () => Promise<void>;
  className?: string;
}

// ==================== GitCommitGraph ====================

export interface GitCommitGraphProps {
  commits: GitGraphCommit[];
  selectedCommit?: string | null;
  onCommitClick?: (commit: GitGraphCommit) => void;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onCherryPick?: (hash: string) => void;
  onRevert?: (hash: string) => void;
  onCreateBranch?: (startPoint: string) => void;
  onCreateTag?: (target: string) => void;
  isLoading?: boolean;
  className?: string;
}

// ==================== GitStatsDashboard ====================

export interface GitStatsDashboardProps {
  stats: GitRepoStats | null;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

// ==================== GitCheckpointPanel ====================

export interface GitCheckpointPanelProps {
  checkpoints: GitCheckpoint[];
  onCreateCheckpoint: (message?: string) => Promise<boolean>;
  onRestoreCheckpoint: (id: string) => Promise<boolean>;
  onDeleteCheckpoint: (id: string) => Promise<boolean>;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

// ==================== GitTagPanel ====================

export interface GitTagPanelProps {
  tags: GitTagInfo[];
  onCreateTag: (name: string, message?: string, target?: string) => Promise<boolean>;
  onDeleteTag: (name: string) => Promise<boolean>;
  onPushTag: (name: string) => Promise<boolean>;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

// ==================== GitRemotePanel ====================

export interface GitRemotePanelProps {
  remotes: GitRemoteInfo[];
  onAddRemote: (name: string, url: string) => Promise<boolean>;
  onRemoveRemote: (name: string) => Promise<boolean>;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

// ==================== GitCommitDetailPanel ====================

export interface GitCommitDetailPanelProps {
  commitDetail: import('@/types/system/git').GitCommitDetail | null;
  isLoading?: boolean;
  onClose: () => void;
  onNavigateToParent?: (parentHash: string) => void;
  onCherryPick?: (hash: string) => void;
  onRevert?: (hash: string) => void;
  onCheckout?: (hash: string) => void;
  className?: string;
}

// ==================== GitBlameViewer ====================

export interface GitBlameViewerProps {
  repoPath: string;
  initialFilePath?: string;
  onCommitClick?: (commitHash: string) => void;
  className?: string;
}

// ==================== GitignoreTemplateSelector ====================

export interface GitignoreTemplateSelectorProps {
  onSelect: (content: string) => void;
  projectFiles?: string[];
  className?: string;
}
