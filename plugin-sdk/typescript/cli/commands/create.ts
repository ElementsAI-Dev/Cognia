/**
 * Create Command
 *
 * @description Creates a new plugin project from a template.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import React from 'react';
import { render } from 'ink';
import { CreateWizard, type CreateWizardData } from '../wizards/index';

export interface CreateOptions {
  template: 'basic' | 'tool' | 'command' | 'full';
  directory: string;
  typescript: boolean;
  git: boolean;
  install: boolean;
  interactive?: boolean;
}

const TEMPLATES = {
  basic: {
    description: 'Basic plugin with minimal setup',
    files: ['index.ts', 'plugin.json'],
  },
  tool: {
    description: 'Plugin with AI agent tools',
    files: ['index.ts', 'plugin.json', 'tools/index.ts'],
  },
  command: {
    description: 'Plugin with slash commands',
    files: ['index.ts', 'plugin.json', 'commands/index.ts'],
  },
  full: {
    description: 'Full-featured plugin with tools, commands, and hooks',
    files: ['index.ts', 'plugin.json', 'tools/index.ts', 'commands/index.ts', 'hooks/index.ts', 'components/Panel.tsx'],
  },
};

export async function createCommand(name: string | undefined, options: CreateOptions): Promise<void> {
  // Determine if we should run interactive mode
  const isInteractive = options.interactive ?? (process.stdout.isTTY && !name);

  if (isInteractive) {
    return runInteractiveCreate(name, options);
  }

  // Non-interactive mode requires name
  if (!name) {
    console.error('❌ Plugin name is required in non-interactive mode');
    console.log('   Usage: cognia-plugin create <name>');
    console.log('   Or run without name for interactive mode');
    process.exit(1);
  }

  const targetDir = path.resolve(options.directory, name);

  console.log(`\n🚀 Creating new Cognia plugin: ${name}\n`);
  console.log(`  Template: ${options.template}`);
  console.log(`  Directory: ${targetDir}`);
  console.log(`  TypeScript: ${options.typescript}`);
  console.log('');

  // Check if directory exists
  if (fs.existsSync(targetDir)) {
    console.error(`❌ Directory already exists: ${targetDir}`);
    process.exit(1);
  }

  // Create directory
  fs.mkdirSync(targetDir, { recursive: true });

  // Generate files based on template
  await generateTemplateFiles(name, targetDir, options);

  // Initialize git
  if (options.git) {
    console.log('📦 Initializing git repository...');
    try {
      execSync('git init', { cwd: targetDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(targetDir, '.gitignore'), getGitignore());
    } catch {
      console.warn('⚠️  Failed to initialize git repository');
    }
  }

  // Install dependencies
  if (options.install) {
    console.log('📦 Installing dependencies...');
    try {
      execSync('npm install', { cwd: targetDir, stdio: 'inherit' });
    } catch {
      console.warn('⚠️  Failed to install dependencies. Run npm install manually.');
    }
  }

  console.log(`\n✅ Plugin created successfully!\n`);
  console.log('Next steps:');
  console.log(`  cd ${name}`);
  if (!options.install) {
    console.log('  npm install');
  }
  console.log('  npx cognia-plugin dev');
  console.log('');
}

/**
 * Run interactive create wizard
 */
async function runInteractiveCreate(initialName: string | undefined, options: CreateOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleComplete = async (data: CreateWizardData) => {
      try {
        const targetDir = path.resolve(options.directory, data.name);

        // Check if directory exists
        if (fs.existsSync(targetDir)) {
          throw new Error(`Directory already exists: ${targetDir}`);
        }

        // Create directory
        fs.mkdirSync(targetDir, { recursive: true });

        // Generate files
        await generateTemplateFilesFromWizard(data.name, targetDir, data);

        // Initialize git
        if (data.git) {
          try {
            execSync('git init', { cwd: targetDir, stdio: 'pipe' });
            fs.writeFileSync(path.join(targetDir, '.gitignore'), getGitignore());
          } catch {
            console.warn('⚠️  Failed to initialize git repository');
          }
        }

        // Install dependencies
        if (data.install) {
          console.log('\n📦 Installing dependencies...');
          try {
            execSync('npm install', { cwd: targetDir, stdio: 'inherit' });
          } catch {
            console.warn('⚠️  Failed to install dependencies. Run npm install manually.');
          }
        }

        console.log(`\n✅ Plugin created successfully!\n`);
        console.log('Next steps:');
        console.log(`  cd ${data.name}`);
        if (!data.install) {
          console.log('  npm install');
        }
        console.log('  npx cognia-plugin dev');
        console.log('');

        resolve();
      } catch (error) {
        reject(error);
      }
    };

    const handleCancel = () => {
      console.log('\n👋 Plugin creation cancelled.\n');
      resolve();
    };

    const { waitUntilExit } = render(
      React.createElement(CreateWizard, {
        initialName: initialName || '',
        onComplete: handleComplete,
        onCancel: handleCancel,
      })
    );

    waitUntilExit().then(resolve).catch(reject);
  });
}

/**
 * Generate files from wizard data (supports custom capabilities)
 */
async function generateTemplateFilesFromWizard(
  name: string,
  targetDir: string,
  data: CreateWizardData
): Promise<void> {
  const ext = data.typescript ? 'ts' : 'js';

  // Generate package.json
  fs.writeFileSync(
    path.join(targetDir, 'package.json'),
    JSON.stringify(getPackageJson(name, data.typescript), null, 2)
  );

  // Generate plugin.json with custom capabilities/permissions
  fs.writeFileSync(
    path.join(targetDir, 'plugin.json'),
    JSON.stringify({
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: name,
      version: '1.0.0',
      description: `Cognia plugin: ${name}`,
      author: 'Your Name',
      main: 'dist/index.js',
      type: 'frontend',
      capabilities: data.capabilities,
      permissions: data.permissions,
      ...(data.capabilities.includes('scheduler')
        ? {
            scheduledTasks: [
              {
                name: 'daily-maintenance',
                description: 'Run daily maintenance logic',
                handler: 'dailyMaintenance',
                trigger: { type: 'cron', expression: '0 6 * * *' },
                defaultEnabled: true,
              },
            ],
          }
        : {}),
    }, null, 2)
  );

  // Generate tsconfig.json if TypeScript
  if (data.typescript) {
    fs.writeFileSync(
      path.join(targetDir, 'tsconfig.json'),
      JSON.stringify(getTsConfig(), null, 2)
    );
  }

  // Generate main entry file
  fs.writeFileSync(
    path.join(targetDir, `index.${ext}`),
    getMainFileFromWizard(name, data)
  );

  // Generate additional files based on capabilities
  if (data.capabilities.includes('tools')) {
    fs.mkdirSync(path.join(targetDir, 'tools'), { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, 'tools', `index.${ext}`),
      getToolsFile(data.typescript)
    );
  }

  if (data.capabilities.includes('commands')) {
    fs.mkdirSync(path.join(targetDir, 'commands'), { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, 'commands', `index.${ext}`),
      getCommandsFile(data.typescript)
    );
  }

  if (data.capabilities.includes('hooks')) {
    fs.mkdirSync(path.join(targetDir, 'hooks'), { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, 'hooks', `index.${ext}`),
      getHooksFile(data.typescript)
    );
  }

  if (data.capabilities.includes('components')) {
    fs.mkdirSync(path.join(targetDir, 'components'), { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, 'components', 'Panel.tsx'),
      getPanelComponent()
    );
  }

  if (data.capabilities.includes('scheduler')) {
    fs.mkdirSync(path.join(targetDir, 'scheduler'), { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, 'scheduler', `index.${ext}`),
      getSchedulerFile(data.typescript)
    );
  }

  // Generate README
  fs.writeFileSync(
    path.join(targetDir, 'README.md'),
    getReadme(name, data.template)
  );
}

function getMainFileFromWizard(name: string, data: CreateWizardData): string {
  const typescript = data.typescript;
  const typeAnnotation = typescript ? ': PluginHooks' : '';
  const importType = typescript ? "import type { PluginHooks } from '@cognia/plugin-sdk';\n" : '';

  const hasTools = data.capabilities.includes('tools');
  const hasCommands = data.capabilities.includes('commands');
  const hasHooks = data.capabilities.includes('hooks');
  const hasScheduler = data.capabilities.includes('scheduler');

  return `${importType}import { definePlugin } from '@cognia/plugin-sdk';
${hasTools ? "import { tools } from './tools';\n" : ''}${hasCommands ? "import { commands } from './commands';\n" : ''}${hasHooks ? "import { hooks } from './hooks';\n" : ''}${hasScheduler ? "import { registerScheduler } from './scheduler';\n" : ''}
export default definePlugin({
  id: '${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}',
  name: '${name}',
  version: '1.0.0',
${hasTools ? '  tools,\n' : ''}${hasCommands ? '  commands,\n' : ''}${hasHooks ? '  hooks,\n' : ''}
  activate(context) {
    context.logger.info('Plugin activated: ${name}');
${hasScheduler ? '    registerScheduler(context);\n' : ''}
    return {
      onEnable: async () => {
        context.logger.info('Plugin enabled');
      },
      onDisable: async () => {
        context.logger.info('Plugin disabled');
      },
    }${typeAnnotation};
  },

  deactivate() {
    // Cleanup
  },
});
`;
}

async function generateTemplateFiles(name: string, targetDir: string, options: CreateOptions): Promise<void> {
  const ext = options.typescript ? 'ts' : 'js';

  // Generate package.json
  fs.writeFileSync(
    path.join(targetDir, 'package.json'),
    JSON.stringify(getPackageJson(name, options.typescript), null, 2)
  );

  // Generate plugin.json
  fs.writeFileSync(
    path.join(targetDir, 'plugin.json'),
    JSON.stringify(getPluginManifest(name, options.template), null, 2)
  );

  // Generate tsconfig.json if TypeScript
  if (options.typescript) {
    fs.writeFileSync(
      path.join(targetDir, 'tsconfig.json'),
      JSON.stringify(getTsConfig(), null, 2)
    );
  }

  // Generate main entry file
  fs.writeFileSync(
    path.join(targetDir, `index.${ext}`),
    getMainFile(name, options.template, options.typescript)
  );

  // Generate additional files based on template
  if (options.template === 'tool' || options.template === 'full') {
    fs.mkdirSync(path.join(targetDir, 'tools'), { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, 'tools', `index.${ext}`),
      getToolsFile(options.typescript)
    );
  }

  if (options.template === 'command' || options.template === 'full') {
    fs.mkdirSync(path.join(targetDir, 'commands'), { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, 'commands', `index.${ext}`),
      getCommandsFile(options.typescript)
    );
  }

  if (options.template === 'full') {
    fs.mkdirSync(path.join(targetDir, 'hooks'), { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, 'hooks', `index.${ext}`),
      getHooksFile(options.typescript)
    );

    fs.mkdirSync(path.join(targetDir, 'components'), { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, 'components', 'Panel.tsx'),
      getPanelComponent()
    );
  }

  // Generate README
  fs.writeFileSync(
    path.join(targetDir, 'README.md'),
    getReadme(name, options.template)
  );
}

function getPackageJson(name: string, typescript: boolean): object {
  return {
    name: `cognia-plugin-${name}`,
    version: '1.0.0',
    description: `Cognia plugin: ${name}`,
    main: typescript ? 'dist/index.js' : 'index.js',
    types: typescript ? 'dist/index.d.ts' : undefined,
    scripts: {
      dev: 'cognia-plugin dev',
      build: 'cognia-plugin build',
      validate: 'cognia-plugin validate',
      ...(typescript ? { typecheck: 'tsc --noEmit' } : {}),
    },
    dependencies: {},
    devDependencies: {
      '@cognia/plugin-sdk': '^2.0.0',
      ...(typescript ? { typescript: '^5.0.0' } : {}),
    },
    peerDependencies: {
      react: '^18.0.0',
    },
  };
}

function getPluginManifest(name: string, template: string): object {
  const base = {
    id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    name: name,
    version: '1.0.0',
    description: `Cognia plugin: ${name}`,
    author: 'Your Name',
    main: 'dist/index.js',
    type: 'frontend',
    capabilities: [] as string[],
    permissions: ['network:fetch', 'filesystem:read'],
  };

  switch (template) {
    case 'tool':
      base.capabilities = ['tools'];
      break;
    case 'command':
      base.capabilities = ['commands'];
      break;
    case 'full':
      base.capabilities = ['tools', 'commands', 'components', 'hooks'];
      break;
  }

  return base;
}

function getTsConfig(): object {
  return {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
      lib: ['ES2020', 'DOM'],
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      declaration: true,
      declarationMap: true,
      outDir: 'dist',
      rootDir: '.',
      jsx: 'react-jsx',
    },
    include: ['*.ts', '*.tsx', '**/*.ts', '**/*.tsx'],
    exclude: ['node_modules', 'dist'],
  };
}

function getMainFile(name: string, template: string, typescript: boolean): string {
  const typeAnnotation = typescript ? ': PluginHooks' : '';
  const importType = typescript ? "import type { PluginHooks } from '@cognia/plugin-sdk';\n" : '';

  return `${importType}import { definePlugin } from '@cognia/plugin-sdk';
${template === 'tool' || template === 'full' ? "import { tools } from './tools';\n" : ''}${template === 'command' || template === 'full' ? "import { commands } from './commands';\n" : ''}${template === 'full' ? "import { hooks } from './hooks';\n" : ''}
export default definePlugin({
  id: '${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}',
  name: '${name}',
  version: '1.0.0',
${template === 'tool' || template === 'full' ? '  tools,\n' : ''}${template === 'command' || template === 'full' ? '  commands,\n' : ''}${template === 'full' ? '  hooks,\n' : ''}
  activate(context) {
    context.logger.info('Plugin activated: ${name}');
    return {
      onEnable: async () => {
        context.logger.info('Plugin enabled');
      },
      onDisable: async () => {
        context.logger.info('Plugin disabled');
      },
    }${typeAnnotation};
  },

  deactivate() {
    // Cleanup
  },
});
`;
}

function getToolsFile(typescript: boolean): string {
  return `import { tool } from '@cognia/plugin-sdk';

export const tools = [
  tool({
    name: 'example_tool',
    description: 'An example tool that echoes input',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Message to echo',
        },
      },
      required: ['message'],
    },
    execute: async ({ message }${typescript ? ': { message: string }' : ''}) => {
      return { result: \`Echo: \${message}\` };
    },
  }),
];
`;
}

function getCommandsFile(typescript: boolean): string {
  return `import { defineCommand } from '@cognia/plugin-sdk';

export const commands = [
  defineCommand({
    id: 'example-command',
    name: '/example',
    description: 'An example slash command',
    execute: async (args${typescript ? ': string[]' : ''}, context) => {
      context.logger.info('Example command executed', args);
    },
  }),
];
`;
}

function getHooksFile(typescript: boolean): string {
  const typeImport = typescript ? "import type { PluginHooks } from '@cognia/plugin-sdk';\n\n" : '';
  const typeAnnotation = typescript ? ': PluginHooks' : '';

  return `${typeImport}export const hooks${typeAnnotation} = {
  onAgentStart: async (agentId${typescript ? ': string' : ''}) => {
    console.log('Agent started:', agentId);
  },

  onAgentComplete: async (agentId${typescript ? ': string' : ''}, result${typescript ? ': unknown' : ''}) => {
    console.log('Agent completed:', agentId, result);
  },

  onMessageSend: async (message${typescript ? ': unknown' : ''}) => {
    console.log('Message sent:', message);
  },
};
`;
}

function getSchedulerFile(typescript: boolean): string {
  const typeImport = typescript ? "import type { PluginContext } from '@cognia/plugin-sdk';\n\n" : '';
  const contextType = typescript ? ': PluginContext' : '';

  return `${typeImport}export function registerScheduler(context${contextType}) {
  context.scheduler.registerHandler('dailyMaintenance', async (_args, taskContext) => {
    taskContext.log('info', 'Running daily maintenance task');

    return {
      success: true,
      output: {
        completedAt: new Date().toISOString(),
      },
    };
  });

  context.scheduler.createTask({
    name: 'Daily Maintenance',
    description: 'Runs once per day to perform maintenance tasks',
    trigger: { type: 'cron', expression: '0 6 * * *' },
    handler: 'dailyMaintenance',
  }).catch((error) => {
    context.logger.error('Failed to register scheduled task', error);
  });
}
`;
}

function getPanelComponent(): string {
  return `import React from 'react';
import { usePluginContext, usePluginStorage } from '@cognia/plugin-sdk';

export function Panel() {
  const context = usePluginContext();
  const [count, setCount, loading] = usePluginStorage('count', 0);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Plugin Panel</h1>
      <p className="mb-2">Count: {count}</p>
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => setCount(count + 1)}
      >
        Increment
      </button>
    </div>
  );
}
`;
}

function getGitignore(): string {
  return `# Dependencies
node_modules/

# Build output
dist/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
`;
}

function getReadme(name: string, template: string): string {
  return `# ${name}

A Cognia plugin created with the Plugin SDK.

## Template

This plugin was created using the **${template}** template.

## Development

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Validate plugin
npm run validate
\`\`\`

## Structure

\`\`\`
${name}/
├── index.ts          # Main entry point
├── plugin.json       # Plugin manifest
├── package.json      # NPM package config
${template === 'tool' || template === 'full' ? '├── tools/            # AI agent tools\n' : ''}${template === 'command' || template === 'full' ? '├── commands/         # Slash commands\n' : ''}${template === 'full' ? '├── hooks/            # Lifecycle hooks\n├── components/       # React components\n' : ''}└── README.md
\`\`\`

## License

MIT
`;
}
