/**
 * Git Tools Plugin Tests
 */

import { createMockContext, createMockToolContext } from '@cognia/plugin-sdk';
import type { MockPluginContext } from '@cognia/plugin-sdk';
import plugin from '../index';

describe('Git Tools Plugin', () => {
  let context: MockPluginContext;

  beforeEach(() => {
    context = createMockContext({
      pluginId: 'cognia-git-tools',
      config: { maxLogEntries: 50, maxDiffSize: 102400 },
    });
  });

  afterEach(() => {
    context.reset();
  });

  describe('activation', () => {
    it('should activate and register 10 tools', () => {
      plugin.activate(context);
      expect(context.logger.logs).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('10 git tools') })
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
        hooks.onConfigChange({ maxLogEntries: 100, maxDiffSize: 200000 });
        expect(context.logger.logs).toContainEqual(
          expect.objectContaining({ message: 'Git Tools config updated' })
        );
      }
    });

    it('should handle onCommand for known commands', () => {
      const hooks = plugin.activate(context);
      if (hooks && 'onCommand' in hooks && hooks.onCommand) {
        expect(hooks.onCommand('git-tools.status')).toBe(true);
        expect(hooks.onCommand('unknown')).toBe(false);
      }
    });
  });

  describe('deactivate', () => {
    it('should clean up without errors', () => {
      plugin.activate(context);
      expect(() => plugin.deactivate?.()).not.toThrow();
    });
  });

  describe('tools - git_status', () => {
    it('should parse status output', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: '## main\n M src/index.ts\n?? new-file.txt',
        stderr: '',
        code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('git_status');

      const result = await tool!.execute({}, toolContext) as { success: boolean; modified: string[]; untracked: string[] };
      expect(result.success).toBe(true);
      expect(result.modified).toContain('src/index.ts');
      expect(result.untracked).toContain('new-file.txt');
    });
  });

  describe('tools - git_add', () => {
    it('should stage files', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true, stdout: '', stderr: '', code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('git_add');

      const result = await tool!.execute({ files: ['.'] }, toolContext) as { success: boolean; files: string[] };
      expect(result.success).toBe(true);
      expect(result.files).toEqual(['.']);
    });

    it('should emit add event', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true, stdout: '', stderr: '', code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('git_add');
      await tool!.execute({ files: ['file.ts'] }, toolContext);

      expect(context.events.emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'git-tools:add' })
      );
    });
  });

  describe('tools - git_remote', () => {
    it('should list remotes', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: 'origin\thttps://github.com/user/repo.git (fetch)\norigin\thttps://github.com/user/repo.git (push)',
        stderr: '',
        code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('git_remote');

      const result = await tool!.execute({ action: 'list' }, toolContext) as { success: boolean; remotes: Record<string, unknown> };
      expect(result.success).toBe(true);
      expect(result.remotes).toBeDefined();
    });

    it('should cache remotes in storage', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: 'origin\thttps://github.com/user/repo.git (fetch)',
        stderr: '',
        code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('git_remote');
      await tool!.execute({ action: 'list' }, toolContext);

      const cached = await context.storage.get('remotes');
      expect(cached).toBeDefined();
    });
  });

  describe('tools - git_tag', () => {
    it('should list tags', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: 'v1.0.0\nv0.9.0\nv0.8.0',
        stderr: '',
        code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('git_tag');

      const result = await tool!.execute({ action: 'list' }, toolContext) as { success: boolean; tags: string[]; count: number };
      expect(result.success).toBe(true);
      expect(result.tags).toHaveLength(3);
      expect(result.count).toBe(3);
    });

    it('should emit tag event on create', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true, stdout: '', stderr: '', code: 0,
      });

      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('git_tag');
      await tool!.execute({ action: 'create', name: 'v2.0.0', message: 'Release 2.0' }, toolContext);

      expect(context.events.emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'git-tools:tag' })
      );
    });
  });

  describe('events', () => {
    it('should listen for refresh-status event', async () => {
      context.shell.execute = jest.fn().mockResolvedValue({
        success: true,
        stdout: '## main\n M file.ts',
        stderr: '',
        code: 0,
      });

      plugin.activate(context);
      context.events.emit('git-tools:refresh-status');
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(context.events.emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'git-tools:status-updated' })
      );
    });
  });
});
