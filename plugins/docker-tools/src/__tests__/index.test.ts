/**
 * Docker Tools Plugin Tests
 *
 * Uses SDK testing utilities: createMockContext, createMockToolContext
 */

import { createMockContext, createMockToolContext } from '@cognia/plugin-sdk';
import type { MockPluginContext } from '@cognia/plugin-sdk';
import plugin from '../index';

describe('Docker Tools Plugin', () => {
  let context: MockPluginContext;

  beforeEach(() => {
    context = createMockContext({
      pluginId: 'cognia-docker-tools',
      config: {
        maxLogLines: 50,
        defaultTimeout: 30000,
      },
    });
  });

  afterEach(() => {
    context.reset();
  });

  describe('activation', () => {
    it('should activate and register 9 tools', () => {
      const hooks = plugin.activate(context);

      expect(hooks).toBeDefined();
      expect(context.logger.logs).toContainEqual(
        expect.objectContaining({
          level: 'info',
          message: expect.stringContaining('9 docker tools'),
        })
      );
    });

    it('should register 3 commands', () => {
      plugin.activate(context);

      expect(context.logger.logs).toContainEqual(
        expect.objectContaining({
          level: 'info',
          message: expect.stringContaining('3 commands'),
        })
      );
    });

    it('should log activation message', () => {
      plugin.activate(context);

      expect(context.logger.logs[0]).toEqual({
        level: 'info',
        message: 'Docker Tools plugin activated',
        args: [],
      });
    });
  });

  describe('hooks', () => {
    it('should return onEnable hook', async () => {
      const hooks = plugin.activate(context);

      expect(hooks).toBeDefined();
      if (hooks && 'onEnable' in hooks && hooks.onEnable) {
        await hooks.onEnable();
        expect(context.logger.logs).toContainEqual(
          expect.objectContaining({ message: 'Docker Tools enabled' })
        );
      }
    });

    it('should return onDisable hook', async () => {
      const hooks = plugin.activate(context);

      if (hooks && 'onDisable' in hooks && hooks.onDisable) {
        await hooks.onDisable();
        expect(context.logger.logs).toContainEqual(
          expect.objectContaining({ message: 'Docker Tools disabled' })
        );
      }
    });

    it('should handle onConfigChange', () => {
      const hooks = plugin.activate(context);

      if (hooks && 'onConfigChange' in hooks && hooks.onConfigChange) {
        hooks.onConfigChange({ maxLogLines: 200, defaultTimeout: 60000 });
        expect(context.logger.logs).toContainEqual(
          expect.objectContaining({ message: 'Docker Tools config updated' })
        );
      }
    });

    it('should handle onCommand for known commands', () => {
      const hooks = plugin.activate(context);

      if (hooks && 'onCommand' in hooks && hooks.onCommand) {
        const result = hooks.onCommand('docker-tools.list-containers');
        expect(result).toBe(true);
      }
    });

    it('should return false for unknown commands', () => {
      const hooks = plugin.activate(context);

      if (hooks && 'onCommand' in hooks && hooks.onCommand) {
        const result = hooks.onCommand('unknown-command');
        expect(result).toBe(false);
      }
    });
  });

  describe('deactivate', () => {
    it('should clean up without errors', () => {
      plugin.activate(context);
      expect(() => plugin.deactivate?.()).not.toThrow();
    });
  });

  describe('tools - docker_ps', () => {
    it('should list containers with default args', async () => {
      // Mock shell.execute to return container data
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: 'abc123  nginx  "nginx -g"  2024-01-01  Up 2 hours  80/tcp  web-server',
        stderr: '',
        code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();

      // Get the registered tool
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const psTool = agentApi._tools.get('docker_ps');
      expect(psTool).toBeDefined();

      const result = await psTool!.execute({}, toolContext) as { success: boolean; containers: unknown[]; count: number };
      expect(result.success).toBe(true);
      expect(result.containers).toBeDefined();
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('should handle Docker not available', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'docker: command not found',
        code: 1,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();

      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const psTool = agentApi._tools.get('docker_ps');

      const result = await psTool!.execute({}, toolContext) as { success: boolean; error: string };
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should cache containers in storage', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: 'abc123  nginx  "nginx"  2024-01-01  Up  80/tcp  web',
        stderr: '',
        code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();

      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const psTool = agentApi._tools.get('docker_ps');
      await psTool!.execute({}, toolContext);

      const cached = await context.storage.get<{ containers: unknown[]; timestamp: number }>('lastContainers');
      expect(cached).toBeDefined();
      expect(cached!.containers).toBeDefined();
      expect(cached!.timestamp).toBeGreaterThan(0);
    });
  });

  describe('tools - docker_stop', () => {
    it('should stop containers', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: 'abc123\ndef456',
        stderr: '',
        code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();

      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const stopTool = agentApi._tools.get('docker_stop');
      expect(stopTool).toBeDefined();

      const result = await stopTool!.execute(
        { containers: ['abc123', 'def456'] },
        toolContext
      ) as { success: boolean; stopped: string[]; count: number };

      expect(result.success).toBe(true);
      expect(result.stopped).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    it('should emit stop event', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: 'abc123',
        stderr: '',
        code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();

      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const stopTool = agentApi._tools.get('docker_stop');
      await stopTool!.execute({ containers: ['abc123'] }, toolContext);

      expect(context.events.emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'docker-tools:stop' })
      );
    });
  });

  describe('tools - docker_run', () => {
    it('should run a container with image', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc123de',
        stderr: '',
        code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();

      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const runTool = agentApi._tools.get('docker_run');
      expect(runTool).toBeDefined();

      const result = await runTool!.execute(
        { image: 'nginx:latest', name: 'test-nginx', ports: ['8080:80'] },
        toolContext
      ) as { success: boolean; containerId: string; image: string };

      expect(result.success).toBe(true);
      expect(result.containerId).toBeDefined();
      expect(result.image).toBe('nginx:latest');
    });

    it('should emit run event', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: 'abc123',
        stderr: '',
        code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();

      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const runTool = agentApi._tools.get('docker_run');
      await runTool!.execute({ image: 'nginx' }, toolContext);

      expect(context.events.emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'docker-tools:run' })
      );
    });
  });

  describe('tools - docker_stats', () => {
    it('should return resource usage', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: 'abc123\tweb\t0.5%\t100MiB / 2GiB\t5%\t1kB / 0B\t0B / 0B\t5',
        stderr: '',
        code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();

      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const statsTool = agentApi._tools.get('docker_stats');
      expect(statsTool).toBeDefined();

      const result = await statsTool!.execute({}, toolContext) as { success: boolean; stats: unknown[]; count: number };
      expect(result.success).toBe(true);
      expect(result.stats).toHaveLength(1);
    });
  });

  describe('tools - docker_inspect', () => {
    it('should return JSON info', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: JSON.stringify([{ Id: 'abc123', Name: '/web' }]),
        stderr: '',
        code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();

      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const inspectTool = agentApi._tools.get('docker_inspect');
      expect(inspectTool).toBeDefined();

      const result = await inspectTool!.execute(
        { target: 'web' },
        toolContext
      ) as { success: boolean; info: unknown };

      expect(result.success).toBe(true);
      expect(result.info).toBeDefined();
    });

    it('should handle non-JSON output gracefully', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: 'some plain text output',
        stderr: '',
        code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();

      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const inspectTool = agentApi._tools.get('docker_inspect');

      const result = await inspectTool!.execute(
        { target: 'web', format: '{{.State.Status}}' },
        toolContext
      ) as { success: boolean; info: unknown };

      expect(result.success).toBe(true);
      expect(result.info).toBe('some plain text output');
    });
  });

  describe('events', () => {
    it('should listen for refresh event', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: 'abc123  nginx  "nginx"  2024-01-01  Up  80/tcp  web',
        stderr: '',
        code: 0,
      });

      plugin.activate(context);

      // Trigger refresh event
      context.events.emit('docker-tools:refresh');

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(context.events.emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'docker-tools:containers-updated' })
      );
    });
  });
});
