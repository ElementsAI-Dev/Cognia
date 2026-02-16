import { nanoid } from 'nanoid';
import type { SliceCreator, BranchSliceActions, ConversationBranch } from '../types';

export const createBranchSlice: SliceCreator<BranchSliceActions> = (set, get) => ({
  createBranch: (sessionId, branchPointMessageId, name) => {
    const { sessions } = get();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return null;
    const existingBranches = session.branches || [];
    const branch: ConversationBranch = {
      id: nanoid(),
      name: name || `Branch ${existingBranches.length + 1}`,
      parentBranchId: session.activeBranchId,
      branchPointMessageId,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      isActive: true,
    };
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              branches: [...(s.branches || []), branch],
              activeBranchId: branch.id,
              updatedAt: new Date(),
            }
          : s
      ),
    }));
    return branch;
  },

  switchBranch: (sessionId, branchId) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              activeBranchId: branchId || undefined,
              branches: s.branches?.map((b) => ({ ...b, isActive: b.id === branchId })),
              updatedAt: new Date(),
            }
          : s
      ),
    }));
  },

  deleteBranch: (sessionId, branchId) => {
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const newBranches = (s.branches || []).filter((b) => b.id !== branchId);
        return {
          ...s,
          branches: newBranches,
          activeBranchId: s.activeBranchId === branchId ? undefined : s.activeBranchId,
          updatedAt: new Date(),
        };
      }),
    }));
  },

  renameBranch: (sessionId, branchId, name) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              branches: s.branches?.map((b) =>
                b.id === branchId ? { ...b, name, updatedAt: new Date() } : b
              ),
              updatedAt: new Date(),
            }
          : s
      ),
    }));
  },

  getBranches: (sessionId) => get().sessions.find((s) => s.id === sessionId)?.branches || [],
  getActiveBranchId: (sessionId) => get().sessions.find((s) => s.id === sessionId)?.activeBranchId,
});
