export type { DiffViewMode, DiffLine, SplitRow } from './diff';
export type { LaneAssignment } from './graph';
export type { TreeNode } from './tree';
export type { SortField, SortDir } from './stats';
export type {
  GitPanelRef,
  GitPanelProps,
  GitStatusPanelProps,
  GitBranchManagerProps,
  GitCommitHistoryProps,
  GitDiffViewerProps,
  GitFileTreeProps,
  GitStashPanelProps,
  GitCommitGraphProps,
  GitStatsDashboardProps,
  GitCheckpointPanelProps,
  GitTagPanelProps,
  GitRemotePanelProps,
  GitignoreTemplateSelectorProps,
} from './components';
// Re-export core git types for convenience
export type {
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
