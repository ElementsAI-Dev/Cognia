import type { ChatStore } from './types';

export const selectMessages = (state: ChatStore) => state.messages;
export const selectIsLoading = (state: ChatStore) => state.isLoading;
export const selectIsStreaming = (state: ChatStore) => state.isStreaming;
export const selectError = (state: ChatStore) => state.error;
