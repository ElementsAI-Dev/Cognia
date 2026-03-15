import type { PluginBuildResult } from './dev-server';
import type { ReloadResult } from './hot-reload';

type BuildListener = (result: PluginBuildResult) => void;
type ReloadErrorListener = (error: Error, pluginId: string) => void;

interface DevServerBridge {
  watchPlugin: (pluginId: string, path: string) => Promise<void>;
  unwatchPlugin: (pluginId: string) => void | Promise<void>;
  onBuild: (listener: BuildListener) => () => void;
}

interface HotReloadBridge {
  reloadPlugin: (pluginId: string) => Promise<ReloadResult>;
  onReload: (listener: (result: ReloadResult) => void) => () => void;
  onError: (listener: ReloadErrorListener) => () => void;
}

export interface DevExtensionRecord {
  pluginId: string;
  sourcePath: string;
  status:
    | 'watching'
    | 'build_failed'
    | 'reload_success'
    | 'reload_failed'
    | 'unsupported_env';
  registeredAt: number;
  fallbackMode?: 'hot-reload' | 're-enable';
  lastBuild?: PluginBuildResult;
  lastReload?: ReloadResult;
  lastError?: string;
}

interface DevExtensionControllerOptions {
  isDesktop?: boolean;
  devServer?: DevServerBridge;
  hotReload?: HotReloadBridge;
  reloadHandler?: (pluginId: string) => Promise<void>;
}

export class DevExtensionController {
  private readonly isDesktop: boolean;
  private readonly devServer?: DevServerBridge;
  private readonly hotReload?: HotReloadBridge;
  private readonly reloadHandler?: (pluginId: string) => Promise<void>;
  private readonly records = new Map<string, DevExtensionRecord>();
  private readonly unsubs: Array<() => void> = [];

  constructor(options: DevExtensionControllerOptions = {}) {
    this.isDesktop = options.isDesktop ?? false;
    this.devServer = options.devServer;
    this.hotReload = options.hotReload;
    this.reloadHandler = options.reloadHandler;

    if (this.devServer) {
      this.unsubs.push(
        this.devServer.onBuild((result) => {
          void this.handleBuildResult(result);
        }),
      );
    }

    if (this.hotReload) {
      this.unsubs.push(
        this.hotReload.onReload((result) => {
          const record = this.records.get(result.pluginId);
          if (!record) return;
          this.records.set(result.pluginId, {
            ...record,
            status: result.success ? 'reload_success' : 'reload_failed',
            lastReload: result,
            lastError: result.error,
          });
        }),
      );
      this.unsubs.push(
        this.hotReload.onError((error, pluginId) => {
          const record = this.records.get(pluginId);
          if (!record) return;
          this.records.set(pluginId, {
            ...record,
            status: 'reload_failed',
            lastError: error.message,
          });
        }),
      );
    }
  }

  async registerExtension(pluginId: string, sourcePath: string): Promise<DevExtensionRecord> {
    if (!this.isDesktop) {
      const unsupportedRecord: DevExtensionRecord = {
        pluginId,
        sourcePath,
        status: 'unsupported_env',
        registeredAt: Date.now(),
        lastError: 'unsupported_env: dev extensions require a desktop runtime',
      };
      this.records.set(pluginId, unsupportedRecord);
      return unsupportedRecord;
    }

    if (this.devServer) {
      await this.devServer.watchPlugin(pluginId, sourcePath);
    }

    const record: DevExtensionRecord = {
      pluginId,
      sourcePath,
      status: 'watching',
      registeredAt: Date.now(),
      fallbackMode: 'hot-reload',
    };
    this.records.set(pluginId, record);
    return record;
  }

  async unregisterExtension(pluginId: string): Promise<void> {
    if (this.devServer) {
      await this.devServer.unwatchPlugin(pluginId);
    }
    this.records.delete(pluginId);
  }

  getRecord(pluginId: string): DevExtensionRecord | undefined {
    return this.records.get(pluginId);
  }

  getRecords(): DevExtensionRecord[] {
    return Array.from(this.records.values());
  }

  dispose(): void {
    for (const unsub of this.unsubs) {
      unsub();
    }
    this.unsubs.length = 0;
  }

  private async handleBuildResult(result: PluginBuildResult): Promise<void> {
    const record = this.records.get(result.pluginId);
    if (!record) return;

    if (!result.success) {
      this.records.set(result.pluginId, {
        ...record,
        status: 'build_failed',
        lastBuild: result,
        lastError: result.errors?.[0] || 'Build failed',
      });
      return;
    }

    this.records.set(result.pluginId, {
      ...record,
      lastBuild: result,
      lastError: undefined,
    });

    if (!this.hotReload) {
      return;
    }

    const reloadResult = await this.hotReload.reloadPlugin(result.pluginId);
    if (!reloadResult.success && this.reloadHandler) {
      await this.reloadHandler(result.pluginId);
      this.records.set(result.pluginId, {
        ...this.records.get(result.pluginId)!,
        status: 'reload_success',
        fallbackMode: 're-enable',
        lastReload: reloadResult,
        lastError: undefined,
      });
      return;
    }

    this.records.set(result.pluginId, {
      ...this.records.get(result.pluginId)!,
      status: reloadResult.success ? 'reload_success' : 'reload_failed',
      lastReload: reloadResult,
      lastError: reloadResult.error,
    });
  }
}
