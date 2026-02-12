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
} from '@/types/plugin/plugin-extended';
import type { Artifact } from '@/types/artifact';
import { createPluginSystemLogger } from '../core/logger';
import {
  ArtifactRenderer as ArtifactRendererComponent,
  MermaidRenderer,
  ChartRenderer,
  MathRenderer,
  MarkdownRenderer,
  CodeRenderer,
} from '@/components/artifacts/artifact-renderers';
import { ArtifactPreview } from '@/components/artifacts/artifact-preview';

// Registry for custom artifact renderers
const artifactRenderers = new Map<string, ArtifactRenderer>();

/**
 * Create the Artifact API for a plugin
 */
export function createArtifactAPI(pluginId: string): PluginArtifactAPI {
  const logger = createPluginSystemLogger(pluginId);
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
      logger.info(`Created artifact: ${id}`);
      return id;
    },

    updateArtifact: (id: string, updates: Partial<Artifact>) => {
      const store = useArtifactStore.getState();
      store.updateArtifact(id, updates);
      logger.info(`Updated artifact: ${id}`);
    },

    deleteArtifact: (id: string) => {
      const store = useArtifactStore.getState();
      store.deleteArtifact(id);
      logger.info(`Deleted artifact: ${id}`);
    },

    listArtifacts: (filter?: ArtifactFilter): Artifact[] => {
      const store = useArtifactStore.getState();
      let artifacts = Object.values(store.artifacts);

      if (filter) {
        if (filter.sessionId) {
          artifacts = artifacts.filter(a => a.sessionId === filter.sessionId);
        }
        if (filter.type) {
          artifacts = artifacts.filter(a => a.type === filter.type);
        }
        if (filter.language) {
          artifacts = artifacts.filter(a => a.language === filter.language);
        }
      }

      // Sort by updatedAt descending before applying pagination
      artifacts.sort((a, b) => {
        const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
        const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
        return dateB.getTime() - dateA.getTime();
      });

      if (filter) {
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
      logger.info(`Opened artifact: ${id}`);
    },

    closeArtifact: () => {
      const store = useArtifactStore.getState();
      store.closePanel();
      logger.info('Closed artifact panel');
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
      logger.info(`Registered artifact renderer: ${type}`);

      return () => {
        artifactRenderers.delete(rendererId);
        logger.info(`Unregistered artifact renderer: ${type}`);
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

/**
 * Clear all artifact renderers (for testing purposes)
 */
export function clearArtifactRenderers(): void {
  artifactRenderers.clear();
}

/**
 * Get the built-in artifact renderers provided by the platform.
 * Plugins can use these to render standard artifact types without
 * implementing their own rendering logic.
 */
export function getBuiltinRenderers() {
  return {
    MermaidRenderer,
    ChartRenderer,
    MathRenderer,
    MarkdownRenderer,
    CodeRenderer,
  };
}

/**
 * Get the default ArtifactRenderer component that routes to the
 * appropriate renderer based on artifact type.
 */
export function getDefaultArtifactRenderer() {
  return ArtifactRendererComponent;
}

/**
 * Get the ArtifactPreview component for full artifact preview
 * including iframe-based rendering for HTML, SVG, and React types.
 */
export function getArtifactPreviewComponent() {
  return ArtifactPreview;
}
