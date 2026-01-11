/**
 * Plugin Hooks Manager - Manages and dispatches plugin lifecycle hooks
 */

import type {
  PluginHooks,
  PluginA2UIAction,
  PluginA2UIDataChange,
  PluginAgentStep,
  PluginMessage,
} from '@/types/plugin';
import type { A2UISurfaceType } from '@/types/artifact/a2ui';

// =============================================================================
// Types
// =============================================================================

interface RegisteredHooks {
  pluginId: string;
  hooks: PluginHooks;
  priority: number;
}

type HookName = keyof PluginHooks;

// =============================================================================
// Plugin Hooks Manager
// =============================================================================

export class PluginHooksManager {
  private registeredHooks: Map<string, RegisteredHooks> = new Map();
  private hookExecutionOrder: string[] = [];

  // ===========================================================================
  // Registration
  // ===========================================================================

  registerHooks(pluginId: string, hooks: PluginHooks, priority: number = 0): void {
    this.registeredHooks.set(pluginId, {
      pluginId,
      hooks,
      priority,
    });
    this.updateExecutionOrder();
  }

  unregisterHooks(pluginId: string): void {
    this.registeredHooks.delete(pluginId);
    this.updateExecutionOrder();
  }

  private updateExecutionOrder(): void {
    this.hookExecutionOrder = Array.from(this.registeredHooks.entries())
      .sort((a, b) => b[1].priority - a[1].priority)
      .map(([id]) => id);
  }

  // ===========================================================================
  // Hook Dispatchers - Lifecycle
  // ===========================================================================

  async dispatchOnLoad(pluginId: string): Promise<void> {
    const registered = this.registeredHooks.get(pluginId);
    if (registered?.hooks.onLoad) {
      await registered.hooks.onLoad();
    }
  }

  async dispatchOnEnable(pluginId: string): Promise<void> {
    const registered = this.registeredHooks.get(pluginId);
    if (registered?.hooks.onEnable) {
      await registered.hooks.onEnable();
    }
  }

  async dispatchOnDisable(pluginId: string): Promise<void> {
    const registered = this.registeredHooks.get(pluginId);
    if (registered?.hooks.onDisable) {
      await registered.hooks.onDisable();
    }
  }

  async dispatchOnUnload(pluginId: string): Promise<void> {
    const registered = this.registeredHooks.get(pluginId);
    if (registered?.hooks.onUnload) {
      await registered.hooks.onUnload();
    }
  }

  dispatchOnConfigChange(pluginId: string, config: Record<string, unknown>): void {
    const registered = this.registeredHooks.get(pluginId);
    if (registered?.hooks.onConfigChange) {
      registered.hooks.onConfigChange(config);
    }
  }

  // ===========================================================================
  // Hook Dispatchers - A2UI
  // ===========================================================================

  dispatchOnA2UISurfaceCreate(surfaceId: string, type: A2UISurfaceType): void {
    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onA2UISurfaceCreate) {
        try {
          registered.hooks.onA2UISurfaceCreate(surfaceId, type);
        } catch (error) {
          console.error(`Error in plugin ${pluginId} onA2UISurfaceCreate:`, error);
        }
      }
    }
  }

  dispatchOnA2UISurfaceDestroy(surfaceId: string): void {
    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onA2UISurfaceDestroy) {
        try {
          registered.hooks.onA2UISurfaceDestroy(surfaceId);
        } catch (error) {
          console.error(`Error in plugin ${pluginId} onA2UISurfaceDestroy:`, error);
        }
      }
    }
  }

  async dispatchOnA2UIAction(action: PluginA2UIAction): Promise<void> {
    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onA2UIAction) {
        try {
          await registered.hooks.onA2UIAction(action);
        } catch (error) {
          console.error(`Error in plugin ${pluginId} onA2UIAction:`, error);
        }
      }
    }
  }

  dispatchOnA2UIDataChange(change: PluginA2UIDataChange): void {
    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onA2UIDataChange) {
        try {
          registered.hooks.onA2UIDataChange(change);
        } catch (error) {
          console.error(`Error in plugin ${pluginId} onA2UIDataChange:`, error);
        }
      }
    }
  }

  // ===========================================================================
  // Hook Dispatchers - Agent
  // ===========================================================================

  dispatchOnAgentStart(agentId: string, config: Record<string, unknown>): void {
    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onAgentStart) {
        try {
          registered.hooks.onAgentStart(agentId, config);
        } catch (error) {
          console.error(`Error in plugin ${pluginId} onAgentStart:`, error);
        }
      }
    }
  }

  dispatchOnAgentStep(agentId: string, step: PluginAgentStep): void {
    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onAgentStep) {
        try {
          registered.hooks.onAgentStep(agentId, step);
        } catch (error) {
          console.error(`Error in plugin ${pluginId} onAgentStep:`, error);
        }
      }
    }
  }

  async dispatchOnAgentToolCall(
    agentId: string,
    tool: string,
    args: unknown
  ): Promise<unknown> {
    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onAgentToolCall) {
        try {
          const result = await registered.hooks.onAgentToolCall(agentId, tool, args);
          if (result !== undefined) {
            return result;
          }
        } catch (error) {
          console.error(`Error in plugin ${pluginId} onAgentToolCall:`, error);
        }
      }
    }
    return undefined;
  }

  dispatchOnAgentComplete(agentId: string, result: unknown): void {
    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onAgentComplete) {
        try {
          registered.hooks.onAgentComplete(agentId, result);
        } catch (error) {
          console.error(`Error in plugin ${pluginId} onAgentComplete:`, error);
        }
      }
    }
  }

  dispatchOnAgentError(agentId: string, error: Error): void {
    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onAgentError) {
        try {
          registered.hooks.onAgentError(agentId, error);
        } catch (err) {
          console.error(`Error in plugin ${pluginId} onAgentError:`, err);
        }
      }
    }
  }

  // ===========================================================================
  // Hook Dispatchers - Message (Pipeline style)
  // ===========================================================================

  async dispatchOnMessageSend(message: PluginMessage): Promise<PluginMessage> {
    let currentMessage = message;

    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onMessageSend) {
        try {
          currentMessage = await registered.hooks.onMessageSend(currentMessage);
        } catch (error) {
          console.error(`Error in plugin ${pluginId} onMessageSend:`, error);
        }
      }
    }

    return currentMessage;
  }

  async dispatchOnMessageReceive(message: PluginMessage): Promise<PluginMessage> {
    let currentMessage = message;

    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onMessageReceive) {
        try {
          currentMessage = await registered.hooks.onMessageReceive(currentMessage);
        } catch (error) {
          console.error(`Error in plugin ${pluginId} onMessageReceive:`, error);
        }
      }
    }

    return currentMessage;
  }

  dispatchOnMessageRender(message: PluginMessage): React.ReactNode | null {
    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onMessageRender) {
        try {
          const result = registered.hooks.onMessageRender(message);
          if (result !== null) {
            return result;
          }
        } catch (error) {
          console.error(`Error in plugin ${pluginId} onMessageRender:`, error);
        }
      }
    }
    return null;
  }

  // ===========================================================================
  // Hook Dispatchers - Session
  // ===========================================================================

  dispatchOnSessionCreate(sessionId: string): void {
    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onSessionCreate) {
        try {
          registered.hooks.onSessionCreate(sessionId);
        } catch (error) {
          console.error(`Error in plugin ${pluginId} onSessionCreate:`, error);
        }
      }
    }
  }

  dispatchOnSessionSwitch(sessionId: string): void {
    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onSessionSwitch) {
        try {
          registered.hooks.onSessionSwitch(sessionId);
        } catch (error) {
          console.error(`Error in plugin ${pluginId} onSessionSwitch:`, error);
        }
      }
    }
  }

  dispatchOnSessionDelete(sessionId: string): void {
    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onSessionDelete) {
        try {
          registered.hooks.onSessionDelete(sessionId);
        } catch (error) {
          console.error(`Error in plugin ${pluginId} onSessionDelete:`, error);
        }
      }
    }
  }

  // ===========================================================================
  // Hook Dispatchers - Command
  // ===========================================================================

  async dispatchOnCommand(command: string, args: string[]): Promise<boolean> {
    for (const pluginId of this.hookExecutionOrder) {
      const registered = this.registeredHooks.get(pluginId);
      if (registered?.hooks.onCommand) {
        try {
          const handled = await registered.hooks.onCommand(command, args);
          if (handled) {
            return true;
          }
        } catch (error) {
          console.error(`Error in plugin ${pluginId} onCommand:`, error);
        }
      }
    }
    return false;
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  hasHook(pluginId: string, hookName: HookName): boolean {
    const registered = this.registeredHooks.get(pluginId);
    return registered?.hooks[hookName] !== undefined;
  }

  getPluginsWithHook(hookName: HookName): string[] {
    return Array.from(this.registeredHooks.entries())
      .filter(([_, reg]) => reg.hooks[hookName] !== undefined)
      .map(([id]) => id);
  }

  getRegisteredPlugins(): string[] {
    return Array.from(this.registeredHooks.keys());
  }

  clear(): void {
    this.registeredHooks.clear();
    this.hookExecutionOrder = [];
  }
}
