/**
 * Config Command
 *
 * @description CLI command to manage Shell Tools configuration.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface ShellToolsConfig {
  defaultShell: string;
  timeout: number;
  maxOutputSize: number;
  blockedCommands: string[];
  allowedDirectories: string[];
  hiddenEnvVars: string[];
}

const DEFAULT_CONFIG: ShellToolsConfig = {
  defaultShell: process.platform === 'win32' ? 'powershell' : 'bash',
  timeout: 30000,
  maxOutputSize: 1048576,
  blockedCommands: ['rm -rf /', 'format', 'del /f /s /q'],
  allowedDirectories: [],
  hiddenEnvVars: ['API_KEY', 'SECRET', 'PASSWORD', 'TOKEN'],
};

interface ConfigOptions {
  list?: boolean;
  get?: string;
  set?: string;
  reset?: boolean;
}

const CONFIG_DIR = path.join(os.homedir(), '.cognia', 'plugins', 'shell-tools');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export async function configCommand(options: ConfigOptions): Promise<void> {
  console.log('\n⚙️  Shell Tools - Configuration\n');

  // Ensure config directory exists
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // Load current config
  let config = loadConfig();

  if (options.reset) {
    config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    console.log('✅ Configuration reset to defaults\n');
    printConfig(config);
    return;
  }

  if (options.set) {
    const [key, value] = options.set.split('=');
    if (!key || value === undefined) {
      console.error('❌ Invalid format. Use --set key=value');
      process.exit(1);
    }

    if (!(key in DEFAULT_CONFIG)) {
      console.error(`❌ Unknown config key: ${key}`);
      console.log('\nValid keys:', Object.keys(DEFAULT_CONFIG).join(', '));
      process.exit(1);
    }

    // Parse value based on type
    const defaultValue = DEFAULT_CONFIG[key as keyof ShellToolsConfig];
    let parsedValue: unknown;

    if (typeof defaultValue === 'number') {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue as number)) {
        console.error(`❌ Invalid number value: ${value}`);
        process.exit(1);
      }
    } else if (Array.isArray(defaultValue)) {
      parsedValue = value.split(',').filter(Boolean);
    } else {
      parsedValue = value;
    }

    (config as unknown as Record<string, unknown>)[key] = parsedValue;
    saveConfig(config);
    console.log(`✅ Set ${key} = ${JSON.stringify(parsedValue)}\n`);
    return;
  }

  if (options.get) {
    const key = options.get;
    if (!(key in config)) {
      console.error(`❌ Unknown config key: ${key}`);
      process.exit(1);
    }

    const value = (config as unknown as Record<string, unknown>)[key];
    console.log(`${key} = ${JSON.stringify(value)}\n`);
    return;
  }

  // Default: list all config
  printConfig(config);
}

function loadConfig(): ShellToolsConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config: ShellToolsConfig): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

function printConfig(config: ShellToolsConfig): void {
  console.log('Current configuration:\n');

  const entries = Object.entries(config);
  const maxKeyLength = Math.max(...entries.map(([k]) => k.length));

  for (const [key, value] of entries) {
    const paddedKey = key.padEnd(maxKeyLength);
    const formattedValue = formatValue(value);
    console.log(`  ${paddedKey} : ${formattedValue}`);
  }

  console.log(`\nConfig file: ${CONFIG_FILE}\n`);
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '(empty)';
  }
  if (typeof value === 'number') {
    if (value >= 1048576) {
      return `${value} (${(value / 1048576).toFixed(1)}MB)`;
    }
    if (value >= 1000) {
      return `${value} (${(value / 1000).toFixed(1)}s)`;
    }
  }
  return String(value);
}

export { loadConfig, saveConfig, DEFAULT_CONFIG };
export type { ShellToolsConfig };
