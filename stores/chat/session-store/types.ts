/**
 * Session Store Types
 * Shared type definitions for all session store slices
 */

import type { FrozenCompressionSummary } from '@/types/system/compression';
import type {
  Session,
  CreateSessionInput,
  UpdateSessionInput,
  ChatMode,
  ConversationBranch,
  ChatViewMode,
  FlowChatCanvasState,
  NodePosition,
  ChatGoal,
  CreateGoalInput,
  UpdateGoalInput,
  GoalStep,
  CreateStepInput,
  UpdateStepInput,
  ChatFolder,
} from '@/types';

// Re-export types for convenience
export type {
  Session,
  CreateSessionInput,
  UpdateSessionInput,
  ChatMode,
  ConversationBranch,
  ChatViewMode,
  FlowChatCanvasState,
  NodePosition,
  ChatGoal,
  CreateGoalInput,
  UpdateGoalInput,
  GoalStep,
  CreateStepInput,
  UpdateStepInput,
  ChatFolder,
  FrozenCompressionSummary,
};

// ============================================================================
// Mode types
// ============================================================================

/** Mode history entry for tracking mode switches */
export interface ModeHistoryEntry {
  mode: ChatMode;
  timestamp: Date;
  sessionId: string;
}

/** Mode configuration for each chat mode */
export interface ModeConfig {
  id: ChatMode;
  name: string;
  description: string;
  icon: string;
  defaultSystemPrompt?: string;
  suggestedModels?: string[];
  features: string[];
}

// ============================================================================
// State Types
// ============================================================================

/** Core state: sessions, active session, folders, drafts */
export interface CoreSliceState {
  sessions: Session[];
  activeSessionId: string | null;
  folders: ChatFolder[];
  inputDrafts: Record<string, string>;
}

/** Mode state: mode history */
export interface ModeSliceState {
  modeHistory: ModeHistoryEntry[];
}

/** Bulk operations state: selected session IDs */
export interface BulkSliceState {
  selectedSessionIds: string[];
}

// ============================================================================
// Action Types
// ============================================================================

/** Core slice actions: session CRUD, folders, drafts, compression summary, environment */
export interface CoreSliceActions {
  /** Create a new session with optional initial input */
  createSession: (input?: CreateSessionInput) => Session;
  /** Delete a session by ID and clean up IndexedDB data */
  deleteSession: (id: string) => void;
  /** Update session properties */
  updateSession: (id: string, updates: UpdateSessionInput) => void;
  /** Set the currently active session */
  setActiveSession: (id: string | null) => void;
  /** Duplicate a session */
  duplicateSession: (id: string) => Session | null;
  /** Toggle pin state of a session */
  togglePinSession: (id: string) => void;
  /** Delete all sessions and clean up IndexedDB */
  deleteAllSessions: () => void;
  /** Get a session by ID */
  getSession: (id: string) => Session | undefined;
  /** Get the currently active session */
  getActiveSession: () => Session | undefined;
  /** Clear all sessions without IndexedDB cleanup */
  clearAllSessions: () => void;
  /** Import sessions by prepending to existing list */
  importSessions: (sessions: Session[]) => void;

  // Folder management
  /** Create a new folder */
  createFolder: (name: string) => ChatFolder;
  /** Delete a folder and unassign sessions from it */
  deleteFolder: (id: string) => void;
  /** Update folder properties */
  updateFolder: (id: string, updates: Partial<ChatFolder>) => void;
  /** Move a session to a folder (or out of all folders) */
  moveSessionToFolder: (sessionId: string, folderId: string | null) => void;
  /** Set a custom icon for a session */
  setSessionCustomIcon: (sessionId: string, icon: string | undefined) => void;

  // Input draft management
  /** Save input draft for a session */
  setInputDraft: (sessionId: string, draft: string) => void;
  /** Get input draft for a session */
  getInputDraft: (sessionId: string) => string;
  /** Clear input draft for a session */
  clearInputDraft: (sessionId: string) => void;

  // Frozen compression summary management (prefix stability)
  /** Set frozen compression summary for a session */
  setFrozenSummary: (sessionId: string, summary: FrozenCompressionSummary | undefined) => void;
  /** Get frozen compression summary for a session */
  getFrozenSummary: (sessionId: string) => FrozenCompressionSummary | undefined;

  // Environment management
  /** Set virtual environment for a session */
  setSessionEnvironment: (sessionId: string, envId: string | null, envPath?: string | null) => void;
  /** Get virtual environment for a session */
  getSessionEnvironment: (sessionId: string) => { envId: string | null; envPath: string | null };
  /** Clear virtual environment for a session */
  clearSessionEnvironment: (sessionId: string) => void;
}

/** Mode slice actions: mode switching and mode history */
export interface ModeSliceActions {
  /** Switch the mode of a session */
  switchMode: (sessionId: string, mode: ChatMode) => void;
  /** Switch mode by creating a new session */
  switchModeWithNewSession: (
    currentSessionId: string,
    targetMode: ChatMode,
    options?: { carryContext?: boolean; summary?: string }
  ) => Session;
  /** Get mode history, optionally filtered by session */
  getModeHistory: (sessionId?: string) => ModeHistoryEntry[];
  /** Get mode configuration */
  getModeConfig: (mode: ChatMode) => ModeConfig;
  /** Get recently used modes */
  getRecentModes: (limit?: number) => ChatMode[];
}

/** Branch slice actions: conversation branch management */
export interface BranchSliceActions {
  /** Create a new conversation branch */
  createBranch: (
    sessionId: string,
    branchPointMessageId: string,
    name?: string
  ) => ConversationBranch | null;
  /** Switch to a different branch */
  switchBranch: (sessionId: string, branchId: string | null) => void;
  /** Delete a branch */
  deleteBranch: (sessionId: string, branchId: string) => void;
  /** Rename a branch */
  renameBranch: (sessionId: string, branchId: string, name: string) => void;
  /** Get all branches for a session */
  getBranches: (sessionId: string) => ConversationBranch[];
  /** Get the active branch ID for a session */
  getActiveBranchId: (sessionId: string) => string | undefined;
}

/** View slice actions: view mode and flow canvas management */
export interface ViewSliceActions {
  /** Set view mode for a session */
  setViewMode: (sessionId: string, viewMode: ChatViewMode) => void;
  /** Get view mode for a session */
  getViewMode: (sessionId: string) => ChatViewMode;
  /** Update flow canvas state */
  updateFlowCanvasState: (sessionId: string, updates: Partial<FlowChatCanvasState>) => void;
  /** Get flow canvas state */
  getFlowCanvasState: (sessionId: string) => FlowChatCanvasState;
  /** Update a single node position */
  updateNodePosition: (sessionId: string, position: NodePosition) => void;
  /** Update multiple node positions at once */
  updateNodePositions: (sessionId: string, positions: NodePosition[]) => void;
  /** Toggle collapse state of a node */
  toggleNodeCollapse: (sessionId: string, nodeId: string) => void;
  /** Set selected nodes in the flow canvas */
  setSelectedNodes: (sessionId: string, nodeIds: string[]) => void;
}

/** Goal slice actions: goal and step management */
export interface GoalSliceActions {
  /** Set a goal for a session */
  setGoal: (sessionId: string, input: CreateGoalInput) => ChatGoal;
  /** Update goal properties */
  updateGoal: (sessionId: string, updates: UpdateGoalInput) => void;
  /** Clear the goal from a session */
  clearGoal: (sessionId: string) => void;
  /** Mark the goal as completed */
  completeGoal: (sessionId: string) => void;
  /** Pause the goal */
  pauseGoal: (sessionId: string) => void;
  /** Resume a paused goal */
  resumeGoal: (sessionId: string) => void;
  /** Get the goal of a session */
  getGoal: (sessionId: string) => ChatGoal | undefined;

  // Step management (for multi-step goals)
  /** Add a step to the goal */
  addStep: (sessionId: string, input: CreateStepInput) => GoalStep | undefined;
  /** Update a step */
  updateStep: (sessionId: string, stepId: string, updates: UpdateStepInput) => void;
  /** Remove a step */
  removeStep: (sessionId: string, stepId: string) => void;
  /** Toggle step completion */
  toggleStepComplete: (sessionId: string, stepId: string) => void;
  /** Reorder steps by providing new order of IDs */
  reorderSteps: (sessionId: string, stepIds: string[]) => void;
}

/** Bulk slice actions: bulk operations, tags, and archive management */
export interface BulkSliceActions {
  // Bulk selection
  /** Select a session for bulk operations */
  selectSession: (id: string) => void;
  /** Deselect a session */
  deselectSession: (id: string) => void;
  /** Select all sessions */
  selectAllSessions: () => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Delete multiple sessions at once */
  bulkDeleteSessions: (ids: string[]) => void;
  /** Move multiple sessions to a folder */
  bulkMoveSessions: (ids: string[], folderId: string | null) => void;
  /** Pin/unpin multiple sessions */
  bulkPinSessions: (ids: string[], pinned: boolean) => void;
  /** Archive multiple sessions */
  bulkArchiveSessions: (ids: string[]) => void;
  /** Add a tag to multiple sessions */
  bulkTagSessions: (ids: string[], tag: string) => void;

  // Tag management
  /** Add a tag to a session */
  addTag: (sessionId: string, tag: string) => void;
  /** Remove a tag from a session */
  removeTag: (sessionId: string, tag: string) => void;
  /** Set all tags for a session */
  setTags: (sessionId: string, tags: string[]) => void;
  /** Get all sessions with a specific tag */
  getSessionsByTag: (tag: string) => Session[];
  /** Get all unique tags across all sessions */
  getAllTags: () => string[];

  // Archive management
  /** Archive a session */
  archiveSession: (id: string) => void;
  /** Unarchive a session */
  unarchiveSession: (id: string) => void;
  /** Get all archived sessions */
  getArchivedSessions: () => Session[];
  /** Get all non-archived sessions */
  getActiveSessions: () => Session[];
}

// ============================================================================
// Combined Types
// ============================================================================

/** Combined state for all slices */
export interface SessionStoreState
  extends CoreSliceState,
    ModeSliceState,
    BulkSliceState {}

/** Combined actions for all slices */
export interface SessionStoreActions
  extends CoreSliceActions,
    ModeSliceActions,
    BranchSliceActions,
    ViewSliceActions,
    GoalSliceActions,
    BulkSliceActions {}

/** Full session store type (state + actions) */
export type SessionStore = SessionStoreState & SessionStoreActions;

/** Slice creator type for session store slices */
export type SliceCreator<T> = (
  set: (
    partial: Partial<SessionStore> | ((state: SessionStore) => Partial<SessionStore>)
  ) => void,
  get: () => SessionStore
) => T;
