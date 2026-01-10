/**
 * Extended Plugin Hooks Manager
 * 
 * Handles dispatching of extended hooks to plugins.
 */

import { usePluginStore } from '@/stores/plugin';
import type { 
  ExtendedPluginHooks,
  HookExecutionResult,
  HookPriority,
} from '@/types/plugin-hooks';
import type { Project, KnowledgeFile } from '@/types/project';
import type { Artifact } from '@/types/artifact';
import type { PluginCanvasDocument } from '@/types/plugin-extended';
import type { PluginMessage } from '@/types/plugin';

// Priority order mapping
const PRIORITY_ORDER: Record<HookPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

/**
 * Extended hooks manager for dispatching new hook types
 */
export class ExtendedHooksManager {
  private hookPriorities: Map<string, Map<string, HookPriority>> = new Map();

  /**
   * Set priority for a plugin's hook
   */
  setPriority(pluginId: string, hookName: string, priority: HookPriority) {
    if (!this.hookPriorities.has(pluginId)) {
      this.hookPriorities.set(pluginId, new Map());
    }
    this.hookPriorities.get(pluginId)!.set(hookName, priority);
  }

  /**
   * Get priority for a plugin's hook
   */
  getPriority(pluginId: string, hookName: string): HookPriority {
    return this.hookPriorities.get(pluginId)?.get(hookName) || 'normal';
  }

  /**
   * Get all plugins with hooks sorted by priority
   */
  private getPluginsByPriority(hookName: keyof ExtendedPluginHooks): string[] {
    const store = usePluginStore.getState();
    const pluginsWithHook: { id: string; priority: HookPriority }[] = [];

    for (const [pluginId, plugin] of Object.entries(store.plugins)) {
      const hooks = plugin.hooks as ExtendedPluginHooks | undefined;
      if (plugin.status === 'enabled' && hooks?.[hookName]) {
        pluginsWithHook.push({
          id: pluginId,
          priority: this.getPriority(pluginId, hookName),
        });
      }
    }

    return pluginsWithHook
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
      .map(p => p.id);
  }

  /**
   * Execute a hook on all plugins
   */
  private async executeHook<T>(
    hookName: keyof ExtendedPluginHooks,
    executor: (hooks: ExtendedPluginHooks, pluginId: string) => T | Promise<T>
  ): Promise<HookExecutionResult<T>[]> {
    const store = usePluginStore.getState();
    const pluginIds = this.getPluginsByPriority(hookName);
    const results: HookExecutionResult<T>[] = [];

    for (const pluginId of pluginIds) {
      const plugin = store.plugins[pluginId];
      if (!plugin || plugin.status !== 'enabled' || !plugin.hooks) continue;

      const startTime = performance.now();
      try {
        const result = await executor(plugin.hooks as ExtendedPluginHooks, pluginId);
        results.push({
          success: true,
          result,
          pluginId,
          executionTime: performance.now() - startTime,
        });
      } catch (error) {
        console.error(`[ExtendedHooks] Error in ${hookName} for plugin ${pluginId}:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          pluginId,
          executionTime: performance.now() - startTime,
        });
      }
    }

    return results;
  }

  // =============================================================================
  // Project Hooks
  // =============================================================================

  async dispatchProjectCreate(project: Project) {
    return this.executeHook('onProjectCreate', (hooks) => 
      hooks.onProjectCreate?.(project)
    );
  }

  async dispatchProjectUpdate(project: Project, changes: Partial<Project>) {
    return this.executeHook('onProjectUpdate', (hooks) => 
      hooks.onProjectUpdate?.(project, changes)
    );
  }

  async dispatchProjectDelete(projectId: string) {
    return this.executeHook('onProjectDelete', (hooks) => 
      hooks.onProjectDelete?.(projectId)
    );
  }

  dispatchProjectSwitch(projectId: string | null, previousProjectId: string | null) {
    this.executeHook('onProjectSwitch', (hooks) => 
      hooks.onProjectSwitch?.(projectId, previousProjectId)
    );
  }

  async dispatchKnowledgeFileAdd(projectId: string, file: KnowledgeFile) {
    return this.executeHook('onKnowledgeFileAdd', (hooks) => 
      hooks.onKnowledgeFileAdd?.(projectId, file)
    );
  }

  dispatchKnowledgeFileRemove(projectId: string, fileId: string) {
    this.executeHook('onKnowledgeFileRemove', (hooks) => 
      hooks.onKnowledgeFileRemove?.(projectId, fileId)
    );
  }

  // =============================================================================
  // Canvas Hooks
  // =============================================================================

  async dispatchCanvasCreate(document: PluginCanvasDocument) {
    return this.executeHook('onCanvasCreate', (hooks) => 
      hooks.onCanvasCreate?.(document)
    );
  }

  dispatchCanvasUpdate(document: PluginCanvasDocument, changes: Partial<PluginCanvasDocument>) {
    this.executeHook('onCanvasUpdate', (hooks) => 
      hooks.onCanvasUpdate?.(document, changes)
    );
  }

  dispatchCanvasDelete(documentId: string) {
    this.executeHook('onCanvasDelete', (hooks) => 
      hooks.onCanvasDelete?.(documentId)
    );
  }

  dispatchCanvasSwitch(documentId: string | null) {
    this.executeHook('onCanvasSwitch', (hooks) => 
      hooks.onCanvasSwitch?.(documentId)
    );
  }

  dispatchCanvasContentChange(documentId: string, content: string, previousContent: string) {
    this.executeHook('onCanvasContentChange', (hooks) => 
      hooks.onCanvasContentChange?.(documentId, content, previousContent)
    );
  }

  // =============================================================================
  // Artifact Hooks
  // =============================================================================

  async dispatchArtifactCreate(artifact: Artifact) {
    return this.executeHook('onArtifactCreate', (hooks) => 
      hooks.onArtifactCreate?.(artifact)
    );
  }

  dispatchArtifactUpdate(artifact: Artifact, changes: Partial<Artifact>) {
    this.executeHook('onArtifactUpdate', (hooks) => 
      hooks.onArtifactUpdate?.(artifact, changes)
    );
  }

  dispatchArtifactDelete(artifactId: string) {
    this.executeHook('onArtifactDelete', (hooks) => 
      hooks.onArtifactDelete?.(artifactId)
    );
  }

  dispatchArtifactOpen(artifactId: string) {
    this.executeHook('onArtifactOpen', (hooks) => 
      hooks.onArtifactOpen?.(artifactId)
    );
  }

  dispatchArtifactClose() {
    this.executeHook('onArtifactClose', (hooks) => 
      hooks.onArtifactClose?.()
    );
  }

  // =============================================================================
  // Export Hooks
  // =============================================================================

  async dispatchExportStart(sessionId: string, format: string) {
    return this.executeHook('onExportStart', (hooks) => 
      hooks.onExportStart?.(sessionId, format)
    );
  }

  dispatchExportComplete(sessionId: string, format: string, success: boolean) {
    this.executeHook('onExportComplete', (hooks) => 
      hooks.onExportComplete?.(sessionId, format, success)
    );
  }

  async dispatchExportTransform(content: string, format: string): Promise<string> {
    const results = await this.executeHook('onExportTransform', async (hooks) => {
      if (hooks.onExportTransform) {
        return hooks.onExportTransform(content, format);
      }
      return content;
    });

    // Chain transformations
    let transformed = content;
    for (const result of results) {
      if (result.success && typeof result.result === 'string') {
        transformed = result.result;
      }
    }
    return transformed;
  }

  // =============================================================================
  // Theme Hooks
  // =============================================================================

  dispatchThemeModeChange(mode: 'light' | 'dark' | 'system', resolvedMode: 'light' | 'dark') {
    this.executeHook('onThemeModeChange', (hooks) => 
      hooks.onThemeModeChange?.(mode, resolvedMode)
    );
  }

  dispatchColorPresetChange(preset: string) {
    this.executeHook('onColorPresetChange', (hooks) => 
      hooks.onColorPresetChange?.(preset)
    );
  }

  // =============================================================================
  // AI/Chat Hooks
  // =============================================================================

  async dispatchChatRequest(messages: PluginMessage[], model: string): Promise<PluginMessage[]> {
    const results = await this.executeHook('onChatRequest', async (hooks) => {
      if (hooks.onChatRequest) {
        return hooks.onChatRequest(messages, model);
      }
      return messages;
    });

    // Use the last successful transformation
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i].success && Array.isArray(results[i].result)) {
        return results[i].result as PluginMessage[];
      }
    }
    return messages;
  }

  dispatchStreamStart(sessionId: string) {
    this.executeHook('onStreamStart', (hooks) => 
      hooks.onStreamStart?.(sessionId)
    );
  }

  dispatchStreamChunk(sessionId: string, chunk: string, fullContent: string) {
    this.executeHook('onStreamChunk', (hooks) => 
      hooks.onStreamChunk?.(sessionId, chunk, fullContent)
    );
  }

  dispatchStreamEnd(sessionId: string, finalContent: string) {
    this.executeHook('onStreamEnd', (hooks) => 
      hooks.onStreamEnd?.(sessionId, finalContent)
    );
  }

  dispatchChatError(sessionId: string, error: Error) {
    this.executeHook('onChatError', (hooks) => 
      hooks.onChatError?.(sessionId, error)
    );
  }

  dispatchTokenUsage(sessionId: string, usage: { prompt: number; completion: number; total: number }) {
    this.executeHook('onTokenUsage', (hooks) => 
      hooks.onTokenUsage?.(sessionId, usage)
    );
  }

  // =============================================================================
  // Vector/RAG Hooks
  // =============================================================================

  dispatchDocumentsIndexed(collection: string, count: number) {
    this.executeHook('onDocumentsIndexed', (hooks) => 
      hooks.onDocumentsIndexed?.(collection, count)
    );
  }

  dispatchVectorSearch(collection: string, query: string, resultCount: number) {
    this.executeHook('onVectorSearch', (hooks) => 
      hooks.onVectorSearch?.(collection, query, resultCount)
    );
  }

  dispatchRAGContextRetrieved(sessionId: string, sources: { id: string; content: string; score: number }[]) {
    this.executeHook('onRAGContextRetrieved', (hooks) => 
      hooks.onRAGContextRetrieved?.(sessionId, sources)
    );
  }

  // =============================================================================
  // Workflow Hooks
  // =============================================================================

  dispatchWorkflowStart(workflowId: string, name: string) {
    this.executeHook('onWorkflowStart', (hooks) => 
      hooks.onWorkflowStart?.(workflowId, name)
    );
  }

  dispatchWorkflowStepComplete(workflowId: string, stepIndex: number, result: unknown) {
    this.executeHook('onWorkflowStepComplete', (hooks) => 
      hooks.onWorkflowStepComplete?.(workflowId, stepIndex, result)
    );
  }

  dispatchWorkflowComplete(workflowId: string, success: boolean, result?: unknown) {
    this.executeHook('onWorkflowComplete', (hooks) => 
      hooks.onWorkflowComplete?.(workflowId, success, result)
    );
  }

  dispatchWorkflowError(workflowId: string, error: Error) {
    this.executeHook('onWorkflowError', (hooks) => 
      hooks.onWorkflowError?.(workflowId, error)
    );
  }

  // =============================================================================
  // UI Hooks
  // =============================================================================

  dispatchSidebarToggle(visible: boolean) {
    this.executeHook('onSidebarToggle', (hooks) => 
      hooks.onSidebarToggle?.(visible)
    );
  }

  dispatchPanelOpen(panelId: string) {
    this.executeHook('onPanelOpen', (hooks) => 
      hooks.onPanelOpen?.(panelId)
    );
  }

  dispatchPanelClose(panelId: string) {
    this.executeHook('onPanelClose', (hooks) => 
      hooks.onPanelClose?.(panelId)
    );
  }

  /**
   * Dispatch shortcut hook - returns true if any plugin handled it
   */
  async dispatchShortcut(shortcut: string): Promise<boolean> {
    const results = await this.executeHook('onShortcut', (hooks) => 
      hooks.onShortcut?.(shortcut)
    );

    return results.some(r => r.success && r.result === true);
  }
}

// Singleton instance
let extendedHooksManager: ExtendedHooksManager | null = null;

/**
 * Get the extended hooks manager instance
 */
export function getExtendedHooksManager(): ExtendedHooksManager {
  if (!extendedHooksManager) {
    extendedHooksManager = new ExtendedHooksManager();
  }
  return extendedHooksManager;
}

/**
 * Reset the extended hooks manager (for testing)
 */
export function resetExtendedHooksManager() {
  extendedHooksManager = null;
}
