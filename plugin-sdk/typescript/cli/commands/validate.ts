/**
 * Validate Command
 *
 * @description Validates plugin manifest and structure.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidateOptions {
  strict: boolean;
}

interface PluginManifest {
  id?: string;
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  main?: string;
  type?: string;
  capabilities?: string[];
  permissions?: string[];
  tools?: Array<{ name: string; description: string }>;
  commands?: Array<{ id: string; name: string }>;
  modes?: Array<{ id: string; name: string }>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_PERMISSIONS = [
  'filesystem:read',
  'filesystem:write',
  'network:fetch',
  'network:websocket',
  'clipboard:read',
  'clipboard:write',
  'notification',
  'shell:execute',
  'process:spawn',
  'database:read',
  'database:write',
  'settings:read',
  'settings:write',
  'session:read',
  'session:write',
  'agent:control',
  'python:execute',
  // legacy aliases (still accepted during migration)
  'storage',
  'network',
  'filesystem',
  'shell',
  'database',
  'clipboard',
  'notifications',
  'secrets',
];

const VALID_CAPABILITIES = [
  'tools', 'commands', 'modes', 'components', 'hooks', 'a2ui', 'scheduler',
];

const VALID_TYPES = ['frontend', 'python', 'hybrid'];

export async function validateCommand(options: ValidateOptions): Promise<void> {
  const cwd = process.cwd();
  const manifestPath = path.join(cwd, 'plugin.json');

  console.log('\n🔍 Validating plugin...\n');

  // Check for plugin.json
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ No plugin.json found.');
    process.exit(1);
  }

  // Parse manifest
  let manifest: PluginManifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (error) {
    console.error('❌ Failed to parse plugin.json:', error);
    process.exit(1);
  }

  const result = validateManifest(manifest, options.strict);

  // Validate file structure
  validateFileStructure(cwd, manifest, result);

  // Print results
  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    result.errors.forEach((err) => console.log(`   • ${err}`));
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    result.warnings.forEach((warn) => console.log(`   • ${warn}`));
    console.log('');
  }

  if (result.valid) {
    console.log('✅ Plugin is valid!\n');
    if (result.warnings.length > 0) {
      console.log(`   ${result.warnings.length} warning(s)`);
    }
  } else {
    console.log(`❌ Plugin validation failed with ${result.errors.length} error(s)\n`);
    process.exit(1);
  }
}

function validateManifest(manifest: PluginManifest, strict: boolean): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Required fields
  if (!manifest.id) {
    result.errors.push('Missing required field: id');
    result.valid = false;
  } else if (!/^[a-z][a-z0-9-]*$/.test(manifest.id)) {
    result.errors.push('Invalid id format. Must be lowercase alphanumeric with hyphens.');
    result.valid = false;
  }

  if (!manifest.name) {
    result.errors.push('Missing required field: name');
    result.valid = false;
  }

  if (!manifest.version) {
    result.errors.push('Missing required field: version');
    result.valid = false;
  } else if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(manifest.version)) {
    result.errors.push('Invalid version format. Must be semver (e.g., 1.0.0)');
    result.valid = false;
  }

  if (!manifest.main) {
    result.errors.push('Missing required field: main');
    result.valid = false;
  }

  // Type validation
  if (manifest.type && !VALID_TYPES.includes(manifest.type)) {
    result.errors.push(`Invalid type: ${manifest.type}. Must be one of: ${VALID_TYPES.join(', ')}`);
    result.valid = false;
  }

  // Capabilities validation
  if (manifest.capabilities) {
    for (const cap of manifest.capabilities) {
      if (!VALID_CAPABILITIES.includes(cap)) {
        result.warnings.push(`Unknown capability: ${cap}`);
      }
    }
  }

  // Permissions validation
  if (manifest.permissions) {
    for (const perm of manifest.permissions) {
      if (!VALID_PERMISSIONS.includes(perm)) {
        result.warnings.push(`Unknown permission: ${perm}`);
      }
    }
  }

  // Strict mode validations
  if (strict) {
    if (!manifest.description) {
      result.warnings.push('Missing description');
    }

    if (!manifest.author) {
      result.warnings.push('Missing author');
    }

    // Validate tools have required fields
    if (manifest.tools) {
      manifest.tools.forEach((tool, i) => {
        if (!tool.name) {
          result.errors.push(`Tool ${i} missing required field: name`);
          result.valid = false;
        }
        if (!tool.description) {
          result.warnings.push(`Tool "${tool.name || i}" missing description`);
        }
      });
    }

    // Validate commands
    if (manifest.commands) {
      manifest.commands.forEach((cmd, i) => {
        if (!cmd.id) {
          result.errors.push(`Command ${i} missing required field: id`);
          result.valid = false;
        }
        if (!cmd.name) {
          result.errors.push(`Command ${i} missing required field: name`);
          result.valid = false;
        }
      });
    }
  }

  return result;
}

function validateFileStructure(cwd: string, manifest: PluginManifest, result: ValidationResult): void {
  // Check main entry exists
  if (manifest.main) {
    const mainPath = path.join(cwd, manifest.main);
    const srcMainPath = path.join(cwd, 'src', manifest.main);

    // Also check for source files if main is in dist
    const sourceVariants = [
      manifest.main.replace(/^dist\//, '').replace(/\.js$/, '.ts'),
      manifest.main.replace(/^dist\//, '').replace(/\.js$/, '.tsx'),
      manifest.main.replace(/\.js$/, '.ts'),
      manifest.main.replace(/\.js$/, '.tsx'),
    ];

    const exists = fs.existsSync(mainPath) ||
      fs.existsSync(srcMainPath) ||
      sourceVariants.some((v) => fs.existsSync(path.join(cwd, v)));

    if (!exists) {
      result.warnings.push(`Main entry point not found: ${manifest.main}`);
    }
  }

  // Check package.json exists
  if (!fs.existsSync(path.join(cwd, 'package.json'))) {
    result.warnings.push('No package.json found');
  }

  // Check for common issues
  const nodeModules = path.join(cwd, 'node_modules');
  if (!fs.existsSync(nodeModules)) {
    result.warnings.push('node_modules not found. Run npm install.');
  }
}
