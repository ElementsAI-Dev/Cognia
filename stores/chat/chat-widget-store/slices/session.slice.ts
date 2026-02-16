import { nanoid } from 'nanoid';
import type { StoreApi } from 'zustand';
import type { ChatWidgetActions, ChatWidgetStore } from '../types';

type ChatWidgetStoreSet = StoreApi<ChatWidgetStore>['setState'];
type SessionSlice = Pick<ChatWidgetActions, 'newSession' | 'recordActivity'>;

export const createSessionSlice = (set: ChatWidgetStoreSet): SessionSlice => ({
  newSession: () =>
    set({
      sessionId: nanoid(),
      messages: [],
      error: null,
      inputValue: '',
      lastActivity: new Date(),
    }),

  recordActivity: () => set({ lastActivity: new Date() }),
});
