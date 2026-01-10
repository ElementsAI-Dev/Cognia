/**
 * Plugin Artifact API Implementation
 * 
 * Provides artifact management capabilities to plugins.
 */

import { useArtifactStore } from '@/stores/artifact/artifact-store';
import type {
  PluginArtifactAPI,
  CreateArtifactOptions,
  ArtifactFilter,
  ArtifactRenderer,
} from '@/types/plugin-extended';
import type { Artifact } from '@/types/artifact';

// Registry for custom artifact renderers
const artifactRenderers = new Map<string, ArtifactRenderer>();

/**
 * Create the Artifact API for a plugin
 */
export function createArtifactAPI(pluginId: string): PluginArtifactAPI {
  return {
    getActiveArtifact: (): Artifact | null => {
      const store = useArtifactStore.getState();
      if (!store.activeArtifactId) return null;
      return store.artifacts[store.activeArtifactId] || null;
    },

    getArtifact: (id: string): Artifact | null => {
      const store = useArtifactStore.getState();
      return store.artifacts[id] || null;
    },

    createArtifact: async (options: CreateArtifactOptions): Promise<string> => {
      const store = useArtifactStore.getState();
      const artifact = store.createArtifact({
        sessionId: options.sessionId || '',
        messageId: options.messageId || '',
        type: options.type === 'text' ? 'document' : (options.type as 'code' | 'react' | 'html' | 'svg' | 'mermaid' | 'document') || 'code',
        title: options.title,
        content: options.content,
        language: options.language,
      });
      const id = typeof artifact === 'string' ? artifact : artifact?.id || '';
      console.log(`[Plugin:${pluginId}] Created artifact: ${id}`);
      return id;
    },

    updateArtifact: (id: string, updates: Partial<Artifact>) => {
      const store = useArtifactStore.getState();
      store.updateArtifact(id, updates);
      console.log(`[Plugin:${pluginId}] Updated artifact: ${id}`);
    },

    deleteArtifact: (id: string) => {
      const store = useArtifactStore.getState();
      store.deleteArtifact(id);
      console.log(`[Plugin:${pluginId}] Deleted artifact: ${id}`);
    },

    listArtifacts: (filter?: ArtifactFilter): Artifact[] => {
      const store = useArtifactStore.getState();
      let artifacts = Object.values(store.artifacts);

      if (filter) {
        if (filter.sessionId) {
          artifacts = artifacts.filter(a => a.sessionId === filter.sessionId);
        }
        if (filter.language) {
          artifacts = artifacts.filter(a => a.language === filter.language);
        }
        if (filter.offset) {
          artifacts = artifacts.slice(filter.offset);
        }
        if (filter.limit) {
          artifacts = artifacts.slice(0, filter.limit);
        }
      }

      return artifacts;
    },

    openArtifact: (id: string) => {
      const store = useArtifactStore.getState();
      store.setActiveArtifact(id);
      store.setPanelView('artifact');
      console.log(`[Plugin:${pluginId}] Opened artifact: ${id}`);
    },

    closeArtifact: () => {
      const store = useArtifactStore.getState();
      store.closePanel();
      console.log(`[Plugin:${pluginId}] Closed artifact panel`);
    },

    onArtifactChange: (handler: (artifact: Artifact | null) => void) => {
      let lastArtifactId: string | null = null;

      const unsubscribe = useArtifactStore.subscribe((state) => {
        const currentId = state.activeArtifactId || null;
        if (currentId !== lastArtifactId) {
          lastArtifactId = currentId;
          const artifact = currentId ? state.artifacts[currentId] : null;
          handler(artifact || null);
        }
      });

      return unsubscribe;
    },

    registerRenderer: (type: string, renderer: ArtifactRenderer) => {
      const rendererId = `${pluginId}:${type}`;
      artifactRenderers.set(rendererId, { ...renderer, type: rendererId });
      console.log(`[Plugin:${pluginId}] Registered artifact renderer: ${type}`);

      return () => {
        artifactRenderers.delete(rendererId);
        console.log(`[Plugin:${pluginId}] Unregistered artifact renderer: ${type}`);
      };
    },
  };
}

/**
 * Get all registered artifact renderers
 */
export function getArtifactRenderers(): ArtifactRenderer[] {
  return Array.from(artifactRenderers.values());
}
