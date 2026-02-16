import type { StoreApi } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/lib/native/utils';
import type { ClipboardContextStore } from '../types';

type ClipboardStoreSet = StoreApi<ClipboardContextStore>['setState'];
type ClipboardStoreGet = StoreApi<ClipboardContextStore>['getState'];

type ContentSlice = Pick<
  ClipboardContextStore,
  'readClipboard' | 'writeText' | 'writeHtml' | 'clearClipboard'
>;

export const createContentSlice = (
  set: ClipboardStoreSet,
  get: ClipboardStoreGet
): ContentSlice => ({
  readClipboard: async () => {
    if (!isTauri()) return null;

    try {
      const text = await invoke<string>('clipboard_read_text');
      set({ currentContent: text, error: null });
      return text;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
      return null;
    }
  },

  writeText: async (text) => {
    if (!isTauri()) return;

    try {
      await invoke('clipboard_write_text', { text });
      set({ currentContent: text, error: null });
      if (get().autoAnalyze) {
        await get().analyzeContent(text);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
    }
  },

  writeHtml: async (html, altText) => {
    if (!isTauri()) return;

    try {
      await invoke('clipboard_write_html', { html, altText });
      set({ error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
    }
  },

  clearClipboard: async () => {
    if (!isTauri()) return;

    try {
      await invoke('clipboard_clear');
      set({ currentContent: null, currentAnalysis: null, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
    }
  },
});

