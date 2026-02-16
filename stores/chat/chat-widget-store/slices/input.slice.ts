import type { StoreApi } from 'zustand';
import type { ChatWidgetActions, ChatWidgetStore } from '../types';

type ChatWidgetStoreSet = StoreApi<ChatWidgetStore>['setState'];
type InputSlice = Pick<ChatWidgetActions, 'setInputValue' | 'clearInput'>;

export const createInputSlice = (set: ChatWidgetStoreSet): InputSlice => ({
  setInputValue: (value) => set({ inputValue: value }),
  clearInput: () => set({ inputValue: '' }),
});
