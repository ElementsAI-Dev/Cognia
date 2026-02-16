import { create } from 'zustand';
import { initialState } from './initial-state';
import { createAgentActionsSlice } from './slices/actions.slice';
import type { AgentState } from './types';
export const useAgentStore = create<AgentState>((set, get) => ({
  ...initialState,
  ...createAgentActionsSlice(set, get),
}));
