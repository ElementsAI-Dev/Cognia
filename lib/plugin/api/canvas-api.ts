/**
 * Plugin Canvas API Implementation
 * 
 * Provides canvas document editing capabilities to plugins.
 */

import { useArtifactStore } from '@/stores/artifact/artifact-store';
import type {
  PluginCanvasAPI,
  PluginCanvasDocument,
  CreateCanvasDocumentOptions,
  CanvasSelection,
} from '@/types/plugin-extended';
import type { CanvasDocumentVersion } from '@/types/artifact';

/**
 * Create the Canvas API for a plugin
 */
export function createCanvasAPI(pluginId: string): PluginCanvasAPI {
  return {
    getCurrentDocument: (): PluginCanvasDocument | null => {
      const store = useArtifactStore.getState();
      if (!store.activeCanvasId) return null;
      
      const doc = store.canvasDocuments[store.activeCanvasId];
      if (!doc) return null;

      return {
        id: doc.id,
        sessionId: doc.sessionId,
        title: doc.title,
        content: doc.content,
        language: doc.language,
        type: doc.type,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt),
        suggestions: doc.aiSuggestions,
        versions: doc.versions,
      };
    },

    getDocument: (id: string): PluginCanvasDocument | null => {
      const store = useArtifactStore.getState();
      const doc = store.canvasDocuments[id];
      if (!doc) return null;

      return {
        id: doc.id,
        sessionId: doc.sessionId,
        title: doc.title,
        content: doc.content,
        language: doc.language,
        type: doc.type,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt),
        suggestions: doc.aiSuggestions,
        versions: doc.versions,
      };
    },

    createDocument: async (options: CreateCanvasDocumentOptions): Promise<string> => {
      const store = useArtifactStore.getState();
      const id = store.createCanvasDocument({
        sessionId: options.sessionId,
        title: options.title,
        content: options.content,
        language: options.language,
        type: options.type,
      });
      console.log(`[Plugin:${pluginId}] Created canvas document: ${id}`);
      return id;
    },

    updateDocument: (id: string, updates: Partial<PluginCanvasDocument>) => {
      const store = useArtifactStore.getState();
      store.updateCanvasDocument(id, {
        title: updates.title,
        content: updates.content,
        language: updates.language,
      });
      console.log(`[Plugin:${pluginId}] Updated canvas document: ${id}`);
    },

    deleteDocument: (id: string) => {
      const store = useArtifactStore.getState();
      store.deleteCanvasDocument(id);
      console.log(`[Plugin:${pluginId}] Deleted canvas document: ${id}`);
    },

    openDocument: (id: string) => {
      const store = useArtifactStore.getState();
      store.setActiveCanvas(id);
      store.setPanelView('canvas');
      console.log(`[Plugin:${pluginId}] Opened canvas document: ${id}`);
    },

    closeCanvas: () => {
      const store = useArtifactStore.getState();
      store.closeCanvas();
      console.log(`[Plugin:${pluginId}] Closed canvas`);
    },

    getSelection: (): CanvasSelection | null => {
      // Canvas selection would need to be tracked in the store or via DOM
      // For now, return null as this requires browser DOM access
      if (typeof window === 'undefined') return null;
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;
      
      const range = selection.getRangeAt(0);
      return {
        start: range.startOffset,
        end: range.endOffset,
        text: selection.toString(),
      };
    },

    setSelection: (start: number, end: number) => {
      // Would need DOM access to set selection in canvas editor
      console.log(`[Plugin:${pluginId}] setSelection requested: ${start}-${end}`);
    },

    insertText: (text: string) => {
      const store = useArtifactStore.getState();
      const activeId = store.activeCanvasId;
      if (!activeId) return;

      const doc = store.canvasDocuments[activeId];
      if (!doc) return;

      // Insert at end for simplicity
      const newContent = doc.content + text;
      store.updateCanvasDocument(activeId, { content: newContent });
      console.log(`[Plugin:${pluginId}] Inserted text into canvas`);
    },

    replaceSelection: (text: string) => {
      const store = useArtifactStore.getState();
      const activeId = store.activeCanvasId;
      if (!activeId) return;

      // Would need selection tracking to properly replace
      // For now, append
      const doc = store.canvasDocuments[activeId];
      if (doc) {
        store.updateCanvasDocument(activeId, { content: doc.content + text });
      }
      console.log(`[Plugin:${pluginId}] Replaced selection in canvas`);
    },

    getContent: (id?: string): string => {
      const store = useArtifactStore.getState();
      const docId = id || store.activeCanvasId;
      if (!docId) return '';

      const doc = store.canvasDocuments[docId];
      return doc?.content || '';
    },

    setContent: (content: string, id?: string) => {
      const store = useArtifactStore.getState();
      const docId = id || store.activeCanvasId;
      if (!docId) return;

      store.updateCanvasDocument(docId, { content });
      console.log(`[Plugin:${pluginId}] Set canvas content`);
    },

    saveVersion: async (id: string, description?: string): Promise<string> => {
      const store = useArtifactStore.getState();
      const result = store.saveCanvasVersion(id, description, false);
      const versionId = typeof result === 'string' ? result : (result?.id || '');
      console.log(`[Plugin:${pluginId}] Saved canvas version: ${versionId}`);
      return versionId;
    },

    restoreVersion: (documentId: string, versionId: string) => {
      const store = useArtifactStore.getState();
      store.restoreCanvasVersion(documentId, versionId);
      console.log(`[Plugin:${pluginId}] Restored canvas version: ${versionId}`);
    },

    getVersions: (id: string): CanvasDocumentVersion[] => {
      const store = useArtifactStore.getState();
      const doc = store.canvasDocuments[id];
      return doc?.versions || [];
    },

    onCanvasChange: (handler: (doc: PluginCanvasDocument | null) => void) => {
      let lastCanvasId: string | null = null;

      const unsubscribe = useArtifactStore.subscribe((state) => {
        if (state.activeCanvasId !== lastCanvasId) {
          lastCanvasId = state.activeCanvasId;
          
          if (!state.activeCanvasId) {
            handler(null);
            return;
          }

          const doc = state.canvasDocuments[state.activeCanvasId];
          if (doc) {
            handler({
              id: doc.id,
              sessionId: doc.sessionId,
              title: doc.title,
              content: doc.content,
              language: doc.language,
              type: doc.type,
              createdAt: new Date(doc.createdAt),
              updatedAt: new Date(doc.updatedAt),
              suggestions: doc.aiSuggestions,
              versions: doc.versions,
            });
          } else {
            handler(null);
          }
        }
      });

      return unsubscribe;
    },

    onContentChange: (handler: (content: string) => void) => {
      let lastContent: string | null = null;

      const unsubscribe = useArtifactStore.subscribe((state) => {
        const activeId = state.activeCanvasId;
        if (!activeId) return;

        const doc = state.canvasDocuments[activeId];
        if (doc && doc.content !== lastContent) {
          lastContent = doc.content;
          handler(doc.content);
        }
      });

      return unsubscribe;
    },
  };
}
