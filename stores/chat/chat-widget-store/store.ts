import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initialState } from './initial-state';
import { chatWidgetPersistConfig } from './persist-config';
import { createConfigSlice } from './slices/config.slice';
import { createInputSlice } from './slices/input.slice';
import { createMessagesSlice } from './slices/messages.slice';
import { createQuickActionsSlice } from './slices/quick-actions.slice';
import { createSessionSlice } from './slices/session.slice';
import { createStatusSlice } from './slices/status.slice';
import { createVisibilitySlice } from './slices/visibility.slice';
import type { ChatWidgetStore } from './types';

export const useChatWidgetStore = create<ChatWidgetStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createVisibilitySlice(set),
      ...createMessagesSlice(set),
      ...createInputSlice(set),
      ...createStatusSlice(set),
      ...createConfigSlice(set),
      ...createSessionSlice(set),
      ...createQuickActionsSlice(get),
    }),
    chatWidgetPersistConfig
  )
);
