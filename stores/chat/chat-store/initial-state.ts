import type { ChatStoreState } from './types';

export const initialState: ChatStoreState = {
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
};
