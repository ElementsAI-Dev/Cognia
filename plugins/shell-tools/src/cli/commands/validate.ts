/**
 * Validate Command
 *
 * @description CLI command to validate Shell Tools security configuration.
 */

import * as fs from 'fs';
import { loadConfig, type ShellToolsConfig } from './config';

interface ValidateOptions {
  strict?: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateCommand(options: ValidateOptions): Promise<void> {
  console.log('\n🔍 Shell Tools - Configuration Validation\n');

  const config = loadConfig();
  const result = validateConfig(config, options.strict ?? false);

  // Print errors
  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    for (const error of result.errors) {
      console.log(`   - ${error}`);
    }
    console.log('');
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    for (const warning of result.warnings) {
      console.log(`   - ${warning}`);
    }
    console.log('');
  }

  // Print summary
  if (result.valid) {
    console.log('✅ Configuration is valid\n');
  } else {
    console.log('❌ Configuration has errors\n');
    process.exit(1);
  }
}

function validateConfig(config: ShellToolsConfig, strict: boolean): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate timeout
  if (config.timeout < 1000) {
    errors.push('Timeout must be at least 1000ms');
  } else if (config.timeout < 5000) {
    warnings.push('Timeout is very short (< 5s), commands may fail');
  }

  // Validate maxOutputSize
  if (config.maxOutputSize < 1024) {
    errors.push('maxOutputSize must be at least 1KB');
  } else if (config.maxOutputSize > 104857600) {
    warnings.push('maxOutputSize is very large (> 100MB), may cause memory issues');
  }

  // Validate defaultShell
  const validShells = ['bash', 'sh', 'zsh', 'fish', 'powershell', 'pwsh', 'cmd'];
  if (!validShells.includes(config.defaultShell)) {
    warnings.push(`Unknown shell "${config.defaultShell}". Valid: ${validShells.join(', ')}`);
  }

  // Validate blocked commands
  if (config.blockedCommands.length === 0 && strict) {
    warnings.push('No commands are blocked. Consider adding dangerous commands.');
  }

  // Check for common dangerous commands
  const dangerousCommands = ['rm -rf /', 'format c:', 'del /f /s /q c:\\', ':(){:|:&};:'];
  const missingDangerous = dangerousCommands.filter(
    (cmd) => !config.blockedCommands.some((b) => b.includes(cmd.split(' ')[0]))
  );

  if (missingDangerous.length > 0 && strict) {
    warnings.push(`Consider blocking dangerous patterns: ${missingDangerous.slice(0, 3).join(', ')}`);
  }

  // Validate allowed directories
  for (const dir of config.allowedDirectories) {
    if (!fs.existsSync(dir)) {
      warnings.push(`Allowed directory does not exist: ${dir}`);
    }
  }

  // Validate hidden env vars
  const recommendedHidden = ['API_KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'PRIVATE_KEY'];
  const missingHidden = recommendedHidden.filter(
    (v) => !config.hiddenEnvVars.some((h) => v.includes(h) || h.includes(v))
  );

  if (missingHidden.length > 0 && strict) {
    warnings.push(`Consider hiding sensitive patterns: ${missingHidden.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
