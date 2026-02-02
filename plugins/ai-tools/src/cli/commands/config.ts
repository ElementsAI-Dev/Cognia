/**
 * Config Command
 *
 * @description CLI command to manage AI Tools configuration.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DEFAULT_CONFIG, type AIToolsConfig } from '../../types/config';

interface ConfigOptions {
  list?: boolean;
  get?: string;
  set?: string;
  reset?: boolean;
}

const CONFIG_DIR = path.join(os.homedir(), '.cognia', 'plugins', 'ai-tools');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export async function configCommand(options: ConfigOptions): Promise<void> {
  console.log('\n⚙️  AI Tools - Configuration\n');

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
    const defaultValue = DEFAULT_CONFIG[key as keyof AIToolsConfig];
    let parsedValue: unknown;

    if (typeof defaultValue === 'number') {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue as number)) {
        console.error(`❌ Invalid number value: ${value}`);
        process.exit(1);
      }
    } else if (typeof defaultValue === 'boolean') {
      parsedValue = value === 'true' || value === '1';
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

function loadConfig(): AIToolsConfig {
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

function saveConfig(config: AIToolsConfig): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

function printConfig(config: AIToolsConfig): void {
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
    // Format large numbers with units
    if (value >= 3600000) {
      return `${value} (${(value / 3600000).toFixed(1)}h)`;
    }
    if (value >= 60000) {
      return `${value} (${(value / 60000).toFixed(1)}min)`;
    }
    if (value >= 1000) {
      return `${value} (${(value / 1000).toFixed(1)}s)`;
    }
  }
  return String(value);
}
