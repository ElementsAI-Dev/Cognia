/**
 * Plugin Development Server
 * 
 * Provides a development server for plugin development with:
 * - WebSocket communication for real-time updates
 * - Plugin bundling and serving
 * - Development tools integration
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// =============================================================================
// Types
// =============================================================================

export interface DevServerConfig {
  /** Server port */
  port: number;
  /** Host address */
  host: string;
  /** Enable HTTPS */
  https: boolean;
  /** Enable source maps */
  sourceMaps: boolean;
  /** Open browser on start */
  openBrowser: boolean;
  /** Plugins directory */
  pluginsDir: string;
  /** Enable CORS */
  cors: boolean;
}

export interface DevServerStatus {
  running: boolean;
  port: number;
  host: string;
  url: string;
  startedAt?: number;
  connectedClients: number;
}

export interface DevServerMessage {
  type: 'reload' | 'update' | 'error' | 'log' | 'inspect' | 'command';
  pluginId?: string;
  payload: unknown;
  timestamp: number;
}

export interface PluginBuildResult {
  success: boolean;
  pluginId: string;
  outputPath?: string;
  duration: number;
  errors?: string[];
  warnings?: string[];
}

export interface DevConsoleMessage {
  level: 'debug' | 'info' | 'warn' | 'error';
  pluginId: string;
  message: string;
  args?: unknown[];
  timestamp: number;
  stack?: string;
}

type MessageHandler = (message: DevServerMessage) => void;
type ConsoleHandler = (message: DevConsoleMessage) => void;

// =============================================================================
// Dev Server Client
// =============================================================================

export class PluginDevServer {
  private config: DevServerConfig;
  private status: DevServerStatus;
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private consoleHandlers: Set<ConsoleHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private unlistenFn: UnlistenFn | null = null;
  private consoleLogs: DevConsoleMessage[] = [];
  private maxConsoleLogs = 500;

  constructor(config: Partial<DevServerConfig> = {}) {
    this.config = {
      port: 9527,
      host: 'localhost',
      https: false,
      sourceMaps: true,
      openBrowser: false,
      pluginsDir: '',
      cors: true,
      ...config,
    };

    this.status = {
      running: false,
      port: this.config.port,
      host: this.config.host,
      url: this.buildUrl(),
      connectedClients: 0,
    };
  }

  // ===========================================================================
  // Server Control
  // ===========================================================================

  async start(): Promise<void> {
    if (this.status.running) {
      console.warn('[DevServer] Server is already running');
      return;
    }

    try {
      // Start the dev server via Tauri
      const result = await invoke<{ port: number; host: string }>('plugin_dev_server_start', {
        config: this.config,
      });

      this.status = {
        running: true,
        port: result.port,
        host: result.host,
        url: this.buildUrl(result.host, result.port),
        startedAt: Date.now(),
        connectedClients: 0,
      };

      // Connect WebSocket for real-time communication
      await this.connectWebSocket();

      // Listen for Tauri events
      this.unlistenFn = await listen<DevServerMessage>('plugin:dev-server', (event) => {
        this.handleMessage(event.payload);
      });

      console.info(`[DevServer] Started at ${this.status.url}`);

      if (this.config.openBrowser) {
        await invoke('shell_open', { url: this.status.url });
      }
    } catch (error) {
      console.error('[DevServer] Failed to start:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.status.running) return;

    try {
      // Disconnect WebSocket
      this.disconnectWebSocket();

      // Stop listening for events
      if (this.unlistenFn) {
        this.unlistenFn();
        this.unlistenFn = null;
      }

      // Stop the dev server via Tauri
      await invoke('plugin_dev_server_stop');

      this.status = {
        ...this.status,
        running: false,
        connectedClients: 0,
      };

      console.info('[DevServer] Stopped');
    } catch (error) {
      console.error('[DevServer] Failed to stop:', error);
      throw error;
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  // ===========================================================================
  // WebSocket Connection
  // ===========================================================================

  private async connectWebSocket(): Promise<void> {
    const wsUrl = `${this.config.https ? 'wss' : 'ws'}://${this.status.host}:${this.status.port}/ws`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.info('[DevServer] WebSocket connected');
          this.reconnectAttempts = 0;
          this.status.connectedClients = 1;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as DevServerMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('[DevServer] Failed to parse message:', error);
          }
        };

        this.ws.onclose = () => {
          console.info('[DevServer] WebSocket disconnected');
          this.status.connectedClients = 0;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[DevServer] WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect(): void {
    if (!this.status.running) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[DevServer] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.info(`[DevServer] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connectWebSocket().catch(() => {
        this.attemptReconnect();
      });
    }, delay);
  }

  // ===========================================================================
  // Message Handling
  // ===========================================================================

  private handleMessage(message: DevServerMessage): void {
    switch (message.type) {
      case 'log':
        this.handleLogMessage(message.payload as DevConsoleMessage);
        break;

      case 'error':
        console.error('[DevServer] Plugin error:', message.payload);
        break;

      case 'reload':
        console.info('[DevServer] Reload triggered for:', message.pluginId);
        break;

      case 'update':
        console.info('[DevServer] Hot update for:', message.pluginId);
        break;
    }

    // Notify all handlers
    for (const handler of this.messageHandlers) {
      try {
        handler(message);
      } catch (error) {
        console.error('[DevServer] Message handler error:', error);
      }
    }
  }

  private handleLogMessage(log: DevConsoleMessage): void {
    this.consoleLogs.push(log);
    if (this.consoleLogs.length > this.maxConsoleLogs) {
      this.consoleLogs = this.consoleLogs.slice(-this.maxConsoleLogs);
    }

    // Notify console handlers
    for (const handler of this.consoleHandlers) {
      try {
        handler(log);
      } catch (error) {
        console.error('[DevServer] Console handler error:', error);
      }
    }
  }

  // ===========================================================================
  // Plugin Building
  // ===========================================================================

  async buildPlugin(pluginId: string): Promise<PluginBuildResult> {
    const startTime = Date.now();

    try {
      const result = await invoke<{
        success: boolean;
        outputPath?: string;
        errors?: string[];
        warnings?: string[];
      }>('plugin_build', {
        pluginId,
        config: {
          sourceMaps: this.config.sourceMaps,
          minify: false,
          target: 'development',
        },
      });

      return {
        success: result.success,
        pluginId,
        outputPath: result.outputPath,
        duration: Date.now() - startTime,
        errors: result.errors,
        warnings: result.warnings,
      };
    } catch (error) {
      return {
        success: false,
        pluginId,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  async buildAllPlugins(): Promise<PluginBuildResult[]> {
    try {
      const pluginIds = await invoke<string[]>('plugin_list_dev_plugins', {
        pluginsDir: this.config.pluginsDir,
      });

      const results: PluginBuildResult[] = [];
      for (const pluginId of pluginIds) {
        const result = await this.buildPlugin(pluginId);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('[DevServer] Failed to build all plugins:', error);
      return [];
    }
  }

  // ===========================================================================
  // Commands
  // ===========================================================================

  sendCommand(command: string, pluginId?: string, data?: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[DevServer] WebSocket not connected');
      return;
    }

    const message: DevServerMessage = {
      type: 'command',
      pluginId,
      payload: { command, data },
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
  }

  triggerReload(pluginId?: string): void {
    this.sendCommand('reload', pluginId);
  }

  triggerInspect(pluginId: string): void {
    this.sendCommand('inspect', pluginId);
  }

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConsoleLog(handler: ConsoleHandler): () => void {
    this.consoleHandlers.add(handler);
    return () => this.consoleHandlers.delete(handler);
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  getStatus(): DevServerStatus {
    return { ...this.status };
  }

  getConsoleLogs(pluginId?: string): DevConsoleMessage[] {
    if (pluginId) {
      return this.consoleLogs.filter((log) => log.pluginId === pluginId);
    }
    return [...this.consoleLogs];
  }

  clearConsoleLogs(pluginId?: string): void {
    if (pluginId) {
      this.consoleLogs = this.consoleLogs.filter((log) => log.pluginId !== pluginId);
    } else {
      this.consoleLogs = [];
    }
  }

  isRunning(): boolean {
    return this.status.running;
  }

  getUrl(): string {
    return this.status.url;
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  private buildUrl(host?: string, port?: number): string {
    const protocol = this.config.https ? 'https' : 'http';
    const h = host || this.config.host;
    const p = port || this.config.port;
    return `${protocol}://${h}:${p}`;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let devServerInstance: PluginDevServer | null = null;

export function getPluginDevServer(config?: Partial<DevServerConfig>): PluginDevServer {
  if (!devServerInstance) {
    devServerInstance = new PluginDevServer(config);
  }
  return devServerInstance;
}

export function resetPluginDevServer(): void {
  if (devServerInstance) {
    devServerInstance.stop();
    devServerInstance = null;
  }
}

// =============================================================================
// React Hook
// =============================================================================

import { useEffect, useState, useCallback, useMemo } from 'react';

export function usePluginDevServer() {
  const devServer = useMemo(() => getPluginDevServer(), []);
  const [status, setStatus] = useState<DevServerStatus>(() => devServer.getStatus());
  const [consoleLogs, setConsoleLogs] = useState<DevConsoleMessage[]>([]);

  useEffect(() => {
    const unsubscribeConsole = devServer.onConsoleLog((log) => {
      setConsoleLogs((prev) => [...prev.slice(-99), log]);
    });

    const unsubscribeMessage = devServer.onMessage(() => {
      setStatus(devServer.getStatus());
    });

    return () => {
      unsubscribeConsole();
      unsubscribeMessage();
    };
  }, [devServer]);

  const start = useCallback(async () => {
    await devServer.start();
    setStatus(devServer.getStatus());
  }, [devServer]);

  const stop = useCallback(async () => {
    await devServer.stop();
    setStatus(devServer.getStatus());
  }, [devServer]);

  const build = useCallback(async (pluginId: string) => {
    return devServer.buildPlugin(pluginId);
  }, [devServer]);

  const clearLogs = useCallback((pluginId?: string) => {
    devServer.clearConsoleLogs(pluginId);
    setConsoleLogs(devServer.getConsoleLogs());
  }, [devServer]);

  return {
    status,
    consoleLogs,
    start,
    stop,
    build,
    clearLogs,
    devServer,
  };
}
