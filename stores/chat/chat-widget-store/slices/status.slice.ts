import type { StoreApi } from 'zustand';
import type { ChatWidgetActions, ChatWidgetStore } from '../types';

type ChatWidgetStoreSet = StoreApi<ChatWidgetStore>['setState'];
type StatusSlice = Pick<ChatWidgetActions, 'setLoading' | 'setError'>;

export const createStatusSlice = (set: ChatWidgetStoreSet): StatusSlice => ({
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
});
