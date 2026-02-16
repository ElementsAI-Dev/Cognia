import { useClipboardContextStore } from './store';

export const useCurrentClipboardContent = () =>
  useClipboardContextStore((state) => state.currentContent);

export const useCurrentClipboardAnalysis = () =>
  useClipboardContextStore((state) => state.currentAnalysis);

export const useClipboardTemplates = () => useClipboardContextStore((state) => state.templates);

export const useIsClipboardMonitoring = () =>
  useClipboardContextStore((state) => state.isMonitoring);

