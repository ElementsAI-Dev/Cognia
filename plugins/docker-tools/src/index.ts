/**
 * Docker Tools Plugin
 *
 * Docker container management for AI agents.
 */

import { definePlugin, Schema, parameters } from '@cognia/plugin-sdk';
import type { PluginContext, PluginHooksAll, PluginToolContext } from '@cognia/plugin-sdk';

interface DockerConfig {
  maxLogLines: number;
}

async function runDocker(
  context: PluginContext,
  args: string[]
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  const command = `docker ${args.join(' ')}`;
  try {
    const result = await context.shell.execute(command, { timeout: 30000 });
    return { success: result.success, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return { success: false, stdout: '', stderr: error instanceof Error ? error.message : String(error) };
  }
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

export default definePlugin({
  activate(context: PluginContext): PluginHooksAll | void {
    context.logger.info('Docker Tools plugin activated');

    const config: DockerConfig = {
      maxLogLines: (context.config.maxLogLines as number) || 100,
    };

    const tools = [
      createDockerPsTool(context),
      createDockerImagesTool(context),
      createDockerLogsTool(config, context),
      createDockerExecTool(context),
    ];

    for (const tool of tools) {
      context.agent.registerTool({
        name: tool.name,
        pluginId: context.pluginId,
        definition: {
          name: tool.name,
          description: tool.description,
          parametersSchema: tool.parametersSchema,
          requiresApproval: tool.name === 'docker_exec',
        },
        execute: tool.execute,
      });
    }

    context.logger.info(`Registered ${tools.length} docker tools`);

    return {
      onEnable: async () => context.logger.info('Docker Tools enabled'),
      onDisable: async () => context.logger.info('Docker Tools disabled'),
    };
  },
});
