/**
 * Shell Tools Plugin-Level Tests
 * Tests activation, commands, storage, events, hooks, and deactivate
 */

import { createMockContext, createMockToolContext } from '@cognia/plugin-sdk';
import type { MockPluginContext } from '@cognia/plugin-sdk';
import plugin from '../index';

describe('Shell Tools Plugin', () => {
  let context: MockPluginContext;

  beforeEach(() => {
    context = createMockContext({
      pluginId: 'cognia-shell-tools',
      config: {
        defaultShell: '',
        timeout: 30000,
        maxOutputSize: 1048576,
        blockedCommands: ['rm -rf /'],
        allowedDirectories: [],
        hiddenEnvVars: ['SECRET_KEY'],
      },
    });
  });

  afterEach(() => {
    plugin.deactivate?.();
    context.reset();
  });

  describe('activation', () => {
    it('should activate and register 5 tools', () => {
      plugin.activate(context);
      expect(context.logger.logs).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('5 shell tools') })
      );
    });

    it('should register 3 commands', () => {
      plugin.activate(context);
      expect(context.logger.logs).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('3 commands') })
      );
    });
  });

  describe('hooks', () => {
    it('should handle onConfigChange', () => {
      const hooks = plugin.activate(context);
      if (hooks && 'onConfigChange' in hooks && hooks.onConfigChange) {
        hooks.onConfigChange({ timeout: 60000, blockedCommands: ['drop'] });
        expect(context.logger.logs).toContainEqual(
          expect.objectContaining({ message: 'Shell Tools config updated' })
        );
      }
    });

    it('should handle onCommand for known commands', () => {
      const hooks = plugin.activate(context);
      if (hooks && 'onCommand' in hooks && hooks.onCommand) {
        expect(hooks.onCommand('shell-tools.detect-shell')).toBe(true);
        expect(hooks.onCommand('shell-tools.system-info')).toBe(true);
        expect(hooks.onCommand('shell-tools.clear-history')).toBe(true);
        expect(hooks.onCommand('unknown-command')).toBe(false);
      }
    });
  });

  describe('deactivate', () => {
    it('should clean up without errors', () => {
      plugin.activate(context);
      expect(() => plugin.deactivate?.()).not.toThrow();
    });
  });

  describe('tools - shell_exec', () => {
    it('should execute a command', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: 'hello world',
        stderr: '',
        exitCode: 0,
        code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('shell_exec');

      const result = await tool!.execute(
        { command: 'echo hello world' },
        toolContext
      ) as { success: boolean; stdout: string };

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('hello');
    });

    it('should block dangerous commands', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('shell_exec');

      const result = await tool!.execute(
        { command: 'rm -rf /' },
        toolContext
      ) as { success: boolean; error: string };

      expect(result.success).toBe(false);
    });
  });

  describe('execution history', () => {
    it('should record execution via event', async () => {
      plugin.activate(context);

      context.events.emit('shell-tools:exec-complete', {
        command: 'echo test',
        exitCode: 0,
        success: true,
        timestamp: Date.now(),
        durationMs: 50,
      });

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      const history = await context.storage.get('executionHistory');
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });
});
