import type { StoreApi } from 'zustand';
import type { ChatStore, ChatStoreActions } from '../types';

type ChatStoreSet = StoreApi<ChatStore>['setState'];
type StatusSlice = Pick<ChatStoreActions, 'setLoading' | 'setError' | 'setStreaming'>;

export const createStatusSlice = (set: ChatStoreSet): StatusSlice => ({
  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false, isStreaming: false }),

  setStreaming: (isStreaming) => set({ isStreaming }),
});
