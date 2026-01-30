/**
 * Plugin Updater
 * 
 * Handles plugin version management, update checking, and installation.
 */

import { invoke } from '@tauri-apps/api/core';
import type { PluginManifest } from '@/types/plugin';
import { getPluginMarketplace } from './marketplace';
import { loggers } from './logger';

// =============================================================================
// Types
// =============================================================================

export interface UpdateInfo {
  pluginId: string;
  currentVersion: string;
  latestVersion: string;
  changelog?: string;
  releaseDate?: Date;
  downloadSize?: number;
  breaking?: boolean;
  minAppVersion?: string;
}

export interface UpdateResult {
  success: boolean;
  pluginId: string;
  previousVersion: string;
  newVersion: string;
  duration: number;
  error?: string;
  requiresRestart?: boolean;
}

export interface UpdateProgress {
  pluginId: string;
  stage: 'checking' | 'downloading' | 'backing_up' | 'installing' | 'verifying' | 'complete' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export interface AutoUpdateConfig {
  enabled: boolean;
  checkInterval: number;
  autoInstall: boolean;
  notifyOnly: boolean;
  excludePlugins: string[];
  allowPrerelease: boolean;
}

export interface UpdaterConfig {
  autoCheck: boolean;
  checkIntervalMs: number;
  maxConcurrentUpdates: number;
  backupBeforeUpdate: boolean;
  verifyAfterUpdate: boolean;
}

type ProgressHandler = (progress: UpdateProgress) => void;

// =============================================================================
// Plugin Updater
// =============================================================================

export class PluginUpdater {
  private config: UpdaterConfig;
  private autoUpdateConfig: AutoUpdateConfig | null = null;
  private progressHandlers: Set<ProgressHandler> = new Set();
  private pendingUpdates: Map<string, UpdateInfo> = new Map();
  private updateHistory: UpdateResult[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private isChecking = false;

  constructor(config: Partial<UpdaterConfig> = {}) {
    this.config = {
      autoCheck: false,
      checkIntervalMs: 3600000, // 1 hour
      maxConcurrentUpdates: 3,
      backupBeforeUpdate: true,
      verifyAfterUpdate: true,
      ...config,
    };
  }

  // ===========================================================================
  // Update Checking
  // ===========================================================================

  async checkForUpdates(pluginIds?: string[]): Promise<UpdateInfo[]> {
    if (this.isChecking) {
      loggers.manager.warn('[Updater] Already checking for updates');
      return [];
    }

    this.isChecking = true;
    const updates: UpdateInfo[] = [];

    try {
      const marketplace = getPluginMarketplace();

      // Get installed plugins
      const installedPlugins = pluginIds
        ? await this.getPluginVersions(pluginIds)
        : await this.getAllInstalledPlugins();

      // Check each plugin for updates
      for (const { id, version } of installedPlugins) {
        this.emitProgress({
          pluginId: id,
          stage: 'checking',
          progress: 0,
          message: `Checking ${id} for updates...`,
        });

        try {
          const latestInfo = await marketplace.getPlugin(id);
          if (latestInfo && this.isNewerVersion(version, latestInfo.latestVersion)) {
            const updateInfo: UpdateInfo = {
              pluginId: id,
              currentVersion: version,
              latestVersion: latestInfo.latestVersion,
              releaseDate: latestInfo.updatedAt,
              breaking: this.isMajorUpdate(version, latestInfo.latestVersion),
            };

            updates.push(updateInfo);
            this.pendingUpdates.set(id, updateInfo);
          }
        } catch (error) {
          loggers.manager.warn(`[Updater] Failed to check ${id}:`, error);
        }
      }

      return updates;
    } finally {
      this.isChecking = false;
    }
  }

  async checkPluginUpdate(pluginId: string): Promise<UpdateInfo | null> {
    const updates = await this.checkForUpdates([pluginId]);
    return updates.find((u) => u.pluginId === pluginId) || null;
  }

  getPendingUpdates(): UpdateInfo[] {
    return Array.from(this.pendingUpdates.values());
  }

  clearPendingUpdate(pluginId: string): void {
    this.pendingUpdates.delete(pluginId);
  }

  // ===========================================================================
  // Update Installation
  // ===========================================================================

  async update(
    pluginId: string,
    options: {
      version?: string;
      backup?: boolean;
      force?: boolean;
    } = {}
  ): Promise<UpdateResult> {
    const startTime = Date.now();
    const updateInfo = this.pendingUpdates.get(pluginId);

    if (!updateInfo && !options.force) {
      return {
        success: false,
        pluginId,
        previousVersion: '',
        newVersion: options.version || '',
        duration: 0,
        error: 'No pending update found',
      };
    }

    const currentVersion = updateInfo?.currentVersion || '';
    const targetVersion = options.version || updateInfo?.latestVersion || '';

    try {
      // Step 1: Backup if configured
      if (options.backup ?? this.config.backupBeforeUpdate) {
        this.emitProgress({
          pluginId,
          stage: 'backing_up',
          progress: 10,
          message: 'Creating backup...',
        });

        await invoke('plugin_backup_create', {
          pluginId,
          reason: `pre-update-${targetVersion}`,
        });
      }

      // Step 2: Download new version
      this.emitProgress({
        pluginId,
        stage: 'downloading',
        progress: 30,
        message: `Downloading version ${targetVersion}...`,
      });

      const downloadResult = await invoke<{ path: string }>('plugin_download_version', {
        pluginId,
        version: targetVersion,
      });

      // Step 3: Install
      this.emitProgress({
        pluginId,
        stage: 'installing',
        progress: 60,
        message: 'Installing update...',
      });

      await invoke('plugin_install_update', {
        pluginId,
        packagePath: downloadResult.path,
        previousVersion: currentVersion,
      });

      // Step 4: Verify
      if (this.config.verifyAfterUpdate) {
        this.emitProgress({
          pluginId,
          stage: 'verifying',
          progress: 90,
          message: 'Verifying installation...',
        });

        const verified = await this.verifyInstallation(pluginId, targetVersion);
        if (!verified) {
          throw new Error('Update verification failed');
        }
      }

      // Complete
      this.emitProgress({
        pluginId,
        stage: 'complete',
        progress: 100,
        message: 'Update complete!',
      });

      this.pendingUpdates.delete(pluginId);

      const result: UpdateResult = {
        success: true,
        pluginId,
        previousVersion: currentVersion,
        newVersion: targetVersion,
        duration: Date.now() - startTime,
        requiresRestart: await this.requiresRestart(pluginId),
      };

      this.updateHistory.push(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.emitProgress({
        pluginId,
        stage: 'error',
        progress: 0,
        message: 'Update failed',
        error: errorMessage,
      });

      const result: UpdateResult = {
        success: false,
        pluginId,
        previousVersion: currentVersion,
        newVersion: targetVersion,
        duration: Date.now() - startTime,
        error: errorMessage,
      };

      this.updateHistory.push(result);
      return result;
    }
  }

  async updateAll(options: { skipBreaking?: boolean } = {}): Promise<UpdateResult[]> {
    const results: UpdateResult[] = [];
    const pending = Array.from(this.pendingUpdates.values());

    for (const update of pending) {
      if (options.skipBreaking && update.breaking) {
        loggers.manager.info(`[Updater] Skipping breaking update for ${update.pluginId}`);
        continue;
      }

      const result = await this.update(update.pluginId);
      results.push(result);
    }

    return results;
  }

  private async verifyInstallation(pluginId: string, expectedVersion: string): Promise<boolean> {
    try {
      const manifest = await invoke<PluginManifest>('plugin_get_manifest', { pluginId });
      return manifest.version === expectedVersion;
    } catch {
      return false;
    }
  }

  private async requiresRestart(pluginId: string): Promise<boolean> {
    try {
      return await invoke<boolean>('plugin_requires_restart', { pluginId });
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // Auto Update
  // ===========================================================================

  configureAutoUpdate(config: AutoUpdateConfig): void {
    this.autoUpdateConfig = config;

    // Clear existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Set up new interval if enabled
    if (config.enabled) {
      this.checkInterval = setInterval(() => {
        this.runAutoUpdate();
      }, config.checkInterval);
    }
  }

  private async runAutoUpdate(): Promise<void> {
    if (!this.autoUpdateConfig) return;

    const updates = await this.checkForUpdates();
    const filteredUpdates = updates.filter(
      (u) => !this.autoUpdateConfig!.excludePlugins.includes(u.pluginId)
    );

    if (filteredUpdates.length === 0) return;

    if (this.autoUpdateConfig.notifyOnly) {
      // Emit notification event
      window.dispatchEvent(
        new CustomEvent('plugin:updates-available', {
          detail: { updates: filteredUpdates },
        })
      );
      return;
    }

    if (this.autoUpdateConfig.autoInstall) {
      for (const update of filteredUpdates) {
        if (!update.breaking) {
          await this.update(update.pluginId);
        }
      }
    }
  }

  stopAutoUpdate(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.autoUpdateConfig = null;
  }

  // ===========================================================================
  // Progress Handling
  // ===========================================================================

  onProgress(handler: ProgressHandler): () => void {
    this.progressHandlers.add(handler);
    return () => this.progressHandlers.delete(handler);
  }

  private emitProgress(progress: UpdateProgress): void {
    for (const handler of this.progressHandlers) {
      try {
        handler(progress);
      } catch (error) {
        loggers.manager.error('[Updater] Progress handler error:', error);
      }
    }
  }

  // ===========================================================================
  // Version Utilities
  // ===========================================================================

  private isNewerVersion(current: string, latest: string): boolean {
    const currentParts = current.split('.').map((p) => parseInt(p) || 0);
    const latestParts = latest.split('.').map((p) => parseInt(p) || 0);

    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const c = currentParts[i] || 0;
      const l = latestParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }

    return false;
  }

  private isMajorUpdate(current: string, latest: string): boolean {
    const currentMajor = parseInt(current.split('.')[0]) || 0;
    const latestMajor = parseInt(latest.split('.')[0]) || 0;
    return latestMajor > currentMajor;
  }

  private async getPluginVersions(pluginIds: string[]): Promise<Array<{ id: string; version: string }>> {
    const result: Array<{ id: string; version: string }> = [];

    for (const id of pluginIds) {
      try {
        const manifest = await invoke<PluginManifest>('plugin_get_manifest', { pluginId: id });
        result.push({ id, version: manifest.version });
      } catch {
        // Plugin not found, skip
      }
    }

    return result;
  }

  private async getAllInstalledPlugins(): Promise<Array<{ id: string; version: string }>> {
    try {
      return await invoke<Array<{ id: string; version: string }>>('plugin_list_installed');
    } catch {
      return [];
    }
  }

  // ===========================================================================
  // History
  // ===========================================================================

  getUpdateHistory(pluginId?: string): UpdateResult[] {
    if (pluginId) {
      return this.updateHistory.filter((r) => r.pluginId === pluginId);
    }
    return [...this.updateHistory];
  }

  clearHistory(): void {
    this.updateHistory = [];
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  dispose(): void {
    this.stopAutoUpdate();
    this.progressHandlers.clear();
    this.pendingUpdates.clear();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let updaterInstance: PluginUpdater | null = null;

export function getPluginUpdater(config?: Partial<UpdaterConfig>): PluginUpdater {
  if (!updaterInstance) {
    updaterInstance = new PluginUpdater(config);
  }
  return updaterInstance;
}

export function resetPluginUpdater(): void {
  if (updaterInstance) {
    updaterInstance.dispose();
    updaterInstance = null;
  }
}
