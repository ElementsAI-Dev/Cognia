import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { initialState } from './initial-state';
import { createMessagesSlice } from './slices/messages.slice';
import { createStatusSlice } from './slices/status.slice';
import type { ChatStore } from './types';

export const useChatStore = create<ChatStore>()(
  subscribeWithSelector((set) => ({
    ...initialState,
    ...createMessagesSlice(set),
    ...createStatusSlice(set),
  }))
);
