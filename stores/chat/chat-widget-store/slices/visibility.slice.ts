import type { StoreApi } from 'zustand';
import type { ChatWidgetActions, ChatWidgetStore } from '../types';

type ChatWidgetStoreSet = StoreApi<ChatWidgetStore>['setState'];
type VisibilitySlice = Pick<ChatWidgetActions, 'show' | 'hide' | 'toggle' | 'setVisible'>;

export const createVisibilitySlice = (set: ChatWidgetStoreSet): VisibilitySlice => ({
  show: () => set({ isVisible: true, lastActivity: new Date() }),

  hide: () => set({ isVisible: false }),

  toggle: () => set((state) => ({ isVisible: !state.isVisible, lastActivity: new Date() })),

  setVisible: (visible) =>
    set((state) => ({
      isVisible: visible,
      lastActivity: visible ? new Date() : state.lastActivity,
    })),
});
