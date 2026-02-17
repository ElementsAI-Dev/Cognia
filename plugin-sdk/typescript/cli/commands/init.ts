/**
 * Init Command
 *
 * @description Initializes plugin SDK in an existing project.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import React from 'react';
import { render } from 'ink';
import { InitWizard, type InitWizardData } from '../wizards/index';

export interface InitOptions {
  force: boolean;
  interactive?: boolean;
}

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  type: string;
  capabilities: string[];
  permissions: string[];
}

export async function initCommand(options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const manifestPath = path.join(cwd, 'plugin.json');

  // Check if already initialized
  if (fs.existsSync(manifestPath) && !options.force) {
    console.error('❌ plugin.json already exists. Use --force to overwrite.');
    process.exit(1);
  }

  // Determine if we should run interactive mode
  const isInteractive = options.interactive ?? process.stdout.isTTY;

  if (isInteractive) {
    return runInteractiveInit(cwd, manifestPath);
  }

  // Non-interactive mode using readline
  console.log('\n🔧 Initializing Cognia Plugin SDK\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string, defaultValue?: string): Promise<string> => {
    return new Promise((resolve) => {
      const suffix = defaultValue ? ` (${defaultValue})` : '';
      rl.question(`${prompt}${suffix}: `, (answer) => {
        resolve(answer || defaultValue || '');
      });
    });
  };

  try {
    // Gather information
    const packageJsonPath = path.join(cwd, 'package.json');
    let packageJson: { name?: string; version?: string; description?: string; author?: string } = {};

    if (fs.existsSync(packageJsonPath)) {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    }

    const projectName = path.basename(cwd);
    const defaults = {
      id: projectName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: packageJson.name || projectName,
      version: packageJson.version || '1.0.0',
      description: packageJson.description || '',
      author: packageJson.author || '',
    };

    console.log('Please provide plugin information:\n');

    const id = await question('Plugin ID', defaults.id);
    const name = await question('Plugin Name', defaults.name);
    const version = await question('Version', defaults.version);
    const description = await question('Description', defaults.description);
    const author = await question('Author', defaults.author);

    console.log('\nSelect capabilities (comma-separated):');
    console.log('  tools, commands, modes, components, hooks, a2ui, scheduler');
    const capabilitiesStr = await question('Capabilities', 'tools');
    const capabilities = capabilitiesStr.split(',').map((c) => c.trim()).filter(Boolean);

    console.log('\nSelect permissions (comma-separated):');
    console.log('  network:fetch, filesystem:read, filesystem:write, shell:execute,');
    console.log('  process:spawn, database:read, database:write, clipboard:read, clipboard:write');
    const permissionsStr = await question('Permissions', 'network:fetch,filesystem:read');
    const permissions = permissionsStr.split(',').map((p) => p.trim()).filter(Boolean);

    rl.close();

    // Create manifest
    const manifest: PluginManifest = {
      id,
      name,
      version,
      description,
      author,
      main: 'dist/index.js',
      type: 'frontend',
      capabilities,
      permissions,
    };

    // Write plugin.json
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('\n✅ Created plugin.json');

    // Update package.json if exists
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Add scripts
      pkg.scripts = pkg.scripts || {};
      pkg.scripts.dev = pkg.scripts.dev || 'cognia-plugin dev';
      pkg.scripts.build = pkg.scripts.build || 'cognia-plugin build';
      pkg.scripts.validate = pkg.scripts.validate || 'cognia-plugin validate';

      // Add dev dependencies
      pkg.devDependencies = pkg.devDependencies || {};
      if (!pkg.devDependencies['@cognia/plugin-sdk']) {
        pkg.devDependencies['@cognia/plugin-sdk'] = '^2.0.0';
      }

      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
      console.log('✅ Updated package.json');
    }

    // Create index.ts if doesn't exist
    const indexPath = path.join(cwd, 'index.ts');
    if (!fs.existsSync(indexPath) && !fs.existsSync(path.join(cwd, 'src', 'index.ts'))) {
      fs.writeFileSync(indexPath, getIndexTemplate(id, name));
      console.log('✅ Created index.ts');
    }

    console.log('\n🎉 Plugin initialized successfully!\n');
    console.log('Next steps:');
    console.log('  npm install');
    console.log('  npm run dev');
    console.log('');
  } catch (error) {
    rl.close();
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

/**
 * Run interactive init wizard
 */
async function runInteractiveInit(cwd: string, manifestPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Read package.json if exists
    const packageJsonPath = path.join(cwd, 'package.json');
    let packageJson: { name?: string; version?: string; description?: string; author?: string } | undefined;

    if (fs.existsSync(packageJsonPath)) {
      try {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      } catch {
        // Ignore parse errors
      }
    }

    const handleComplete = async (data: InitWizardData) => {
      try {
        // Create manifest
        const manifest: PluginManifest = {
          id: data.id,
          name: data.name,
          version: data.version,
          description: data.description,
          author: data.author,
          main: 'dist/index.js',
          type: 'frontend',
          capabilities: data.capabilities,
          permissions: data.permissions,
        };

        // Write plugin.json
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

        // Update package.json if exists
        if (fs.existsSync(packageJsonPath)) {
          const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

          // Add scripts
          pkg.scripts = pkg.scripts || {};
          pkg.scripts.dev = pkg.scripts.dev || 'cognia-plugin dev';
          pkg.scripts.build = pkg.scripts.build || 'cognia-plugin build';
          pkg.scripts.validate = pkg.scripts.validate || 'cognia-plugin validate';

          // Add dev dependencies
          pkg.devDependencies = pkg.devDependencies || {};
          if (!pkg.devDependencies['@cognia/plugin-sdk']) {
            pkg.devDependencies['@cognia/plugin-sdk'] = '^2.0.0';
          }

          fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
        }

        // Create index.ts if doesn't exist
        const indexPath = path.join(cwd, 'index.ts');
        if (!fs.existsSync(indexPath) && !fs.existsSync(path.join(cwd, 'src', 'index.ts'))) {
          fs.writeFileSync(indexPath, getIndexTemplate(data.id, data.name));
        }

        console.log('\n🎉 Plugin initialized successfully!\n');
        console.log('Next steps:');
        console.log('  npm install');
        console.log('  npm run dev');
        console.log('');

        resolve();
      } catch (error) {
        reject(error);
      }
    };

    const handleCancel = () => {
      console.log('\n👋 Initialization cancelled.\n');
      resolve();
    };

    const { waitUntilExit } = render(
      React.createElement(InitWizard, {
        cwd,
        packageJson,
        onComplete: handleComplete,
        onCancel: handleCancel,
      })
    );

    waitUntilExit().then(resolve).catch(reject);
  });
}

function getIndexTemplate(id: string, name: string): string {
  return `import { definePlugin } from '@cognia/plugin-sdk';
import type { PluginHooks } from '@cognia/plugin-sdk';

export default definePlugin({
  id: '${id}',
  name: '${name}',
  version: '1.0.0',

  activate(context) {
    context.logger.info('Plugin activated: ${name}');

    return {
      onEnable: async () => {
        context.logger.info('Plugin enabled');
      },
      onDisable: async () => {
        context.logger.info('Plugin disabled');
      },
    } as PluginHooks;
  },

  deactivate() {
    // Cleanup
  },
});
`;
}
