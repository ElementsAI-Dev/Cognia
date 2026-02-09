/**
 * Docker Tools Plugin
 *
 * Docker container management for AI agents.
 * Provides tools for listing, running, stopping, inspecting containers and images.
 */

import { definePlugin, defineCommand, Schema, parameters } from '@cognia/plugin-sdk';
import type { PluginContext, PluginHooksAll, PluginToolContext } from '@cognia/plugin-sdk';

// ============================================================================
// Types
// ============================================================================

interface DockerConfig {
  maxLogLines: number;
  defaultTimeout: number;
}

interface Container {
  id: string;
  image: string;
  command: string;
  created: string;
  status: string;
  ports: string;
  names: string;
}

// ============================================================================
// Helpers
// ============================================================================

async function runDocker(
  context: PluginContext,
  args: string[],
  timeout?: number
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  const command = `docker ${args.join(' ')}`;
  try {
    const result = await context.shell.execute(command, { timeout: timeout || 30000 });
    return { success: result.success, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return { success: false, stdout: '', stderr: error instanceof Error ? error.message : String(error) };
  }
}

function parseContainers(output: string): Container[] {
  return output
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const parts = line.split(/\s{2,}/);
      return {
        id: parts[0] || '',
        image: parts[1] || '',
        command: parts[2] || '',
        created: parts[3] || '',
        status: parts[4] || '',
        ports: parts[5] || '',
        names: parts[6] || '',
      };
    });
}

// ============================================================================
// Existing Tools
// ============================================================================

function createDockerPsTool(context: PluginContext) {
  return {
    name: 'docker_ps',
    description: 'List running Docker containers',
    parametersSchema: parameters(
      {
        all: Schema.boolean('Show all containers (including stopped)'),
        filter: Schema.string('Filter by name or image'),
      },
      []
    ),
    execute: async (args: { all?: boolean; filter?: string }, _toolContext: PluginToolContext) => {
      const dockerArgs = ['ps', '--format', '{{.ID}}\t{{.Image}}\t{{.Command}}\t{{.CreatedAt}}\t{{.Status}}\t{{.Ports}}\t{{.Names}}'];
      if (args.all) dockerArgs.push('-a');
      if (args.filter) dockerArgs.push('--filter', `name=${args.filter}`);

      const result = await runDocker(context, dockerArgs);

      if (!result.success) {
        return { success: false, error: result.stderr || 'Docker not available' };
      }

      const containers = parseContainers(result.stdout);

      // Cache container list in storage
      await context.storage.set('lastContainers', {
        containers,
        timestamp: Date.now(),
      });

      return {
        success: true,
        containers,
        count: containers.length,
      };
    },
  };
}

function createDockerImagesTool(context: PluginContext) {
  return {
    name: 'docker_images',
    description: 'List Docker images',
    parametersSchema: parameters(
      {
        filter: Schema.string('Filter by repository name'),
      },
      []
    ),
    execute: async (args: { filter?: string }, _toolContext: PluginToolContext) => {
      const dockerArgs = ['images', '--format', '{{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}\t{{.CreatedAt}}'];
      if (args.filter) dockerArgs.push(args.filter);

      const result = await runDocker(context, dockerArgs);

      if (!result.success) {
        return { success: false, error: result.stderr };
      }

      const images = result.stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const [repository, tag, id, size, created] = line.split('\t');
          return { repository, tag, id, size, created };
        });

      // Cache image list in storage
      await context.storage.set('lastImages', {
        images,
        timestamp: Date.now(),
      });

      return {
        success: true,
        images,
        count: images.length,
      };
    },
  };
}

function createDockerLogsTool(config: DockerConfig, context: PluginContext) {
  return {
    name: 'docker_logs',
    description: 'View container logs',
    parametersSchema: parameters(
      {
        container: Schema.string('Container name or ID'),
        tail: Schema.number('Number of lines to show'),
        since: Schema.string('Show logs since timestamp'),
      },
      ['container']
    ),
    execute: async (
      args: { container: string; tail?: number; since?: string },
      _toolContext: PluginToolContext
    ) => {
      const tail = args.tail || config.maxLogLines;
      const dockerArgs = ['logs', '--tail', String(tail)];

      if (args.since) {
        dockerArgs.push('--since', args.since);
      }

      dockerArgs.push(args.container);

      const result = await runDocker(context, dockerArgs);

      return {
        success: result.success,
        container: args.container,
        logs: result.stdout || result.stderr,
        lines: (result.stdout || result.stderr).split('\n').length,
      };
    },
  };
}

function createDockerExecTool(context: PluginContext) {
  return {
    name: 'docker_exec',
    description: 'Execute a command inside a running container',
    parametersSchema: parameters(
      {
        container: Schema.string('Container name or ID'),
        command: Schema.string('Command to execute'),
        workdir: Schema.string('Working directory inside container'),
      },
      ['container', 'command']
    ),
    execute: async (
      args: { container: string; command: string; workdir?: string },
      _toolContext: PluginToolContext
    ) => {
      const dockerArgs = ['exec'];

      if (args.workdir) {
        dockerArgs.push('-w', args.workdir);
      }

      dockerArgs.push(args.container, 'sh', '-c', `"${args.command}"`);

      const result = await runDocker(context, dockerArgs);

      context.events.emit('docker-tools:exec', {
        container: args.container,
        command: args.command,
        success: result.success,
      });

      return {
        success: result.success,
        container: args.container,
        command: args.command,
        output: result.stdout,
        error: result.stderr,
      };
    },
  };
}

// ============================================================================
// New Tools
// ============================================================================

function createDockerRunTool(config: DockerConfig, context: PluginContext) {
  return {
    name: 'docker_run',
    description: 'Run a new Docker container from an image',
    parametersSchema: parameters(
      {
        image: Schema.string('Docker image to run'),
        name: Schema.string('Container name'),
        detach: Schema.boolean('Run in background (default: true)'),
        ports: Schema.array(Schema.string('Port mappings, e.g. "8080:80"')),
        env: Schema.array(Schema.string('Environment variables, e.g. "KEY=VALUE"')),
        volumes: Schema.array(Schema.string('Volume mounts, e.g. "/host:/container"')),
        command: Schema.string('Command to run in the container'),
      },
      ['image']
    ),
    execute: async (
      args: {
        image: string;
        name?: string;
        detach?: boolean;
        ports?: string[];
        env?: string[];
        volumes?: string[];
        command?: string;
      },
      _toolContext: PluginToolContext
    ) => {
      const dockerArgs = ['run'];

      if (args.detach !== false) {
        dockerArgs.push('-d');
      }

      if (args.name) {
        dockerArgs.push('--name', args.name);
      }

      if (args.ports) {
        for (const port of args.ports) {
          dockerArgs.push('-p', port);
        }
      }

      if (args.env) {
        for (const envVar of args.env) {
          dockerArgs.push('-e', envVar);
        }
      }

      if (args.volumes) {
        for (const vol of args.volumes) {
          dockerArgs.push('-v', vol);
        }
      }

      dockerArgs.push(args.image);

      if (args.command) {
        dockerArgs.push(...args.command.split(' '));
      }

      const result = await runDocker(context, dockerArgs, config.defaultTimeout);

      const containerId = result.success ? result.stdout.trim().substring(0, 12) : undefined;

      context.events.emit('docker-tools:run', {
        image: args.image,
        name: args.name,
        containerId,
        success: result.success,
      });

      return {
        success: result.success,
        containerId,
        image: args.image,
        name: args.name,
        error: result.success ? undefined : result.stderr,
      };
    },
  };
}

function createDockerStopTool(context: PluginContext) {
  return {
    name: 'docker_stop',
    description: 'Stop one or more running containers',
    parametersSchema: parameters(
      {
        containers: Schema.array(Schema.string('Container names or IDs to stop')),
        timeout: Schema.number('Seconds to wait before killing (default: 10)'),
      },
      ['containers']
    ),
    execute: async (
      args: { containers: string[]; timeout?: number },
      _toolContext: PluginToolContext
    ) => {
      const dockerArgs = ['stop'];

      if (args.timeout !== undefined) {
        dockerArgs.push('-t', String(args.timeout));
      }

      dockerArgs.push(...args.containers);

      const result = await runDocker(context, dockerArgs);

      const stopped = result.success
        ? result.stdout.trim().split('\n').filter(Boolean)
        : [];

      context.events.emit('docker-tools:stop', {
        containers: args.containers,
        stopped,
        success: result.success,
      });

      return {
        success: result.success,
        stopped,
        count: stopped.length,
        error: result.success ? undefined : result.stderr,
      };
    },
  };
}

function createDockerRmTool(context: PluginContext) {
  return {
    name: 'docker_rm',
    description: 'Remove one or more containers',
    parametersSchema: parameters(
      {
        containers: Schema.array(Schema.string('Container names or IDs to remove')),
        force: Schema.boolean('Force removal of running containers'),
        volumes: Schema.boolean('Remove associated volumes'),
      },
      ['containers']
    ),
    execute: async (
      args: { containers: string[]; force?: boolean; volumes?: boolean },
      _toolContext: PluginToolContext
    ) => {
      const dockerArgs = ['rm'];

      if (args.force) dockerArgs.push('-f');
      if (args.volumes) dockerArgs.push('-v');

      dockerArgs.push(...args.containers);

      const result = await runDocker(context, dockerArgs);

      const removed = result.success
        ? result.stdout.trim().split('\n').filter(Boolean)
        : [];

      context.events.emit('docker-tools:rm', {
        containers: args.containers,
        removed,
        success: result.success,
      });

      return {
        success: result.success,
        removed,
        count: removed.length,
        error: result.success ? undefined : result.stderr,
      };
    },
  };
}

function createDockerStatsTool(context: PluginContext) {
  return {
    name: 'docker_stats',
    description: 'Show resource usage statistics for containers',
    parametersSchema: parameters(
      {
        containers: Schema.array(Schema.string('Container names or IDs (empty = all running)')),
      },
      []
    ),
    execute: async (
      args: { containers?: string[] },
      _toolContext: PluginToolContext
    ) => {
      const dockerArgs = ['stats', '--no-stream', '--format',
        '{{.Container}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}'];

      if (args.containers && args.containers.length > 0) {
        dockerArgs.push(...args.containers);
      }

      const result = await runDocker(context, dockerArgs);

      if (!result.success) {
        return { success: false, error: result.stderr };
      }

      const stats = result.stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const [container, name, cpu, memUsage, memPerc, netIO, blockIO, pids] = line.split('\t');
          return { container, name, cpu, memUsage, memPerc, netIO, blockIO, pids };
        });

      return {
        success: true,
        stats,
        count: stats.length,
      };
    },
  };
}

function createDockerInspectTool(context: PluginContext) {
  return {
    name: 'docker_inspect',
    description: 'Show detailed information about a container or image',
    parametersSchema: parameters(
      {
        target: Schema.string('Container or image name/ID'),
        format: Schema.string('Go template format string (optional)'),
      },
      ['target']
    ),
    execute: async (
      args: { target: string; format?: string },
      _toolContext: PluginToolContext
    ) => {
      const dockerArgs = ['inspect'];

      if (args.format) {
        dockerArgs.push('--format', args.format);
      }

      dockerArgs.push(args.target);

      const result = await runDocker(context, dockerArgs);

      if (!result.success) {
        return { success: false, error: result.stderr };
      }

      let info: unknown;
      try {
        info = JSON.parse(result.stdout);
      } catch {
        info = result.stdout;
      }

      return {
        success: true,
        target: args.target,
        info,
      };
    },
  };
}

// ============================================================================
// Commands
// ============================================================================

function createCommands(context: PluginContext) {
  return [
    defineCommand(
      'docker-tools.list-containers',
      'List Docker Containers',
      async () => {
        const result = await runDocker(context, ['ps', '-a', '--format', 'table {{.Names}}\t{{.Status}}\t{{.Image}}']);
        context.ui.showNotification({
          title: 'Docker Containers',
          message: result.success ? result.stdout || 'No containers found' : `Error: ${result.stderr}`,
          type: result.success ? 'info' : 'error',
        });
      },
      { description: 'Show all Docker containers', icon: 'container' }
    ),
    defineCommand(
      'docker-tools.system-info',
      'Docker System Info',
      async () => {
        const result = await runDocker(context, ['info', '--format', '{{.ServerVersion}} | Containers: {{.Containers}} | Images: {{.Images}} | OS: {{.OperatingSystem}}']);
        context.ui.showNotification({
          title: 'Docker System Info',
          message: result.success ? result.stdout : `Error: ${result.stderr}`,
          type: result.success ? 'info' : 'error',
        });
      },
      { description: 'Show Docker system information', icon: 'info' }
    ),
    defineCommand(
      'docker-tools.disk-usage',
      'Docker Disk Usage',
      async () => {
        const result = await runDocker(context, ['system', 'df']);
        context.ui.showNotification({
          title: 'Docker Disk Usage',
          message: result.success ? result.stdout : `Error: ${result.stderr}`,
          type: result.success ? 'info' : 'warning',
        });
      },
      { description: 'Show Docker disk usage', icon: 'hard-drive' }
    ),
  ];
}

// ============================================================================
// Plugin Definition
// ============================================================================

// Event unsubscribe functions for cleanup
const eventCleanups: Array<() => void> = [];

export default definePlugin({
  activate(context: PluginContext): PluginHooksAll | void {
    context.logger.info('Docker Tools plugin activated');

    const config: DockerConfig = {
      maxLogLines: (context.config.maxLogLines as number) || 100,
      defaultTimeout: (context.config.defaultTimeout as number) || 60000,
    };

    // Register all tools (existing + new)
    const tools = [
      createDockerPsTool(context),
      createDockerImagesTool(context),
      createDockerLogsTool(config, context),
      createDockerExecTool(context),
      createDockerRunTool(config, context),
      createDockerStopTool(context),
      createDockerRmTool(context),
      createDockerStatsTool(context),
      createDockerInspectTool(context),
    ];

    const dangerousTools = ['docker_exec', 'docker_run', 'docker_stop', 'docker_rm'];

    for (const tool of tools) {
      context.agent.registerTool({
        name: tool.name,
        pluginId: context.pluginId,
        definition: {
          name: tool.name,
          description: tool.description,
          parametersSchema: tool.parametersSchema,
          requiresApproval: dangerousTools.includes(tool.name),
        },
        execute: tool.execute,
      });
    }

    context.logger.info(`Registered ${tools.length} docker tools`);

    // Register commands
    const commands = createCommands(context);
    context.logger.info(`Registered ${commands.length} commands`);

    // Event listeners
    const unsub1 = context.events.on('docker-tools:refresh', async () => {
      context.logger.info('Refreshing Docker container list');
      const result = await runDocker(context, ['ps', '-a', '--format', '{{.ID}}\t{{.Image}}\t{{.Command}}\t{{.CreatedAt}}\t{{.Status}}\t{{.Ports}}\t{{.Names}}']);
      if (result.success) {
        const containers = parseContainers(result.stdout);
        await context.storage.set('lastContainers', { containers, timestamp: Date.now() });
        context.events.emit('docker-tools:containers-updated', containers);
      }
    });
    eventCleanups.push(unsub1);

    return {
      onEnable: async () => {
        context.logger.info('Docker Tools enabled');
      },
      onDisable: async () => {
        context.logger.info('Docker Tools disabled');
      },
      onConfigChange: (newConfig: Record<string, unknown>) => {
        config.maxLogLines = (newConfig.maxLogLines as number) || 100;
        config.defaultTimeout = (newConfig.defaultTimeout as number) || 60000;
        context.logger.info('Docker Tools config updated');
      },
      onCommand: (commandId: string) => {
        const command = commands.find((c) => c.id === commandId);
        if (command) {
          command.execute();
          return true;
        }
        return false;
      },
    };
  },

  deactivate() {
    // Clean up event listeners
    for (const cleanup of eventCleanups) {
      cleanup();
    }
    eventCleanups.length = 0;
  },
});
