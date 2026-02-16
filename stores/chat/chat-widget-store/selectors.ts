import type { ChatWidgetStore } from './types';

export const selectChatWidgetMessages = (state: ChatWidgetStore) => state.messages;
export const selectChatWidgetConfig = (state: ChatWidgetStore) => state.config;
export const selectChatWidgetIsVisible = (state: ChatWidgetStore) => state.isVisible;
export const selectChatWidgetIsLoading = (state: ChatWidgetStore) => state.isLoading;
