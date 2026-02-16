import type { StoreApi } from 'zustand';
import type { ChatWidgetActions, ChatWidgetStore } from '../types';

type ChatWidgetStoreGet = StoreApi<ChatWidgetStore>['getState'];
type QuickActionsSlice = Pick<ChatWidgetActions, 'sendQuickMessage'>;

export const createQuickActionsSlice = (get: ChatWidgetStoreGet): QuickActionsSlice => ({
  sendQuickMessage: (text) => {
    const { setInputValue, show } = get();
    show();
    setInputValue(text);
  },
});
