import { create } from 'zustand';
import { initialState } from './initial-state';
import { createBackgroundAgentActionsSlice } from './slices/actions.slice';
import type { BackgroundAgentState } from './types';
export const useBackgroundAgentStore = create<BackgroundAgentState>((set, get) => ({
  ...initialState,
  ...createBackgroundAgentActionsSlice(set, get),
}));
export default useBackgroundAgentStore;
